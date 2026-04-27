"use client";

import { useEffect, useId, useState } from "react";
import {
  actualizarPago,
  crearPago,
  type PagoFila,
  type PagoInput,
  type TipoMovimiento,
} from "@/app/(app)/pagos-diarios/actions";
import { type ChequeFila } from "@/app/(app)/cheques/actions";
import { ChequeSelect } from "@/components/cheques/cheque-select";
import { formatArs } from "@/lib/format";

type ProveedorOption = { id: string; nombre: string };

type Modo = "crear" | "editar";

type PagoFormModalProps = {
  open: boolean;
  onClose: () => void;
  modo: Modo;
  pago: PagoFila | null;
  fecha: string;
  chequesDisponibles: ChequeFila[];
  proveedores?: ProveedorOption[];
  onGuardado: () => void;
};

function formatFechaCorta(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(y, m - 1, d));
}

const MOVIMIENTOS: { value: TipoMovimiento; label: string }[] = [
  { value: "efectivo", label: "Efectivo" },
  { value: "transferencia", label: "Transferencia" },
  { value: "cheque", label: "Cheque" },
];

export function PagoFormModal({
  open,
  onClose,
  modo,
  pago,
  fecha,
  chequesDisponibles,
  proveedores = [],
  onGuardado,
}: PagoFormModalProps) {
  const titleId = useId();

  const [descripcion, setDescripcion] = useState("");
  const [movimiento, setMovimiento] = useState<TipoMovimiento>("efectivo");
  const [total, setTotal] = useState("");
  const [chequeId, setChequeId] = useState("");
  const [notas, setNotas] = useState("");
  const [proveedorId, setProveedorId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    if (modo === "editar" && pago) {
      setDescripcion(pago.descripcion);
      setMovimiento(pago.movimiento);
      setTotal(String(pago.total));
      setChequeId(pago.cheque_id ?? "");
      setNotas(pago.notas ?? "");
      setProveedorId(pago.proveedor_id ?? "");
    } else {
      setDescripcion("");
      setMovimiento("efectivo");
      setTotal("");
      setChequeId("");
      setNotas("");
      setProveedorId("");
    }
  }, [open, modo, pago]);

  // Al cambiar tipo, si no es cheque limpia la selección
  useEffect(() => {
    if (movimiento !== "cheque") setChequeId("");
  }, [movimiento]);

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

    const input: PagoInput = {
      fecha,
      descripcion: descripcion.trim(),
      movimiento,
      total: parseFloat(total.replace(",", ".")) || 0,
      cheque_id: movimiento === "cheque" ? chequeId || null : null,
      notas: notas.trim() || null,
      proveedor_id: proveedorId || null,
    };

    const res =
      modo === "crear"
        ? await crearPago(input)
        : await actualizarPago({ ...input, id: pago!.id });

    setLoading(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    onGuardado();
    onClose();
  }

  const inputCls =
    "mt-1 w-full rounded-lg border border-violet-200 bg-white px-3 py-2 text-sm text-violet-950 outline-none focus:ring-2 focus:ring-violet-500/40";
  const labelCls = "text-sm font-medium text-violet-950";

  // El cheque seleccionado (para mostrar detalle)
  const chequeSeleccionado = chequesDisponibles.find((c) => c.id === chequeId);

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
        className="relative z-10 w-full max-w-lg overflow-y-auto rounded-2xl border border-violet-200/90 bg-white p-6 shadow-2xl shadow-violet-950/25 max-h-[90vh]"
      >
        <h2 id={titleId} className="text-lg font-semibold text-violet-950">
          {modo === "crear" ? "Nuevo pago" : "Editar pago"}
        </h2>
        <p className="mt-1 text-sm text-violet-700/85">
          Día: <span className="font-medium">{formatFechaCorta(fecha)}</span>
        </p>

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
          {/* Proveedor (opcional) */}
          {proveedores.length > 0 && (
            <div>
              <label className={labelCls} htmlFor="pg-proveedor">
                Proveedor{" "}
                <span className="font-normal text-violet-500">(opcional)</span>
              </label>
              <select
                id="pg-proveedor"
                value={proveedorId}
                onChange={(e) => {
                  const id = e.target.value;
                  setProveedorId(id);
                  if (id) {
                    const prov = proveedores.find((p) => p.id === id);
                    if (prov) setDescripcion(prov.nombre);
                  }
                }}
                className={inputCls}
              >
                <option value="">— Sin proveedor asociado —</option>
                {proveedores.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Descripción */}
          <div>
            <label className={labelCls} htmlFor="pg-desc">
              A quién / Concepto
            </label>
            <input
              id="pg-desc"
              type="text"
              required
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Ej. Proveedor García · Flete"
              className={inputCls}
            />
          </div>

          {/* Tipo de movimiento */}
          <div>
            <label className={labelCls}>Tipo de movimiento</label>
            <div className="mt-2 flex gap-2">
              {MOVIMIENTOS.map((m) => (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => setMovimiento(m.value)}
                  className={`flex-1 rounded-lg border py-2 text-sm font-medium transition ${
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

          {/* Selector de cheque (sólo visible si movimiento = cheque) */}
          {movimiento === "cheque" ? (
            <div>
              <label className={labelCls} htmlFor="pg-cheque">
                Cheque a entregar
              </label>
              {chequesDisponibles.length === 0 ? (
                <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                  No hay cheques en cartera disponibles. Cargá uno en la sección Cheques.
                </p>
              ) : (
                <>
                  <ChequeSelect
                    id="pg-cheque"
                    value={chequeId}
                    onChange={setChequeId}
                    cheques={chequesDisponibles}
                    inputClassName={inputCls}
                    required={movimiento === "cheque"}
                  />
                  {chequeSeleccionado ? (
                    <div className="mt-2 rounded-lg border border-violet-200 bg-violet-50/60 px-3 py-2 text-xs text-violet-800">
                      <span className="font-semibold">Recibido de:</span>{" "}
                      {chequeSeleccionado.recibido_de} ·{" "}
                      <span className="font-semibold">Monto:</span>{" "}
                      {formatArs(chequeSeleccionado.monto)}
                    </div>
                  ) : null}
                </>
              )}
            </div>
          ) : null}

          {/* Total */}
          <div>
            <label className={labelCls} htmlFor="pg-total">
              Total (ARS)
            </label>
            <input
              id="pg-total"
              type="number"
              min={0.01}
              step="0.01"
              required
              value={total}
              onChange={(e) => setTotal(e.target.value)}
              className={inputCls}
            />
          </div>

          {/* Notas */}
          <div>
            <label className={labelCls} htmlFor="pg-notas">
              Notas{" "}
              <span className="font-normal text-violet-500">(opcional)</span>
            </label>
            <textarea
              id="pg-notas"
              rows={2}
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Observaciones adicionales"
              className="mt-1 w-full resize-none rounded-lg border border-violet-200 bg-white px-3 py-2 text-sm text-violet-950 outline-none focus:ring-2 focus:ring-violet-500/40"
            />
          </div>

          {error ? (
            <p
              className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-800"
              role="alert"
            >
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
              {loading ? "Guardando…" : modo === "crear" ? "Registrar" : "Guardar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
