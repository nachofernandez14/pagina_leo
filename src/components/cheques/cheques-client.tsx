"use client";

import { useCallback, useEffect, useState } from "react";
import {
  cambiarEstadoCheque,
  listarCheques,
  type ChequeFila,
  type EstadoCheque,
} from "@/app/(app)/cheques/actions";
import { formatArs } from "@/lib/format";
import { ChequeFormModal } from "./cheque-form-modal";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function diasHasta(fechaIso: string): number {
  const [y, m, d] = fechaIso.split("-").map(Number);
  const fecha = new Date(y, m - 1, d);
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  fecha.setHours(0, 0, 0, 0);
  return Math.round((fecha.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
}

function formatFechaCorta(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(y, m - 1, d));
}

// ─── Sub-componentes ──────────────────────────────────────────────────────────

function EstadoBadge({ estado }: { estado: EstadoCheque }) {
  const styles: Record<EstadoCheque, string> = {
    en_cartera: "bg-violet-600 text-white",
    cobrado: "bg-emerald-500 text-white",
    rechazado: "bg-red-500 text-white",
    entregado: "bg-amber-500 text-white",
  };
  const labels: Record<EstadoCheque, string> = {
    en_cartera: "En cartera",
    cobrado: "Cobrado",
    rechazado: "Rechazado",
    entregado: "Entregado",
  };
  return (
    <span
      className={`inline-flex items-center justify-center rounded-full px-3 py-1 text-xs font-semibold leading-none ${styles[estado]}`}
    >
      {labels[estado]}
    </span>
  );
}

function DiasRestantesBadge({ fechaIso, estado }: { fechaIso: string; estado: EstadoCheque }) {
  if (estado !== "en_cartera") return null;
  const dias = diasHasta(fechaIso);

  let texto: string;
  let cls: string;

  if (dias < 0) {
    texto = `Vencido hace ${Math.abs(dias)} día${Math.abs(dias) === 1 ? "" : "s"}`;
    cls = "bg-red-100 text-red-800";
  } else if (dias === 0) {
    texto = "Vence hoy";
    cls = "bg-orange-100 text-orange-800";
  } else if (dias <= 2) {
    texto = `${dias} día${dias === 1 ? "" : "s"}`;
    cls = "bg-amber-100 text-amber-800";
  } else if (dias <= 5) {
    texto = `${dias} días`;
    cls = "bg-yellow-100 text-yellow-800";
  } else {
    texto = `${dias} días`;
    cls = "bg-violet-50 text-violet-700";
  }

  return (
    <span className={`inline-flex items-center justify-center rounded-full px-3 py-1 text-xs font-medium leading-none ${cls}`}>
      {texto}
    </span>
  );
}

// ─── Filtros ──────────────────────────────────────────────────────────────────

type Filtro = "todos" | EstadoCheque;

const FILTROS: { value: Filtro; label: string }[] = [
  { value: "todos", label: "Todos" },
  { value: "en_cartera", label: "En cartera" },
  { value: "entregado", label: "Entregado" },
  { value: "cobrado", label: "Cobrado" },
  { value: "rechazado", label: "Rechazado" },
];

// ─── Componente principal ─────────────────────────────────────────────────────

export function ChequesClient() {
  const [cheques, setCheques] = useState<ChequeFila[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<Filtro>("todos");

  const [modalAbierto, setModalAbierto] = useState(false);
  const [modoModal, setModoModal] = useState<"crear" | "editar">("crear");
  const [chequeEdit, setChequeEdit] = useState<ChequeFila | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    const res = await listarCheques();
    setCargando(false);
    if (!res.ok) {
      setError(res.error);
      setCheques([]);
      return;
    }
    setCheques(res.cheques);
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  function abrirCrear() {
    setModoModal("crear");
    setChequeEdit(null);
    setModalAbierto(true);
  }

  function abrirEditar(c: ChequeFila) {
    setModoModal("editar");
    setChequeEdit(c);
    setModalAbierto(true);
  }

  async function cambiarEstado(c: ChequeFila, estado: EstadoCheque) {
    const res = await cambiarEstadoCheque(c.id, estado);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    void cargar();
  }

  const chequesFiltrados =
    filtro === "todos" ? cheques : cheques.filter((c) => c.estado === filtro);

  const totalCartera = cheques
    .filter((c) => c.estado === "en_cartera")
    .reduce((s, c) => s + c.monto, 0);

  return (
    <div className="mx-auto w-full max-w-[88rem]">
      {/* Encabezado */}
      <header className="mb-8 overflow-hidden rounded-2xl border border-violet-200/70 bg-gradient-to-br from-violet-50 via-white to-purple-50/40 shadow-md shadow-violet-900/8 ring-1 ring-violet-100">
        <div className="relative px-6 py-5">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_100%_0%,_theme(colors.violet.200/35),_transparent)]" />
          <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-700 to-purple-800 text-white shadow-lg shadow-violet-900/30">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              </span>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-violet-500">Cartera</p>
                <h1 className="text-2xl font-bold tracking-tight text-violet-950">Cheques</h1>
                <p className="mt-0.5 max-w-xl text-sm text-violet-700/70">Cheques recibidos de clientes. Los cheques en cartera con vencimiento próximo generan alertas automáticas.</p>
              </div>
            </div>
            <button
              type="button"
              onClick={abrirCrear}
              className="shrink-0 rounded-xl bg-gradient-to-r from-violet-700 to-purple-700 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-violet-900/25 transition hover:from-violet-600 hover:to-purple-600"
            >
              + Nuevo cheque
            </button>
          </div>
        </div>
      </header>

      {/* Resumen en cartera */}
      {!cargando && cheques.length > 0 ? (
        <div className="mb-6 inline-flex items-center gap-2 rounded-xl border border-violet-200/80 bg-violet-50/80 px-4 py-2.5 text-sm text-violet-900">
          <span className="font-medium">En cartera:</span>
          <span className="font-mono font-semibold tabular-nums">
            {formatArs(totalCartera)}
          </span>
          <span className="text-violet-500">
            ({cheques.filter((c) => c.estado === "en_cartera").length} cheque
            {cheques.filter((c) => c.estado === "en_cartera").length !== 1 ? "s" : ""})
          </span>
        </div>
      ) : null}

      {error ? (
        <p className="mb-4 rounded-lg border border-violet-300 bg-violet-50 px-4 py-3 text-sm text-violet-900">
          {error}
        </p>
      ) : null}

      {/* Filtros */}
      <div className="mb-4 flex flex-wrap gap-2">
        {FILTROS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setFiltro(f.value)}
            className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
              filtro === f.value
                ? "border-violet-600 bg-violet-600 text-white"
                : "border-violet-200 bg-white text-violet-800 hover:bg-violet-50"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* ── Vista mobile: tarjetas (< sm) ─────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:hidden">
        {cargando ? (
          <p className="rounded-2xl border border-violet-200/80 bg-white px-4 py-10 text-center text-sm text-violet-600">
            Cargando cheques…
          </p>
        ) : chequesFiltrados.length === 0 ? (
          <p className="rounded-2xl border border-violet-200/80 bg-white px-4 py-10 text-center text-sm text-violet-600">
            {filtro === "todos"
              ? 'No hay cheques. Creá el primero con "+ Nuevo cheque".'
              : "No hay cheques con este estado."}
          </p>
        ) : (
          chequesFiltrados.map((c) => (
            <div
              key={c.id}
              className="rounded-2xl border border-violet-200/80 bg-white p-4 shadow-sm shadow-violet-900/8"
            >
              {/* Fila superior: número + estado */}
              <div className="mb-3 flex items-start justify-between gap-2">
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-wide text-violet-500">N.° Cheque</p>
                  <p className="font-mono text-base font-semibold text-violet-950">{c.numero_cheque}</p>
                </div>
                <EstadoBadge estado={c.estado} />
              </div>

              {/* Grilla de datos */}
              <div className="mb-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <div>
                  <p className="text-[11px] font-medium text-violet-500">Recibido de</p>
                  <p className="font-medium text-violet-950">{c.recibido_de}</p>
                </div>
                <div>
                  <p className="text-[11px] font-medium text-violet-500">Banco</p>
                  <p className="text-violet-800">{c.banco}</p>
                </div>
                <div>
                  <p className="text-[11px] font-medium text-violet-500">Monto</p>
                  <p className="font-mono font-semibold tabular-nums text-violet-950">{formatArs(c.monto)}</p>
                </div>
                <div>
                  <p className="text-[11px] font-medium text-violet-500">Fecha cobro</p>
                  <p className="text-violet-800">{formatFechaCorta(c.fecha_cobro)}</p>
                </div>
                {c.entregado_a ? (
                  <div className="col-span-2">
                    <p className="text-[11px] font-medium text-violet-500">Entregado a</p>
                    <p className="text-violet-700">{c.entregado_a}</p>
                  </div>
                ) : null}
              </div>

              {/* Vencimiento badge */}
              <div className="mb-3">
                <DiasRestantesBadge fechaIso={c.fecha_cobro} estado={c.estado} />
              </div>

              {/* Acciones */}
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => abrirEditar(c)}
                  className="rounded-lg border border-violet-200 bg-white px-3 py-1.5 text-xs font-medium text-violet-800 transition hover:bg-violet-50"
                >
                  Editar
                </button>
                {c.estado === "en_cartera" || c.estado === "entregado" ? (
                  <>
                    <button
                      type="button"
                      onClick={() => void cambiarEstado(c, "cobrado")}
                      className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-800 transition hover:bg-emerald-100"
                    >
                      Cobrado
                    </button>
                    <button
                      type="button"
                      onClick={() => void cambiarEstado(c, "rechazado")}
                      className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-800 transition hover:bg-red-100"
                    >
                      Rechazado
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => void cambiarEstado(c, "en_cartera")}
                    className="rounded-lg border border-violet-200 bg-white px-3 py-1.5 text-xs font-medium text-violet-800 transition hover:bg-violet-50"
                  >
                    Restablecer
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* ── Vista desktop: tabla (sm+) ──────────────────────────────────────── */}
      <div className="hidden sm:block overflow-hidden rounded-2xl border border-violet-200/80 bg-white shadow-md shadow-violet-900/10">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-violet-200 bg-violet-50/80 text-violet-900">
                <th className="px-4 py-3 font-semibold">N.° Cheque</th>
                <th className="px-4 py-3 font-semibold">Banco</th>
                <th className="hidden lg:table-cell px-4 py-3 font-semibold">CUIT</th>
                <th className="px-4 py-3 font-semibold">Recibido de</th>
                <th className="hidden lg:table-cell px-4 py-3 font-semibold">Entregado a</th>
                <th className="px-4 py-3 text-right font-semibold">Monto</th>
                <th className="px-4 py-3 font-semibold">Fecha cobro</th>
                <th className="hidden lg:table-cell px-4 py-3 font-semibold">Vencimiento</th>
                <th className="px-4 py-3 font-semibold">Estado</th>
                <th className="px-4 py-3 text-right font-semibold">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {cargando ? (
                <tr>
                  <td colSpan={10} className="px-4 py-10 text-center text-violet-600">
                    Cargando cheques…
                  </td>
                </tr>
              ) : chequesFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-10 text-center text-violet-600">
                    {filtro === "todos"
                      ? 'No hay cheques. Creá el primero con "+ Nuevo cheque".'
                      : "No hay cheques con este estado."}
                  </td>
                </tr>
              ) : (
                chequesFiltrados.map((c) => (
                  <tr
                    key={c.id}
                    className="border-b border-violet-100/90 transition hover:bg-violet-50/50"
                  >
                    <td className="px-4 py-3 font-mono font-medium text-violet-950">
                      {c.numero_cheque}
                    </td>
                    <td className="px-4 py-3 text-violet-800">{c.banco}</td>
                    <td className="hidden lg:table-cell px-4 py-3 font-mono text-xs text-violet-700">{c.cuit}</td>
                    <td className="px-4 py-3 text-violet-950">{c.recibido_de}</td>
                    <td className="hidden lg:table-cell px-4 py-3 text-violet-700">
                      {c.entregado_a ?? (
                        <span className="italic text-violet-400">En cartera</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums text-violet-950">
                      {formatArs(c.monto)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-violet-800">
                      {formatFechaCorta(c.fecha_cobro)}
                    </td>
                    <td className="hidden lg:table-cell px-4 py-3">
                      <DiasRestantesBadge fechaIso={c.fecha_cobro} estado={c.estado} />
                    </td>
                    <td className="px-4 py-3">
                      <EstadoBadge estado={c.estado} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex flex-wrap justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => abrirEditar(c)}
                          className="rounded-lg border border-violet-200 bg-white px-3 py-1.5 text-xs font-medium text-violet-800 transition hover:bg-violet-50"
                        >
                          Editar
                        </button>
                        {c.estado === "en_cartera" || c.estado === "entregado" ? (
                          <>
                            <button
                              type="button"
                              onClick={() => void cambiarEstado(c, "cobrado")}
                              className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-800 transition hover:bg-emerald-100"
                            >
                              Cobrado
                            </button>
                            <button
                              type="button"
                              onClick={() => void cambiarEstado(c, "rechazado")}
                              className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-800 transition hover:bg-red-100"
                            >
                              Rechazado
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={() => void cambiarEstado(c, "en_cartera")}
                            className="rounded-lg border border-violet-200 bg-white px-3 py-1.5 text-xs font-medium text-violet-800 transition hover:bg-violet-50"
                          >
                            Restablecer
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ChequeFormModal
        open={modalAbierto}
        onClose={() => setModalAbierto(false)}
        modo={modoModal}
        cheque={chequeEdit}
        onGuardado={() => void cargar()}
      />
    </div>
  );
}
