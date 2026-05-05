"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { calcularTotalVenta } from "@/lib/format";

export type ClienteOption = {
  id: string;
  nombre: string;
};

export type ProductoOption = {
  id: string;
  nombre: string;
  precio_unitario: number;
  embalaje_nombre: string | null;
};

export type VentaFila = {
  id: string;
  fecha: string;
  cantidad_cajas: number;
  precio_unitario: number;
  total: number;
  created_at: string;
  cliente_id: string | null;
  cliente_nombre: string | null;
  producto_id: string;
  producto_nombre: string;
  embalaje_nombre: string | null;
  origen: "puesto" | "galpon";
};

type RelNombre = { nombre: string } | null;

function relNombre(v: unknown): RelNombre {
  if (v == null) return null;
  const x = Array.isArray(v) ? v[0] : v;
  if (x && typeof x === "object" && "nombre" in x) {
    const n = (x as { nombre: unknown }).nombre;
    if (typeof n === "string") return { nombre: n };
  }
  return null;
}

type VentaRowRaw = {
  id: string;
  fecha: string;
  cantidad_cajas: number;
  precio_unitario: number;
  total: number;
  created_at: string;
  cliente_id: string | null;
  producto_id: string;
  clientes: unknown;
  productos: unknown;
  origen: string;
};

function mapVentaRow(row: VentaRowRaw): VentaFila {
  const c = relNombre(row.clientes);
  const p = relNombre(row.productos);

  // embalaje viene anidado dentro de productos como { nombre, embalajes: { nombre } }
  let embalaje_nombre: string | null = null;
  if (row.productos != null) {
    const prodObj = Array.isArray(row.productos) ? row.productos[0] : row.productos;
    if (prodObj && typeof prodObj === "object" && "embalajes" in prodObj) {
      const emb = (prodObj as { embalajes?: unknown }).embalajes;
      const embObj = Array.isArray(emb) ? emb[0] : emb;
      if (embObj && typeof embObj === "object" && "nombre" in embObj) {
        const n = (embObj as { nombre: unknown }).nombre;
        if (typeof n === "string") embalaje_nombre = n;
      }
    }
  }

  return {
    id: row.id,
    fecha: row.fecha,
    cantidad_cajas: row.cantidad_cajas,
    precio_unitario: Number(row.precio_unitario),
    total: Number(row.total),
    created_at: row.created_at,
    cliente_id: row.cliente_id,
    cliente_nombre: c?.nombre ?? null,
    producto_id: row.producto_id,
    producto_nombre: p?.nombre ?? "—",
    embalaje_nombre,
    origen: (row.origen === "puesto" ? "puesto" : "galpon") as "puesto" | "galpon",
  };
}

export async function listarVentasPorFecha(
  fecha: string,
): Promise<{ ok: true; ventas: VentaFila[] } | { ok: false; error: string }> {
  if (!fecha || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    return { ok: false, error: "Fecha inválida." };
  }
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("ventas")
    .select(
      `
      id,
      fecha,
      cantidad_cajas,
      precio_unitario,
      total,
      created_at,
      origen,
      cliente_id,
      producto_id,
      clientes ( nombre ),
      productos ( nombre, embalajes ( nombre ) )
    `,
    )
    .eq("fecha", fecha)
    .order("created_at", { ascending: false });

  if (error) {
    return {
      ok: false,
      error:
        error.message.includes("relation") || error.code === "42P01"
          ? "Falta crear las tablas en Supabase. Revisá docs/schema-ventas-clientes-productos.md"
          : error.message,
    };
  }

  const rows = (data ?? []) as VentaRowRaw[];
  return { ok: true, ventas: rows.map(mapVentaRow) };
}

export async function listarClientes(): Promise<
  { ok: true; clientes: ClienteOption[] } | { ok: false; error: string }
> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clientes")
    .select("id, nombre")
    .eq("activo", true)
    .order("nombre", { ascending: true });

  if (error) {
    return {
      ok: false,
      error:
        error.message.includes("relation") || error.code === "42P01"
          ? "Falta crear la tabla clientes (ver docs/schema-ventas-clientes-productos.md)."
          : error.message,
    };
  }

  return { ok: true, clientes: (data ?? []) as ClienteOption[] };
}

