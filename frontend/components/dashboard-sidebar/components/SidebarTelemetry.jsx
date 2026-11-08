"use client"

import React from "react"
import { SidebarTooltip } from "./SidebarTooltip"

/**
 * Indicador de telemetría en tiempo real: estado del feed, proveedor activo y latencia
 * El punto radar se mantiene siempre firme y centrado en el espacio izquierdo.
 */
export function SidebarTelemetry({ isCollapsed, market, provider }) {
  const providerLabel = market === "stock" ? "ALPACA" : (provider || "COINBASE").toUpperCase()

  return (
    <div className="h-9 px-3.5 border-b border-[#142335] bg-[#09111b]/60 flex items-center flex-shrink-0 overflow-hidden group relative select-none">
      {/* Radar dot anclado fijamente */}
      <div className="w-8 flex items-center justify-center flex-shrink-0">
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00f5c4] opacity-75" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#00f5c4]" />
        </span>
      </div>

      {/* Contenido textual con fade y collapse suave */}
      <div
        className={`flex items-center justify-between flex-1 min-w-0 overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${
          isCollapsed
            ? "opacity-0 max-w-0 -translate-x-2 pointer-events-none"
            : "opacity-100 max-w-[200px] translate-x-0 ml-1.5"
        }`}
      >
        <span className="text-[10px] font-mono font-semibold text-[#00f5c4] tracking-wider whitespace-nowrap">
          LIVE FEED
        </span>
        <div className="flex items-center gap-1.5 text-slate-400 whitespace-nowrap">
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#101b2b] text-cyan-300 uppercase font-bold border border-[#1b2b3d]">
            {providerLabel}
          </span>
          <span className="text-[9px] text-slate-400 font-medium">18ms</span>
        </div>
      </div>

      <SidebarTooltip
        isCollapsed={isCollapsed}
        label="Telemetría en Vivo"
        badge={`${providerLabel} • 18ms`}
      />
    </div>
  )
}
