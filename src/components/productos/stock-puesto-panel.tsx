"use client";

import { useCallback, useEffect, useId, useMemo, useState } from "react";
import {
  listarMovimientosPuesto,
  listarResumenStockPuesto,
  agregarMovimientoPuesto,
  eliminarMovimientoPuesto,
  type MovimientoPuesto,
  type ResumenProductoPuesto,
} from "@/app/(app)/productos/stock-puesto-actions";
import { listarProductosTodos } from "@/app/(app)/productos/actions";
import { ConfirmModal } from "@/components/confirm-modal";
import { AppSelect } from "@/components/ui/app-select";

type ProductoOption = { id: string; nombre: string };

function fechaHoy(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
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
  }).format(dt);
}

function formatFecha(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(y, m - 1, d));
}

const TIPO_CONFIG: Record<string, { label: string; badge: string; rowCls: string }> = {
  ingreso: {
    label: "Ingreso",
    badge: "bg-emerald-100 text-emerald-800",
    rowCls: "",
  },
  egreso: {
    label: "Egreso (venta)",
    badge: "bg-blue-100 text-blue-800",
    rowCls: "",
  },
  perdida: {
    label: "Pérdida",
    badge: "bg-red-100 text-red-800",
    rowCls: "bg-red-50/30",
  },
};

