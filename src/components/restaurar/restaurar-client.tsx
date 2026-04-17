"use client";

import { useRef, useState } from "react";

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

export function RestaurarClient() {
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
          throw new Error(
            "El archivo no tiene el formato esperado. ¿Es un backup exportado desde esta app?",
          );
        }
        setBackup(parsed);
      } catch (err) {
        setErrorMsg(
          err instanceof Error ? err.message : "No se pudo leer el archivo JSON.",
        );
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
      const data = (await res.json()) as {
        ok?: boolean;
        resumen?: FilaResultado[];
        error?: string;
      };
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

  const totalRegistros = backup
    ? Object.values(backup.datos).reduce((s, arr) => s + arr.length, 0)
    : 0;

  const puedeRestaurar = !!backup && !!password && confirmado && !loading;

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-5 py-32">
        <div className="h-14 w-14 animate-spin rounded-full border-4 border-violet-200 border-t-violet-600" />
        <div className="text-center">
          <p className="text-lg font-semibold text-violet-900">
            Restaurando base de datos…
          </p>
          <p className="mt-1 text-sm text-violet-500">
            Esto puede tardar unos segundos. No cierres esta página.
          </p>
        </div>
      </div>
    );
  }

  // ── Resultado ─────────────────────────────────────────────────────────────
  if (resultado) {
    const conError = resultado.filter(
      (r) => r.error_eliminacion || r.error_insercion,
    );
    const totalInsertados = resultado.reduce((s, r) => s + r.insertados, 0);
    const esExitoso = conError.length === 0;

    return (
      <div className="mx-auto w-full max-w-2xl">
        <div
          className={`overflow-hidden rounded-2xl border shadow-md ${
            esExitoso
              ? "border-emerald-200 bg-emerald-50"
              : "border-amber-200 bg-amber-50"
          }`}
        >
          <div className="px-6 py-5">
            <div className="flex items-center gap-4">
              <span
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-white shadow-md ${
                  esExitoso ? "bg-emerald-600" : "bg-amber-500"
                }`}
              >
                {esExitoso ? (
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                  </svg>
                )}
              </span>
              <div>
                <h2
                  className={`text-xl font-bold ${
                    esExitoso ? "text-emerald-900" : "text-amber-900"
                  }`}
                >
                  {esExitoso ? "¡Restauración exitosa!" : "Restauración con advertencias"}
                </h2>
                <p
                  className={`text-sm ${
                    esExitoso ? "text-emerald-700" : "text-amber-700"
                  }`}
                >
                  {totalInsertados.toLocaleString("es-AR")} registros restaurados
                  en {resultado.length} tablas
                </p>
              </div>
            </div>
          </div>

          <div className="overflow-hidden border-t border-white/60 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-violet-100 bg-violet-50/80 text-xs text-violet-700">
                  <th className="px-4 py-2.5 text-left font-semibold">Tabla</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Registros</th>
                  <th className="px-4 py-2.5 text-left font-semibold">Estado</th>
                </tr>
              </thead>
              <tbody>
                {resultado.map((r) => {
                  const tieneError = r.error_eliminacion || r.error_insercion;
                  return (
                    <tr
                      key={r.tabla}
                      className="border-b border-violet-50 last:border-0 hover:bg-violet-50/30"
                    >
                      <td className="px-4 py-2.5 font-mono text-xs text-violet-900">
                        {r.tabla}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums font-semibold text-violet-800">
                        {r.insertados}
                      </td>
                      <td className="px-4 py-2.5">
                        {tieneError ? (
                          <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs text-red-700">
                            {r.error_insercion ?? r.error_eliminacion}
                          </span>
                        ) : (
                          <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                            OK
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="px-6 py-4">
            <button
              type="button"
              onClick={limpiar}
              className="rounded-lg border border-violet-200 bg-white px-4 py-2 text-sm font-medium text-violet-800 transition hover:bg-violet-50"
            >
              Restaurar otro archivo
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Formulario principal ──────────────────────────────────────────────────
  return (
    <div className="mx-auto w-full max-w-2xl flex flex-col gap-5">

      {/* Advertencia */}
      <div className="rounded-2xl border border-red-200 bg-red-50 p-4 shadow-sm">
        <div className="flex items-start gap-3">
          <svg
            className="mt-0.5 h-5 w-5 shrink-0 text-red-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
            />
          </svg>
          <div>
            <p className="font-semibold text-red-800">Acción irreversible</p>
            <p className="mt-0.5 text-sm text-red-700">
              Restaurar un backup{" "}
              <strong>eliminará todos los datos actuales</strong> y los
              reemplazará con los del archivo seleccionado. No se puede
              deshacer.
            </p>
          </div>
        </div>
      </div>

      {/* Paso 1 — Archivo */}
      <div className="rounded-2xl border border-violet-200 bg-white p-5 shadow-sm">
        <p className="mb-3 text-sm font-semibold text-violet-950">
          1. Seleccioná el archivo de backup
        </p>
        <label className="flex cursor-pointer items-center gap-3 rounded-xl border-2 border-dashed border-violet-200 bg-violet-50/50 px-4 py-4 transition hover:border-violet-400 hover:bg-violet-50">
          <svg
            className="h-6 w-6 shrink-0 text-violet-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.8}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5-5m0 0l5 5m-5-5v12"
            />
          </svg>
          <div>
            <p className="text-sm font-medium text-violet-800">
              {nombreArchivo || "Elegir archivo .json"}
            </p>
            {!nombreArchivo && (
              <p className="text-xs text-violet-400">
                backup-YYYY-MM-DD_HH-MM.json
              </p>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept=".json,application/json"
            onChange={handleFile}
            className="sr-only"
          />
        </label>
      </div>

      {/* Error de lectura de archivo */}
      {errorMsg && !backup && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMsg}
        </div>
      )}

      {/* Pasos 2, 3, 4 — solo cuando hay backup cargado */}
      {backup && (
        <form onSubmit={handleRestore} className="flex flex-col gap-4">

          {/* Paso 2 — Info del backup */}
          <div className="rounded-2xl border border-violet-200 bg-white p-5 shadow-sm">
            <p className="mb-3 text-sm font-semibold text-violet-950">
              2. Información del backup
            </p>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-2.5 text-sm">
              <dt className="text-violet-400">Exportado el</dt>
              <dd className="font-medium text-violet-900">
                {formatFecha(backup.exportado_en)}
              </dd>
              <dt className="text-violet-400">Exportado por</dt>
              <dd className="truncate font-medium text-violet-900">
                {backup.exportado_por}
              </dd>
              <dt className="text-violet-400">Total de registros</dt>
              <dd className="font-bold text-violet-900">
                {totalRegistros.toLocaleString("es-AR")}
              </dd>
            </dl>
            <div className="mt-4 flex flex-wrap gap-1.5">
              {Object.entries(backup.datos).map(([tabla, rows]) => (
                <span
                  key={tabla}
                  className="rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-medium text-violet-800"
                >
                  {tabla}:{" "}
                  <span className="font-bold">{rows.length}</span>
                </span>
              ))}
            </div>
          </div>

          {/* Paso 3 — Contraseña */}
          <div className="rounded-2xl border border-violet-200 bg-white p-5 shadow-sm">
            <label
              htmlFor="rs-password"
              className="mb-3 block text-sm font-semibold text-violet-950"
            >
              3. Contraseña de restauración
            </label>
            <input
              id="rs-password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Ingresá la contraseña configurada en el servidor"
              autoComplete="off"
              className="w-full rounded-lg border border-violet-200 bg-white px-3 py-2 text-sm text-violet-950 outline-none focus:ring-2 focus:ring-violet-500/40"
            />
          </div>

          {/* Paso 4 — Confirmación */}
          <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 select-none">
            <input
              type="checkbox"
              checked={confirmado}
              onChange={(e) => setConfirmado(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-red-600"
            />
            <p className="text-sm text-red-800">
              Entiendo que esta acción{" "}
              <strong>eliminará todos los datos actuales</strong> y los
              reemplazará con los del backup del{" "}
              <strong>{formatFecha(backup.exportado_en)}</strong>. Esta
              acción no se puede deshacer.
            </p>
          </label>

          {errorMsg && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {errorMsg}
            </div>
          )}

          <button
            type="submit"
            disabled={!puedeRestaurar}
            className="rounded-xl bg-red-600 px-6 py-3 text-sm font-bold text-white shadow-md shadow-red-900/20 transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Restaurar base de datos
          </button>
        </form>
      )}
    </div>
  );
}
