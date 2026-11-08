"use client"

import React from "react"
import { Keyboard, LogIn, LogOut, User, ChevronRight } from "lucide-react"
import { SidebarTooltip } from "./SidebarTooltip"

/**
 * Pie de la barra lateral: Atajos, Sesión de Usuario y Botón para expandir
 * Transiciones de plegado coordinadas y sin parpadeos.
 */
export function SidebarFooter({
  isCollapsed,
  setIsCollapsed,
  isAuthenticated,
  user,
  onOpenLogin,
  onLogout,
  onOpenShortcuts,
}) {
  return (
    <div className="p-2 border-t border-[#142335] bg-[#070c14] flex-shrink-0 space-y-1.5 overflow-hidden select-none">
      {/* Atajos de teclado */}
      <button
        type="button"
        onClick={onOpenShortcuts}
        className="w-full group relative flex items-center px-2 py-1.5 rounded-md text-[11px] font-mono text-slate-400 hover:text-[#00f5c4] hover:bg-[#0c1420] transition-colors duration-200 overflow-hidden"
      >
        <div className="w-8 h-4 flex items-center justify-center flex-shrink-0">
          <Keyboard className="w-3.5 h-3.5" />
        </div>
        <div
          className={`flex items-center justify-between flex-1 min-w-0 overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${
            isCollapsed
              ? "opacity-0 max-w-0 -translate-x-2 pointer-events-none"
              : "opacity-100 max-w-[200px] translate-x-0 ml-1.5"
          }`}
        >
          <span className="whitespace-nowrap">Atajos</span>
          <kbd className="px-1 py-0.2 bg-white/5 border border-white/10 rounded text-[9px] text-slate-400 whitespace-nowrap">
            Ctrl+B
          </kbd>
        </div>
        <SidebarTooltip isCollapsed={isCollapsed} label="Atajos de Teclado" shortcut="Ctrl+B" />
      </button>

      {/* Sección de Usuario */}
      <div className="pt-1 border-t border-[#142335]/60 overflow-hidden">
        {!isAuthenticated ? (
          <button
            type="button"
            onClick={onOpenLogin}
            className="w-full group relative flex items-center px-2 py-1.5 rounded-lg text-xs font-semibold text-[#00f5c4] bg-[#00f5c4]/10 hover:bg-[#00f5c4]/20 border border-[#00f5c4]/30 transition-all duration-200 overflow-hidden"
          >
            <div className="w-8 h-4 flex items-center justify-center flex-shrink-0">
              <LogIn className="w-4 h-4" />
            </div>
            <div
              className={`flex-1 min-w-0 overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${
                isCollapsed
                  ? "opacity-0 max-w-0 -translate-x-2 pointer-events-none"
                  : "opacity-100 max-w-[200px] translate-x-0 ml-1.5"
              }`}
            >
              <span className="whitespace-nowrap font-bold">INICIAR SESIÓN</span>
            </div>
            <SidebarTooltip isCollapsed={isCollapsed} label="Iniciar Sesión" />
          </button>
        ) : (
          <div className="flex items-center px-2 py-1 rounded-lg overflow-hidden group relative">
            <div className="w-8 h-7 flex items-center justify-center flex-shrink-0">
              <div className="w-7 h-7 rounded-full bg-[#00f5c4]/20 border border-[#00f5c4]/50 flex items-center justify-center text-[#00f5c4] font-bold text-xs shadow-[0_0_10px_rgba(0,245,196,0.2)]">
                {user?.username ? (
                  user.username.charAt(0).toUpperCase()
                ) : (
                  <User className="w-3.5 h-3.5" />
                )}
              </div>
            </div>
            <div
              className={`flex items-center justify-between flex-1 min-w-0 overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${
                isCollapsed
                  ? "opacity-0 max-w-0 -translate-x-2 pointer-events-none"
                  : "opacity-100 max-w-[200px] translate-x-0 ml-1.5"
              }`}
            >
              <div className="flex flex-col min-w-0 overflow-hidden">
                <span className="text-xs font-bold text-slate-200 truncate whitespace-nowrap">
                  {user?.username || user?.email?.split("@")[0] || "Trader"}
                </span>
                <span className="text-[9px] font-bold text-[#00f5c4] tracking-wider uppercase whitespace-nowrap">
                  PRO TRADER
                </span>
              </div>
              <button
                type="button"
                onClick={onLogout}
                title="Cerrar sesión"
                className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors ml-1"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
            <SidebarTooltip
              isCollapsed={isCollapsed}
              label={user?.username || "Trader"}
              badge="Pro"
            />
          </div>
        )}
      </div>

      {/* Botón para expandir cuando está colapsado (desktop) */}
      <div
        className={`overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${
          isCollapsed ? "max-h-10 opacity-100 mt-1" : "max-h-0 opacity-0 mt-0 pointer-events-none"
        }`}
      >
        <button
          type="button"
          onClick={() => setIsCollapsed(false)}
          title="Expandir menú lateral (Ctrl+B)"
          aria-label="Expandir menú lateral"
          className="hidden lg:flex w-full py-1.5 items-center justify-center rounded-lg text-slate-400 hover:text-[#00f5c4] hover:bg-[#00f5c4]/10 transition-all border border-transparent hover:border-[#00f5c4]/30"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
