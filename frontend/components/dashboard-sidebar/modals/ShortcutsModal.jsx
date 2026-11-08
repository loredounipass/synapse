"use client"

import React from "react"
import { Keyboard, X } from "lucide-react"

/**
 * Modal informativo con la lista de atajos de teclado
 */
export function ShortcutsModal({ isOpen, onClose }) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-[#0c1420] border border-[#1b2b3d] rounded-xl shadow-2xl overflow-hidden font-mono text-slate-200">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#142335] bg-[#070c14]">
          <div className="flex items-center gap-2 text-[#00f5c4] font-bold text-sm">
            <Keyboard className="w-4 h-4" />
            <span>ATAJOS DE TECLADO</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-3 text-xs">
          <div className="flex items-center justify-between p-2 rounded bg-[#070c14] border border-[#142335]">
            <span className="text-slate-300">Colapsar / Expandir Sidebar</span>
            <kbd className="px-2 py-0.5 rounded bg-white/10 text-white font-bold">
              Ctrl + B
            </kbd>
          </div>
          <div className="flex items-center justify-between p-2 rounded bg-[#070c14] border border-[#142335]">
            <span className="text-slate-300">Abrir Woody AI Chat</span>
            <kbd className="px-2 py-0.5 rounded bg-white/10 text-white font-bold">
              W
            </kbd>
          </div>
          <div className="flex items-center justify-between p-2 rounded bg-[#070c14] border border-[#142335]">
            <span className="text-slate-300">Cerrar Modales / Menús</span>
            <kbd className="px-2 py-0.5 rounded bg-white/10 text-white font-bold">
              Esc
            </kbd>
          </div>
        </div>

        <div className="px-5 py-3 border-t border-[#142335] bg-[#070c14] flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-[#142335] text-slate-300 text-xs font-semibold hover:bg-[#1b2b3d] transition-colors"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  )
}

