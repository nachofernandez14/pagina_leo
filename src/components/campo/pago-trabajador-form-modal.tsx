"use client";

import { useEffect, useId, useState } from "react";
import {
  crearPagoCampo,
  type TipoMovimientoCampo,
} from "@/app/(app)/campo/actions";
import { listarChequesDisponibles, type ChequeFila } from "@/app/(app)/cheques/actions";
import { ChequeSelect } from "@/components/cheques/cheque-select";
import { formatArs } from "@/lib/format";

type Props = {
  open: boolean;
  onClose: () => void;
  personaCampoId: string;
  personaNombre: string;
  saldoActual: number;
  onGuardado: () => void;
};

const MOVIMIENTOS: { value: TipoMovimientoCampo; label: string }[] = [
  { value: "efectivo", label: "Efectivo" },
  { value: "transferencia", label: "Transferencia" },
  { value: "cheque", label: "Cheque" },
];

function fechaHoy(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function PagoCampoFormModal({
  open,
  onClose,
  personaCampoId,
  personaNombre,
  saldoActual,
  onGuardado,
}: Props) {
  const titleId = useId();
  const [fecha, setFecha] = useState(fechaHoy);
  const [movimiento, setMovimiento] = useState<TipoMovimientoCampo>("efectivo");
  const [monto, setMonto] = useState("");
  const [notas, setNotas] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [chequesDisponibles, setChequesDisponibles] = useState<ChequeFila[]>([]);
  const [chequeId, setChequeId] = useState<string>("");
  const [loadingCheques, setLoadingCheques] = useState(false);

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

  useEffect(() => {
    if (!chequeId) return;
    const ch = chequesDisponibles.find((c) => c.id === chequeId);
    if (ch) setMonto(String(ch.monto));
  }, [chequeId, chequesDisponibles]);

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
    const res = await crearPagoCampo({
      fecha,
      persona_campo_id: personaCampoId,
      personaNombre,
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
          Registrar pago de campo
        </h2>
        <p className="mt-1 text-sm text-violet-700/85">
          Arrendatario: <span className="font-medium">{personaNombre}</span>
        </p>
        {saldoActual > 0 && (
          <p className="mt-1 text-sm text-orange-700">
            Deuda pendiente: <span className="font-semibold">{formatArs(saldoActual)}</span>
          </p>
        )}

        <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-4">
          <div>
            <label className={labelCls} htmlFor="pt-fecha">Fecha</label>
            <input
              id="pt-fecha"
              type="date"
              required
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Forma de pago</label>
            <div className="mt-1 flex gap-2">
              {MOVIMIENTOS.map((m) => (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => setMovimiento(m.value)}
                  className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition ${
                    movimiento === m.value
                      ? "border-violet-600 bg-violet-600 text-white"
                      : "border-violet-200 bg-white text-violet-800 hover:bg-violet-50"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {movimiento === "cheque" ? (
            <div>
              <label className={labelCls} htmlFor="pt-cheque">Cheque en cartera</label>
              {loadingCheques ? (
                <p className="mt-1 text-sm text-violet-500">Cargando cheques…</p>
              ) : (
                <ChequeSelect
                  id="pt-cheque"
                  value={chequeId}
                  onChange={setChequeId}
                  cheques={chequesDisponibles}
                  inputClassName={inputCls}
                  required
                />
              )}
            </div>
          ) : (
            <div>
              <label className={labelCls} htmlFor="pt-monto">Monto (ARS)</label>
              <input
                id="pt-monto"
                type="number"
                min={0.01}
                step="0.01"
                required
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                placeholder="0.00"
                className={inputCls}
              />
            </div>
          )}

          {movimiento === "cheque" && chequeId && (
            <div>
              <label className={labelCls} htmlFor="pt-monto-ch">Monto del cheque</label>
              <input
                id="pt-monto-ch"
                type="number"
                readOnly
                value={monto}
                className={`${inputCls} bg-violet-50/50`}
              />
            </div>
          )}

          <div>
            <label className={labelCls} htmlFor="pt-notas">Notas</label>
            <textarea
              id="pt-notas"
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
              {loading ? "Guardando…" : "Registrar pago"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

