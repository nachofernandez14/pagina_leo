import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Orden de eliminación: de hijos a padres (respeta FK)
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

// Orden de inserción: de padres a hijos (respeta FK)
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
  // 1. Verificar auth
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  // 2. Verificar contraseña
  const expectedPassword = process.env.RESTAURAR_PASSWORD;
  if (!expectedPassword) {
    return NextResponse.json(
      {
        error:
          "RESTAURAR_PASSWORD no está configurada en el servidor. Agregala al archivo .env.local",
      },
      { status: 500 },
    );
  }
  const providedPassword = req.headers.get("x-restore-password");
  if (providedPassword !== expectedPassword) {
    return NextResponse.json({ error: "Contraseña incorrecta" }, { status: 403 });
  }

  // 3. Parsear el backup
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

  // 4. Fase 1 — Eliminar todos los datos en orden inverso de FK
  for (const tabla of DELETE_ORDER) {
    const { error } = await supabase.from(tabla).delete().not("id", "is", null);
    if (error) {
      // Registrar el error pero continuar (podría ser tabla vacía o política RLS)
      resumen.push({ tabla, insertados: 0, error_eliminacion: error.message });
    }
  }

  // 5. Fase 2 — Insertar desde el backup en orden FK
  for (const tabla of INSERT_ORDER) {
    const rows = datos[tabla];

    // Tabla existente en el resumen de error de eliminación
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

  return NextResponse.json({ ok: true, resumen });
}
