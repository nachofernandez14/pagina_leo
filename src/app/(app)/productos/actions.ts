"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type EmbalajeOption = {
  id: string;
  nombre: string;
};

export type ProductoFila = {
  id: string;
  nombre: string;
  precio_unitario: number;
  cantidad: number;
  activo: boolean;
  created_at: string;
  embalaje_id: string | null;
  embalaje_nombre: string | null;
};

function revalidateProductosYVentas() {
  revalidatePath("/productos");
  revalidatePath("/ventas-diarias");
}

export async function listarEmbalajes(): Promise<
  { ok: true; embalajes: EmbalajeOption[] } | { ok: false; error: string }
> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("embalajes")
    .select("id, nombre")
    .order("nombre", { ascending: true });

  if (error) {
    return {
      ok: false,
      error:
        error.message.includes("relation") || error.code === "42P01"
          ? "Falta crear la tabla embalajes (ver docs/schema-ventas-clientes-productos.md)."
          : error.message,
    };
  }

  return { ok: true, embalajes: (data ?? []) as EmbalajeOption[] };
}

export async function listarProductosTodos(): Promise<
  { ok: true; productos: ProductoFila[] } | { ok: false; error: string }
> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("productos")
    .select("id, nombre, precio_unitario, cantidad, activo, created_at, embalaje_id, embalajes ( nombre )")
    .order("activo", { ascending: false })
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

  const productos = (data ?? []).map((row) => {
    const emb = Array.isArray(row.embalajes) ? row.embalajes[0] : row.embalajes;
    return {
      id: row.id,
      nombre: row.nombre,
      precio_unitario: Number(row.precio_unitario),
      cantidad: Number(row.cantidad ?? 0),
      activo: Boolean(row.activo),
      created_at: row.created_at,
      embalaje_id: row.embalaje_id ?? null,
      embalaje_nombre: (emb as { nombre?: string } | null)?.nombre ?? null,
    };
  }) as ProductoFila[];

  return { ok: true, productos };
}

export async function crearProducto(input: {
  nombre: string;
  precio_unitario: number;
  cantidad: number;
  embalaje_id: string | null;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const nombre = input.nombre.trim();
  const precio = Number(input.precio_unitario);
  const cantidad = Math.floor(Number(input.cantidad));

  if (!nombre) {
    return { ok: false, error: "El nombre es obligatorio." };
  }
  if (!Number.isFinite(precio) || precio < 0) {
    return { ok: false, error: "El precio unitario no es válido." };
  }
  if (!Number.isFinite(cantidad) || cantidad < 0) {
    return { ok: false, error: "La cantidad no es válida." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("productos").insert({
    nombre,
    precio_unitario: precio,
    cantidad,
    activo: true,
    embalaje_id: input.embalaje_id ?? null,
  });

  if (error) {
    return {
      ok: false,
      error:
        error.message.includes("relation") || error.code === "42P01"
          ? "Falta crear la tabla productos en Supabase."
          : error.message,
    };
  }

  revalidateProductosYVentas();
  return { ok: true };
}

export async function actualizarProducto(input: {
  id: string;
  nombre: string;
  precio_unitario: number;
  cantidad: number;
  embalaje_id: string | null;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const nombre = input.nombre.trim();
  const precio = Number(input.precio_unitario);
  const cantidad = Math.floor(Number(input.cantidad));

  if (!input.id) {
    return { ok: false, error: "Producto inválido." };
  }
  if (!nombre) {
    return { ok: false, error: "El nombre es obligatorio." };
  }
  if (!Number.isFinite(precio) || precio < 0) {
    return { ok: false, error: "El precio unitario no es válido." };
  }
  if (!Number.isFinite(cantidad) || cantidad < 0) {
    return { ok: false, error: "La cantidad no es válida." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("productos")
    .update({ nombre, precio_unitario: precio, cantidad, embalaje_id: input.embalaje_id ?? null })
    .eq("id", input.id);

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidateProductosYVentas();
  return { ok: true };
}

export async function setProductoActivo(input: {
  id: string;
  activo: boolean;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!input.id) {
    return { ok: false, error: "Producto inválido." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("productos")
    .update({ activo: input.activo })
    .eq("id", input.id);

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidateProductosYVentas();
  return { ok: true };
}
