"use client";

import { useEffect, useId, useState } from "react";
import {
  actualizarCliente,
  crearCliente,
  type ClienteFila,
  type ClienteInput,
} from "@/app/(app)/saldos/actions";

type Modo = "crear" | "editar";

type Props = {
  open: boolean;
  onClose: () => void;
  modo: Modo;
  cliente: ClienteFila | null;
  onGuardado: () => void;
};

const VACIO: ClienteInput = { nombre: "", telefono: null, notas: null };

export function ClienteFormModal({ open, onClose, modo, cliente, onGuardado }: Props) {
  const titleId = useId();
  const [campos, setCampos] = useState<ClienteInput>(VACIO);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setCampos(
      modo === "editar" && cliente
        ? { nombre: cliente.nombre, telefono: cliente.telefono, notas: cliente.notas }
        : VACIO,
    );
  }, [open, modo, cliente]);

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
    const res =
      modo === "crear"
        ? await crearCliente(campos)
        : await actualizarCliente({ ...campos, id: cliente!.id });
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
          {modo === "crear" ? "Nuevo cliente" : "Editar cliente"}
        </h2>

        <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-4">
          <div>
            <label className={labelCls} htmlFor="cl-nombre">Nombre</label>
            <input
              id="cl-nombre"
              type="text"
              required
              value={campos.nombre}
              onChange={(e) => setCampos((p) => ({ ...p, nombre: e.target.value }))}
              placeholder="Nombre del cliente"
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls} htmlFor="cl-tel">
              Teléfono <span className="font-normal text-violet-500">(opcional)</span>
            </label>
            <input
              id="cl-tel"
              type="text"
              value={campos.telefono ?? ""}
              onChange={(e) =>
                setCampos((p) => ({ ...p, telefono: e.target.value || null }))
              }
              placeholder="Ej. 2664-123456"
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls} htmlFor="cl-notas">
              Notas <span className="font-normal text-violet-500">(opcional)</span>
            </label>
            <textarea
              id="cl-notas"
              rows={2}
              value={campos.notas ?? ""}
              onChange={(e) =>
                setCampos((p) => ({ ...p, notas: e.target.value || null }))
              }
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
              {loading ? "Guardando…" : modo === "crear" ? "Crear" : "Guardar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
