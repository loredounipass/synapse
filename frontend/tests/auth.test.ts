import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import * as tokenManager from "@/services/auth/tokenManager"
import * as authApi from "@/services/api/authApi"
import * as httpClient from "@/services/api/httpClient"
import { validatePasswordRules } from "@/components/auth/PasswordStrengthIndicator"
import { ENDPOINTS } from "@/services/api/endpoints"

describe("Token Manager (CRUD, Expiration & Cross-Tab Broadcasts)", () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  afterEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it("returns null/false when no session is stored", () => {
    expect(tokenManager.getAccessToken()).toBeNull()
    expect(tokenManager.getRefreshToken()).toBeNull()
    expect(tokenManager.getUser()).toBeNull()
    expect(tokenManager.getExpiresAt()).toBe(0)
    expect(tokenManager.getTimeUntilExpiry()).toBe(0)
    expect(tokenManager.isAuthenticated()).toBe(false)
    expect(tokenManager.hasRefreshToken()).toBe(false)
    expect(tokenManager.hasActiveSession()).toBe(false)
  })

  it("correctly persists session data, dispatches event, and broadcasts SESSION_REFRESHED", () => {
    const mockUser = { id: "user-123", email: "trader@synapse.com", username: "trader_pro" }
    const sessionData = {
      access_token: "mock-access-token",
      refresh_token: "mock-refresh-token",
      expires_in: 900, // 15 minutes
      user: mockUser,
    }

    const eventSpy = vi.fn()
    window.addEventListener(tokenManager.SESSION_CHANGE_EVENT, eventSpy)

    // Spy on BroadcastChannel.prototype.postMessage
    let postedMessage: any = null
    const originalBroadcastChannel = globalThis.BroadcastChannel
    class MockBroadcastChannel {
      name: string
      constructor(name: string) {
        this.name = name
      }
      postMessage(msg: any) {
        postedMessage = msg
      }
      close() { }
    }
    globalThis.BroadcastChannel = MockBroadcastChannel as any

    try {
      tokenManager.setSession(sessionData)

      expect(tokenManager.getAccessToken()).toBe("mock-access-token")
      expect(tokenManager.getRefreshToken()).toBe("mock-refresh-token")
      expect(tokenManager.getUser()).toEqual(mockUser)
      expect(tokenManager.isAuthenticated()).toBe(true)
      expect(tokenManager.hasRefreshToken()).toBe(true)
      expect(tokenManager.hasActiveSession()).toBe(true)
      expect(eventSpy).toHaveBeenCalledTimes(1)

      // Multi-tab broadcast check
      expect(postedMessage).not.toBeNull()
      expect(postedMessage.type).toBe("SESSION_REFRESHED")
      expect(typeof postedMessage.timestamp).toBe("number")
    } finally {
      globalThis.BroadcastChannel = originalBroadcastChannel
      window.removeEventListener(tokenManager.SESSION_CHANGE_EVENT, eventSpy)
    }
  })

  it("updates tokens without modifying existing user data and broadcasts SESSION_REFRESHED", () => {
    const mockUser = { id: "user-123", email: "trader@synapse.com", username: "trader_pro" }
    tokenManager.setSession({
      access_token: "old-access",
      refresh_token: "old-refresh",
      expires_in: 900,
      user: mockUser,
    })

    let postedMessage: any = null
    const originalBroadcastChannel = globalThis.BroadcastChannel
    class MockBroadcastChannel {
      name: string
      constructor(name: string) {
        this.name = name
      }
      postMessage(msg: any) {
        postedMessage = msg
      }
      close() { }
    }
    globalThis.BroadcastChannel = MockBroadcastChannel as any

    try {
      tokenManager.updateTokens({
        access_token: "new-access",
        refresh_token: "new-refresh",
        expires_in: 900,
      })

      expect(tokenManager.getAccessToken()).toBe("new-access")
      expect(tokenManager.getRefreshToken()).toBe("new-refresh")
      expect(tokenManager.getUser()).toEqual(mockUser)
      expect(postedMessage?.type).toBe("SESSION_REFRESHED")
    } finally {
      globalThis.BroadcastChannel = originalBroadcastChannel
    }
  })

  it("clears session data completely and broadcasts AUTH_LOGOUT", () => {
    tokenManager.setSession({
      access_token: "token",
      refresh_token: "refresh",
      expires_in: 900,
      user: { id: "1" },
    })

    let postedMessage: any = null
    const originalBroadcastChannel = globalThis.BroadcastChannel
    class MockBroadcastChannel {
      name: string
      constructor(name: string) {
        this.name = name
      }
      postMessage(msg: any) {
        postedMessage = msg
      }
      close() { }
    }
    globalThis.BroadcastChannel = MockBroadcastChannel as any

    try {
      tokenManager.clearSession()

      expect(tokenManager.getAccessToken()).toBeNull()
      expect(tokenManager.getRefreshToken()).toBeNull()
      expect(tokenManager.getUser()).toBeNull()
      expect(tokenManager.isAuthenticated()).toBe(false)
      expect(tokenManager.hasRefreshToken()).toBe(false)
      expect(tokenManager.hasActiveSession()).toBe(false)
      expect(postedMessage?.type).toBe("AUTH_LOGOUT")
    } finally {
      globalThis.BroadcastChannel = originalBroadcastChannel
    }
  })

  it("considers token expired when timestamp is in the past or within 30s margin", () => {
    // Expired in past
    tokenManager.setSession({
      access_token: "token",
      refresh_token: "refresh",
      expires_in: -10,
      user: { id: "1" },
    })
    expect(tokenManager.isAuthenticated()).toBe(false)

    // Expiring in 20 seconds (less than 30s margin)
    tokenManager.setSession({
      access_token: "token-expiring-20s",
      refresh_token: "refresh",
      expires_in: 20,
      user: { id: "1" },
    })
    expect(tokenManager.isAuthenticated()).toBe(false)

    // Expiring in 60 seconds (greater than 30s margin)
    tokenManager.setSession({
      access_token: "token-fresh-60s",
      refresh_token: "refresh",
      expires_in: 60,
      user: { id: "1" },
    })
    expect(tokenManager.isAuthenticated()).toBe(true)
  })

  it("calculates time until expiry and detects tokens expiring soon with custom threshold", () => {
    tokenManager.setSession({
      access_token: "fresh-token",
      refresh_token: "refresh-token",
      expires_in: 900, // 15 min
      user: { id: "1" },
    })

    expect(tokenManager.getTimeUntilExpiry()).toBeGreaterThan(800_000)
    expect(tokenManager.isAccessTokenExpiringSoon(120_000)).toBe(false)
    expect(tokenManager.hasActiveSession()).toBe(true)

    // Token with only 60 seconds left
    tokenManager.setSession({
      access_token: "expiring-soon-token",
      refresh_token: "refresh-token",
      expires_in: 60,
      user: { id: "1" },
    })

    expect(tokenManager.isAccessTokenExpiringSoon(120_000)).toBe(true)
    expect(tokenManager.isAccessTokenExpiringSoon(30_000)).toBe(false)
  })

  it("does not crash when BroadcastChannel throws or is unavailable", () => {
    const originalBroadcastChannel = globalThis.BroadcastChannel
      // Simulate environment where BroadcastChannel constructor throws
      ; (globalThis as any).BroadcastChannel = function () {
        throw new Error("BroadcastChannel not allowed")
      }

    try {
      expect(() => {
        tokenManager.setSession({
          access_token: "t",
          refresh_token: "r",
          expires_in: 300,
          user: { id: "1" },
        })
      }).not.toThrow()

      expect(() => {
        tokenManager.updateTokens({
          access_token: "t2",
          refresh_token: "r2",
          expires_in: 300,
        })
      }).not.toThrow()

      expect(() => {
        tokenManager.clearSession()
      }).not.toThrow()
    } finally {
      globalThis.BroadcastChannel = originalBroadcastChannel
    }
  })
})

