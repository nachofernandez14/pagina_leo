"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  listarClientes,
  listarProductosActivos,
  listarVentasPorFecha,
  type ClienteOption,
  type ProductoOption,
  type VentaFila,
} from "@/app/(app)/ventas-diarias/actions";
import { formatArs } from "@/lib/format";
import { NuevaVentaModal } from "./nueva-venta-modal";

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
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatearFechaEtiqueta(fechaIso: string): string {
  const [y, m, d] = fechaIso.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
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

export function VentasDiariasClient() {
  const [fecha, setFecha] = useState(fechaLocalHoy);
  const [ventas, setVentas] = useState<VentaFila[]>([]);
  const [cargandoVentas, setCargandoVentas] = useState(true);
  const [errorVentas, setErrorVentas] = useState<string | null>(null);

  const [clientes, setClientes] = useState<ClienteOption[]>([]);
  const [productos, setProductos] = useState<ProductoOption[]>([]);
  const [errorCatalogo, setErrorCatalogo] = useState<string | null>(null);

  const [modalAbierto, setModalAbierto] = useState(false);
  const [filtroOrigen, setFiltroOrigen] = useState<"todos" | "puesto" | "galpon">("todos");

  const cargarVentas = useCallback(async () => {
    setCargandoVentas(true);
    setErrorVentas(null);
    const res = await listarVentasPorFecha(fecha);
    setCargandoVentas(false);
    if (!res.ok) {
      setErrorVentas(res.error);
      setVentas([]);
      return;
    }
    setVentas(res.ventas);
  }, [fecha]);

  useEffect(() => {
    void cargarVentas();
  }, [cargarVentas]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const [c, p] = await Promise.all([listarClientes(), listarProductosActivos()]);
      if (cancelled) return;
      const errs: string[] = [];
      if (!c.ok) {
        errs.push(c.error);
        setClientes([]);
      } else {
        setClientes(c.clientes);
      }
      if (!p.ok) {
        errs.push(p.error);
        setProductos([]);
      } else {
        setProductos(p.productos);
      }
      setErrorCatalogo(errs.length ? errs.join(" ") : null);
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const etiquetaDia = useMemo(() => formatearFechaEtiqueta(fecha), [fecha]);
  const esHoy = fecha === fechaLocalHoy();

  const ventasFiltradas = useMemo(
    () => filtroOrigen === "todos" ? ventas : ventas.filter((v) => v.origen === filtroOrigen),
    [ventas, filtroOrigen],
  );

  const stats = useMemo(() => {
    const porOrigen = (o: "puesto" | "galpon") => ventas.filter((v) => v.origen === o);
    const sumar = (vs: VentaFila[]) => ({
      cajas: vs.reduce((s, v) => s + v.cantidad_cajas, 0),
      total: vs.reduce((s, v) => s + v.total, 0),
    });
    return {
      puesto: sumar(porOrigen("puesto")),
      galpon: sumar(porOrigen("galpon")),
      dia: sumar(ventas),
    };
  }, [ventas]);

  return (
    <div className="mx-auto w-full max-w-[88rem]">
      <header className="mb-8 overflow-hidden rounded-2xl border border-violet-200/70 bg-gradient-to-br from-violet-50 via-white to-purple-50/40 shadow-md shadow-violet-900/8 ring-1 ring-violet-100">
        <div className="relative px-6 py-5">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_100%_0%,_theme(colors.violet.200/35),_transparent)]" />
          <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-700 to-purple-800 text-white shadow-lg shadow-violet-900/30">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 -960 960 960" fill="currentColor"><path d="M447.67-120v-84.67Q392-215.33 354.83-249q-37.16-33.67-53.83-88.33l62-25.34q16.33 48 47.5 72t77.17 24q45.66 0 75.83-22.16Q593.67-311 593.67-352T568-415.83Q542.33-438.67 465-464q-76.67-24.33-111-62.17Q319.67-564 319.67-620q0-58.33 37.66-95 37.67-36.67 90.34-41.67V-840h66.66v83.33q46.67 6 79.17 31.84Q626-699 642.33-660l-62 26.67q-13.33-32-36.33-47t-61-15q-45.33 0-71 20.5t-25.67 54.16q0 36.34 30 58.34T525-516.67q68.33 20.67 101.83 61.5 33.5 40.84 33.5 99.84 0 65.66-38.66 103.66-38.67 38-107.34 48.34V-120h-66.66Z" /></svg>
              </span>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-violet-500">Operaciones</p>
                <h1 className="text-2xl font-bold tracking-tight text-violet-950">Ventas diarias</h1>
                <p className="mt-0.5 max-w-xl text-sm text-violet-700/70">Registro de ventas por cajas de ciruela. Elegí el día para ver o cargar ventas.</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setModalAbierto(true)}
              className="shrink-0 rounded-xl bg-gradient-to-r from-violet-700 to-purple-700 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-violet-900/25 transition hover:from-violet-600 hover:to-purple-600"
            >
              + Nueva venta
            </button>
          </div>
        </div>
      </header>

      {/* Barra de controles: fecha + filtro origen */}
      <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-violet-200/80 bg-gradient-to-br from-violet-50/90 via-white to-violet-100/40 p-4 shadow-sm ring-1 ring-violet-200/50">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-sm font-medium text-violet-950" htmlFor="fecha-ventas">
              Día
            </label>
            <input
              id="fecha-ventas"
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className="rounded-lg border border-violet-200 bg-white px-3 py-2 text-sm text-violet-950 outline-none focus:ring-2 focus:ring-violet-500/40"
            />
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => setFecha(sumarDias(fecha, -1))}
                className="rounded-lg border border-violet-200 bg-white px-3 py-2 text-xs font-medium text-violet-800 transition hover:bg-violet-50"
              >
                ← Ayer
              </button>
              <button
                type="button"
                onClick={() => setFecha(fechaLocalHoy())}
                className="rounded-lg border border-violet-200 bg-white px-3 py-2 text-xs font-medium text-violet-800 transition hover:bg-violet-50"
              >
                Hoy
              </button>
            </div>
          </div>
          <p className="text-sm capitalize text-violet-800/90">
            {etiquetaDia}
            {esHoy ? (
              <span className="ml-2 rounded-full bg-violet-200/80 px-2 py-0.5 text-xs font-medium text-violet-900">
                Hoy
              </span>
            ) : null}
          </p>
        </div>

        {/* Filtro por origen */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-violet-500">Origen:</span>
          {(["todos", "galpon", "puesto"] as const).map((o) => (
            <button
              key={o}
              type="button"
              onClick={() => setFiltroOrigen(o)}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                filtroOrigen === o
                  ? o === "puesto"
                    ? "bg-amber-500 text-white"
                    : o === "galpon"
                    ? "bg-violet-700 text-white"
                    : "bg-violet-200 text-violet-900"
                  : "border border-violet-200 bg-white text-violet-700 hover:bg-violet-50"
              }`}
            >
              {o === "todos" ? "Todos" : o === "puesto" ? "Puesto" : "Galpón"}
            </button>
          ))}
        </div>
      </div>

      {/* Resumen de totales del día */}
      {!cargandoVentas && ventas.length > 0 && (
        <div className="mb-4 grid grid-cols-3 gap-3">
          {[
            {
              label: "Galpón",
              cajas: stats.galpon.cajas,
              total: stats.galpon.total,
              cls: "border-violet-200 bg-violet-50",
              badge: "bg-violet-100 text-violet-800",
            },
            {
              label: "Puesto",
              cajas: stats.puesto.cajas,
              total: stats.puesto.total,
              cls: "border-amber-200 bg-amber-50",
              badge: "bg-amber-100 text-amber-800",
            },
            {
              label: "Total del día",
              cajas: stats.dia.cajas,
              total: stats.dia.total,
              cls: "border-emerald-200 bg-emerald-50",
              badge: "bg-emerald-100 text-emerald-800",
            },
          ].map((s) => (
            <div key={s.label} className={`rounded-2xl border p-3 shadow-sm ${s.cls}`}>
              <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${s.badge}`}>
                {s.label}
              </span>
              <p className="mt-1 text-xl font-bold tabular-nums text-violet-950">
                {s.cajas} <span className="text-sm font-normal text-violet-500">cajas</span>
              </p>
              <p className="text-sm font-semibold tabular-nums text-emerald-700">{formatArs(s.total)}</p>
            </div>
          ))}
        </div>
      )}

      {errorCatalogo ? (
        <p className="mb-4 rounded-lg border border-violet-300 bg-violet-50 px-4 py-3 text-sm text-violet-900">
          {errorCatalogo}
        </p>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-violet-200/80 bg-white shadow-md shadow-violet-900/10">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-violet-200 bg-violet-50/80 text-violet-900">
                <th className="hidden sm:table-cell px-4 py-3 font-semibold">Hora</th>
                <th className="px-4 py-3 font-semibold">Producto</th>
                <th className="hidden lg:table-cell px-4 py-3 font-semibold">Embalaje</th>
                <th className="hidden sm:table-cell px-4 py-3 font-semibold">Cliente</th>
                <th className="hidden sm:table-cell px-4 py-3 font-semibold">Origen</th>
                <th className="px-4 py-3 text-right font-semibold">Cajas</th>
                <th className="hidden sm:table-cell px-4 py-3 text-right font-semibold">Precio / caja</th>
                <th className="px-4 py-3 text-right font-semibold">Total</th>
              </tr>
            </thead>
            <tbody>
              {cargandoVentas ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-violet-600">
                    Cargando ventas…
                  </td>
                </tr>
              ) : errorVentas ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-red-700">
                    {errorVentas}
                  </td>
                </tr>
              ) : ventasFiltradas.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-violet-600">
                    {ventas.length === 0
                      ? "No hay ventas registradas para este día."
                      : "No hay ventas del origen seleccionado para este día."}
                  </td>
                </tr>
              ) : (
                ventasFiltradas.map((v) => (
                  <tr
                    key={v.id}
                    className="border-b border-violet-100/90 transition hover:bg-violet-50/50"
                  >
                    <td className="hidden sm:table-cell whitespace-nowrap px-4 py-3 font-mono text-violet-800">
                      {formatearHora(v.created_at)}
                    </td>
                    <td className="px-4 py-3 text-violet-950">{v.producto_nombre}</td>
                    <td className="hidden lg:table-cell px-4 py-3">
                      {v.embalaje_nombre ? (
                        <span className="inline-flex rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-medium text-violet-800">
                          {v.embalaje_nombre}
                        </span>
                      ) : (
                        <span className="text-xs text-violet-400 italic">—</span>
                      )}
                    </td>
                    <td className="hidden sm:table-cell px-4 py-3 text-violet-800">
                      {v.cliente_nombre ?? (
                        <span className="text-violet-500 italic">Sin cliente</span>
                      )}
                    </td>
                    <td className="hidden sm:table-cell px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          v.origen === "puesto"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-violet-100 text-violet-800"
                        }`}
                      >
                        {v.origen === "puesto" ? "Puesto" : "Galpón"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-violet-950">
                      {v.cantidad_cajas}
                    </td>
                    <td className="hidden sm:table-cell px-4 py-3 text-right tabular-nums text-violet-800">
                      {formatArs(v.precio_unitario)}
                    </td>
                    <td className="px-4 py-3 text-right font-medium tabular-nums text-violet-950">
                      {formatArs(v.total)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <NuevaVentaModal
        open={modalAbierto}
        onClose={() => setModalAbierto(false)}
        fecha={fecha}
        clientes={clientes}
        productos={productos}
        onGuardado={() => void cargarVentas()}
      />
    </div>
  );
}
