# Esquema SQL: clientes, productos y ventas

Ejecutar en **Supabase → SQL Editor**. Orden recomendado: `productos` → `clientes` → `ventas` (por las claves foráneas).

Convenciones:

- Moneda en **pesos argentinos** (valores `numeric`, sin unidad en columna).
- **Fecha de operación** (`ventas.fecha`): día contable de la venta (el usuario elige el día en la app).
- **Sin cliente**: `ventas.cliente_id` es `null` (venta mostrada como “Sin cliente”).

---

## 1. Tabla `public.productos`

Cajas de ciruela (u otros productos). El precio por defecto se usa al cargar el modal; en cada venta se guarda **snapshot** en `ventas.precio_unitario`.

```sql
create table public.productos (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  precio_unitario numeric(14, 2) not null check (precio_unitario >= 0),
  activo boolean not null default true,
  created_at timestamptz not null default now()
);

create index productos_activo_idx on public.productos (activo) where activo = true;
```

**Ejemplo** (una caja de ciruelas):

```sql
insert into public.productos (nombre, precio_unitario)
values ('Caja ciruela', 0);
```

Ajustá `precio_unitario` al valor real.

---

## 2. Tabla `public.clientes`

```sql
create table public.clientes (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  created_at timestamptz not null default now()
);

create index clientes_nombre_idx on public.clientes (nombre);
```

---

## 3. Tabla `public.ventas`

Una fila por venta registrada (día + cajas + precio aplicado).

```sql
create table public.ventas (
  id uuid primary key default gen_random_uuid(),
  fecha date not null,
  cliente_id uuid references public.clientes (id) on delete set null,
  producto_id uuid not null references public.productos (id) on delete restrict,
  cantidad_cajas integer not null check (cantidad_cajas > 0),
  precio_unitario numeric(14, 2) not null check (precio_unitario >= 0),
  total numeric(14, 2) not null check (total >= 0),
  created_at timestamptz not null default now()
);
```

> Nota: la app calcula `total = cantidad_cajas × precio_unitario` con dos decimales y lo persiste. Podés añadir un `generated column` o trigger más adelante si querés forzarlo en base.

```sql
create index ventas_fecha_idx on public.ventas (fecha desc);
create index ventas_cliente_idx on public.ventas (cliente_id);
```

---

## 4. Row Level Security (RLS)

(movido a la sección 7 — ver abajo)

---

## 5. Tabla `public.embalajes`

Tipos de envase/embalaje predefinidos que se asignan a los productos.

```sql
create table public.embalajes (
  id   uuid primary key default gen_random_uuid(),
  nombre text not null unique
);

-- Embalajes predefinidos
insert into public.embalajes (nombre) values
  ('Caja Plástica'),
  ('Caja de Madera'),
  ('Caja de Cartón'),
  ('Fardo'),
  ('Bolsa'),
  ('Docena');

-- RLS: solo lectura para autenticados (los predefinidos los gestiona el admin)
alter table public.embalajes enable row level security;

create policy "embalajes_authenticated_read"
  on public.embalajes for select
  to authenticated
  using (true);
```

Luego agregá la columna `embalaje_id` a `productos`:

```sql
alter table public.productos
  add column embalaje_id uuid references public.embalajes (id) on delete restrict;
```

> Si ya tenés filas en `productos`, la columna queda nullable. Para los productos existentes, asignales el embalaje desde la pantalla de Productos → Editar.

---

## 6. Tabla `public.cheques`

Registro de cheques recibidos de terceros, con estado de cobro y alertas automáticas de vencimiento.

