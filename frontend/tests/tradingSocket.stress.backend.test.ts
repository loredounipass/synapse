// @vitest-environment node

import { io, type Socket } from "socket.io-client"
import { expect, it } from "vitest"

const backendApiUrl =
  process.env.INDICATORS_BACKEND_URL ||
  "https://fuzzy-trout-76rv959r5x92wwg6-5000.app.github.dev/api"

const socketUrl = backendApiUrl.replace(/\/+$/, "").replace(/\/api$/, "")
const symbols = (process.env.SOCKET_TEST_SYMBOLS ||
  "ETHUSDT,PEPEUSDT,SOLUSDT,BTCUSDT,BNBUSDT,DOGEUSDT,XRPUSDT,SHIBUSDT")
  .split(",")
  .map((symbol) => symbol.trim().toUpperCase())
  .filter(Boolean)

const durationSeconds = Number(process.env.SOCKET_TEST_DURATION_SECONDS || 300)
const observationMs = durationSeconds * 1000
const interval = "15m"
const maxRoomsPerSocket = 10
const reconnectTimeoutMs = 30_000

type MarketUpdate = {
  symbol: string
  provider?: string
  timeframe?: string
  precio?: number
  history?: { times?: unknown[] }
}

function isMarketUpdate(value: unknown): value is MarketUpdate {
  return (
    value !== null &&
    typeof value === "object" &&
    "symbol" in value &&
    typeof value.symbol === "string"
  )
}

function percentile(samples: number[], quantile: number) {
  if (samples.length === 0) return null
  const sorted = [...samples].sort((a, b) => a - b)
  return sorted[Math.ceil(quantile * sorted.length) - 1]
}

function timestampOf(update: MarketUpdate) {
  const times = update.history?.times
  if (!Array.isArray(times) || times.length === 0) return null
  const timestamp = Number(times[times.length - 1])
  return Number.isFinite(timestamp) ? timestamp : null
}

function waitForReconnect(socket: Socket, timeoutMs: number) {
  return new Promise<number>((resolve, reject) => {
    const timeout = setTimeout(() => {
      cleanup()
      reject(new Error(`Socket did not reconnect within ${timeoutMs}ms.`))
    }, timeoutMs)

    const onConnect = () => {
      cleanup()
      resolve(performance.now())
    }

    function cleanup() {
      clearTimeout(timeout)
      socket.off("connect", onConnect)
    }

    socket.once("connect", onConnect)
  })
}

