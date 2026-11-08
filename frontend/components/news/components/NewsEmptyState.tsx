"use client"

import React from "react"
import { Globe } from "lucide-react"

export function NewsEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 sm:py-36 text-center gap-3 sm:gap-4 w-full">
      <div
        className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center"
        style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}
      >
        <Globe className="w-6 h-6 sm:w-7 sm:h-7 text-gray-700" />
      </div>
      <div>
        <p className="text-sm font-medium text-gray-500">No headlines available</p>
        <p className="text-xs text-gray-700 mt-1">Check back shortly for updates</p>
      </div>
    </div>
  )
}

