"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ClienteConSaldo,
  MovimientosCliente,
  eliminarCliente,
  eliminarCobro,
  listarClientesConSaldo,
  listarMovimientosCliente,
} from "@/app/(app)/saldos/actions";
import { formatArs } from "@/lib/format";
import { ClienteFormModal } from "./cliente-form-modal";
import { CobroFormModal } from "./cobro-form-modal";
import { ConfirmModal } from "@/components/confirm-modal";

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
      Debe {formatArs(saldo)}
    </span>
  );
}

const MOVIMIENTO_BADGE: Record<string, string> = {
  efectivo: "bg-emerald-100 text-emerald-800",
  transferencia: "bg-blue-100 text-blue-800",
  cheque: "bg-violet-100 text-violet-800",
};

// ─── Componente principal ─────────────────────────────────────────────────────

export function ClientesClient() {
  // Vista: listado o detalle de un cliente
  const [vista, setVista] = useState<"lista" | "detalle">("lista");
  const [clienteSeleccionado, setClienteSeleccionado] = useState<ClienteConSaldo | null>(null);

  // Datos generales
  const [clientes, setClientes] = useState<ClienteConSaldo[]>([]);
  const [cargando, setCargando] = useState(true);
  const [errorLista, setErrorLista] = useState<string | null>(null);

  // Detalle del cliente
  const [movimientos, setMovimientos] = useState<MovimientosCliente | null>(null);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);
  const [errorDetalle, setErrorDetalle] = useState<string | null>(null);

  // Modales
  const [modalCliente, setModalCliente] = useState<{
    open: boolean;
    modo: "crear" | "editar";
    cliente: ClienteConSaldo | null;
  }>({ open: false, modo: "crear", cliente: null });

  const [modalCobro, setModalCobro] = useState(false);
  const [confirmacion, setConfirmacion] = useState<{ mensaje: string; detalle?: string; onOk: () => Promise<void> } | null>(null);
  const [confirmCargando, setConfirmCargando] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);

  // ─── Carga de datos ───────────────────────────────────────────────────────

  const cargarClientes = useCallback(async () => {
    setCargando(true);
    setErrorLista(null);
    const res = await listarClientesConSaldo();
    setCargando(false);
    if (!res.ok) { setErrorLista(res.error); return; }
    setClientes(res.clientes);
    // Actualizar el cliente seleccionado si sigue visible
    if (clienteSeleccionado) {
      const actualizado = res.clientes.find((c) => c.id === clienteSeleccionado.id);
      if (actualizado) setClienteSeleccionado(actualizado);
    }
  }, [clienteSeleccionado]);

  useEffect(() => {
    void cargarClientes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cargarDetalle = useCallback(async (id: string) => {
    setCargandoDetalle(true);
    setErrorDetalle(null);
    const res = await listarMovimientosCliente(id);
    setCargandoDetalle(false);
    if (!res.ok) { setErrorDetalle(res.error); return; }
    setMovimientos(res.movimientos);
  }, []);

  function abrirDetalle(cliente: ClienteConSaldo) {
    setClienteSeleccionado(cliente);
    setVista("detalle");
    setMovimientos(null);
    void cargarDetalle(cliente.id);
  }

  function volverALista() {
    setVista("lista");
    setClienteSeleccionado(null);
    setMovimientos(null);
  }

  function handleEliminarCliente(id: string, nombre: string) {
    setConfirmacion({
      mensaje: `¿Eliminar a "${nombre}"?`,
      detalle: "Sus ventas históricas se conservan.",
      onOk: async () => {
        setConfirmCargando(true);
        setConfirmError(null);
        const res = await eliminarCliente(id);
        setConfirmCargando(false);
        if (!res.ok) { setConfirmError(res.error); return; }
        setConfirmacion(null);
        void cargarClientes();
        if (vista === "detalle") volverALista();
      },
    });
  }

  function handleEliminarCobro(id: string) {
    setConfirmacion({
      mensaje: "¿Eliminar este cobro?",
      detalle: "Esta acción no se puede deshacer.",
      onOk: async () => {
        setConfirmCargando(true);
        setConfirmError(null);
        const res = await eliminarCobro(id);
        setConfirmCargando(false);
        if (!res.ok) { setConfirmError(res.error); return; }
        setConfirmacion(null);
        void cargarClientes();
        if (clienteSeleccionado) void cargarDetalle(clienteSeleccionado.id);
      },
    });
  }

  async function generarPDFSaldo() {
    if (!clienteSeleccionado || !movimientos) return;
    const cliente = clienteSeleccionado;
    const mov = movimientos;

    const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
      import("jspdf"),
      import("jspdf-autotable"),
    ]);

    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();
    const ahora = new Date();
    const fechaHora = ahora.toLocaleString("es-AR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    // Cargar logo
    let logoDataUrl: string | null = null;
    try {
      const resp = await fetch("/images/logo_leo.png");
      const blob = await resp.blob();
      logoDataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
    } catch {
      // continuar sin logo
    }

    let y = 12;

    if (logoDataUrl) {
      doc.addImage(logoDataUrl, "PNG", 14, y, 20, 20);
    }

    // Título
    doc.setFontSize(16);
    doc.setTextColor(91, 33, 182);
    doc.text("Estado de cuenta", pageW - 14, y + 7, { align: "right" });
    doc.setFontSize(8);
    doc.setTextColor(120, 90, 170);
    doc.text(`Generado: ${fechaHora}`, pageW - 14, y + 13, { align: "right" });
    y += 26;

    // Datos del cliente
    doc.setFontSize(11);
    doc.setTextColor(30, 10, 60);
    doc.text(cliente.nombre, 14, y);
    if (cliente.telefono) {
      doc.setFontSize(8);
      doc.setTextColor(90, 70, 130);
      doc.text(cliente.telefono, 14, y + 5);
      y += 5;
    }
    y += 7;

    // Resumen en 3 cajas
    const boxW = (pageW - 28 - 4) / 3;
    const resumeItems: Array<{ label: string; value: string; r: number; g: number; b: number }> = [
      { label: "TOTAL VENDIDO", value: formatArs(cliente.total_ventas), r: 109, g: 40, b: 217 },
      { label: "TOTAL COBRADO", value: formatArs(cliente.total_cobros), r: 5, g: 150, b: 105 },
      {
        label: "SALDO PENDIENTE",
        value: formatArs(cliente.saldo),
        r: cliente.saldo > 0 ? 185 : 5,
        g: cliente.saldo > 0 ? 28 : 150,
        b: cliente.saldo > 0 ? 28 : 105,
      },
    ];
    resumeItems.forEach(({ label, value, r, g, b }, i) => {
      const x = 14 + i * (boxW + 2);
      doc.setFillColor(245, 243, 255);
      doc.roundedRect(x, y, boxW, 14, 2, 2, "F");
      doc.setFontSize(6);
      doc.setTextColor(109, 40, 217);
      doc.text(label, x + 2.5, y + 5);
      doc.setFontSize(9);
      doc.setTextColor(r, g, b);
      doc.text(value, x + 2.5, y + 11);
    });
    y += 20;

    // Unificar ventas y cobros en una sola lista ordenada por fecha
    type FilaMovimiento = {
      fecha: string;       // "YYYY-MM-DD"
      descripcion: string;
      tipo: "venta" | "cobro";
      debe: number;   // venta → monto
      haber: number;  // cobro → monto
    };

    const filas: FilaMovimiento[] = [
      ...mov.ventas.map((v) => ({
        fecha: v.fecha,
        descripcion: `${v.producto_nombre} · ${v.cantidad_cajas} cajas · ${formatArs(v.precio_unitario)} c/u`,
        tipo: "venta" as const,
        debe: v.total,
        haber: 0,
      })),
      ...mov.cobros.map((c) => ({
        fecha: c.fecha,
        descripcion: c.movimiento.charAt(0).toUpperCase() + c.movimiento.slice(1),
        tipo: "cobro" as const,
        debe: 0,
        haber: c.monto,
      })),
    ].sort((a, b) => a.fecha.localeCompare(b.fecha));

    // Calcular saldo acumulado fila a fila
    let saldoAcum = 0;
    const bodyRows = filas.map(({ fecha, descripcion, tipo, debe, haber }) => {
      saldoAcum += debe - haber;
      return {
        fecha: formatFecha(fecha),
        descripcion,
        tipo,
        debe: debe > 0 ? formatArs(debe) : "",
        haber: haber > 0 ? formatArs(haber) : "",
        saldo: formatArs(saldoAcum),
        saldoNum: saldoAcum,
      };
    });

    // Tabla unificada
    doc.setFontSize(9);
    doc.setTextColor(30, 10, 60);
    doc.text("Movimientos", 14, y);
    y += 4;

    autoTable(doc, {
      startY: y,
      head: [["Fecha", "Descripción", "Tipo", "Compra", "Pago", "Saldo"]],
      body: bodyRows.map((r) => [r.fecha, r.descripcion, r.tipo === "venta" ? "Compra" : "Pago", r.debe, r.haber, r.saldo]),
      styles: { fontSize: 7, cellPadding: 1.5 },
      headStyles: { fillColor: [91, 33, 182], textColor: 255, fontStyle: "bold", fontSize: 7 },
      columnStyles: {
        0: { cellWidth: 20 },
        2: { cellWidth: 15, halign: "center" },
        3: { halign: "right" },
        4: { halign: "right" },
        5: { halign: "right", fontStyle: "bold" },
      },
      bodyStyles: { textColor: [30, 10, 60] },
      didParseCell(data) {
        if (data.section === "body") {
          const row = bodyRows[data.row.index];
          if (!row) return;
          if (data.column.index === 2) {
            // Tipo badge color
            if (row.tipo === "venta") {
              data.cell.styles.textColor = [109, 40, 217];
            } else {
              data.cell.styles.textColor = [5, 150, 105];
            }
          }
          if (data.column.index === 5) {
            // Saldo acumulado: rojo si debe, verde si a favor
            data.cell.styles.textColor = row.saldoNum > 0 ? [185, 28, 28] : [5, 150, 105];
          }
        }
      },
      alternateRowStyles: { fillColor: [249, 247, 255] },
      showHead: "everyPage",
      margin: { left: 14, right: 14 },
      didDrawPage(data) {
        // Número de página al pie
        const pageCount = (doc.internal as unknown as { getNumberOfPages: () => number }).getNumberOfPages();
        const pageNumber = data.pageNumber;
        doc.setFontSize(7);
        doc.setTextColor(150, 130, 180);
        doc.text(
          `Página ${pageNumber} de ${pageCount}`,
          pageW / 2,
          doc.internal.pageSize.getHeight() - 6,
          { align: "center" },
        );
      },
    });

    const safeName = cliente.nombre.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    doc.save(`saldo-${safeName}.pdf`);
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
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 -960 960 960" fill="currentColor"><path d="M371.33-525.33Q326.67-570 326.67-634t44.66-108.67Q416-787.33 480-787.33t108.67 44.66Q633.33-698 633.33-634t-44.66 108.67Q544-480.67 480-480.67t-108.67-44.66ZM160-160v-100q0-34.67 17.67-63.17 17.66-28.5 49-42.83 60-28 123.5-44.33 63.5-16.34 129.83-16.34 66.33 0 129.5 16.67t123.17 44Q764-351.67 782-323.17T800-260v100H160Zm381.5-412.5q25.17-25.17 25.17-61.5t-25.17-61.5q-25.17-25.17-61.5-25.17t-61.5 25.17q-25.17 25.17-25.17 61.5t25.17 61.5q25.17 25.17 61.5 25.17t61.5-25.17ZM640-332.67v106h93.33V-260q0-15-7.66-27-7.67-12-21-19-16-8-32.17-14.5T640-332.67ZM386.67-351v57.67h186.66V-351Q550-355.67 527-357.83 504-360 480-360t-47 2.17q-23 2.16-46.33 6.83Zm-160 124.33H320v-106.66q-16.33 5.66-32.83 12.5-16.5 6.83-32.5 14.83-13.34 7-20.67 19-7.33 12-7.33 27v33.33Zm413.33 0H320h320ZM480-634Z" /></svg>
                </span>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-violet-500">Cartera de clientes</p>
                  <h1 className="text-2xl font-bold tracking-tight text-violet-950">Clientes</h1>
                  <p className="mt-0.5 max-w-lg text-sm text-violet-700/70">Saldo de cada cliente: lo que nos compró menos lo que nos pagó.</p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={() => setModalCliente({ open: true, modo: "crear", cliente: null })}
                  className="rounded-xl bg-gradient-to-r from-violet-700 to-purple-700 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-violet-900/25 transition hover:from-violet-600 hover:to-purple-600"
                >
                  + Nuevo cliente
                </button>
              </div>
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
                  <th className="hidden lg:table-cell px-4 py-3 text-right font-semibold">Total vendido</th>
                  <th className="hidden lg:table-cell px-4 py-3 text-right font-semibold">Total cobrado</th>
                  <th className="px-4 py-3 text-right font-semibold">Saldo</th>
                  <th className="px-4 py-3 text-right font-semibold">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {cargando ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-violet-600">
                      Cargando clientes…
                    </td>
                  </tr>
                ) : errorLista ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-red-700">
                      {errorLista}
                    </td>
                  </tr>
                ) : clientes.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-violet-600">
                      No hay clientes registrados todavía.
                    </td>
                  </tr>
                ) : (
                  clientes.map((c) => (
                    <tr
                      key={c.id}
                      className="border-b border-violet-100/90 transition hover:bg-violet-50/50"
                    >
                      <td className="px-4 py-3 font-medium text-violet-950">{c.nombre}</td>
                      <td className="hidden sm:table-cell px-4 py-3 text-violet-700">{c.telefono ?? "—"}</td>
                      <td className="hidden lg:table-cell px-4 py-3 text-right font-mono tabular-nums text-violet-950">
                        {formatArs(c.total_ventas)}
                      </td>
                      <td className="hidden lg:table-cell px-4 py-3 text-right font-mono tabular-nums text-violet-950">
                        {formatArs(c.total_cobros)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <SaldoBadge saldo={c.saldo} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => abrirDetalle(c)}
                            className="rounded-lg bg-violet-100 px-3 py-1.5 text-xs font-medium text-violet-800 transition hover:bg-violet-200"
                          >
                            Ver
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setModalCliente({ open: true, modo: "editar", cliente: c })
                            }
                            className="hidden sm:inline-flex rounded-lg border border-violet-200 bg-white px-3 py-1.5 text-xs font-medium text-violet-800 transition hover:bg-violet-50"
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => handleEliminarCliente(c.id, c.nombre)}
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

        <ClienteFormModal
          open={modalCliente.open}
          onClose={() => setModalCliente((p) => ({ ...p, open: false }))}
          modo={modalCliente.modo}
          cliente={modalCliente.cliente}
          onGuardado={() => void cargarClientes()}
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

  // ─── Vista: Detalle de cliente ────────────────────────────────────────────

  const cli = clienteSeleccionado!;

  return (
    <div className="mx-auto w-full max-w-[88rem]">
      {/* Navegación de vuelta */}
      <button
        type="button"
        onClick={volverALista}
        className="mb-6 flex items-center gap-1.5 text-sm font-medium text-violet-700 transition hover:text-violet-900"
      >
        ← Volver a clientes
      </button>

      {/* Tarjeta del cliente */}
      <div className="mb-6 flex flex-col gap-4 rounded-2xl border border-violet-200/80 bg-gradient-to-br from-violet-50/90 via-white to-violet-100/40 p-5 shadow-sm sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-violet-950">{cli.nombre}</h1>
          {cli.telefono ? (
            <p className="mt-1 text-sm text-violet-700">{cli.telefono}</p>
          ) : null}
          {cli.notas ? (
            <p className="mt-1 text-sm italic text-violet-600/80">{cli.notas}</p>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <div className="flex gap-2">
            <button
              type="button"              onClick={() => void generarPDFSaldo()}
              disabled={!movimientos}
              className="rounded-lg border border-emerald-200 bg-white px-3 py-1.5 text-xs font-medium text-emerald-700 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Exportar PDF
            </button>
            <button
              type="button"              onClick={() =>
                setModalCliente({ open: true, modo: "editar", cliente: cli })
              }
              className="rounded-lg border border-violet-200 bg-white px-3 py-1.5 text-xs font-medium text-violet-800 transition hover:bg-violet-50"
            >
              Editar
            </button>
            <button
              type="button"
              onClick={() => handleEliminarCliente(cli.id, cli.nombre)}
              className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-700 transition hover:bg-red-50"
            >
              Eliminar
            </button>
          </div>
        </div>
      </div>

      {/* Resumen de saldo */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-violet-200/80 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wider text-violet-500">
            Total vendido
          </p>
          <p className="mt-1 font-mono text-2xl font-bold tabular-nums text-violet-950">
            {formatArs(cli.total_ventas)}
          </p>
        </div>
        <div className="rounded-2xl border border-violet-200/80 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wider text-violet-500">
            Total cobrado
          </p>
          <p className="mt-1 font-mono text-2xl font-bold tabular-nums text-emerald-700">
            {formatArs(cli.total_cobros)}
          </p>
        </div>
        <div
          className={`rounded-2xl border p-4 shadow-sm ${
            cli.saldo > 0
              ? "border-red-200/80 bg-red-50/60"
              : "border-green-200/80 bg-green-50/60"
          }`}
        >
          <p className="text-xs font-medium uppercase tracking-wider text-violet-500">
            Saldo pendiente
          </p>
          <p
            className={`mt-1 font-mono text-2xl font-bold tabular-nums ${
              cli.saldo > 0 ? "text-red-700" : "text-green-700"
            }`}
          >
            {formatArs(cli.saldo)}
          </p>
          <p className="mt-0.5 text-xs text-violet-500">
            {cli.saldo > 0 ? "El cliente nos debe" : cli.saldo < 0 ? "Saldo a favor del cliente" : "Al día ✓"}
          </p>
        </div>
      </div>

      {/* Botón registrar cobro */}
      <div className="mb-6 flex justify-end">
        <button
          type="button"
          onClick={() => setModalCobro(true)}
          className="rounded-xl bg-gradient-to-r from-violet-700 to-purple-700 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-violet-900/25 transition hover:from-violet-600 hover:to-purple-600"
        >
          + Registrar cobro
        </button>
      </div>

      {cargandoDetalle ? (
        <p className="py-10 text-center text-violet-600">Cargando historial…</p>
      ) : errorDetalle ? (
        <p className="py-10 text-center text-red-700">{errorDetalle}</p>
      ) : movimientos ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Ventas */}
          <div className="overflow-hidden rounded-2xl border border-violet-200/80 bg-white shadow-sm">
            <div className="border-b border-violet-100 bg-violet-50/80 px-4 py-3">
              <h2 className="text-sm font-semibold text-violet-950">
                Ventas ({movimientos.ventas.length})
              </h2>
            </div>
            {movimientos.ventas.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-violet-500">
                No hay ventas registradas.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-violet-100 text-xs font-medium text-violet-500">
                      <th className="px-4 py-2">Fecha</th>
                      <th className="px-4 py-2">Producto</th>
                      <th className="px-4 py-2 text-right">Cajas</th>
                      <th className="px-4 py-2 text-right">Precio/caja</th>
                      <th className="px-4 py-2 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {movimientos.ventas.map((v) => (
                      <tr key={v.id} className="border-b border-violet-100/60 hover:bg-violet-50/30">
                        <td className="px-4 py-2 text-violet-700">{formatFecha(v.fecha)}</td>
                        <td className="px-4 py-2 text-violet-950">{v.producto_nombre}</td>
                        <td className="px-4 py-2 text-right tabular-nums text-violet-700">
                          {v.cantidad_cajas}
                        </td>
                        <td className="px-4 py-2 text-right font-mono tabular-nums text-violet-800">
                          {formatArs(v.precio_unitario)}
                        </td>
                        <td className="px-4 py-2 text-right font-mono tabular-nums font-semibold text-violet-950">
                          {formatArs(v.total)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Cobros */}
          <div className="overflow-hidden rounded-2xl border border-violet-200/80 bg-white shadow-sm">
            <div className="border-b border-violet-100 bg-violet-50/80 px-4 py-3">
              <h2 className="text-sm font-semibold text-violet-950">
                Cobros ({movimientos.cobros.length})
              </h2>
            </div>
            {movimientos.cobros.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-violet-500">
                No hay cobros registrados.
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
                    {movimientos.cobros.map((c) => (
                      <tr key={c.id} className="border-b border-violet-100/60 hover:bg-violet-50/30">
                        <td className="px-4 py-2 text-violet-700">{formatFecha(c.fecha)}</td>
                        <td className="px-4 py-2">
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                              MOVIMIENTO_BADGE[c.movimiento] ?? "bg-gray-100 text-gray-700"
                            }`}
                          >
                            {c.movimiento.charAt(0).toUpperCase() + c.movimiento.slice(1)}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-right font-mono tabular-nums font-semibold text-emerald-700">
                          {formatArs(c.monto)}
                        </td>
                        <td className="px-4 py-2 text-right">
                          <button
                            type="button"
                            onClick={() => handleEliminarCobro(c.id)}
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
      <ClienteFormModal
        open={modalCliente.open}
        onClose={() => setModalCliente((p) => ({ ...p, open: false }))}
        modo={modalCliente.modo}
        cliente={modalCliente.cliente}
        onGuardado={() => {
          void cargarClientes();
          if (clienteSeleccionado) void cargarDetalle(clienteSeleccionado.id);
        }}
      />
      <CobroFormModal
        open={modalCobro}
        onClose={() => setModalCobro(false)}
        clienteId={cli.id}
        clienteNombre={cli.nombre}
        saldoActual={cli.saldo}
        onGuardado={() => {
          void cargarClientes();
          void cargarDetalle(cli.id);
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