function TipoBadge({ tipo }: { tipo: string }) {
  const cfg = TIPO_CONFIG[tipo] ?? { label: tipo, badge: "bg-gray-100 text-gray-800", rowCls: "" };
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${cfg.badge}`}>
      {cfg.label}
    </span>
  );
}

// ─── Modal de registro ────────────────────────────────────────────────────────

function NuevoMovimientoModal({
  open,
  onClose,
  productos,
  tipoInicial,
  onGuardado,
}: {
  open: boolean;
  onClose: () => void;
  productos: ProductoOption[];
  tipoInicial: "ingreso" | "perdida";
  onGuardado: () => void;
}) {
  const titleId = useId();
  const [tipo, setTipo] = useState<"ingreso" | "perdida">(tipoInicial);
  const [fecha, setFecha] = useState(fechaHoy);
  const [productoId, setProductoId] = useState("");
  const [cantidad, setCantidad] = useState("1");
  const [notas, setNotas] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setTipo(tipoInicial);
    setFecha(fechaHoy());
    setProductoId(productos[0]?.id ?? "");
    setCantidad("1");
    setNotas("");
    setError(null);
  }, [open, tipoInicial, productos]);

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
    const res = await agregarMovimientoPuesto({
      fecha,
      producto_id: productoId,
      tipo,
      cantidad: parseInt(cantidad, 10) || 0,
      notas: notas.trim() || null,
    });
    setLoading(false);
    if (!res.ok) { setError(res.error); return; }
    onGuardado();
    onClose();
  }

  const inputCls =
    "mt-1 w-full rounded-lg border border-violet-200 bg-white px-3 py-2 text-sm text-violet-950 outline-none focus:ring-2 focus:ring-violet-500/40";
  const labelCls = "text-sm font-medium text-violet-950";
  const esPerdida = tipo === "perdida";

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
          Registrar movimiento
        </h2>
        <p className="mt-1 text-sm text-violet-700/80">Stock del puesto de venta.</p>

        <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-4">
          {/* Tipo */}
          <div>
            <p className={labelCls}>Tipo de movimiento</p>
            <div className="mt-1 flex gap-2">
              {(["ingreso", "perdida"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTipo(t)}
                  className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition ${
                    tipo === t
                      ? t === "perdida"
                        ? "border-red-500 bg-red-500 text-white"
                        : "border-emerald-600 bg-emerald-600 text-white"
                      : "border-violet-200 bg-white text-violet-800 hover:bg-violet-50"
                  }`}
                >
                  {t === "ingreso" ? "Ingreso" : "Pérdida"}
                </button>
              ))}
            </div>
            {esPerdida && (
              <p className="mt-1.5 rounded-lg bg-red-50 px-3 py-1.5 text-xs text-red-700">
                ⚠ Esto se registrará como una pérdida para la empresa.
              </p>
            )}
          </div>

          {/* Fecha */}
          <div>
            <label className={labelCls} htmlFor="sp-fecha">Fecha</label>
            <input
              id="sp-fecha"
              type="date"
              required
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className={inputCls}
            />
          </div>

          {/* Producto */}
          <div>
            <label className={labelCls} htmlFor="sp-producto">Producto</label>
            <AppSelect
              id="sp-producto"
              required
              value={productoId}
              onChange={setProductoId}
              options={
                productos.length === 0
                  ? [{ value: "", label: "— Sin productos activos —" }]
                  : productos.map((p) => ({ value: p.id, label: p.nombre }))
              }
              placeholder="— Sin productos activos —"
              className={inputCls}
            />
          </div>

          {/* Cantidad */}
          <div>
            <label className={labelCls} htmlFor="sp-cantidad">
              {esPerdida ? "Cajas perdidas" : "Cajas ingresadas"}
            </label>
            <input
              id="sp-cantidad"
              type="number"
              min={1}
              step={1}
              required
              value={cantidad}
              onChange={(e) => setCantidad(e.target.value)}
              className={inputCls}
            />
          </div>

          {/* Notas */}
          <div>
            <label className={labelCls} htmlFor="sp-notas">
              {esPerdida ? "Motivo de la pérdida" : "Notas"}
            </label>
            <textarea
              id="sp-notas"
              rows={2}
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder={esPerdida ? "Ej: se pudrieron en el depósito" : "Opcional"}
              className={inputCls}
            />
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
          )}

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
              className={`rounded-lg px-4 py-2 text-sm font-semibold text-white transition disabled:opacity-60 ${
                esPerdida
                  ? "bg-red-600 hover:bg-red-500"
                  : "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500"
              }`}
            >
              {loading ? "Guardando…" : "Registrar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Panel principal ──────────────────────────────────────────────────────────

export function StockPuestoPanel({ onVolver }: { onVolver: () => void }) {
  const [resumen, setResumen] = useState<ResumenProductoPuesto[]>([]);
  const [movimientos, setMovimientos] = useState<MovimientoPuesto[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtroProducto, setFiltroProducto] = useState("todos");
  const [filtroTipo, setFiltroTipo] = useState("todos");
  const [productos, setProductos] = useState<ProductoOption[]>([]);
  const [modal, setModal] = useState<{ open: boolean; tipo: "ingreso" | "perdida" }>({
    open: false,
    tipo: "ingreso",
  });
  const [fechaDiaria, setFechaDiaria] = useState(fechaHoy);
  const [confirmacion, setConfirmacion] = useState<{ mensaje: string; onOk: () => void } | null>(null);
  const [confirmCargando, setConfirmCargando] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    const [resRes, movRes, prodRes] = await Promise.all([
      listarResumenStockPuesto(fechaDiaria),
      listarMovimientosPuesto(undefined, fechaDiaria),
      listarProductosTodos(),
    ]);
    setCargando(false);
    if (!resRes.ok) { setError(resRes.error); return; }
    if (!movRes.ok) { setError(movRes.error); return; }
    setResumen(resRes.resumen);
    setMovimientos(movRes.movimientos);
    if (prodRes.ok) {
      setProductos(
        prodRes.productos
          .filter((p) => p.activo)
          .map((p) => ({ id: p.id, nombre: p.nombre })),
      );
    }
  }, [fechaDiaria]);

  useEffect(() => { void cargar(); }, [cargar]);

  const movFiltrados = movimientos.filter((m) => {
    if (filtroProducto !== "todos" && m.producto_id !== filtroProducto) return false;
    if (filtroTipo !== "todos" && m.tipo !== filtroTipo) return false;
    return true;
  });

  const esHoy = fechaDiaria === fechaHoy();
  const etiquetaDia = useMemo(() => formatearFechaEtiqueta(fechaDiaria), [fechaDiaria]);

  const totalIngresado = resumen.reduce((s, r) => s + r.ingresado, 0);
  const totalEgresado = resumen.reduce((s, r) => s + r.egresado, 0);
  const totalPerdida = resumen.reduce((s, r) => s + r.perdida, 0);
  const totalDisponible = resumen.reduce((s, r) => s + r.disponible, 0);

  return (
    <div className="mx-auto w-full max-w-[88rem]">
      {/* Header */}
      <header className="mb-8 overflow-hidden rounded-2xl border border-emerald-200/70 bg-gradient-to-br from-emerald-50 via-white to-teal-50/40 shadow-md shadow-emerald-900/8 ring-1 ring-emerald-100">
        <div className="relative px-6 py-5">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_100%_0%,_theme(colors.emerald.200/35),_transparent)]" />
          <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white shadow-lg shadow-emerald-900/30">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 -960 960 960" fill="currentColor"><path d="M186.67-80q-27.5 0-47.09-19.58Q120-119.17 120-146.67V-619q-17.33-7.67-28.67-23.76Q80-658.85 80-680v-133.33q0-27.5 19.58-47.09Q119.17-880 146.67-880h666.66q27.5 0 47.09 19.58Q880-840.83 880-813.33V-680q0 21.15-11.33 37.24Q857.33-626.67 840-619v472.33q0 27.5-19.58 47.09Q800.83-80 773.33-80H186.67Zm0-533.33v466.66h586.66v-466.66H186.67Zm-40-66.67h666.66v-133.33H146.67V-680ZM360-413.33h240V-480H360v66.67ZM480-380Z" /></svg>
              </span>
              <div>
                <button
                  type="button"
                  onClick={onVolver}
                  className="mb-0.5 flex items-center gap-1 text-xs font-medium text-emerald-600 hover:text-emerald-800 transition"
                >
                  ← Volver a productos
                </button>
                <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-emerald-500">Puesto de venta</p>
                <h1 className="text-2xl font-bold tracking-tight text-emerald-950">Stock del puesto</h1>
                <p className="mt-0.5 max-w-xl text-sm text-emerald-700/70">
                  Ingresos, egresos por ventas y pérdidas del puesto de venta.
                </p>
              </div>
            </div>
            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                onClick={() => setModal({ open: true, tipo: "ingreso" })}
                className="rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-emerald-900/25 transition hover:from-emerald-500 hover:to-teal-500"
              >
                + Ingreso
              </button>
              <button
                type="button"
                onClick={() => setModal({ open: true, tipo: "perdida" })}
                className="rounded-xl border border-red-200 bg-white px-5 py-2.5 text-sm font-semibold text-red-700 shadow-sm transition hover:bg-red-50"
              >
                Registrar pérdida
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Selector de día para estadísticas */}
      <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50/80 via-white to-teal-50/40 p-4 shadow-sm ring-1 ring-emerald-200/50">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-sm font-medium text-emerald-950" htmlFor="fecha-stock-diaria">
              Estadísticas del día
            </label>
            <input
              id="fecha-stock-diaria"
              type="date"
              value={fechaDiaria}
              onChange={(e) => setFechaDiaria(e.target.value)}
              className="rounded-lg border border-emerald-200 bg-white px-3 py-2 text-sm text-emerald-950 outline-none focus:ring-2 focus:ring-emerald-500/40"
            />
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => setFechaDiaria(sumarDias(fechaDiaria, -1))}
                className="rounded-lg border border-emerald-200 bg-white px-3 py-2 text-xs font-medium text-emerald-800 transition hover:bg-emerald-50"
              >
                ← Ayer
              </button>
              <button
                type="button"
                onClick={() => setFechaDiaria(fechaHoy())}
                className="rounded-lg border border-emerald-200 bg-white px-3 py-2 text-xs font-medium text-emerald-800 transition hover:bg-emerald-50"
              >
                Hoy
              </button>
            </div>
          </div>
          <p className="text-sm capitalize text-emerald-800/90">
            {etiquetaDia}
            {esHoy ? (
              <span className="ml-2 rounded-full bg-emerald-200/80 px-2 py-0.5 text-xs font-medium text-emerald-900">
                Hoy
              </span>
            ) : null}
          </p>
        </div>
        <p className="text-[11px] text-emerald-600/80">
          Ingresado, vendido y pérdidas son del día seleccionado. El disponible es el acumulado total.
        </p>
      </div>

      {/* Cards de resumen */}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-600">Ingresado</p>
          <p className="mt-1 text-3xl font-bold tabular-nums text-emerald-700">{totalIngresado}</p>
          <p className="mt-0.5 text-xs text-emerald-500">cajas · del día</p>
        </div>
        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 shadow-sm">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-blue-600">Vendido</p>
          <p className="mt-1 text-3xl font-bold tabular-nums text-blue-700">{totalEgresado}</p>
          <p className="mt-0.5 text-xs text-blue-500">cajas · del día</p>
        </div>
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 shadow-sm">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-red-600">Pérdidas</p>
          <p className="mt-1 text-3xl font-bold tabular-nums text-red-700">{totalPerdida}</p>
          <p className="mt-0.5 text-xs text-red-500">cajas · del día</p>
        </div>
        <div className="rounded-2xl border border-violet-200 bg-white p-4 shadow-sm">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-violet-500">Disponible</p>
          <p className={`mt-1 text-3xl font-bold tabular-nums ${totalDisponible < 0 ? "text-red-700" : "text-violet-950"}`}>
            {totalDisponible}
          </p>
          <p className="mt-0.5 text-xs text-violet-400">cajas · acumulado</p>
        </div>
      </div>

      {/* Resumen por producto */}
      {!cargando && resumen.length > 0 && (
        <div className="mb-6 overflow-hidden rounded-2xl border border-violet-200/80 bg-white shadow-sm">
          <div className="border-b border-violet-100 bg-violet-50/80 px-4 py-3">
            <h2 className="text-sm font-semibold text-violet-950">Resumen por producto</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-violet-100 text-violet-700 text-xs">
                  <th className="px-4 py-2.5 font-semibold">Producto</th>
                  <th className="px-4 py-2.5 text-right font-semibold text-emerald-700">
                    Ingresado <span className="font-normal text-emerald-500/80">(día)</span>
                  </th>
                  <th className="px-4 py-2.5 text-right font-semibold text-blue-700">
                    Vendido <span className="font-normal text-blue-500/80">(día)</span>
                  </th>
                  <th className="px-4 py-2.5 text-right font-semibold text-red-700">
                    Pérdidas <span className="font-normal text-red-500/80">(día)</span>
                  </th>
                  <th className="px-4 py-2.5 text-right font-semibold">
                    Disponible <span className="font-normal text-violet-400">(total)</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {resumen.map((r) => (
                  <tr key={r.producto_id} className="border-b border-violet-50 hover:bg-violet-50/40">
                    <td className="px-4 py-2.5 font-medium text-violet-950">{r.producto_nombre}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-emerald-700 font-semibold">{r.ingresado}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-blue-700 font-semibold">{r.egresado}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-red-700 font-semibold">{r.perdida}</td>
                    <td className={`px-4 py-2.5 text-right tabular-nums font-bold ${r.disponible < 0 ? "text-red-700" : "text-violet-950"}`}>
                      {r.disponible}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tabla de movimientos */}
      <div className="overflow-hidden rounded-2xl border border-violet-200/80 bg-white shadow-md shadow-violet-900/10">
        <div className="flex flex-col gap-3 border-b border-violet-100 bg-violet-50/80 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-sm font-semibold text-violet-950">Historial de movimientos</h2>
          <div className="flex flex-wrap gap-2">
            <AppSelect
              value={filtroProducto}
              onChange={setFiltroProducto}
              options={[
                { value: "todos", label: "Todos los productos" },
                ...productos.map((p) => ({ value: p.id, label: p.nombre })),
              ]}
              containerClassName="relative"
              className="rounded-lg border border-violet-200 bg-white px-2.5 py-1.5 text-xs text-violet-800 outline-none focus:ring-2 focus:ring-violet-400/40"
            />
            <AppSelect
              value={filtroTipo}
              onChange={setFiltroTipo}
              options={[
                { value: "todos", label: "Todos los tipos" },
                { value: "ingreso", label: "Ingresos" },
                { value: "egreso", label: "Egresos (ventas)" },
                { value: "perdida", label: "Pérdidas" },
              ]}
              containerClassName="relative"
              className="rounded-lg border border-violet-200 bg-white px-2.5 py-1.5 text-xs text-violet-800 outline-none focus:ring-2 focus:ring-violet-400/40"
            />
          </div>
        </div>

        {cargando ? (
          <p className="px-4 py-10 text-center text-violet-600">Cargando movimientos…</p>
        ) : error ? (
          <p className="px-4 py-10 text-center text-red-700">{error}</p>
        ) : movFiltrados.length === 0 ? (
          <p className="px-4 py-10 text-center text-violet-500">
            {movimientos.length === 0
              ? "No hay movimientos registrados aún. Registrá el primer ingreso."
              : "No hay movimientos que coincidan con los filtros."}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-violet-100 text-violet-700 text-xs">
                  <th className="px-4 py-2.5 font-semibold">Fecha</th>
                  <th className="px-4 py-2.5 font-semibold">Producto</th>
                  <th className="px-4 py-2.5 font-semibold">Tipo</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Cajas</th>
                  <th className="hidden sm:table-cell px-4 py-2.5 font-semibold">Notas</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {movFiltrados.map((m) => (
                  <tr
                    key={m.tipo + m.id}
                    className={`border-b border-violet-50 transition hover:bg-violet-50/40 ${TIPO_CONFIG[m.tipo]?.rowCls ?? ""}`}
                  >
                    <td className="whitespace-nowrap px-4 py-2.5 text-violet-800">{formatFecha(m.fecha)}</td>
                    <td className="px-4 py-2.5 font-medium text-violet-950">{m.producto_nombre}</td>
                    <td className="px-4 py-2.5"><TipoBadge tipo={m.tipo} /></td>
                    <td className="px-4 py-2.5 text-right tabular-nums font-semibold text-violet-950">{m.cantidad}</td>
                    <td className="hidden sm:table-cell px-4 py-2.5 text-xs text-violet-600/80">
                      {m.notas ? m.notas : <span className="italic text-violet-400">—</span>}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      {m.tipo !== "egreso" ? (
                        <button
                          type="button"
                          onClick={() =>
                            setConfirmacion({
                              mensaje: "¿Eliminar este movimiento?",
                              onOk: async () => {
                                setConfirmCargando(true);
                                setConfirmError(null);
                                const res = await eliminarMovimientoPuesto(m.id);
                                setConfirmCargando(false);
                                if (!res.ok) {
                                  setConfirmError(res.error);
                                  return;
                                }
                                setConfirmacion(null);
                                void cargar();
                              },
                            })
                          }
                          className="rounded-lg border border-red-200 bg-white px-2.5 py-1 text-xs font-medium text-red-700 transition hover:bg-red-50"
                        >
                          Eliminar
                        </button>
                      ) : (
                        <span className="text-xs italic text-violet-400">Venta</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <NuevoMovimientoModal
        open={modal.open}
        onClose={() => setModal((s) => ({ ...s, open: false }))}
        productos={productos}
        tipoInicial={modal.tipo}
        onGuardado={() => void cargar()}
      />
      <ConfirmModal
        open={confirmacion !== null}
        mensaje={confirmacion?.mensaje ?? ""}
        cargando={confirmCargando}
        error={confirmError}
        onConfirmar={() => { void confirmacion?.onOk(); }}
        onCancelar={() => {
          setConfirmacion(null);
          setConfirmError(null);
          setConfirmCargando(false);
        }}
      />
    </div>
  );
}
