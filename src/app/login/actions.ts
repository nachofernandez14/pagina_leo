"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Server Action: maneja el login cuando el JS del cliente no está listo todavía
 * (progressive enhancement). Cuando JS está disponible, el formulario usa
 * handleSubmit client-side; este action actúa como fallback confiable.
 */
export async function loginAction(formData: FormData) {
  const email = (formData.get("email") as string | null)?.trim() ?? "";
  const password = (formData.get("password") as string | null) ?? "";

  if (!email || !password) {
    redirect("/login?error=auth");
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect("/login?error=auth");
  }

  redirect("/dashboard");
}
