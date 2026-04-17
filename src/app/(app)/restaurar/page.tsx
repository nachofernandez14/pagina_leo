import { RestaurarClient } from "@/components/restaurar/restaurar-client";

export default function RestaurarPage() {
  return (
    <div className="mx-auto w-full max-w-[88rem]">
      {/* Header */}
      <header className="mb-8 overflow-hidden rounded-2xl border border-red-200/70 bg-gradient-to-br from-red-50 via-white to-orange-50/40 shadow-md shadow-red-900/8 ring-1 ring-red-100">
        <div className="relative px-6 py-5">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_100%_0%,_theme(colors.red.200/35),_transparent)]" />
          <div className="relative flex items-center gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-red-600 to-orange-600 text-white shadow-lg shadow-red-900/30">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.8}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 7v10c0 2 1 3 3 3h10c2 0 3-1 3-3V7M4 7h16M4 7l2-3h12l2 3M10 12v5M14 12v5"
                />
              </svg>
            </span>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-red-500">
                Administración
              </p>
              <h1 className="text-2xl font-bold tracking-tight text-red-950">
                Restaurar backup
              </h1>
              <p className="mt-0.5 max-w-xl text-sm text-red-700/70">
                Cargá un archivo de backup para restaurar todos los datos de la
                base de datos.
              </p>
            </div>
          </div>
        </div>
      </header>

      <RestaurarClient />
    </div>
  );
}
