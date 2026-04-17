"use client";

import { useEffect, useId, useState } from "react";
import { crearCarga } from "@/app/(app)/campo/actions";
import { AppSelect } from "@/components/ui/app-select";

type ProductoOption = { id: string; nombre: string };

type Props = {
  open: boolean;
  onClose: () => void;
  personaCampoId: string;
  personaNombre: string;
  productos: ProductoOption[];
  onGuardado: () => void;
};

function fechaHoy(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function CargaFormModal({
  open,
  onClose,
  personaCampoId,
  personaNombre,
  productos,
  onGuardado,
}: Props) {
  const titleId = useId();
  const [fecha, setFecha] = useState(fechaHoy);
  const [productoId, setProductoId] = useState("");
  const [cantidad, setCantidad] = useState("1");
  const [precioPendiente, setPrecioPendiente] = useState(false);
  const [precioCaja, setPrecioCaja] = useState("");
  const [notas, setNotas] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Calcular monto automáticamente
  const montoCalculado = (() => {
    if (precioPendiente) return null;
    const cant = parseInt(cantidad, 10);
    const precio = parseFloat(precioCaja.replace(",", "."));
    if (Number.isFinite(cant) && cant > 0 && Number.isFinite(precio) && precio > 0) {
      return cant * precio;
    }
    return null;
  })();

  useEffect(() => {
    if (!open) return;
    setError(null);
    setFecha(fechaHoy());
    setCantidad("1");
    setPrecioPendiente(false);
    setPrecioCaja("");
    setNotas("");
    setProductoId(productos[0]?.id ?? "");
  }, [open, productos]);

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
    const cant = parseInt(cantidad, 10) || 0;
    const precio = precioPendiente ? null : (parseFloat(precioCaja.replace(",", ".")) || null);
    const monto = precioPendiente ? 0 : (montoCalculado ?? 0);
    const res = await crearCarga({
      fecha,
      persona_campo_id: personaCampoId,
      producto_id: productoId,
      cantidad: cant,
      precio_caja: precio,
      monto,
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
          Registrar carga vendida
        </h2>
        <p className="mt-1 text-sm text-violet-700/85">
          Arrendatario: <span className="font-medium">{personaNombre}</span>
        </p>

        <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-4">
          <div>
            <label className={labelCls} htmlFor="ca-fecha">Fecha</label>
            <input
              id="ca-fecha"
              type="date"
              required
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls} htmlFor="ca-producto">Producto</label>
            <AppSelect
              id="ca-producto"
              required
              value={productoId}
              onChange={setProductoId}
              options={
                productos.length === 0
                  ? [{ value: "", label: "— Sin productos —" }]
                  : productos.map((p) => ({ value: p.id, label: p.nombre }))
              }
              placeholder="— Sin productos —"
              className={inputCls}
            />
          </div>

          <div>
            <label className={labelCls} htmlFor="ca-cant">Cantidad de cajas</label>
            <input
              id="ca-cant"
              type="number"
              min={1}
              step={1}
              required
              value={cantidad}
              onChange={(e) => setCantidad(e.target.value)}
              className={inputCls}
            />
          </div>

          {/* Toggle precio pendiente */}
          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 select-none">
            <input
              type="checkbox"
              checked={precioPendiente}
              onChange={(e) => {
                setPrecioPendiente(e.target.checked);
                if (e.target.checked) setPrecioCaja("");
              }}
              className="h-4 w-4 accent-amber-500"
            />
            <span className="text-sm font-medium text-amber-800">Precio pendiente (se confirma después)</span>
          </label>

          {!precioPendiente && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls} htmlFor="ca-precio">Precio por caja (ARS)</label>
                <input
                  id="ca-precio"
                  type="number"
                  min={0.01}
                  step="0.01"
                  required={!precioPendiente}
                  value={precioCaja}
                  onChange={(e) => setPrecioCaja(e.target.value)}
                  placeholder="0.00"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Monto total (ARS)</label>
                <div className="mt-1 w-full rounded-lg border border-violet-100 bg-violet-50 px-3 py-2 text-sm font-semibold tabular-nums text-violet-900">
                  {montoCalculado != null
                    ? montoCalculado.toLocaleString("es-AR", { style: "currency", currency: "ARS" })
                    : "—"}
                </div>
              </div>
            </div>
          )}

          <div>
            <label className={labelCls} htmlFor="ca-notas">Notas</label>
            <textarea
              id="ca-notas"
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
              onClick={onClose}
              className="rounded-lg border border-violet-200 bg-white px-4 py-2 text-sm font-medium text-violet-800 transition hover:bg-violet-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-gradient-to-r from-violet-700 to-purple-700 px-4 py-2 text-sm font-semibold text-white transition hover:from-violet-600 hover:to-purple-600 disabled:opacity-60"
            >
              {loading ? "Guardando…" : "Registrar carga"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
