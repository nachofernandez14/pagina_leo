"use client";

import { useEffect, useId, useState } from "react";
import { actualizarPrecioCarga } from "@/app/(app)/campo/actions";
import { formatArs } from "@/lib/format";

type Props = {
  open: boolean;
  onClose: () => void;
  carga: { id: string; cantidad: number; producto_nombre: string; fecha: string } | null;
  onGuardado: () => void;
};

export function EditarPrecioCargaModal({ open, onClose, carga, onGuardado }: Props) {
  const titleId = useId();
  const [precioCaja, setPrecioCaja] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const precio = parseFloat(precioCaja.replace(",", "."));
  const montoCalculado =
    carga && Number.isFinite(precio) && precio > 0 ? precio * carga.cantidad : null;

  useEffect(() => {
    if (!open) return;
    setPrecioCaja("");
    setError(null);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || !carga) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!carga) return;
    setError(null);
    setLoading(true);
    const res = await actualizarPrecioCarga(carga.id, precio, carga.cantidad);
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
        className="relative z-10 w-full max-w-sm rounded-2xl border border-violet-200/90 bg-white p-6 shadow-2xl shadow-violet-950/25"
      >
        <h2 id={titleId} className="text-lg font-semibold text-violet-950">
          Confirmar precio de carga
        </h2>
        <p className="mt-1 text-sm text-violet-700/85">
          {carga.producto_nombre} · {carga.cantidad} cajas
        </p>

        <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-4">
          <div>
            <label className={labelCls} htmlFor="ep-precio">Precio por caja (ARS)</label>
            <input
              id="ep-precio"
              type="number"
              min={0.01}
              step="0.01"
              required
              autoFocus
              value={precioCaja}
              onChange={(e) => setPrecioCaja(e.target.value)}
              placeholder="0.00"
              className={inputCls}
            />
          </div>

          <div>
            <p className={labelCls}>Monto total</p>
            <div className="mt-1 w-full rounded-lg border border-violet-100 bg-violet-50 px-3 py-2 text-sm font-semibold tabular-nums text-violet-900">
              {montoCalculado != null ? formatArs(montoCalculado) : "—"}
            </div>
          </div>

          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

          <div className="flex justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-violet-200 bg-white px-4 py-2 text-sm font-medium text-violet-800 transition hover:bg-violet-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || montoCalculado == null}
              className="rounded-lg bg-gradient-to-r from-violet-700 to-purple-700 px-4 py-2 text-sm font-semibold text-white transition hover:from-violet-600 hover:to-purple-600 disabled:opacity-60"
            >
              {loading ? "Guardando…" : "Confirmar precio"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
