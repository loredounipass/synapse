/**
 * Token Manager — gestión segura de sesión en localStorage.
 *
 * Responsabilidad única: CRUD de tokens y usuario, cálculo de expiración,
 * y señales de estado para sincronizar tabs y componentes React.
 *
 * Claves en localStorage:
 *   synapse_access_token   – JWT de acceso (15 min TTL)
 *   synapse_refresh_token  – JWT de refresco (7 días TTL)
 *   synapse_user           – JSON del perfil (id, email, username, etc.)
 *   synapse_expires_at     – timestamp (ms) de expiración del access token
 *
 * NO se parsea el JWT en el frontend: el backend controla la validez.
 *
 * El AuthProvider programa un refresh proactivo 2 min antes de la expiración
 * usando getExpiresAt() para evitar cortes de sesión por inactividad.
 */

const KEYS = {
  accessToken: "synapse_access_token",
  refreshToken: "synapse_refresh_token",
  user: "synapse_user",
  expiresAt: "synapse_expires_at",
}

/** Evento custom despachado al cambiar la sesión (login, logout, refresh). */
export const SESSION_CHANGE_EVENT = "synapse:session-change"

/** Evento custom despachado cuando el interceptor HTTP detecta un 401 irrecuperable. */
export const AUTH_REQUIRED_EVENT = "synapse:auth-required"

/** Nombre del canal BroadcastChannel para sincronizar sesiones entre pestañas del navegador. */
export const AUTH_SYNC_CHANNEL = "synapse_auth_sync"

// ── Getters ─────────────────────────────────────────────────────────

export function getAccessToken() {
  try {
    return localStorage.getItem(KEYS.accessToken)
  } catch {
    return null
  }
}

export function getRefreshToken() {
  try {
    return localStorage.getItem(KEYS.refreshToken)
  } catch {
    return null
  }
}

export function getUser() {
  try {
    const raw = localStorage.getItem(KEYS.user)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function getExpiresAt() {
  try {
    const raw = localStorage.getItem(KEYS.expiresAt)
    return raw ? Number(raw) : 0
  } catch {
    return 0
  }
}

/**
 * Milisegundos restantes hasta la expiración del access token.
 * Retorna 0 si ya expiró o no existe.
 */
export function getTimeUntilExpiry() {
  const expiresAt = getExpiresAt()
  if (!expiresAt) return 0
  return Math.max(0, expiresAt - Date.now())
}

/**
 * Retorna true si el access token expira en menos del umbral (por defecto 2 minutos = 120,000 ms).
 */
export function isAccessTokenExpiringSoon(thresholdMs = 120_000) {
  const expiresAt = getExpiresAt()
  if (!expiresAt) return true
  return expiresAt - Date.now() <= thresholdMs
}

// ── Setters ─────────────────────────────────────────────────────────

/**
 * Persiste la sesión completa a partir de la respuesta del backend
 * (AuthResponseDTO de /auth/login o /auth/register).
 *
 * @param {{ access_token: string, refresh_token: string, expires_in: number, user: object }} authResponse
 */
export function setSession(authResponse) {
  try {
    const { access_token, refresh_token, expires_in, user } = authResponse
    localStorage.setItem(KEYS.accessToken, access_token)
    localStorage.setItem(KEYS.refreshToken, refresh_token)
    localStorage.setItem(KEYS.user, JSON.stringify(user))
    // expires_in viene en segundos, convertimos a timestamp absoluto en ms.
    const expiresAt = Date.now() + expires_in * 1000
    localStorage.setItem(KEYS.expiresAt, String(expiresAt))
  } catch {
    // localStorage no disponible (incognito en Safari, etc.)
  }
  dispatchSessionChange()
  broadcastSessionSync("SESSION_REFRESHED")
}

/**
 * Actualiza solo los tokens (tras un refresh exitoso), sin tocar el user.
 *
 * @param {{ access_token: string, refresh_token: string, expires_in: number }} tokenResponse
 */
export function updateTokens(tokenResponse) {
  try {
    const { access_token, refresh_token, expires_in } = tokenResponse
    localStorage.setItem(KEYS.accessToken, access_token)
    localStorage.setItem(KEYS.refreshToken, refresh_token)
    const expiresAt = Date.now() + expires_in * 1000
    localStorage.setItem(KEYS.expiresAt, String(expiresAt))
  } catch {
    // ignore
  }
  dispatchSessionChange()
  broadcastSessionSync("SESSION_REFRESHED")
}

/** Limpia toda la sesión (logout o 401 irrecuperable). */
export function clearSession() {
  try {
    localStorage.removeItem(KEYS.accessToken)
    localStorage.removeItem(KEYS.refreshToken)
    localStorage.removeItem(KEYS.user)
    localStorage.removeItem(KEYS.expiresAt)
  } catch {
    // ignore
  }
  dispatchSessionChange()
  broadcastSessionSync("AUTH_LOGOUT")
}

// ── Estado derivado ─────────────────────────────────────────────────

/**
 * Verifica si hay una sesión válida localmente.
 * Esto NO garantiza que el backend acepte el token (puede estar revocado),
 * pero evita peticiones inútiles si ya sabemos que expiró.
 */
export function isAuthenticated() {
  const token = getAccessToken()
  if (!token) return false
  // Margen de 30s para evitar race conditions con el backend.
  return getExpiresAt() > Date.now() + 30_000
}

/**
 * Verifica si hay un refresh token disponible (para intentar renovar).
 */
export function hasRefreshToken() {
  return !!getRefreshToken()
}

/**
 * Verifica si hay una sesión recuperable (hay refresh token y usuario).
 */
export function hasActiveSession() {
  return hasRefreshToken() && !!getUser()
}

// ── Utilidades internas ─────────────────────────────────────────────

function broadcastSessionSync(type) {
  if (typeof window !== "undefined" && "BroadcastChannel" in window) {
    try {
      const channel = new BroadcastChannel(AUTH_SYNC_CHANNEL)
      channel.postMessage({ type, timestamp: Date.now() })
      channel.close()
    } catch {
      // ignore
    }
  }
}

function dispatchSessionChange() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(SESSION_CHANGE_EVENT))
  }
}

