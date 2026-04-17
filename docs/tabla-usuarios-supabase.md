# Usuarios y autenticación en Supabase

Este proyecto usa **Supabase Auth**. Los inicios de sesión válidos viven en el esquema `auth`, gestionado por Supabase. **No hay registro público en la app**: las cuentas se crean desde el panel (Authentication → Users) o por invitación.

---

## 1. Tabla `auth.users` (interna de Supabase)

Es la tabla principal de identidad. No debe editarse a mano salvo casos avanzados; use el panel o la API de Admin con service role (solo servidor).

| Campo | Tipo (típico) | Descripción |
|--------|----------------|-------------|
| `id` | `uuid` | Identificador único del usuario (PK). |
| `email` | `text` | Correo de acceso (único por proyecto). |
| `encrypted_password` | `text` | Hash de contraseña (no legible). |
| `email_confirmed_at` | `timestamptz` | Cuándo se confirmó el correo (si aplica). |
| `phone` | `text` | Teléfono si usa login por SMS (opcional). |
| `confirmed_at` | `timestamptz` | Confirmación general de identidad. |
| `last_sign_in_at` | `timestamptz` | Último inicio de sesión. |
| `raw_app_meta_data` | `jsonb` | Metadatos de app (p. ej. `provider`). |
| `raw_user_meta_data` | `jsonb` | Metadatos de perfil definidos al crear usuario. |
| `is_super_admin` | `boolean` | Uso interno/legacy en algunos despliegues. |
| `created_at` | `timestamptz` | Alta del registro. |
| `updated_at` | `timestamptz` | Última actualización. |
| `instance_id` | `uuid` | Instancia del proyecto Auth. |
| `aud` | `text` | Audiencia del token (p. ej. `authenticated`). |
| `role` | `text` | Rol en Auth (p. ej. `authenticated`). |

> La lista exacta puede variar ligeramente según la versión de Supabase; puede consultar en el SQL Editor: `\d auth.users` o las vistas del dashboard.

---

## 2. Tabla recomendada `public.usuarios` (perfil de negocio)

Para datos propios del cliente (nombre visible, rol de negocio, etc.) conviene una tabla en `public` enlazada a `auth.users`, con **RLS** (Row Level Security) para que cada usuario solo vea lo permitido.

Ejemplo de diseño:

| Campo | Tipo | Descripción |
|--------|------|-------------|
| `id` | `uuid` | PK, **mismo valor que** `auth.users.id` (`references auth.users(id) on delete cascade`). |
| `email` | `text` | Copia opcional para listados (o se lee solo desde `auth.users`). |
| `nombre_completo` | `text` | Nombre para mostrar en el panel. |
| `rol` | `text` | Rol de negocio, p. ej. `admin`, `operador` (definir valores con el cliente). |
| `activo` | `boolean` | Permite desactivar acceso sin borrar el usuario en Auth. |
| `created_at` | `timestamptz` | Alta del perfil. |
| `updated_at` | `timestamptz` | Última modificación. |

### SQL de ejemplo (ejecutar en Supabase SQL Editor)

Ajuste nombres y políticas según su modelo de permisos.

```sql
create table public.usuarios (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  nombre_completo text,
  rol text not null default 'operador',
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.usuarios enable row level security;

-- Lectura: el usuario solo ve su fila (ejemplo mínimo)
create policy "usuarios_select_own"
  on public.usuarios for select
  using (auth.uid() = id);
```

Tras crear un usuario en **Authentication → Users**, puede insertar la fila correspondiente en `public.usuarios` (o automatizarlo con un trigger `on auth.users` si lo desean más adelante).

---

## 3. Buenas prácticas de seguridad (resumen)

- Use solo la **anon key** en el frontend (variables `NEXT_PUBLIC_*`); la **service role** nunca en el cliente.
- Desactive **sign ups** públicos en Authentication → Providers si solo habrá cuentas creadas por usted.
- Defina políticas RLS en todas las tablas con datos sensibles.
