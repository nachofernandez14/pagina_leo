"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type ClienteFila = {
  id: string;
  nombre: string;
  telefono: string | null;
  notas: string | null;
  activo: boolean;
  created_at: string;
};

export type ClienteConSaldo = ClienteFila & {
  total_ventas: number;
  total_cobros: number;
  /** Positivo = el cliente nos debe. Negativo = le devolvemos (saldo a favor del cliente). */
  saldo: number;
};

export type ClienteInput = {
  nombre: string;
  telefono: string | null;
  notas: string | null;
};

export type TipoMovimientoCliente = "efectivo" | "transferencia" | "cheque";

export type CobroFila = {
  id: string;
  fecha: string;
  cliente_id: string;
  movimiento: TipoMovimientoCliente;
  monto: number;
  notas: string | null;
  created_at: string;
};

export type CobroInput = {
  fecha: string;
  cliente_id: string;
  movimiento: TipoMovimientoCliente;
  monto: number;
  notas: string | null;
};

export type VentaDeCliente = {
  id: string;
  fecha: string;
  producto_nombre: string;
  cantidad_cajas: number;
  precio_unitario: number;
  total: number;
  created_at: string;
};

export type MovimientosCliente = {
  ventas: VentaDeCliente[];
  cobros: CobroFila[];
};

// ─── Helper ───────────────────────────────────────────────────────────────────

function revalidateClientes() {
  revalidatePath("/saldos");
  revalidatePath("/dashboard");
}

// ─── Listar clientes con saldo calculado ─────────────────────────────────────

export async function listarClientesConSaldo(): Promise<
  { ok: true; clientes: ClienteConSaldo[] } | { ok: false; error: string }
> {
  const supabase = await createClient();

  const [
    { data: clientes, error: errCli },
    { data: ventas, error: errVentas },
    { data: cobros, error: errCobros },
  ] = await Promise.all([
    supabase
      .from("clientes")
      .select("id, nombre, telefono, notas, activo, created_at")
      .eq("activo", true)
      .order("nombre"),
    supabase
      .from("ventas")
      .select("cliente_id, ventas_sum:total.sum()")
      .not("cliente_id", "is", null),
    supabase
      .from("cobros")
      .select("cliente_id, cobros_sum:monto.sum()")
      .not("cliente_id", "is", null),
  ]);

  if (errCli) return { ok: false, error: errCli.message };
  if (errVentas) {
    return {
      ok: false,
      error:
        errVentas.message.includes("relation") || errVentas.code === "42P01"
          ? "Falta ejecutar el SQL de la sección 8 en Supabase."
          : errVentas.message,
    };
  }
  if (errCobros) {
    return {
      ok: false,
      error:
        errCobros.message.includes("relation") || errCobros.code === "42P01"
          ? "Falta crear la tabla cobros (sección 8b del schema)."
          : errCobros.message,
    };
  }

  const ventasPorCliente = new Map<string, number>(
    (ventas ?? []).map((v) => [v.cliente_id, Number(v.ventas_sum)]),
  );
  const cobrosPorCliente = new Map<string, number>(
    (cobros ?? []).map((c) => [c.cliente_id, Number(c.cobros_sum)]),
  );

  const result: ClienteConSaldo[] = (clientes ?? []).map((cli) => {
    const total_ventas = ventasPorCliente.get(cli.id) ?? 0;
    const total_cobros = cobrosPorCliente.get(cli.id) ?? 0;
    return {
      id: cli.id,
      nombre: cli.nombre,
      telefono: (cli as { telefono?: string | null }).telefono ?? null,
      notas: (cli as { notas?: string | null }).notas ?? null,
      activo: (cli as { activo?: boolean }).activo ?? true,
      created_at: cli.created_at,
      total_ventas,
      total_cobros,
      saldo: total_ventas - total_cobros,
    };
  });

  return { ok: true, clientes: result };
}

// ─── Movimientos de un cliente (ventas + cobros) ──────────────────────────────

