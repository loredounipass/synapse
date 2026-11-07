// @vitest-environment node

import { expect, it } from "vitest"

const backendBaseUrl =
  process.env.INDICATORS_BACKEND_URL ||
  "https://fuzzy-trout-76rv959r5x92wwg6-5000.app.github.dev/api"
const symbol = "ETHUSDT"
const interval = "15m"
const intervalMs = 15 * 60 * 1000

async function readBody(response) {
  const text = await response.text()
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

function assertFiniteNumbers(value, path = "payload") {
  if (typeof value === "number") {
    expect(Number.isFinite(value), `${path} must be finite`).toBe(true)
  } else if (Array.isArray(value)) {
    value.forEach((item, index) => assertFiniteNumbers(item, `${path}[${index}]`))
  } else if (value && typeof value === "object") {
    for (const [key, item] of Object.entries(value)) {
      assertFiniteNumbers(item, `${path}.${key}`)
    }
  }
}

function sma(values, period, index = values.length - 1) {
  if (index + 1 < period) return null
  const window = values.slice(index + 1 - period, index + 1)
  if (window.some((value) => value === null || !Number.isFinite(value))) return null
  return window.reduce((sum, value) => sum + value, 0) / period
}

function emaSeries(values, period) {
  const result = Array(values.length).fill(null)
  const multiplier = 2 / (period + 1)
  let previous = null
  for (let index = period - 1; index < values.length; index += 1) {
    if (previous === null) {
      previous = sma(values, period, index)
    } else {
      previous = values[index] * multiplier + previous * (1 - multiplier)
    }
    result[index] = previous
  }
  return result
}

function rsiSeries(closes, period = 14) {
  const result = Array(closes.length).fill(null)
  if (closes.length < period + 1) return result

  const deltas = closes.slice(1).map((close, index) => close - closes[index])
  const seed = deltas.slice(0, period)
  let averageGain = seed.reduce((sum, delta) => sum + Math.max(delta, 0), 0) / period
  let averageLoss = seed.reduce((sum, delta) => sum + Math.max(-delta, 0), 0) / period
  const value = () => {
    if (averageLoss === 0) return averageGain > 0 ? 100 : 50
    const relativeStrength = averageGain / averageLoss
    return 100 - 100 / (1 + relativeStrength)
  }

  result[period] = value()
  for (let index = period; index < deltas.length; index += 1) {
    averageGain =
      (averageGain * (period - 1) + Math.max(deltas[index], 0)) / period
    averageLoss =
      (averageLoss * (period - 1) + Math.max(-deltas[index], 0)) / period
    result[index + 1] = value()
  }
  return result
}

function stochasticSeries(highs, lows, closes, period = 14) {
  const raw = Array(closes.length).fill(null)
  for (let index = period - 1; index < closes.length; index += 1) {
    const highest = Math.max(...highs.slice(index + 1 - period, index + 1))
    const lowest = Math.min(...lows.slice(index + 1 - period, index + 1))
    raw[index] =
      highest === lowest ? 0 : ((closes[index] - lowest) / (highest - lowest)) * 100
  }
  const k = raw.map((_, index) => sma(raw, 3, index))
  const d = k.map((_, index) => sma(k, 3, index))
  return { k, d }
}

function stochasticRsiSeries(rsi, period = 14) {
  const raw = Array(rsi.length).fill(null)
  for (let index = period - 1; index < rsi.length; index += 1) {
    const window = rsi.slice(index + 1 - period, index + 1)
    if (window.some((value) => value === null)) continue
    const lowest = Math.min(...window)
    const highest = Math.max(...window)
    raw[index] =
      highest === lowest ? 0 : ((rsi[index] - lowest) / (highest - lowest)) * 100
  }
  const k = raw.map((_, index) => sma(raw, 3, index))
  const d = k.map((_, index) => sma(k, 3, index))
  return { k, d }
}

function mfiLast(highs, lows, closes, volumes, period = 14) {
  const typicalPrices = closes.map((close, index) => (highs[index] + lows[index] + close) / 3)
  let positive = 0
  let negative = 0
  for (let index = closes.length - period; index < closes.length; index += 1) {
    const flow = typicalPrices[index] * volumes[index]
    if (typicalPrices[index] > typicalPrices[index - 1]) positive += flow
    if (typicalPrices[index] < typicalPrices[index - 1]) negative += flow
  }
  if (negative === 0) return positive > 0 ? 100 : 50
  return Math.round((100 - 100 / (1 + positive / negative)) * 100) / 100
}

function adxLast(highs, lows, closes, period = 14) {
  const trueRanges = []
  const positiveMoves = []
  const negativeMoves = []
  for (let index = 1; index < closes.length; index += 1) {
    trueRanges.push(
      Math.max(
        highs[index] - lows[index],
        Math.abs(highs[index] - closes[index - 1]),
        Math.abs(lows[index] - closes[index - 1]),
      ),
    )
    const up = highs[index] - highs[index - 1]
    const down = lows[index - 1] - lows[index]
    positiveMoves.push(up > 0 && up > down ? up : 0)
    negativeMoves.push(down > 0 && down > up ? down : 0)
  }

  let tr = trueRanges.slice(0, period).reduce((sum, value) => sum + value, 0)
  let plus = positiveMoves.slice(0, period).reduce((sum, value) => sum + value, 0)
  let minus = negativeMoves.slice(0, period).reduce((sum, value) => sum + value, 0)
  const dx = []
  const di = () => {
    const plusDi = tr ? (100 * plus) / tr : 0
    const minusDi = tr ? (100 * minus) / tr : 0
    const total = plusDi + minusDi
    return {
      plusDi,
      minusDi,
      dx: total ? (100 * Math.abs(plusDi - minusDi)) / total : 0,
    }
  }

  dx.push(di().dx)
  for (let index = period; index < trueRanges.length; index += 1) {
    tr = tr - tr / period + trueRanges[index]
    plus = plus - plus / period + positiveMoves[index]
    minus = minus - minus / period + negativeMoves[index]
    dx.push(di().dx)
  }

  if (dx.length < period) return null
  let adx = dx.slice(0, period).reduce((sum, value) => sum + value, 0) / period
  for (let index = period; index < dx.length; index += 1) {
    adx = (adx * (period - 1) + dx[index]) / period
  }
  const { plusDi, minusDi } = di()
  return { adx, plusDi, minusDi }
}

function expectClose(actual, expected, tolerance, label) {
  expect(actual, `${label} should be numeric`).toEqual(expect.any(Number))
  expect(Math.abs(actual - expected), `${label} differs from independent calculation`).toBeLessThanOrEqual(
    tolerance,
  )
}

it(
  "validates real Binance ETHUSDT indicators, timestamps, zones, and independent math",
  async () => {
    const email = process.env.BACKEND_TEST_EMAIL
    const password = process.env.BACKEND_TEST_PASSWORD
    if (!email || !password) {
      throw new Error(
        "Set BACKEND_TEST_EMAIL and BACKEND_TEST_PASSWORD to run this authenticated backend test.",
      )
    }

    const baseUrl = backendBaseUrl.replace(/\/+$/, "")
    console.log("[1/4] Autenticando con el backend (las credenciales no se imprimen)")
    const loginResponse = await fetch(`${baseUrl}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
      signal: AbortSignal.timeout(15_000),
    })
    const loginPayload = await readBody(loginResponse)
    expect(loginResponse.ok, `Login falló con HTTP ${loginResponse.status}`).toBe(true)
    expect(loginPayload).toHaveProperty("access_token")

    const url = new URL(`${baseUrl}/trading/${symbol}`)
    url.search = new URLSearchParams({
      interval,
      market: "crypto",
      provider: "binance",
    }).toString()
    console.log("[2/4] Descargando indicadores/velas reales de ETHUSDT Binance")
    console.log(`      GET ${url.origin}${url.pathname}${url.search}`)
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${loginPayload.access_token}` },
      signal: AbortSignal.timeout(60_000),
    })
    const payload = await readBody(response)
    expect(response.ok, `Datos fallaron con HTTP ${response.status}`).toBe(true)
    expect(payload).toBeTypeOf("object")
    expect(payload).not.toHaveProperty("error")

    console.log("[3/4] Validando valores finitos, identidad, velas y timestamps")
    assertFiniteNumbers(payload)
    expect(payload.symbol).toBe(symbol)
    expect(payload.market).toBe("crypto")
    expect(payload.provider).toBe("binance")
    expect(payload.timeframe).toBe(interval)
    expect(payload.synthetic).not.toBe(true)
    expect(payload.precio).toBeGreaterThan(0)

    const history = payload.history
    expect(history).toBeTypeOf("object")
    const { opens, highs, lows, closes, times, volumes, volumesBase } = history
    expect(closes.length).toBeGreaterThanOrEqual(200)
    for (const [name, series] of Object.entries({
      opens,
      highs,
      lows,
      times,
      volumes,
      volumesBase,
    })) {
      expect(series, `history.${name} should align with closes`).toHaveLength(closes.length)
    }

    const availableTimes = new Set(times.map(Number))
    for (let index = 0; index < closes.length; index += 1) {
      const timestamp = Number(times[index])
      expect(Number.isInteger(timestamp), `timestamp ${index} should be integer ms`).toBe(true)
      expect(timestamp % intervalMs, `timestamp ${index} should align to 15m UTC`).toBe(0)
      if (index > 0) {
        expect(timestamp, `timestamp ${index} should follow the previous candle`).toBeGreaterThan(
          Number(times[index - 1]),
        )
      }

      expect(highs[index]).toBeGreaterThanOrEqual(Math.max(opens[index], closes[index]))
      expect(lows[index]).toBeLessThanOrEqual(Math.min(opens[index], closes[index]))
      expect(lows[index]).toBeGreaterThan(0)
      expect(volumes[index]).toBeGreaterThanOrEqual(0)
      expect(volumesBase[index]).toBeGreaterThanOrEqual(0)
    }
    expect(Number(times.at(-1))).toBeLessThanOrEqual(Date.now() + intervalMs)

    const candleSeries = [
      "rsi",
      "stochK",
      "stochD",
      "rsiStoch",
      "rsiStochD",
      "macd",
      "macd_signal",
      "macd_hist",
      "bb_upper",
      "bb_middle",
      "bb_lower",
      "ema50",
      "ema100",
      "ema200",
      "mfi",
      "adx",
      "plusDi",
      "minusDi",
      "squeezeMomentum",
      "squeezeState",
    ]
    for (const name of candleSeries) {
      expect(history[name], `history.${name} should align with candle times`).toHaveLength(
        closes.length,
      )
    }

    for (const name of ["rsi", "stochK", "stochD", "rsiStoch", "rsiStochD", "mfi"]) {
      for (const value of history[name]) {
        if (value !== null) expect(value, `${name} must be in [0, 100]`).toBeGreaterThanOrEqual(0)
        if (value !== null) expect(value, `${name} must be in [0, 100]`).toBeLessThanOrEqual(100)
      }
    }
    for (const value of history.adx) {
      if (value !== null) expect(value, "ADX must be in [0, 100]").toBeGreaterThanOrEqual(0)
      if (value !== null) expect(value, "ADX must be in [0, 100]").toBeLessThanOrEqual(100)
    }
    for (const value of history.squeezeState) {
      if (value !== null) expect(["on", "off", "no"]).toContain(value)
    }

    console.log("[4/4] Contrastando indicadores con cálculos independientes")
    const latest = (series) => series.filter((value) => value !== null).at(-1)
    const tolerance = 1e-5
    const expectedRsi = latest(rsiSeries(closes))
    const ema12Series = emaSeries(closes, 12)
    const ema26Series = emaSeries(closes, 26)
    const macdSeries = ema12Series.map((fast, index) => {
      const slow = ema26Series[index]
      return fast === null || slow === null ? null : fast - slow
    })
    const expectedMacd = latest(macdSeries)
    const expectedMacdSignal = latest(
      emaSeries(macdSeries.filter((value) => value !== null), 9),
    )
    const expectedStochastic = stochasticSeries(highs, lows, closes)
    const expectedStochasticRsi = stochasticRsiSeries(rsiSeries(closes))
    const expectedMfi = mfiLast(highs, lows, closes, volumesBase)
    const expectedAdx = adxLast(highs, lows, closes)
    const bbWindow = closes.slice(-20)
    const expectedBbMiddle = bbWindow.reduce((sum, value) => sum + value, 0) / bbWindow.length
    const expectedBbDeviation = Math.sqrt(
      bbWindow.reduce((sum, value) => sum + (value - expectedBbMiddle) ** 2, 0) /
        bbWindow.length,
    )

    expectClose(payload.rsi, expectedRsi, tolerance, "RSI(14)")
    expectClose(latest(history.rsi), expectedRsi, tolerance, "history RSI(14)")
    expectClose(payload.macdValue, expectedMacd, tolerance, "MACD(12,26)")
    expectClose(latest(history.macd), expectedMacd, tolerance, "history MACD(12,26)")
    expectClose(payload.macdSignal, expectedMacdSignal, tolerance, "MACD signal(9)")
    expectClose(
      latest(history.macd_signal),
      expectedMacdSignal,
      tolerance,
      "history MACD signal(9)",
    )
    expectClose(
      payload.macdHistogram,
      expectedMacd - expectedMacdSignal,
      tolerance,
      "MACD histogram",
    )
    expectClose(payload.stochK, latest(expectedStochastic.k), tolerance, "Stochastic %K")
    expectClose(payload.stochD, latest(expectedStochastic.d), tolerance, "Stochastic %D")
    expectClose(latest(history.stochK), latest(expectedStochastic.k), tolerance, "history Stochastic %K")
    expectClose(latest(history.stochD), latest(expectedStochastic.d), tolerance, "history Stochastic %D")
    expectClose(
      payload.rsiStoch,
      latest(expectedStochasticRsi.k),
      tolerance,
      "Stochastic RSI %K",
    )
    expectClose(
      payload.rsiStochD,
      latest(expectedStochasticRsi.d),
      tolerance,
      "Stochastic RSI %D",
    )
    expectClose(
      latest(history.rsiStoch),
      latest(expectedStochasticRsi.k),
      tolerance,
      "history Stochastic RSI %K",
    )
    expectClose(
      latest(history.rsiStochD),
      latest(expectedStochasticRsi.d),
      tolerance,
      "history Stochastic RSI %D",
    )
    expectClose(payload.mfi, expectedMfi, 0.011, "MFI(14)")
    expectClose(latest(history.mfi), expectedMfi, 0.011, "history MFI(14)")
    expectClose(payload.adx, expectedAdx.adx, tolerance, "ADX(14)")
    expectClose(latest(history.adx), expectedAdx.adx, tolerance, "history ADX(14)")
    expectClose(payload.plusDi, expectedAdx.plusDi, tolerance, "+DI(14)")
    expectClose(latest(history.plusDi), expectedAdx.plusDi, tolerance, "history +DI(14)")
    expectClose(payload.minusDi, expectedAdx.minusDi, tolerance, "-DI(14)")
    expectClose(latest(history.minusDi), expectedAdx.minusDi, tolerance, "history -DI(14)")

    for (const period of [50]) {
      const expectedEma = latest(emaSeries(closes, period))
      expectClose(
        payload[`ema${period}`],
        expectedEma,
        1e-4,
        `EMA(${period})`,
      )
      expectClose(latest(history[`ema${period}`]), expectedEma, 1e-4, `history EMA(${period})`)
    }
    for (const period of [100, 200]) {
      expectClose(
        payload[`ema${period}`],
        latest(history[`ema${period}`]),
        1e-8,
        `EMA(${period}) top-level/history consistency`,
      )
    }
    expectClose(payload.macdHistogram, payload.macdValue - payload.macdSignal, tolerance, "MACD identity")
    expectClose(payload.bbMiddle, expectedBbMiddle, tolerance, "Bollinger middle(20)")
    expectClose(
      payload.bbUpper,
      expectedBbMiddle + 2 * expectedBbDeviation,
      tolerance,
      "Bollinger upper(20,2)",
    )
    expectClose(
      payload.bbLower,
      expectedBbMiddle - 2 * expectedBbDeviation,
      tolerance,
      "Bollinger lower(20,2)",
    )
    expectClose(latest(history.bb_middle), expectedBbMiddle, tolerance, "history Bollinger middle")
    expectClose(
      latest(history.bb_upper),
      expectedBbMiddle + 2 * expectedBbDeviation,
      tolerance,
      "history Bollinger upper",
    )
    expectClose(
      latest(history.bb_lower),
      expectedBbMiddle - 2 * expectedBbDeviation,
      tolerance,
      "history Bollinger lower",
    )

    for (const [upper, middle, lower] of [
      [payload.bbUpper, payload.bbMiddle, payload.bbLower],
    ]) {
      expect(upper).toBeGreaterThanOrEqual(middle)
      expect(middle).toBeGreaterThanOrEqual(lower)
    }
    expectClose(payload.volCandle, volumes.at(-1), 1e-8, "latest quote volume")
    expectClose(payload.volCandleBase, volumesBase.at(-1), 1e-8, "latest base volume")

    const orderBlocks = payload.orderBlocks
    const gaps = payload.fairValueGaps
    const swings = payload.liquiditySwings
    expect(Array.isArray(orderBlocks)).toBe(true)
    expect(Array.isArray(gaps)).toBe(true)
    expect(Array.isArray(swings)).toBe(true)
    for (const block of orderBlocks) {
      expect(["bullish", "bearish"]).toContain(block.side)
      expect(["active", "tested", "invalidated"]).toContain(block.status)
      expect(block.top).toBeGreaterThanOrEqual(block.bottom)
      expect(availableTimes.has(Number(block.originTime))).toBe(true)
      expect(availableTimes.has(Number(block.confirmationTime))).toBe(true)
      expect(block.invalidatedAt !== null).toBe(block.status === "invalidated")
      if (block.status === "tested") expect(block.testedAt).not.toBeNull()
      if (block.testedAt !== null) expect(availableTimes.has(Number(block.testedAt))).toBe(true)
      if (block.invalidatedAt !== null) {
        expect(availableTimes.has(Number(block.invalidatedAt))).toBe(true)
      }
    }
    for (const gap of gaps) {
      expect(["bullish", "bearish"]).toContain(gap.side)
      expect(["open", "partial", "filled"]).toContain(gap.status)
      expect(gap.top).toBeGreaterThan(gap.bottom)
      expect(gap.midpoint).toBeCloseTo((gap.top + gap.bottom) / 2, 8)
      expect(gap.fillPercent).toBeGreaterThanOrEqual(0)
      expect(gap.fillPercent).toBeLessThanOrEqual(100)
      expect(availableTimes.has(Number(gap.formedAt))).toBe(true)
      expect(gap.filledAt !== null).toBe(gap.status === "filled")
      if (gap.status === "filled") expect(gap.fillPercent).toBe(100)
      if (gap.firstTouchAt !== null) expect(availableTimes.has(Number(gap.firstTouchAt))).toBe(true)
      if (gap.filledAt !== null) expect(availableTimes.has(Number(gap.filledAt))).toBe(true)
    }
    for (const swing of swings) {
      expect(["buy_side", "sell_side"]).toContain(swing.side)
      expect(["swing_high", "swing_low"]).toContain(swing.kind)
      expect(["active", "swept", "broken"]).toContain(swing.status)
      expect(swing.price).toBeGreaterThan(0)
      expect(availableTimes.has(Number(swing.formedAt))).toBe(true)
      expect(availableTimes.has(Number(swing.confirmedAt))).toBe(true)
      expect(Number(swing.confirmedAt)).toBeGreaterThan(Number(swing.formedAt))
      expect(swing.sweptAt !== null).toBe(swing.status === "swept")
      expect(swing.brokenAt !== null).toBe(swing.status === "broken")
      if (swing.sweptAt !== null) expect(availableTimes.has(Number(swing.sweptAt))).toBe(true)
      if (swing.brokenAt !== null) expect(availableTimes.has(Number(swing.brokenAt))).toBe(true)
    }

    const flow = payload.orderFlow
    expect(flow, "Binance order flow should come from executed trades").toBeTypeOf("object")
    expect(flow.provider).toBe("binance")
    expect(flow.source).toBe("binance_executed_trades")
    expect(flow.tradeCount).toBeGreaterThan(0)
    expect(flow.buyTradeCount + flow.sellTradeCount).toBe(flow.tradeCount)
    expectClose(flow.delta, flow.buyVolume - flow.sellVolume, 1e-8, "order-flow delta")
    expect(flow.buyPercent + flow.sellPercent).toBeCloseTo(100, 1)
    expect(flow.deltaPercent).toBeGreaterThanOrEqual(-100)
    expect(flow.deltaPercent).toBeLessThanOrEqual(100)
    expect(Array.isArray(flow.recentTrades)).toBe(true)
    for (const trade of flow.recentTrades) {
      expect(["buy", "sell"]).toContain(trade.side)
      expect(trade.price).toBeGreaterThan(0)
      expect(trade.size).toBeGreaterThan(0)
      expectClose(trade.quoteVolume, trade.price * trade.size, 1e-8, "trade quote volume")
    }

    console.log(
      JSON.stringify(
        {
          symbol: payload.symbol,
          provider: payload.provider,
          interval: payload.timeframe,
          candles: closes.length,
          lastCandle: new Date(Number(times.at(-1))).toISOString(),
          price: payload.precio,
          checks: [
            "finite values",
            "OHLC/timestamps",
            "indicator ranges",
            "independent RSI/Stochastic/Stoch RSI/MACD/MFI/ADX/EMA/Bollinger math",
            "zone states and timestamps",
            "Binance executed-trade order flow",
          ],
          zones: {
            orderBlocks: orderBlocks.length,
            fairValueGaps: gaps.length,
            liquiditySwings: swings.length,
          },
          orderFlow: {
            trades: flow.tradeCount,
            buyPercent: flow.buyPercent,
            sellPercent: flow.sellPercent,
            delta: flow.delta,
          },
          math: {
            rsi14: payload.rsi,
            stochK: payload.stochK,
            stochD: payload.stochD,
            stochRsiK: payload.rsiStoch,
            macdHistogram: payload.macdHistogram,
            mfi14: payload.mfi,
            adx14: payload.adx,
          },
        },
        null,
        2,
      ),
    )
  },
  90_000,
)