describe("Auth API Client Functions", () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  afterEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it("loginUser posts to /auth/login with skipAuth and saves session", async () => {
    const mockAuthResponse = {
      access_token: "login-acc-token",
      refresh_token: "login-ref-token",
      expires_in: 900,
      user: { id: "u-1", email: "user@synapse.com" },
    }

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify(mockAuthResponse),
    })

    const res = await authApi.loginUser({
      email: "user@synapse.com",
      password: "StrongPassword123!",
    })

    expect(globalThis.fetch).toHaveBeenCalledTimes(1)
    const [url, init] = (globalThis.fetch as any).mock.calls[0]
    expect(url).toContain("/auth/login")
    expect(init.method).toBe("POST")
    expect(JSON.parse(init.body)).toEqual({
      email: "user@synapse.com",
      password: "StrongPassword123!",
    })

    expect(tokenManager.getAccessToken()).toBe("login-acc-token")
    expect(tokenManager.getUser()).toEqual(mockAuthResponse.user)
    expect(res).toEqual(mockAuthResponse)
  })

  it("registerUser posts to /auth/register with skipAuth and saves session", async () => {
    const mockAuthResponse = {
      access_token: "reg-acc-token",
      refresh_token: "reg-ref-token",
      expires_in: 900,
      user: { id: "u-2", email: "new@synapse.com" },
    }

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify(mockAuthResponse),
    })

    const res = await authApi.registerUser({
      email: "new@synapse.com",
      username: "newtrader",
      password: "StrongPassword123!",
    })

    expect(globalThis.fetch).toHaveBeenCalledTimes(1)
    const [url, init] = (globalThis.fetch as any).mock.calls[0]
    expect(url).toContain("/auth/register")
    expect(init.method).toBe("POST")

    expect(tokenManager.getAccessToken()).toBe("reg-acc-token")
    expect(res).toEqual(mockAuthResponse)
  })

  it("refreshAccessToken delegates directly to performTokenRefresh singleton", async () => {
    tokenManager.setSession({
      access_token: "current-acc",
      refresh_token: "current-ref",
      expires_in: 900,
      user: { id: "u-3" },
    })

    const performTokenRefreshSpy = vi.spyOn(httpClient, "performTokenRefresh")

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        access_token: "refreshed-acc",
        refresh_token: "refreshed-ref",
        expires_in: 900,
      }),
    })

    const res = await authApi.refreshAccessToken()

    expect(performTokenRefreshSpy).toHaveBeenCalledTimes(1)
    expect(res.access_token).toBe("refreshed-acc")
    expect(tokenManager.getAccessToken()).toBe("refreshed-acc")
  })

  it("refreshAccessToken throws immediately if no refresh token is present", async () => {
    tokenManager.clearSession()
    await expect(authApi.refreshAccessToken()).rejects.toThrow("No refresh token available.")
  })

  it("logoutUser posts to /auth/logout and clears session completely", async () => {
    tokenManager.setSession({
      access_token: "to-logout-acc",
      refresh_token: "to-logout-ref",
      expires_in: 900,
      user: { id: "u-4" },
    })

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ message: "Logged out" }),
    })

    await authApi.logoutUser()

    expect(globalThis.fetch).toHaveBeenCalledTimes(1)
    const [url] = (globalThis.fetch as any).mock.calls[0]
    expect(url).toContain("/auth/logout")

    expect(tokenManager.getAccessToken()).toBeNull()
    expect(tokenManager.getRefreshToken()).toBeNull()
    expect(tokenManager.getUser()).toBeNull()
  })

  it("fetchUserProfile performs authenticated GET request to /auth/profile", async () => {
    tokenManager.setSession({
      access_token: "profile-acc-token",
      refresh_token: "profile-ref-token",
      expires_in: 900,
      user: { id: "u-5" },
    })

    const userProfile = { id: "u-5", email: "trader@synapse.com", role: "pro" }

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify(userProfile),
    })

    const res = await authApi.fetchUserProfile()

    expect(globalThis.fetch).toHaveBeenCalledTimes(1)
    const [url, init] = (globalThis.fetch as any).mock.calls[0]
    expect(url).toContain("/auth/profile")
    expect(init.headers["Authorization"]).toBe("Bearer profile-acc-token")
    expect(res).toEqual(userProfile)
  })
})

