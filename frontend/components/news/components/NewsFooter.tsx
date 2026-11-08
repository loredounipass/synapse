"use client"

import React from "react"
import { MarketType } from "../types"

interface NewsFooterProps {
  market: MarketType
}

export function NewsFooter({ market }: NewsFooterProps) {
  return (
    <footer className="mt-16 pb-8">
      <div
        className="h-px w-full mb-8"
        style={{
          background: "linear-gradient(90deg, transparent, rgba(16, 185, 129, 0.1), transparent)",
        }}
      />
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className="flex items-center gap-2 px-4 py-2 rounded-xl"
            style={{
              background: "rgba(16, 185, 129, 0.03)",
              border: "1px solid rgba(16, 185, 129, 0.06)",
            }}
          >
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
            </span>
            <span className="text-[10px] font-mono text-gray-600 tracking-wider">
              POWERED BY {market === "stock" ? "YAHOO FINANCE" : "CRYPTOCOMPARE"}
            </span>
          </div>
        </div>
        <p className="text-[10px] font-mono text-gray-800 tracking-wider">
          DATA REFRESHES AUTOMATICALLY
        </p>
      </div>
    </footer>
  )
}

