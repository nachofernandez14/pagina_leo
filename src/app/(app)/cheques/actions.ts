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
  recibido_de_cliente_id: string | null;
  entregado_a: string | null;
  entregado_a_proveedor_id: string | null;
  entregado_a_persona_campo_id: string | null;
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
  recibido_de_cliente_id: string | null;
  entregado_a: string | null;
  entregado_a_proveedor_id: string | null;
  entregado_a_persona_campo_id: string | null;
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
  if (banco.length > 100) return { ok: false, error: "El banco no puede superar 100 caracteres." };
  if (!cuit) return { ok: false, error: "El CUIT es obligatorio." };
  if (cuit.replace(/\D/g, "").length !== 11)
    return { ok: false, error: "El CUIT debe tener exactamente 11 dígitos." };
  if (!numero) return { ok: false, error: "El número de cheque es obligatorio." };
  if (!/^\d{8}$/.test(numero))
    return { ok: false, error: "El número de cheque debe tener exactamente 8 dígitos." };
  if (!recibido) return { ok: false, error: "El campo 'Recibido de' es obligatorio." };
  if (recibido.length > 200) return { ok: false, error: "El campo 'Recibido de' no puede superar 200 caracteres." };
  if (!Number.isFinite(monto) || monto <= 0) {
    return { ok: false, error: "El monto debe ser mayor a 0." };
  }
  if (!input.fecha_cobro || !/^\d{4}-\d{2}-\d{2}$/.test(input.fecha_cobro)) {
    return { ok: false, error: "La fecha de cobro no es válida." };
  }

  const entregadoA = input.entregado_a?.trim() || null;
  const estadoInicial: EstadoCheque =
    input.entregado_a_proveedor_id || input.entregado_a_persona_campo_id
      ? "entregado"
      : "en_cartera";

  const supabase = await createClient();

  // Evitar duplicados: mismo número + mismo banco
  const { count: dupCount } = await supabase
    .from("cheques")
    .select("id", { count: "exact", head: true })
    .eq("numero_cheque", numero)
    .eq("banco", banco);
  if (dupCount && dupCount > 0) {
    return { ok: false, error: `Ya existe un cheque N° ${numero} del banco ${banco}.` };
  }

  const { data: inserted, error } = await supabase
    .from("cheques")
    .insert({
      banco,
      cuit,
      numero_cheque: numero,
      recibido_de: recibido,
      recibido_de_cliente_id: input.recibido_de_cliente_id || null,
      entregado_a: entregadoA,
      entregado_a_proveedor_id: input.entregado_a_proveedor_id || null,
      entregado_a_persona_campo_id: input.entregado_a_persona_campo_id || null,
      monto,
      fecha_cobro: input.fecha_cobro,
      estado: estadoInicial,
      notas: input.notas?.trim() || null,
    })
    .select("id")
    .single();

  if (error) {
    return {
      ok: false,
      error:
        error.message.includes("relation") || error.code === "42P01"
          ? "Falta crear la tabla cheques en Supabase."
          : error.message,
    };
  }

  const chequeId = inserted.id as string;
  const today = new Date().toISOString().split("T")[0];

  // Auto-crear cobro en saldo del cliente si está vinculado
  if (input.recibido_de_cliente_id) {
    await supabase.from("cobros").insert({
      fecha: today,
      cliente_id: input.recibido_de_cliente_id,
      movimiento: "cheque",
      monto,
      cheque_id: chequeId,
      notas: `Cheque N° ${numero} – ${banco}`,
    });
    revalidatePath("/saldos");
  }

  // Auto-crear pago a proveedor si está vinculado
  if (input.entregado_a_proveedor_id) {
    const { count } = await supabase
      .from("pagos")
      .select("id", { count: "exact", head: true })
      .eq("cheque_id", chequeId);
    if (!count || count === 0) {
      await supabase.from("pagos").insert({
        fecha: today,
        proveedor_id: input.entregado_a_proveedor_id,
        descripcion: entregadoA ?? "Pago con cheque",
        movimiento: "cheque",
        total: monto,
        cheque_id: chequeId,
        notas: input.notas?.trim() || null,
      });
      revalidatePath("/proveedores");
    }
  }

  // Auto-crear pago a persona de campo si está vinculado
  if (input.entregado_a_persona_campo_id) {
    const { count } = await supabase
      .from("pagos_campo")
      .select("id", { count: "exact", head: true })
      .eq("cheque_id", chequeId);
    if (!count || count === 0) {
      await supabase.from("pagos_campo").insert({
        fecha: today,
        persona_campo_id: input.entregado_a_persona_campo_id,
        movimiento: "cheque",
        monto,
        cheque_id: chequeId,
        notas: input.notas?.trim() || null,
      });
      revalidatePath("/campo");
    }
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

  // Obtener estado actual para saber qué cambió
  const { data: actual } = await supabase
    .from("cheques")
    .select("recibido_de_cliente_id, entregado_a_proveedor_id, entregado_a_persona_campo_id, monto, estado")
    .eq("id", input.id)
    .single();

  const entregadoA = input.entregado_a?.trim() || null;
  const nuevoEstado: EstadoCheque = (() => {
    const tieneEntrega = input.entregado_a_proveedor_id || input.entregado_a_persona_campo_id;
    if (tieneEntrega) return "entregado";
    if (actual?.estado === "cobrado" || actual?.estado === "rechazado") return actual.estado;
    return "en_cartera";
  })();

  const { error } = await supabase
    .from("cheques")
    .update({
      banco,
      cuit,
      numero_cheque: numero,
      recibido_de: recibido,
      recibido_de_cliente_id: input.recibido_de_cliente_id || null,
      entregado_a: entregadoA,
      entregado_a_proveedor_id: input.entregado_a_proveedor_id || null,
      entregado_a_persona_campo_id: input.entregado_a_persona_campo_id || null,
      monto,
      fecha_cobro: input.fecha_cobro,
      estado: nuevoEstado,
      notas: input.notas?.trim() || null,
    })
    .eq("id", input.id);

  if (error) return { ok: false, error: error.message };

  const today = new Date().toISOString().split("T")[0];

  // ── Gestión de cobro en saldo del cliente ──────────────────────────────
  // Si había o hay un cliente vinculado, re-sincronizar el cobro
  if (actual?.recibido_de_cliente_id !== null || input.recibido_de_cliente_id) {
    await supabase.from("cobros").delete().eq("cheque_id", input.id);
    if (input.recibido_de_cliente_id) {
      await supabase.from("cobros").insert({
        fecha: today,
        cliente_id: input.recibido_de_cliente_id,
        movimiento: "cheque",
        monto,
        cheque_id: input.id,
        notas: `Cheque N° ${numero} – ${banco}`,
      });
    }
    revalidatePath("/saldos");
  }

  // ── Gestión de pago a proveedor ────────────────────────────────────────
  // Solo administramos el pago si fue creado por el formulario de cheque
  // (detectado porque entregado_a_proveedor_id estaba guardado en el cheque)
  if (actual?.entregado_a_proveedor_id) {
    await supabase
      .from("pagos")
      .delete()
      .eq("cheque_id", input.id)
      .eq("proveedor_id", actual.entregado_a_proveedor_id);
  }
  if (input.entregado_a_proveedor_id) {
    const { count } = await supabase
      .from("pagos")
      .select("id", { count: "exact", head: true })
      .eq("cheque_id", input.id);
    if (!count || count === 0) {
      await supabase.from("pagos").insert({
        fecha: today,
        proveedor_id: input.entregado_a_proveedor_id,
        descripcion: entregadoA ?? "Pago con cheque",
        movimiento: "cheque",
        total: monto,
        cheque_id: input.id,
        notas: input.notas?.trim() || null,
      });
    }
    revalidatePath("/proveedores");
  } else if (actual?.entregado_a_proveedor_id) {
    revalidatePath("/proveedores");
  }

  // ── Gestión de pago a persona de campo ────────────────────────────────
  if (actual?.entregado_a_persona_campo_id) {
    await supabase
      .from("pagos_campo")
      .delete()
      .eq("cheque_id", input.id)
      .eq("persona_campo_id", actual.entregado_a_persona_campo_id);
  }
  if (input.entregado_a_persona_campo_id) {
    const { count } = await supabase
      .from("pagos_campo")
      .select("id", { count: "exact", head: true })
      .eq("cheque_id", input.id);
    if (!count || count === 0) {
      await supabase.from("pagos_campo").insert({
        fecha: today,
        persona_campo_id: input.entregado_a_persona_campo_id,
        movimiento: "cheque",
        monto,
        cheque_id: input.id,
        notas: input.notas?.trim() || null,
      });
    }
    revalidatePath("/campo");
  } else if (actual?.entregado_a_persona_campo_id) {
    revalidatePath("/campo");
  }

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