export async function listarMovimientosCliente(clienteId: string): Promise<
  | { ok: true; movimientos: MovimientosCliente }
  | { ok: false; error: string }
> {
  const supabase = await createClient();

  const [{ data: ventas, error: errV }, { data: cobros, error: errC }] =
    await Promise.all([
      supabase
        .from("ventas")
        .select(
          "id, fecha, cantidad_cajas, precio_unitario, total, created_at, productos ( nombre )",
        )
        .eq("cliente_id", clienteId)
        .order("fecha", { ascending: false }),
      supabase
        .from("cobros")
        .select("*")
        .eq("cliente_id", clienteId)
        .order("fecha", { ascending: false }),
    ]);

  if (errV) return { ok: false, error: errV.message };
  if (errC) return { ok: false, error: errC.message };

  return {
    ok: true,
    movimientos: {
      ventas: (ventas ?? []).map((v) => ({
        id: v.id,
        fecha: v.fecha,
        producto_nombre:
          (v.productos as unknown as { nombre: string } | null)?.nombre ?? "—",
        cantidad_cajas: v.cantidad_cajas,
        precio_unitario: Number(v.precio_unitario),
        total: Number(v.total),
        created_at: v.created_at,
      })),
      cobros: (cobros ?? []).map((c) => ({
        id: c.id,
        fecha: c.fecha,
        cliente_id: c.cliente_id,
        movimiento: c.movimiento as TipoMovimientoCliente,
        monto: Number(c.monto),
        notas: c.notas ?? null,
        created_at: c.created_at,
      })),
    },
  };
}

// ─── CRUD clientes ────────────────────────────────────────────────────────────

export async function crearCliente(
  input: ClienteInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const nombre = input.nombre.trim();
  if (!nombre) return { ok: false, error: "El nombre es obligatorio." };
  if (nombre.length > 200) return { ok: false, error: "El nombre no puede superar 200 caracteres." };
  const telefono = input.telefono?.trim() || null;
  if (telefono && telefono.length > 50) return { ok: false, error: "El teléfono no puede superar 50 caracteres." };
  const notas = input.notas?.trim() || null;
  if (notas && notas.length > 1000) return { ok: false, error: "Las notas no pueden superar 1000 caracteres." };

  const supabase = await createClient();
  const { error } = await supabase.from("clientes").insert({
    nombre,
    telefono,
    notas,
  });

  if (error) return { ok: false, error: error.message };
  revalidateClientes();
  return { ok: true };
}

export async function actualizarCliente(
  input: ClienteInput & { id: string },
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
    .from("clientes")
    .update({
      nombre,
      telefono,
      notas,
    })
    .eq("id", input.id);

  if (error) return { ok: false, error: error.message };
  revalidateClientes();
  return { ok: true };
}

export async function eliminarCliente(
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  // Borrado lógico: preserva las ventas históricas
  const { error } = await supabase
    .from("clientes")
    .update({ activo: false })
    .eq("id", id);

  if (error) return { ok: false, error: error.message };
  revalidateClientes();
  return { ok: true };
}

// ─── Cobros ───────────────────────────────────────────────────────────────────

export async function crearCobro(
  input: CobroInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!input.fecha || !/^\d{4}-\d{2}-\d{2}$/.test(input.fecha)) {
    return { ok: false, error: "Fecha inválida." };
  }
  if (!input.cliente_id) return { ok: false, error: "Cliente inválido." };
  const monto = Number(input.monto);
  if (!Number.isFinite(monto) || monto <= 0) {
    return { ok: false, error: "El monto debe ser mayor a 0." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("cobros").insert({
    fecha: input.fecha,
    cliente_id: input.cliente_id,
    movimiento: input.movimiento,
    monto,
    notas: input.notas?.trim() || null,
  });

  if (error) {
    return {
      ok: false,
      error:
        error.message.includes("relation") || error.code === "42P01"
          ? "Falta crear la tabla cobros (sección 8b del schema)."
          : error.message,
    };
  }
  revalidateClientes();
  return { ok: true };
}

export async function eliminarCobro(
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const { error } = await supabase.from("cobros").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidateClientes();
  return { ok: true };
}

// ─── Listar clientes activos (para selectores) ────────────────────────────────

export async function listarClientesActivos(): Promise<
  { ok: true; clientes: { id: string; nombre: string }[] } | { ok: false; error: string }
> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clientes")
    .select("id, nombre")
    .eq("activo", true)
    .order("nombre");
  if (error) return { ok: false, error: error.message };
  return { ok: true, clientes: (data ?? []).map((c) => ({ id: c.id, nombre: c.nombre })) };
}

