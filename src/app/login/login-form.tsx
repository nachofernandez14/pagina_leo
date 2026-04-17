"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { loginAction } from "./actions";

/**
 * Formulario de inicio de sesión únicamente (sin registro público).
 * Las cuentas se crean desde el panel de Supabase por el administrador.
 */
export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const authError = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(
    authError === "auth"
      ? "No se pudo completar el inicio de sesión. Intente nuevamente."
      : null,
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    setLoading(false);

    if (error) {
      // Mensaje genérico para no filtrar si el correo existe o no.
      setMessage("Correo o contraseña incorrectos.");
      return;
    }

    router.replace("/dashboard");
    router.refresh();
  }

  return (
    <div className="w-full rounded-2xl border border-violet-200/70 bg-white/95 p-8 shadow-2xl shadow-violet-950/25 backdrop-blur-md">
      <div className="mb-8 flex flex-col items-center gap-4 text-center">
        <Image
          src="/images/logo_leo.png"
          alt="Logo"
          width={160}
          height={80}
          className="h-auto w-40 object-contain"
          priority
        />
        <div>
          <h1 className="text-xl font-semibold text-violet-950">
            Iniciar sesión
          </h1>
          <p className="mt-1 text-sm text-violet-800/80">
            Acceso restringido. Si no tiene cuenta, contacte al administrador.
          </p>
        </div>
      </div>

      <form action={loginAction} onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="email" className="text-sm font-medium text-violet-950">
            Correo electrónico
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-lg border border-violet-200 bg-violet-50/60 px-3 py-2 text-violet-950 outline-none transition-shadow placeholder:text-violet-400 focus:border-violet-400 focus:ring-2 focus:ring-violet-500/40"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="password" className="text-sm font-medium text-violet-950">
            Contraseña
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-lg border border-violet-200 bg-violet-50/60 px-3 py-2 text-violet-950 outline-none transition-shadow placeholder:text-violet-400 focus:border-violet-400 focus:ring-2 focus:ring-violet-500/40"
          />
        </div>

        {message ? (
          <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-800" role="alert">
            {message}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={loading}
          className="mt-2 rounded-lg bg-gradient-to-r from-violet-700 to-purple-700 px-4 py-2.5 text-sm font-semibold text-violet-50 shadow-md shadow-violet-900/25 transition hover:from-violet-600 hover:to-purple-600 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Ingresando…" : "Ingresar"}
        </button>
      </form>
    </div>
  );
}
