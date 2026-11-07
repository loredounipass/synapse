import { afterEach, describe, expect, it } from "vitest"
import { loginUser } from "@/services/api/authApi"
import {
  createChatSession,
  deleteChatSession,
  fetchChatState,
  openChatStream,
  saveChatMessage,
  updateChatPreferences,
} from "@/services/api/chatApi"
import { clearSession } from "@/services/auth/tokenManager"

const email = process.env.BACKEND_TEST_EMAIL
const password = process.env.BACKEND_TEST_PASSWORD
const hasCredentials = Boolean(email && password)

afterEach(() => {
  clearSession()
})

describe("Live backend web search integration", () => {
  it.skipIf(!hasCredentials)(
    "runs web_search, returns results, and restores the account preference",
    async () => {
      await loginUser({ email, password })
      const state = await fetchChatState()
      const previousWebSearchEnabled = state.web_search_enabled
      let sessionId: string | undefined
      let streamTimeout: ReturnType<typeof setTimeout> | undefined
      const cleanupErrors: unknown[] = []

      try {
        await updateChatPreferences({ web_search_enabled: true })
        const session = await createChatSession({
          title: `Web search integration test ${Date.now()}`,
          symbol: "ETHUSDT",
          market: "crypto",
          interval: "15m",
        })
        sessionId = session.id
        console.log(`[web search live] Created temporary session: ${sessionId}`)

        const prompt =
          "Busca en la web noticias recientes sobre el telescopio espacial Nancy Grace Roman. Usa la herramienta web_search ahora y presenta al menos dos resultados con título, fuente y URL."
        await saveChatMessage(sessionId, {
          role: "user",
          content: prompt,
          timestamp: Date.now(),
        })

        const controller = new AbortController()
        streamTimeout = setTimeout(() => controller.abort(), 150_000)
        const response = await openChatStream(
          {
            prompt,
            session_id: sessionId,
            model: state.selected_model,
            symbol: "ETHUSDT",
            interval: "15m",
            market: "crypto",
            provider: "coinbase",
            stream: true,
          },
          controller.signal,
        )

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
          clearTimeout(streamTimeout)
          streamTimeout = undefined
          reader.releaseLock()
        }

        const streamError = events.find((event) => event.type === "error")
        expect(streamError, `Chat stream error: ${JSON.stringify(streamError)}`).toBeUndefined()

        const webSearchEvent = events.find(
          (event) => event.type === "tool" && event.name === "web_search",
        )
        const doneEvent = events.find((event) => event.type === "done")
        const accessedTools = Array.isArray(doneEvent?.memory_accessed)
          ? doneEvent.memory_accessed as Array<Record<string, unknown>>
          : []
        const webSearchMetadata = accessedTools.find((tool) => tool.tool === "web_search")
        const results = Array.isArray(webSearchEvent?.results)
          ? webSearchEvent.results as Array<Record<string, unknown>>
          : []
        const answer = events
          .filter((event) => event.type === "content" && typeof event.chunk === "string")
          .map((event) => event.chunk)
          .join("")

        console.log("[web search live] Tool event:", JSON.stringify(webSearchEvent ?? null))
        console.log("[web search live] Recorded tool metadata:", JSON.stringify(webSearchMetadata ?? null))
        console.log(`[web search live] Results: ${results.length}; assistant response: ${answer.length} chars`)

        expect(webSearchEvent, "Expected the server to emit a web_search tool event").toBeDefined()
        expect(webSearchEvent?.provider).toMatch(/^(duckduckgo|serpapi)$/)
        expect(webSearchEvent?.source).toBe("news")
        expect(webSearchEvent?.found).toBeGreaterThan(0)
        expect(results.length).toBeGreaterThan(0)
        expect(results[0]).toMatchObject({
          title: expect.any(String),
          url: expect.stringMatching(/^https?:\/\//),
        })
        expect(webSearchMetadata).toMatchObject({
          tool: "web_search",
          provider: webSearchEvent?.provider,
          found: webSearchEvent?.found,
        })
        expect(answer.trim()).not.toBe("")

        await saveChatMessage(sessionId, {
          role: "assistant",
          content: answer,
          timestamp: Date.now(),
          model: state.selected_model,
          memoryAccessed: accessedTools,
        })
      } finally {
        if (streamTimeout) clearTimeout(streamTimeout)
        if (sessionId) {
          try {
            const deleted = await deleteChatSession(sessionId)
            expect(deleted).toEqual({ deleted: true })
            console.log(`[web search live] Deleted temporary session: ${sessionId}`)
          } catch (error) {
            cleanupErrors.push(error)
          }
        }
        try {
          await updateChatPreferences({ web_search_enabled: previousWebSearchEnabled })
          const restoredState = await fetchChatState()
          expect(restoredState.web_search_enabled).toBe(previousWebSearchEnabled)
          if (sessionId) {
            expect(restoredState.sessions.some((session) => session.id === sessionId)).toBe(false)
          }
        } catch (error) {
          cleanupErrors.push(error)
        }
        if (cleanupErrors.length) {
          throw new AggregateError(
            cleanupErrors,
            `Could not fully clean up web search integration test${sessionId ? ` (${sessionId})` : ""}`,
          )
        }
      }
    },
    180_000,
  )
})
