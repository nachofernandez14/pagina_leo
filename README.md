# Sistema de Gestión — Next.js + Supabase

Aplicación web de gestión de stocks, ventas diarias, saldos, proveedores, pagos y cheques. Construida con **Next.js 16**, **TypeScript**, **Tailwind CSS** y **Supabase** (PostgreSQL).

---

## Requisitos previos

- [Node.js](https://nodejs.org/) v18 o superior
- Una cuenta en [Supabase](https://supabase.com/) con el proyecto ya configurado

---

## Instalación local

### 1. Clonar el repositorio

```bash
git clone https://github.com/tu-usuario/tu-repo.git
cd tu-repo
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Configurar variables de entorno

Copiar el archivo de ejemplo y completar con los valores reales de tu proyecto Supabase:

```bash
cp .env.example .env.local
```

Editar `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
```

> Los valores se encuentran en el dashboard de Supabase en **Settings → API**.  
> Nunca uses la `service_role` key en el frontend — solo la `anon` key.

### 4. Levantar el servidor de desarrollo

```bash
npm run dev
```

Abrir [http://localhost:3000](http://localhost:3000) en el navegador.

---

## Scripts disponibles

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Servidor de desarrollo con hot-reload |
| `npm run build` | Build de producción |
| `npm run start` | Inicia el servidor de producción (requiere build previo) |
| `npm run lint` | Linter con ESLint |

---

## Stack tecnológico

- **[Next.js 16](https://nextjs.org/)** — Framework React con App Router y Server Actions
- **[Supabase](https://supabase.com/)** — Base de datos PostgreSQL + autenticación
- **[Tailwind CSS v4](https://tailwindcss.com/)** — Estilos utilitarios
- **[TypeScript](https://www.typescriptlang.org/)** — Tipado estático
- **[jsPDF](https://github.com/parallax/jsPDF)** — Generación de PDFs

---

## Estructura del proyecto

```
src/
├── app/
│   ├── (app)/          # Rutas protegidas de la aplicación
│   │   ├── dashboard/
│   │   ├── ventas-diarias/
│   │   ├── pagos-diarios/
│   │   ├── saldos/
│   │   ├── proveedores/
│   │   ├── campo/
│   │   ├── cheques/
│   │   └── productos/
│   ├── login/          # Autenticación
│   └── api/            # API routes (backup/restaurar)
├── components/         # Componentes React reutilizables
└── lib/
    └── supabase/       # Clientes de Supabase (browser, server, middleware)
```

---

## Autenticación

El acceso a la aplicación es **solo por invitación**: no existe registro público. El administrador crea los usuarios directamente desde el dashboard de Supabase (**Authentication → Users**).

---

## Variables de entorno — referencia

| Variable | Descripción | Dónde encontrarla |
|----------|-------------|-------------------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto Supabase | Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clave pública anon | Settings → API → Project API keys |

> **Nunca subas `.env.local` al repositorio.** Ya está incluido en `.gitignore`.