export async function listarProductosActivos(): Promise<
  { ok: true; productos: ProductoOption[] } | { ok: false; error: string }
> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("productos")
    .select("id, nombre, precio_unitario, embalajes ( nombre )")
    .eq("activo", true)
    .order("nombre", { ascending: true });

  if (error) {
    return {
      ok: false,
      error:
        error.message.includes("relation") || error.code === "42P01"
          ? "Falta crear la tabla productos (ver docs/schema-ventas-clientes-productos.md)."
          : error.message,
    };
  }

  const productos = (data ?? []).map((p) => {
    const emb = Array.isArray(p.embalajes) ? p.embalajes[0] : p.embalajes;
    return {
      id: p.id,
      nombre: p.nombre,
      precio_unitario: Number(p.precio_unitario),
      embalaje_nombre: (emb as { nombre?: string } | null)?.nombre ?? null,
    };
  }) as ProductoOption[];

  return { ok: true, productos };
}

export type NuevaVentaInput = {
  fecha: string;
  clienteId: string | null;
  productoId: string;
  cantidadCajas: number;
  precioUnitario: number;
  origen: "galpon" | "puesto";
};

export async function crearVenta(
  input: NuevaVentaInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const cantidad = Math.floor(Number(input.cantidadCajas));
  const precio = Number(input.precioUnitario);

  if (!input.fecha || !/^\d{4}-\d{2}-\d{2}$/.test(input.fecha)) {
    return { ok: false, error: "Fecha inválida." };
  }
  if (!input.productoId) {
    return { ok: false, error: "Elegí un producto." };
  }
  if (!Number.isFinite(cantidad) || cantidad < 1) {
    return { ok: false, error: "La cantidad de cajas debe ser al menos 1." };
  }
  if (!Number.isFinite(precio) || precio < 0) {
    return { ok: false, error: "El precio unitario no es válido." };
  }

  const total = calcularTotalVenta(cantidad, precio);

  const supabase = await createClient();

  const { error } = await supabase.from("ventas").insert({
    fecha: input.fecha,
    cliente_id: input.clienteId,
    producto_id: input.productoId,
    cantidad_cajas: cantidad,
    precio_unitario: precio,
    total,
    origen: input.origen,
  });

  if (error) {
    return {
      ok: false,
      error:
        error.message.includes("relation") || error.code === "42P01"
          ? "Falta crear las tablas en Supabase (docs/schema-ventas-clientes-productos.md)."
          : error.message,
    };
  }

  revalidatePath("/ventas-diarias");
  return { ok: true };
}

export type EditarVentaInput = {
  id: string;
  fecha: string;
  clienteId: string | null;
  productoId: string;
  cantidadCajas: number;
  precioUnitario: number;
  origen: "galpon" | "puesto";
};

export async function editarVenta(
  input: EditarVentaInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const cantidad = Math.floor(Number(input.cantidadCajas));
  const precio = Number(input.precioUnitario);

  if (!input.id) return { ok: false, error: "ID de venta inválido." };
  if (!input.fecha || !/^\d{4}-\d{2}-\d{2}$/.test(input.fecha)) {
    return { ok: false, error: "Fecha inválida." };
  }
  if (!input.productoId) return { ok: false, error: "Elegí un producto." };
  if (!Number.isFinite(cantidad) || cantidad < 1) {
    return { ok: false, error: "La cantidad de cajas debe ser al menos 1." };
  }
  if (!Number.isFinite(precio) || precio < 0) {
    return { ok: false, error: "El precio unitario no es válido." };
  }

  const total = calcularTotalVenta(cantidad, precio);
  const supabase = await createClient();

  const { error } = await supabase
    .from("ventas")
    .update({
      fecha: input.fecha,
      cliente_id: input.clienteId,
      producto_id: input.productoId,
      cantidad_cajas: cantidad,
      precio_unitario: precio,
      total,
      origen: input.origen,
    })
    .eq("id", input.id);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/ventas-diarias");
  return { ok: true };
}

export async function eliminarVenta(
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!id) return { ok: false, error: "ID de venta inválido." };

  const supabase = await createClient();
  const { error } = await supabase.from("ventas").delete().eq("id", id);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/ventas-diarias");
  return { ok: true };
}
