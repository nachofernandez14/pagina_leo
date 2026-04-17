"use client";

import { useCallback, useEffect, useState } from "react";
import {
  PersonaCampoConSaldo,
  MovimientosPersonaCampo,
  eliminarPersonaCampo,
  eliminarCarga,
  eliminarPagoCampo,
  listarPersonasCampoConSaldo,
  listarMovimientosPersonaCampo,
} from "@/app/(app)/campo/actions";
import { listarProductosTodos } from "@/app/(app)/productos/actions";
import { formatArs } from "@/lib/format";
import { PersonaCampoFormModal } from "./trabajador-form-modal";
import { ConfirmModal } from "@/components/confirm-modal";
import { CargaFormModal } from "./carga-form-modal";
import { EditarPrecioCargaModal } from "./editar-precio-carga-modal";
import { PagoCampoFormModal } from "./pago-trabajador-form-modal";

// ─── Helpers ───────────────────────────────────────────────────────────────────

function formatFecha(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(y, m - 1, d));
}

function SaldoBadge({ saldo }: { saldo: number }) {
  if (saldo <= 0) {
    return (
      <span className="inline-flex rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-800">
        Al día
      </span>
    );
  }
  return (
    <span className="inline-flex rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-800">
      Debemos {formatArs(saldo)}
    </span>
  );
}

const MOVIMIENTO_BADGE: Record<string, string> = {
  efectivo: "bg-emerald-100 text-emerald-800",
  transferencia: "bg-blue-100 text-blue-800",
  cheque: "bg-violet-100 text-violet-800",
};

type ProductoOption = { id: string; nombre: string };

// ─── Componente principal ───────────────────────────────────────────────────

