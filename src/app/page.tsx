import { redirect } from "next/navigation";

/** La raíz redirige al dashboard del área autenticada (el middleware ya filtra invitados). */
export default function Home() {
  redirect("/dashboard");
}
