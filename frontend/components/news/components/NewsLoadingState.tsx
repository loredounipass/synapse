"use client"

import React from "react"

export function NewsLoadingState() {
  return (
    <div className="flex flex-col items-center justify-center py-40 gap-4">
      <div className="relative">
        <div className="w-12 h-12 rounded-full border-2 border-emerald-500/20 border-t-emerald-400 animate-spin" />
        <div
          className="absolute inset-0 w-12 h-12 rounded-full border-2 border-transparent border-b-cyan-400/30 animate-spin"
          style={{ animationDirection: "reverse", animationDuration: "1.5s" }}
        />
      </div>
      <p className="text-xs font-mono text-[#00f5c4] animate-pulse tracking-widest uppercase text-center">
        LOADING MARKET DATA...
      </p>
    </div>
  )
}

