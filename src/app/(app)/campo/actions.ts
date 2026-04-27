"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type PersonaCampoFila = {
  id: string;
  nombre: string;
  telefono: string | null;
  notas: string | null;
  activo: boolean;
  created_at: string;
};

export type PersonaCampoConSaldo = PersonaCampoFila & {
  total_cargas: number;   // suma de monto de cargas (el porcentaje ya calculado)
  total_pagos: number;    // suma de pagos_campo
  saldo: number;          // lo que se les debe: total_cargas - total_pagos
};

export type PersonaCampoInput = {
  id?: string;
  nombre: string;
  telefono: string | null;
  notas: string | null;
};

export type TipoMovimientoCampo = "efectivo" | "transferencia" | "cheque";

export type CargaFila = {
  id: string;
  fecha: string;
  persona_campo_id: string;
  producto_id: string;
  producto_nombre: string;
  cantidad: number;
  precio_caja: number | null;
  monto: number;
  notas: string | null;
  created_at: string;
};

export type CargaInput = {
  fecha: string;
  persona_campo_id: string;
  producto_id: string;
  cantidad: number;
  precio_caja: number | null;
  monto: number;
  notas: string | null;
};

export type PagoCampoFila = {
  id: string;
  fecha: string;
  persona_campo_id: string;
  movimiento: TipoMovimientoCampo;
  monto: number;
  notas: string | null;
  created_at: string;
};

export type PagoCampoInput = {
  fecha: string;
  persona_campo_id: string;
  personaNombre: string;
  movimiento: TipoMovimientoCampo;
  monto: number;
  notas: string | null;
  cheque_id?: string | null;
};

export type MovimientosPersonaCampo = {
  cargas: CargaFila[];
  pagos: PagoCampoFila[];
};

// ─── Helper ───────────────────────────────────────────────────────────────────

function revalidateCampo() {
  revalidatePath("/campo");
  revalidatePath("/dashboard");
}

// ─── Listar personas con saldo ────────────────────────────────────────────────

export async function listarPersonasCampoConSaldo(): Promise<
  | { ok: true; personas: PersonaCampoConSaldo[] }
  | { ok: false; error: string }
> {
  const supabase = await createClient();

  const [
    { data: personas, error: errPersonas },
    { data: cargas, error: errCargas },
    { data: pagos, error: errPagos },
  ] = await Promise.all([
    supabase.from("personas_campo").select("*").eq("activo", true).order("nombre"),
    supabase.from("cargas").select("persona_campo_id, monto"),
    supabase.from("pagos_campo").select("persona_campo_id, monto"),
  ]);

  if (errPersonas) {
    return {
      ok: false,
      error:
        errPersonas.code === "42P01"
          ? "Falta crear la tabla personas_campo. Ejecutá el SQL en Supabase."
          : errPersonas.message,
    };
  }
  if (errCargas) {
    return {
      ok: false,
      error:
        errCargas.code === "42P01"
          ? "Falta crear la tabla cargas. Ejecutá el SQL en Supabase."
          : errCargas.message,
    };
  }
  if (errPagos) {
    return {
      ok: false,
      error:
        errPagos?.code === "42P01"
          ? "Falta crear la tabla pagos_campo. Ejecutá el SQL en Supabase."
          : (errPagos?.message ?? "Error al cargar pagos"),
    };
  }

  const cargasPor = new Map<string, number>();
  for (const c of cargas ?? []) {
    cargasPor.set(c.persona_campo_id, (cargasPor.get(c.persona_campo_id) ?? 0) + Number(c.monto));
  }

  const pagosPor = new Map<string, number>();
  for (const p of pagos ?? []) {
    pagosPor.set(p.persona_campo_id, (pagosPor.get(p.persona_campo_id) ?? 0) + Number(p.monto));
  }

  const result: PersonaCampoConSaldo[] = (personas ?? []).map((p) => {
    const total_cargas = cargasPor.get(p.id) ?? 0;
    const total_pagos = pagosPor.get(p.id) ?? 0;
    return {
      id: p.id,
      nombre: p.nombre,
      telefono: p.telefono ?? null,
      notas: p.notas ?? null,
      activo: p.activo,
      created_at: p.created_at,
      total_cargas,
      total_pagos,
      saldo: total_cargas - total_pagos,
    };
  });

  return { ok: true, personas: result };
}

