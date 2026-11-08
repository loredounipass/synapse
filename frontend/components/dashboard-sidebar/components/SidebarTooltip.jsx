"use client"

import React from "react"

/**
 * Tooltip flotante estilizado para la barra lateral en modo colapsado
 */
export function SidebarTooltip({ isCollapsed, label, badge, shortcut }) {
  if (!isCollapsed) return null
  return (
    <div className="absolute left-[calc(100%+10px)] top-1/2 -translate-y-1/2 px-2.5 py-1.5 rounded-md bg-[#0c1420] border border-[#1b2b3d] text-[11px] font-mono text-slate-100 shadow-[0_8px_30px_rgba(0,0,0,0.9)] pointer-events-none opacity-0 group-hover:opacity-100 translate-x-1 group-hover:translate-x-0 transition-all z-50 flex items-center gap-2 whitespace-nowrap">
      <span className="font-semibold tracking-wide">{label}</span>
      {badge && (
        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#00f5c4]/15 text-[#00f5c4] border border-[#00f5c4]/30">
          {badge}
        </span>
      )}
      {shortcut && (
        <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-[9px] text-slate-400 font-mono">
          {shortcut}
        </kbd>
      )}
    </div>
  )
}

