import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit, auditLog } from "@/lib/security";
import { timingSafeEqual } from "crypto";

const DELETE_ORDER = [
  "stock_puesto",
  "pagos_campo",
  "cargas",
  "personas_campo",
  "pagos",
  "compras",
  "cobros",
  "ventas",
  "cheques",
  "proveedores",
  "clientes",
  "productos",
  "embalajes",
] as const;

const INSERT_ORDER = [
  "embalajes",
  "productos",
  "clientes",
  "proveedores",
  "cheques",
  "ventas",
  "cobros",
  "compras",
  "pagos",
  "personas_campo",
  "cargas",
  "pagos_campo",
  "stock_puesto",
] as const;

type FilaResultado = {
  tabla: string;
  insertados: number;
  error_eliminacion?: string;
  error_insercion?: string;
};

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const email = user.email ?? user.id;

  // Rate limiting: máx 1 restauración cada 5 minutos por usuario
  if (!checkRateLimit(`restore:${email}`, 1, 300_000)) {
    auditLog(email, "RESTORE_DENIED", "Rate limit excedido");
    return NextResponse.json(
      { error: "Solo podés restaurar un backup cada 5 minutos." },
      { status: 429 },
    );
  }

  const expectedPassword = process.env.RESTAURAR_PASSWORD;
  if (!expectedPassword) {
    auditLog(email, "RESTORE_DENIED", "RESTAURAR_PASSWORD no configurada");
    return NextResponse.json(
      {
        error:
          "RESTAURAR_PASSWORD no está configurada en el servidor. Agregala al archivo .env.local",
      },
      { status: 500 },
    );
  }

  const providedPassword = req.headers.get("x-restore-password") ?? "";
  const pwBuffer = Buffer.from(providedPassword);
  const expectedBuffer = Buffer.from(expectedPassword);

  if (pwBuffer.length !== expectedBuffer.length || !timingSafeEqual(pwBuffer, expectedBuffer)) {
    auditLog(email, "RESTORE_DENIED", "Contraseña incorrecta");
    return NextResponse.json({ error: "Contraseña incorrecta" }, { status: 403 });
  }

  let datos: Record<string, unknown[]>;
  try {
    const body = (await req.json()) as { datos?: Record<string, unknown[]> };
    if (!body.datos || typeof body.datos !== "object") {
      throw new Error("Formato inválido");
    }
    datos = body.datos;
  } catch {
    return NextResponse.json(
      { error: "El cuerpo de la solicitud no es un backup válido" },
      { status: 400 },
    );
  }

  const resumen: FilaResultado[] = [];

  for (const tabla of DELETE_ORDER) {
    const { error } = await supabase.from(tabla).delete().not("id", "is", null);
    if (error) {
      resumen.push({ tabla, insertados: 0, error_eliminacion: error.message });
    }
  }

  for (const tabla of INSERT_ORDER) {
    const rows = datos[tabla];
    const filaExistente = resumen.find((r) => r.tabla === tabla);

    if (!rows || rows.length === 0) {
      if (!filaExistente) {
        resumen.push({ tabla, insertados: 0 });
      }
      continue;
    }

    const { error } = await supabase.from(tabla).insert(rows);
    if (error) {
      if (filaExistente) {
        filaExistente.error_insercion = error.message;
      } else {
        resumen.push({ tabla, insertados: 0, error_insercion: error.message });
      }
    } else {
      if (filaExistente) {
        filaExistente.insertados = rows.length;
      } else {
        resumen.push({ tabla, insertados: rows.length });
      }
    }
  }

  const totalInsertados = resumen.reduce((s, r) => s + r.insertados, 0);
  auditLog(email, "RESTORE_COMPLETE", `Restaurados ${totalInsertados} registros en ${resumen.length} tablas`);

  return NextResponse.json({ ok: true, resumen });
}
