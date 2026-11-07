// @vitest-environment node

import { io } from "socket.io-client"
import { expect, it } from "vitest"

const backendApiUrl =
  process.env.INDICATORS_BACKEND_URL ||
  "https://fuzzy-trout-76rv959r5x92wwg6-5000.app.github.dev/api"

const socketUrl = backendApiUrl.replace(/\/+$/, "").replace(/\/api$/, "")
const symbols = (process.env.SOCKET_TEST_SYMBOLS ||
  "ETHUSDT,BTCUSDT,SOLUSDT,BNBUSDT")
  .split(",")
  .map((symbol) => symbol.trim().toUpperCase())
  .filter(Boolean)

const interval = "15m"
const observationMs = 20_000
const refreshThrottleMs = 5_200

it(
  "observes live socket updates across configured assets for 20 seconds",
  async () => {
    expect(new Set(symbols).size, "Configured socket-test symbols must be unique").toBe(
      symbols.length,
    )
    expect(symbols.length, "Configure at least two assets").toBeGreaterThanOrEqual(2)

    const socket = io(socketUrl, {
      reconnection: true,
      reconnectionAttempts: 3,
      reconnectionDelay: 500,
      timeout: 10_000,
    })
    const rooms = symbols.map(
      (symbol) => `crypto:binance:${symbol}:${interval}`,
    )
    const receivedBySymbol = new Map<string, number>(
      symbols.map((symbol) => [symbol, 0]),
    )
    const pendingRequests = new Map<string, number>()
    const firstUpdateAfterRequestMs: Array<{ symbol: string; latencyMs: number }> = []
    let unexpectedEvents = 0
    let disconnects = 0
    let connectErrors = 0
    let malformedEvents = 0

    const onUpdate = (payload: unknown) => {
      if (
        payload === null ||
        typeof payload !== "object" ||
        !("symbol" in payload) ||
        typeof payload.symbol !== "string"
      ) {
        malformedEvents += 1
        return
      }

      const symbol = payload.symbol.toUpperCase()
      const count = receivedBySymbol.get(symbol)
      if (count === undefined) {
        unexpectedEvents += 1
        return
      }
      receivedBySymbol.set(symbol, count + 1)

      const requestedAt = pendingRequests.get(symbol)
      if (requestedAt !== undefined) {
        firstUpdateAfterRequestMs.push({
          symbol,
          latencyMs: performance.now() - requestedAt,
        })
        pendingRequests.delete(symbol)
      }
    }

    socket.on("trading_data_update", onUpdate)
    socket.on("disconnect", () => {
      disconnects += 1
    })
    socket.on("connect_error", () => {
      connectErrors += 1
    })

    try {
      console.log(`[1/3] Conectando a ${socketUrl}`)
      await new Promise<void>((resolve, reject) => {
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

      for (const room of rooms) socket.emit("join", { room })

      console.log(
        `[2/3] Observando ${symbols.join(", ")} durante ${observationMs / 1000}s`,
      )
      const startedAt = performance.now()
      const deadline = startedAt + observationMs
      let nextRefreshAt = startedAt
      let requestIndex = 0
      while (performance.now() < deadline) {
        const now = performance.now()
        if (now >= nextRefreshAt) {
          const symbol = symbols[requestIndex % symbols.length]
          const room = rooms[requestIndex % rooms.length]
          pendingRequests.set(symbol, performance.now())
          socket.emit("request_refresh", { room })
          requestIndex += 1
          nextRefreshAt = now + refreshThrottleMs
        }
        await new Promise((resolve) =>
          setTimeout(resolve, Math.min(100, Math.max(0, deadline - performance.now()))),
        )
      }

      const elapsedMs = performance.now() - startedAt
      const totalUpdates = [...receivedBySymbol.values()].reduce(
        (total, count) => total + count,
        0,
      )
      const summary = {
        socketUrl,
        elapsedSeconds: Number((elapsedMs / 1000).toFixed(2)),
        refreshRequestsSent: requestIndex,
        updatesReceived: totalUpdates,
        updatesBySymbol: Object.fromEntries(receivedBySymbol),
        firstUpdateAfterRequestMs: firstUpdateAfterRequestMs.map(({ symbol, latencyMs }) => ({
          symbol,
          latencyMs: Number(latencyMs.toFixed(1)),
        })),
        latencyNote:
          "Time from refresh request to first matching update; a periodic feed event may arrive first.",
        disconnects,
        connectErrors,
        malformedEvents,
        unexpectedEvents,
      }
      console.log("[3/3] Resumen de comunicación en vivo:")
      console.log(JSON.stringify(summary, null, 2))

      expect(elapsedMs).toBeGreaterThanOrEqual(observationMs)
      expect(totalUpdates, "Socket should deliver updates during the observation window").toBeGreaterThan(
        0,
      )
      expect(
        [...receivedBySymbol.values()].filter((count) => count > 0).length,
        "Socket should deliver updates for at least two requested assets",
      ).toBeGreaterThanOrEqual(2)
      expect(malformedEvents).toBe(0)
      expect(unexpectedEvents).toBe(0)
    } finally {
      for (const room of rooms) {
        if (socket.connected) socket.emit("leave", { room })
      }
      socket.disconnect()
    }
  },
  90_000,
)
