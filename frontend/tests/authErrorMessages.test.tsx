import React, { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { LoginDialog } from "@/components/auth/LoginDialog"
import { RegisterDialog } from "@/components/auth/RegisterDialog"
import { loginUser } from "@/services/api/authApi"
import { getApiErrorMessage } from "@/services/api/errorMessages"

Object.defineProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT", {
  configurable: true,
  value: true,
})

const mocks = vi.hoisted(() => ({
  login: vi.fn(),
  register: vi.fn(),
  authDialogMode: "login" as "login" | "register",
  showErrorToast: vi.fn(),
  showSuccessToast: vi.fn(),
  closeAuthDialog: vi.fn(),
  openRegisterDialog: vi.fn(),
}))

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    authDialogMode: mocks.authDialogMode,
    authDialogMessage: null,
    closeAuthDialog: mocks.closeAuthDialog,
    openRegisterDialog: mocks.openRegisterDialog,
    login: mocks.login,
    register: mocks.register,
  }),
}))

vi.mock("@/components/global-toast", () => ({
  showErrorToast: mocks.showErrorToast,
  showSuccessToast: mocks.showSuccessToast,
}))

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children }: { children: React.ReactNode }) => children,
  DialogContent: ({ children }: { children: React.ReactNode }) => children,
  DialogHeader: ({ children }: { children: React.ReactNode }) => children,
  DialogTitle: ({ children }: { children: React.ReactNode }) => children,
}))

vi.mock("@/components/auth/PasswordStrengthIndicator", () => ({
  PasswordStrengthIndicator: () => null,
  validatePasswordRules: () => [{ id: "valid", valid: true }],
}))

describe("backend error messages in authentication UI", () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    container = document.createElement("div")
    document.body.append(container)
    root = createRoot(container)
    vi.clearAllMocks()
    mocks.authDialogMode = "login"
  })

  afterEach(async () => {
    await act(async () => root.unmount())
    container.remove()
    vi.unstubAllGlobals()
  })

  it("preserves the backend login error in the API client", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      text: async () => JSON.stringify({ error: "Invalid email or password." }),
    }))

    await expect(
      loginUser({ email: "trader@example.com", password: "wrong-password" }),
    ).rejects.toMatchObject({
      message: "Invalid email or password.",
      status: 401,
      body: { error: "Invalid email or password." },
    })
  })

  it("shows the backend login error instead of a generic toast", async () => {
    const backendError = Object.assign(
      new Error("Invalid email or password."),
      { status: 401, body: { error: "Invalid email or password." } },
    )
    mocks.login.mockRejectedValueOnce(backendError)

    await act(async () => {
      root.render(<LoginDialog />)
    })

    const inputs = container.querySelectorAll("input")
    const setInputValue = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    )?.set
    expect(setInputValue).toBeTypeOf("function")

    await act(async () => {
      setInputValue?.call(inputs[0], "trader@example.com")
      inputs[0].dispatchEvent(new Event("input", { bubbles: true }))
      setInputValue?.call(inputs[1], "wrong-password")
      inputs[1].dispatchEvent(new Event("input", { bubbles: true }))
      container.querySelector("form")?.dispatchEvent(
        new Event("submit", { bubbles: true, cancelable: true }),
      )
      await new Promise((resolve) => setTimeout(resolve, 0))
    })

    expect(mocks.login).toHaveBeenCalledWith({
      email: "trader@example.com",
      password: "wrong-password",
    })
    expect(mocks.showErrorToast).toHaveBeenCalledWith(
      "Invalid email or password.",
    )
    expect(mocks.showErrorToast).not.toHaveBeenCalledWith(
      "Error al iniciar sesión",
    )
  })

  it("shows the backend registration error instead of a generic toast", async () => {
    const backendError = Object.assign(
      new Error("Email already registered."),
      { status: 409, body: { error: "Email already registered." } },
    )
    mocks.register.mockRejectedValueOnce(backendError)
    mocks.authDialogMode = "register"

    await act(async () => {
      root.render(<RegisterDialog />)
    })

    const inputs = container.querySelectorAll("input")
    const setInputValue = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    )?.set
    await act(async () => {
      setInputValue?.call(inputs[0], "trader")
      inputs[0].dispatchEvent(new Event("input", { bubbles: true }))
      setInputValue?.call(inputs[1], "trader@example.com")
      inputs[1].dispatchEvent(new Event("input", { bubbles: true }))
      setInputValue?.call(inputs[2], "StrongPass123!")
      inputs[2].dispatchEvent(new Event("input", { bubbles: true }))
      container.querySelector("form")?.dispatchEvent(
        new Event("submit", { bubbles: true, cancelable: true }),
      )
      await new Promise((resolve) => setTimeout(resolve, 0))
    })

    expect(mocks.register).toHaveBeenCalledWith({
      username: "trader",
      email: "trader@example.com",
      password: "StrongPass123!",
    })
    expect(mocks.showErrorToast).toHaveBeenCalledWith("Email already registered.")
    expect(mocks.showErrorToast).not.toHaveBeenCalledWith(
      "Error al registrar la cuenta",
    )
  })

  it("prefers backend response text and uses a specific fallback only without a response", () => {
    expect(
      getApiErrorMessage(
        {
          message: "HTTP 401",
          status: 401,
          body: { error: "Account is deactivated." },
        },
        "No se pudo conectar.",
      ),
    ).toBe("Account is deactivated.")

    expect(
      getApiErrorMessage(
        new TypeError("Failed to fetch"),
        "No se pudo conectar con el servidor de autenticación.",
      ),
    ).toBe("No se pudo conectar con el servidor de autenticación.")
  })
})
