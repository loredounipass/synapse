"use client"

import { useState, useEffect } from "react"
import { fetchTradingData } from "@/services/api/tradingApi"
import { formatWatchlistPrice, get24hChangeFromHistory } from "../utils"

/**
 * Hook para obtener y mantener actualizadas las cotizaciones en tiempo real del watchlist
 */
export function useWatchlistPrices(activeSymbol) {
  const [livePrices, setLivePrices] = useState({})

  // Obtención continua de precios reales de crypto (Binance Vision API pública sin restricciones de CORS)
  useEffect(() => {
    let isMounted = true

    const fetchCryptoTickers = async () => {
      try {
        const cryptoSymbols = JSON.stringify(["BTCUSDT", "ETHUSDT", "SOLUSDT"])
        const res = await fetch(
          `https://data-api.binance.vision/api/v3/ticker/24hr?symbols=${encodeURIComponent(cryptoSymbols)}`
        )
        if (!res.ok) return
        const tickers = await res.json()
        if (Array.isArray(tickers) && isMounted) {
          setLivePrices((prev) => {
            const next = { ...prev }
            tickers.forEach((t) => {
              const price = parseFloat(t.lastPrice)
              const change = parseFloat(t.priceChangePercent)
              next[t.symbol] = {
                price: formatWatchlistPrice(price),
                rawPrice: price,
                change: `${change >= 0 ? "+" : ""}${change.toFixed(2)}%`,
                isPositive: change >= 0,
              }
            })
            return next
          })
        }
      } catch {
        // Fallback silencioso
      }
    }

    fetchCryptoTickers()
    const interval = setInterval(fetchCryptoTickers, 12000)
    return () => {
      isMounted = false
      clearInterval(interval)
    }
  }, [])

  // Obtención de cotizaciones reales de acciones secundarias si están disponibles
  useEffect(() => {
    let isMounted = true
    const stockSymbols = ["NVDA", "AAPL"]
    stockSymbols.forEach(async (sym) => {
      if (activeSymbol === sym) return
      try {
        const stockData = await fetchTradingData(sym, "15m", "stock")
        if (stockData && stockData.precio && isMounted) {
          const change = get24hChangeFromHistory(stockData.history, stockData.precio)
          setLivePrices((prev) => ({
            ...prev,
            [sym]: {
              price: formatWatchlistPrice(stockData.precio, stockData.decimales),
              rawPrice: stockData.precio,
              change: change !== null ? `${change >= 0 ? "+" : ""}${change.toFixed(2)}%` : "+0.00%",
              isPositive: change !== null ? change >= 0 : true,
            },
          }))
        }
      } catch {
        // Fallback silencioso si no hay conexión al backend
      }
    })
    return () => {
      isMounted = false
    }
  }, [activeSymbol])

  return { livePrices }
}

