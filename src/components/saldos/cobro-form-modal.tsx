"use client";

import { useEffect, useId, useState } from "react";
import { crearCobro, type TipoMovimientoCliente } from "@/app/(app)/saldos/actions";
import { crearCheque } from "@/app/(app)/cheques/actions";
import { formatArs } from "@/lib/format";
import { AppSelect } from "@/components/ui/app-select";

type ClienteOption = { id: string; nombre: string };

type Props = {
  open: boolean;
  onClose: () => void;
  /**
   * Si se proporciona, el cliente queda fijo (vista detalle de cliente).
   * Si es null/undefined se muestra un selector con `clientesDisponibles`.
   */
  clienteId?: string | null;
  clienteNombre?: string | null;
  saldoActual?: number;
  onGuardado: () => void;
  /** Necesario cuando clienteId no está fijo */
  clientesDisponibles?: ClienteOption[];
};

const MOVIMIENTOS: { value: TipoMovimientoCliente; label: string }[] = [
  { value: "efectivo", label: "Efectivo" },
  { value: "transferencia", label: "Transferencia" },
  { value: "cheque", label: "Cheque" },
];

function fechaHoy(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatearCuit(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 10) return `${digits.slice(0, 2)}-${digits.slice(2)}`;
  return `${digits.slice(0, 2)}-${digits.slice(2, 10)}-${digits.slice(10)}`;
}

function formatearNroCheque(raw: string): string {
  return raw.replace(/\D/g, "").slice(0, 8);
}

function digitosCuit(cuit: string): string {
  return cuit.replace(/\D/g, "");
}

