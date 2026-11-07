// @vitest-environment node

import { expect, it } from "vitest"
import {
  buildCandleAndVolumeSeries,
  buildPriceSparklineData,
} from "@/components/indicators/indicatorSeries"

const backendBaseUrl =
  process.env.INDICATORS_BACKEND_URL ||
  "https://fuzzy-trout-76rv959r5x92wwg6-5000.app.github.dev/api"

const marketViews = [
  { symbol: "ETHUSDT", interval: "15m", intervalMs: 15 * 60 * 1000 },
  { symbol: "ETHUSDT", interval: "1h", intervalMs: 60 * 60 * 1000 },
  { symbol: "BTCUSDT", interval: "15m", intervalMs: 15 * 60 * 1000 },
] as const

type MarketZone = Record<string, unknown> & { id: string }

type MarketPayload = {
  symbol: string
  provider: string
  timeframe: string
  precio: number
  history: Record<string, unknown[]>
  orderBlocks: MarketZone[]
  fairValueGaps: MarketZone[]
  liquiditySwings: MarketZone[]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
}

function isZoneArray(value: unknown): value is MarketZone[] {
  return (
    Array.isArray(value) &&
    value.every((zone) => isRecord(zone) && typeof zone.id === "string")
  )
}

function parseMarketPayload(value: unknown): MarketPayload {
  if (
    !isRecord(value) ||
    typeof value.symbol !== "string" ||
    typeof value.provider !== "string" ||
    typeof value.timeframe !== "string" ||
    typeof value.precio !== "number" ||
    !isRecord(value.history) ||
    !isZoneArray(value.orderBlocks) ||
    !isZoneArray(value.fairValueGaps) ||
    !isZoneArray(value.liquiditySwings)
  ) {
    throw new Error("Backend returned a malformed trading payload.")
  }

  const history: Record<string, unknown[]> = {}
  for (const [key, series] of Object.entries(value.history)) {
    if (!Array.isArray(series)) {
      throw new Error(`Backend history.${key} is not an array.`)
    }
    history[key] = series
  }

  return {
    symbol: value.symbol,
    provider: value.provider,
    timeframe: value.timeframe,
    precio: value.precio,
    history,
    orderBlocks: value.orderBlocks,
    fairValueGaps: value.fairValueGaps,
    liquiditySwings: value.liquiditySwings,
  }
}

async function readJson(response: Response) {
  const text = await response.text()
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

async function fetchMarketView(
  baseUrl: string,
  token: string,
  view: (typeof marketViews)[number],
): Promise<MarketPayload> {
  const url = new URL(`${baseUrl}/trading/${view.symbol}`)
  url.search = new URLSearchParams({
    interval: view.interval,
    market: "crypto",
    provider: "binance",
  }).toString()
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(60_000),
  })
  const payload = await readJson(response)
  expect(
    response.ok,
    `${view.symbol} ${view.interval} returned HTTP ${response.status}: ${JSON.stringify(payload)}`,
  ).toBe(true)
  return parseMarketPayload(payload)
}

function assertUniqueZoneIds(zones: MarketZone[], label: string) {
  const ids = zones.map((zone) => zone.id)
  expect(ids.every((id) => typeof id === "string" && id.length > 0), `${label} IDs must exist`).toBe(
    true,
  )
  expect(new Set(ids).size, `${label} must not contain duplicate IDs`).toBe(ids.length)
}

function closedCandles(payload: MarketPayload, intervalMs: number, now: number) {
  const lastClosedOpen = Math.floor(now / intervalMs) * intervalMs - intervalMs
  const result = new Map<number, number[]>()
  for (let index = 0; index < payload.history.times.length; index += 1) {
    const time = Number(payload.history.times[index])
    if (time <= lastClosedOpen) {
      result.set(time, [
        Number(payload.history.opens[index]),
        Number(payload.history.highs[index]),
        Number(payload.history.lows[index]),
        Number(payload.history.closes[index]),
        Number(payload.history.volumes[index]),
      ])
    }
  }
  return result
}

