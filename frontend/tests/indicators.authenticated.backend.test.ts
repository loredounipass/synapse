// @vitest-environment node

import { expect, it } from "vitest"

const backendBaseUrl =
  process.env.INDICATORS_BACKEND_URL ||
  "https://fuzzy-trout-76rv959r5x92wwg6-5000.app.github.dev/api"

async function readResponseBody(response: Response) {
  const text = await response.text()
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

it(
  "logs in and prints live ETHUSDT Binance indicators",
  async () => {
    const email = process.env.BACKEND_TEST_EMAIL
    const password = process.env.BACKEND_TEST_PASSWORD
    if (!email || !password) {
      throw new Error(
        "Set BACKEND_TEST_EMAIL and BACKEND_TEST_PASSWORD to run this authenticated backend test.",
      )
    }

    const baseUrl = backendBaseUrl.replace(/\/+$/, "")
    const loginUrl = `${baseUrl}/auth/login`
    console.log("[1/4] Iniciando sesión en el backend")
    console.log(`      POST ${loginUrl}`)

    const loginController = new AbortController()
    const loginTimeout = setTimeout(() => loginController.abort(), 15_000)
    let loginResponse: Response
    try {
      loginResponse = await fetch(loginUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
        signal: loginController.signal,
      })
    } finally {
      clearTimeout(loginTimeout)
    }

    const loginPayload = await readResponseBody(loginResponse)
    console.log(`[2/4] Login: HTTP ${loginResponse.status} ${loginResponse.statusText}`)
    if (!loginResponse.ok) {
      console.error("      El backend rechazó el inicio de sesión:", loginPayload)
    }
    expect(loginResponse.ok, `Login falló con HTTP ${loginResponse.status}`).toBe(true)
    expect(loginPayload).toHaveProperty("access_token")
    expect(typeof loginPayload.access_token).toBe("string")

    const dataUrl = new URL(`${baseUrl}/trading/ETHUSDT`)
    dataUrl.search = new URLSearchParams({
      interval: "15m",
      market: "crypto",
      provider: "binance",
    }).toString()
    console.log("[3/4] Solicitando indicadores reales de ETHUSDT (Binance)")
    console.log(`      GET ${dataUrl.origin}${dataUrl.pathname}${dataUrl.search}`)

    const dataController = new AbortController()
    const dataTimeout = setTimeout(() => dataController.abort(), 60_000)
    let dataResponse: Response
    try {
      dataResponse = await fetch(dataUrl, {
        headers: { Authorization: `Bearer ${loginPayload.access_token}` },
        signal: dataController.signal,
      })
    } finally {
      clearTimeout(dataTimeout)
    }

    const dataPayload = await readResponseBody(dataResponse)
    console.log(`[4/4] Datos: HTTP ${dataResponse.status} ${dataResponse.statusText}`)
    console.log(JSON.stringify(dataPayload, null, 2))
    expect(dataResponse.ok, `Solicitud de indicadores falló con HTTP ${dataResponse.status}`).toBe(
      true,
    )
    expect(dataPayload).toBeTypeOf("object")
    expect(dataPayload).not.toHaveProperty("error")
  },
  90_000,
)
