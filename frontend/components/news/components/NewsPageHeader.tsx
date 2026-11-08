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
    <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard"
          className="group flex items-center gap-2 text-xs font-mono text-gray-600 hover:text-emerald-400 transition-all duration-300 px-3 py-1.5 rounded-lg hover:bg-emerald-400/5"
        >
          <svg className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Dashboard
        </Link>
        <div className="h-5 w-px bg-gray-800" />
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 flex items-center justify-center rounded-xl"
            style={{
              background: "linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(6, 182, 212, 0.08))",
              border: "1px solid rgba(16, 185, 129, 0.15)",
              boxShadow: "0 0 20px rgba(16, 185, 129, 0.08)",
            }}
          >
            <Zap className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-gray-100 tracking-tight">Market News</h1>
            <p className="text-[10px] font-mono text-gray-600 tracking-wider">
              REAL-TIME {market === "stock" ? "STOCK" : "CRYPTO"} FEED
            </p>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3">
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
    </header>
  )
}

