"use client";

import { useEffect, useId, useState } from "react";
import {
  crearPersonaCampo,
  actualizarPersonaCampo,
  type PersonaCampoConSaldo,
  type PersonaCampoInput,
} from "@/app/(app)/campo/actions";

type Props = {
  open: boolean;
  onClose: () => void;
  modo: "crear" | "editar";
  persona: PersonaCampoConSaldo | null;
  onGuardado: () => void;
};

export function PersonaCampoFormModal({ open, onClose, modo, persona, onGuardado }: Props) {
  const titleId = useId();
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [notas, setNotas] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setNombre(persona?.nombre ?? "");
    setTelefono(persona?.telefono ?? "");
    setNotas(persona?.notas ?? "");
  }, [open, persona]);

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
    const input: PersonaCampoInput = {
      nombre: nombre.trim(),
      telefono: telefono.trim() || null,
      notas: notas.trim() || null,
    };
    const res =
      modo === "crear"
        ? await crearPersonaCampo(input)
        : await actualizarPersonaCampo({ ...input, id: persona!.id });
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
          {modo === "crear" ? "Nueva persona de campo" : "Editar persona de campo"}
        </h2>
        <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-4">
          <div>
            <label className={labelCls} htmlFor="tw-nombre">Nombre</label>
            <input
              id="tw-nombre"
              type="text"
              required
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej. Juan Pérez"
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls} htmlFor="tw-tel">Teléfono</label>
            <input
              id="tw-tel"
              type="tel"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              placeholder="Opcional"
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls} htmlFor="tw-notas">Notas</label>
            <textarea
              id="tw-notas"
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
              {loading ? "Guardando…" : modo === "crear" ? "Crear" : "Guardar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
