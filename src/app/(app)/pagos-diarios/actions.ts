"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type TipoMovimiento = "efectivo" | "transferencia" | "cheque";

export type PagoFila = {
  id: string;
  fecha: string; // YYYY-MM-DD
  descripcion: string;
  movimiento: TipoMovimiento;
  total: number;
  cheque_id: string | null;
  cheque_numero: string | null; // número cheque entregado (join)
  proveedor_id: string | null;
  proveedor_nombre: string | null;
  notas: string | null;
  created_at: string;
  fuente?: "campo"; // presente solo para pagos de campo (tabla pagos_campo)
};

export type PagoInput = {
  fecha: string;
  descripcion: string;
  movimiento: TipoMovimiento;
  total: number;
  cheque_id: string | null;
  proveedor_id: string | null;
  notas: string | null;
};

function revalidatePagos() {
  revalidatePath("/pagos-diarios");
  revalidatePath("/dashboard");
}

// ─── Listar pagos por fecha ───────────────────────────────────────────────────

export async function listarPagosPorFecha(
  fecha: string,
): Promise<{ ok: true; pagos: PagoFila[] } | { ok: false; error: string }> {
  if (!fecha || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    return { ok: false, error: "Fecha inválida." };
  }
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("pagos")
    .select(
      `
      id,
      fecha,
      descripcion,
      movimiento,
      total,
      cheque_id,
      proveedor_id,
      notas,
      created_at,
      cheques ( numero_cheque ),
      proveedores ( nombre )
    `,
    )
    .eq("fecha", fecha)
    .order("created_at", { ascending: false });

  if (error) {
    return {
      ok: false,
      error:
        error.message.includes("relation") || error.code === "42P01"
          ? "Falta crear la tabla pagos (ver docs/schema-ventas-clientes-productos.md)."
          : error.message,
    };
  }

  const pagosBase: PagoFila[] = (data ?? []).map((row) => {
    const chqObj = Array.isArray(row.cheques) ? row.cheques[0] : row.cheques;
    const provObj = Array.isArray(row.proveedores) ? row.proveedores[0] : row.proveedores;
    return {
      id: row.id,
      fecha: row.fecha,
      descripcion: row.descripcion,
      movimiento: row.movimiento as TipoMovimiento,
      total: Number(row.total),
      cheque_id: row.cheque_id ?? null,
      cheque_numero:
        (chqObj as { numero_cheque?: string } | null)?.numero_cheque ?? null,
      proveedor_id: row.proveedor_id ?? null,
      proveedor_nombre: (provObj as { nombre?: string } | null)?.nombre ?? null,
      notas: row.notas ?? null,
      created_at: row.created_at,
    };
  });

  // También traer pagos de campo (arrendatarios) para ese día
  const { data: dataCampo } = await supabase
    .from("pagos_campo")
    .select(`id, fecha, movimiento, monto, cheque_id, notas, created_at, personas_campo ( nombre ), cheques ( numero_cheque )`)
    .eq("fecha", fecha)
    .order("created_at", { ascending: false });

  const pagosCampo: PagoFila[] = (dataCampo ?? []).map((row) => {
    const personaObj = Array.isArray(row.personas_campo) ? row.personas_campo[0] : row.personas_campo;
    const chqObj = Array.isArray(row.cheques) ? row.cheques[0] : row.cheques;
    const nombre = (personaObj as { nombre?: string } | null)?.nombre ?? "Arrendatario";
    return {
      id: row.id,
      fecha: row.fecha,
      descripcion: `Campo – ${nombre}`,
      movimiento: row.movimiento as TipoMovimiento,
      total: Number(row.monto),
      cheque_id: row.cheque_id ?? null,
      cheque_numero: (chqObj as { numero_cheque?: string } | null)?.numero_cheque ?? null,
      proveedor_id: null,
      proveedor_nombre: null,
      notas: row.notas ?? null,
      created_at: row.created_at,
      fuente: "campo" as const,
    };
  });

  const pagos = [...pagosBase, ...pagosCampo].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );

  return { ok: true, pagos };
}

// ─── Crear pago ───────────────────────────────────────────────────────────────

export async function crearPago(
  input: PagoInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const descripcion = input.descripcion.trim();
  const total = Number(input.total);

  if (!input.fecha || !/^\d{4}-\d{2}-\d{2}$/.test(input.fecha)) {
    return { ok: false, error: "Fecha inválida." };
  }
  if (!descripcion) {
    return { ok: false, error: "La descripción es obligatoria." };
  }
  if (descripcion.length > 500) {
    return { ok: false, error: "La descripción no puede superar 500 caracteres." };
  }
  if (!["efectivo", "transferencia", "cheque"].includes(input.movimiento)) {
    return { ok: false, error: "Tipo de movimiento inválido." };
  }
  if (!Number.isFinite(total) || total <= 0) {
    return { ok: false, error: "El total debe ser mayor a 0." };
  }
  if (input.movimiento === "cheque" && !input.cheque_id) {
    return { ok: false, error: "Seleccioná el cheque a entregar." };
  }

  const supabase = await createClient();

  const { error } = await supabase.from("pagos").insert({
    fecha: input.fecha,
    descripcion,
    movimiento: input.movimiento,
    total,
    cheque_id: input.movimiento === "cheque" ? input.cheque_id : null,
    proveedor_id: input.proveedor_id ?? null,
    notas: input.notas?.trim() || null,
  });

  if (error) {
    return {
      ok: false,
      error:
        error.message.includes("relation") || error.code === "42P01"
          ? "Falta crear la tabla pagos en Supabase."
          : error.message,
    };
  }

  // Si el pago es con cheque, marcarlo como entregado con la descripción
  if (input.movimiento === "cheque" && input.cheque_id) {
    await supabase
      .from("cheques")
      .update({ entregado_a: descripcion, estado: "entregado" })
      .eq("id", input.cheque_id);
  }

  revalidatePagos();
  return { ok: true };
}

// ─── Actualizar pago ──────────────────────────────────────────────────────────

export async function actualizarPago(
  input: PagoInput & { id: string },
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!input.id) return { ok: false, error: "Pago inválido." };

  const descripcion = input.descripcion.trim();
  const total = Number(input.total);

  if (!input.fecha || !/^\d{4}-\d{2}-\d{2}$/.test(input.fecha)) {
    return { ok: false, error: "Fecha inválida." };
  }
  if (!descripcion) {
    return { ok: false, error: "La descripción es obligatoria." };
  }
  if (!["efectivo", "transferencia", "cheque"].includes(input.movimiento)) {
    return { ok: false, error: "Tipo de movimiento inválido." };
  }
  if (!Number.isFinite(total) || total <= 0) {
    return { ok: false, error: "El total debe ser mayor a 0." };
  }
  if (input.movimiento === "cheque" && !input.cheque_id) {
    return { ok: false, error: "Seleccioná el cheque a entregar." };
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("pagos")
    .update({
      fecha: input.fecha,
      descripcion,
      movimiento: input.movimiento,
      total,
      cheque_id: input.movimiento === "cheque" ? input.cheque_id : null,
      proveedor_id: input.proveedor_id ?? null,
      notas: input.notas?.trim() || null,
    })
    .eq("id", input.id);

  if (error) return { ok: false, error: error.message };

  revalidatePagos();
  return { ok: true };
}