it(
  "checks chart price, timeframe/symbol isolation, closed candles, and stable zone identities",
  async () => {
    const email = process.env.BACKEND_TEST_EMAIL
    const password = process.env.BACKEND_TEST_PASSWORD
    if (!email || !password) {
      throw new Error(
        "Set BACKEND_TEST_EMAIL and BACKEND_TEST_PASSWORD to run this authenticated backend test.",
      )
    }

    const baseUrl = backendBaseUrl.replace(/\/+$/, "")
    console.log("[1/6] Autenticando (sin mostrar credenciales)")
    const loginResponse = await fetch(`${baseUrl}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
      signal: AbortSignal.timeout(15_000),
    })
    const loginPayload = await readJson(loginResponse)
    expect(loginResponse.ok, `Login falló con HTTP ${loginResponse.status}`).toBe(true)
    expect(loginPayload).toHaveProperty("access_token")
    const token = loginPayload.access_token

    const snapshots = new Map<
      string,
      { payload: MarketPayload; closed: Map<number, number[]> }
    >()
    for (const [index, view] of marketViews.entries()) {
      console.log(`[${index + 2}/6] Consultando ${view.symbol} ${view.interval} Binance`)
      const payload = await fetchMarketView(baseUrl, token, view)
      expect(payload.symbol).toBe(view.symbol)
      expect(payload.provider).toBe("binance")
      expect(payload.timeframe).toBe(view.interval)

      const history = payload.history
      expect(history).toBeTypeOf("object")
      const { candleData, volumeChartData } = buildCandleAndVolumeSeries(payload)
      expect(candleData.length).toBeGreaterThan(1)
      expect(volumeChartData).toHaveLength(candleData.length)

      const seriesKeys = [
        "opens",
        "highs",
        "lows",
        "closes",
        "times",
        "volumes",
        "ema50",
        "ema100",
        "ema200",
      ]
      for (const key of seriesKeys) {
        expect(history[key], `${view.symbol} ${view.interval} history.${key}`).toHaveLength(
          history.closes.length,
        )
      }
      for (const [key, series] of Object.entries(history)) {
        expect(series, `history.${key} should use the selected candle grid`).toHaveLength(
          history.closes.length,
        )
      }

      const latestHistoryIndex = history.closes.length - 1
      const lastCandle = candleData.at(-1)
      expect(lastCandle?.close).toBe(Number(history.closes[latestHistoryIndex]))
      expect(lastCandle?.open).toBe(Number(history.opens[latestHistoryIndex]))
      expect(lastCandle?.ema50).toBe(history.ema50[latestHistoryIndex] ?? null)
      expect(lastCandle?.ema100).toBe(history.ema100[latestHistoryIndex] ?? null)
      expect(lastCandle?.ema200).toBe(history.ema200[latestHistoryIndex] ?? null)
      expect(volumeChartData.at(-1)?.volume).toBe(Number(history.volumes[latestHistoryIndex]))
      expect(payload.precio).toBeGreaterThan(0)

      const sparkline = buildPriceSparklineData(history.closes, payload.precio)
      expect(sparkline).toHaveLength(Math.min(30, history.closes.length))
      expect(sparkline.at(-1)?.price).toBe(payload.precio)

      const times = history.times.map(Number)
      for (let candle = 0; candle < times.length; candle += 1) {
        expect(Number.isInteger(times[candle])).toBe(true)
        expect(times[candle] % view.intervalMs).toBe(0)
        if (candle > 0) {
          expect(times[candle] - times[candle - 1]).toBe(view.intervalMs)
        }
      }

      for (const [name, zones] of [
        ["orderBlocks", payload.orderBlocks],
        ["fairValueGaps", payload.fairValueGaps],
        ["liquiditySwings", payload.liquiditySwings],
      ]) {
        expect(Array.isArray(zones), `${name} should be an array`).toBe(true)
        assertUniqueZoneIds(zones, `${view.symbol} ${view.interval} ${name}`)
      }

      snapshots.set(`${view.symbol}:${view.interval}`, {
        payload,
        closed: closedCandles(payload, view.intervalMs, Date.now()),
      })
    }

    console.log("[5/6] Releyendo ETHUSDT 15m para verificar estabilidad")
    const repeated = await fetchMarketView(baseUrl, token, marketViews[0])
    const initial = snapshots.get("ETHUSDT:15m")
    if (!initial) throw new Error("Initial ETHUSDT 15m response was not recorded.")
    expect(repeated.symbol).toBe("ETHUSDT")
    expect(repeated.timeframe).toBe("15m")
    for (const zoneName of ["orderBlocks", "fairValueGaps", "liquiditySwings"]) {
      assertUniqueZoneIds(repeated[zoneName], `repeated ETHUSDT 15m ${zoneName}`)

      const initialZones = new Map<string, MarketZone>(
        initial.payload[zoneName].map((zone) => [zone.id, zone] as const),
      )
      for (const zone of repeated[zoneName]) {
        const previous = initialZones.get(zone.id)
        if (previous) {
          for (const field of [
            "side",
            "top",
            "bottom",
            "price",
            "formedAt",
            "originTime",
            "confirmationTime",
            "formationIndex",
            "originIndex",
            "confirmationIndex",
          ]) {
            expect(zone[field]).toBe(previous[field])
          }
        }
      }
    }

    const repeatedClosed = closedCandles(
      repeated,
      marketViews[0].intervalMs,
      Date.now(),
    )
    const sharedTimes = [...initial.closed.keys()].filter((time) => repeatedClosed.has(time))
    expect(sharedTimes.length, "at least 10 closed candles should overlap").toBeGreaterThanOrEqual(
      10,
    )
    for (const time of sharedTimes.slice(-20)) {
      expect(repeatedClosed.get(time), `closed candle at ${new Date(time).toISOString()}`).toEqual(
        initial.closed.get(time),
      )
    }

    const eth15Snapshot = snapshots.get("ETHUSDT:15m")
    const eth1hSnapshot = snapshots.get("ETHUSDT:1h")
    const btc15Snapshot = snapshots.get("BTCUSDT:15m")
    if (!eth15Snapshot || !eth1hSnapshot || !btc15Snapshot) {
      throw new Error("One or more requested market views were not recorded.")
    }
    const eth15 = eth15Snapshot.payload
    const eth1h = eth1hSnapshot.payload
    const btc15 = btc15Snapshot.payload
    expect(eth15.symbol).not.toBe(btc15.symbol)
    expect(eth15.timeframe).not.toBe(eth1h.timeframe)
    expect(eth15.history.closes).not.toEqual(btc15.history.closes)

    console.log("[6/6] Consistencia visual/temporal verificada")
    console.log(
      JSON.stringify(
        {
          views: [...snapshots.keys()],
          candles: Object.fromEntries(
            [...snapshots].map(([key, snapshot]) => [
              key,
              snapshot.payload.history.closes.length,
            ]),
          ),
          stableClosedCandlesCompared: Math.min(sharedTimes.length, 20),
          zoneIdsUnique: true,
        },
        null,
        2,
      ),
    )
  },
  180_000,
)
