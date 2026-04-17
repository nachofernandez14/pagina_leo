"use client";

import { useEffect, useState } from "react";
import { listarChequesProximos, type ChequeFila } from "@/app/(app)/cheques/actions";
import { formatArs } from "@/lib/format";

const DIAS_ALERTA = 5;

function diasHasta(fechaIso: string): number {
  const [y, m, d] = fechaIso.split("-").map(Number);
  const fecha = new Date(y, m - 1, d);
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  fecha.setHours(0, 0, 0, 0);
  return Math.round((fecha.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
}

function textoAlerta(cheque: ChequeFila, dias: number): string {
  const nro = cheque.numero_cheque.toUpperCase();
  if (dias < 0) {
    return `EL CHEQUE NRO ${nro} VENCIÓ HACE ${Math.abs(dias)} DÍA${Math.abs(dias) === 1 ? "" : "S"} — ${cheque.banco} · ${formatArs(cheque.monto)}`;
  }
  if (dias === 0) {
    return `EL CHEQUE NRO ${nro} ESTÁ LISTO PARA COBRAR HOY — ${cheque.banco} · ${formatArs(cheque.monto)}`;
  }
  return `EL CHEQUE NRO ${nro} VA A ESTAR PARA COBRAR EN ${dias} DÍA${dias === 1 ? "" : "S"} — ${cheque.banco} · ${formatArs(cheque.monto)}`;
}

function colorAlerta(dias: number): string {
  if (dias < 0)
    return "border-red-300 bg-red-50 text-red-900";
  if (dias === 0)
    return "border-orange-300 bg-orange-50 text-orange-900";
  if (dias <= 2)
    return "border-amber-300 bg-amber-50 text-amber-900";
  return "border-yellow-300 bg-yellow-50 text-yellow-900";
}

function iconoAlerta(dias: number): string {
  if (dias < 0) return "🔴";
  if (dias === 0) return "🟠";
  if (dias <= 2) return "🟡";
  return "⚠️";
}

/**
 * Muestra banners de alerta en la parte superior de cada página
 * para cheques en cartera próximos a vencer (≤ DIAS_ALERTA días) o vencidos.
 * El usuario puede descartar cada alerta (se mantiene descartada durante la sesión).
 */
export function AlertasCheques() {
  const [cheques, setCheques] = useState<ChequeFila[]>([]);
  const [descartados, setDescartados] = useState<Set<string>>(new Set());

  useEffect(() => {
    listarChequesProximos(DIAS_ALERTA).then((res) => {
      if (res.ok) setCheques(res.cheques);
    });
  }, []);

  const visibles = cheques.filter((c) => !descartados.has(c.id));

  if (visibles.length === 0) return null;

  return (
    <div className="mb-6 flex flex-col gap-2" role="region" aria-label="Alertas de cheques">
      {visibles.map((c) => {
        const dias = diasHasta(c.fecha_cobro);
        return (
          <div
            key={c.id}
            className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm font-medium shadow-sm ${colorAlerta(dias)}`}
            role="alert"
          >
            <span className="flex items-center gap-2">
              <span aria-hidden="true">{iconoAlerta(dias)}</span>
              {textoAlerta(c, dias)}
            </span>
            <button
              type="button"
              aria-label="Descartar alerta"
              onClick={() =>
                setDescartados((prev) => new Set([...prev, c.id]))
              }
              className="shrink-0 rounded-lg p-1 opacity-60 transition hover:opacity-100"
            >
              ✕
            </button>
          </div>
        );
      })}
    </div>
  );
}
