"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// ─── Tipos ────────────────────────────────────────────────────────────────────

// tipo "egreso" es solo lectura (viene de ventas con origen=puesto, no se guarda en stock_puesto)
export type TipoMovimientoPuesto = "ingreso" | "perdida" | "egreso";

export type MovimientoPuesto = {
  id: string;
  fecha: string;
  producto_id: string;
  producto_nombre: string;
  tipo: TipoMovimientoPuesto;
  cantidad: number;
  notas: string | null;
  created_at: string;
};

export type MovimientoPuestoInput = {
  fecha: string;
  producto_id: string;
  tipo: "ingreso" | "perdida";
  cantidad: number;
  notas: string | null;
};

export type ResumenProductoPuesto = {
  producto_id: string;
  producto_nombre: string;
  ingresado: number;
  egresado: number;
  perdida: number;
  disponible: number;
};

function revalidateStock() {
  revalidatePath("/productos");
  revalidatePath("/ventas-diarias");
}

// ─── Listar todos los movimientos del puesto ──────────────────────────────────

export async function listarMovimientosPuesto(
  productoId?: string,
  fecha?: string,
): Promise<{ ok: true; movimientos: MovimientoPuesto[] } | { ok: false; error: string }> {
  const supabase = await createClient();

  let qStock = supabase
    .from("stock_puesto")
    .select("id, fecha, producto_id, tipo, cantidad, notas, created_at, productos ( nombre )");
  if (productoId) qStock = qStock.eq("producto_id", productoId);
  if (fecha) qStock = qStock.eq("fecha", fecha);
  const { data: stockData, error: errStock } = await qStock;

  if (errStock) {
    return {
      ok: false,
      error:
        errStock.code === "42P01"
          ? "Falta crear la tabla stock_puesto. Ejecutá el SQL en Supabase."
          : errStock.message,
    };
  }

  let qVentas = supabase
    .from("ventas")
    .select("id, fecha, producto_id, cantidad_cajas, notas, created_at, productos ( nombre )")
    .eq("origen", "puesto");
  if (productoId) qVentas = qVentas.eq("producto_id", productoId);
  if (fecha) qVentas = qVentas.eq("fecha", fecha);
  const { data: ventasData } = await qVentas;

  const fromStock: MovimientoPuesto[] = (stockData ?? []).map((row) => {
    const prod = Array.isArray(row.productos) ? row.productos[0] : row.productos;
    return {
      id: row.id,
      fecha: row.fecha,
      producto_id: row.producto_id,
      producto_nombre: (prod as { nombre?: string } | null)?.nombre ?? "—",
      tipo: ((row.tipo as string) || "ingreso") as TipoMovimientoPuesto,
      cantidad: Number(row.cantidad),
      notas: row.notas ?? null,
      created_at: row.created_at,
    };
  });

  const fromVentas: MovimientoPuesto[] = (ventasData ?? []).map((row) => {
    const prod = Array.isArray(row.productos) ? row.productos[0] : row.productos;
    return {
      id: row.id,
      fecha: row.fecha,
      producto_id: row.producto_id,
      producto_nombre: (prod as { nombre?: string } | null)?.nombre ?? "—",
      tipo: "egreso" as const,
      cantidad: Number(row.cantidad_cajas),
      notas: row.notas ?? null,
      created_at: row.created_at,
    };
  });

  const movimientos = [...fromStock, ...fromVentas].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );

  return { ok: true, movimientos };
}

// ─── Resumen de stock por producto ────────────────────────────────────────────

export async function listarResumenStockPuesto(
  fechaDiaria: string,
): Promise<
  { ok: true; resumen: ResumenProductoPuesto[] } | { ok: false; error: string }
> {
  const supabase = await createClient();

  const [
    { data: stockData, error: errStock },
    { data: ventasData },
    { data: stockDiario },
    { data: ventasDiarias },
    { data: productos },
  ] = await Promise.all([
    supabase.from("stock_puesto").select("producto_id, tipo, cantidad"),
    supabase.from("ventas").select("producto_id, cantidad_cajas").eq("origen", "puesto"),
    supabase.from("stock_puesto").select("producto_id, tipo, cantidad").eq("fecha", fechaDiaria),
    supabase.from("ventas").select("producto_id, cantidad_cajas").eq("origen", "puesto").eq("fecha", fechaDiaria),
    supabase.from("productos").select("id, nombre").eq("activo", true).order("nombre"),
  ]);

  if (errStock) {
    return {
      ok: false,
      error:
        errStock.code === "42P01"
          ? "Falta crear la tabla stock_puesto. Ejecutá el SQL en Supabase."
          : errStock.message,
    };
  }

  // All-time: sólo para calcular disponible acumulado
  const ingresadoTotal = new Map<string, number>();
  const perdidaTotal = new Map<string, number>();
  for (const row of stockData ?? []) {
    const tipo = (row.tipo as string) || "ingreso";
    if (tipo === "perdida") {
      perdidaTotal.set(row.producto_id, (perdidaTotal.get(row.producto_id) ?? 0) + Number(row.cantidad));
    } else {
      ingresadoTotal.set(row.producto_id, (ingresadoTotal.get(row.producto_id) ?? 0) + Number(row.cantidad));
    }
  }
  const egresadoTotal = new Map<string, number>();
  for (const v of ventasData ?? []) {
    egresadoTotal.set(v.producto_id, (egresadoTotal.get(v.producto_id) ?? 0) + Number(v.cantidad_cajas));
  }

  // Diario: ingresado / egresado / pérdidas del día seleccionado
  const ingresadoHoy = new Map<string, number>();
  const perdidaHoy = new Map<string, number>();
  for (const row of stockDiario ?? []) {
    const tipo = (row.tipo as string) || "ingreso";
    if (tipo === "perdida") {
      perdidaHoy.set(row.producto_id, (perdidaHoy.get(row.producto_id) ?? 0) + Number(row.cantidad));
    } else {
      ingresadoHoy.set(row.producto_id, (ingresadoHoy.get(row.producto_id) ?? 0) + Number(row.cantidad));
    }
  }
  const egresadoHoy = new Map<string, number>();
  for (const v of ventasDiarias ?? []) {
    egresadoHoy.set(v.producto_id, (egresadoHoy.get(v.producto_id) ?? 0) + Number(v.cantidad_cajas));
  }

  const productosConMovimiento = new Set([
    ...ingresadoTotal.keys(),
    ...perdidaTotal.keys(),
    ...egresadoTotal.keys(),
  ]);

  const resumen: ResumenProductoPuesto[] = (productos ?? [])
    .filter((p) => productosConMovimiento.has(p.id))
    .map((p) => {
      const ingrTotal = ingresadoTotal.get(p.id) ?? 0;
      const egrTotal = egresadoTotal.get(p.id) ?? 0;
      const perTotal = perdidaTotal.get(p.id) ?? 0;
      return {
        producto_id: p.id,
        producto_nombre: p.nombre,
        ingresado: ingresadoHoy.get(p.id) ?? 0,
        egresado: egresadoHoy.get(p.id) ?? 0,
        perdida: perdidaHoy.get(p.id) ?? 0,
        disponible: ingrTotal - egrTotal - perTotal,
      };
    });

  return { ok: true, resumen };
}

