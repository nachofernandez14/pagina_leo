"use client";

import { useEffect, useRef, useState } from "react";
import { type ChequeFila } from "@/app/(app)/cheques/actions";
import { formatArs } from "@/lib/format";

type Props = {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  cheques: ChequeFila[];
  inputClassName: string;
  required?: boolean;
};

export function ChequeSelect({ id, value, onChange, cheques, inputClassName, required }: Props) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onMouseDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const selected = cheques.find((c) => c.id === value);

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Hidden input so browser required validation fires */}
      {required && (
        <input
          tabIndex={-1}
          required
          value={value}
          onChange={() => undefined}
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-0 w-full opacity-0"
        />
      )}

      <button
        type="button"
        id={id}
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center justify-between gap-2 text-left ${inputClassName}`}
      >
        <span className="truncate">
          {selected
            ? `Nro ${selected.numero_cheque} · ${formatArs(selected.monto)} · ${selected.recibido_de}`
            : "— Seleccioná un cheque —"}
        </span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className={`h-4 w-4 shrink-0 text-violet-400 transition-transform ${open ? "rotate-180" : ""}`}
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {open && (
        <ul
          role="listbox"
          className="absolute left-0 right-0 z-50 mt-1 max-h-56 overflow-y-auto overflow-x-hidden rounded-lg border border-violet-200 bg-white shadow-lg"
        >
          <li
            role="option"
            aria-selected={value === ""}
            onClick={() => { onChange(""); setOpen(false); }}
            className="cursor-pointer px-3 py-2 text-sm text-violet-400 hover:bg-violet-50"
          >
            — Seleccioná un cheque —
          </li>
          {cheques.map((c) => (
            <li
              key={c.id}
              role="option"
              aria-selected={c.id === value}
              onClick={() => { onChange(c.id); setOpen(false); }}
              className={`cursor-pointer px-3 py-2 text-sm ${
                c.id === value
                  ? "bg-violet-50 font-medium text-violet-900"
                  : "text-violet-900 hover:bg-violet-50"
              }`}
            >
              <p className="truncate font-medium">Nro {c.numero_cheque}</p>
              <p className="truncate text-xs text-violet-600">
                {formatArs(c.monto)} · {c.recibido_de}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
