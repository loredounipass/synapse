// @vitest-environment node

import { expect, it } from "vitest"

it("preserves the live backend authorization error in the frontend API client", async () => {
  const { clearSession } = await import("@/services/auth/tokenManager")
  clearSession()

  const { httpRequest } = await import("@/services/api/httpClient")
  const symbol = "AAPL"
  const path = `/trading/${symbol}?interval=15m&market=stock&provider=alpaca`

  await expect(
    httpRequest(path, { retries: 0 }),
  ).rejects.toMatchObject({
    message: "Missing or invalid Authorization header.",
    status: 401,
    body: { error: "Missing or invalid Authorization header." },
  })
})

it("preserves the live backend invalid-login error in the frontend API client", async () => {
  const { loginUser } = await import("@/services/api/authApi")
  const email = `frontend-auth-check-${Date.now()}@example.com`
  const password = "InvalidTestPassword1!"

  await expect(loginUser({ email, password })).rejects.toMatchObject({
    message: "Invalid email or password.",
    status: 401,
    body: { error: "Invalid email or password." },
  })
})
