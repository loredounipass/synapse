/**
 * Cliente HTTP de bajo nivel (capa de transporte).
 *
 * Único lugar del frontend que conoce la URL base del backend y que ejecuta
 * `fetch`. Expone dos primitivas:
 *   - httpRequest: GET/POST con reintentos, timeout, inyección automática de
 *     Bearer token, auto-refresh en 401 y normalización de errores.
 *   - rawRequest:  `fetch` sin reintentos que devuelve la Response cruda, para
 *     casos especiales (streaming SSE de /chat y blobs de audio de /tts).
 *
 * Ningún hook o componente debe llamar a `fetch` directamente: consumen los
 * servicios de `services/api/*` que se apoyan en este módulo.
 */

import {
  getAccessToken,
  getRefreshToken,
  updateTokens,
  clearSession,
  isAccessTokenExpiringSoon,
  AUTH_REQUIRED_EVENT,
} from "../auth/tokenManager"

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000/api"

// URL raiz del servidor (sin el sufijo /api) para la conexión socket.io.
export const SOCKET_URL =
  process.env.NEXT_PUBLIC_SOCKET_URL ||
  API_BASE_URL.replace(/\/+$/, "").replace(/\/api$/, "")

function buildUrl(path) {
  return `${API_BASE_URL}${path.startsWith("/") ? "" : "/"}${path}`
}

function notifyAuthRequired(detail = "Session required") {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(AUTH_REQUIRED_EVENT, { detail: { message: detail } }))
  }
}

// Promesa compartida para deduplicar peticiones simultáneas de refresh token
let refreshPromise = null

export async function performTokenRefresh() {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const refreshToken = getRefreshToken()
      if (!refreshToken) {
        clearSession()
        notifyAuthRequired("Session expired. Please log in again.")
        throw new Error("No refresh token available")
      }

      try {
        const res = await fetch(buildUrl("/auth/refresh"), {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ refresh_token: refreshToken }),
        })

        const data = await res.json().catch(() => null)
        if (!res.ok || !data || data.error) {
          const msg = data && data.error ? data.error : "Session expired. Please log in again."
          // Solo si es un rechazo de autenticación (401, 403, 400 o error explícito) limpiamos la sesión
          const isAuthRejection = res.status === 401 || res.status === 403 || res.status === 400 || (data && data.error)
          if (isAuthRejection) {
            clearSession()
            notifyAuthRequired(msg)
          }
          throw new Error(msg)
        }

        updateTokens(data)
        return data
      } catch (err) {
        // No destruir la sesión si fue solo un corte transitorio de red o timeout
        const isNetworkErr = err.name === "AbortError" || /fetch|network|failed/i.test(err.message || "")
        if (!isNetworkErr && !getRefreshToken()) {
          clearSession()
          notifyAuthRequired(err.message || "Session expired")
        }
        throw err
      } finally {
        refreshPromise = null
      }
    })()
  }
  return refreshPromise
}

/**
 * Estatus que sí valen la pena reintentar.
 * El 503 del backend es determinista: significa "el feeder no publico esta sala
 * en Redis" y llega despues de esperar el seed completo (STORE_SEED_WAIT_SECONDS,
 * ~20 s). Reintentarlo sumaria otra espera igual (3 intentos = ~60 s de pantalla
 * de carga) sin cambiar el resultado, asi que se reporta directo al usuario.
 * 500/502/504 y rate-limit siguen siendo transitorios: esos si se reintentan.
 */
const isRetryableStatus = (status) => status >= 500 && status !== 503

/**
 * Petición JSON con timeout, reintentos, inyección de JWT y auto-refresh.
 * Devuelve el cuerpo ya parseado (u objeto con `.error`) o lanza Error.
 */
