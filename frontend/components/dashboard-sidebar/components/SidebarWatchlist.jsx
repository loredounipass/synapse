"use client"

import React from "react"
import CoinLogo from "@/components/CoinLogo"
import { DEFAULT_WATCHLIST } from "../constants"
import { formatWatchlistPrice } from "../utils"
import { SidebarTooltip } from "./SidebarTooltip"

/**
 * Sección de Top Mercados (Watchlist rápido con cotizaciones en vivo)
 * Transiciones de plegado sin salto de los logos de activos.
 */
export function SidebarWatchlist({
  isCollapsed,
  moneda,
  datos,
  livePrices,
  active24hChange,
  onSelectAsset,
}) {
  return (
    <div className="overflow-hidden">
      {/* Etiqueta de sección con plegado suave */}
      <div
        className={`flex items-center justify-between px-2.5 pb-1 text-[10px] font-bold tracking-[0.2em] text-slate-500 uppercase overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${
          isCollapsed ? "opacity-0 max-h-0 py-0" : "opacity-100 max-h-6"
        }`}
      >
        <span>Mercados Top</span>
        <span className="text-[9px] text-[#00f5c4] font-medium lowercase">watchlist</span>
      </div>

      <div className="space-y-1">
        {DEFAULT_WATCHLIST.map((item) => {
          const isCurrent = moneda?.symbol === item.symbol
          const currentLive = livePrices[item.symbol]

          // 1. Precio en tiempo real (prioriza datos.precio si es el activo seleccionado)
          const displayPrice = isCurrent && datos?.precio
            ? formatWatchlistPrice(datos.precio, datos.decimales)
            : currentLive?.price || item.price

          // 2. Variación 24h real
          const isPositiveChange = isCurrent && active24hChange !== null
            ? active24hChange >= 0
            : currentLive?.isPositive !== undefined
            ? currentLive.isPositive
            : item.isPositive

          const displayChange = isCurrent && active24hChange !== null
            ? `${active24hChange >= 0 ? "+" : ""}${active24hChange.toFixed(2)}%`
            : currentLive?.change || item.change

          return (
            <button
              key={item.symbol}
              type="button"
              onClick={() => onSelectAsset(item)}
              className={`w-full group relative flex items-center px-2 py-1.5 rounded-lg text-xs transition-all duration-200 overflow-hidden ${
                isCurrent
                  ? "bg-[#00f5c4]/15 border border-[#00f5c4]/40 text-white shadow-[0_0_10px_rgba(0,245,196,0.1)]"
                  : "text-slate-300 hover:bg-[#0c1420] hover:text-white border border-transparent hover:border-[#16283d]"
              }`}
            >
              {/* Logo fijado a la izquierda */}
              <div className="w-8 h-5 flex items-center justify-center flex-shrink-0">
                <CoinLogo
                  symbol={item.symbol}
                  market={item.market}
                  size={18}
                  fallbackIcon={item.icon}
                />
              </div>

              {/* Ticker, nombre, precio y % con transición fluida */}
              <div
                className={`flex items-center justify-between flex-1 min-w-0 overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${
                  isCollapsed
                    ? "opacity-0 max-w-0 -translate-x-2 pointer-events-none"
                    : "opacity-100 max-w-[200px] translate-x-0 ml-1.5"
                }`}
              >
                <div className="flex flex-col text-left min-w-0 overflow-hidden">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-[11px] truncate whitespace-nowrap">
                      {item.symbol}
                    </span>
                    {isCurrent && (
                      <span className="w-1.5 h-1.5 rounded-full bg-[#00f5c4] animate-pulse flex-shrink-0" />
                    )}
                  </div>
                  <span className="text-[9px] text-slate-400 truncate whitespace-nowrap">
                    {item.name}
                  </span>
                </div>
                <div className="flex flex-col items-end flex-shrink-0 ml-2">
                  <span className="text-[10px] font-mono text-slate-200 whitespace-nowrap">
                    {displayPrice}
                  </span>
                  <span
                    className={`text-[9px] font-bold whitespace-nowrap ${
                      isPositiveChange ? "text-emerald-400" : "text-rose-400"
                    }`}
                  >
                    {displayChange}
                  </span>
                </div>
              </div>

              <SidebarTooltip
                isCollapsed={isCollapsed}
                label={`${item.symbol} (${item.name})`}
                badge={`${displayPrice} (${displayChange})`}
              />
            </button>
          )
        })}
      </div>
    </div>
  )
}