// ─── Listar cobros por fecha ──────────────────────────────────────────────────

export type CobroConCliente = CobroFila & { cliente_nombre: string };

export async function listarCobrosPorFecha(
  fecha: string,
): Promise<{ ok: true; cobros: CobroConCliente[] } | { ok: false; error: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("cobros")
    .select("id, fecha, cliente_id, movimiento, monto, notas, created_at, clientes ( nombre )")
    .eq("fecha", fecha)
    .order("created_at", { ascending: false });

  if (error) return { ok: false, error: error.message };

  const cobros: CobroConCliente[] = (data ?? []).map((row) => {
    const cliObj = Array.isArray(row.clientes) ? row.clientes[0] : row.clientes;
    return {
      id: row.id,
      fecha: row.fecha,
      cliente_id: row.cliente_id,
      movimiento: row.movimiento as TipoMovimientoCliente,
      monto: Number(row.monto),
      notas: row.notas ?? null,
      created_at: row.created_at,
      cliente_nombre: (cliObj as { nombre?: string } | null)?.nombre ?? "Sin cliente",
    };
  });

  return { ok: true, cobros };
}

// ─── Purgar clientes inactivos ────────────────────────────────────────────────

export type PurgarResult = {
  clientes: number;
  ventas: number;
  cobros: number;
};

export async function purgarClientesInactivos(): Promise<
  { ok: true; resultado: PurgarResult } | { ok: false; error: string }
> {
  const supabase = await createClient();

  // 1. Obtener IDs de clientes inactivos
  const { data: inactivos, error: errFetch } = await supabase
    .from("clientes")
    .select("id")
    .eq("activo", false);

  if (errFetch) return { ok: false, error: errFetch.message };
  if (!inactivos || inactivos.length === 0) {
    return { ok: true, resultado: { clientes: 0, ventas: 0, cobros: 0 } };
  }

  const ids = inactivos.map((c) => c.id);

  // 2. Contar ventas y cobros antes de borrar
  const [{ count: cntVentas }, { count: cntCobros }] = await Promise.all([
    supabase.from("ventas").select("id", { count: "exact", head: true }).in("cliente_id", ids),
    supabase.from("cobros").select("id", { count: "exact", head: true }).in("cliente_id", ids),
  ]);

  // 3. Borrar cobros
  const { error: errCobros } = await supabase
    .from("cobros")
    .delete()
    .in("cliente_id", ids);
  if (errCobros) return { ok: false, error: `Error borrando cobros: ${errCobros.message}` };

  // 4. Borrar ventas de esos clientes
  const { error: errVentas } = await supabase
    .from("ventas")
    .delete()
    .in("cliente_id", ids);
  if (errVentas) return { ok: false, error: `Error borrando ventas: ${errVentas.message}` };

  // 5. Borrar los clientes inactivos
  const { error: errClientes } = await supabase
    .from("clientes")
    .delete()
    .eq("activo", false);
  if (errClientes) return { ok: false, error: `Error borrando clientes: ${errClientes.message}` };

  revalidateClientes();
  revalidatePath("/ventas-diarias");
  revalidatePath("/pagos-diarios");

  return {
    ok: true,
    resultado: {
      clientes: ids.length,
      ventas: cntVentas ?? 0,
      cobros: cntCobros ?? 0,
    },
  };
}

