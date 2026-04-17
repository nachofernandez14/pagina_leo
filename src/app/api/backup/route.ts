import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const TABLES = [
  "clientes",
  "ventas",
  "cobros",
  "proveedores",
  "compras",
  "pagos",
  "productos",
  "embalajes",
  "stock_puesto",
  "cheques",
  "personas_campo",
  "cargas",
  "pagos_campo",
] as const;

export async function GET() {
  const supabase = await createClient();

  // Verificar que el usuario está autenticado
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return new NextResponse("No autorizado", { status: 401 });
  }

  const backup: Record<string, unknown[]> = {};
  const errors: string[] = [];

  for (const table of TABLES) {
    const { data, error } = await supabase.from(table).select("*").order("id" as never);
    if (error) {
      errors.push(`${table}: ${error.message}`);
      backup[table] = [];
    } else {
      backup[table] = data ?? [];
    }
  }

  const now = new Date();
  const fecha = now.toISOString().slice(0, 10); // YYYY-MM-DD
  const hora = now.toTimeString().slice(0, 5).replace(":", "-"); // HH-MM

  const payload = {
    exportado_en: now.toISOString(),
    exportado_por: user.email ?? user.id,
    tablas: TABLES,
    errores: errors.length > 0 ? errors : undefined,
    datos: backup,
  };

  return new NextResponse(JSON.stringify(payload, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="backup-${fecha}_${hora}.json"`,
    },
  });
}
