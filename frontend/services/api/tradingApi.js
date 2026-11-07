/**
 * Servicio de datos de trading: snapshot de indicadores para un símbolo.
 * Habla con GET /api/trading/<symbol> a través del cliente HTTP con reintentos
 * y autenticación Bearer JWT automática.
 */
import { httpRequest } from "./httpClient"
import { ENDPOINTS } from "./endpoints"

const YAHOO_ONLY_STOCK_SYMBOLS = new Set(["^NDX", "GC=F", "EURUSD=X"])

export function getStockDataProvider(symbol) {
  return YAHOO_ONLY_STOCK_SYMBOLS.has(symbol) ? "yahoo" : "alpaca"
}

export const fetchTradingData = async (
  symbol,
  interval = "15m",
  market = "crypto",
  provider = "coinbase",
) => {
  if (!symbol) throw new Error("symbol is required")
  const resolvedProvider = market === "stock" ? getStockDataProvider(symbol) : provider
  return httpRequest(
    ENDPOINTS.trading(symbol, interval, market, resolvedProvider),
    { timeout: 30000, retries: 2 },
  )
}

export function fetchTradingProviderPreference() {
  return httpRequest(ENDPOINTS.tradingProviderPreference(), {
    retries: 0,
  })
}

export function saveTradingProviderPreference(provider) {
  return httpRequest(ENDPOINTS.tradingProviderPreference(), {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: { crypto_provider: provider },
    retries: 0,
  })
}
