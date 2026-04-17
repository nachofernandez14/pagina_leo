"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { LogoutButton } from "@/components/logout-button";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

// ─── Iconos SVG inline ────────────────────────────────────────────────────────

function Icon({ path, path2 }: { path: string; path2?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="h-5 w-5 shrink-0"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.8}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d={path} />
      {path2 && <path strokeLinecap="round" strokeLinejoin="round" d={path2} />}
    </svg>
  );
}

function MaterialIcon({ path }: { path: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="h-5 w-5 shrink-0"
      viewBox="0 -960 960 960"
      fill="currentColor"
    >
      <path d={path} />
    </svg>
  );
}

// ─── Ítems de navegación ──────────────────────────────────────────────────────

const NAV_ITEMS = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: (
      <Icon path="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    ),
  },
  {
    href: "/ventas-diarias",
    label: "Ventas diarias",
    icon: (
      <MaterialIcon path="M447.67-120v-84.67Q392-215.33 354.83-249q-37.16-33.67-53.83-88.33l62-25.34q16.33 48 47.5 72t77.17 24q45.66 0 75.83-22.16Q593.67-311 593.67-352T568-415.83Q542.33-438.67 465-464q-76.67-24.33-111-62.17Q319.67-564 319.67-620q0-58.33 37.66-95 37.67-36.67 90.34-41.67V-840h66.66v83.33q46.67 6 79.17 31.84Q626-699 642.33-660l-62 26.67q-13.33-32-36.33-47t-61-15q-45.33 0-71 20.5t-25.67 54.16q0 36.34 30 58.34T525-516.67q68.33 20.67 101.83 61.5 33.5 40.84 33.5 99.84 0 65.66-38.66 103.66-38.67 38-107.34 48.34V-120h-66.66Z" />
    ),
  },
  {
    href: "/pagos-diarios",
    label: "Pagos diarios",
    icon: (
      <MaterialIcon path="M546.67-426.67q-50 0-85-35t-35-85q0-50 35-85t85-35q50 0 85 35t35 85q0 50-35 85t-85 35ZM240-293.33q-27.5 0-47.08-19.59-19.59-19.58-19.59-47.08v-373.33q0-27.5 19.59-47.09Q212.5-800 240-800h613.33q27.5 0 47.09 19.58Q920-760.83 920-733.33V-360q0 27.5-19.58 47.08-19.59 19.59-47.09 19.59H240ZM333.33-360H760q0-39 27.17-66.17 27.16-27.16 66.16-27.16V-640q-39 0-66.16-27.17Q760-694.33 760-733.33H333.33q0 39-27.16 66.16Q279-640 240-640v186.67q39 0 66.17 27.16Q333.33-399 333.33-360ZM800-160H106.67q-27.5 0-47.09-19.58Q40-199.17 40-226.67V-680h66.67v453.33H800V-160ZM240-360v-373.33V-360Z" />
    ),
  },
  {
    href: "/productos",
    label: "Productos",
    icon: (
      <MaterialIcon path="M186.67-80q-27.5 0-47.09-19.58Q120-119.17 120-146.67V-619q-17.33-7.67-28.67-23.76Q80-658.85 80-680v-133.33q0-27.5 19.58-47.09Q119.17-880 146.67-880h666.66q27.5 0 47.09 19.58Q880-840.83 880-813.33V-680q0 21.15-11.33 37.24Q857.33-626.67 840-619v472.33q0 27.5-19.58 47.09Q800.83-80 773.33-80H186.67Zm0-533.33v466.66h586.66v-466.66H186.67Zm-40-66.67h666.66v-133.33H146.67V-680ZM360-413.33h240V-480H360v66.67ZM480-380Z" />
    ),
  },
  {
    href: "/saldos",
    label: "Clientes",
    icon: (
      <MaterialIcon path="M371.33-525.33Q326.67-570 326.67-634t44.66-108.67Q416-787.33 480-787.33t108.67 44.66Q633.33-698 633.33-634t-44.66 108.67Q544-480.67 480-480.67t-108.67-44.66ZM160-160v-100q0-34.67 17.67-63.17 17.66-28.5 49-42.83 60-28 123.5-44.33 63.5-16.34 129.83-16.34 66.33 0 129.5 16.67t123.17 44Q764-351.67 782-323.17T800-260v100H160Zm381.5-412.5q25.17-25.17 25.17-61.5t-25.17-61.5q-25.17-25.17-61.5-25.17t-61.5 25.17q-25.17 25.17-25.17 61.5t25.17 61.5q25.17 25.17 61.5 25.17t61.5-25.17ZM640-332.67v106h93.33V-260q0-15-7.66-27-7.67-12-21-19-16-8-32.17-14.5T640-332.67ZM386.67-351v57.67h186.66V-351Q550-355.67 527-357.83 504-360 480-360t-47 2.17q-23 2.16-46.33 6.83Zm-160 124.33H320v-106.66q-16.33 5.66-32.83 12.5-16.5 6.83-32.5 14.83-13.34 7-20.67 19-7.33 12-7.33 27v33.33Zm413.33 0H320h320ZM480-634Z" />
    ),
  },
  {
    href: "/proveedores",
    label: "Proveedores",
    icon: (
      <MaterialIcon path="m127.33-80-47-47.67 113.67-113q-29.67-29.66-45.17-66.66t-15.5-76.34q0-39 14.34-74 14.33-35 41.66-61.66l52.34-51.34L275-538q2.33-34.67 16.33-66.33 14-31.67 39-56l52.34-51.34L416-679q2.33-34.67 16.83-66.33 14.5-31.67 38.84-56L583-911.67 629.67-865l-58 59 4.66 4.67q25 24.33 39 56 14 31.66 16.34 67L832-878.67l46.67 47L680-631.33q34.67 2.33 66 16.66 31.33 14.34 56.33 39.34l5.34 4.66 58-59 47 47-109.34 110.34Q778.33-447 746-432.5t-67.67 16.83l33.34 33-51.34 51.34q-25 25-56.83 39.5T537-275l33.67 33.33-52.34 52.34q-27 27.66-62.5 41.83-35.5 14.17-74.16 14.17-34.67 0-68.84-15.5-34.16-15.5-69.5-46.84L127.33-80Zm114.34-209.33q20.33-19.67 31-43.84 10.66-24.16 10.66-49.5 0-25-10.66-49.16Q262-456 241.67-477q-21 21-31.84 45.17Q199-407.67 199-382.67q0 25.34 10.83 49.5 10.84 24.17 31.84 43.84Zm141 90.33q25.33-.33 49.33-11t45-31.67q-21-20.33-45.17-31-24.16-10.66-49.16-10.66-25 0-49.17 10.83t-45.17 31.83q20.34 20.34 44.67 31Q357.33-199 382.67-199Zm0-230.67q20.33-21 31-45 10.66-24 10.66-49 0-25.33-10.66-49.66-10.67-24.34-31-44-21 19.66-31.84 44Q340-549 340-523.67q0 25 10.83 49 10.84 24 31.84 45Zm142 89.67q25.33 0 49.16-10.83 23.84-10.84 43.5-31.84-19.66-20.33-43.5-31-23.83-10.66-49.16-10.66-25.34 0-49.67 10.83-24.33 10.83-44.67 31.83 20.34 20.34 44.67 31Q499.33-340 524.67-340ZM524-570.67q20.33-20.33 30.83-44.66 10.5-24.34 10.5-49.67 0-25-10.16-49.5Q545-739 524.67-760q-21 21-31.84 45.17Q482-690.67 482-665.67q0 25.34 10.83 49.67 10.84 24.33 31.17 45.33Zm141.67 89.34q25 0 49.16-11.17Q739-503.67 760-524.67q-21.33-20.33-45.83-31-24.5-10.66-49.5-10.66-25 .33-48.67 11-23.67 10.66-44.67 31.66 21 21 45.17 31.84 24.17 10.83 49.17 10.5Z" />
    ),
  },
  {
    href: "/campo",
    label: "Campo",
    icon: (
      <MaterialIcon path="M150-599.33q-13.32 0-22.33-9.84-9-9.83-9-23.5 0-13.66 9-23.5Q136.68-666 150-666h139.33q27.78 0 47.56 19.5T360-599.33H150Zm83.25 372.66q52.75 0 89.75-36.92t37-89.66Q360-406 323.08-443t-89.67-37q-52.74 0-89.74 36.92-37 36.92-37 89.67 0 52.74 36.92 89.74 36.92 37 89.66 37Zm599.58-20.38q20.5-20.38 20.5-49.5t-20.38-49.62q-20.38-20.5-49.5-20.5t-49.62 20.39q-20.5 20.38-20.5 49.5 0 29.11 20.39 49.61 20.38 20.5 49.5 20.5 29.11 0 49.61-20.38Zm-599.42-39.62q-27.74 0-47.24-19.42-19.5-19.42-19.5-47.16 0-27.75 19.42-47.25t47.16-19.5q27.75 0 47.25 19.42t19.5 47.17q0 27.74-19.42 47.24-19.42 19.5-47.17 19.5Zm573.26-145q21.33 5 35.33 11.84 14 6.83 31.33 21.16v-254q0-28.33-19.16-47.5-19.17-19.16-47.5-19.16H541.33l-46.66-47.34 60-60L533.33-848 392-706.67l22 22L473.33-744 520-698.24V-598q0 38.78-26.83 66.39Q466.33-504 427.33-504h-73q19 15 30 29.67 11 14.66 23.67 37h19.33q65.34 0 112.34-47.67t47-113v-54.67h220v221ZM649-320q6-23.67 13.17-37.5 7.16-13.83 21.16-29.83H424q2.67 19.66 2.67 33.66 0 14-2.67 33.67h225Zm134.67 160q-57 0-97-39.44t-40-95.23q0-57.44 40.61-98.05t98.05-40.61q55.79 0 95.23 40.02Q920-353.29 920-296.67q0 57.34-39.67 97Q840.67-160 783.67-160ZM232-160q-80.33 0-136.17-56.55Q40-273.1 40-353.33q0-80.24 56.5-136.79t136.76-56.55q80.27 0 136.84 56.57 56.57 56.57 56.57 136.84 0 80.26-56.5 136.76Q313.67-160 232-160Zm393.67-360Z" />
    ),
  },
  {
    href: "/cheques",
    label: "Cheques",
    icon: (
      <Icon path="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    ),
  },
] as const;

