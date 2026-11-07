import { describe, expect, it } from "vitest"

const backendBaseUrl =
  process.env.INDICATORS_BACKEND_URL ||
  "https://fuzzy-trout-76rv959r5x92wwg6-5000.app.github.dev/api"
const symbol = process.env.INDICATORS_TEST_SYMBOL || "BTCUSDT"
const interval = process.env.INDICATORS_TEST_INTERVAL || "15m"

describe("Backend indicators feed diagnostics (no authentication)", () => {
  it("rejects ETHUSDT Binance indicator requests without credentials", async () => {
    const url = new URL(`${backendBaseUrl.replace(/\/+$/, "")}/trading/ETHUSDT`)
    url.search = new URLSearchParams({
      interval: "15m",
      market: "crypto",
      provider: "binance",
    }).toString()

    console.log("[1/3] Solicitando indicadores ETHUSDT de Binance sin autenticación")
    console.log(`      ${url.origin}${url.pathname}${url.search}`)

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 15_000)
    let response: Response
    try {
      response = await fetch(url, { signal: controller.signal })
    } catch (error) {
      console.error("[2/3] No se pudo conectar con el backend:", error)
      throw error
    } finally {
      clearTimeout(timeout)
    }

    const payload = await response.json()
    console.log(`[2/3] HTTP ${response.status} ${response.statusText}`)
    console.log("[3/3] Respuesta del backend:")
    console.log(JSON.stringify(payload, null, 2))

    expect(response.status).toBe(401)
    expect(payload).toEqual({ error: "Missing or invalid Authorization header." })
  })

  it("prints backend and live-feed status in request order", async () => {
    const baseUrl = backendBaseUrl.replace(/\/+$/, "")
    const url = new URL(`${baseUrl}/trading/feed-health`)
    url.search = new URLSearchParams({
      symbol,
      interval,
      market: "crypto",
      provider: "coinbase",
    }).toString()

    console.log("[1/3] Consultando diagnóstico público del backend")
    console.log(`      ${url.origin}${url.pathname}${url.search}`)

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 15_000)
    let response: Response
    try {
      response = await fetch(url, { signal: controller.signal })
    } catch (error) {
      console.error("[2/3] No se pudo conectar con el backend:", error)
      throw error
    } finally {
      clearTimeout(timeout)
    }

    console.log(`[2/3] HTTP ${response.status} ${response.statusText}`)
    const payload = await response.json()
    console.log("[3/3] Estado del backend/feed:")
    console.log(JSON.stringify(payload, null, 2))
    console.log(
      "      Sin credenciales no se solicitan indicadores: /trading/<símbolo> requiere JWT.",
    )

    expect(response.ok, `Backend respondió HTTP ${response.status}`).toBe(true)
    expect(payload).toHaveProperty("backend")
    expect(payload).toHaveProperty("requested.feed", `crypto:coinbase:${symbol}:${interval}`)
  })
})
