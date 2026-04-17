"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ProveedorConSaldo,
  MovimientosProveedor,
  eliminarProveedor,
  eliminarCompra,
  eliminarPagoProveedor,
  listarProveedoresConSaldo,
  listarMovimientosProveedor,
} from "@/app/(app)/proveedores/actions";
import { formatArs } from "@/lib/format";
import { ProveedorFormModal } from "./proveedor-form-modal";
import { ConfirmModal } from "@/components/confirm-modal";
import { CompraFormModal } from "./compra-form-modal";
import { PagoProveedorFormModal } from "./pago-proveedor-form-modal";

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

// ─── Componente principal ─────────────────────────────────────────────────────

export function ProveedoresClient() {
  const [vista, setVista] = useState<"lista" | "detalle">("lista");
  const [proveedorSeleccionado, setProveedorSeleccionado] = useState<ProveedorConSaldo | null>(null);

  const [proveedores, setProveedores] = useState<ProveedorConSaldo[]>([]);
  const [cargando, setCargando] = useState(true);
  const [errorLista, setErrorLista] = useState<string | null>(null);

  const [movimientos, setMovimientos] = useState<MovimientosProveedor | null>(null);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);
  const [errorDetalle, setErrorDetalle] = useState<string | null>(null);

  const [modalProveedor, setModalProveedor] = useState<{
    open: boolean;
    modo: "crear" | "editar";
    proveedor: ProveedorConSaldo | null;
  }>({ open: false, modo: "crear", proveedor: null });

  const [modalCompra, setModalCompra] = useState(false);
  const [modalPago, setModalPago] = useState(false);
  const [confirmacion, setConfirmacion] = useState<{ mensaje: string; detalle?: string; onOk: () => Promise<void> } | null>(null);
  const [confirmCargando, setConfirmCargando] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);

  // ─── Carga de datos ───────────────────────────────────────────────────────

  const cargarProveedores = useCallback(async () => {
    setCargando(true);
    setErrorLista(null);
    const res = await listarProveedoresConSaldo();
    setCargando(false);
    if (!res.ok) { setErrorLista(res.error); return; }
    setProveedores(res.proveedores);
    if (proveedorSeleccionado) {
      const actualizado = res.proveedores.find((p) => p.id === proveedorSeleccionado.id);
      if (actualizado) setProveedorSeleccionado(actualizado);
    }
  }, [proveedorSeleccionado]);

  useEffect(() => {
    void cargarProveedores();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cargarDetalle = useCallback(async (id: string) => {
    setCargandoDetalle(true);
    setErrorDetalle(null);
    const res = await listarMovimientosProveedor(id);
    setCargandoDetalle(false);
    if (!res.ok) { setErrorDetalle(res.error); return; }
    setMovimientos(res.movimientos);
  }, []);

  function abrirDetalle(prov: ProveedorConSaldo) {
    setProveedorSeleccionado(prov);
    setVista("detalle");
    setMovimientos(null);
    void cargarDetalle(prov.id);
  }

  function volverALista() {
    setVista("lista");
    setProveedorSeleccionado(null);
    setMovimientos(null);
  }

  function handleEliminarProveedor(id: string, nombre: string) {
    setConfirmacion({
      mensaje: `¿Eliminar a "${nombre}"?`,
      detalle: "Su historial de compras se conserva.",
      onOk: async () => {
        setConfirmCargando(true);
        setConfirmError(null);
        const res = await eliminarProveedor(id);
        setConfirmCargando(false);
        if (!res.ok) { setConfirmError(res.error); return; }
        setConfirmacion(null);
        void cargarProveedores();
        if (vista === "detalle") volverALista();
      },
    });
  }

  function handleEliminarCompra(id: string) {
    setConfirmacion({
      mensaje: "¿Eliminar esta compra?",
      detalle: "Esta acción no se puede deshacer.",
      onOk: async () => {
        setConfirmCargando(true);
        setConfirmError(null);
        const res = await eliminarCompra(id);
        setConfirmCargando(false);
        if (!res.ok) { setConfirmError(res.error); return; }
        setConfirmacion(null);
        void cargarProveedores();
        if (proveedorSeleccionado) void cargarDetalle(proveedorSeleccionado.id);
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
        const res = await eliminarPagoProveedor(id);
        setConfirmCargando(false);
        if (!res.ok) { setConfirmError(res.error); return; }
        setConfirmacion(null);
        void cargarProveedores();
        if (proveedorSeleccionado) void cargarDetalle(proveedorSeleccionado.id);
      },
    });
  }

  // ─── Vista: Lista ─────────────────────────────────────────────────────────

  if (vista === "lista") {
    return (
      <div className="mx-auto w-full max-w-[88rem]">
        <header className="mb-8 overflow-hidden rounded-2xl border border-violet-200/70 bg-gradient-to-br from-violet-50 via-white to-purple-50/40 shadow-md shadow-violet-900/8 ring-1 ring-violet-100">
          <div className="relative px-6 py-5">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_100%_0%,_theme(colors.violet.200/35),_transparent)]" />
            <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-700 to-purple-800 text-white shadow-lg shadow-violet-900/30">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 -960 960 960" fill="currentColor"><path d="m127.33-80-47-47.67 113.67-113q-29.67-29.66-45.17-66.66t-15.5-76.34q0-39 14.34-74 14.33-35 41.66-61.66l52.34-51.34L275-538q2.33-34.67 16.33-66.33 14-31.67 39-56l52.34-51.34L416-679q2.33-34.67 16.83-66.33 14.5-31.67 38.84-56L583-911.67 629.67-865l-58 59 4.66 4.67q25 24.33 39 56 14 31.66 16.34 67L832-878.67l46.67 47L680-631.33q34.67 2.33 66 16.66 31.33 14.34 56.33 39.34l5.34 4.66 58-59 47 47-109.34 110.34Q778.33-447 746-432.5t-67.67 16.83l33.34 33-51.34 51.34q-25 25-56.83 39.5T537-275l33.67 33.33-52.34 52.34q-27 27.66-62.5 41.83-35.5 14.17-74.16 14.17-34.67 0-68.84-15.5-34.16-15.5-69.5-46.84L127.33-80Zm114.34-209.33q20.33-19.67 31-43.84 10.66-24.16 10.66-49.5 0-25-10.66-49.16Q262-456 241.67-477q-21 21-31.84 45.17Q199-407.67 199-382.67q0 25.34 10.83 49.5 10.84 24.17 31.84 43.84Zm141 90.33q25.33-.33 49.33-11t45-31.67q-21-20.33-45.17-31-24.16-10.66-49.16-10.66-25 0-49.17 10.83t-45.17 31.83q20.34 20.34 44.67 31Q357.33-199 382.67-199Zm0-230.67q20.33-21 31-45 10.66-24 10.66-49 0-25.33-10.66-49.66-10.67-24.34-31-44-21 19.66-31.84 44Q340-549 340-523.67q0 25 10.83 49 10.84 24 31.84 45Zm142 89.67q25.33 0 49.16-10.83 23.84-10.84 43.5-31.84-19.66-20.33-43.5-31-23.83-10.66-49.16-10.66-25.34 0-49.67 10.83-24.33 10.83-44.67 31.83 20.34 20.34 44.67 31Q499.33-340 524.67-340ZM524-570.67q20.33-20.33 30.83-44.66 10.5-24.34 10.5-49.67 0-25-10.16-49.5Q545-739 524.67-760q-21 21-31.84 45.17Q482-690.67 482-665.67q0 25.34 10.83 49.67 10.84 24.33 31.17 45.33Zm141.67 89.34q25 0 49.16-11.17Q739-503.67 760-524.67q-21.33-20.33-45.83-31-24.5-10.66-49.5-10.66-25 .33-48.67 11-23.67 10.66-44.67 31.66 21 21 45.17 31.84 24.17 10.83 49.17 10.5Z" /></svg>
                </span>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-violet-500">Proveedores</p>
                  <h1 className="text-2xl font-bold tracking-tight text-violet-950">Proveedores</h1>
                  <p className="mt-0.5 max-w-lg text-sm text-violet-700/70">Saldo de cada proveedor: lo que les compramos menos lo que les pagamos.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalProveedor({ open: true, modo: "crear", proveedor: null })}
                className="shrink-0 rounded-xl bg-gradient-to-r from-violet-700 to-purple-700 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-violet-900/25 transition hover:from-violet-600 hover:to-purple-600"
              >
                + Nuevo proveedor
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
                  <th className="hidden lg:table-cell px-4 py-3 text-right font-semibold">Total compras</th>
                  <th className="hidden lg:table-cell px-4 py-3 text-right font-semibold">Total pagado</th>
                  <th className="px-4 py-3 text-right font-semibold">Deuda</th>
                  <th className="px-4 py-3 text-right font-semibold">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {cargando ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-violet-600">
                      Cargando proveedores…
                    </td>
                  </tr>
                ) : errorLista ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-red-700">
                      {errorLista}
                    </td>
                  </tr>
                ) : proveedores.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-violet-600">
                      No hay proveedores registrados todavía.
                    </td>
                  </tr>
                ) : (
                  proveedores.map((p) => (
                    <tr
                      key={p.id}
                      className="border-b border-violet-100/90 transition hover:bg-violet-50/50"
                    >
                      <td className="px-4 py-3 font-medium text-violet-950">{p.nombre}</td>
                      <td className="hidden sm:table-cell px-4 py-3 text-violet-700">{p.telefono ?? "—"}</td>
                      <td className="hidden lg:table-cell px-4 py-3 text-right font-mono tabular-nums text-violet-950">
                        {formatArs(p.total_compras)}
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
                              setModalProveedor({ open: true, modo: "editar", proveedor: p })
                            }
                            className="hidden sm:inline-flex rounded-lg border border-violet-200 bg-white px-3 py-1.5 text-xs font-medium text-violet-800 transition hover:bg-violet-50"
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => handleEliminarProveedor(p.id, p.nombre)}
                            className="hidden sm:inline-flex rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-700 transition hover:bg-red-50"
                          >
                            Eliminar
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

        <ProveedorFormModal
          open={modalProveedor.open}
          onClose={() => setModalProveedor((p) => ({ ...p, open: false }))}
          modo={modalProveedor.modo}
          proveedor={modalProveedor.proveedor}
          onGuardado={() => void cargarProveedores()}
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

  // ─── Vista: Detalle de proveedor ──────────────────────────────────────────

  const prov = proveedorSeleccionado!;

  return (
    <div className="mx-auto w-full max-w-[88rem]">
      <button
        type="button"
        onClick={volverALista}
        className="mb-6 flex items-center gap-1.5 text-sm font-medium text-violet-700 transition hover:text-violet-900"
      >
        ← Volver a proveedores
      </button>

      {/* Tarjeta del proveedor */}
      <div className="mb-6 flex flex-col gap-4 rounded-2xl border border-violet-200/80 bg-gradient-to-br from-violet-50/90 via-white to-violet-100/40 p-5 shadow-sm sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-violet-950">{prov.nombre}</h1>
          {prov.telefono ? (
            <p className="mt-1 text-sm text-violet-700">{prov.telefono}</p>
          ) : null}
          {prov.notas ? (
            <p className="mt-1 text-sm italic text-violet-600/80">{prov.notas}</p>
          ) : null}
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={() =>
              setModalProveedor({ open: true, modo: "editar", proveedor: prov })
            }
            className="rounded-lg border border-violet-200 bg-white px-3 py-1.5 text-xs font-medium text-violet-800 transition hover:bg-violet-50"
          >
            Editar
          </button>
          <button
            type="button"
            onClick={() => handleEliminarProveedor(prov.id, prov.nombre)}
            className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-700 transition hover:bg-red-50"
          >
            Eliminar
          </button>
        </div>
      </div>

      {/* Resumen de saldo */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-violet-200/80 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wider text-violet-500">
            Total compras
          </p>
          <p className="mt-1 font-mono text-2xl font-bold tabular-nums text-violet-950">
            {formatArs(prov.total_compras)}
          </p>
        </div>
        <div className="rounded-2xl border border-violet-200/80 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wider text-violet-500">
            Total pagado
          </p>
          <p className="mt-1 font-mono text-2xl font-bold tabular-nums text-emerald-700">
            {formatArs(prov.total_pagos)}
          </p>
        </div>
        <div
          className={`rounded-2xl border p-4 shadow-sm ${
            prov.saldo > 0 ? "border-red-200/80 bg-red-50/60" : "border-green-200/80 bg-green-50/60"
          }`}
        >
          <p className="text-xs font-medium uppercase tracking-wider text-violet-500">
            Deuda pendiente
          </p>
          <p
            className={`mt-1 font-mono text-2xl font-bold tabular-nums ${
              prov.saldo > 0 ? "text-red-700" : "text-green-700"
            }`}
          >
            {formatArs(prov.saldo)}
          </p>
          <p className="mt-0.5 text-xs text-violet-500">
            {prov.saldo > 0 ? "Les debemos" : prov.saldo < 0 ? "Pagamos de más" : "Al día ✓"}
          </p>
        </div>
      </div>

      {/* Botones de acción */}
      <div className="mb-6 flex flex-wrap justify-end gap-3">
        <button
          type="button"
          onClick={() => setModalCompra(true)}
          className="rounded-xl border border-violet-300 bg-white px-5 py-2.5 text-sm font-semibold text-violet-800 shadow-sm transition hover:bg-violet-50"
        >
          + Registrar compra
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
          {/* Compras */}
          <div className="overflow-hidden rounded-2xl border border-violet-200/80 bg-white shadow-sm">
            <div className="border-b border-violet-100 bg-violet-50/80 px-4 py-3">
              <h2 className="text-sm font-semibold text-violet-950">
                Compras ({movimientos.compras.length})
              </h2>
            </div>
            {movimientos.compras.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-violet-500">
                No hay compras registradas.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-violet-100 text-xs font-medium text-violet-500">
                      <th className="px-4 py-2">Fecha</th>
                      <th className="px-4 py-2">Descripción</th>
                      <th className="px-4 py-2 text-right">Monto</th>
                      <th className="px-4 py-2 text-right"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {movimientos.compras.map((c) => (
                      <tr key={c.id} className="border-b border-violet-100/60 hover:bg-violet-50/30">
                        <td className="px-4 py-2 text-violet-700">{formatFecha(c.fecha)}</td>
                        <td className="px-4 py-2 text-violet-950">{c.descripcion}</td>
                        <td className="px-4 py-2 text-right font-mono tabular-nums font-semibold text-violet-950">
                          {formatArs(c.monto)}
                        </td>
                        <td className="px-4 py-2 text-right">
                          <button
                            type="button"
                            onClick={() => handleEliminarCompra(c.id)}
                            className="text-xs font-medium text-red-600 transition hover:text-red-800"
                          >
                            Eliminar
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
                Pagos realizados ({movimientos.pagos.length})
              </h2>
            </div>
            {movimientos.pagos.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-violet-500">
                No hay pagos registrados.
              </p>
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
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                              MOVIMIENTO_BADGE[p.movimiento] ?? "bg-gray-100 text-gray-700"
                            }`}
                          >
                            {p.movimiento.charAt(0).toUpperCase() + p.movimiento.slice(1)}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-right font-mono tabular-nums font-semibold text-emerald-700">
                          {formatArs(p.monto)}
                        </td>
                        <td className="px-4 py-2 text-right">
                          <button
                            type="button"
                            onClick={() => handleEliminarPago(p.id)}
                            className="text-xs font-medium text-red-600 transition hover:text-red-800"
                          >
                            Eliminar
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

      {/* Modales */}
      <ProveedorFormModal
        open={modalProveedor.open}
        onClose={() => setModalProveedor((p) => ({ ...p, open: false }))}
        modo={modalProveedor.modo}
        proveedor={modalProveedor.proveedor}
        onGuardado={() => {
          void cargarProveedores();
          if (proveedorSeleccionado) void cargarDetalle(proveedorSeleccionado.id);
        }}
      />
      <CompraFormModal
        open={modalCompra}
        onClose={() => setModalCompra(false)}
        proveedorId={prov.id}
        proveedorNombre={prov.nombre}
        onGuardado={() => {
          void cargarProveedores();
          void cargarDetalle(prov.id);
        }}
      />
      <PagoProveedorFormModal
        open={modalPago}
        onClose={() => setModalPago(false)}
        proveedorId={prov.id}
        proveedorNombre={prov.nombre}
        saldoActual={prov.saldo}
        onGuardado={() => {
          void cargarProveedores();
          void cargarDetalle(prov.id);
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
