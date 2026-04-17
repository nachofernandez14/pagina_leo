"use client";

import { useEffect, useId, useState } from "react";
import {
  crearVenta,
  type ClienteOption,
  type ProductoOption,
} from "@/app/(app)/ventas-diarias/actions";
import { stockDisponibleProducto } from "@/app/(app)/productos/stock-puesto-actions";
import { calcularTotalVenta, formatArs } from "@/lib/format";
import { AppSelect } from "@/components/ui/app-select";

type NuevaVentaModalProps = {
  open: boolean;
  onClose: () => void;
  fecha: string;
  clientes: ClienteOption[];
  productos: ProductoOption[];
  onGuardado: () => void;
};

export function NuevaVentaModal({
  open,
  onClose,
  fecha,
  clientes,
  productos,
  onGuardado,
}: NuevaVentaModalProps) {
  const titleId = useId();
  const [clienteId, setClienteId] = useState<string>("");
  const [productoId, setProductoId] = useState<string>("");
  const [cantidad, setCantidad] = useState<string>("1");
  const [precioUnitario, setPrecioUnitario] = useState<string>("");
  const [origen, setOrigen] = useState<"galpon" | "puesto">("galpon");
  const [stockPuesto, setStockPuesto] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cantidadNum = Math.max(0, parseInt(cantidad, 10) || 0);
  const precioNum = parseFloat(precioUnitario.replace(",", ".")) || 0;
  const total = calcularTotalVenta(cantidadNum || 0, precioNum);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setClienteId("");
    setCantidad("1");
    setOrigen("galpon");
    setStockPuesto(null);
    const first = productos[0];
    if (first) {
      setProductoId(first.id);
      setPrecioUnitario(String(first.precio_unitario));
    } else {
      setProductoId("");
      setPrecioUnitario("");
    }
  }, [open, productos]);

  useEffect(() => {
    if (!open || !productoId) return;
    const p = productos.find((x) => x.id === productoId);
    if (p) setPrecioUnitario(String(p.precio_unitario));
  }, [productoId, open, productos]);

  // Cargar stock del puesto cuando se cambia a "puesto" o cambia producto
  useEffect(() => {
    if (!open || origen !== "puesto" || !productoId) {
      setStockPuesto(null);
      return;
    }
    stockDisponibleProducto(productoId).then((n) => setStockPuesto(n));
  }, [open, origen, productoId]);

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
    if (!productoId) {
      setError("No hay productos cargados. Creá al menos un producto en Supabase.");
      return;
    }
    if (origen === "puesto") {
      if (stockPuesto === null) {
        setError("Verificando stock del puesto, intentá en un momento.");
        return;
      }
      if (stockPuesto <= 0) {
        setError("No hay stock disponible en el puesto para este producto.");
        return;
      }
      if (cantidadNum > stockPuesto) {
        setError(`Stock disponible en el puesto: ${stockPuesto} cajas. No podés vender más de lo que hay.`);
        return;
      }
    }
    setLoading(true);
    const res = await crearVenta({
      fecha,
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
          Nueva venta
        </h2>
        <p className="mt-1 text-sm text-violet-700/85">
          Registrá producto, embalaje, cantidad y precio
        </p>

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
          <div>
            <label className="text-sm font-medium text-violet-950" htmlFor="nv-fecha">
              Día de la venta
            </label>
            <input
              id="nv-fecha"
              type="text"
              readOnly
              value={fecha}
              className="mt-1 w-full rounded-lg border border-violet-200 bg-violet-50/50 px-3 py-2 text-sm text-violet-900"
            />
          </div>

          {/* Origen: Galpón o Puesto */}
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
            {origen === "puesto" && (
              stockPuesto === null ? (
                <p className="mt-1.5 text-xs text-violet-500">Verificando stock disponible…</p>
              ) : (
                <p className={`mt-1.5 text-xs font-medium ${stockPuesto <= 0 ? "text-red-600" : "text-emerald-700"}`}>
                  Stock disponible en puesto:{" "}
                  <span className="font-bold">{stockPuesto} cajas</span>
                  {stockPuesto <= 0 && <span className="font-normal"> — sin stock</span>}
                </p>
              )
            )}
          </div>

          <div>
            <label className="text-sm font-medium text-violet-950" htmlFor="nv-cliente">
              Cliente
            </label>
            <AppSelect
              id="nv-cliente"
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

          <div>
            <label className="text-sm font-medium text-violet-950" htmlFor="nv-producto">
              Producto
            </label>
            <AppSelect
              id="nv-producto"
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
            {productoId ? (() => {
              const prod = productos.find((x) => x.id === productoId);
              return prod?.embalaje_nombre ? (
                <p className="mt-1.5 flex items-center gap-1.5 text-xs text-violet-700">
                  <span className="inline-flex rounded-full bg-violet-100 px-2 py-0.5 font-medium text-violet-800">
                    {prod.embalaje_nombre}
                  </span>
                </p>
              ) : null;
            })() : null}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-violet-950" htmlFor="nv-cant">
                Cajas
              </label>
              <input
                id="nv-cant"
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
              <label className="text-sm font-medium text-violet-950" htmlFor="nv-precio">
                Precio por caja
              </label>
              <input
                id="nv-precio"
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
              disabled={loading || productos.length === 0 || (origen === "puesto" && (stockPuesto === null || stockPuesto <= 0))}
              className="rounded-lg bg-gradient-to-r from-violet-700 to-purple-700 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-violet-900/20 transition hover:from-violet-600 hover:to-purple-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Guardando…" : origen === "puesto" && stockPuesto === null ? "Verificando stock…" : "Guardar venta"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
