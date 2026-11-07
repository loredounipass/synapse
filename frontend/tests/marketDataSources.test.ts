import { beforeEach, describe, expect, it, vi } from "vitest"
import { connectTradingRoom } from "@/services/realtime/tradingSocketClient"
import { ENDPOINTS } from "@/services/api/endpoints"
import { getStockDataProvider } from "@/services/api/tradingApi"
import { io } from "socket.io-client"

vi.mock("socket.io-client", () => ({
  io: vi.fn(),
}))

const mockIo = vi.mocked(io)
const socketHandlers = new Map<string, (payload?: unknown) => void>()
const mockSocket = {
  on: vi.fn((event: string, handler: (payload?: unknown) => void) => {
    socketHandlers.set(event, handler)
    return mockSocket
  }),
  emit: vi.fn(),
  disconnect: vi.fn(),
}

describe("Stock market data sources in the frontend", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    socketHandlers.clear()
    mockIo.mockReturnValue(mockSocket as never)
  })
  it.each(["AAPL", "NVDA", "MSFT"])(
    "selects Alpaca for %s and builds its stock route",
    (symbol) => {
      const source = getStockDataProvider(symbol)
      expect(source).toBe("alpaca")
      expect(ENDPOINTS.trading(symbol, "15m", "stock", source)).toBe(
        `/trading/${symbol}?interval=15m&market=stock&provider=alpaca`,
      )
    },
  )

  it.each(["^NDX", "GC=F", "EURUSD=X"])(
    "keeps Yahoo fallback for non-equity symbol %s",
    (symbol) => {
      expect(getStockDataProvider(symbol)).toBe("yahoo")
    },
  )

  it("subscribes to the Alpaca stock room and forwards stock updates", () => {
    const onDataUpdate = vi.fn()
    const cleanup = connectTradingRoom({
      symbol: "AAPL",
      interval: "15m",
      market: "stock",
      provider: "alpaca",
      onConnected: vi.fn(),
      onDataUpdate,
      onConnectError: vi.fn(),
      onDisconnected: vi.fn(),
    })

    expect(mockIo).toHaveBeenCalledOnce()
    expect(socketHandlers.has("connect")).toBe(true)
    socketHandlers.get("connect")?.()
    expect(mockSocket.emit).toHaveBeenCalledWith("join", {
      room: "stock:alpaca:AAPL:15m",
    })

    const update = {
      symbol: "AAPL",
      market: "stock",
      provider: "alpaca",
      timeframe: "15m",
      precio: 210.5,
    }
    socketHandlers.get("trading_data_update")?.(update)
    expect(onDataUpdate).toHaveBeenCalledWith(update)

    cleanup()
    expect(mockSocket.emit).toHaveBeenCalledWith("leave", {
      room: "stock:alpaca:AAPL:15m",
    })
    expect(mockSocket.disconnect).toHaveBeenCalledOnce()
  })

})