```sql
create table public.cheques (
  id             uuid primary key default gen_random_uuid(),
  banco          text not null,
  cuit           text not null,
  numero_cheque  text not null,
  recibido_de    text not null,           -- nombre de quien lo entregó
  entregado_a    text,                     -- a quién se le entregó (null = sigue en cartera)
  monto          numeric(14, 2) not null check (monto > 0),
  fecha_cobro    date not null,            -- fecha a partir de la cual se puede cobrar
  estado         text not null default 'en_cartera'
                   check (estado in ('en_cartera', 'cobrado', 'rechazado')),
  notas          text,
  created_at     timestamptz not null default now()
);

create index cheques_fecha_cobro_idx on public.cheques (fecha_cobro);
create index cheques_estado_idx      on public.cheques (estado) where estado = 'en_cartera';

alter table public.cheques enable row level security;

create policy "cheques_authenticated_all"
  on public.cheques for all
  to authenticated
  using (true)
  with check (true);
```

> Las alertas de "próximo a cobrar" se calculan automáticamente al entrar al Dashboard comparando `fecha_cobro` con la fecha actual. Cheques con ≤ 5 días de anticipación (o vencidos) y estado `en_cartera` se presentan en la sección de alertas del Dashboard.

---

## 7. Tabla `public.pagos`

Registro de pagos realizados a proveedores y personal de campo. Cada pago puede ser en efectivo, transferencia o cheque; si es cheque, guarda una referencia al cheque entregado.

```sql
create table public.pagos (
  id            uuid primary key default gen_random_uuid(),
  fecha         date not null,
  descripcion   text not null,                -- a quién se le pagó / concepto
  movimiento    text not null
                  check (movimiento in ('efectivo', 'transferencia', 'cheque')),
  total         numeric(14, 2) not null check (total > 0),
  cheque_id     uuid references public.cheques (id) on delete set null,
  notas         text,
  created_at    timestamptz not null default now()
);

create index pagos_fecha_idx   on public.pagos (fecha desc);
create index pagos_cheque_idx  on public.pagos (cheque_id) where cheque_id is not null;

alter table public.pagos enable row level security;

create policy "pagos_authenticated_all"
  on public.pagos for all
  to authenticated
  using (true)
  with check (true);
```

> Cuando el movimiento es `'cheque'` se registra `cheque_id` apuntando al cheque entregado, y su `entregado_a` se actualiza automáticamente desde la app.

---

## 8. Tablas de saldos: clientes y proveedores

Ejecutar **en orden** en Supabase → SQL Editor.

### 8a. Extender `public.clientes`

Agrega teléfono, notas y borrado lógico a la tabla que ya existe.

```sql
alter table public.clientes
  add column if not exists telefono text,
  add column if not exists notas    text,
  add column if not exists activo   boolean not null default true;
```

### 8b. Tabla `public.cobros`

Pagos recibidos **de** clientes (efectivo, transferencia o cheque).

```sql
create table public.cobros (
  id         uuid primary key default gen_random_uuid(),
  fecha      date not null,
  cliente_id uuid not null references public.clientes (id) on delete restrict,
  movimiento text not null
               check (movimiento in ('efectivo', 'transferencia', 'cheque')),
  monto      numeric(14, 2) not null check (monto > 0),
  notas      text,
  created_at timestamptz not null default now()
);

create index cobros_cliente_idx on public.cobros (cliente_id);
create index cobros_fecha_idx   on public.cobros (fecha desc);

alter table public.cobros enable row level security;

create policy "cobros_authenticated_all"
  on public.cobros for all
  to authenticated
  using (true)
  with check (true);
```

> **Saldo cliente** = `SUM(ventas.total)` − `SUM(cobros.monto)` para ese `cliente_id`.

---

### 8c. Tabla `public.proveedores`

```sql
create table public.proveedores (
  id       uuid primary key default gen_random_uuid(),
  nombre   text not null,
  telefono text,
  notas    text,
  activo   boolean not null default true,
  created_at timestamptz not null default now()
);

create index proveedores_nombre_idx on public.proveedores (nombre);

alter table public.proveedores enable row level security;

create policy "proveedores_authenticated_all"
  on public.proveedores for all
  to authenticated
  using (true)
  with check (true);
```

