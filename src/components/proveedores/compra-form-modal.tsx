"use client";

import { useEffect, useId, useState } from "react";
import { crearCompra } from "@/app/(app)/proveedores/actions";

type Props = {
  open: boolean;
  onClose: () => void;
  proveedorId: string;
  proveedorNombre: string;
  onGuardado: () => void;
};

function fechaHoy(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function CompraFormModal({ open, onClose, proveedorId, proveedorNombre, onGuardado }: Props) {
  const titleId = useId();
  const [fecha, setFecha] = useState(fechaHoy);
  const [descripcion, setDescripcion] = useState("");
  const [monto, setMonto] = useState("");
  const [notas, setNotas] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setFecha(fechaHoy());
    setDescripcion("");
    setMonto("");
    setNotas("");
  }, [open]);

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
    setLoading(true);
    const res = await crearCompra({
      fecha,
      proveedor_id: proveedorId,
      descripcion: descripcion.trim(),
      monto: parseFloat(monto.replace(",", ".")) || 0,
      notas: notas.trim() || null,
    });
    setLoading(false);
    if (!res.ok) { setError(res.error); return; }
    onGuardado();
    onClose();
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
        className="relative z-10 w-full max-w-md overflow-y-auto rounded-2xl border border-violet-200/90 bg-white p-6 shadow-2xl shadow-violet-950/25 max-h-[90vh]"
      >
        <h2 id={titleId} className="text-lg font-semibold text-violet-950">
          Registrar compra
        </h2>
        <p className="mt-1 text-sm text-violet-700/85">
          Proveedor: <span className="font-medium">{proveedorNombre}</span>
        </p>

        <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-4">
          <div>
            <label className={labelCls} htmlFor="cp-fecha">Fecha</label>
            <input
              id="cp-fecha"
              type="date"
              required
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls} htmlFor="cp-desc">Descripción / Concepto</label>
            <input
              id="cp-desc"
              type="text"
              required
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Ej. 100 cajas de ciruela"
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls} htmlFor="cp-monto">Monto (ARS)</label>
            <input
              id="cp-monto"
              type="number"
              min={0.01}
              step="0.01"
              required
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls} htmlFor="cp-notas">
              Notas <span className="font-normal text-violet-500">(opcional)</span>
            </label>
            <textarea
              id="cp-notas"
              rows={2}
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Observaciones"
              className="mt-1 w-full resize-none rounded-lg border border-violet-200 bg-white px-3 py-2 text-sm text-violet-950 outline-none focus:ring-2 focus:ring-violet-500/40"
            />
          </div>

          {error ? (
            <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-800" role="alert">
              {error}
            </p>
          ) : null}

          <div className="flex justify-end gap-2 pt-1">
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
              {loading ? "Guardando…" : "Registrar compra"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
