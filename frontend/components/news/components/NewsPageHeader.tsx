"use client"

import React from "react"
import Link from "next/link"
import { Zap } from "lucide-react"
import { MarketType } from "../types"

interface NewsPageHeaderProps {
  market: MarketType
  storiesCount: number
}

export function NewsPageHeader({ market, storiesCount }: NewsPageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 sm:mb-8 gap-3 sm:gap-4 w-full min-w-0">
      <div className="flex items-center justify-between sm:justify-start w-full sm:w-auto gap-3">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <div
            className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-xl flex-shrink-0"
            style={{
              background: "linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(6, 182, 212, 0.08))",
              border: "1px solid rgba(16, 185, 129, 0.15)",
              boxShadow: "0 0 20px rgba(16, 185, 129, 0.08)",
            }}
          >
            <Zap className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="min-w-0">
            <h1 className="text-base sm:text-lg font-semibold text-gray-100 tracking-tight truncate">
              Market News
            </h1>
            <p className="text-[9px] sm:text-[10px] font-mono text-gray-500 tracking-wider">
              REAL-TIME {market === "stock" ? "STOCK" : "CRYPTO"} FEED
            </p>
          </div>
        </div>

        {/* Stories badge (mobile) */}
        <div
          className="flex sm:hidden items-center gap-1.5 px-2.5 py-1 rounded-full flex-shrink-0"
          style={{
            background: "rgba(16, 185, 129, 0.04)",
            border: "1px solid rgba(16, 185, 129, 0.08)",
            backdropFilter: "blur(8px)",
          }}
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="text-[10px] font-mono text-emerald-400/80 tracking-wider font-medium">
            {storiesCount} STORIES
          </span>
        </div>
      </div>

      {/* Stories badge (desktop) */}
      <div className="hidden sm:flex items-center gap-3 flex-shrink-0">
        <div
          className="flex items-center gap-2 px-4 py-2 rounded-full"
          style={{
            background: "rgba(16, 185, 129, 0.04)",
            border: "1px solid rgba(16, 185, 129, 0.08)",
            backdropFilter: "blur(8px)",
          }}
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="text-[11px] font-mono text-emerald-400/70 tracking-wider font-medium">
            {storiesCount} STORIES
          </span>
        </div>
      </div>
    </div>
  )
}