### 8d. Tabla `public.compras`

Lo que compramos a cada proveedor (genera la deuda).

```sql
create table public.compras (
  id           uuid primary key default gen_random_uuid(),
  fecha        date not null,
  proveedor_id uuid not null references public.proveedores (id) on delete restrict,
  descripcion  text not null,
  monto        numeric(14, 2) not null check (monto > 0),
  notas        text,
  created_at   timestamptz not null default now()
);

create index compras_proveedor_idx on public.compras (proveedor_id);
create index compras_fecha_idx     on public.compras (fecha desc);

alter table public.compras enable row level security;

create policy "compras_authenticated_all"
  on public.compras for all
  to authenticated
  using (true)
  with check (true);
```

### 8e. Tabla `public.pagos_proveedores` *(obsoleta — ya no se usa)*

> Esta tabla fue reemplazada. Los pagos a proveedores ahora se registran en `public.pagos` con `proveedor_id` vinculado. La tabla puede quedar vacía; la app no escribe en ella.

### 8f. Migración: columna `proveedor_id` en `public.pagos`

Los pagos a proveedores se guardan en la tabla `pagos` (pagos diarios) con `proveedor_id` opcional. Ejecutar **una sola vez** en Supabase:

```sql
alter table public.pagos
  add column if not exists proveedor_id uuid
    references public.proveedores (id) on delete set null;

create index pagos_proveedor_idx
  on public.pagos (proveedor_id)
  where proveedor_id is not null;
```

> **Saldo proveedor** = `SUM(compras.monto)` − `SUM(pagos.total WHERE proveedor_id = X)` para ese `proveedor_id`.

---

## 9. Tipos en TypeScript (referencia completa)

| Tabla                | Campos usados en UI / acciones |
|---------------------|--------------------------------|
| `embalajes`          | `id`, `nombre` |
| `productos`          | `id`, `nombre`, `precio_unitario`, `activo`, `embalaje_id` |
| `clientes`           | `id`, `nombre`, `telefono`, `notas`, `activo` |
| `ventas`             | `id`, `fecha`, `cliente_id`, `producto_id`, `cantidad_cajas`, `precio_unitario`, `total`, `created_at` |
| `cobros`             | `id`, `fecha`, `cliente_id`, `movimiento`, `monto`, `notas` |
| `cheques`            | `id`, `banco`, `cuit`, `numero_cheque`, `recibido_de`, `entregado_a`, `monto`, `fecha_cobro`, `estado`, `notas` |
| `pagos`              | `id`, `fecha`, `descripcion`, `movimiento`, `total`, `cheque_id`, `proveedor_id`, `notas` |
| `proveedores`        | `id`, `nombre`, `telefono`, `notas`, `activo` |
| `compras`            | `id`, `fecha`, `proveedor_id`, `descripcion`, `monto`, `notas` |

---

## 8. Row Level Security (RLS)

Usuarios autenticados vía Supabase Auth (`authenticated`). Ajustá si más adelante necesitás roles.

```sql
alter table public.productos enable row level security;
alter table public.clientes enable row level security;
alter table public.ventas enable row level security;

create policy "productos_authenticated_all"
  on public.productos for all
  to authenticated
  using (true)
  with check (true);

create policy "clientes_authenticated_all"
  on public.clientes for all
  to authenticated
  using (true)
  with check (true);

create policy "ventas_authenticated_all"
  on public.ventas for all
  to authenticated
  using (true)
  with check (true);
```

---

## 9. Errores frecuentes

- **No existe la tabla**: ejecutá el SQL en orden y revisá el esquema `public`.
- **RLS bloquea**: verificá que el usuario inició sesión y que las políticas existen.
- **Embeds vacíos en la API**: las relaciones `clientes` / `productos` / `embalajes` requieren FKs como en el script; si renombrás tablas, actualizá las políticas y el `select` en la app.
