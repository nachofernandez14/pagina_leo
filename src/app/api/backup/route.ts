import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit, auditLog } from "@/lib/security";

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

export async function GET(req: NextRequest) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return new NextResponse("No autorizado", { status: 401 });
  }

  const email = user.email ?? user.id;

  // Rate limiting: máx 1 backup cada 60 segundos por usuario
  if (!checkRateLimit(`backup:${email}`, 1, 60_000)) {
    auditLog(email, "BACKUP_DENIED", "Rate limit excedido");
    return NextResponse.json(
      { error: "Solo podés descargar un backup por minuto. Esperá unos segundos." },
      { status: 429 },
    );
  }

  // Validar token de confirmación (evita que un CSRF/fetch inadvertido descargue datos)
  const confirmToken = req.headers.get("x-backup-confirm");
  if (confirmToken !== "confirmed") {
    auditLog(email, "BACKUP_DENIED", "Falta token de confirmación");
    return NextResponse.json(
      { error: "Debés confirmar la descarga desde el panel de Configuración." },
      { status: 403 },
    );
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
  const fecha = now.toISOString().slice(0, 10);
  const hora = now.toTimeString().slice(0, 5).replace(":", "-");

  const payload = {
    exportado_en: now.toISOString(),
    exportado_por: email,
    tablas: TABLES,
    errores: errors.length > 0 ? errors : undefined,
    datos: backup,
  };

  auditLog(email, "BACKUP_EXPORT", `Exportadas ${Object.values(backup).reduce((s, a) => s + a.length, 0)} filas de ${TABLES.length} tablas`);

  return new NextResponse(JSON.stringify(payload, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="backup-${fecha}_${hora}.json"`,
    },
  });
}