// ─── Stock disponible de un producto específico ───────────────────────────────

export async function stockDisponibleProducto(productoId: string): Promise<number> {
  const supabase = await createClient();

  const [{ data: stockData }, { data: ventas }] = await Promise.all([
    supabase.from("stock_puesto").select("tipo, cantidad").eq("producto_id", productoId),
    supabase
      .from("ventas")
      .select("cantidad_cajas")
      .eq("producto_id", productoId)
      .eq("origen", "puesto"),
  ]);

  let ingresado = 0;
  let perdida = 0;
  for (const row of stockData ?? []) {
    if (((row.tipo as string) || "ingreso") === "perdida") perdida += Number(row.cantidad);
    else ingresado += Number(row.cantidad);
  }
  const vendido = (ventas ?? []).reduce((acc, v) => acc + Number(v.cantidad_cajas), 0);
  return ingresado - perdida - vendido;
}

// ─── Registrar movimiento (ingreso o pérdida) ─────────────────────────────────

export async function agregarMovimientoPuesto(
  input: MovimientoPuestoInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!input.fecha || !/^\d{4}-\d{2}-\d{2}$/.test(input.fecha)) {
    return { ok: false, error: "Fecha inválida." };
  }
  if (!input.producto_id) return { ok: false, error: "Producto inválido." };
  if (!["ingreso", "perdida"].includes(input.tipo)) {
    return { ok: false, error: "Tipo de movimiento inválido." };
  }
  const cantidad = Math.floor(Number(input.cantidad));
  if (!Number.isFinite(cantidad) || cantidad < 1) {
    return { ok: false, error: "La cantidad debe ser al menos 1." };
  }

  // Validar que no se registre más pérdida que el stock disponible
  if (input.tipo === "perdida") {
    const disponible = await stockDisponibleProducto(input.producto_id);
    if (cantidad > disponible) {
      return {
        ok: false,
        error: `Stock disponible: ${disponible} cajas. No podés registrar una pérdida de ${cantidad} cajas.`,
      };
    }
  }

  const supabase = await createClient();
  const { error } = await supabase.from("stock_puesto").insert({
    fecha: input.fecha,
    producto_id: input.producto_id,
    tipo: input.tipo,
    cantidad,
    notas: input.notas?.trim() || null,
  });

  if (error) {
    return {
      ok: false,
      error:
        error.code === "42P01"
          ? "Falta crear la tabla stock_puesto en Supabase."
          : error.message,
    };
  }

  revalidateStock();
  return { ok: true };
}

// ─── Eliminar movimiento de stock ─────────────────────────────────────────────

export async function eliminarMovimientoPuesto(
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();

  // Obtener el movimiento para saber tipo, producto y cantidad
  const { data: row, error: errFetch } = await supabase
    .from("stock_puesto")
    .select("tipo, cantidad, producto_id")
    .eq("id", id)
    .single();

  if (errFetch || !row) return { ok: false, error: errFetch?.message ?? "Movimiento no encontrado." };

  // Solo los ingresos pueden afectar el stock disponible al borrarse
  if ((row.tipo as string) === "ingreso") {
    const stockActual = await stockDisponibleProducto(row.producto_id as string);
    if (stockActual - Number(row.cantidad) < 0) {
      return {
        ok: false,
        error: `No se puede eliminar este ingreso: hay ${stockActual} cajas disponibles en el puesto y este ingreso es de ${row.cantidad} cajas. Primero registrá las ventas o pérdidas correspondientes.`,
      };
    }
  }

  const { error } = await supabase.from("stock_puesto").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidateStock();
  return { ok: true };
}

// Alias para retrocompatibilidad con stock-puesto-modal.tsx
export const eliminarIngresoStockPuesto = eliminarMovimientoPuesto;