// ─── Iconos de control ────────────────────────────────────────────────────────

function ChevronLeft() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
    </svg>
  );
}

function ChevronRight() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
    </svg>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

type AppSidebarProps = {
  userEmail: string;
};

// ─── Componente ───────────────────────────────────────────────────────────────

export function AppSidebar({ userEmail }: AppSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Cerrar drawer al navegar en mobile
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Bloquear scroll del body cuando el drawer mobile está abierto
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  const sidebarContent = (isMobile: boolean) => (
    <>
      {/* Área del logo */}
      <div
        className={`flex flex-col items-center gap-2 border-b border-white/15 transition-all duration-300 ${
          collapsed && !isMobile ? "px-2 py-4" : "px-4 py-5"
        }`}
      >
        {collapsed && !isMobile ? (
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 text-sm font-bold text-white">
            L
          </div>
        ) : (
          <>
            <Image
              src="/images/logo_leo.png"
              alt="Logo"
              width={200}
              height={100}
              className="h-auto w-44 object-contain"
              priority
            />
            <p
              className="max-w-full truncate text-center text-[11px] text-violet-100/80"
              title={userEmail}
            >
              {userEmail}
            </p>
          </>
        )}
      </div>

      {/* Nav */}
      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-2" aria-label="Secciones">
        {NAV_ITEMS.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed && !isMobile ? item.label : undefined}
              className={`flex items-center gap-3 rounded-lg py-2.5 text-sm font-medium transition-colors ${
                collapsed && !isMobile
                  ? "justify-center px-2"
                  : "px-3"
              } ${
                active
                  ? "bg-white/20 text-white shadow-sm ring-1 ring-white/25"
                  : "text-violet-100/90 hover:bg-white/10 hover:text-white"
              }`}
            >
              {item.icon}
              {(!collapsed || isMobile) && (
                <span className="truncate">{item.label}</span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Botón contraer (solo desktop) */}
      {!isMobile && (
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          title={collapsed ? "Expandir" : "Contraer"}
          className="mx-2 mb-2 flex items-center gap-2 rounded-lg border border-white/15 px-3 py-2 text-xs font-medium text-violet-200/80 transition hover:bg-white/10 hover:text-white"
        >
          {collapsed ? <ChevronRight /> : <><ChevronLeft /><span>Contraer</span></>}
        </button>
      )}

      {/* Backup + Restaurar + Logout */}
      <div className="border-t border-white/15 p-2 flex flex-col gap-1">
        {collapsed && !isMobile ? (
          <>
            <a
              href="/api/backup"
              download
              title="Exportar backup"
              className="flex w-full items-center justify-center rounded-lg py-2.5 text-violet-200/80 transition hover:bg-white/10 hover:text-white"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5m0 0l5-5m-5 5V4" />
              </svg>
            </a>
            <a
              href="/restaurar"
              title="Restaurar backup"
              className="flex w-full items-center justify-center rounded-lg py-2.5 text-violet-200/80 transition hover:bg-white/10 hover:text-white"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5-5m0 0l5 5m-5-5v12" />
              </svg>
            </a>
            <button
              type="button"
              onClick={handleLogout}
              title="Cerrar sesión"
              className="flex w-full items-center justify-center rounded-lg py-2.5 text-violet-200/80 transition hover:bg-white/10 hover:text-white"
            >
              <LogoutIcon />
            </button>
          </>
        ) : (
          <>
            <a
              href="/api/backup"
              download
              className="flex items-center gap-2 rounded-lg border border-white/15 px-3 py-2 text-xs font-medium text-violet-200/80 transition hover:bg-white/10 hover:text-white"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5m0 0l5-5m-5 5V4" />
              </svg>
              <span>Exportar backup</span>
            </a>
            <a
              href="/restaurar"
              className="flex items-center gap-2 rounded-lg border border-white/15 px-3 py-2 text-xs font-medium text-violet-200/80 transition hover:bg-white/10 hover:text-white"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5-5m0 0l5 5m-5-5v12" />
              </svg>
              <span>Restaurar backup</span>
            </a>
            <LogoutButton />
          </>
        )}
      </div>

      {/* Crédito */}
      {(!collapsed || isMobile) && (
        <p className="px-3 pb-3 text-center text-[10px] text-violet-300/50">
          Desarrollado por B&amp;B · 2026
        </p>
      )}
    </>
  );

  return (
    <>
      {/* ── Topbar mobile (en flujo, NO fixed — evita bug de touch en iOS) ── */}
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-violet-950/40 bg-gradient-to-r from-violet-800 to-purple-950 px-4 shadow-md md:hidden">
        <button
          type="button"
          onClick={() => setMobileOpen((o) => !o)}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-white/10 text-white transition hover:bg-white/20 touch-manipulation"
          aria-label={mobileOpen ? "Cerrar menú" : "Abrir menú"}
        >
          {mobileOpen ? <XIcon /> : <MenuIcon />}
        </button>
        <Image
          src="/images/logo_leo.png"
          alt="Logo"
          width={160}
          height={80}
          className="h-10 w-auto object-contain"
          priority
        />
      </header>

      {/* ── Overlay mobile ───────────────────────────────────────────────── */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-violet-950/70 backdrop-blur-sm md:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ── Sidebar desktop (en el flujo flex, solo visible en md+) ─────── */}
      <aside
        className={`hidden md:flex flex-col shrink-0 sticky top-0 h-screen border-r border-violet-950/40 bg-gradient-to-b from-violet-700 via-violet-800 to-purple-950 text-white shadow-lg shadow-violet-950/30 transition-all duration-300 ${
          collapsed ? "w-[4.5rem]" : "w-64"
        }`}
      >
        {sidebarContent(false)}
      </aside>

      {/* ── Drawer mobile (fuera del flujo, fixed) ───────────────────────── */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-violet-950/40 bg-gradient-to-b from-violet-700 via-violet-800 to-purple-950 text-white shadow-xl shadow-violet-950/40 transition-transform duration-300 md:hidden ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {sidebarContent(true)}
      </aside>
    </>
  );
}