export async function httpRequest(
  path,
  {
    method = "GET",
    headers = {},
    body = null,
    timeout = 15000,
    retries = 2,
    skipAuth = false,
  } = {}
) {
  const url = buildUrl(path)

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController()
    const id = setTimeout(() => controller.abort(), timeout)

    // Inyectar JWT automáticamente si la ruta es protegida
    const finalHeaders = {
      Accept: "application/json",
      ...headers,
    }

    if (!skipAuth) {
      let token = getAccessToken()
      // Si el access token ya expiró localmente pero tenemos refresh token, refrescar antes de enviar
      if (token && getRefreshToken() && isAccessTokenExpiringSoon(0)) {
        try {
          token = await performTokenRefresh()
        } catch {
          token = getAccessToken()
        }
      }
      if (token && !finalHeaders["Authorization"]) {
        finalHeaders["Authorization"] = `Bearer ${token}`
      }
    }

    try {
      const res = await fetch(url, {
        method,
        headers: finalHeaders,
        body: body ? JSON.stringify(body) : null,
        signal: controller.signal,
      })
      clearTimeout(id)

      const text = await res.text()
      let data = null
      try {
        data = text ? JSON.parse(text) : null
      } catch (e) {
        data = text
      }

      // ── Manejo de 401 Unauthorized ───────────────────────────────
      if (res.status === 401 && !skipAuth) {
        const errorMsg = data && data.error ? data.error.toLowerCase() : ""

        // Solo si expiró el access token intentamos auto-refresh y reintentamos UNA vez.
        // Tokens revocados, inválidos o cuentas desactivadas van directo al login.
        if (errorMsg.includes("expired")) {
          try {
            const tokenData = await performTokenRefresh()
            const newToken = typeof tokenData === "string" ? tokenData : tokenData?.access_token
            return await httpRequest(path, {
              method,
              headers: { ...headers, Authorization: `Bearer ${newToken}` },
              body,
              timeout,
              retries: 0,
              skipAuth: false,
            })
          } catch (refreshErr) {
            const err = new Error(refreshErr.message || "Session expired")
            err.status = 401
            err.body = data
            throw err
          }
        } else {
          // Token revocado, cuenta inactiva o formato inválido
          clearSession()
          notifyAuthRequired(data?.error || "Authentication required")
          const err = new Error(data?.error || "Authentication required")
          err.status = 401
          err.body = data
          throw err
        }
      }

      const isRateLimit =
        res.status === 429 || (data && data.error && data.error.toLowerCase().includes("rate limit"))

      if (!res.ok || (data && data.error)) {
        const errorMessage = data && data.error ? data.error : `HTTP ${res.status}`
        const err = new Error(errorMessage)
        err.status = data && data.status ? data.status : res.status !== 200 ? res.status : 400
        err.body = data

        // Reintentar en 5xx o rate limit
        if ((isRetryableStatus(err.status) || isRateLimit) && attempt < retries) {
          const delay = isRateLimit ? 2000 * (attempt + 1) : 2 ** attempt * 100
          await new Promise((r) => setTimeout(r, delay))
          continue
        }
        throw err
      }

      return data
    } catch (err) {
      clearTimeout(id)
      const isAbort = err.name === "AbortError"
      const retryableStatus = !err.status || isRetryableStatus(err.status)
      const shouldRetry = (isAbort || retryableStatus) && attempt < retries
      if (shouldRetry) {
        await new Promise((r) => setTimeout(r, 2 ** attempt * 100))
        continue
      }
      throw err
    }
  }
}

/**
 * `fetch` crudo que devuelve la Response tal cual (sin parsear ni reintentar).
 * Inyecta el Bearer token salvo que se indique `skipAuth: true`.
 * Si el token está por expirar o ya expiró y hay refresh token, lo renueva
 * preventivamente antes de abrir streams SSE o peticiones de audio.
 * Se usa para el stream SSE de /chat y para el blob de audio de /tts.
 */
export async function rawRequest(path, init = {}, { skipAuth = false } = {}) {
  const finalInit = { ...init }
  const finalHeaders = { ...(finalInit.headers || {}) }

  if (!skipAuth) {
    let token = getAccessToken()
    // Renovar preventivamente si faltan menos de 30s para que no se corte el stream a mitad
    if (token && getRefreshToken() && isAccessTokenExpiringSoon(30_000)) {
      try {
        const tokenData = await performTokenRefresh()
        token = typeof tokenData === "string" ? tokenData : tokenData?.access_token
      } catch {
        token = getAccessToken()
      }
    }
    if (token && !finalHeaders["Authorization"]) {
      finalHeaders["Authorization"] = `Bearer ${token}`
    }
  }

  finalInit.headers = finalHeaders
  let res = await fetch(buildUrl(path), finalInit)

  // Manejo de 401 en rawRequest (SSE / chat / audio)
  if (res.status === 401 && !skipAuth && getRefreshToken()) {
    const clone = res.clone()
    const errorText = (await clone.text().catch(() => "")) || ""
    const isExpired = errorText.toLowerCase().includes("expired")

    if (isExpired) {
      try {
        const tokenData = await performTokenRefresh()
        const newToken = typeof tokenData === "string" ? tokenData : tokenData?.access_token
        const retryHeaders = { ...finalHeaders, Authorization: `Bearer ${newToken}` }
        res = await fetch(buildUrl(path), { ...finalInit, headers: retryHeaders })
      } catch (refreshErr) {
        clearSession()
        notifyAuthRequired("Session expired. Please log in again.")
      }
    } else {
      clearSession()
      notifyAuthRequired("Authentication required")
    }
  }

  return res
}
