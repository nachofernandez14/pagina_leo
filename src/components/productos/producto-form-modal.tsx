"use client";

import { useEffect, useId, useState } from "react";
import {
  actualizarProducto,
  crearProducto,
  type EmbalajeOption,
  type ProductoFila,
} from "@/app/(app)/productos/actions";

type Modo = "crear" | "editar";

type ProductoFormModalProps = {
  open: boolean;
  onClose: () => void;
  modo: Modo;
  producto: ProductoFila | null;
  embalajes: EmbalajeOption[];
  onGuardado: () => void;
};

export function ProductoFormModal({
  open,
  onClose,
  modo,
  producto,
  embalajes,
  onGuardado,
}: ProductoFormModalProps) {
  const titleId = useId();
  const [nombre, setNombre] = useState("");
  const [precio, setPrecio] = useState("");
  const [cantidad, setCantidad] = useState("");
  const [embalajeId, setEmbalajeId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    if (modo === "editar" && producto) {
      setNombre(producto.nombre);
      setPrecio(String(producto.precio_unitario));
      setCantidad(String(producto.cantidad));
      setEmbalajeId(producto.embalaje_id ?? "");
    } else {
      setNombre("");
      setPrecio("");
      setCantidad("0");
      setEmbalajeId("");
    }
  }, [open, modo, producto]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const precioNum = parseFloat(precio.replace(",", ".")) || 0;
    const cantidadNum = parseInt(cantidad, 10) || 0;
    setLoading(true);

    if (modo === "crear") {
      const res = await crearProducto({
        nombre: nombre.trim(),
        precio_unitario: precioNum,
        cantidad: cantidadNum,
        embalaje_id: embalajeId || null,
      });
      setLoading(false);
      if (!res.ok) {
        setError(res.error);
        return;
      }
    } else if (producto) {
      const res = await actualizarProducto({
        id: producto.id,
        nombre: nombre.trim(),
        precio_unitario: precioNum,
        cantidad: cantidadNum,
        embalaje_id: embalajeId || null,
      });
      setLoading(false);
      if (!res.ok) {
        setError(res.error);
        return;
      }
    }

    onGuardado();
    onClose();
  }

  const titulo = modo === "crear" ? "Nuevo producto" : "Editar producto";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="presentation">
      <button
        type="button"
        className="absolute inset-0 bg-violet-950/60 backdrop-blur-sm"
        aria-label="Cerrar"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-10 w-full max-w-md rounded-2xl border border-violet-200/90 bg-white p-6 shadow-2xl shadow-violet-950/25"
      >
        <h2 id={titleId} className="text-lg font-semibold text-violet-950">
          {titulo}
        </h2>
        <p className="mt-1 text-sm text-violet-700/85">
          Nombre, embalaje, precio de referencia y cantidad en stock
        </p>

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
          <div>
            <label className="text-sm font-medium text-violet-950" htmlFor="pf-nombre">
              Nombre
            </label>
            <input
              id="pf-nombre"
              type="text"
              required
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej. Ciruelas"
              className="mt-1 w-full rounded-lg border border-violet-200 bg-white px-3 py-2 text-sm text-violet-950 outline-none focus:ring-2 focus:ring-violet-500/40"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-violet-950" htmlFor="pf-embalaje">
              Embalaje
            </label>
            <select
              id="pf-embalaje"
              value={embalajeId}
              onChange={(e) => setEmbalajeId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-violet-200 bg-white px-3 py-2 text-sm text-violet-950 outline-none focus:ring-2 focus:ring-violet-500/40"
            >
              <option value="">Sin embalaje</option>
              {embalajes.map((em) => (
                <option key={em.id} value={em.id}>
                  {em.nombre}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-violet-950" htmlFor="pf-precio">
              Precio unitario (ARS)
            </label>
            <input
              id="pf-precio"
              type="number"
              min={0}
              step="0.01"
              required
              value={precio}
              onChange={(e) => setPrecio(e.target.value)}
              className="mt-1 w-full rounded-lg border border-violet-200 bg-white px-3 py-2 text-sm text-violet-950 outline-none focus:ring-2 focus:ring-violet-500/40"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-violet-950" htmlFor="pf-cantidad">
              Cantidad en stock
            </label>
            <input
              id="pf-cantidad"
              type="number"
              min={0}
              step="1"
              required
              value={cantidad}
              onChange={(e) => setCantidad(e.target.value)}
              className="mt-1 w-full rounded-lg border border-violet-200 bg-white px-3 py-2 text-sm text-violet-950 outline-none focus:ring-2 focus:ring-violet-500/40"
            />
            <p className="mt-1 text-xs text-violet-500">Se actualiza manualmente — no se descuenta con las ventas.</p>
          </div>

          {error ? (
            <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-800" role="alert">
              {error}
            </p>
          ) : null}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-violet-200 px-4 py-2 text-sm font-medium text-violet-800 transition hover:bg-violet-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-gradient-to-r from-violet-700 to-purple-700 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-violet-900/20 transition hover:from-violet-600 hover:to-purple-600 disabled:opacity-50"
            >
              {loading ? "Guardando…" : modo === "crear" ? "Crear" : "Guardar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
