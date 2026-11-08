"use client"

import React from "react"
import { useRouter } from "next/navigation"
import { Activity, PanelLeftClose, X } from "lucide-react"

/**
 * Encabezado de la barra lateral con branding SYNAPSE y botones de colapso/cierre
 * Diseñado con transiciones fluidas de opacidad y ancho para evitar saltos visuales.
 */
export function SidebarHeader({
  isCollapsed,
  setIsCollapsed,
  setIsOpenMobile,
  isMobileDrawer = false,
}) {
  const router = useRouter()

  const handleLogoClick = () => {
    router.push("/dashboard")
    if (setIsOpenMobile) setIsOpenMobile(false)
  }

  return (
    <div className="h-14 flex items-center justify-between px-3.5 border-b border-[#142335] flex-shrink-0 bg-[#070c14]/90 overflow-hidden">
      <div
        onClick={handleLogoClick}
        className="flex items-center cursor-pointer overflow-hidden group select-none min-w-0"
        title="Synapse Terminal"
      >
        {/* Logo fijo anclado */}
        <div className="w-8 h-8 rounded-lg bg-[#00f5c4]/10 border border-[#00f5c4]/40 flex items-center justify-center text-[#00f5c4] shadow-[0_0_12px_rgba(0,245,196,0.3)] flex-shrink-0 group-hover:scale-105 transition-transform duration-200">
          <Activity className="w-4.5 h-4.5 animate-pulse" />
        </div>

        {/* Texto con desvanecimiento y deslizamiento suave */}
        <div
          className={`overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${
            isCollapsed && !isMobileDrawer
              ? "opacity-0 max-w-0 -translate-x-2 pointer-events-none"
              : "opacity-100 max-w-[150px] translate-x-0 ml-2.5"
          }`}
        >
          <span className="font-extrabold tracking-wider text-white text-base whitespace-nowrap block">
            SYNAPSE
          </span>
        </div>
      </div>

      {/* Botón de colapso en desktop con desvanecimiento fluido */}
      {!isMobileDrawer && (
        <button
          type="button"
          onClick={() => setIsCollapsed(true)}
          title="Colapsar menú lateral (Ctrl+B)"
          aria-label="Colapsar menú lateral"
          className={`hidden lg:flex w-7 h-7 items-center justify-center rounded-md text-slate-400 hover:text-[#00f5c4] hover:bg-[#00f5c4]/10 transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] flex-shrink-0 ${
            isCollapsed
              ? "opacity-0 pointer-events-none scale-75 max-w-0 p-0 overflow-hidden"
              : "opacity-100 scale-100 ml-1"
          }`}
        >
          <PanelLeftClose className="w-4 h-4 flex-shrink-0" />
        </button>
      )}

      {/* Botón de cierre en mobile */}
      {setIsOpenMobile && (
        <button
          type="button"
          onClick={() => setIsOpenMobile(false)}
          aria-label="Cerrar menú lateral"
          className="flex lg:hidden w-8 h-8 items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-white/10 active:scale-95 transition-all"
        >
          <X className="w-4.5 h-4.5" />
        </button>
      )}
    </div>
  )
}
