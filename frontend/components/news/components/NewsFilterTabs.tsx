"use client"

import React, { RefObject } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Article, CoinMeta } from "../types"

interface NewsFilterTabsProps {
  activeCoin: string
  marketList: CoinMeta[]
  allNewsCount: number
  newsByCoin: Record<string, Article[]>
  tabsRef: RefObject<HTMLDivElement | null>
  onSelectCoin: (symbol: string) => void
}

export function NewsFilterTabs({
  activeCoin,
  marketList,
  allNewsCount,
  newsByCoin,
  tabsRef,
  onSelectCoin,
}: NewsFilterTabsProps) {
  const tabs = [
    { symbol: "ALL", name: "All News", short: "ALL", color: "#10b981" },
    ...marketList,
  ]

  const handleScrollLeft = () => {
    tabsRef.current?.scrollBy({ left: -260, behavior: "smooth" })
  }

  const handleScrollRight = () => {
    tabsRef.current?.scrollBy({ left: 260, behavior: "smooth" })
  }

  return (
    <nav className="mb-6 sm:mb-8 flex items-center gap-1.5 sm:gap-2 w-full max-w-full min-w-0">
      <button
        onClick={handleScrollLeft}
        aria-label="Scroll tabs left"
        className="flex-shrink-0 w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-xl transition-all duration-200 text-gray-500 hover:text-emerald-400 hover:bg-emerald-400/5"
        style={{ border: "1px solid rgba(255,255,255,0.04)", background: "rgba(17, 17, 17, 0.4)" }}
      >
        <ChevronLeft className="w-4 h-4" />
      </button>

      <div
        className="flex-1 min-w-0 flex items-center gap-1.5 sm:gap-2 p-1 rounded-2xl overflow-x-auto hide-scrollbar touch-pan-x"
        ref={tabsRef}
        onWheel={(e) => {
          if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
            e.currentTarget.scrollLeft += e.deltaY
          }
        }}
        style={{
          background: "rgba(17, 17, 17, 0.4)",
          border: "1px solid rgba(255,255,255,0.03)",
        }}
      >
        {tabs.map((coin) => {
          const isActive = activeCoin === coin.symbol
          const count = coin.symbol === "ALL"
            ? allNewsCount
            : (newsByCoin[coin.symbol] || []).length

          return (
            <button
              key={coin.symbol}
              onClick={() => onSelectCoin(coin.symbol)}
              className="relative flex items-center gap-1.5 sm:gap-2.5 px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all duration-300 flex-shrink-0 whitespace-nowrap"
              style={{
                background: isActive ? "rgba(17, 17, 17, 0.9)" : "transparent",
                color: isActive ? "#e2e8f0" : "rgba(148, 163, 184, 0.5)",
                border: isActive ? `1px solid ${coin.color}30` : "1px solid transparent",
                boxShadow: isActive ? `0 0 20px ${coin.color}10, inset 0 1px 0 rgba(255,255,255,0.03)` : "none",
              }}
            >
              {coin.symbol !== "ALL" && (
                <span
                  className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full flex-shrink-0"
                  style={{
                    background: coin.color,
                    boxShadow: isActive ? `0 0 8px ${coin.color}60` : "none",
                    opacity: isActive ? 1 : 0.4,
                  }}
                />
              )}
              <span className="font-mono text-[12px] sm:text-[13px]">{coin.short || coin.name}</span>
              <span
                className="text-[9px] sm:text-[10px] font-mono px-1.5 py-0.5 rounded-md"
                style={{
                  background: isActive ? `${coin.color}15` : "rgba(255,255,255,0.03)",
                  color: isActive ? coin.color : "rgba(148, 163, 184, 0.3)",
                }}
              >
                {count}
              </span>
            </button>
          )
        })}
      </div>

      <button
        onClick={handleScrollRight}
        aria-label="Scroll tabs right"
        className="flex-shrink-0 w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-xl transition-all duration-200 text-gray-500 hover:text-emerald-400 hover:bg-emerald-400/5"
        style={{ border: "1px solid rgba(255,255,255,0.04)", background: "rgba(17, 17, 17, 0.4)" }}
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </nav>
  )
}