describe("Password Security Validation Rules", () => {
  it("rejects passwords shorter than 8 characters", () => {
    const rules = validatePasswordRules("Pass1!")
    const lengthRule = rules.find((r) => r.id === "length")
    expect(lengthRule?.valid).toBe(false)
  })

  it("rejects passwords longer than 72 characters (Bcrypt boundary limit)", () => {
    const tooLong = "A".repeat(73) + "a1!"
    const rules = validatePasswordRules(tooLong)
    const lengthRule = rules.find((r) => r.id === "length")
    expect(lengthRule?.valid).toBe(false)
  })

  it("detects missing uppercase letter", () => {
    const rules = validatePasswordRules("password123!")
    const upperRule = rules.find((r) => r.id === "uppercase")
    expect(upperRule?.valid).toBe(false)
  })

  it("detects missing lowercase letter", () => {
    const rules = validatePasswordRules("PASSWORD123!")
    const lowerRule = rules.find((r) => r.id === "lowercase")
    expect(lowerRule?.valid).toBe(false)
  })

  it("detects missing digit", () => {
    const rules = validatePasswordRules("PasswordSpecial!")
    const digitRule = rules.find((r) => r.id === "digit")
    expect(digitRule?.valid).toBe(false)
  })

  it("detects missing special symbol", () => {
    const rules = validatePasswordRules("Password1234")
    const symbolRule = rules.find((r) => r.id === "symbol")
    expect(symbolRule?.valid).toBe(false)
  })

  it("validates compliant password satisfying all 5 security rules", () => {
    const rules = validatePasswordRules("StrongPass123!")
    const allValid = rules.every((r) => r.valid)
    expect(allValid).toBe(true)
  })
})

describe("Auth Endpoints Map", () => {
  it("generates correct relative paths for authentication endpoints", () => {
    expect(ENDPOINTS.authRegister()).toBe("/auth/register")
    expect(ENDPOINTS.authLogin()).toBe("/auth/login")
    expect(ENDPOINTS.authRefresh()).toBe("/auth/refresh")
    expect(ENDPOINTS.authLogout()).toBe("/auth/logout")
    expect(ENDPOINTS.authProfile()).toBe("/auth/profile")
  })
})
