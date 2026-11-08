/**
 * Utilidades matemáticas y catálogo de indicadores para Trading Setups.
 */

export const AVAILABLE_INDICATORS = [
  { value: "rsi", label: "RSI (14)", type: "number", defaultOp: "<=", defaultVal: 35 },
  { value: "squeeze_state", label: "Squeeze Estado", type: "string", defaultOp: "==", defaultVal: "ON" },
  { value: "squeeze_momentum", label: "Squeeze Impulso", type: "number", defaultOp: ">", defaultVal: 0 },
  { value: "macd_hist", label: "MACD Histograma", type: "number", defaultOp: ">", defaultVal: 0 },
  { value: "adx", label: "ADX Fuerza Tendencial", type: "number", defaultOp: ">=", defaultVal: 25 },
  { value: "volCandle", label: "Volumen Vela Actual", type: "number", defaultOp: ">", defaultVal: 500 },
  { value: "candle_close", label: "Precio Cierre Vela", type: "number", defaultOp: ">", defaultVal: 0 },
  { value: "buyer_percent", label: "Dominancia Compradora (%)", type: "number", defaultOp: ">=", defaultVal: 55 },
  { value: "ema50", label: "EMA 50", type: "number", defaultOp: ">", defaultVal: 0 },
  { value: "ema200", label: "EMA 200", type: "number", defaultOp: ">", defaultVal: 0 },
  { value: "stoch_k", label: "Estocástico %K", type: "number", defaultOp: "<=", defaultVal: 20 },
  { value: "mfi", label: "Money Flow Index (MFI)", type: "number", defaultOp: "<=", defaultVal: 30 },
]

export const COMPARISON_OPERATORS = [
  { value: ">=", label: ">= (Mayor o igual)" },
  { value: "<=", label: "<= (Menor o igual)" },
  { value: ">", label: "> (Mayor estricto)" },
  { value: "<", label: "< (Menor estricto)" },
  { value: "==", label: "== (Igual exacto)" },
  { value: "!=", label: "!= (Diferente)" },
]

export function calculateRiskReward({
  direction = "LONG",
  entryPrice = 0,
  stopLoss = 0,
  takeProfit = 0,
  riskAmount = 0,
}) {
  const entry = Number(entryPrice) || 0
  const sl = Number(stopLoss) || 0
  const tp = Number(takeProfit) || 0
  const riskDollar = Number(riskAmount) || 0

  if (entry <= 0 || sl <= 0 || tp <= 0) {
    return {
      isValid: false,
      error: "Precios deben ser mayores a cero",
      riskPercent: 0,
      rewardPercent: 0,
      rrRatio: 0,
      potentialReward: 0,
    }
  }

  const isLong = direction.toUpperCase() === "LONG"

  if (isLong) {
    if (sl >= entry) {
      return { isValid: false, error: "En LONG el Stop Loss debe ser menor a la entrada" }
    }
    if (tp <= entry) {
      return { isValid: false, error: "En LONG el Take Profit debe ser mayor a la entrada" }
    }

    const riskPerUnit = entry - sl
    const rewardPerUnit = tp - entry
    const riskPercent = (riskPerUnit / entry) * 100
    const rewardPercent = (rewardPerUnit / entry) * 100
    const rrRatio = riskPerUnit > 0 ? rewardPerUnit / riskPerUnit : 0
    const potentialReward = riskDollar * rrRatio

    return {
      isValid: true,
      error: null,
      riskPercent: Number(riskPercent.toFixed(2)),
      rewardPercent: Number(rewardPercent.toFixed(2)),
      rrRatio: Number(rrRatio.toFixed(2)),
      potentialReward: Number(potentialReward.toFixed(2)),
    }
  } else {
    // SHORT
    if (sl <= entry) {
      return { isValid: false, error: "En SHORT el Stop Loss debe ser mayor a la entrada" }
    }
    if (tp >= entry) {
      return { isValid: false, error: "En SHORT el Take Profit debe ser menor a la entrada" }
    }

    const riskPerUnit = sl - entry
    const rewardPerUnit = entry - tp
    const riskPercent = (riskPerUnit / entry) * 100
    const rewardPercent = (rewardPerUnit / entry) * 100
    const rrRatio = riskPerUnit > 0 ? rewardPerUnit / riskPerUnit : 0
    const potentialReward = riskDollar * rrRatio

    return {
      isValid: true,
      error: null,
      riskPercent: Number(riskPercent.toFixed(2)),
      rewardPercent: Number(rewardPercent.toFixed(2)),
      rrRatio: Number(rrRatio.toFixed(2)),
      potentialReward: Number(potentialReward.toFixed(2)),
    }
  }
}

export function formatPrice(val, decimals = 2) {
  if (val === null || val === undefined || isNaN(val)) return "-"
  const num = Number(val)
  return num.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

export function getStatusBadgeConfig(status) {
  const norm = (status || "PENDING").toUpperCase()
  switch (norm) {
    case "ACTIVATED":
      return {
        label: "ACTIVADO",
        bgClass: "bg-emerald-500/20 text-emerald-400 border-emerald-500/40 animate-pulse",
        dotClass: "bg-emerald-400",
      }
    case "INVALIDATED":
      return {
        label: "INVALIDADO",
        bgClass: "bg-rose-500/20 text-rose-400 border-rose-500/40",
        dotClass: "bg-rose-500",
      }
    case "CLOSED":
      return {
        label: "CERRADO (TP)",
        bgClass: "bg-cyan-500/20 text-cyan-300 border-cyan-500/40",
        dotClass: "bg-cyan-400",
      }
    case "CANCELLED":
      return {
        label: "CANCELADO",
        bgClass: "bg-slate-800 text-slate-400 border-slate-700",
        dotClass: "bg-slate-500",
      }
    case "PENDING":
    default:
      return {
        label: "MONITOREANDO",
        bgClass: "bg-amber-500/20 text-amber-300 border-amber-500/40",
        dotClass: "bg-amber-400",
      }
  }
}