export function CampoClient() {
  const [vista, setVista] = useState<"lista" | "detalle">("lista");
  const [personaSeleccionada, setPersonaSeleccionada] =
    useState<PersonaCampoConSaldo | null>(null);

  const [personas, setPersonas] = useState<PersonaCampoConSaldo[]>([]);
  const [cargando, setCargando] = useState(true);
  const [errorLista, setErrorLista] = useState<string | null>(null);

  const [movimientos, setMovimientos] = useState<MovimientosPersonaCampo | null>(null);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);
  const [errorDetalle, setErrorDetalle] = useState<string | null>(null);

  const [productos, setProductos] = useState<ProductoOption[]>([]);

  const [modalPersona, setModalPersona] = useState<{
    open: boolean;
    modo: "crear" | "editar";
    persona: PersonaCampoConSaldo | null;
  }>({ open: false, modo: "crear", persona: null });

  const [modalCarga, setModalCarga] = useState(false);
  const [modalPago, setModalPago] = useState(false);
  const [modalEditarPrecio, setModalEditarPrecio] = useState<{
    id: string;
    cantidad: number;
    producto_nombre: string;
    fecha: string;
  } | null>(null);
  const [confirmacion, setConfirmacion] = useState<{ mensaje: string; detalle?: string; onOk: () => Promise<void> } | null>(null);
  const [confirmCargando, setConfirmCargando] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);

  // ─── Carga de datos ───────────────────────────────────────────────────

  const cargarPersonas = useCallback(async () => {
    setCargando(true);
    setErrorLista(null);
    const res = await listarPersonasCampoConSaldo();
    setCargando(false);
    if (!res.ok) { setErrorLista(res.error); return; }
    setPersonas(res.personas);
    if (personaSeleccionada) {
      const actualizada = res.personas.find((p) => p.id === personaSeleccionada.id);
      if (actualizada) setPersonaSeleccionada(actualizada);
    }
  }, [personaSeleccionada]);

  useEffect(() => {
    void cargarPersonas();
    listarProductosTodos().then((res) => {
      if (res.ok)
        setProductos(
          res.productos
            .filter((p) => p.activo)
            .map((p) => ({ id: p.id, nombre: p.nombre })),
        );
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cargarDetalle = useCallback(async (id: string) => {
    setCargandoDetalle(true);
    setErrorDetalle(null);
    const res = await listarMovimientosPersonaCampo(id);
    setCargandoDetalle(false);
    if (!res.ok) { setErrorDetalle(res.error); return; }
    setMovimientos(res.movimientos);
  }, []);

  function abrirDetalle(persona: PersonaCampoConSaldo) {
    setPersonaSeleccionada(persona);
    setVista("detalle");
    setMovimientos(null);
    void cargarDetalle(persona.id);
  }

  function volverALista() {
    setVista("lista");
    setPersonaSeleccionada(null);
    setMovimientos(null);
  }

  function handleEliminarPersona(id: string, nombre: string) {
    setConfirmacion({
      mensaje: `¿Desactivar a "${nombre}"?`,
      detalle: "Su historial de cargas y pagos se conserva.",
      onOk: async () => {
        setConfirmCargando(true);
        setConfirmError(null);
        const res = await eliminarPersonaCampo(id);
        setConfirmCargando(false);
        if (!res.ok) { setConfirmError(res.error); return; }
        setConfirmacion(null);
        void cargarPersonas();
        if (vista === "detalle") volverALista();
      },
    });
  }

  function handleEliminarCarga(id: string) {
    setConfirmacion({
      mensaje: "¿Eliminar esta carga?",
      detalle: "Esta acción no se puede deshacer.",
      onOk: async () => {
        setConfirmCargando(true);
        setConfirmError(null);
        const res = await eliminarCarga(id);
        setConfirmCargando(false);
        if (!res.ok) { setConfirmError(res.error); return; }
        setConfirmacion(null);
        void cargarPersonas();
        if (personaSeleccionada) void cargarDetalle(personaSeleccionada.id);
      },
    });
  }

  function handleEliminarPago(id: string) {
    setConfirmacion({
      mensaje: "¿Eliminar este pago?",
      detalle: "Esta acción no se puede deshacer.",
      onOk: async () => {
        setConfirmCargando(true);
        setConfirmError(null);
        const res = await eliminarPagoCampo(id);
        setConfirmCargando(false);
        if (!res.ok) { setConfirmError(res.error); return; }
        setConfirmacion(null);
        void cargarPersonas();
        if (personaSeleccionada) void cargarDetalle(personaSeleccionada.id);
      },
    });
  }

  // ─── Vista: Lista ────────────────────────────────────────────────────

  if (vista === "lista") {
    return (
      <div className="mx-auto w-full max-w-[88rem]">
        <header className="mb-8 overflow-hidden rounded-2xl border border-violet-200/70 bg-gradient-to-br from-violet-50 via-white to-purple-50/40 shadow-md shadow-violet-900/8 ring-1 ring-violet-100">
          <div className="relative px-6 py-5">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_100%_0%,_theme(colors.violet.200/35),_transparent)]" />
            <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-700 to-purple-800 text-white shadow-lg shadow-violet-900/30">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 -960 960 960" fill="currentColor"><path d="M150-599.33q-13.32 0-22.33-9.84-9-9.83-9-23.5 0-13.66 9-23.5Q136.68-666 150-666h139.33q27.78 0 47.56 19.5T360-599.33H150Zm83.25 372.66q52.75 0 89.75-36.92t37-89.66Q360-406 323.08-443t-89.67-37q-52.74 0-89.74 36.92-37 36.92-37 89.67 0 52.74 36.92 89.74 36.92 37 89.66 37Zm599.58-20.38q20.5-20.38 20.5-49.5t-20.38-49.62q-20.38-20.5-49.5-20.5t-49.62 20.39q-20.5 20.38-20.5 49.5 0 29.11 20.39 49.61 20.38 20.5 49.5 20.5 29.11 0 49.61-20.38Zm-599.42-39.62q-27.74 0-47.24-19.42-19.5-19.42-19.5-47.16 0-27.75 19.42-47.25t47.16-19.5q27.75 0 47.25 19.42t19.5 47.17q0 27.74-19.42 47.24-19.42 19.5-47.17 19.5Zm573.26-145q21.33 5 35.33 11.84 14 6.83 31.33 21.16v-254q0-28.33-19.16-47.5-19.17-19.16-47.5-19.16H541.33l-46.66-47.34 60-60L533.33-848 392-706.67l22 22L473.33-744 520-698.24V-598q0 38.78-26.83 66.39Q466.33-504 427.33-504h-73q19 15 30 29.67 11 14.66 23.67 37h19.33q65.34 0 112.34-47.67t47-113v-54.67h220v221ZM649-320q6-23.67 13.17-37.5 7.16-13.83 21.16-29.83H424q2.67 19.66 2.67 33.66 0 14-2.67 33.67h225Zm134.67 160q-57 0-97-39.44t-40-95.23q0-57.44 40.61-98.05t98.05-40.61q55.79 0 95.23 40.02Q920-353.29 920-296.67q0 57.34-39.67 97Q840.67-160 783.67-160ZM232-160q-80.33 0-136.17-56.55Q40-273.1 40-353.33q0-80.24 56.5-136.79t136.76-56.55q80.27 0 136.84 56.57 56.57 56.57 56.57 136.84 0 80.26-56.5 136.76Q313.67-160 232-160Zm393.67-360Z" /></svg>
                </span>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-violet-500">Campo</p>
                  <h1 className="text-2xl font-bold tracking-tight text-violet-950">Campo</h1>
                  <p className="mt-0.5 max-w-lg text-sm text-violet-700/70">
                    Arrendatarios de la finca: cargas vendidas y porcentaje pendiente de pago.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalPersona({ open: true, modo: "crear", persona: null })}
                className="shrink-0 rounded-xl bg-gradient-to-r from-violet-700 to-purple-700 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-violet-900/25 transition hover:from-violet-600 hover:to-purple-600"
              >
                + Nueva persona
              </button>
            </div>
          </div>
        </header>

        <div className="overflow-hidden rounded-2xl border border-violet-200/80 bg-white shadow-md shadow-violet-900/10">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-violet-200 bg-violet-50/80 text-violet-900">
                  <th className="px-4 py-3 font-semibold">Nombre</th>
                  <th className="hidden sm:table-cell px-4 py-3 font-semibold">Teléfono</th>
                  <th className="hidden lg:table-cell px-4 py-3 text-right font-semibold">Total carga</th>
                  <th className="hidden lg:table-cell px-4 py-3 text-right font-semibold">Total pagado</th>
                  <th className="px-4 py-3 text-right font-semibold">Deuda</th>
                  <th className="px-4 py-3 text-right font-semibold">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {cargando ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-violet-600">
                      Cargando…
                    </td>
                  </tr>
                ) : errorLista ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-red-700">
                      {errorLista}
                    </td>
                  </tr>
                ) : personas.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-violet-600">
                      No hay personas de campo registradas todavía.
                    </td>
                  </tr>
                ) : (
                  personas.map((p) => (
                    <tr key={p.id} className="border-b border-violet-100/90 transition hover:bg-violet-50/50">
                      <td className="px-4 py-3 font-medium text-violet-950">{p.nombre}</td>
                      <td className="hidden sm:table-cell px-4 py-3 text-violet-700">{p.telefono ?? "—"}</td>
                      <td className="hidden lg:table-cell px-4 py-3 text-right font-mono tabular-nums text-violet-950">
                        {formatArs(p.total_cargas)}
                      </td>
                      <td className="hidden lg:table-cell px-4 py-3 text-right font-mono tabular-nums text-violet-950">
                        {formatArs(p.total_pagos)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <SaldoBadge saldo={p.saldo} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => abrirDetalle(p)}
                            className="rounded-lg bg-violet-100 px-3 py-1.5 text-xs font-medium text-violet-800 transition hover:bg-violet-200"
                          >
                            Ver
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setModalPersona({ open: true, modo: "editar", persona: p })
                            }
                            className="hidden sm:inline-flex rounded-lg border border-violet-200 bg-white px-3 py-1.5 text-xs font-medium text-violet-800 transition hover:bg-violet-50"
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => handleEliminarPersona(p.id, p.nombre)}
                            className="hidden sm:inline-flex rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-700 transition hover:bg-red-50"
                          >
                            Desactivar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <PersonaCampoFormModal
          open={modalPersona.open}
          onClose={() => setModalPersona((prev) => ({ ...prev, open: false }))}
          modo={modalPersona.modo}
          persona={modalPersona.persona}
          onGuardado={() => void cargarPersonas()}
        />
        <ConfirmModal
          open={confirmacion !== null}
          mensaje={confirmacion?.mensaje ?? ""}
          detalle={confirmacion?.detalle}
          cargando={confirmCargando}
          error={confirmError}
          onConfirmar={() => { void confirmacion?.onOk(); }}
          onCancelar={() => { setConfirmacion(null); setConfirmError(null); setConfirmCargando(false); }}
        />
      </div>
    );
  }

  // ─── Vista: Detalle ─────────────────────────────────────────────────

  const persona = personaSeleccionada!;

  return (
    <div className="mx-auto w-full max-w-[88rem]">
      <button
        type="button"
        onClick={volverALista}
        className="mb-6 flex items-center gap-1.5 text-sm font-medium text-violet-700 transition hover:text-violet-900"
      >
        ← Volver a campo
      </button>

      {/* Tarjeta de la persona */}
      <div className="mb-6 flex flex-col gap-4 rounded-2xl border border-violet-200/80 bg-gradient-to-br from-violet-50/90 via-white to-violet-100/40 p-5 shadow-sm sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-violet-950">{persona.nombre}</h1>
          {persona.telefono && <p className="mt-1 text-sm text-violet-700">{persona.telefono}</p>}
          {persona.notas && <p className="mt-1 text-sm italic text-violet-600/80">{persona.notas}</p>}
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={() => setModalPersona({ open: true, modo: "editar", persona })}
            className="rounded-lg border border-violet-200 bg-white px-3 py-1.5 text-xs font-medium text-violet-800 transition hover:bg-violet-50"
          >
            Editar
          </button>
          <button
            type="button"
            onClick={() => handleEliminarPersona(persona.id, persona.nombre)}
            className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-700 transition hover:bg-red-50"
          >
            Desactivar
          </button>
        </div>
      </div>

      {/* Resumen de saldo */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-violet-200/80 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wider text-violet-500">Total cargas</p>
          <p className="mt-1 font-mono text-2xl font-bold tabular-nums text-violet-950">
            {formatArs(persona.total_cargas)}
          </p>
        </div>
        <div className="rounded-2xl border border-violet-200/80 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wider text-violet-500">Total pagado</p>
          <p className="mt-1 font-mono text-2xl font-bold tabular-nums text-emerald-700">
            {formatArs(persona.total_pagos)}
          </p>
        </div>
        <div className={`rounded-2xl border p-4 shadow-sm ${persona.saldo > 0 ? "border-red-200/80 bg-red-50/60" : "border-green-200/80 bg-green-50/60"}`}>
          <p className="text-xs font-medium uppercase tracking-wider text-violet-500">Deuda pendiente</p>
          <p className={`mt-1 font-mono text-2xl font-bold tabular-nums ${persona.saldo > 0 ? "text-red-700" : "text-green-700"}`}>
            {formatArs(persona.saldo)}
          </p>
          <p className="mt-0.5 text-xs text-violet-500">
            {persona.saldo > 0 ? "Les debemos" : persona.saldo < 0 ? "Pagamos de más" : "Al día ✓"}
          </p>
        </div>
      </div>

      {/* Botones de acción */}
      <div className="mb-6 flex flex-wrap justify-end gap-3">
        <button
          type="button"
          onClick={() => setModalCarga(true)}
          className="rounded-xl border border-violet-300 bg-white px-5 py-2.5 text-sm font-semibold text-violet-800 shadow-sm transition hover:bg-violet-50"
        >
          + Registrar carga
        </button>
        <button
          type="button"
          onClick={() => setModalPago(true)}
          className="rounded-xl bg-gradient-to-r from-violet-700 to-purple-700 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-violet-900/25 transition hover:from-violet-600 hover:to-purple-600"
        >
          + Registrar pago
        </button>
      </div>

      {cargandoDetalle ? (
        <p className="py-10 text-center text-violet-600">Cargando historial…</p>
      ) : errorDetalle ? (
        <p className="py-10 text-center text-red-700">{errorDetalle}</p>
      ) : movimientos ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Cargas */}
          <div className="overflow-hidden rounded-2xl border border-violet-200/80 bg-white shadow-sm">
            <div className="border-b border-violet-100 bg-violet-50/80 px-4 py-3">
              <h2 className="text-sm font-semibold text-violet-950">
                Cargas ({movimientos.cargas.length})
              </h2>
            </div>
            {movimientos.cargas.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-violet-500">No hay cargas registradas.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-violet-100 text-xs font-medium text-violet-500">
                      <th className="px-4 py-2">Fecha</th>
                      <th className="px-4 py-2">Producto</th>
                      <th className="px-4 py-2 text-right">Cant.</th>
                      <th className="px-4 py-2 text-right">Precio/caja</th>
                      <th className="px-4 py-2 text-right">Monto</th>
                      <th className="px-4 py-2 text-right"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {movimientos.cargas.map((c) => (
                      <tr key={c.id} className="border-b border-violet-100/60 hover:bg-violet-50/30">
                        <td className="px-4 py-2 text-violet-700">{formatFecha(c.fecha)}</td>
                        <td className="px-4 py-2 text-violet-950">{c.producto_nombre}</td>
                        <td className="px-4 py-2 text-right tabular-nums text-violet-950">{c.cantidad}</td>
                        <td className="px-4 py-2 text-right font-mono tabular-nums text-violet-800">
                          {c.precio_caja != null
                            ? formatArs(c.precio_caja)
                            : <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">Pendiente</span>}
                        </td>
                        <td className="px-4 py-2 text-right font-mono tabular-nums font-semibold text-violet-950">
                          {c.precio_caja != null ? formatArs(c.monto) : <span className="text-xs italic text-violet-400">—</span>}
                        </td>
                        <td className="px-4 py-2 text-right">
                          {c.precio_caja == null && (
                            <button
                              type="button"
                              onClick={() => setModalEditarPrecio({ id: c.id, cantidad: c.cantidad, producto_nombre: c.producto_nombre, fecha: c.fecha })}
                              className="mr-1 rounded px-2 py-1 text-xs font-medium text-amber-700 hover:bg-amber-50"
                            >
                              Precio
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleEliminarCarga(c.id)}
                            className="rounded px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                          >
                            ✕
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Pagos */}
          <div className="overflow-hidden rounded-2xl border border-violet-200/80 bg-white shadow-sm">
            <div className="border-b border-violet-100 bg-violet-50/80 px-4 py-3">
              <h2 className="text-sm font-semibold text-violet-950">
                Pagos ({movimientos.pagos.length})
              </h2>
            </div>
            {movimientos.pagos.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-violet-500">No hay pagos registrados.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-violet-100 text-xs font-medium text-violet-500">
                      <th className="px-4 py-2">Fecha</th>
                      <th className="px-4 py-2">Forma</th>
                      <th className="px-4 py-2 text-right">Monto</th>
                      <th className="px-4 py-2 text-right"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {movimientos.pagos.map((p) => (
                      <tr key={p.id} className="border-b border-violet-100/60 hover:bg-violet-50/30">
                        <td className="px-4 py-2 text-violet-700">{formatFecha(p.fecha)}</td>
                        <td className="px-4 py-2">
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${MOVIMIENTO_BADGE[p.movimiento] ?? "bg-gray-100 text-gray-800"}`}>
                            {p.movimiento}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-right font-mono tabular-nums font-semibold text-emerald-700">
                          {formatArs(p.monto)}
                        </td>
                        <td className="px-4 py-2 text-right">
                          <button
                            type="button"
                            onClick={() => handleEliminarPago(p.id)}
                            className="rounded px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                          >
                            ✕
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : null}

      <PersonaCampoFormModal
        open={modalPersona.open}
        onClose={() => setModalPersona((prev) => ({ ...prev, open: false }))}
        modo={modalPersona.modo}
        persona={modalPersona.persona}
        onGuardado={() => { void cargarPersonas(); }}
      />
      <EditarPrecioCargaModal
        open={modalEditarPrecio !== null}
        onClose={() => setModalEditarPrecio(null)}
        carga={modalEditarPrecio}
        onGuardado={() => {
          void cargarPersonas();
          void cargarDetalle(persona.id);
        }}
      />
      <CargaFormModal
        open={modalCarga}
        onClose={() => setModalCarga(false)}
        personaCampoId={persona.id}
        personaNombre={persona.nombre}
        productos={productos}
        onGuardado={() => {
          void cargarPersonas();
          void cargarDetalle(persona.id);
        }}
      />
      <PagoCampoFormModal
        open={modalPago}
        onClose={() => setModalPago(false)}
        personaCampoId={persona.id}
        personaNombre={persona.nombre}
        saldoActual={persona.saldo}
        onGuardado={() => {
          void cargarPersonas();
          void cargarDetalle(persona.id);
        }}
      />
      <ConfirmModal
        open={confirmacion !== null}
        mensaje={confirmacion?.mensaje ?? ""}
        detalle={confirmacion?.detalle}
        cargando={confirmCargando}
        error={confirmError}
        onConfirmar={() => { void confirmacion?.onOk(); }}
        onCancelar={() => { setConfirmacion(null); setConfirmError(null); setConfirmCargando(false); }}
      />
    </div>
  );
}
