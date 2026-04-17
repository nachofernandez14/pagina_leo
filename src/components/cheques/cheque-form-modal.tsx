"use client";

import { useEffect, useId, useState } from "react";
import {
  actualizarCheque,
  crearCheque,
  type ChequeFila,
  type ChequeInput,
} from "@/app/(app)/cheques/actions";
import { listarClientesActivos } from "@/app/(app)/saldos/actions";

type Modo = "crear" | "editar";

type ChequeFormModalProps = {
  open: boolean;
  onClose: () => void;
  modo: Modo;
  cheque: ChequeFila | null;
  onGuardado: () => void;
};

const CAMPO_VACIO: Omit<ChequeInput, "monto"> & { monto: string } = {
  banco: "",
  cuit: "",
  numero_cheque: "",
  recibido_de: "",
  entregado_a: "",
  monto: "",
  fecha_cobro: "",
  notas: "",
};

// ─── Helpers de formato ───────────────────────────────────────────────────────

/** Aplica el formato XX-XXXXXXXX-X al CUIT mientras el usuario escribe.
 *  Solo permite dígitos; inserta guiones en posición 2 y 11. */
function formatearCuit(raw: string): string {
  // Extrae solo dígitos, máx 11
  const digits = raw.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 10) return `${digits.slice(0, 2)}-${digits.slice(2)}`;
  return `${digits.slice(0, 2)}-${digits.slice(2, 10)}-${digits.slice(10)}`;
}

/** Solo dígitos, máximo 8 caracteres para el número de cheque. */
function formatearNroCheque(raw: string): string {
  return raw.replace(/\D/g, "").slice(0, 8);
}

/** Extrae solo dígitos del CUIT formateado para validar longitud. */
function digitosCuit(cuit: string): string {
  return cuit.replace(/\D/g, "");
}

