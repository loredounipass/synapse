"use client"

import { useState, useEffect } from "react"
import { formatWatchlistPrice } from "../utils"

/**
 * Hook para gestionar las posiciones del portafolio simulado
 */
export function useDemoPortfolio(datos, moneda) {
  const [portfolioPositions, setPortfolioPositions] = useState([
    {
      symbol: moneda?.symbol || "BTCUSDT",
      type: "LONG",
      entry: "$74,200",
      current: datos?.precio
        ? formatWatchlistPrice(datos.precio, datos.decimales)
        : "$75,800.00",
      pnl: "+$1,600.00",
      pnlPct: "+2.16%",
      isPositive: true,
    },
    {
      symbol: "ETHUSDT",
      type: "LONG",
      entry: "$2,180",
      current: "$2,238.00",
      pnl: "+$580.00",
      pnlPct: "+2.66%",
      isPositive: true,
    },
    {
      symbol: "SOLUSDT",
      type: "LONG",
      entry: "$85.00",
      current: "$89.50",
      pnl: "+$450.00",
      pnlPct: "+5.29%",
      isPositive: true,
    },
  ])

  // Mantener actualizado el precio del activo actual en el portafolio demo
  useEffect(() => {
    if (datos?.precio) {
      const formatted = formatWatchlistPrice(datos.precio, datos.decimales)
      setPortfolioPositions((prev) =>
        prev.map((pos, idx) =>
          idx === 0
            ? { ...pos, current: formatted, symbol: moneda?.symbol || pos.symbol }
            : pos
        )
      )
    }
  }, [datos?.precio, datos?.decimales, moneda?.symbol])

  return {
    portfolioPositions,
    setPortfolioPositions,
  }
}

