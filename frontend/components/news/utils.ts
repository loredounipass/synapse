import { CoinMeta } from "./types"

export const formatTime = (ts?: number): string => {
  if (!ts) return ""
  const d = new Date(ts * 1000)
  const now = new Date()
  const diff = Math.floor((now.getTime() - d.getTime()) / 1000)
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  if (diff < 172800) return "Yesterday"
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

export const getCoinMeta = (symbol?: string, marketList?: CoinMeta[]): CoinMeta | undefined => {
  if (!symbol || !marketList) return undefined
  return marketList.find(c => c.symbol === symbol)
}

