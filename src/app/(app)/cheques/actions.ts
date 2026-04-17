"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type EstadoCheque = "en_cartera" | "cobrado" | "rechazado" | "entregado";

export type ChequeFila = {
  id: string;
  banco: string;
  cuit: string;
  numero_cheque: string;
  recibido_de: string;
  entregado_a: string | null;
  monto: number;
  fecha_cobro: string; // YYYY-MM-DD
  estado: EstadoCheque;
  notas: string | null;
  created_at: string;
};

export type ChequeInput = {
  banco: string;
  cuit: string;
  numero_cheque: string;
  recibido_de: string;
  entregado_a: string | null;
  monto: number;
  fecha_cobro: string;
  notas: string | null;
};

function revalidateCheques() {
  revalidatePath("/cheques");
  revalidatePath("/dashboard");
}

// ─── Listar todos ────────────────────────────────────────────────────────────

export async function listarCheques(): Promise<
  { ok: true; cheques: ChequeFila[] } | { ok: false; error: string }
> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("cheques")
    .select("*")
    .order("fecha_cobro", { ascending: true });

  if (error) {
    return {
      ok: false,
      error:
        error.message.includes("relation") || error.code === "42P01"
          ? "Falta crear la tabla cheques (ver docs/schema-ventas-clientes-productos.md)."
          : error.message,
    };
  }

  const cheques = (data ?? []).map((row) => ({
    ...row,
    monto: Number(row.monto),
  })) as ChequeFila[];

  return { ok: true, cheques };
}

// ─── Listar próximos a cobrar (para alertas y dashboard) ─────────────────────
// Devuelve cheques `en_cartera` cuya fecha_cobro <= hoy + `dias`
// (incluye vencidos no cobrados)

export async function listarChequesProximos(dias = 5): Promise<
  { ok: true; cheques: ChequeFila[] } | { ok: false; error: string }
> {
  const supabase = await createClient();

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() + dias);
  const cutoffStr = cutoff.toISOString().split("T")[0];

  const { data, error } = await supabase
    .from("cheques")
    .select("*")
    .eq("estado", "en_cartera")
    .is("entregado_a", null)
    .lte("fecha_cobro", cutoffStr)
    .order("fecha_cobro", { ascending: true });

  if (error) {
    // Si la tabla todavía no existe, silenciamos el error (UI no explota)
    if (error.message.includes("relation") || error.code === "42P01") {
      return { ok: true, cheques: [] };
    }
    return { ok: false, error: error.message };
  }

  const cheques = (data ?? []).map((row) => ({
    ...row,
    monto: Number(row.monto),
  })) as ChequeFila[];

  return { ok: true, cheques };
}

// ─── Cheques disponibles para entregar (sin entregado_a) ─────────────────────

export async function listarChequesDisponibles(): Promise<
  { ok: true; cheques: ChequeFila[] } | { ok: false; error: string }
> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("cheques")
    .select("*")
    .eq("estado", "en_cartera")
    .is("entregado_a", null)
    .order("fecha_cobro", { ascending: true });

  if (error) {
    if (error.message.includes("relation") || error.code === "42P01") {
      return { ok: true, cheques: [] };
    }
    return { ok: false, error: error.message };
  }

  const cheques = (data ?? []).map((row) => ({
    ...row,
    monto: Number(row.monto),
  })) as ChequeFila[];

  return { ok: true, cheques };
}

// ─── Cheques en cartera (para dashboard) ─────────────────────────────────────

export async function listarChequesEnCartera(): Promise<
  { ok: true; cheques: ChequeFila[] } | { ok: false; error: string }
> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("cheques")
    .select("*")
    .eq("estado", "en_cartera")
    .is("entregado_a", null)
    .order("fecha_cobro", { ascending: true });

  if (error) {
    if (error.message.includes("relation") || error.code === "42P01") {
      return { ok: true, cheques: [] };
    }
    return { ok: false, error: error.message };
  }

  const cheques = (data ?? []).map((row) => ({
    ...row,
    monto: Number(row.monto),
  })) as ChequeFila[];

  return { ok: true, cheques };
}