// ─── Movimientos de una persona ───────────────────────────────────────────────

export async function listarMovimientosPersonaCampo(personaId: string): Promise<
  | { ok: true; movimientos: MovimientosPersonaCampo }
  | { ok: false; error: string }
> {
  const supabase = await createClient();

  const [{ data: cargas, error: errC }, { data: pagos, error: errP }] =
    await Promise.all([
      supabase
        .from("cargas")
        .select("id, fecha, persona_campo_id, producto_id, cantidad, precio_caja, monto, notas, created_at, productos ( nombre )")
        .eq("persona_campo_id", personaId)
        .order("fecha", { ascending: false }),
      supabase
        .from("pagos_campo")
        .select("id, fecha, persona_campo_id, movimiento, monto, notas, created_at")
        .eq("persona_campo_id", personaId)
        .order("fecha", { ascending: false }),
    ]);

  if (errC) return { ok: false, error: errC.message };
  if (errP) return { ok: false, error: errP.message };

  return {
    ok: true,
    movimientos: {
      cargas: (cargas ?? []).map((c) => {
        const prod = Array.isArray(c.productos) ? c.productos[0] : c.productos;
        return {
          id: c.id,
          fecha: c.fecha,
          persona_campo_id: c.persona_campo_id,
          producto_id: c.producto_id,
          producto_nombre: (prod as { nombre?: string } | null)?.nombre ?? "—",
          cantidad: Number(c.cantidad),
          precio_caja: c.precio_caja != null ? Number(c.precio_caja) : null,
          monto: Number(c.monto),
          notas: c.notas ?? null,
          created_at: c.created_at,
        };
      }),
      pagos: (pagos ?? []).map((p) => ({
        id: p.id,
        fecha: p.fecha,
        persona_campo_id: p.persona_campo_id,
        movimiento: p.movimiento as TipoMovimientoCampo,
        monto: Number(p.monto),
        notas: p.notas ?? null,
        created_at: p.created_at,
      })),
    },
  };
}

// ─── CRUD personas_campo ──────────────────────────────────────────────────────

export async function crearPersonaCampo(
  input: PersonaCampoInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const nombre = input.nombre.trim();
  if (!nombre) return { ok: false, error: "El nombre es obligatorio." };
  if (nombre.length > 200) return { ok: false, error: "El nombre no puede superar 200 caracteres." };
  const telefono = input.telefono?.trim() || null;
  if (telefono && telefono.length > 50) return { ok: false, error: "El teléfono no puede superar 50 caracteres." };
  const notas = input.notas?.trim() || null;
  if (notas && notas.length > 1000) return { ok: false, error: "Las notas no pueden superar 1000 caracteres." };

  const supabase = await createClient();
  const { error } = await supabase.from("personas_campo").insert({
    nombre,
    telefono,
    notas,
  });

  if (error) return { ok: false, error: error.message };
  revalidateCampo();
  return { ok: true };
}

