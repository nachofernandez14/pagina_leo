import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Cliente de Supabase en el servidor (Server Components, Server Actions, Route Handlers).
 * Persiste la sesión en cookies httpOnly gestionadas por Supabase.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // setAll puede llamarse desde un Server Component sin contexto de mutación de cookies;
            // el middleware se encarga de refrescar la sesión.
          }
        },
      },
    },
  );
}
