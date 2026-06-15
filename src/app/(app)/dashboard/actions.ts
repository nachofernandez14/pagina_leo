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
      .select("cliente_id, ventas_sum:total.sum()")
      .not("cliente_id", "is", null),
    supabase
      .from("cobros")
      .select("cliente_id, cobros_sum:monto.sum()")
      .not("cliente_id", "is", null),
  ]);

  if (errV) return { ok: false, error: errV.message };
  if (errC) return { ok: false, error: errC.message };

  const ventasPorCliente = new Map<string, number>(
    (ventas ?? []).map((v) => [v.cliente_id, Number(v.ventas_sum)]),
  );
  const cobrosPorCliente = new Map<string, number>(
    (cobros ?? []).map((c) => [c.cliente_id, Number(c.cobros_sum)]),
  );

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
      .select("proveedor_id, compras_sum:monto.sum()")
      .not("proveedor_id", "is", null),
    supabase
      .from("pagos")
      .select("proveedor_id, pagos_sum:total.sum()")
      .not("proveedor_id", "is", null),
  ]);

  if (errC) return { ok: false, error: errC.message };
  if (errP) return { ok: false, error: errP.message };

  const comprasPorProveedor = new Map<string, number>(
    (compras ?? []).map((c) => [c.proveedor_id, Number(c.compras_sum)]),
  );
  const pagosPorProveedor = new Map<string, number>(
    (pagos ?? []).map((p) => [p.proveedor_id, Number(p.pagos_sum)]),
  );

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
