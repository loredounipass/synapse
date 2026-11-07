import { describe, expect, it } from "vitest"

const backendBaseUrl =
  process.env.CHAT_BACKEND_URL ||
  "https://fuzzy-trout-76rv959r5x92wwg6-5000.app.github.dev/api"

describe("Backend chat access without authentication", () => {
  it("rejects a chat message when no credentials are sent", async () => {
    const url = new URL(`${backendBaseUrl.replace(/\/+$/, "")}/chat`)
    const body = {
      prompt: "Hola, ¿puedes analizar ETHUSDT?",
      symbol: "ETHUSDT",
      interval: "15m",
      market: "crypto",
      provider: "binance",
    }

    console.log("[1/3] Enviando un mensaje de prueba al chat sin autenticación")
    console.log(`      POST ${url.origin}${url.pathname}`)
    console.log("      Cuerpo:", JSON.stringify(body))

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 15_000)
    let response: Response
    try {
      response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal,
      })
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
})
