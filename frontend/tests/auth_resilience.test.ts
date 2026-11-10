import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import { httpRequest, rawRequest, performTokenRefresh } from "@/services/api/httpClient"
import { refreshAccessToken } from "@/services/api/authApi"
import * as tokenManager from "@/services/auth/tokenManager"

describe("Auth Resilience & Deduplication", () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  afterEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it("deduplicates 10 concurrent requests on 401 expired token into exactly ONE refresh call", async () => {
    tokenManager.setSession({
      access_token: "expired-token-1",
      refresh_token: "refresh-token-1",
      expires_in: 900,
      user: { id: "user-123", email: "resilience@synapse.com" },
    })

    let refreshCallCount = 0
    let protectedCallCount = 0

    globalThis.fetch = vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
      const urlStr = String(url)
      if (urlStr.includes("/auth/refresh")) {
        refreshCallCount++
        return {
          ok: true,
          status: 200,
          json: async () => ({
            access_token: "brand-new-access-token",
            refresh_token: "brand-new-refresh-token",
            expires_in: 900,
          }),
        } as unknown as Response
      }

      if (urlStr.includes("/trading/BTCUSDT")) {
        protectedCallCount++
        const authHeader = (init?.headers as Record<string, string>)?.[
          "Authorization"
        ] || ""
        if (authHeader.includes("expired-token-1")) {
          return {
            ok: false,
            status: 401,
            text: async () => JSON.stringify({ error: "Token has expired." }),
          } as unknown as Response
        }
        if (authHeader.includes("brand-new-access-token")) {
          return {
            ok: true,
            status: 200,
            text: async () => JSON.stringify({ price: 72000, success: true }),
          } as unknown as Response
        }
      }

      return {
        ok: false,
        status: 404,
        text: async () => "Not Found",
      } as unknown as Response
    })

    // Execute 10 concurrent requests
    const promises = Array.from({ length: 10 }, () =>
      httpRequest("/trading/BTCUSDT", { retries: 0 })
    )

    const results = await Promise.all(promises)

    // Verify all 10 succeeded
    expect(results).toHaveLength(10)
    for (const res of results) {
      expect(res).toEqual({ price: 72000, success: true })
    }

    // Crucial check: /auth/refresh was called EXACTLY ONCE
    expect(refreshCallCount).toBe(1)
    // 10 initial calls + 10 retries = 20 calls
    expect(protectedCallCount).toBe(20)
    expect(tokenManager.getAccessToken()).toBe("brand-new-access-token")
  })

  it("deduplicates proactive refreshAccessToken and reactive 401 httpRequest fired simultaneously", async () => {
    tokenManager.setSession({
      access_token: "expired-proactive-token",
      refresh_token: "valid-proactive-refresh",
      expires_in: 900,
      user: { id: "user-456" },
    })

    let refreshCallCount = 0

    globalThis.fetch = vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
      const urlStr = String(url)
      if (urlStr.includes("/auth/refresh")) {
        refreshCallCount++
        // Simulate a small network delay
        await new Promise((r) => setTimeout(r, 20))
        return {
          ok: true,
          status: 200,
          json: async () => ({
            access_token: "fresh-sync-token",
            refresh_token: "fresh-sync-refresh",
            expires_in: 900,
          }),
        } as unknown as Response
      }

      if (urlStr.includes("/trading/ETHUSDT")) {
        const authHeader = (init?.headers as Record<string, string>)?.[
          "Authorization"
        ] || ""
        if (authHeader.includes("expired-proactive-token")) {
          return {
            ok: false,
            status: 401,
            text: async () => JSON.stringify({ error: "Token has expired." }),
          } as unknown as Response
        }
        return {
          ok: true,
          status: 200,
          text: async () => JSON.stringify({ price: 3500 }),
        } as unknown as Response
      }

      return {
        ok: false,
        status: 404,
        text: async () => "Not Found",
      } as unknown as Response
    })

    // Simultaneously fire proactive timer refresh and a reactive 401 request
    const [proactiveRes, reactiveRes] = await Promise.all([
      refreshAccessToken(),
      httpRequest("/trading/ETHUSDT", { retries: 0 }),
    ])

    expect(proactiveRes.access_token).toBe("fresh-sync-token")
    expect(reactiveRes).toEqual({ price: 3500 })
    expect(refreshCallCount).toBe(1)
    expect(tokenManager.getAccessToken()).toBe("fresh-sync-token")
  })

  it("recovers rawRequest (SSE / streaming) when token is expired", async () => {
    tokenManager.setSession({
      access_token: "expired-stream-token",
      refresh_token: "valid-stream-refresh",
      expires_in: 900,
      user: { id: "user-stream" },
    })

    let refreshCalled = false

    globalThis.fetch = vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
      const urlStr = String(url)
      if (urlStr.includes("/auth/refresh")) {
        refreshCalled = true
        return {
          ok: true,
          status: 200,
          json: async () => ({
            access_token: "new-stream-token",
            refresh_token: "new-stream-refresh",
            expires_in: 900,
          }),
        } as unknown as Response
      }

      if (urlStr.includes("/api/chat/stream")) {
        const authHeader = (init?.headers as Record<string, string>)?.[
          "Authorization"
        ] || ""
        if (authHeader.includes("expired-stream-token")) {
          return {
            ok: false,
            status: 401,
            clone: () => ({
              text: async () => JSON.stringify({ error: "Token has expired." }),
            }),
            text: async () => JSON.stringify({ error: "Token has expired." }),
          } as unknown as Response
        }
        return {
          ok: true,
          status: 200,
          text: async () => "stream-chunk-data",
        } as unknown as Response
      }

      return {
        ok: false,
        status: 404,
        text: async () => "Not Found",
      } as unknown as Response
    })

    const res = await rawRequest("/api/chat/stream")

    expect(refreshCalled).toBe(true)
    expect(res.status).toBe(200)
    expect(await res.text()).toBe("stream-chunk-data")
    expect(tokenManager.getAccessToken()).toBe("new-stream-token")
  })

  it("handles unrecoverable 401 in rawRequest by clearing session and notifying auth required", async () => {
    tokenManager.setSession({
      access_token: "stolen-stream-token",
      refresh_token: "stolen-stream-refresh",
      expires_in: 900,
      user: { id: "user-stream" },
    })

    const authRequiredSpy = vi.fn()
    window.addEventListener(tokenManager.AUTH_REQUIRED_EVENT, authRequiredSpy)

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      clone: () => ({
        text: async () => JSON.stringify({ error: "Token has been revoked." }),
      }),
      text: async () => JSON.stringify({ error: "Token has been revoked." }),
    })

    const res = await rawRequest("/api/chat/stream")

    expect(res.status).toBe(401)
    expect(tokenManager.isAuthenticated()).toBe(false)
    expect(tokenManager.getAccessToken()).toBeNull()
    expect(authRequiredSpy).toHaveBeenCalledTimes(1)

    window.removeEventListener(tokenManager.AUTH_REQUIRED_EVENT, authRequiredSpy)
  })
})

