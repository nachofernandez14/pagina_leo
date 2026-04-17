import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppSidebar } from "@/components/app-sidebar";

/**
 * Layout del área privada: exige usuario autenticado y muestra la barra lateral.
 */
export default async function AppAreaLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen flex-col md:flex-row bg-[var(--background)] text-[var(--foreground)]">
      <AppSidebar userEmail={user.email ?? ""} />
      <main className="flex-1 min-w-0 px-3 py-6 sm:px-4 md:px-5 md:py-8 lg:px-6">
        {children}
      </main>
    </div>
  );
}
