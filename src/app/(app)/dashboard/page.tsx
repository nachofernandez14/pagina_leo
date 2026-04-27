import { listarChequesEnCartera } from "@/app/(app)/cheques/actions";
import { listarProductosTodos } from "@/app/(app)/productos/actions";
import {
  listarSaldoACobrar,
  listarSaldoAPagar,
  listarVentasDelMes,
} from "@/app/(app)/dashboard/actions";
import { formatArs } from "@/lib/format";

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

// ─── Metric card ──────────────────────────────────────────────────────────────

function MetricCard({
  title,
  hint,
  icon,
  value,
  sub,
  valueColor,
}: {
  title: string;
  hint: string;
  icon: React.ReactNode;
  value: string | null;
  sub?: string;
  valueColor?: string;
}) {
  return (
    <article className="group relative overflow-hidden rounded-2xl border border-violet-200/80 bg-white p-5 shadow-sm ring-1 ring-violet-100/60 transition hover:shadow-md hover:shadow-violet-900/10">
      <div className="pointer-events-none absolute -right-4 -top-4 h-20 w-20 rounded-full bg-violet-100/60 blur-2xl transition group-hover:bg-violet-200/70" />
      <div className="relative mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-100 to-purple-100 text-violet-600">
        {icon}
      </div>
      <h2 className="relative text-sm font-semibold text-violet-950">{title}</h2>
      <p className="relative mt-0.5 text-[11px] text-violet-600/80">{hint}</p>
      {value !== null ? (
        <>
          <p className={`relative mt-3 font-mono text-xl font-semibold tabular-nums tracking-tight ${valueColor ?? "text-violet-950"}`}>
            {value}
          </p>
          {sub ? <p className="relative mt-0.5 text-[11px] text-violet-500">{sub}</p> : null}
        </>
      ) : (
        <>
          <p className="relative mt-3 font-mono text-xl font-semibold tabular-nums tracking-tight text-violet-300">—</p>
          <p className="relative mt-0.5 text-[11px] text-violet-400">Sin datos aún</p>
        </>
      )}
    </article>
  );
}

// ─── Metric card estática ─────────────────────────────────────────────────────

function MetricCardEstatica({
  title,
  hint,
  icon,
}: {
  title: string;
  hint: string;
  icon: React.ReactNode;
}) {
  return (
    <article className="group relative overflow-hidden rounded-2xl border border-violet-200/80 bg-white p-5 shadow-sm ring-1 ring-violet-100/60 transition hover:shadow-md hover:shadow-violet-900/10">
      <div className="pointer-events-none absolute -right-4 -top-4 h-20 w-20 rounded-full bg-violet-100/60 blur-2xl transition group-hover:bg-violet-200/70" />
      <div className="relative mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-100 to-purple-100 text-violet-600">
        {icon}
      </div>
      <h2 className="relative text-sm font-semibold text-violet-950">{title}</h2>
      <p className="relative mt-0.5 text-[11px] text-violet-600/80">{hint}</p>
      <p className="relative mt-3 font-mono text-xl font-semibold tabular-nums tracking-tight text-violet-300">
        —
      </p>
      <p className="relative mt-0.5 text-[11px] text-violet-400">Sin datos aún</p>
    </article>
  );
}

