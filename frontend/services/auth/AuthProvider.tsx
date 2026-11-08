"use client"

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react"
import {
  getUser,
  getExpiresAt,
  hasRefreshToken,
  isAccessTokenExpiringSoon,
  isAuthenticated as checkIsAuthenticated,
  SESSION_CHANGE_EVENT,
  AUTH_REQUIRED_EVENT,
} from "./tokenManager"
import {
  loginUser,
  registerUser,
  logoutUser,
  fetchUserProfile,
  refreshAccessToken,
} from "../api/authApi"
import { AuthContextType, User } from "@/types/auth"

export const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [authDialogMode, setAuthDialogMode] = useState<"login" | "register" | null>(null)
  const [authDialogMessage, setAuthDialogMessage] = useState<string | null>(null)

  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null)
  const isRefreshingRef = useRef(false)

  // Sincronizar estado con localStorage y memoria
  const syncAuthState = useCallback(() => {
    const currentUser = getUser()
    const authenticated = checkIsAuthenticated()
    setUser(currentUser)
    setIsAuthenticated(authenticated)
    return { currentUser, authenticated }
  }, [])

  // Programa la renovación proactiva antes de que el access token expire
  const scheduleProactiveRefresh = useCallback(() => {
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current)
      refreshTimerRef.current = null
    }

    if (!hasRefreshToken()) return

    const expiresAt = getExpiresAt()
    if (!expiresAt) return

    // Renovar 2 minutos (120,000 ms) antes de la expiración.
    // Si ya quedan menos de 2 minutos, programar de inmediato (mínimo 1s).
    const msUntilRefresh = Math.max(1000, expiresAt - Date.now() - 120_000)

    refreshTimerRef.current = setTimeout(async () => {
      if (isRefreshingRef.current || !hasRefreshToken()) return
      isRefreshingRef.current = true
      try {
        await refreshAccessToken()
        syncAuthState()
      } catch (err: any) {
        console.warn("[Auth] Proactive refresh error, retrying in 30s:", err?.message || err)
        // Si falló por red transitoria, reintentar en 30s
        refreshTimerRef.current = setTimeout(() => {
          scheduleProactiveRefresh()
        }, 30_000)
      } finally {
        isRefreshingRef.current = false
      }
    }, msUntilRefresh)
  }, [syncAuthState])

  // Intenta refrescar inmediatamente si está por expirar o ya expiró
  const checkAndRefresh = useCallback(async () => {
    if (!hasRefreshToken() || isRefreshingRef.current) return
    if (isAccessTokenExpiringSoon(120_000)) {
      isRefreshingRef.current = true
      try {
        await refreshAccessToken()
        syncAuthState()
      } catch (err: any) {
        console.warn("[Auth] Refresh on visibility/focus error:", err?.message || err)
      } finally {
        isRefreshingRef.current = false
      }
    }
  }, [syncAuthState])

  useEffect(() => {
    let isMounted = true

    // Al montar: inicializamos y restauramos la sesión si es necesario
    const initializeAuth = async () => {
      const { authenticated } = syncAuthState()

      // Si tenemos refresh token pero el access token expiró o está por expirar, restaurar antes de liberar loading
      if (!authenticated && hasRefreshToken()) {
        try {
          isRefreshingRef.current = true
          await refreshAccessToken()
          if (isMounted) {
            syncAuthState()
          }
        } catch {
          // Si falló la recuperación inicial, syncAuthState ya reflejó el estado
        } finally {
          isRefreshingRef.current = false
        }
      }

      if (isMounted) {
        setIsLoading(false)
        scheduleProactiveRefresh()
      }

      // Refrescar perfil en segundo plano si está autenticado
      if (checkIsAuthenticated()) {
        fetchUserProfile()
          .then((profile) => {
            if (isMounted && profile && profile.id) {
              setUser((prev) => (prev ? { ...prev, ...profile } : profile))
            }
          })
          .catch(() => {
            // Si falla en background, no bloqueamos la app
          })
      }
    }

    initializeAuth()

    const handleSessionChange = () => {
      syncAuthState()
      scheduleProactiveRefresh()
    }

    const handleAuthRequired = (event: any) => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current)
        refreshTimerRef.current = null
      }
      syncAuthState()
      const msg = event?.detail?.message || "Se requiere iniciar sesión para continuar"
      setAuthDialogMessage(msg)
      setAuthDialogMode("login")
    }

    const handleVisibilityOrFocus = () => {
      checkAndRefresh()
      scheduleProactiveRefresh()
    }

    window.addEventListener(SESSION_CHANGE_EVENT, handleSessionChange)
    window.addEventListener(AUTH_REQUIRED_EVENT, handleAuthRequired)
    window.addEventListener("storage", handleSessionChange) // sincronización multi-pestaña
    window.addEventListener("focus", handleVisibilityOrFocus)
    document.addEventListener("visibilitychange", handleVisibilityOrFocus)

    return () => {
      isMounted = false
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current)
      }
      window.removeEventListener(SESSION_CHANGE_EVENT, handleSessionChange)
      window.removeEventListener(AUTH_REQUIRED_EVENT, handleAuthRequired)
      window.removeEventListener("storage", handleSessionChange)
      window.removeEventListener("focus", handleVisibilityOrFocus)
      document.removeEventListener("visibilitychange", handleVisibilityOrFocus)
    }
  }, [syncAuthState, scheduleProactiveRefresh, checkAndRefresh])

  const openLoginDialog = useCallback((message: string | null = null) => {
    setAuthDialogMessage(message)
    setAuthDialogMode("login")
  }, [])

  const openRegisterDialog = useCallback(() => {
    setAuthDialogMessage(null)
    setAuthDialogMode("register")
  }, [])

  const closeAuthDialog = useCallback(() => {
    setAuthDialogMode(null)
    setAuthDialogMessage(null)
  }, [])

  const handleLogin = useCallback(
    async (credentials: { email: string; password: string }) => {
      const res = await loginUser(credentials)
      syncAuthState()
      closeAuthDialog()
      return res
    },
    [syncAuthState, closeAuthDialog]
  )

  const handleRegister = useCallback(
    async (data: { email: string; username: string; password: string }) => {
      const res = await registerUser(data)
      syncAuthState()
      closeAuthDialog()
      return res
    },
    [syncAuthState, closeAuthDialog]
  )

  const handleLogout = useCallback(async () => {
    await logoutUser()
    syncAuthState()
  }, [syncAuthState])

  const value: AuthContextType = {
    user,
    isAuthenticated,
    isLoading,
    authDialogMode,
    authDialogMessage,
    openLoginDialog,
    openRegisterDialog,
    closeAuthDialog,
    login: handleLogin,
    register: handleRegister,
    logout: handleLogout,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

