import React, { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { AuthProvider, useAuth } from "@/services/auth/AuthProvider"
import { httpRequest } from "@/services/api/httpClient"
import * as tokenManager from "@/services/auth/tokenManager"

Object.defineProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT", {
  configurable: true,
  value: true,
})

function AuthMessageProbe() {
  const { authDialogMode, authDialogMessage } = useAuth()
  return (
    <div>
      <span data-testid="mode">{authDialogMode}</span>
      <span data-testid="message">{authDialogMessage}</span>
    </div>
  )
}

describe("backend session errors displayed by the auth provider", () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    localStorage.clear()
    container = document.createElement("div")
    document.body.append(container)
    root = createRoot(container)
  })

  afterEach(async () => {
    await act(async () => root.unmount())
    container.remove()
    tokenManager.clearSession()
    vi.unstubAllGlobals()
  })

  it("shows the backend session error in the login dialog state", async () => {
    tokenManager.setSession({
      access_token: "revoked-access-token",
      refresh_token: "refresh-token",
      expires_in: 900,
      user: { id: "test-user" },
    })
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      text: async () => JSON.stringify({ error: "Token has been revoked." }),
    }))

    await act(async () => {
      root.render(
        <AuthProvider>
          <AuthMessageProbe />
        </AuthProvider>,
      )
    })
    await act(async () => {
      await expect(
        httpRequest("/trading/BTCUSDT", { retries: 0 }),
      ).rejects.toThrow("Token has been revoked.")
    })

    expect(container.querySelector('[data-testid="mode"]')?.textContent).toBe("login")
    expect(container.querySelector('[data-testid="message"]')?.textContent).toBe(
      "Token has been revoked.",
    )
  })

  it("shows the backend refresh-token error after an expired access token", async () => {
    await act(async () => {
      root.render(
        <AuthProvider>
          <AuthMessageProbe />
        </AuthProvider>,
      )
    })
    await act(async () => {
      tokenManager.setSession({
        access_token: "expired-access-token",
        refresh_token: "revoked-refresh-token",
        expires_in: 900,
        user: { id: "test-user" },
      })
    })
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: async () => JSON.stringify({ error: "Token has expired." }),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: "Refresh token has been revoked." }),
      }))

    await act(async () => {
      await expect(
        httpRequest("/trading/BTCUSDT", { retries: 0 }),
      ).rejects.toThrow("Refresh token has been revoked.")
    })

    expect(container.querySelector('[data-testid="mode"]')?.textContent).toBe("login")
    expect(container.querySelector('[data-testid="message"]')?.textContent).toBe(
      "Refresh token has been revoked.",
    )
  })
})
