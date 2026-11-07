// @vitest-environment node

import { expect, it } from "vitest"

const backendBaseUrl =
  process.env.INDICATORS_BACKEND_URL ||
  "https://fuzzy-trout-76rv959r5x92wwg6-5000.app.github.dev/api"

const timeframes = [
  { interval: "1m", intervalMs: 60_000 },
  { interval: "5m", intervalMs: 300_000 },
  { interval: "15m", intervalMs: 900_000 },
  { interval: "1h", intervalMs: 3_600_000 },
  { interval: "4h", intervalMs: 14_400_000 },
  { interval: "6h", intervalMs: 21_600_000 },
  { interval: "1d", intervalMs: 86_400_000 },
] as const

type JsonRecord = Record<string, unknown>

async function readJson(response: Response): Promise<JsonRecord> {
  const payload: unknown = await response.json()
  if (payload === null || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error("Backend returned a non-object JSON response.")
  }
  return payload as JsonRecord
}

it(
  "fetches real AAPL indicators from the backend Alpaca provider",
  async () => {
    const email = process.env.BACKEND_TEST_EMAIL
    const password = process.env.BACKEND_TEST_PASSWORD
    if (!email || !password) {
      throw new Error(
        "Set BACKEND_TEST_EMAIL and BACKEND_TEST_PASSWORD in frontend/.env.",
      )
    }

    const symbol = (process.env.ALPACA_TEST_SYMBOL || "AAPL").toUpperCase()
    const baseUrl = backendBaseUrl.replace(/\/+$/, "")
    const loginResponse = await fetch(`${baseUrl}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
      signal: AbortSignal.timeout(15_000),
    })
    const loginPayload = await readJson(loginResponse)
    expect(
      loginResponse.ok,
      `Login failed with HTTP ${loginResponse.status}`,
    ).toBe(true)
    expect(loginPayload.access_token).toBeTypeOf("string")

    const results = []
    for (const { interval, intervalMs } of timeframes) {
      const dataUrl = new URL(`${baseUrl}/trading/${encodeURIComponent(symbol)}`)
      dataUrl.search = new URLSearchParams({
        interval,
        market: "stock",
        provider: "alpaca",
      }).toString()
      console.log(`[Alpaca frontend test] GET ${dataUrl.origin}${dataUrl.pathname}${dataUrl.search}`)

      const dataResponse = await fetch(dataUrl, {
        headers: {
          Authorization: `Bearer ${loginPayload.access_token as string}`,
        },
        signal: AbortSignal.timeout(90_000),
      })
      const payload = await readJson(dataResponse)
      expect(
        dataResponse.ok,
        `${interval} request failed with HTTP ${dataResponse.status}: ${JSON.stringify(payload)}`,
      ).toBe(true)

      expect(payload.symbol).toBe(symbol)
      expect(payload.market).toBe("stock")
      expect(payload.provider).toBe("alpaca")
      expect(payload.timeframe).toBe(interval)
      expect(payload.precio).toBeTypeOf("number")
      expect(payload.precio as number).toBeGreaterThan(0)

      const history = payload.history as JsonRecord
      expect(history).toBeTypeOf("object")
      const opens = history.opens as number[]
      const highs = history.highs as number[]
      const lows = history.lows as number[]
      const closes = history.closes as number[]
      const times = history.times as number[]
      const shareVolumes = history.volumesBase as number[]
      const dollarVolumes = history.volumes as number[]
      const count = closes.length

      expect(count, `${interval} should have enough candles for EMA200`).toBeGreaterThanOrEqual(200)
      for (const [name, series] of Object.entries({
        opens,
        highs,
        lows,
        times,
        shareVolumes,
        dollarVolumes,
        ema50: history.ema50 as number[],
        ema100: history.ema100 as number[],
        ema200: history.ema200 as number[],
      })) {
        expect(Array.isArray(series), `${interval} history.${name} must be an array`).toBe(true)
        expect(series, `${interval} history.${name} length must match candles`).toHaveLength(count)
      }

      for (let index = 0; index < count; index += 1) {
        const candle = [opens[index], highs[index], lows[index], closes[index]]
        expect(candle.every(Number.isFinite), `${interval} candle ${index} must be finite`).toBe(true)
        if (interval !== "4h" && interval !== "6h" && interval !== "1d") {
          expect(times[index] % intervalMs, `${interval} candle ${index} must align`).toBe(0)
        }
        expect(highs[index]).toBeGreaterThanOrEqual(
          Math.max(opens[index], closes[index], lows[index]),
        )
        expect(lows[index]).toBeLessThanOrEqual(
          Math.min(opens[index], closes[index], highs[index]),
        )
        expect(shareVolumes[index]).toBeGreaterThanOrEqual(0)
        expect(dollarVolumes[index]).toBeGreaterThanOrEqual(0)
        if (interval === "4h" || interval === "6h") {
          expect(dollarVolumes[index]).toBeGreaterThanOrEqual(
            shareVolumes[index] * lows[index],
          )
          expect(dollarVolumes[index]).toBeLessThanOrEqual(
            shareVolumes[index] * highs[index],
          )
        } else {
          expect(dollarVolumes[index]).toBeCloseTo(
            shareVolumes[index] * closes[index],
            5,
          )
        }
        if (index > 0) {
          expect(times[index]).toBeGreaterThan(times[index - 1])
        }
      }

      const lastIndex = count - 1
      expect(
        Number.isFinite((history.ema200 as number[])[lastIndex]),
        `${interval} latest EMA200 must be finite`,
      ).toBe(true)
      results.push({
        interval,
        candles: count,
        latestCandle: {
          timestamp: times[lastIndex],
          open: opens[lastIndex],
          high: highs[lastIndex],
          low: lows[lastIndex],
          close: closes[lastIndex],
          shareVolume: shareVolumes[lastIndex],
          dollarVolume: dollarVolumes[lastIndex],
        },
        latestPrice: payload.precio,
        ema200: (history.ema200 as number[])[lastIndex],
      })
    }

    console.log("[Alpaca frontend test] Validated candle quality for every supported timeframe:")
    console.log(JSON.stringify({ symbol, provider: "alpaca", results }, null, 2))
  },
  600_000,
)