export function CobroFormModal({
  open,
  onClose,
  clienteId,
  clienteNombre,
  saldoActual,
  onGuardado,
  clientesDisponibles,
}: Props) {
  const titleId = useId();
  const [fecha, setFecha] = useState(fechaHoy);
  const [movimiento, setMovimiento] = useState<TipoMovimientoCliente>("efectivo");
  const [monto, setMonto] = useState("");
  const [notas, setNotas] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Client selector (used when clienteId is not fixed)
  const [selectedClienteId, setSelectedClienteId] = useState("");

  // Cheque sub-form fields
  const [chBanco, setChBanco] = useState("");
  const [chNro, setChNro] = useState("");
  const [chCuit, setChCuit] = useState("");
  const [chFechaCobro, setChFechaCobro] = useState("");

  useEffect(() => {
    if (!open) return;
    setError(null);
    setFecha(fechaHoy());
    setMovimiento("efectivo");
    setMonto("");
    setNotas("");
    setSelectedClienteId("");
    setChBanco("");
    setChNro("");
    setChCuit("");
    setChFechaCobro("");
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

  const resolvedClienteId = clienteId ?? selectedClienteId;
  const resolvedClienteNombre =
    clienteNombre ??
    clientesDisponibles?.find((c) => c.id === selectedClienteId)?.nombre ??
    "";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!resolvedClienteId) {
      setError("Seleccioná un cliente.");
      return;
    }

    const montoNum = parseFloat(monto.replace(",", ".")) || 0;

    if (movimiento === "cheque") {
      if (!chBanco.trim()) {
        setError("Ingresá el banco del cheque.");
        return;
      }
      if (chNro.length !== 8) {
        setError("El N.° de cheque debe tener exactamente 8 dígitos.");
        return;
      }
      if (digitosCuit(chCuit).length !== 11) {
        setError("El CUIT debe tener exactamente 11 dígitos.");
        return;
      }
      if (!chFechaCobro) {
        setError("Ingresá la fecha de cobro del cheque.");
        return;
      }
    }

    setLoading(true);

    // Si el cobro es con cheque, primero registramos el cheque en cartera
    if (movimiento === "cheque") {
      const resCheque = await crearCheque({
        banco: chBanco.trim(),
        cuit: chCuit,
        numero_cheque: chNro,
        recibido_de: resolvedClienteNombre,
        recibido_de_cliente_id: resolvedClienteId,
        entregado_a: null,
        entregado_a_proveedor_id: null,
        entregado_a_persona_campo_id: null,
        monto: montoNum,
        fecha_cobro: chFechaCobro,
        notas: notas.trim() || null,
      });
      if (!resCheque.ok) {
        setLoading(false);
        setError(resCheque.error);
        return;
      }
    }

    const resCobro = await crearCobro({
      fecha,
      cliente_id: resolvedClienteId,
      movimiento,
      monto: montoNum,
      notas: notas.trim() || null,
    });

    setLoading(false);
    if (!resCobro.ok) {
      setError(resCobro.error);
      return;
    }
    onGuardado();
    onClose();
  }

  const inputCls =
    "mt-1 w-full rounded-lg border border-violet-200 bg-white px-3 py-2 text-sm text-violet-950 outline-none focus:ring-2 focus:ring-violet-500/40";
  const inputErrCls =
    "mt-1 w-full rounded-lg border border-red-300 bg-white px-3 py-2 text-sm text-violet-950 outline-none focus:ring-2 focus:ring-red-400/40";
  const labelCls = "text-sm font-medium text-violet-950";

  const cuitCompleto = digitosCuit(chCuit).length === 11;
  const nroCompleto = chNro.length === 8;

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
          Registrar cobro
        </h2>
        {clienteNombre && saldoActual !== undefined ? (
          <p className="mt-1 text-sm text-violet-700/85">
            Cliente: <span className="font-medium">{clienteNombre}</span> · Saldo actual:{" "}
            <span className={`font-semibold ${saldoActual > 0 ? "text-red-700" : "text-green-700"}`}>
              {formatArs(saldoActual)}
            </span>
          </p>
        ) : null}

        <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-4">
          {/* Selector de cliente (cuando no es fijo) */}
          {!clienteId && clientesDisponibles ? (
            <div>
              <label className={labelCls} htmlFor="cb-cliente">
                Cliente
              </label>
              <AppSelect
                id="cb-cliente"
                required
                value={selectedClienteId}
                onChange={setSelectedClienteId}
                options={clientesDisponibles.map((c) => ({ value: c.id, label: c.nombre }))}
                placeholder="Seleccioná un cliente…"
                className={inputCls}
              />
            </div>
          ) : null}

          {/* Fecha */}
          <div>
            <label className={labelCls} htmlFor="cb-fecha">
              Fecha
            </label>
            <input
              id="cb-fecha"
              type="date"
              required
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className={inputCls}
            />
          </div>

          {/* Tipo de movimiento */}
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

          {/* Monto */}
          <div>
            <label className={labelCls} htmlFor="cb-monto">
              Monto (ARS)
            </label>
            <input
              id="cb-monto"
              type="number"
              min={0.01}
              step="0.01"
              required
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              className={inputCls}
            />
          </div>

          {/* Sub-formulario cheque (visible solo cuando movimiento = "cheque") */}
          {movimiento === "cheque" ? (
            <div className="rounded-xl border border-violet-200 bg-violet-50/60 p-4 flex flex-col gap-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-violet-600">
                Datos del cheque recibido
              </p>
              <p className="text-xs text-violet-700/70">
                Se registrará automáticamente en tu cartera de cheques con "Recibido de:{" "}
                <strong>{resolvedClienteNombre || "cliente"}</strong>".
              </p>

              {/* Banco + N.° cheque */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls} htmlFor="cb-ch-banco">
                    Banco
                  </label>
                  <input
                    id="cb-ch-banco"
                    type="text"
                    value={chBanco}
                    onChange={(e) => setChBanco(e.target.value)}
                    placeholder="Ej. Banco Nación"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls} htmlFor="cb-ch-nro">
                    N.° cheque{" "}
                    <span className="font-normal text-violet-500">(8 díg.)</span>
                  </label>
                  <input
                    id="cb-ch-nro"
                    type="text"
                    inputMode="numeric"
                    value={chNro}
                    onChange={(e) => setChNro(formatearNroCheque(e.target.value))}
                    placeholder="28128180"
                    maxLength={8}
                    className={nroCompleto || chNro === "" ? inputCls : inputErrCls}
                  />
                  {chNro !== "" && !nroCompleto ? (
                    <p className="mt-1 text-xs text-red-600">{chNro.length}/8 dígitos</p>
                  ) : null}
                </div>
              </div>

              {/* CUIT + Fecha cobro */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls} htmlFor="cb-ch-cuit">
                    CUIT{" "}
                    <span className="font-normal text-violet-500">(11 díg.)</span>
                  </label>
                  <input
                    id="cb-ch-cuit"
                    type="text"
                    inputMode="numeric"
                    value={chCuit}
                    onChange={(e) => setChCuit(formatearCuit(e.target.value))}
                    placeholder="20-12345678-9"
                    maxLength={13}
                    className={cuitCompleto || chCuit === "" ? inputCls : inputErrCls}
                  />
                  {chCuit !== "" && !cuitCompleto ? (
                    <p className="mt-1 text-xs text-red-600">
                      {digitosCuit(chCuit).length}/11 dígitos
                    </p>
                  ) : null}
                </div>
                <div>
                  <label className={labelCls} htmlFor="cb-ch-fecha">
                    Fecha de cobro
                  </label>
                  <input
                    id="cb-ch-fecha"
                    type="date"
                    value={chFechaCobro}
                    onChange={(e) => setChFechaCobro(e.target.value)}
                    className={inputCls}
                  />
                </div>
              </div>
            </div>
          ) : null}

          {/* Notas */}
          <div>
            <label className={labelCls} htmlFor="cb-notas">
              Notas <span className="font-normal text-violet-500">(opcional)</span>
            </label>
            <textarea
              id="cb-notas"
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
              {loading ? "Guardando…" : "Registrar cobro"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