it(
  "stress-tests multi-asset socket delivery, reconnection, ordering, duplicates, and event gaps",
  async () => {
    expect(Number.isFinite(durationSeconds), "Duration must be a number").toBe(true)
    expect(durationSeconds, "Duration must be at least 20 seconds").toBeGreaterThanOrEqual(20)
    expect(new Set(symbols).size, "Configured symbols must be unique").toBe(symbols.length)
    expect(symbols.length, "Configure at least two assets").toBeGreaterThanOrEqual(2)
    expect(
      symbols.length,
      `The server allows at most ${maxRoomsPerSocket} rooms per socket connection`,
    ).toBeLessThanOrEqual(maxRoomsPerSocket)

    const symbolSet = new Set(symbols)
    const rooms = symbols.map((symbol) => `crypto:binance:${symbol}:${interval}`)
    const socket = io(socketUrl, {
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 500,
      reconnectionDelayMax: 3_000,
      timeout: 10_000,
    })
    const receivedBySymbol = new Map(symbols.map((symbol) => [symbol, 0]))
    const receivedAfterReconnect = new Map(symbols.map((symbol) => [symbol, 0]))
    const lastArrivalBySymbol = new Map<string, number>()
    const lastTimestampBySymbol = new Map<string, number>()
    const lastFingerprintBySymbol = new Map<string, string>()
    const lastFingerprintAtBySymbol = new Map<string, number>()
    const eventGapsMs: number[] = []
    let connections = 0
    let connectErrors = 0
    let disconnects = 0
    let malformedEvents = 0
    let unexpectedEvents = 0
    let timestampRegressions = 0
    let exactDuplicateEvents = 0
    let rapidDuplicateEvents = 0
    let reconnectAt: number | null = null
    let recoveryTimeBySymbol = new Map<string, number>()

    socket.on("connect", () => {
      connections += 1
      if (connections === 1) startedAt = performance.now()
      if (connections > 1) {
        reconnectAt = performance.now()
        recoveryTimeBySymbol = new Map()
      }
      for (const room of rooms) socket.emit("join", { room })
      console.log(
        `[socket] connected #${connections}; joined ${rooms.length} rooms`,
      )
    })

    socket.on("connect_error", (error) => {
      connectErrors += 1
      console.error(`[socket] connection error: ${error.message}`)
    })

    socket.on("disconnect", (reason) => {
      disconnects += 1
      console.log(`[socket] disconnected: ${reason}`)
    })

    socket.on("trading_data_update", (rawUpdate: unknown) => {
      const arrivedAt = performance.now()
      if (!isMarketUpdate(rawUpdate)) {
        malformedEvents += 1
        console.error("[event] malformed trading_data_update")
        return
      }

      const update = rawUpdate
      const symbol = update.symbol.toUpperCase()
      if (!symbolSet.has(symbol)) {
        unexpectedEvents += 1
        console.error(`[event] unexpected symbol ${symbol}`)
        return
      }
      if (update.provider !== "binance") {
        malformedEvents += 1
        console.error(`[event] ${symbol} has invalid provider ${update.provider}`)
        return
      }
      if (update.timeframe !== interval) {
        malformedEvents += 1
        console.error(`[event] ${symbol} has invalid timeframe ${update.timeframe}`)
        return
      }
      if (!Number.isFinite(update.precio) || timestampOf(update) === null) {
        malformedEvents += 1
        console.error(`[event] ${symbol} has invalid price or candle timestamp`)
        return
      }

      const count = (receivedBySymbol.get(symbol) || 0) + 1
      receivedBySymbol.set(symbol, count)
      const previousArrival = lastArrivalBySymbol.get(symbol)
      if (previousArrival !== undefined) eventGapsMs.push(arrivedAt - previousArrival)
      lastArrivalBySymbol.set(symbol, arrivedAt)

      const timestamp = timestampOf(update)
      if (timestamp !== null) {
        const previousTimestamp = lastTimestampBySymbol.get(symbol)
        if (previousTimestamp !== undefined && timestamp < previousTimestamp) {
          timestampRegressions += 1
        }
        lastTimestampBySymbol.set(symbol, timestamp)
      }

      const fingerprint = JSON.stringify(update)
      const previousFingerprint = lastFingerprintBySymbol.get(symbol)
      const previousFingerprintAt = lastFingerprintAtBySymbol.get(symbol)
      if (fingerprint === previousFingerprint) {
        exactDuplicateEvents += 1
        if (previousFingerprintAt !== undefined && arrivedAt - previousFingerprintAt < 1_000) {
          rapidDuplicateEvents += 1
        }
      }
      lastFingerprintBySymbol.set(symbol, fingerprint)
      lastFingerprintAtBySymbol.set(symbol, arrivedAt)

      if (reconnectAt !== null && !recoveryTimeBySymbol.has(symbol)) {
        recoveryTimeBySymbol.set(symbol, arrivedAt - reconnectAt)
        receivedAfterReconnect.set(
          symbol,
          (receivedAfterReconnect.get(symbol) || 0) + 1,
        )
      } else if (reconnectAt !== null) {
        receivedAfterReconnect.set(
          symbol,
          (receivedAfterReconnect.get(symbol) || 0) + 1,
        )
      }

      const price = Number.isFinite(update.precio) ? update.precio : "n/a"
      const candleTime = timestamp === null ? "n/a" : new Date(timestamp).toISOString()
      console.log(
        `[event +${((arrivedAt - startedAt) / 1000).toFixed(1)}s] ${symbol} price=${price} candle=${candleTime} total=${count}`,
      )
    })

    let startedAt = 0
    try {
      console.log(`[1/4] Connecting to ${socketUrl}`)
      const initialConnection = new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          cleanup()
          reject(new Error("Socket did not connect within 15 seconds."))
        }, 15_000)
        const onConnect = () => {
          cleanup()
          resolve()
        }
        const onConnectError = (error: Error) => {
          cleanup()
          reject(new Error(`Socket connection failed: ${error.message}`))
        }
        function cleanup() {
          clearTimeout(timeout)
          socket.off("connect", onConnect)
          socket.off("connect_error", onConnectError)
        }
        socket.once("connect", onConnect)
        socket.once("connect_error", onConnectError)
      })
      socket.connect()
      await initialConnection

      const deadline = startedAt + observationMs
      const reconnectAfterMs = Math.max(5_000, Math.floor(observationMs / 3))
      let reconnectTriggered = false
      let reconnectPromise: Promise<number> | null = null

      console.log(
        `[2/4] Observing ${symbols.length} assets for ${durationSeconds}s; reconnect scheduled at ${Math.round(reconnectAfterMs / 1000)}s`,
      )
      while (performance.now() < deadline) {
        if (!reconnectTriggered && performance.now() - startedAt >= reconnectAfterMs) {
          reconnectTriggered = true
          console.log("[socket] forcing transport close to test reconnection")
          reconnectPromise = waitForReconnect(socket, reconnectTimeoutMs)
          socket.io.engine?.close()
          reconnectAt = await reconnectPromise
          console.log(
            `[socket] reconnected after ${((reconnectAt - startedAt - reconnectAfterMs) / 1000).toFixed(2)}s; subscriptions rejoined`,
          )
        }
        await new Promise((resolve) => setTimeout(resolve, 100))
      }

      const elapsedMs = performance.now() - startedAt
      const totalEvents = [...receivedBySymbol.values()].reduce(
        (sum, count) => sum + count,
        0,
      )
      const recoveryEntries = [...recoveryTimeBySymbol.entries()]
      const report = {
        socketUrl,
        elapsedSeconds: Number((elapsedMs / 1000).toFixed(1)),
        symbols,
        roomCountPerConnection: rooms.length,
        connectionCount: connections,
        disconnects,
        connectErrors,
        totalEvents,
        eventsBySymbol: Object.fromEntries(receivedBySymbol),
        eventsAfterReconnectBySymbol: Object.fromEntries(receivedAfterReconnect),
        subscriptionRecoveryMsBySymbol: Object.fromEntries(
          recoveryEntries.map(([symbol, ms]) => [symbol, Number(ms.toFixed(1))]),
        ),
        eventGapMs: {
          samples: eventGapsMs.length,
          p50: percentile(eventGapsMs, 0.5),
          p95: percentile(eventGapsMs, 0.95),
          p99: percentile(eventGapsMs, 0.99),
          meaning: "Observed inter-event gaps, not network RTT; payloads have no server-send timestamp.",
        },
        duplicateEvents: {
          exactPayloadRepeats: exactDuplicateEvents,
          rapidRepeatsUnder1Second: rapidDuplicateEvents,
        },
        candleTimestampRegressions: timestampRegressions,
        malformedEvents,
        unexpectedEvents,
      }
      console.log("[4/4] Stress-test summary:")
      console.log(JSON.stringify(report, null, 2))

      expect(elapsedMs).toBeGreaterThanOrEqual(observationMs)
      expect(connections).toBeGreaterThanOrEqual(2)
      expect(totalEvents).toBeGreaterThan(0)
      expect([...receivedBySymbol.values()].every((count) => count > 0), "Every subscribed asset should deliver data").toBe(true)
      expect(
        [...receivedAfterReconnect.values()].every((count) => count > 0),
        "Every asset subscription should recover and deliver after reconnect",
      ).toBe(true)
      expect(malformedEvents).toBe(0)
      expect(unexpectedEvents).toBe(0)
      expect(timestampRegressions, "Candle timestamps must not move backwards per symbol").toBe(0)
      expect(rapidDuplicateEvents, "Identical payloads should not arrive in rapid duplicate bursts").toBe(0)
    } finally {
      for (const room of rooms) {
        if (socket.connected) socket.emit("leave", { room })
      }
      socket.disconnect()
    }
  },
  observationMs + 120_000,
)
