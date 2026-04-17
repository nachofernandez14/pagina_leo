"use client";

import { useCallback, useEffect, useState } from "react";
import {
  listarEmbalajes,
  listarProductosTodos,
  setProductoActivo,
  type EmbalajeOption,
  type ProductoFila,
} from "@/app/(app)/productos/actions";
import { formatArs } from "@/lib/format";
import { ProductoFormModal } from "./producto-form-modal";
import { StockPuestoPanel } from "./stock-puesto-panel";

function formatearFechaCorta(iso: string): string {
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(iso));
}

export function ProductosClient() {
  const [vista, setVista] = useState<"productos" | "stock">("productos");
  const [productos, setProductos] = useState<ProductoFila[]>([]);
  const [embalajes, setEmbalajes] = useState<EmbalajeOption[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modalAbierto, setModalAbierto] = useState(false);
  const [modoModal, setModoModal] = useState<"crear" | "editar">("crear");
  const [productoEdit, setProductoEdit] = useState<ProductoFila | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    const [resProductos, resEmbalajes] = await Promise.all([
      listarProductosTodos(),
      listarEmbalajes(),
    ]);
    setCargando(false);
    if (!resProductos.ok) {
      setError(resProductos.error);
      setProductos([]);
      return;
    }
    setProductos(resProductos.productos);
    if (resEmbalajes.ok) {
      setEmbalajes(resEmbalajes.embalajes);
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  function abrirCrear() {
    setModoModal("crear");
    setProductoEdit(null);
    setModalAbierto(true);
  }

  function abrirEditar(p: ProductoFila) {
    setModoModal("editar");
    setProductoEdit(p);
    setModalAbierto(true);
  }

  async function toggleActivo(p: ProductoFila) {
    const res = await setProductoActivo({ id: p.id, activo: !p.activo });
    if (!res.ok) {
      setError(res.error);
      return;
    }
    void cargar();
  }

  return (
    <div className="mx-auto w-full max-w-[88rem]">
      {vista === "stock" ? (
        <StockPuestoPanel onVolver={() => setVista("productos")} />
      ) : (
        <>
      <header className="mb-8 overflow-hidden rounded-2xl border border-violet-200/70 bg-gradient-to-br from-violet-50 via-white to-purple-50/40 shadow-md shadow-violet-900/8 ring-1 ring-violet-100">
        <div className="relative px-6 py-5">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_100%_0%,_theme(colors.violet.200/35),_transparent)]" />
          <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-700 to-purple-800 text-white shadow-lg shadow-violet-900/30">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 -960 960 960" fill="currentColor"><path d="M186.67-80q-27.5 0-47.09-19.58Q120-119.17 120-146.67V-619q-17.33-7.67-28.67-23.76Q80-658.85 80-680v-133.33q0-27.5 19.58-47.09Q119.17-880 146.67-880h666.66q27.5 0 47.09 19.58Q880-840.83 880-813.33V-680q0 21.15-11.33 37.24Q857.33-626.67 840-619v472.33q0 27.5-19.58 47.09Q800.83-80 773.33-80H186.67Zm0-533.33v466.66h586.66v-466.66H186.67Zm-40-66.67h666.66v-133.33H146.67V-680ZM360-413.33h240V-480H360v66.67ZM480-380Z" /></svg>
              </span>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-violet-500">Catálogo</p>
                <h1 className="text-2xl font-bold tracking-tight text-violet-950">Productos</h1>
                <p className="mt-0.5 max-w-xl text-sm text-violet-700/70">Cajas de ciruela y precios de referencia. Los productos inactivos no aparecen al cargar ventas nuevas.</p>
              </div>
            </div>
            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                onClick={() => setVista("stock")}
                className="rounded-xl border border-emerald-300 bg-emerald-50 px-5 py-2.5 text-sm font-semibold text-emerald-800 shadow-sm transition hover:bg-emerald-100"
              >
                Stock puesto
              </button>
              <button
                type="button"
                onClick={abrirCrear}
                className="rounded-xl bg-gradient-to-r from-violet-700 to-purple-700 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-violet-900/25 transition hover:from-violet-600 hover:to-purple-600"
              >
                + Nuevo producto
              </button>
            </div>
          </div>
        </div>
      </header>

      {error ? (
        <p className="mb-4 rounded-lg border border-violet-300 bg-violet-50 px-4 py-3 text-sm text-violet-900">
          {error}
        </p>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-violet-200/80 bg-white shadow-md shadow-violet-900/10">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-violet-200 bg-violet-50/80 text-violet-900">
                <th className="px-4 py-3 font-semibold">Nombre</th>
                <th className="hidden lg:table-cell px-4 py-3 font-semibold">Embalaje</th>
                <th className="px-4 py-3 text-right font-semibold">Precio unitario</th>
                <th className="px-4 py-3 text-right font-semibold">Cantidad</th>
                <th className="hidden sm:table-cell px-4 py-3 font-semibold">Estado</th>
                <th className="hidden lg:table-cell px-4 py-3 font-semibold">Alta</th>
                <th className="px-4 py-3 text-right font-semibold">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {cargando ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-violet-600">
                    Cargando productos…
                  </td>
                </tr>
              ) : productos.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-violet-600">
                    No hay productos. Creá el primero con &quot;Nuevo producto&quot;.
                  </td>
                </tr>
              ) : (
                productos.map((p) => (
                  <tr
                    key={p.id}
                    className={`border-b border-violet-100/90 transition hover:bg-violet-50/50 ${!p.activo ? "opacity-75" : ""}`}
                  >
                    <td className="px-4 py-3 font-medium text-violet-950">{p.nombre}</td>
                    <td className="hidden lg:table-cell px-4 py-3 text-violet-800">
                      {p.embalaje_nombre ? (
                        <span className="inline-flex rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-medium text-violet-800">
                          {p.embalaje_nombre}
                        </span>
                      ) : (
                        <span className="text-xs text-violet-400 italic">Sin embalaje</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-violet-800">
                      {formatArs(p.precio_unitario)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums font-medium text-violet-950">
                      {p.cantidad}
                    </td>
                    <td className="hidden sm:table-cell px-4 py-3">
                      {p.activo ? (
                        <span className="inline-flex rounded-full bg-violet-600 px-2.5 py-0.5 text-xs font-medium text-white">
                          Activo
                        </span>
                      ) : (
                        <span className="inline-flex rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-medium text-violet-700">
                          Inactivo
                        </span>
                      )}
                    </td>
                    <td className="hidden lg:table-cell whitespace-nowrap px-4 py-3 text-violet-700">
                      {formatearFechaCorta(p.created_at)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex flex-wrap justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => abrirEditar(p)}
                          className="rounded-lg border border-violet-200 bg-white px-3 py-1.5 text-xs font-medium text-violet-800 transition hover:bg-violet-50"
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => void toggleActivo(p)}
                          className="rounded-lg border border-violet-200 bg-white px-3 py-1.5 text-xs font-medium text-violet-800 transition hover:bg-violet-50"
                        >
                          {p.activo ? "Desactivar" : "Activar"}
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

      <ProductoFormModal
        open={modalAbierto}
        onClose={() => setModalAbierto(false)}
        modo={modoModal}
        producto={productoEdit}
        embalajes={embalajes}
        onGuardado={() => void cargar()}
      />
      </>
      )}
    </div>
  );
}
