"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/** Cierra la sesión de Supabase y vuelve al login. */
export function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      className="w-full rounded-lg border border-violet-300/35 bg-white/5 px-3 py-2 text-left text-sm text-violet-100 transition-colors hover:bg-white/15 hover:text-white"
    >
      Cerrar sesión
    </button>
  );
}
