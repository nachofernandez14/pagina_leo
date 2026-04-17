import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/**
 * Intercambia el código PKCE de Supabase por una sesión (email mágico, OAuth, etc.).
 * El login por email/contraseña no siempre usa esta ruta, pero conviene tenerla configurada.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const nextRaw = searchParams.get("next") ?? "/dashboard";

  // Prevenir open redirect: solo se permiten rutas internas relativas.
  const next =
    nextRaw.startsWith("/") && !nextRaw.startsWith("//") ? nextRaw : "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
