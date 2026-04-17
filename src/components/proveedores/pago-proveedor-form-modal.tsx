"use client";

import { useEffect, useId, useState } from "react";
import { crearPagoProveedor, type TipoMovimientoProveedor } from "@/app/(app)/proveedores/actions";
import { listarChequesDisponibles, type ChequeFila } from "@/app/(app)/cheques/actions";
import { ChequeSelect } from "@/components/cheques/cheque-select";
import { formatArs } from "@/lib/format";

type Props = {
  open: boolean;
  onClose: () => void;
  proveedorId: string;
  proveedorNombre: string;
  saldoActual: number;
  onGuardado: () => void;
};

const MOVIMIENTOS: { value: TipoMovimientoProveedor; label: string }[] = [
  { value: "efectivo", label: "Efectivo" },
  { value: "transferencia", label: "Transferencia" },
  { value: "cheque", label: "Cheque" },
];

function fechaHoy(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function PagoProveedorFormModal({
  open,
  onClose,
  proveedorId,
  proveedorNombre,
  saldoActual,
  onGuardado,
}: Props) {
  const titleId = useId();
  const [fecha, setFecha] = useState(fechaHoy);
  const [movimiento, setMovimiento] = useState<TipoMovimientoProveedor>("efectivo");
  const [monto, setMonto] = useState("");
  const [notas, setNotas] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cheques
  const [chequesDisponibles, setChequesDisponibles] = useState<ChequeFila[]>([]);
  const [chequeId, setChequeId] = useState<string>("");
  const [loadingCheques, setLoadingCheques] = useState(false);

  // Reset al abrir
  useEffect(() => {
    if (!open) return;
    setError(null);
    setFecha(fechaHoy());
    setMovimiento("efectivo");
    setMonto("");
    setNotas("");
    setChequeId("");
    setChequesDisponibles([]);
  }, [open]);

  // Cargar cheques cuando se selecciona "cheque"
  useEffect(() => {
    if (!open || movimiento !== "cheque") return;
    setLoadingCheques(true);
    setChequeId("");
    setMonto("");
    listarChequesDisponibles().then((res) => {
      setLoadingCheques(false);
      if (res.ok) setChequesDisponibles(res.cheques);
    });
  }, [open, movimiento]);

  // Al cambiar de cheque, auto-rellenar monto
  useEffect(() => {
    if (!chequeId) return;
    const ch = chequesDisponibles.find((c) => c.id === chequeId);
    if (ch) setMonto(String(ch.monto));
  }, [chequeId, chequesDisponibles]);

  // Escape
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

    if (movimiento === "cheque" && !chequeId) {
      setError("Seleccioná un cheque disponible.");
      return;
    }

    setLoading(true);
    const res = await crearPagoProveedor({
      fecha,
      proveedor_id: proveedorId,
      proveedorNombre,
      movimiento,
      monto: parseFloat(monto.replace(",", ".")) || 0,
      notas: notas.trim() || null,
      cheque_id: movimiento === "cheque" ? chequeId : null,
    });
    setLoading(false);
    if (!res.ok) { setError(res.error); return; }
    onGuardado();
    onClose();
  }

  const inputCls =
    "mt-1 w-full rounded-lg border border-violet-200 bg-white px-3 py-2 text-sm text-violet-950 outline-none focus:ring-2 focus:ring-violet-500/40";
  const labelCls = "text-sm font-medium text-violet-950";

  const chequeSeleccionado = chequesDisponibles.find((c) => c.id === chequeId);

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
          Registrar pago al proveedor
        </h2>
        <p className="mt-1 text-sm text-violet-700/85">
          Proveedor: <span className="font-medium">{proveedorNombre}</span> · Deuda actual:{" "}
          <span className={`font-semibold ${saldoActual > 0 ? "text-red-700" : "text-green-700"}`}>
            {formatArs(saldoActual)}
          </span>
        </p>

        <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-4">
          <div>
            <label className={labelCls} htmlFor="pp-fecha">Fecha</label>
            <input
              id="pp-fecha"
              type="date"
              required
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className={inputCls}
            />
          </div>

          <div>
            <span className={labelCls}>Forma de pago</span>
            <div className="mt-1 flex rounded-xl border border-violet-200 bg-violet-50 p-1 gap-1">
              {MOVIMIENTOS.map((m) => (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => setMovimiento(m.value)}
                  className={`flex-1 rounded-lg py-1.5 text-sm font-medium transition ${
                    movimiento === m.value
                      ? "bg-violet-700 text-white shadow-sm"
                      : "text-violet-700 hover:bg-violet-100"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Selector de cheque — solo cuando movimiento = cheque */}
          {movimiento === "cheque" && (
            <div>
              <label className={labelCls} htmlFor="pp-cheque">
                Cheque a entregar
              </label>
              {loadingCheques ? (
                <p className="mt-2 text-xs text-violet-600">Cargando cheques disponibles…</p>
              ) : chequesDisponibles.length === 0 ? (
                <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 border border-amber-200">
                  No hay cheques disponibles en cartera (sin entregar).
                </p>
              ) : (
                <ChequeSelect
                  id="pp-cheque"
                  value={chequeId}
                  onChange={setChequeId}
                  cheques={chequesDisponibles}
                  inputClassName={inputCls}
                  required={movimiento === "cheque"}
                />
              )}

              {/* Detalle del cheque seleccionado */}
              {chequeSeleccionado && (
                <div className="mt-2 rounded-lg bg-violet-50 border border-violet-200 px-3 py-2 text-xs text-violet-800 space-y-0.5">
                  <p><span className="font-medium">Nro:</span> {chequeSeleccionado.numero_cheque}</p>
                  <p><span className="font-medium">Banco:</span> {chequeSeleccionado.banco}</p>
                  <p><span className="font-medium">Recibido de:</span> {chequeSeleccionado.recibido_de}</p>
                  <p><span className="font-medium">Fecha cobro:</span> {chequeSeleccionado.fecha_cobro}</p>
                  <p><span className="font-medium">Monto:</span> {formatArs(chequeSeleccionado.monto)}</p>
                </div>
              )}
            </div>
          )}

          <div>
            <label className={labelCls} htmlFor="pp-monto">Monto (ARS)</label>
            <input
              id="pp-monto"
              type="number"
              min={0.01}
              step="0.01"
              required
              readOnly={movimiento === "cheque" && !!chequeId}
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              className={`${inputCls} ${movimiento === "cheque" && chequeId ? "bg-violet-50 text-violet-700 cursor-default" : ""}`}
            />
            {movimiento === "cheque" && chequeId && (
              <p className="mt-1 text-[11px] text-violet-500">El monto se toma del cheque seleccionado.</p>
            )}
          </div>

          <div>
            <label className={labelCls} htmlFor="pp-notas">
              Notas <span className="font-normal text-violet-500">(opcional)</span>
            </label>
            <textarea
              id="pp-notas"
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
              {loading ? "Guardando…" : "Registrar pago"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
