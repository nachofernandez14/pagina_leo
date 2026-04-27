"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type ProveedorFila = {
  id: string;
  nombre: string;
  telefono: string | null;
  notas: string | null;
  activo: boolean;
  created_at: string;
};

export type ProveedorConSaldo = ProveedorFila & {
  total_compras: number;
  total_pagos: number;
  /** Positivo = le debemos. Negativo = pagamos de más. */
  saldo: number;
};

export type ProveedorInput = {
  nombre: string;
  telefono: string | null;
  notas: string | null;
};

export type TipoMovimientoProveedor = "efectivo" | "transferencia" | "cheque";

export type CompraFila = {
  id: string;
  fecha: string;
  proveedor_id: string;
  descripcion: string;
  monto: number;
  notas: string | null;
  created_at: string;
};

export type CompraInput = {
  fecha: string;
  proveedor_id: string;
  descripcion: string;
  monto: number;
  notas: string | null;
};

export type PagoProveedorFila = {
  id: string;
  fecha: string;
  proveedor_id: string;
  movimiento: TipoMovimientoProveedor;
  /** Viene del campo `total` en la tabla `pagos` */
  monto: number;
  notas: string | null;
  created_at: string;
};

export type PagoProveedorInput = {
  fecha: string;
  proveedor_id: string;
  /** Nombre del proveedor, se guarda como `descripcion` en `pagos` */
  proveedorNombre: string;
  movimiento: TipoMovimientoProveedor;
  monto: number;
  notas: string | null;
  /** Solo cuando movimiento === 'cheque' */
  cheque_id?: string | null;
};

export type MovimientosProveedor = {
  compras: CompraFila[];
  pagos: PagoProveedorFila[];
};

// ─── Helper ───────────────────────────────────────────────────────────────────

function revalidateProveedores() {
  revalidatePath("/proveedores");
  revalidatePath("/dashboard");
}

// ─── Listar proveedores con saldo calculado ───────────────────────────────────

export async function listarProveedoresConSaldo(): Promise<
  | { ok: true; proveedores: ProveedorConSaldo[] }
  | { ok: false; error: string }
> {
  const supabase = await createClient();

  const [
    { data: proveedores, error: errProv },
    { data: compras, error: errCompras },
    { data: pagos, error: errPagos },
  ] = await Promise.all([
    supabase
      .from("proveedores")
      .select("*")
      .eq("activo", true)
      .order("nombre"),
    supabase.from("compras").select("proveedor_id, monto"),
    supabase
      .from("pagos")
      .select("proveedor_id, total")
      .not("proveedor_id", "is", null),
  ]);

  if (errProv) {
    return {
      ok: false,
      error:
        errProv.message.includes("relation") || errProv.code === "42P01"
          ? "Falta crear la tabla proveedores (sección 8c del schema)."
          : errProv.message,
    };
  }
  if (errCompras) {
    return {
      ok: false,
      error:
        errCompras.message.includes("relation") || errCompras.code === "42P01"
          ? "Falta crear la tabla compras (sección 8d del schema)."
          : errCompras.message,
    };
  }
  if (errPagos) {
    return { ok: false, error: errPagos.message };
  }

  const comprasPorProveedor = new Map<string, number>();
  for (const c of compras ?? []) {
    comprasPorProveedor.set(
      c.proveedor_id,
      (comprasPorProveedor.get(c.proveedor_id) ?? 0) + Number(c.monto),
    );
  }

  const pagosPorProveedor = new Map<string, number>();
  for (const p of pagos ?? []) {
    const pid = p.proveedor_id as string;
    pagosPorProveedor.set(
      pid,
      (pagosPorProveedor.get(pid) ?? 0) + Number(p.total),
    );
  }

  const result: ProveedorConSaldo[] = (proveedores ?? []).map((prov) => {
    const total_compras = comprasPorProveedor.get(prov.id) ?? 0;
    const total_pagos = pagosPorProveedor.get(prov.id) ?? 0;
    return {
      id: prov.id,
      nombre: prov.nombre,
      telefono: prov.telefono ?? null,
      notas: prov.notas ?? null,
      activo: prov.activo,
      created_at: prov.created_at,
      total_compras,
      total_pagos,
      saldo: total_compras - total_pagos,
    };
  });

  return { ok: true, proveedores: result };
}

// ─── Movimientos de un proveedor (compras + pagos) ───────────────────────────

export async function listarMovimientosProveedor(proveedorId: string): Promise<
  | { ok: true; movimientos: MovimientosProveedor }
  | { ok: false; error: string }
> {
  const supabase = await createClient();

  const [{ data: compras, error: errC }, { data: pagos, error: errP }] =
    await Promise.all([
      supabase
        .from("compras")
        .select("*")
        .eq("proveedor_id", proveedorId)
        .order("fecha", { ascending: false }),
      supabase
        .from("pagos")
        .select("id, fecha, proveedor_id, movimiento, total, notas, created_at")
        .eq("proveedor_id", proveedorId)
        .order("fecha", { ascending: false }),
    ]);

  if (errC) return { ok: false, error: errC.message };
  if (errP) return { ok: false, error: errP.message };

  return {
    ok: true,
    movimientos: {
      compras: (compras ?? []).map((c) => ({
        id: c.id,
        fecha: c.fecha,
        proveedor_id: c.proveedor_id,
        descripcion: c.descripcion,
        monto: Number(c.monto),
        notas: c.notas ?? null,
        created_at: c.created_at,
      })),
      pagos: (pagos ?? []).map((p) => ({
        id: p.id,
        fecha: p.fecha,
        proveedor_id: p.proveedor_id as string,
        movimiento: p.movimiento as TipoMovimientoProveedor,
        monto: Number(p.total),
        notas: p.notas ?? null,
        created_at: p.created_at,
      })),
    },
  };
}

