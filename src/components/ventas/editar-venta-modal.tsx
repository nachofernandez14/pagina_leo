"use client";

import { useEffect, useId, useState } from "react";
import {
  editarVenta,
  type ClienteOption,
  type ProductoOption,
  type VentaFila,
} from "@/app/(app)/ventas-diarias/actions";
import { calcularTotalVenta, formatArs } from "@/lib/format";
import { AppSelect } from "@/components/ui/app-select";

type EditarVentaModalProps = {
  open: boolean;
  onClose: () => void;
  venta: VentaFila | null;
  clientes: ClienteOption[];
  productos: ProductoOption[];
  onGuardado: () => void;
};

export function EditarVentaModal({
  open,
  onClose,
  venta,
  clientes,
  productos,
  onGuardado,
}: EditarVentaModalProps) {
  const titleId = useId();
  const [clienteId, setClienteId] = useState<string>(venta?.cliente_id ?? "");
  const [productoId, setProductoId] = useState<string>(venta?.producto_id ?? "");
  const [cantidad, setCantidad] = useState<string>(venta ? String(venta.cantidad_cajas) : "1");
  const [precioUnitario, setPrecioUnitario] = useState<string>(venta ? String(venta.precio_unitario) : "");
  const [origen, setOrigen] = useState<"galpon" | "puesto">(venta?.origen ?? "galpon");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || !venta) return null;

  const cantidadNum = Math.max(0, parseInt(cantidad, 10) || 0);
  const precioNum = parseFloat(precioUnitario.replace(",", ".")) || 0;
  const total = calcularTotalVenta(cantidadNum || 0, precioNum);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!venta) return;
    setError(null);
    if (!productoId) {
      setError("Elegí un producto.");
      return;
    }
    setLoading(true);
    const res = await editarVenta({
      id: venta.id,
      fecha: venta.fecha,
      clienteId: clienteId || null,
      productoId,
      cantidadCajas: cantidadNum,
      precioUnitario: precioNum,
      origen,
    });
    setLoading(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    onGuardado();
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="presentation"
    >
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
        className="relative z-10 w-full max-w-md overflow-y-auto rounded-2xl border border-violet-200/90 bg-white p-6 shadow-2xl shadow-violet-950/25 max-h-[90vh]"
      >
        <h2 id={titleId} className="text-lg font-semibold text-violet-950">
          Editar venta
        </h2>
        <p className="mt-1 text-sm text-violet-700/85">
          Modificá los datos de la venta del {venta.fecha}
        </p>

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
          {/* Origen */}
          <div>
            <label className="text-sm font-medium text-violet-950">Origen</label>
            <div className="mt-1 flex gap-2">
              <button
                type="button"
                onClick={() => setOrigen("galpon")}
                className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition ${
                  origen === "galpon"
                    ? "border-violet-600 bg-violet-600 text-white"
                    : "border-violet-200 bg-white text-violet-800 hover:bg-violet-50"
                }`}
              >
                Galpón
              </button>
              <button
                type="button"
                onClick={() => setOrigen("puesto")}
                className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition ${
                  origen === "puesto"
                    ? "border-emerald-600 bg-emerald-600 text-white"
                    : "border-violet-200 bg-white text-violet-800 hover:bg-violet-50"
                }`}
              >
                Puesto
              </button>
            </div>
          </div>

          {/* Cliente */}
          <div>
            <label className="text-sm font-medium text-violet-950" htmlFor="ev-cliente">
              Cliente
            </label>
            <AppSelect
              id="ev-cliente"
              value={clienteId}
              onChange={setClienteId}
              options={[
                { value: "", label: "Sin cliente" },
                ...clientes.map((c) => ({ value: c.id, label: c.nombre })),
              ]}
              placeholder="Sin cliente"
              className="mt-1 w-full rounded-lg border border-violet-200 bg-white px-3 py-2 text-sm text-violet-950 outline-none focus:ring-2 focus:ring-violet-500/40"
            />
          </div>

          {/* Producto */}
          <div>
            <label className="text-sm font-medium text-violet-950" htmlFor="ev-producto">
              Producto
            </label>
            <AppSelect
              id="ev-producto"
              required
              value={productoId}
              onChange={setProductoId}
              options={
                productos.length === 0
                  ? [{ value: "", label: "— Sin productos —" }]
                  : productos.map((p) => ({
                      value: p.id,
                      label: p.nombre + (p.embalaje_nombre ? ` · ${p.embalaje_nombre}` : ""),
                    }))
              }
              placeholder="— Sin productos —"
              className="mt-1 w-full rounded-lg border border-violet-200 bg-white px-3 py-2 text-sm text-violet-950 outline-none focus:ring-2 focus:ring-violet-500/40"
            />
          </div>

          {/* Cantidad y precio */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-violet-950" htmlFor="ev-cant">
                Cajas
              </label>
              <input
                id="ev-cant"
                type="number"
                min={1}
                step={1}
                required
                value={cantidad}
                onChange={(e) => setCantidad(e.target.value)}
                className="mt-1 w-full rounded-lg border border-violet-200 bg-white px-3 py-2 text-sm text-violet-950 outline-none focus:ring-2 focus:ring-violet-500/40"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-violet-950" htmlFor="ev-precio">
                Precio por caja
              </label>
              <input
                id="ev-precio"
                type="number"
                min={0}
                step="0.01"
                required
                value={precioUnitario}
                onChange={(e) => setPrecioUnitario(e.target.value)}
                className="mt-1 w-full rounded-lg border border-violet-200 bg-white px-3 py-2 text-sm text-violet-950 outline-none focus:ring-2 focus:ring-violet-500/40"
              />
            </div>
          </div>

          {/* Total */}
          <div className="rounded-xl border border-violet-200 bg-gradient-to-r from-violet-50 to-purple-50 px-4 py-3">
            <p className="text-xs font-medium text-violet-700">Total</p>
            <p className="font-mono text-xl font-semibold tabular-nums text-violet-950">
              {formatArs(total)}
            </p>
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
              disabled={loading || productos.length === 0}
              className="rounded-lg bg-gradient-to-r from-violet-700 to-purple-700 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-violet-900/20 transition hover:from-violet-600 hover:to-purple-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Guardando…" : "Guardar cambios"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