// ─── Crear ────────────────────────────────────────────────────────────────────

export async function crearCheque(
  input: ChequeInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const banco = input.banco.trim();
  const cuit = input.cuit.trim();
  const numero = input.numero_cheque.trim();
  const recibido = input.recibido_de.trim();
  const monto = Number(input.monto);

  if (!banco) return { ok: false, error: "El banco es obligatorio." };
  if (!cuit) return { ok: false, error: "El CUIT es obligatorio." };
  if (cuit.replace(/\D/g, "").length !== 11)
    return { ok: false, error: "El CUIT debe tener exactamente 11 dígitos." };
  if (!numero) return { ok: false, error: "El número de cheque es obligatorio." };
  if (!/^\d{8}$/.test(numero))
    return { ok: false, error: "El número de cheque debe tener exactamente 8 dígitos." };
  if (!recibido) return { ok: false, error: "El campo 'Recibido de' es obligatorio." };
  if (!Number.isFinite(monto) || monto <= 0) {
    return { ok: false, error: "El monto debe ser mayor a 0." };
  }
  if (!input.fecha_cobro || !/^\d{4}-\d{2}-\d{2}$/.test(input.fecha_cobro)) {
    return { ok: false, error: "La fecha de cobro no es válida." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("cheques").insert({
    banco,
    cuit,
    numero_cheque: numero,
    recibido_de: recibido,
    entregado_a: input.entregado_a?.trim() || null,
    monto,
    fecha_cobro: input.fecha_cobro,
    estado: "en_cartera" as EstadoCheque,
    notas: input.notas?.trim() || null,
  });

  if (error) {
    return {
      ok: false,
      error:
        error.message.includes("relation") || error.code === "42P01"
          ? "Falta crear la tabla cheques en Supabase."
          : error.message,
    };
  }

  revalidateCheques();
  return { ok: true };
}

// ─── Actualizar ───────────────────────────────────────────────────────────────

export async function actualizarCheque(
  input: ChequeInput & { id: string },
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!input.id) return { ok: false, error: "Cheque inválido." };

  const banco = input.banco.trim();
  const cuit = input.cuit.trim();
  const numero = input.numero_cheque.trim();
  const recibido = input.recibido_de.trim();
  const monto = Number(input.monto);

  if (!banco) return { ok: false, error: "El banco es obligatorio." };
  if (!cuit) return { ok: false, error: "El CUIT es obligatorio." };
  if (cuit.replace(/\D/g, "").length !== 11)
    return { ok: false, error: "El CUIT debe tener exactamente 11 dígitos." };
  if (!numero) return { ok: false, error: "El número de cheque es obligatorio." };
  if (!/^\d{8}$/.test(numero))
    return { ok: false, error: "El número de cheque debe tener exactamente 8 dígitos." };
  if (!recibido) return { ok: false, error: "El campo 'Recibido de' es obligatorio." };
  if (!Number.isFinite(monto) || monto <= 0) {
    return { ok: false, error: "El monto debe ser mayor a 0." };
  }
  if (!input.fecha_cobro || !/^\d{4}-\d{2}-\d{2}$/.test(input.fecha_cobro)) {
    return { ok: false, error: "La fecha de cobro no es válida." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("cheques")
    .update({
      banco,
      cuit,
      numero_cheque: numero,
      recibido_de: recibido,
      entregado_a: input.entregado_a?.trim() || null,
      monto,
      fecha_cobro: input.fecha_cobro,
      notas: input.notas?.trim() || null,
    })
    .eq("id", input.id);

  if (error) return { ok: false, error: error.message };

  revalidateCheques();
  return { ok: true };
}

// ─── Cambiar estado ───────────────────────────────────────────────────────────

export async function cambiarEstadoCheque(
  id: string,
  estado: EstadoCheque,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!id) return { ok: false, error: "Cheque inválido." };

  const supabase = await createClient();
  const { error } = await supabase.from("cheques").update({ estado }).eq("id", id);

  if (error) return { ok: false, error: error.message };

  revalidateCheques();
  return { ok: true };
}
