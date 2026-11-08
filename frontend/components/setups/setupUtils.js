/**
 * Utilidades matemáticas y catálogo de indicadores para Trading Setups.
 */

export const AVAILABLE_INDICATORS = [
  // Soportes y Resistencias (Pivots Clásicos y Dinámicos)
  { value: "s1", label: "Soporte 1 (S1 - Pivote)", category: "Soportes y Resistencias", type: "number", defaultOp: ">=", defaultVal: 0 },
  { value: "s2", label: "Soporte 2 (S2 - Pivote)", category: "Soportes y Resistencias", type: "number", defaultOp: ">=", defaultVal: 0 },
  { value: "s3", label: "Soporte 3 (S3 - Pivote)", category: "Soportes y Resistencias", type: "number", defaultOp: ">=", defaultVal: 0 },
  { value: "r1", label: "Resistencia 1 (R1 - Pivote)", category: "Soportes y Resistencias", type: "number", defaultOp: "<=", defaultVal: 0 },
  { value: "r2", label: "Resistencia 2 (R2 - Pivote)", category: "Soportes y Resistencias", type: "number", defaultOp: "<=", defaultVal: 0 },
  { value: "r3", label: "Resistencia 3 (R3 - Pivote)", category: "Soportes y Resistencias", type: "number", defaultOp: "<=", defaultVal: 0 },
  { value: "soporte", label: "Soporte más cercano (Dinámico)", category: "Soportes y Resistencias", type: "number", defaultOp: ">=", defaultVal: 0 },
  { value: "resistencia", label: "Resistencia más cercana (Dinámica)", category: "Soportes y Resistencias", type: "number", defaultOp: "<=", defaultVal: 0 },

  // Medias Móviles y Bandas
  { value: "ema50", label: "EMA 50 (Media Móvil Rápida)", category: "Medias y Bandas", type: "number", defaultOp: ">", defaultVal: 0 },
  { value: "ema100", label: "EMA 100 (Media Móvil Media)", category: "Medias y Bandas", type: "number", defaultOp: ">", defaultVal: 0 },
  { value: "ema200", label: "EMA 200 (Media Móvil Institucional)", category: "Medias y Bandas", type: "number", defaultOp: ">", defaultVal: 0 },
  { value: "bb_upper", label: "Bollinger Band Superior", category: "Medias y Bandas", type: "number", defaultOp: "<=", defaultVal: 0 },
  { value: "bb_middle", label: "Bollinger Band Media", category: "Medias y Bandas", type: "number", defaultOp: ">", defaultVal: 0 },
  { value: "bb_lower", label: "Bollinger Band Inferior", category: "Medias y Bandas", type: "number", defaultOp: ">=", defaultVal: 0 },

  // Osciladores y Momentum
  { value: "rsi", label: "RSI (14)", category: "Osciladores y Momentum", type: "number", defaultOp: "<=", defaultVal: 35 },
  { value: "squeeze_state", label: "Squeeze Estado (ON/OFF)", category: "Osciladores y Momentum", type: "string", defaultOp: "==", defaultVal: "ON" },
  { value: "squeeze_momentum", label: "Squeeze Momentum (Histograma)", category: "Osciladores y Momentum", type: "number", defaultOp: ">", defaultVal: 0 },
  { value: "macd_hist", label: "MACD Histograma", category: "Osciladores y Momentum", type: "number", defaultOp: ">", defaultVal: 0 },
  { value: "macd_line", label: "MACD Línea", category: "Osciladores y Momentum", type: "number", defaultOp: ">", defaultVal: 0 },
  { value: "macd_signal", label: "MACD Señal", category: "Osciladores y Momentum", type: "number", defaultOp: ">", defaultVal: 0 },
  { value: "adx", label: "ADX Fuerza Tendencial", category: "Osciladores y Momentum", type: "number", defaultOp: ">=", defaultVal: 25 },
  { value: "plus_di", label: "+DI Direccional Alcista", category: "Osciladores y Momentum", type: "number", defaultOp: ">", defaultVal: 20 },
  { value: "minus_di", label: "-DI Direccional Bajista", category: "Osciladores y Momentum", type: "number", defaultOp: "<", defaultVal: 20 },
  { value: "stoch_k", label: "Estocástico %K", category: "Osciladores y Momentum", type: "number", defaultOp: "<=", defaultVal: 20 },
  { value: "stoch_d", label: "Estocástico %D", category: "Osciladores y Momentum", type: "number", defaultOp: "<=", defaultVal: 20 },
  { value: "rsi_stoch", label: "Stoch RSI %K", category: "Osciladores y Momentum", type: "number", defaultOp: "<=", defaultVal: 20 },
  { value: "rsi_stoch_d", label: "Stoch RSI %D", category: "Osciladores y Momentum", type: "number", defaultOp: "<=", defaultVal: 20 },
  { value: "cci", label: "CCI (Commodity Channel)", category: "Osciladores y Momentum", type: "number", defaultOp: "<=", defaultVal: -100 },
  { value: "mfi", label: "Money Flow Index (MFI)", category: "Osciladores y Momentum", type: "number", defaultOp: "<=", defaultVal: 30 },

  // Volumen y Liquidez
  { value: "volCandle", label: "Volumen Vela Actual ($/USDT)", category: "Volumen y Liquidez", type: "number", defaultOp: ">", defaultVal: 500 },
  { value: "volCandleBase", label: "Volumen Vela en Activo Base", category: "Volumen y Liquidez", type: "number", defaultOp: ">", defaultVal: 10 },
  { value: "volumen", label: "Volumen Total 24h", category: "Volumen y Liquidez", type: "number", defaultOp: ">", defaultVal: 1000000 },
  { value: "buyer_percent", label: "Dominancia Compradora (%)", category: "Volumen y Liquidez", type: "number", defaultOp: ">=", defaultVal: 55 },
  { value: "bid_volume", label: "Volumen Libro Bids", category: "Volumen y Liquidez", type: "number", defaultOp: ">", defaultVal: 0 },
  { value: "ask_volume", label: "Volumen Libro Asks", category: "Volumen y Liquidez", type: "number", defaultOp: ">", defaultVal: 0 },
  { value: "spread", label: "Spread Bid-Ask ($)", category: "Volumen y Liquidez", type: "number", defaultOp: "<=", defaultVal: 1 },

  // Order Flow
  { value: "order_flow_delta", label: "Order Flow Delta Neto ($)", category: "Order Flow", type: "number", defaultOp: "<", defaultVal: -20000 },
  { value: "order_flow_delta_percent", label: "Order Flow Delta (%)", category: "Order Flow", type: "number", defaultOp: "<", defaultVal: -15 },
  { value: "order_flow_buy_volume", label: "Order Flow Volumen Compra", category: "Order Flow", type: "number", defaultOp: ">", defaultVal: 50000 },
  { value: "order_flow_sell_volume", label: "Order Flow Volumen Venta", category: "Order Flow", type: "number", defaultOp: ">", defaultVal: 50000 },
  { value: "order_flow_trade_count", label: "Order Flow Conteo Trades", category: "Order Flow", type: "number", defaultOp: ">", defaultVal: 100 },

  // Price Action y Velas
  { value: "candle_close", label: "Precio Cierre Vela", category: "Acción de Precio", type: "number", defaultOp: ">", defaultVal: 0 },
  { value: "candle_open", label: "Precio Apertura Vela", category: "Acción de Precio", type: "number", defaultOp: ">", defaultVal: 0 },
  { value: "candle_high", label: "Precio Máximo Vela", category: "Acción de Precio", type: "number", defaultOp: ">", defaultVal: 0 },
  { value: "candle_low", label: "Precio Mínimo Vela", category: "Acción de Precio", type: "number", defaultOp: ">", defaultVal: 0 },
  { value: "nearest_order_block_top", label: "Order Block Cercano (Techo)", category: "Acción de Precio", type: "number", defaultOp: "<=", defaultVal: 0 },
  { value: "nearest_order_block_bottom", label: "Order Block Cercano (Suelo)", category: "Acción de Precio", type: "number", defaultOp: ">=", defaultVal: 0 },
  { value: "fvg_top", label: "Fair Value Gap (Techo)", category: "Acción de Precio", type: "number", defaultOp: "<=", defaultVal: 0 },
  { value: "fvg_bottom", label: "Fair Value Gap (Suelo)", category: "Acción de Precio", type: "number", defaultOp: ">=", defaultVal: 0 },
  { value: "swing_high", label: "Swing High (Máximo Estructural)", category: "Acción de Precio", type: "number", defaultOp: "<", defaultVal: 0 },
  { value: "swing_low", label: "Swing Low (Mínimo Estructural)", category: "Acción de Precio", type: "number", defaultOp: ">", defaultVal: 0 },

  // Señales
  { value: "buy_signals", label: "Conteo Señales de Compra", category: "Señales", type: "number", defaultOp: ">=", defaultVal: 5 },
  { value: "sell_signals", label: "Conteo Señales de Venta", category: "Señales", type: "number", defaultOp: ">=", defaultVal: 5 },

  // Personalizado / Libre
  { value: "custom", label: "Otro Indicador (Campo Libre)", category: "Personalizado", type: "custom", defaultOp: "==", defaultVal: "" },
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

