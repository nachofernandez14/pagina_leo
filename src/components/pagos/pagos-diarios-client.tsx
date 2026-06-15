"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  listarPagosPorFecha,
  type PagoFila,
  type TipoMovimiento,
} from "@/app/(app)/pagos-diarios/actions";
import {
  listarChequesEnCartera,
  type ChequeFila,
} from "@/app/(app)/cheques/actions";
import {
  listarCobrosPorFecha,
  listarClientesActivos,
  type CobroConCliente,
} from "@/app/(app)/saldos/actions";
import { listarProveedoresActivos } from "@/app/(app)/proveedores/actions";
import { formatArs } from "@/lib/format";
import { PagoFormModal } from "./pago-form-modal";
import { CobroFormModal } from "@/components/saldos/cobro-form-modal";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fechaLocalHoy(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function sumarDias(fechaIso: string, dias: number): string {
  const d = new Date(`${fechaIso}T12:00:00`);
  d.setDate(d.getDate() + dias);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatearFechaEtiqueta(fechaIso: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fechaIso)) return "";
  const [y, m, d] = fechaIso.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  if (isNaN(dt.getTime())) return "";
  return new Intl.DateTimeFormat("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(dt);
}

function formatearHora(iso: string): string {
  return new Intl.DateTimeFormat("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

// ─── Badges ───────────────────────────────────────────────────────────────────

const MOVIMIENTO_BADGE: Record<TipoMovimiento, { label: string; cls: string }> = {
  efectivo: { label: "Efectivo", cls: "bg-emerald-100 text-emerald-800" },
  transferencia: { label: "Transferencia", cls: "bg-blue-100 text-blue-800" },
  cheque: { label: "Cheque", cls: "bg-violet-100 text-violet-800" },
};

function MovimientoBadge({ tipo }: { tipo: string }) {
  const config = MOVIMIENTO_BADGE[tipo as TipoMovimiento] ?? {
    label: tipo,
    cls: "bg-gray-100 text-gray-800",
  };
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${config.cls}`}>
      {config.label}
    </span>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function PagosDiariosClient() {
  const [fecha, setFecha] = useState(fechaLocalHoy);
  const [tab, setTab] = useState<"egresos" | "ingresos">("egresos");

  // ── Egresos (pagos) ──
  const [pagos, setPagos] = useState<PagoFila[]>([]);
  const [cargandoPagos, setCargandoPagos] = useState(true);
  const [errorPagos, setErrorPagos] = useState<string | null>(null);
  const [cheques, setCheques] = useState<ChequeFila[]>([]);
  const [errorCheques, setErrorCheques] = useState<string | null>(null);
  const [modalPagoAbierto, setModalPagoAbierto] = useState(false);
  const [modoModalPago, setModoModalPago] = useState<"crear" | "editar">("crear");
  const [pagoEdit, setPagoEdit] = useState<PagoFila | null>(null);

  // ── Ingresos (cobros) ──
  const [cobros, setCobros] = useState<CobroConCliente[]>([]);
  const [cargandoCobros, setCargandoCobros] = useState(false);
  const [errorCobros, setErrorCobros] = useState<string | null>(null);
  const [clientes, setClientes] = useState<{ id: string; nombre: string }[]>([]);
  const [modalCobroAbierto, setModalCobroAbierto] = useState(false);

  // ── Proveedores ──
  const [proveedores, setProveedores] = useState<{ id: string; nombre: string }[]>([]);

  // ── Carga de datos ──

  const cargarPagos = useCallback(async () => {
    setCargandoPagos(true);
    setErrorPagos(null);
    const res = await listarPagosPorFecha(fecha);
    setCargandoPagos(false);
    if (!res.ok) { setErrorPagos(res.error); setPagos([]); return; }
    setPagos(res.pagos);
  }, [fecha]);

  const cargarCobros = useCallback(async () => {
    setCargandoCobros(true);
    setErrorCobros(null);
    const res = await listarCobrosPorFecha(fecha);
    setCargandoCobros(false);
    if (!res.ok) { setErrorCobros(res.error); setCobros([]); return; }
    setCobros(res.cobros);
  }, [fecha]);

  useEffect(() => { void cargarPagos(); }, [cargarPagos]);
  useEffect(() => { void cargarCobros(); }, [cargarCobros]);

  // Cargar datos estáticos en paralelo (cheques, clientes, proveedores)
  useEffect(() => {
    Promise.all([
      listarChequesEnCartera(),
      listarClientesActivos(),
      listarProveedoresActivos(),
    ]).then(([resCheques, resClientes, resProveedores]) => {
      if (resCheques.ok) setCheques(resCheques.cheques);
      else setErrorCheques(resCheques.error);
      if (resClientes.ok) setClientes(resClientes.clientes);
      if (resProveedores.ok) setProveedores(resProveedores.proveedores);
    });
  }, []);

  function abrirCrearPago() {
    setModoModalPago("crear");
    setPagoEdit(null);
    setModalPagoAbierto(true);
  }

  function abrirEditarPago(p: PagoFila) {
    setModoModalPago("editar");
    setPagoEdit(p);
    setModalPagoAbierto(true);
  }

  const totalEgresos = useMemo(() => pagos.reduce((s, p) => s + p.total, 0), [pagos]);
  const totalIngresos = useMemo(() => cobros.reduce((s, c) => s + c.monto, 0), [cobros]);
  const etiquetaDia = useMemo(() => formatearFechaEtiqueta(fecha), [fecha]);
  const esHoy = fecha === fechaLocalHoy();

  return (
    <div className="mx-auto w-full max-w-[88rem]">
      {/* Encabezado */}
      <header className="mb-8 overflow-hidden rounded-2xl border border-violet-200/70 bg-gradient-to-br from-violet-50 via-white to-purple-50/40 shadow-md shadow-violet-900/8 ring-1 ring-violet-100">
        <div className="relative px-6 py-5">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_100%_0%,_theme(colors.violet.200/35),_transparent)]" />
          <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-700 to-purple-800 text-white shadow-lg shadow-violet-900/30">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 -960 960 960" fill="currentColor"><path d="M546.67-426.67q-50 0-85-35t-35-85q0-50 35-85t85-35q50 0 85 35t35 85q0 50-35 85t-85 35ZM240-293.33q-27.5 0-47.08-19.59-19.59-19.58-19.59-47.08v-373.33q0-27.5 19.59-47.09Q212.5-800 240-800h613.33q27.5 0 47.09 19.58Q920-760.83 920-733.33V-360q0 27.5-19.58 47.08-19.59 19.59-47.09 19.59H240ZM333.33-360H760q0-39 27.17-66.17 27.16-27.16 66.16-27.16V-640q-39 0-66.16-27.17Q760-694.33 760-733.33H333.33q0 39-27.16 66.16Q279-640 240-640v186.67q39 0 66.17 27.16Q333.33-399 333.33-360ZM800-160H106.67q-27.5 0-47.09-19.58Q40-199.17 40-226.67V-680h66.67v453.33H800V-160ZM240-360v-373.33V-360Z" /></svg>
              </span>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-violet-500">Movimientos diarios</p>
                <h1 className="text-2xl font-bold tracking-tight text-violet-950">Pagos diarios</h1>
                <p className="mt-0.5 max-w-xl text-sm text-violet-700/70">Egresos a proveedores y personal, e ingresos cobrados de clientes. Todo por día.</p>
              </div>
            </div>
            {tab === "egresos" ? (
              <button
                type="button"
                onClick={abrirCrearPago}
                className="shrink-0 rounded-xl bg-gradient-to-r from-violet-700 to-purple-700 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-violet-900/25 transition hover:from-violet-600 hover:to-purple-600"
              >
                + Nuevo pago
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setModalCobroAbierto(true)}
                className="shrink-0 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-emerald-900/25 transition hover:from-emerald-500 hover:to-teal-500"
              >
                + Registrar cobro
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Selector de día */}
      <div className="mb-6 flex flex-col gap-4 rounded-2xl border border-violet-200/80 bg-gradient-to-br from-violet-50/90 via-white to-violet-100/40 p-4 shadow-sm ring-1 ring-violet-200/50 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-sm font-medium text-violet-950" htmlFor="fecha-pagos">
            Día
          </label>
          <input
            id="fecha-pagos"
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            className="rounded-lg border border-violet-200 bg-white px-3 py-2 text-sm text-violet-950 outline-none focus:ring-2 focus:ring-violet-500/40"
          />
          <div className="flex gap-1">
            <button type="button" onClick={() => setFecha(sumarDias(fecha, -1))} className="rounded-lg border border-violet-200 bg-white px-3 py-2 text-xs font-medium text-violet-800 transition hover:bg-violet-50">← Ayer</button>
            <button type="button" onClick={() => setFecha(fechaLocalHoy())} className="rounded-lg border border-violet-200 bg-white px-3 py-2 text-xs font-medium text-violet-800 transition hover:bg-violet-50">Hoy</button>
            <button type="button" onClick={() => setFecha(sumarDias(fecha, 1))} className="rounded-lg border border-violet-200 bg-white px-3 py-2 text-xs font-medium text-violet-800 transition hover:bg-violet-50">Mañana →</button>
          </div>
        </div>
        <p className="text-sm capitalize text-violet-800/90">
          {etiquetaDia}
          {esHoy ? <span className="ml-2 rounded-full bg-violet-200/80 px-2 py-0.5 text-xs font-medium text-violet-900">Hoy</span> : null}
        </p>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-1 rounded-xl border border-violet-200 bg-violet-50/80 p-1 w-fit">
        <button
          type="button"
          onClick={() => setTab("egresos")}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${
            tab === "egresos"
              ? "bg-white text-violet-900 shadow-sm ring-1 ring-violet-200"
              : "text-violet-600 hover:bg-white/60"
          }`}
        >
          <span className="h-2 w-2 rounded-full bg-red-400 inline-block" />
          Egresos
          {pagos.length > 0 && (
            <span className="ml-1 rounded-full bg-violet-100 px-1.5 py-0.5 text-[10px] font-bold text-violet-700">
              {pagos.length}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => setTab("ingresos")}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${
            tab === "ingresos"
              ? "bg-white text-violet-900 shadow-sm ring-1 ring-violet-200"
              : "text-violet-600 hover:bg-white/60"
          }`}
        >
          <span className="h-2 w-2 rounded-full bg-emerald-400 inline-block" />
          Ingresos
          {cobros.length > 0 && (
            <span className="ml-1 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">
              {cobros.length}
            </span>
          )}
        </button>
      </div>

      {errorCheques ? (
        <p className="mb-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Aviso: no se pudieron cargar los cheques disponibles. {errorCheques}
        </p>
      ) : null}

      {/* ── Tab Egresos ── */}
      {tab === "egresos" ? (
        <div className="overflow-hidden rounded-2xl border border-violet-200/80 bg-white shadow-md shadow-violet-900/10">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-violet-200 bg-violet-50/80 text-violet-900">
                  <th className="hidden sm:table-cell px-4 py-3 font-semibold">Hora</th>
                  <th className="px-4 py-3 font-semibold">A quién / Concepto</th>
                  <th className="px-4 py-3 font-semibold">Movimiento</th>
                  <th className="hidden lg:table-cell px-4 py-3 font-semibold">Cheque entregado</th>
                  <th className="px-4 py-3 text-right font-semibold">Total</th>
                  <th className="px-4 py-3 text-right font-semibold">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {cargandoPagos ? (
                  <tr><td colSpan={6} className="px-4 py-10 text-center text-violet-600">Cargando pagos…</td></tr>
                ) : errorPagos ? (
                  <tr><td colSpan={6} className="px-4 py-10 text-center text-red-700">{errorPagos}</td></tr>
                ) : pagos.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-10 text-center text-violet-600">No hay egresos registrados para este día.</td></tr>
                ) : (
                  pagos.map((p) => (
                    <tr key={p.id} className="border-b border-violet-100/90 transition hover:bg-violet-50/50">
                      <td className="hidden sm:table-cell whitespace-nowrap px-4 py-3 font-mono text-violet-800">{formatearHora(p.created_at)}</td>
                      <td className="px-4 py-3">
                        <span className="font-medium text-violet-950">{p.descripcion}</span>
                        {p.fuente === "campo" ? (
                          <span className="ml-2 inline-flex rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-800">Campo</span>
                        ) : p.proveedor_nombre ? (
                          <span className="ml-2 inline-flex rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-800">Proveedor</span>
                        ) : null}
                      </td>
                      <td className="px-4 py-3"><MovimientoBadge tipo={p.movimiento} /></td>
                      <td className="hidden lg:table-cell px-4 py-3 font-mono text-violet-700">
                        {p.cheque_numero ? (
                          <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-800">Nro {p.cheque_numero}</span>
                        ) : (
                          <span className="text-xs italic text-violet-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-semibold tabular-nums text-violet-950">{formatArs(p.total)}</td>
                      <td className="px-4 py-3 text-right">
                        {p.fuente !== "campo" && (
                          <button type="button" onClick={() => abrirEditarPago(p)} className="rounded-lg border border-violet-200 bg-white px-3 py-1.5 text-xs font-medium text-violet-800 transition hover:bg-violet-50">
                            Editar
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {pagos.length > 0 ? (
                <tfoot>
                  <tr className="border-t-2 border-violet-200 bg-violet-50/60">
                    <td colSpan={4} className="px-4 py-3 text-sm font-semibold text-violet-900">Total egresos del día</td>
                    <td className="px-4 py-3 text-right font-mono text-sm font-bold tabular-nums text-red-700">{formatArs(totalEgresos)}</td>
                    <td />
                  </tr>
                </tfoot>
              ) : null}
            </table>
          </div>
        </div>
      ) : null}

      {/* ── Tab Ingresos ── */}
      {tab === "ingresos" ? (
        <div className="overflow-hidden rounded-2xl border border-emerald-200/80 bg-white shadow-md shadow-emerald-900/10">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-emerald-200 bg-emerald-50/80 text-emerald-900">
                  <th className="hidden sm:table-cell px-4 py-3 font-semibold">Hora</th>
                  <th className="px-4 py-3 font-semibold">Cliente</th>
                  <th className="px-4 py-3 font-semibold">Forma de pago</th>
                  <th className="hidden lg:table-cell px-4 py-3 font-semibold">Notas</th>
                  <th className="px-4 py-3 text-right font-semibold">Monto</th>
                </tr>
              </thead>
              <tbody>
                {cargandoCobros ? (
                  <tr><td colSpan={5} className="px-4 py-10 text-center text-emerald-600">Cargando cobros…</td></tr>
                ) : errorCobros ? (
                  <tr><td colSpan={5} className="px-4 py-10 text-center text-red-700">{errorCobros}</td></tr>
                ) : cobros.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-10 text-center text-emerald-600">No hay ingresos registrados para este día.</td></tr>
                ) : (
                  cobros.map((c) => (
                    <tr key={c.id} className="border-b border-emerald-100/90 transition hover:bg-emerald-50/40">
                      <td className="hidden sm:table-cell whitespace-nowrap px-4 py-3 font-mono text-emerald-800">{formatearHora(c.created_at)}</td>
                      <td className="px-4 py-3 font-medium text-emerald-950">{c.cliente_nombre}</td>
                      <td className="px-4 py-3"><MovimientoBadge tipo={c.movimiento} /></td>
                      <td className="hidden lg:table-cell px-4 py-3 text-violet-700/70 text-xs">{c.notas ?? "—"}</td>
                      <td className="px-4 py-3 text-right font-mono font-semibold tabular-nums text-emerald-800">{formatArs(c.monto)}</td>
                    </tr>
                  ))
                )}
              </tbody>
              {cobros.length > 0 ? (
                <tfoot>
                  <tr className="border-t-2 border-emerald-200 bg-emerald-50/60">
                    <td colSpan={4} className="px-4 py-3 text-sm font-semibold text-emerald-900">Total ingresos del día</td>
                    <td className="px-4 py-3 text-right font-mono text-sm font-bold tabular-nums text-emerald-700">{formatArs(totalIngresos)}</td>
                  </tr>
                </tfoot>
              ) : null}
            </table>
          </div>
        </div>
      ) : null}

      {/* Modal pago (egresos) */}
      <PagoFormModal
        open={modalPagoAbierto}
        onClose={() => setModalPagoAbierto(false)}
        modo={modoModalPago}
        pago={pagoEdit}
        fecha={fecha}
        chequesDisponibles={cheques}
        proveedores={proveedores}
        onGuardado={() => {
          void cargarPagos();
          listarChequesEnCartera().then((res) => {
            if (res.ok) setCheques(res.cheques);
          });
        }}
      />

      {/* Modal cobro (ingresos) */}
      <CobroFormModal
        open={modalCobroAbierto}
        onClose={() => setModalCobroAbierto(false)}
        clientesDisponibles={clientes}
        onGuardado={() => void cargarCobros()}
      />
    </div>
  );
}
