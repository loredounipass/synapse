"use client"

import React from "react"
import { Bot, Sparkles, BarChart3, Sliders, Bell, Briefcase } from "lucide-react"
import { SidebarTooltip } from "./SidebarTooltip"

/**
 * Navegación secundaria: Herramientas de análisis, Woody AI, Velas, Osciladores y Modales
 * Transiciones suaves de ancho y opacidad para evitar distorsión o saltos de iconos.
 */
export function SidebarToolsNav({
  isCollapsed,
  onTriggerWoodyChat,
  onScrollTo,
  onOpenAlerts,
  onOpenPortfolio,
  activeAlertsCount = 0,
}) {
  return (
    <div className="overflow-hidden">
      {/* Etiqueta de sección con plegado suave */}
      <div
        className={`px-2.5 pb-1 text-[10px] font-bold tracking-[0.2em] text-slate-500 uppercase overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${isCollapsed ? "opacity-0 max-h-0 py-0" : "opacity-100 max-h-6"
          }`}
      >
        Herramientas & IA
      </div>

      <nav className="space-y-1">
        {/* Woody AI Agent */}
        <button
          type="button"
          onClick={onTriggerWoodyChat}
          className="w-full group relative flex items-center px-2 py-2 rounded-lg text-xs font-semibold text-amber-300 hover:text-amber-200 bg-amber-500/5 hover:bg-amber-500/10 border border-amber-500/20 transition-all duration-200 overflow-hidden"
        >
          <div className="w-8 h-5 flex items-center justify-center flex-shrink-0">
            <Bot className="w-4 h-4 text-amber-400 animate-pulse" />
          </div>
          <div
            className={`flex items-center justify-between flex-1 min-w-0 overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${isCollapsed
                ? "opacity-0 max-w-0 -translate-x-2 pointer-events-none"
                : "opacity-100 max-w-[200px] translate-x-0 ml-1.5"
              }`}
          >
            <span className="truncate whitespace-nowrap">Woody Agent</span>
            <span className="flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-300 whitespace-nowrap">
              <Sparkles className="w-2.5 h-2.5" /> IA
            </span>
          </div>
          <SidebarTooltip isCollapsed={isCollapsed} label="Woody AI Agent" badge="En línea" />
        </button>

        {/* Salto a Gráfica de Velas */}
        <button
          type="button"
          onClick={() => onScrollTo("candle-chart-section")}
          className="w-full group relative flex items-center px-2 py-2 rounded-lg text-xs font-semibold text-slate-300 hover:text-[#00f5c4] hover:bg-[#0c1420] border border-transparent hover:border-[#16283d] transition-all duration-200 overflow-hidden"
        >
          <div className="w-8 h-5 flex items-center justify-center flex-shrink-0">
            <BarChart3 className="w-4 h-4 text-emerald-400" />
          </div>
          <div
            className={`flex items-center flex-1 min-w-0 overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${isCollapsed
                ? "opacity-0 max-w-0 -translate-x-2 pointer-events-none"
                : "opacity-100 max-w-[200px] translate-x-0 ml-1.5"
              }`}
          >
            <span className="truncate whitespace-nowrap">Gráfica de Velas</span>
          </div>
          <SidebarTooltip isCollapsed={isCollapsed} label="Gráfica de Velas" />
        </button>

        {/* Salto a Indicadores */}
        <button
          type="button"
          onClick={() => onScrollTo("indicators-section")}
          className="w-full group relative flex items-center px-2 py-2 rounded-lg text-xs font-semibold text-slate-300 hover:text-[#00f5c4] hover:bg-[#0c1420] border border-transparent hover:border-[#16283d] transition-all duration-200 overflow-hidden"
        >
          <div className="w-8 h-5 flex items-center justify-center flex-shrink-0">
            <Sliders className="w-4 h-4 text-[#00f5c4]" />
          </div>
          <div
            className={`flex items-center flex-1 min-w-0 overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${isCollapsed
                ? "opacity-0 max-w-0 -translate-x-2 pointer-events-none"
                : "opacity-100 max-w-[200px] translate-x-0 ml-1.5"
              }`}
          >
            <span className="truncate whitespace-nowrap">Osciladores & Zonas</span>
          </div>
          <SidebarTooltip isCollapsed={isCollapsed} label="Osciladores & Indicadores" />
        </button>

        {/* Alertas Setup (Modal) */}
        <button
          type="button"
          onClick={onOpenAlerts}
          className="w-full group relative flex items-center px-2 py-2 rounded-lg text-xs font-semibold text-slate-300 hover:text-yellow-300 hover:bg-[#0c1420] border border-transparent hover:border-[#16283d] transition-all duration-200 overflow-hidden"
        >
          <div className="w-8 h-5 flex items-center justify-center flex-shrink-0">
            <Bell className="w-4 h-4 text-yellow-400" />
          </div>
          <div
            className={`flex items-center justify-between flex-1 min-w-0 overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${isCollapsed
                ? "opacity-0 max-w-0 -translate-x-2 pointer-events-none"
                : "opacity-100 max-w-[200px] translate-x-0 ml-1.5"
              }`}
          >
            <span className="truncate whitespace-nowrap">Alertas Setup</span>
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-yellow-400/20 text-yellow-300 whitespace-nowrap">
              {activeAlertsCount}
            </span>
          </div>
          <SidebarTooltip
            isCollapsed={isCollapsed}
            label="Alertas Setup"
            badge={`${activeAlertsCount} activas`}
          />
        </button>

        {/* Portafolio Demo (Modal) */}
        <button
          type="button"
          onClick={onOpenPortfolio}
          className="w-full group relative flex items-center px-2 py-2 rounded-lg text-xs font-semibold text-slate-300 hover:text-emerald-300 hover:bg-[#0c1420] border border-transparent hover:border-[#16283d] transition-all duration-200 overflow-hidden"
        >
          <div className="w-8 h-5 flex items-center justify-center flex-shrink-0">
            <Briefcase className="w-4 h-4 text-emerald-400" />
          </div>
          <div
            className={`flex items-center justify-between flex-1 min-w-0 overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${isCollapsed
                ? "opacity-0 max-w-0 -translate-x-2 pointer-events-none"
                : "opacity-100 max-w-[200px] translate-x-0 ml-1.5"
              }`}
          >
            <span className="truncate whitespace-nowrap">Portafolio Demo</span>
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 whitespace-nowrap">
              +$1.2k
            </span>
          </div>
          <SidebarTooltip isCollapsed={isCollapsed} label="Portafolio Demo" badge="+$1,230" />
        </button>
      </nav>
    </div>
  )
}
