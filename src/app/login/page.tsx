import { Suspense } from "react";
import { LoginForm } from "./login-form";

/**
 * Ruta pública de login. El middleware redirige aquí si no hay sesión válida.
 */
export default function LoginPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-12">
      {/* Base: tonos ciruela / frutales en violeta oscuro */}
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-violet-950 via-purple-950 to-indigo-950"
        aria-hidden
      />
      {/* Luz suave tipo “viñedo” / cielo al atardecer */}
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_90%_60%_at_50%_-15%,rgba(167,139,250,0.35),transparent_55%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_85%,rgba(109,40,217,0.45),transparent_45%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_90%_70%,rgba(76,29,149,0.5),transparent_40%)]"
        aria-hidden
      />
      {/* Motivo orgánico muy sutil (ondas) */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07] bg-[url('data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2260%22%20height%3D%2260%22%3E%3Cpath%20fill%3D%22%23faf5ff%22%20d%3D%22M30%205c8%200%2015%205%2018%2012%20-6%201-12%205-15%2011-4-8-10-14-18-15%203-5%209-8%2015-8z%22%2F%3E%3C%2Fsvg%3E')]"
        aria-hidden
      />

      <div className="relative z-10 w-full max-w-md">
        <Suspense
          fallback={
            <div className="rounded-2xl border border-violet-300/30 bg-white/10 px-6 py-8 text-center text-violet-100 backdrop-blur-sm">
              Cargando…
            </div>
          }
        >
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