// ─── Página ───────────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  const [resCartera, resProductos, resCobrar, resPagar, resVentasMes] =
    await Promise.all([
      listarChequesEnCartera(),
      listarProductosTodos(),
      listarSaldoACobrar(),
      listarSaldoAPagar(),
      listarVentasDelMes(),
    ]);

  const cartera = resCartera.ok ? resCartera.cheques : [];
  // Solo productos activos, ordenados por cantidad ASC (los más bajos primero)
  const stockProductos = resProductos.ok
    ? resProductos.productos
        .filter((p) => p.activo)
        .sort((a, b) => a.cantidad - b.cantidad)
    : [];

  const totalCartera = cartera.reduce((s, c) => s + c.monto, 0);

  // Urgentes: vencidos o que vencen en ≤ 3 días
  const urgentes = cartera.filter((c) => diasHasta(c.fecha_cobro) <= 3);

  return (
    <div className="mx-auto w-full max-w-[88rem] space-y-8">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="relative overflow-hidden rounded-2xl border border-violet-200/60 bg-gradient-to-br from-violet-700 via-violet-800 to-purple-900 p-6 shadow-lg shadow-violet-900/25">
        <div
          className="pointer-events-none absolute inset-0 opacity-30"
          style={{
            background:
              "radial-gradient(ellipse at 80% 0%, rgba(167,139,250,0.5) 0%, transparent 60%)",
          }}
        />
        <div className="relative flex items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/15 shadow-inner">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-violet-300/90">Resumen operativo</p>
            <h1 className="text-2xl font-bold text-white tracking-tight">Dashboard</h1>
            <p className="mt-0.5 text-sm text-violet-200/80">
              Vista general del negocio
            </p>
            <p className="text-xs text-violet-300/70 capitalize">
              {new Date().toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
            </p>
          </div>
        </div>
      </header>

      {/* ── Alerta cheques urgentes ─────────────────────────────────────────── */}
      {urgentes.length > 0 && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-300/70 bg-gradient-to-r from-amber-50 to-yellow-50 px-5 py-4 shadow-sm shadow-amber-900/10">
          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-500/15">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-amber-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-amber-900">
              {urgentes.length === 1
                ? "1 cheque vence hoy o en los próximos 3 días"
                : `${urgentes.length} cheques vencen hoy o en los próximos 3 días`}
            </p>
            <p className="mt-0.5 text-xs text-amber-800/80">
              {urgentes.map((c) => `Nro ${c.numero_cheque} (${formatFechaCorta(c.fecha_cobro)})`).join(" · ")}
            </p>
          </div>
        </div>
      )}

      {/* ── Cheques en cartera — sección principal ──────────────────────────── */}
      <section aria-label="Cheques a cobrar">
        <div className="mb-4 flex items-center justify-between gap-2">
          <div className="min-w-0 flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-purple-700 shadow-sm">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h2 className="text-base font-semibold text-violet-950">Cheques a cobrar</h2>
              <p className="text-[11px] text-violet-600/80">
                {cartera.length} en cartera · Total {formatArs(totalCartera)}
              </p>
            </div>
          </div>
          {cartera.length > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold text-violet-800">
              <span className="h-1.5 w-1.5 rounded-full bg-violet-600 animate-pulse" />
              {cartera.length} activo{cartera.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {cartera.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-violet-200 bg-white px-6 py-12 text-center shadow-sm">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-50">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-violet-700">No hay cheques en cartera</p>
            <p className="mt-1 text-xs text-violet-500">Cargá uno desde la sección Cheques.</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-violet-200/80 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-violet-100 bg-gradient-to-r from-violet-50 to-purple-50/60 text-violet-900">
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">N.° Cheque</th>
                    <th className="hidden sm:table-cell px-4 py-3 text-xs font-semibold uppercase tracking-wide">Banco</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Recibido de</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide">Monto</th>
                    <th className="hidden sm:table-cell px-4 py-3 text-xs font-semibold uppercase tracking-wide">Fecha cobro</th>
                    <th className="hidden md:table-cell px-4 py-3 text-xs font-semibold uppercase tracking-wide">Vencimiento</th>
                  </tr>
                </thead>
                <tbody>
                  {cartera.map((c) => {
                    const dias = diasHasta(c.fecha_cobro);

                    let diasCls = "bg-emerald-50 text-emerald-700";
                    if (dias < 0) diasCls = "bg-red-100 text-red-800 font-semibold";
                    else if (dias === 0) diasCls = "bg-orange-100 text-orange-800 font-semibold";
                    else if (dias <= 3) diasCls = "bg-amber-100 text-amber-800 font-semibold";
                    else if (dias <= 7) diasCls = "bg-yellow-50 text-yellow-700";

                    let diasLabel: string;
                    if (dias < 0)
                      diasLabel = `Vencido hace ${Math.abs(dias)} día${Math.abs(dias) === 1 ? "" : "s"}`;
                    else if (dias === 0) diasLabel = "Vence hoy";
                    else diasLabel = `${dias} día${dias === 1 ? "" : "s"}`;

                    const rowUrgent = dias <= 3;

                    return (
                      <tr
                        key={c.id}
                        className={`border-b border-violet-100/70 transition hover:bg-violet-50/40 ${rowUrgent ? "bg-amber-50/30" : ""}`}
                      >
                        <td className="px-4 py-3.5 font-mono font-semibold text-violet-950">
                          {c.numero_cheque}
                        </td>
                        <td className="hidden sm:table-cell px-4 py-3.5 text-violet-800">{c.banco}</td>
                        <td className="px-4 py-3.5 text-violet-950">{c.recibido_de}</td>
                        <td className="px-4 py-3.5 text-right font-mono tabular-nums font-semibold text-violet-950">
                          {formatArs(c.monto)}
                        </td>
                        <td className="hidden sm:table-cell whitespace-nowrap px-4 py-3.5 text-violet-700">
                          {formatFechaCorta(c.fecha_cobro)}
                        </td>
                        <td className="hidden md:table-cell px-4 py-3.5">
                          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs ${diasCls}`}>
                            {dias <= 3 && dias >= 0 && <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />}
                            {diasLabel}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-violet-200 bg-gradient-to-r from-violet-50 to-purple-50/40">
                    <td colSpan={3} className="px-4 py-3 text-sm font-bold text-violet-900">
                      Total en cartera
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-sm font-bold tabular-nums text-violet-950">
                      {formatArs(totalCartera)}
                    </td>
                    <td className="hidden sm:table-cell" />
                    <td className="hidden md:table-cell" />
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}
      </section>

      {/* ── Métricas estáticas ──────────────────────────────────────────────── */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-label="Indicadores">
        <MetricCard
          title="Saldo a cobrar"
          hint="Total pendiente de clientes"
          value={resCobrar.ok ? formatArs(resCobrar.total) : null}
          sub={resCobrar.ok && resCobrar.total === 0 ? "Todos los clientes al día ✓" : resCobrar.ok ? "Suma de saldos positivos" : resCobrar.error}
          valueColor="text-red-700"
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          }
        />
        <MetricCard
          title="Saldo a pagar"
          hint="Total adeudado a proveedores"
          value={resPagar.ok ? formatArs(resPagar.total) : null}
          sub={resPagar.ok && resPagar.total === 0 ? "Sin deuda con proveedores ✓" : resPagar.ok ? "Suma de saldos positivos" : resPagar.error}
          valueColor="text-amber-700"
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
          }
        />
        <MetricCard
          title="Ventas del mes"
          hint={resVentasMes.ok ? resVentasMes.mesNombre : "Acumulado mensual"}
          value={resVentasMes.ok ? formatArs(resVentasMes.total) : null}
          sub={resVentasMes.ok && resVentasMes.total === 0 ? "Sin ventas este mes aún" : resVentasMes.ok ? "Acumulado desde el 1.°" : resVentasMes.error}
          valueColor="text-emerald-700"
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          }
        />
      </section>

      {/* ── Stock estimado ──────────────────────────────────────────────────── */}
      <section aria-label="Stock estimado">
        <div className="mb-4 flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-purple-700 shadow-sm">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10" />
            </svg>
          </div>
          <div>
            <h2 className="text-base font-semibold text-violet-950">Stock estimado</h2>
            <p className="text-[11px] text-violet-600/80">
              Productos activos · ordenados de menor a mayor cantidad
            </p>
          </div>
        </div>

        {stockProductos.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-violet-200 bg-white px-6 py-10 text-center shadow-sm">
            <p className="text-sm font-medium text-violet-700">Sin productos activos</p>
            <p className="mt-1 text-xs text-violet-500">Cargá productos desde la sección Productos.</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-violet-200/80 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-violet-100 bg-gradient-to-r from-violet-50 to-purple-50/60 text-violet-900">
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Producto</th>
                    <th className="hidden sm:table-cell px-4 py-3 text-xs font-semibold uppercase tracking-wide">Embalaje</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide">Cantidad</th>
                  </tr>
                </thead>
                <tbody>
                  {stockProductos.map((p) => {
                    let cantCls = "bg-emerald-50 text-emerald-700";
                    if (p.cantidad === 0) cantCls = "bg-red-100 text-red-800 font-semibold";
                    else if (p.cantidad <= 10) cantCls = "bg-amber-100 text-amber-800 font-semibold";
                    else if (p.cantidad <= 30) cantCls = "bg-yellow-50 text-yellow-700";

                    return (
                      <tr key={p.id} className="border-b border-violet-100/70 transition hover:bg-violet-50/40">
                        <td className="px-4 py-3.5 font-medium text-violet-950">{p.nombre}</td>
                        <td className="hidden sm:table-cell px-4 py-3.5 text-violet-700">
                          {p.embalaje_nombre ? (
                            <span className="inline-flex rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-medium text-violet-800">
                              {p.embalaje_nombre}
                            </span>
                          ) : (
                            <span className="text-xs text-violet-400 italic">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs ${cantCls}`}>
                            {p.cantidad === 0 && <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />}
                            {p.cantidad}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