export async function actualizarPersonaCampo(
  input: PersonaCampoInput & { id: string },
): Promise<{ ok: true } | { ok: false; error: string }> {
  const nombre = input.nombre.trim();
  if (!nombre) return { ok: false, error: "El nombre es obligatorio." };
  if (nombre.length > 200) return { ok: false, error: "El nombre no puede superar 200 caracteres." };
  const telefono = input.telefono?.trim() || null;
  if (telefono && telefono.length > 50) return { ok: false, error: "El teléfono no puede superar 50 caracteres." };
  const notas = input.notas?.trim() || null;
  if (notas && notas.length > 1000) return { ok: false, error: "Las notas no pueden superar 1000 caracteres." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("personas_campo")
    .update({
      nombre,
      telefono,
      notas,
    })
    .eq("id", input.id);

  if (error) return { ok: false, error: error.message };
  revalidateCampo();
  return { ok: true };
}

export async function eliminarPersonaCampo(
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  // Soft-delete: marcar como inactivo para conservar el historial
  const { error } = await supabase
    .from("personas_campo")
    .update({ activo: false })
    .eq("id", id);

  if (error) return { ok: false, error: error.message };
  revalidateCampo();
  return { ok: true };
}

// ─── Cargas ───────────────────────────────────────────────────────────────────

export async function crearCarga(
  input: CargaInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!input.fecha || !/^\d{4}-\d{2}-\d{2}$/.test(input.fecha)) {
    return { ok: false, error: "Fecha inválida." };
  }
  if (!input.persona_campo_id) return { ok: false, error: "Persona de campo inválida." };
  if (!input.producto_id) return { ok: false, error: "Producto inválido." };
  const cantidad = Math.floor(Number(input.cantidad));
  if (!Number.isFinite(cantidad) || cantidad < 1) {
    return { ok: false, error: "La cantidad debe ser al menos 1." };
  }
  // precio_caja es opcional; si se provee debe ser positivo
  const precio_caja = input.precio_caja != null ? Number(input.precio_caja) : null;
  if (precio_caja !== null && (!Number.isFinite(precio_caja) || precio_caja <= 0)) {
    return { ok: false, error: "El precio por caja debe ser mayor a 0." };
  }
  const monto = Number(input.monto);
  // monto puede ser 0 si precio_caja es pendiente
  if (!Number.isFinite(monto) || monto < 0) {
    return { ok: false, error: "El monto no puede ser negativo." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("cargas").insert({
    fecha: input.fecha,
    persona_campo_id: input.persona_campo_id,
    producto_id: input.producto_id,
    cantidad,
    precio_caja: precio_caja ?? null,
    monto,
    notas: input.notas?.trim() || null,
  });

  if (error) {
    return {
      ok: false,
      error:
        error.code === "42P01"
          ? "Falta crear la tabla cargas en Supabase."
          : error.message,
    };
  }
  revalidateCampo();
  return { ok: true };
}

export async function actualizarPrecioCarga(
  id: string,
  precio_caja: number,
  cantidad: number,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!Number.isFinite(precio_caja) || precio_caja <= 0) {
    return { ok: false, error: "El precio por caja debe ser mayor a 0." };
  }
  const monto = precio_caja * cantidad;
  const supabase = await createClient();
  const { error } = await supabase
    .from("cargas")
    .update({ precio_caja, monto })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidateCampo();
  return { ok: true };
}

export async function eliminarCarga(
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const { error } = await supabase.from("cargas").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidateCampo();
  return { ok: true };
}

// ─── Pagos de campo (tabla propia, independiente de pagos de proveedores) ─────

export async function crearPagoCampo(
  input: PagoCampoInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!input.fecha || !/^\d{4}-\d{2}-\d{2}$/.test(input.fecha)) {
    return { ok: false, error: "Fecha inválida." };
  }
  if (!input.persona_campo_id) return { ok: false, error: "Persona de campo inválida." };
  const monto = Number(input.monto);
  if (!Number.isFinite(monto) || monto <= 0) {
    return { ok: false, error: "El monto debe ser mayor a 0." };
  }
  if (input.movimiento === "cheque" && !input.cheque_id) {
    return { ok: false, error: "Seleccioná un cheque disponible." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("pagos_campo").insert({
    fecha: input.fecha,
    persona_campo_id: input.persona_campo_id,
    movimiento: input.movimiento,
    monto,
    cheque_id: input.cheque_id ?? null,
    notas: input.notas?.trim() || null,
  });

  if (error) {
    return {
      ok: false,
      error:
        error.code === "42P01"
          ? "Falta crear la tabla pagos_campo en Supabase."
          : error.message,
    };
  }

  if (input.movimiento === "cheque" && input.cheque_id) {
    await supabase
      .from("cheques")
      .update({ entregado_a: input.personaNombre, estado: "entregado" })
      .eq("id", input.cheque_id);
    revalidatePath("/cheques");
  }

  revalidateCampo();
  revalidatePath("/pagos-diarios");
  return { ok: true };
}

export async function eliminarPagoCampo(
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const { error } = await supabase.from("pagos_campo").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidateCampo();
  return { ok: true };
}

// ─── Listar personas de campo activas (para selectores) ──────────────────────

export async function listarPersonasCampoActivas(): Promise<
  { ok: true; personas: { id: string; nombre: string }[] } | { ok: false; error: string }
> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("personas_campo")
    .select("id, nombre")
    .eq("activo", true)
    .order("nombre");
  if (error) return { ok: false, error: error.message };
  return { ok: true, personas: (data ?? []).map((p) => ({ id: p.id, nombre: p.nombre })) };
}


