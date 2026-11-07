// @vitest-environment node

import { io, type Socket } from "socket.io-client"
import { expect, it } from "vitest"

const backendApiUrl =
  process.env.INDICATORS_BACKEND_URL ||
  "https://fuzzy-trout-76rv959r5x92wwg6-5000.app.github.dev/api"

const socketUrl = backendApiUrl.replace(/\/+$/, "").replace(/\/api$/, "")

const room = "crypto:binance:ETHUSDT:15m"
const eventTimeoutMs = 60_000

function waitForConnection(socket: Socket, timeoutMs: number): Promise<number> {
  const startedAt = performance.now()

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      cleanup()
      reject(new Error(`Socket connection timed out after ${timeoutMs}ms.`))
    }, timeoutMs)

    const onConnect = () => {
      cleanup()
      resolve(performance.now() - startedAt)
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
}

function requestMarketUpdate(socket: Socket, timeoutMs: number) {
  return new Promise<{ payload: unknown; latencyMs: number }>((resolve, reject) => {
    const startedAt = performance.now()
    const timeout = setTimeout(() => {
      cleanup()
      reject(new Error(`No trading_data_update received within ${timeoutMs}ms.`))
    }, timeoutMs)

    const onUpdate = (payload: unknown) => {
      cleanup()
      resolve({ payload, latencyMs: performance.now() - startedAt })
    }

    const onDisconnect = (reason: string) => {
      cleanup()
      reject(new Error(`Socket disconnected before the update arrived: ${reason}`))
    }

    function cleanup() {
      clearTimeout(timeout)
      socket.off("trading_data_update", onUpdate)
      socket.off("disconnect", onDisconnect)
    }

    socket.once("trading_data_update", onUpdate)
    socket.once("disconnect", onDisconnect)
    socket.emit("join", { room })
    socket.emit("request_refresh", { room })
  })
}

it(
  "connects to the trading socket, receives a refresh event, measures latency, and disconnects",
  async () => {
    const socket = io(socketUrl, {
      reconnection: false,
      timeout: 10_000,
    })

    try {
      console.log(`[1/4] Conectando al socket ${socketUrl}`)
      const connectionLatencyMs = await waitForConnection(socket, 15_000)
      console.log(`[2/4] Conectado en ${connectionLatencyMs.toFixed(1)} ms`)
      expect(Number.isFinite(connectionLatencyMs)).toBe(true)

      console.log(`[3/4] Uniéndose a ${room} y solicitando actualización`)
      const { payload, latencyMs } = await requestMarketUpdate(socket, eventTimeoutMs)
      console.log(`[4/4] trading_data_update recibido en ${latencyMs.toFixed(1)} ms`)
      expect(Number.isFinite(latencyMs)).toBe(true)
      expect(payload).toMatchObject({
        symbol: "ETHUSDT",
        provider: "binance",
        timeframe: "15m",
      })
    } finally {
      if (socket.connected) {
        socket.emit("leave", { room })
      }
      socket.disconnect()
      expect(socket.connected).toBe(false)
    }
  },
  90_000,
)
