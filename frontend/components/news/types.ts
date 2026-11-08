export type CoinMeta = {
  symbol: string
  name: string
  short: string
  color: string
  gradient: string
}

export type Article = {
  title?: string
  body?: string
  url?: string
  imageurl?: string
  source?: string
  published?: number
  categories?: string
  coin?: string
}

export type Moneda = {
  symbol: string
  nombre?: string
  market?: "crypto" | "stock" | string
}

export type MarketType = "crypto" | "stock"