export function ChequeFormModal({
  open,
  onClose,
  modo,
  cheque,
  onGuardado,
}: ChequeFormModalProps) {
  const titleId = useId();

  const [campos, setCampos] = useState(CAMPO_VACIO);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clientes, setClientes] = useState<{ id: string; nombre: string }[]>([]);

  // Cargar clientes activos para el datalist de "Recibido de"
  useEffect(() => {
    listarClientesActivos().then((res) => {
      if (res.ok) setClientes(res.clientes);
    });
  }, []);

  function set(field: keyof typeof CAMPO_VACIO, value: string) {
    setCampos((prev) => ({ ...prev, [field]: value }));
  }

  function handleCuit(e: React.ChangeEvent<HTMLInputElement>) {
    set("cuit", formatearCuit(e.target.value));
  }

  function handleNroCheque(e: React.ChangeEvent<HTMLInputElement>) {
    set("numero_cheque", formatearNroCheque(e.target.value));
  }

  useEffect(() => {
    if (!open) return;
    setError(null);
    if (modo === "editar" && cheque) {
      setCampos({
        banco: cheque.banco,
        cuit: cheque.cuit,
        numero_cheque: cheque.numero_cheque,
        recibido_de: cheque.recibido_de,
        entregado_a: cheque.entregado_a ?? "",
        monto: String(cheque.monto),
        fecha_cobro: cheque.fecha_cobro,
        notas: cheque.notas ?? "",
      });
    } else {
      setCampos(CAMPO_VACIO);
    }
  }, [open, modo, cheque]);

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

    // Validaciones de formato previas al server action
    if (digitosCuit(campos.cuit).length !== 11) {
      setError("El CUIT debe tener exactamente 11 dígitos. Formato: XX-XXXXXXXX-X");
      return;
    }
    if (campos.numero_cheque.length !== 8) {
      setError("El número de cheque debe tener exactamente 8 dígitos.");
      return;
    }

    setLoading(true);

    const input: ChequeInput = {
      banco: campos.banco,
      cuit: campos.cuit,
      numero_cheque: campos.numero_cheque,
      recibido_de: campos.recibido_de,
      entregado_a: campos.entregado_a || null,
      monto: parseFloat(campos.monto.replace(",", ".")) || 0,
      fecha_cobro: campos.fecha_cobro,
      notas: campos.notas || null,
    };

    const res =
      modo === "crear"
        ? await crearCheque(input)
        : await actualizarCheque({ ...input, id: cheque!.id });

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
  const inputErrCls =
    "mt-1 w-full rounded-lg border border-red-300 bg-white px-3 py-2 text-sm text-violet-950 outline-none focus:ring-2 focus:ring-red-400/40";
  const labelCls = "text-sm font-medium text-violet-950";

  const cuitCompleto = digitosCuit(campos.cuit).length === 11;
  const nroCompleto = campos.numero_cheque.length === 8;

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
          {modo === "crear" ? "Nuevo cheque" : "Editar cheque"}
        </h2>
        <p className="mt-1 text-sm text-violet-700/85">
          Registrá los datos del cheque recibido
        </p>

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
          {/* Fila 1: Banco + Número */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls} htmlFor="ch-banco">
                Banco
              </label>
              <input
                id="ch-banco"
                type="text"
                required
                value={campos.banco}
                onChange={(e) => set("banco", e.target.value)}
                placeholder="Ej. Banco Nación"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls} htmlFor="ch-nro">
                N.° de cheque{" "}
                <span className="font-normal text-violet-500">(8 dígitos)</span>
              </label>
              <input
                id="ch-nro"
                type="text"
                required
                inputMode="numeric"
                value={campos.numero_cheque}
                onChange={handleNroCheque}
                placeholder="28128180"
                maxLength={8}
                className={nroCompleto || campos.numero_cheque === "" ? inputCls : inputErrCls}
              />
              {campos.numero_cheque !== "" && !nroCompleto ? (
                <p className="mt-1 text-xs text-red-600">
                  {campos.numero_cheque.length}/8 dígitos
                </p>
              ) : null}
            </div>
          </div>

          {/* CUIT */}
          <div>
            <label className={labelCls} htmlFor="ch-cuit">
              CUIT{" "}
              <span className="font-normal text-violet-500">(11 dígitos · XX-XXXXXXXX-X)</span>
            </label>
            <input
              id="ch-cuit"
              type="text"
              required
              inputMode="numeric"
              value={campos.cuit}
              onChange={handleCuit}
              placeholder="20-12345678-9"
              maxLength={13}
              className={cuitCompleto || campos.cuit === "" ? inputCls : inputErrCls}
            />
            {campos.cuit !== "" && !cuitCompleto ? (
              <p className="mt-1 text-xs text-red-600">
                {digitosCuit(campos.cuit).length}/11 dígitos
              </p>
            ) : null}
          </div>

          {/* Recibido de */}
          <div>
            <label className={labelCls} htmlFor="ch-recibido">
              Recibido de
            </label>
            <input
              id="ch-recibido"
              type="text"
              required
              list="ch-clientes-list"
              value={campos.recibido_de}
              onChange={(e) => set("recibido_de", e.target.value)}
              placeholder="Nombre o seleccioná un cliente"
              className={inputCls}
            />
            {clientes.length > 0 ? (
              <datalist id="ch-clientes-list">
                {clientes.map((c) => (
                  <option key={c.id} value={c.nombre} />
                ))}
              </datalist>
            ) : null}
          </div>

          {/* Entregado a */}
          <div>
            <label className={labelCls} htmlFor="ch-entregado">
              Entregado a{" "}
              <span className="font-normal text-violet-500">(opcional)</span>
            </label>
            <input
              id="ch-entregado"
              type="text"
              value={campos.entregado_a ?? ""}
              onChange={(e) => set("entregado_a", e.target.value)}
              placeholder="Dejar vacío si sigue en cartera"
              className={inputCls}
            />
          </div>

          {/* Monto + Fecha */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls} htmlFor="ch-monto">
                Monto (ARS)
              </label>
              <input
                id="ch-monto"
                type="number"
                min={0.01}
                step="0.01"
                required
                value={campos.monto}
                onChange={(e) => set("monto", e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls} htmlFor="ch-fecha">
                Fecha de cobro
              </label>
              <input
                id="ch-fecha"
                type="date"
                required
                value={campos.fecha_cobro}
                onChange={(e) => set("fecha_cobro", e.target.value)}
                className={inputCls}
              />
            </div>
          </div>

          {/* Notas */}
          <div>
            <label className={labelCls} htmlFor="ch-notas">
              Notas{" "}
              <span className="font-normal text-violet-500">(opcional)</span>
            </label>
            <textarea
              id="ch-notas"
              rows={2}
              value={campos.notas ?? ""}
              onChange={(e) => set("notas", e.target.value)}
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
              {loading ? "Guardando…" : modo === "crear" ? "Crear" : "Guardar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
