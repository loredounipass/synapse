/**
 * Utilidades de cálculo y formateo de precios para la barra lateral
 */

// Formateador estándar de precios para el watchlist con soporte de divisas y decimales
export function formatWatchlistPrice(p, decimals = 2) {
  const num = Number(p)
  if (!Number.isFinite(num)) return "$0.00"
  if (num < 1) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 4,
      maximumFractionDigits: 6,
    }).format(num)
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: decimals && decimals > 2 ? decimals : 2,
  }).format(num)
}

// Cálculo del % de variación 24h real a partir de las velas del historial (idéntico a PriceCard)
export function get24hChangeFromHistory(history, currentPrice) {
  try {
    if (!history || !Array.isArray(history.closes) || history.closes.length === 0) {
      return null
    }
    const closes = history.closes
    const times = Array.isArray(history.times) ? history.times : []
    const lastT = times.length ? Number(times[times.length - 1]) : 0
    const DAY_MS = 86400000

    const idx = []
    for (let i = 0; i < closes.length; i++) {
      const t = Number(times[i])
      if (!lastT || !Number.isFinite(t) || t > lastT - DAY_MS) idx.push(i)
    }

    const baseClose = idx.length ? Number(closes[idx[0]]) : NaN
    const lastClose = Number(currentPrice) || Number(closes[closes.length - 1])
    if (Number.isFinite(baseClose) && baseClose > 0 && Number.isFinite(lastClose)) {
      return ((lastClose - baseClose) / baseClose) * 100
    }
  } catch {
    // fallback
  }
  return null
}

