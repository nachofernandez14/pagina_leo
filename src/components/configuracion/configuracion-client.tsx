"use client";

import { useRef, useState } from "react";
import { purgarClientesInactivos } from "@/app/(app)/saldos/actions";

// ─── Restaurar (inlined from restaurar-client, adapted) ───────────────────────

type BackupData = {
  exportado_en: string;
  exportado_por: string;
  tablas: string[];
  datos: Record<string, unknown[]>;
};

type FilaResultado = {
  tabla: string;
  insertados: number;
  error_eliminacion?: string;
  error_insercion?: string;
};

function formatFecha(iso: string) {
  return new Date(iso).toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function SectionCard({
  title,
  description,
  icon,
  children,
  accent = "violet",
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  accent?: "violet" | "amber" | "red";
}) {
  const colors = {
    violet: {
      border: "border-violet-200/80",
      bg: "from-violet-50/80 via-white to-violet-50/30",
      iconBg: "from-violet-700 to-purple-800",
      iconShadow: "shadow-violet-900/30",
      tag: "text-violet-500",
      title: "text-violet-950",
      desc: "text-violet-700/70",
    },
    amber: {
      border: "border-amber-200/80",
      bg: "from-amber-50/80 via-white to-amber-50/30",
      iconBg: "from-amber-500 to-orange-600",
      iconShadow: "shadow-amber-900/30",
      tag: "text-amber-600",
      title: "text-amber-950",
      desc: "text-amber-700/70",
    },
    red: {
      border: "border-red-200/80",
      bg: "from-red-50/80 via-white to-red-50/30",
      iconBg: "from-red-600 to-rose-700",
      iconShadow: "shadow-red-900/30",
      tag: "text-red-500",
      title: "text-red-950",
      desc: "text-red-700/70",
    },
  }[accent];

  return (
    <div className={`overflow-hidden rounded-2xl border ${colors.border} bg-gradient-to-br ${colors.bg} shadow-md`}>
      <div className="flex items-start gap-4 border-b border-inherit px-6 py-5">
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${colors.iconBg} text-white shadow-lg ${colors.iconShadow}`}>
          {icon}
        </span>
        <div>
          <h2 className={`text-base font-bold ${colors.title}`}>{title}</h2>
          <p className={`mt-0.5 text-sm ${colors.desc}`}>{description}</p>
        </div>
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  );
}

// ─── Sección: Exportar backup ─────────────────────────────────────────────────

function ExportarBackup() {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-sm text-violet-800">
          Descargá un archivo <span className="font-mono font-semibold">.json</span> con todos los datos actuales de la base de datos.
        </p>
        <p className="mt-1 text-xs text-violet-500">
          Incluye: clientes, ventas, cobros, proveedores, compras, pagos, productos, cheques, campo y más.
        </p>
      </div>
      <a
        href="/api/backup"
        download
        className="shrink-0 rounded-xl bg-gradient-to-r from-violet-700 to-purple-700 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-violet-900/25 transition hover:from-violet-600 hover:to-purple-600"
      >
        Descargar backup
      </a>
    </div>
  );
}

// ─── Sección: Restaurar backup ────────────────────────────────────────────────

function RestaurarBackup() {
  const [backup, setBackup] = useState<BackupData | null>(null);
  const [nombreArchivo, setNombreArchivo] = useState("");
  const [password, setPassword] = useState("");
  const [confirmado, setConfirmado] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState<FilaResultado[] | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function limpiar() {
    setBackup(null);
    setNombreArchivo("");
    setPassword("");
    setConfirmado(false);
    setErrorMsg(null);
    setResultado(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setNombreArchivo(file.name);
    setErrorMsg(null);
    setResultado(null);
    setBackup(null);
    setConfirmado(false);
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target?.result as string) as BackupData;
        if (!parsed.datos || typeof parsed.datos !== "object") {
          throw new Error("El archivo no tiene el formato esperado.");
        }
        setBackup(parsed);
      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : "No se pudo leer el archivo JSON.");
        if (fileRef.current) fileRef.current.value = "";
        setNombreArchivo("");
      }
    };
    reader.readAsText(file);
  }

  async function handleRestore(e: React.FormEvent) {
    e.preventDefault();
    if (!backup || !confirmado || !password) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/restaurar", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-restore-password": password,
        },
        body: JSON.stringify(backup),
      });
      const data = (await res.json()) as { ok?: boolean; resumen?: FilaResultado[]; error?: string };
      if (!res.ok || !data.ok) {
        setErrorMsg(data.error ?? "Error desconocido al restaurar.");
      } else {
        setResultado(data.resumen ?? []);
        setBackup(null);
        setNombreArchivo("");
        setPassword("");
        setConfirmado(false);
        if (fileRef.current) fileRef.current.value = "";
      }
    } catch {
      setErrorMsg("Error de red. Verificá tu conexión e intentá de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-4">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-amber-300 border-t-amber-600" />
        <p className="text-sm font-medium text-amber-800">Restaurando base de datos… no cierres esta página.</p>
      </div>
    );
  }

  if (resultado) {
    const conError = resultado.filter((r) => r.error_eliminacion || r.error_insercion);
    const totalInsertados = resultado.reduce((s, r) => s + r.insertados, 0);
    const esExitoso = conError.length === 0;
    return (
      <div className={`rounded-xl border p-4 ${esExitoso ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}>
        <div className="flex items-center justify-between gap-3">
          <p className={`text-sm font-semibold ${esExitoso ? "text-emerald-800" : "text-amber-800"}`}>
            {esExitoso ? "✓ Restauración exitosa" : "⚠ Restauración con advertencias"} — {totalInsertados.toLocaleString("es-AR")} registros en {resultado.length} tablas
          </p>
          <button type="button" onClick={limpiar} className="text-xs font-medium text-violet-600 hover:underline">
            Nueva restauración
          </button>
        </div>
      </div>
    );
  }

  const totalRegistros = backup ? Object.values(backup.datos).reduce((s, arr) => s + arr.length, 0) : 0;

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-amber-800">
        Cargá un archivo de backup para restaurar todos los datos. <span className="font-semibold text-red-700">Esta acción reemplaza los datos existentes.</span>
      </p>

      {/* Seleccionar archivo */}
      <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-amber-300 bg-amber-50/50 px-4 py-6 text-center transition hover:bg-amber-50">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5-5m0 0l5 5m-5-5v12" />
        </svg>
        <span className="text-sm font-medium text-amber-700">
          {nombreArchivo ? nombreArchivo : "Seleccioná un archivo backup.json"}
        </span>
        <input ref={fileRef} type="file" accept=".json,application/json" onChange={handleFile} className="sr-only" />
      </label>

      {errorMsg && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{errorMsg}</p>
      )}

      {backup && (
        <form onSubmit={handleRestore} className="flex flex-col gap-3">
          <div className="rounded-lg border border-amber-200 bg-white px-4 py-3 text-sm text-amber-800">
            <span className="font-semibold">Exportado:</span> {formatFecha(backup.exportado_en)} por {backup.exportado_por} ·{" "}
            <span className="font-semibold">{totalRegistros.toLocaleString("es-AR")}</span> registros en {backup.tablas.length} tablas
          </div>

          <div>
            <label className="text-sm font-medium text-amber-900" htmlFor="cfg-restore-pw">
              Contraseña de restauración
            </label>
            <input
              id="cfg-restore-pw"
              type="password"
              required
              autoComplete="off"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-400/40"
            />
          </div>

          <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-red-200 bg-red-50/60 px-3 py-3">
            <input
              type="checkbox"
              checked={confirmado}
              onChange={(e) => setConfirmado(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-red-300 text-red-600"
            />
            <span className="text-sm text-red-800 leading-snug">
              Entiendo que esta acción <strong>reemplaza permanentemente</strong> todos los datos actuales con los del backup.
            </span>
          </label>

          <div className="flex justify-end gap-2">
            <button type="button" onClick={limpiar} className="rounded-lg border border-amber-200 px-4 py-2 text-sm font-medium text-amber-800 hover:bg-amber-50">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!confirmado || !password}
              className="rounded-lg bg-gradient-to-r from-red-600 to-rose-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:from-red-500 hover:to-rose-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Restaurar datos
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

// ─── Sección: Purgar clientes inactivos ───────────────────────────────────────

function PurgarInactivos() {
  const [cargando, setCargando] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [resultado, setResultado] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirmar() {
    setCargando(true);
    setError(null);
    const res = await purgarClientesInactivos();
    setCargando(false);
    setConfirmando(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    const r = res.resultado;
    setResultado(
      r.clientes === 0
        ? "No había clientes inactivos para purgar."
        : `Purgados: ${r.clientes} cliente${r.clientes !== 1 ? "s" : ""}, ${r.ventas} venta${r.ventas !== 1 ? "s" : ""}, ${r.cobros} cobro${r.cobros !== 1 ? "s" : ""}.`,
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm text-red-800">
            Eliminá permanentemente todos los clientes que fueron marcados como inactivos (eliminados), junto con sus ventas y cobros asociados.
          </p>
          <p className="mt-1 text-xs text-red-500">
            Esta acción no se puede deshacer. Se recomienda exportar un backup antes.
          </p>
        </div>
        <button
          type="button"
          disabled={cargando}
          onClick={() => { setResultado(null); setError(null); setConfirmando(true); }}
          className="shrink-0 rounded-xl border border-red-300 bg-white px-5 py-2.5 text-sm font-semibold text-red-600 shadow-sm transition hover:bg-red-50 disabled:opacity-50"
        >
          Purgar inactivos
        </button>
      </div>

      {confirmando && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-4">
          <p className="text-sm font-semibold text-red-900">¿Confirmar purga de clientes inactivos?</p>
          <p className="mt-1 text-xs text-red-700">Se eliminarán permanentemente sus ventas y cobros. Esta acción no se puede deshacer.</p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => setConfirmando(false)}
              className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={cargando}
              onClick={handleConfirmar}
              className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-500 disabled:opacity-50"
            >
              {cargando ? "Purgando…" : "Sí, purgar"}
            </button>
          </div>
        </div>
      )}

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>
      )}

      {resultado && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
          <p className="text-sm font-medium text-emerald-800">{resultado}</p>
          <button type="button" onClick={() => setResultado(null)} className="text-emerald-600 hover:text-emerald-800">✕</button>
        </div>
      )}
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function ConfiguracionClient() {
  return (
    <div className="mx-auto w-full max-w-[88rem]">
      {/* Header */}
      <header className="mb-8 overflow-hidden rounded-2xl border border-violet-200/70 bg-gradient-to-br from-violet-50 via-white to-purple-50/40 shadow-md shadow-violet-900/8 ring-1 ring-violet-100">
        <div className="relative px-6 py-5">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_100%_0%,_theme(colors.violet.200/35),_transparent)]" />
          <div className="relative flex items-center gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-700 to-purple-800 text-white shadow-lg shadow-violet-900/30">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </span>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-violet-500">Sistema</p>
              <h1 className="text-2xl font-bold tracking-tight text-violet-950">Configuración</h1>
              <p className="mt-0.5 max-w-xl text-sm text-violet-700/70">Backups y mantenimiento de datos.</p>
            </div>
          </div>
        </div>
      </header>

      <div className="flex flex-col gap-6">
        {/* Exportar backup */}
        <SectionCard
          title="Exportar backup"
          description="Descargá un archivo JSON con todos los datos actuales."
          accent="violet"
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5m0 0l5-5m-5 5V4" />
            </svg>
          }
        >
          <ExportarBackup />
        </SectionCard>

        {/* Restaurar backup */}
        <SectionCard
          title="Restaurar backup"
          description="Cargá un archivo de backup para restaurar los datos de la base."
          accent="amber"
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5-5m0 0l5 5m-5-5v12" />
            </svg>
          }
        >
          <RestaurarBackup />
        </SectionCard>

        {/* Purgar clientes inactivos */}
        <SectionCard
          title="Purgar clientes inactivos"
          description="Eliminá permanentemente los clientes inactivos y todos sus datos asociados."
          accent="red"
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          }
        >
          <PurgarInactivos />
        </SectionCard>
      </div>
    </div>
  );
}
