"use client";

import { useEffect, useRef, useState } from "react";

export type AppSelectOption = {
  value: string;
  label: string;
  description?: string;
};

type Props = {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  options: AppSelectOption[];
  placeholder?: string;
  required?: boolean;
  /** Classes applied to the trigger button (visually the "input"). */
  className?: string;
  /** Classes applied to the outer wrapper div. Defaults to "relative w-full". */
  containerClassName?: string;
};

export function AppSelect({
  id,
  value,
  onChange,
  options,
  placeholder = "Seleccioná una opción",
  required,
  className = "w-full rounded-lg border border-violet-200 bg-white px-3 py-2 text-sm text-violet-950 outline-none focus:ring-2 focus:ring-violet-500/40",
  containerClassName = "relative w-full",
}: Props) {
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

  const selected = options.find((o) => o.value === value);

  return (
    <div ref={containerRef} className={containerClassName}>
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
        className={`flex items-center justify-between gap-2 text-left ${className}`}
      >
        <span className={`truncate ${!selected ? "text-violet-400" : ""}`}>
          {selected ? selected.label : placeholder}
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
          {options.map((o) => (
            <li
              key={o.value}
              role="option"
              aria-selected={o.value === value}
              onClick={() => {
                onChange(o.value);
                setOpen(false);
              }}
              className={`cursor-pointer px-3 py-2 text-sm ${
                o.value === value
                  ? "bg-violet-50 font-medium text-violet-900"
                  : "text-violet-900 hover:bg-violet-50"
              }`}
            >
              {o.description ? (
                <>
                  <p className="truncate font-medium">{o.label}</p>
                  <p className="truncate text-xs text-violet-500">{o.description}</p>
                </>
              ) : (
                o.label
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
