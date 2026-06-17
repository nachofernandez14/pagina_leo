"use server";

import { createClient } from "@/lib/supabase/server";

/**
 * Suma de todos los saldos positivos de clientes (lo que nos deben en total).
 */
export async function listarSaldoACobrar(): Promise<
  { ok: true; total: number } | { ok: false; error: string }
> {
  const supabase = await createClient();

  const [
    { data: ventas, error: errV },
    { data: cobros, error: errC },
  ] = await Promise.all([
    supabase
      .from("ventas")
      .select("cliente_id, total")
      .not("cliente_id", "is", null),
    supabase
      .from("cobros")
      .select("cliente_id, monto")
      .not("cliente_id", "is", null),
  ]);

  if (errV) return { ok: false, error: errV.message };
  if (errC) return { ok: false, error: errC.message };

  const ventasPorCliente = new Map<string, number>();
  for (const v of ventas ?? []) {
    const key = v.cliente_id;
    ventasPorCliente.set(key, (ventasPorCliente.get(key) ?? 0) + Number(v.total));
  }
  const cobrosPorCliente = new Map<string, number>();
  for (const c of cobros ?? []) {
    const key = c.cliente_id;
    cobrosPorCliente.set(key, (cobrosPorCliente.get(key) ?? 0) + Number(c.monto));
  }

  let total = 0;
  for (const [clienteId, totalVentas] of ventasPorCliente) {
    const totalCobros = cobrosPorCliente.get(clienteId) ?? 0;
    const saldo = totalVentas - totalCobros;
    if (saldo > 0) total += saldo;
  }

  return { ok: true, total };
}

/**
 * Suma de todos los saldos positivos de proveedores (lo que les debemos en total).
 */
export async function listarSaldoAPagar(): Promise<
  { ok: true; total: number } | { ok: false; error: string }
> {
  const supabase = await createClient();

  const [
    { data: compras, error: errC },
    { data: pagos, error: errP },
  ] = await Promise.all([
    supabase
      .from("compras")
      .select("proveedor_id, monto")
      .not("proveedor_id", "is", null),
    supabase
      .from("pagos")
      .select("proveedor_id, total")
      .not("proveedor_id", "is", null),
  ]);

  if (errC) return { ok: false, error: errC.message };
  if (errP) return { ok: false, error: errP.message };

  const comprasPorProveedor = new Map<string, number>();
  for (const c of compras ?? []) {
    const key = c.proveedor_id;
    comprasPorProveedor.set(key, (comprasPorProveedor.get(key) ?? 0) + Number(c.monto));
  }
  const pagosPorProveedor = new Map<string, number>();
  for (const p of pagos ?? []) {
    const key = p.proveedor_id;
    pagosPorProveedor.set(key, (pagosPorProveedor.get(key) ?? 0) + Number(p.total));
  }

  let total = 0;
  for (const [provId, totalCompras] of comprasPorProveedor) {
    const totalPagos = pagosPorProveedor.get(provId) ?? 0;
    const saldo = totalCompras - totalPagos;
    if (saldo > 0) total += saldo;
  }

  return { ok: true, total };
}

/**
 * Total de ventas desde el 1.° del mes actual.
 */
export async function listarVentasDelMes(): Promise<
  | { ok: true; total: number; mesNombre: string }
  | { ok: false; error: string }
> {
  const ahora = new Date();
  const anio = ahora.getFullYear();
  const mes = ahora.getMonth(); // 0-indexed
  const primerDia = `${anio}-${String(mes + 1).padStart(2, "0")}-01`;
  const mesNombre = new Intl.DateTimeFormat("es-AR", {
    month: "long",
    year: "numeric",
  }).format(ahora);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ventas")
    .select("total")
    .gte("fecha", primerDia);

  if (error) return { ok: false, error: error.message };

  const total = (data ?? []).reduce((s, v) => s + Number(v.total), 0);
  return { ok: true, total, mesNombre };
}
