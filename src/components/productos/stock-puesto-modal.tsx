"use client";

import { useEffect, useId, useState } from "react";
import {
  agregarMovimientoPuesto,
  listarMovimientosPuesto,
  eliminarIngresoStockPuesto,
  type MovimientoPuesto,
} from "@/app/(app)/productos/stock-puesto-actions";
import { formatArs } from "@/lib/format";
import { ConfirmModal } from "@/components/confirm-modal";

type Props = {
  open: boolean;
  onClose: () => void;
  productoId: string;
  productoNombre: string;
  stockDisponible: number;
};

function fechaHoy(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatFecha(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(
    new Date(y, m - 1, d),
  );
}

export function StockPuestoModal({ open, onClose, productoId, productoNombre, stockDisponible }: Props) {
  const titleId = useId();
  const [vista, setVista] = useState<"resumen" | "agregar">("resumen");
  const [ingresos, setIngresos] = useState<MovimientoPuesto[]>([]);
  const [cargando, setCargando] = useState(false);
  const [stockActual, setStockActual] = useState(stockDisponible);

  // Formulario
  const [fecha, setFecha] = useState(fechaHoy);
  const [cantidad, setCantidad] = useState("1");
  const [notas, setNotas] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setVista("resumen");
    setStockActual(stockDisponible);
    setCargando(true);
    void listarMovimientosPuesto(productoId).then((res) => {
      setCargando(false);
      if (res.ok) setIngresos(res.movimientos.filter((m) => m.tipo === "ingreso"));
    });
  }, [open, productoId, stockDisponible]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  async function handleAgregar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await agregarMovimientoPuesto({
      fecha,
      producto_id: productoId,
      tipo: "ingreso",
      cantidad: parseInt(cantidad, 10) || 0,
      notas: notas.trim() || null,
    });
    setLoading(false);
    if (!res.ok) { setError(res.error); return; }
    // Refrescar
    const resList = await listarMovimientosPuesto(productoId);
    if (resList.ok) {
      setIngresos(resList.movimientos.filter((m) => m.tipo === "ingreso"));
      const totalIngresado = resList.ingresos.reduce((acc, i) => acc + i.cantidad, 0);
      // stockActual = ingresado - vendido; como solo cambió ingresado, sumamos la diferencia
      setStockActual((prev) => prev + (parseInt(cantidad, 10) || 0));
    }
    setVista("resumen");
    setCantidad("1");
    setNotas("");
  }

  const [confirmacion, setConfirmacion] = useState<{ mensaje: string; onOk: () => Promise<void> } | null>(null);
  const [confirmCargando, setConfirmCargando] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);

  function handleEliminar(id: string, cantIngreso: number) {
    setConfirmacion({
      mensaje: "¿Eliminar este ingreso de stock?",
      onOk: async () => {
        setConfirmCargando(true);
        setConfirmError(null);
        const res = await eliminarIngresoStockPuesto(id);
        setConfirmCargando(false);
        if (!res.ok) { setConfirmError(res.error); return; }
        setConfirmacion(null);
        setIngresos((prev) => prev.filter((i) => i.id !== id));
        setStockActual((prev) => prev - cantIngreso);
      },
    });
  }

  const inputCls =
    "mt-1 w-full rounded-lg border border-violet-200 bg-white px-3 py-2 text-sm text-violet-950 outline-none focus:ring-2 focus:ring-violet-500/40";
  const labelCls = "text-sm font-medium text-violet-950";

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
        className="relative z-10 w-full max-w-lg overflow-y-auto rounded-2xl border border-violet-200/90 bg-white p-6 shadow-2xl shadow-violet-950/25 max-h-[90vh]"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id={titleId} className="text-lg font-semibold text-violet-950">
              Stock del puesto
            </h2>
            <p className="mt-0.5 text-sm text-violet-700/85">
              {productoNombre}
            </p>
          </div>
          <span className={`shrink-0 rounded-xl px-3 py-1.5 text-sm font-bold tabular-nums ${stockActual <= 0 ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"}`}>
            {stockActual} disponibles
          </span>
        </div>

        {/* Tabs */}
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={() => setVista("resumen")}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${vista === "resumen" ? "bg-violet-100 text-violet-900" : "text-violet-600 hover:bg-violet-50"}`}
          >
            Historial ingresos
          </button>
          <button
            type="button"
            onClick={() => { setVista("agregar"); setError(null); setFecha(fechaHoy()); setCantidad("1"); setNotas(""); }}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${vista === "agregar" ? "bg-violet-100 text-violet-900" : "text-violet-600 hover:bg-violet-50"}`}
          >
            + Agregar stock
          </button>
        </div>

        {vista === "resumen" ? (
          <div className="mt-4">
            {cargando ? (
              <p className="py-6 text-center text-sm text-violet-500">Cargando…</p>
            ) : ingresos.length === 0 ? (
              <p className="py-6 text-center text-sm text-violet-500">
                No hay ingresos de stock registrados para este producto.
              </p>
            ) : (
              <div className="overflow-hidden rounded-xl border border-violet-100">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-violet-100 bg-violet-50/80 text-xs font-medium text-violet-500">
                      <th className="px-3 py-2">Fecha</th>
                      <th className="px-3 py-2 text-right">Cantidad</th>
                      <th className="px-3 py-2">Notas</th>
                      <th className="px-3 py-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {ingresos.map((i) => (
                      <tr key={i.id} className="border-b border-violet-100/60 hover:bg-violet-50/30">
                        <td className="px-3 py-2 text-violet-700">{formatFecha(i.fecha)}</td>
                        <td className="px-3 py-2 text-right font-semibold tabular-nums text-violet-950">+{i.cantidad}</td>
                        <td className="px-3 py-2 text-violet-600">{i.notas ?? "—"}</td>
                        <td className="px-3 py-2 text-right">
                          <button
                            type="button"
                            onClick={() => handleEliminar(i.id, i.cantidad)}
                            className="rounded px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                          >
                            ✕
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          <form onSubmit={handleAgregar} className="mt-4 flex flex-col gap-4">
            <div>
              <label className={labelCls} htmlFor="sp-fecha">Fecha</label>
              <input
                id="sp-fecha"
                type="date"
                required
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls} htmlFor="sp-cant">Cantidad a ingresar</label>
              <input
                id="sp-cant"
                type="number"
                min={1}
                step={1}
                required
                value={cantidad}
                onChange={(e) => setCantidad(e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls} htmlFor="sp-notas">Notas</label>
              <textarea
                id="sp-notas"
                rows={2}
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                placeholder="Opcional"
                className={inputCls}
              />
            </div>
            {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
            <div className="flex justify-end gap-3 pt-1">
              <button
                type="button"
                onClick={() => setVista("resumen")}
                className="rounded-lg border border-violet-200 bg-white px-4 py-2 text-sm font-medium text-violet-800 transition hover:bg-violet-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="rounded-lg bg-gradient-to-r from-violet-700 to-purple-700 px-4 py-2 text-sm font-semibold text-white transition hover:from-violet-600 hover:to-purple-600 disabled:opacity-60"
              >
                {loading ? "Guardando…" : "Agregar stock"}
              </button>
            </div>
          </form>
        )}

        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-violet-500 hover:text-violet-700"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
    <ConfirmModal
      open={confirmacion !== null}
      mensaje={confirmacion?.mensaje ?? ""}
      cargando={confirmCargando}
      error={confirmError}
      onConfirmar={() => { void confirmacion?.onOk(); }}
      onCancelar={() => { setConfirmacion(null); setConfirmError(null); setConfirmCargando(false); }}
    />
  );
}
