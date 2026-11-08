"use client"

import React from "react"
import { useRouter } from "next/navigation"
import { LayoutDashboard, Newspaper, ArrowLeftRight } from "lucide-react"
import { SidebarTooltip } from "./SidebarTooltip"

/**
 * Navegación principal del espacio de trabajo (Terminal, Noticias, Selector de Activos)
 * Iconos anclados a la izquierda para evitar saltos o sacudidas durante el colapso.
 */
export function SidebarWorkspaceNav({
  isCollapsed,
  onCambiarMoneda,
  setIsOpenMobile,
}) {
  const router = useRouter()

  const handleNav = (path) => {
    router.push(path)
    if (setIsOpenMobile) setIsOpenMobile(false)
  }

  const handleChangeAsset = () => {
    if (onCambiarMoneda) onCambiarMoneda()
    if (setIsOpenMobile) setIsOpenMobile(false)
  }

  return (
    <div className="overflow-hidden">
      {/* Etiqueta de sección con plegado suave */}
      <div
        className={`px-2.5 pb-1 text-[10px] font-bold tracking-[0.2em] text-slate-500 uppercase overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${
          isCollapsed ? "opacity-0 max-h-0 py-0" : "opacity-100 max-h-6"
        }`}
      >
        Espacio de Trabajo
      </div>

      <nav className="space-y-1">
        {/* Terminal (Activo) */}
        <button
          type="button"
          onClick={() => handleNav("/dashboard")}
          className="w-full group relative flex items-center px-2 py-2 rounded-lg text-xs font-semibold transition-all duration-200 bg-[#00f5c4]/10 text-[#00f5c4] border border-[#00f5c4]/30 shadow-[0_0_15px_rgba(0,245,196,0.1)] overflow-hidden"
        >
          <div className="w-8 h-5 flex items-center justify-center flex-shrink-0">
            <LayoutDashboard className="w-4 h-4 text-[#00f5c4]" />
          </div>
          <div
            className={`flex items-center justify-between flex-1 min-w-0 overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${
              isCollapsed
                ? "opacity-0 max-w-0 -translate-x-2 pointer-events-none"
                : "opacity-100 max-w-[200px] translate-x-0 ml-1.5"
            }`}
          >
            <span className="truncate whitespace-nowrap">Terminal</span>
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#00f5c4]/20 text-[#00f5c4] whitespace-nowrap">
              ACTIVO
            </span>
          </div>
          <SidebarTooltip isCollapsed={isCollapsed} label="Terminal de Trading" badge="Activo" />
        </button>

        {/* Noticias del Mercado */}
        <button
          type="button"
          onClick={() => handleNav("/news")}
          className="w-full group relative flex items-center px-2 py-2 rounded-lg text-xs font-semibold text-slate-300 hover:text-cyan-300 hover:bg-[#0c1420] border border-transparent hover:border-[#16283d] transition-all duration-200 overflow-hidden"
        >
          <div className="w-8 h-5 flex items-center justify-center flex-shrink-0">
            <Newspaper className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform duration-200" />
          </div>
          <div
            className={`flex items-center justify-between flex-1 min-w-0 overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${
              isCollapsed
                ? "opacity-0 max-w-0 -translate-x-2 pointer-events-none"
                : "opacity-100 max-w-[200px] translate-x-0 ml-1.5"
            }`}
          >
            <span className="truncate whitespace-nowrap">Noticias</span>
            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 whitespace-nowrap">
              24/7
            </span>
          </div>
          <SidebarTooltip isCollapsed={isCollapsed} label="Noticias del Mercado" badge="En vivo" />
        </button>

        {/* Cambiar Par / Activo */}
        <button
          type="button"
          onClick={handleChangeAsset}
          className="w-full group relative flex items-center px-2 py-2 rounded-lg text-xs font-semibold text-slate-300 hover:text-[#00f5c4] hover:bg-[#0c1420] border border-transparent hover:border-[#16283d] transition-all duration-200 overflow-hidden"
        >
          <div className="w-8 h-5 flex items-center justify-center flex-shrink-0">
            <ArrowLeftRight className="w-4 h-4 text-[#00f5c4] group-hover:rotate-180 transition-transform duration-300" />
          </div>
          <div
            className={`flex items-center flex-1 min-w-0 overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${
              isCollapsed
                ? "opacity-0 max-w-0 -translate-x-2 pointer-events-none"
                : "opacity-100 max-w-[200px] translate-x-0 ml-1.5"
            }`}
          >
            <span className="truncate whitespace-nowrap">Cambiar Activo</span>
          </div>
          <SidebarTooltip isCollapsed={isCollapsed} label="Cambiar Activo / Par" />
        </button>
      </nav>
    </div>
  )
}
