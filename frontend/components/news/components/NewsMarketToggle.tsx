"use client"

import React from "react"
import { Bitcoin, LineChart } from "lucide-react"
import { MarketType } from "../types"

interface NewsMarketToggleProps {
  market: MarketType
  onSelectMarket: (market: MarketType) => void
}

export function NewsMarketToggle({ market, onSelectMarket }: NewsMarketToggleProps) {
  const options = [
    { key: "crypto" as const, label: "CRYPTO", Icon: Bitcoin },
    { key: "stock" as const, label: "STOCKS", Icon: LineChart },
  ]

  return (
    <div className="flex items-center justify-center mb-6 w-full">
      <div
        className="flex items-center gap-1 p-1 rounded-xl max-w-full"
        style={{
          background: "rgba(17, 17, 17, 0.4)",
          border: "1px solid rgba(255,255,255,0.03)",
        }}
      >
        {options.map(({ key, label, Icon }) => {
          const isActive = market === key
          return (
            <button
              key={key}
              onClick={() => onSelectMarket(key)}
              className={`flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-bold tracking-widest transition-all duration-300 flex-shrink-0 ${
                isActive ? "text-emerald-400" : "text-gray-500 hover:text-gray-300"
              }`}
              style={{
                background: isActive ? "rgba(16, 185, 129, 0.08)" : "transparent",
                border: `1px solid ${isActive ? "rgba(16, 185, 129, 0.25)" : "transparent"}`,
                boxShadow: isActive ? "0 0 16px rgba(16, 185, 129, 0.08)" : "none",
              }}
            >
              <Icon className="w-4 h-4" strokeWidth={2.2} />
              {label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

