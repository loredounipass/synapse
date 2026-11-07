import { afterEach, describe, expect, it } from "vitest"
import { loginUser } from "@/services/api/authApi"
import {
  createChatSession,
  deleteChatSession,
  fetchChatState,
  openChatStream,
  saveChatMessage,
} from "@/services/api/chatApi"
import { clearSession } from "@/services/auth/tokenManager"

const email = process.env.BACKEND_TEST_EMAIL
const password = process.env.BACKEND_TEST_PASSWORD
const hasCredentials = Boolean(email && password)

afterEach(() => {
  clearSession()
})

describe("Live backend chat session and MCP integration", () => {
  it.skipIf(!hasCredentials)(
    "sends a market-analysis message, verifies the MCP tool, and deletes its temporary session",
    async () => {
      await loginUser({ email, password })
      const state = await fetchChatState()
      const title = `MCP integration test ${Date.now()}`
      const session = await createChatSession({
        title,
        symbol: "AAPL",
        market: "stock",
        interval: "15m",
      })
      let cleanupError: unknown

      try {
        console.log(`[chat live] Created temporary session: ${session.id}`)

        const prompt =
          "Analiza AAPL usando el feed seleccionado. Antes del análisis, verifica con MCP los datos de mercado actuales e indica proveedor, símbolo, disponibilidad y precio."
        await saveChatMessage(session.id, {
          role: "user",
          content: prompt,
          timestamp: Date.now(),
        })

        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 150_000)
        let response: Response
        try {
          response = await openChatStream(
            {
              prompt,
              session_id: session.id,
              model: state.selected_model,
              symbol: "AAPL",
              interval: "15m",
              market: "stock",
              provider: "alpaca",
              stream: true,
            },
            controller.signal,
          )
        } catch (error) {
          clearTimeout(timeout)
          throw error
        }

        if (!response.ok || !response.body) clearTimeout(timeout)
        expect(response.ok, `Chat endpoint returned HTTP ${response.status}`).toBe(true)
        expect(response.body).not.toBeNull()

        const reader = response.body!.getReader()
        const decoder = new TextDecoder()
        const events: Array<Record<string, unknown>> = []
        let buffer = ""
        try {
          while (true) {
            const { done, value } = await reader.read()
            if (done) break
            buffer += decoder.decode(value, { stream: true })
            const chunks = buffer.split("\n\n")
            buffer = chunks.pop() || ""

            for (const chunk of chunks) {
              const data = chunk
                .split("\n")
                .filter((line) => line.startsWith("data:"))
                .map((line) => line.slice(5).trim())
                .join("\n")
              if (data) events.push(JSON.parse(data))
            }
          }
          if (buffer.trim()) {
            const data = buffer
              .split("\n")
              .filter((line) => line.startsWith("data:"))
              .map((line) => line.slice(5).trim())
              .join("\n")
            if (data) events.push(JSON.parse(data))
          }
        } finally {
          clearTimeout(timeout)
          reader.releaseLock()
        }

        const streamError = events.find((event) => event.type === "error")
        expect(streamError, `Chat stream error: ${JSON.stringify(streamError)}`).toBeUndefined()

        const toolEvent = events.find(
          (event) => event.type === "tool" && event.name === "get_selected_market_data",
        )
        const doneEvent = events.find((event) => event.type === "done")
        const accessedTools = Array.isArray(doneEvent?.memory_accessed)
          ? doneEvent.memory_accessed as Array<Record<string, unknown>>
          : []
        const mcpMetadata = accessedTools.find(
          (tool) => tool.tool === "get_selected_market_data",
        )
        const answer = events
          .filter((event) => event.type === "content" && typeof event.chunk === "string")
          .map((event) => event.chunk)
          .join("")

        console.log("[chat live] MCP event:", JSON.stringify(toolEvent ?? null))
        console.log("[chat live] Recorded tool metadata:", JSON.stringify(mcpMetadata ?? null))
        console.log(`[chat live] Stream events: ${events.length}; assistant response: ${answer.length} chars`)

        expect(toolEvent, "Expected the server to emit the MCP tool event").toBeDefined()
        expect(toolEvent).toMatchObject({
          provider: "alpaca",
          symbol: "AAPL",
        })
        expect(mcpMetadata, "Expected MCP tool metadata in the done event").toMatchObject({
          tool: "get_selected_market_data",
          provider: "alpaca",
          symbol: "AAPL",
        })
        expect(answer.trim()).not.toBe("")

        await saveChatMessage(session.id, {
          role: "assistant",
          content: answer,
          timestamp: Date.now(),
          model: state.selected_model,
          memoryAccessed: accessedTools,
          provider: "alpaca",
          symbol: "AAPL",
          timeframe: "15m",
        })
      } finally {
        try {
          const deleted = await deleteChatSession(session.id)
          expect(deleted).toEqual({ deleted: true })
          console.log(`[chat live] Deleted temporary session: ${session.id}`)
        } catch (error) {
          cleanupError = error
        }
        if (cleanupError) {
          throw new Error(`Could not delete temporary chat session ${session.id}`, {
            cause: cleanupError,
          })
        }
      }
    },
    180_000,
  )
})