// ─── CRUD proveedores ─────────────────────────────────────────────────────────

export async function crearProveedor(
  input: ProveedorInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const nombre = input.nombre.trim();
  if (!nombre) return { ok: false, error: "El nombre es obligatorio." };

  const supabase = await createClient();
  const { error } = await supabase.from("proveedores").insert({
    nombre,
    telefono: input.telefono?.trim() || null,
    notas: input.notas?.trim() || null,
  });

  if (error) return { ok: false, error: error.message };
  revalidateProveedores();
  return { ok: true };
}

export async function actualizarProveedor(
  input: ProveedorInput & { id: string },
): Promise<{ ok: true } | { ok: false; error: string }> {
  const nombre = input.nombre.trim();
  if (!nombre) return { ok: false, error: "El nombre es obligatorio." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("proveedores")
    .update({
      nombre,
      telefono: input.telefono?.trim() || null,
      notas: input.notas?.trim() || null,
    })
    .eq("id", input.id);

  if (error) return { ok: false, error: error.message };
  revalidateProveedores();
  return { ok: true };
}

export async function eliminarProveedor(
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("proveedores")
    .update({ activo: false })
    .eq("id", id);

  if (error) return { ok: false, error: error.message };
  revalidateProveedores();
  return { ok: true };
}

// ─── Compras ──────────────────────────────────────────────────────────────────

export async function crearCompra(
  input: CompraInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!input.fecha || !/^\d{4}-\d{2}-\d{2}$/.test(input.fecha)) {
    return { ok: false, error: "Fecha inválida." };
  }
  if (!input.proveedor_id) return { ok: false, error: "Proveedor inválido." };
  const descripcion = input.descripcion.trim();
  if (!descripcion) return { ok: false, error: "La descripción es obligatoria." };
  const monto = Number(input.monto);
  if (!Number.isFinite(monto) || monto <= 0) {
    return { ok: false, error: "El monto debe ser mayor a 0." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("compras").insert({
    fecha: input.fecha,
    proveedor_id: input.proveedor_id,
    descripcion,
    monto,
    notas: input.notas?.trim() || null,
  });

  if (error) {
    return {
      ok: false,
      error:
        error.message.includes("relation") || error.code === "42P01"
          ? "Falta crear la tabla compras (sección 8d del schema)."
          : error.message,
    };
  }
  revalidateProveedores();
  return { ok: true };
}

export async function eliminarCompra(
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const { error } = await supabase.from("compras").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidateProveedores();
  return { ok: true };
}

// ─── Pagos a proveedores ──────────────────────────────────────────────────────

export async function crearPagoProveedor(
  input: PagoProveedorInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!input.fecha || !/^\d{4}-\d{2}-\d{2}$/.test(input.fecha)) {
    return { ok: false, error: "Fecha inválida." };
  }
  if (!input.proveedor_id) return { ok: false, error: "Proveedor inválido." };
  const monto = Number(input.monto);
  if (!Number.isFinite(monto) || monto <= 0) {
    return { ok: false, error: "El monto debe ser mayor a 0." };
  }

  const supabase = await createClient();

  // Si es cheque, verificar que el cheque_id esté disponible
  if (input.movimiento === "cheque" && !input.cheque_id) {
    return { ok: false, error: "Seleccioná un cheque disponible para este pago." };
  }

  const { error } = await supabase.from("pagos").insert({
    fecha: input.fecha,
    proveedor_id: input.proveedor_id,
    descripcion: input.proveedorNombre,
    movimiento: input.movimiento,
    total: monto,
    cheque_id: input.cheque_id ?? null,
    notas: input.notas?.trim() || null,
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  // Marcar el cheque como entregado al proveedor
  if (input.movimiento === "cheque" && input.cheque_id) {
    const { error: errCheque } = await supabase
      .from("cheques")
      .update({ entregado_a: input.proveedorNombre, estado: "entregado" })
      .eq("id", input.cheque_id);
    if (errCheque) {
      return { ok: false, error: `Pago registrado pero no se pudo actualizar el cheque: ${errCheque.message}` };
    }
    revalidatePath("/cheques");
  }

  revalidateProveedores();
  return { ok: true };
}

export async function eliminarPagoProveedor(
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("pagos")
    .delete()
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidateProveedores();
  return { ok: true };
}

// ─── Listar proveedores activos (para selectores) ─────────────────────────────

export async function listarProveedoresActivos(): Promise<
  { ok: true; proveedores: { id: string; nombre: string }[] } | { ok: false; error: string }
> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("proveedores")
    .select("id, nombre")
    .eq("activo", true)
    .order("nombre");
  if (error) return { ok: false, error: error.message };
  return { ok: true, proveedores: (data ?? []).map((p) => ({ id: p.id, nombre: p.nombre })) };
}
