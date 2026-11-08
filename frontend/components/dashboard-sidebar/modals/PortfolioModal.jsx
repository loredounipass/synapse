"use client"

import React from "react"
import { Briefcase, X } from "lucide-react"

/**
 * Modal interactivo para visualizar el portafolio demo (Paper Trading)
 */
export function PortfolioModal({ isOpen, onClose, positions = [] }) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-[#0c1420] border border-[#1b2b3d] rounded-xl shadow-2xl overflow-hidden font-mono text-slate-200">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#142335] bg-[#070c14]">
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
            <Briefcase className="w-4 h-4" />
            <span>PORTAFOLIO DEMO (PAPER TRADING)</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Resumen de balance */}
          <div className="grid grid-cols-2 gap-3 p-3.5 rounded-lg bg-[#070c14] border border-[#142335]">
            <div>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                Balance Simulado
              </span>
              <span className="text-lg font-bold text-white">$25,480.00 USDT</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                P&L Total (24h)
              </span>
              <span className="text-lg font-bold text-emerald-400">+$1,230.50 (+5.08%)</span>
            </div>
          </div>

          {/* Posiciones abiertas */}
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
              Posiciones Activas
            </span>
            <div className="space-y-2">
              {positions.map((pos, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-lg bg-[#070c14] border border-[#142335] flex items-center justify-between text-xs"
                >
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white">{pos.symbol}</span>
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-[#00f5c4]/15 text-[#00f5c4]">
                        {pos.type}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-500">
                      Entrada: {pos.entry} • Actual: {pos.current}
                    </span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="font-bold text-emerald-400">{pos.pnl}</span>
                    <span className="text-[10px] text-emerald-400/80">{pos.pnlPct}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="px-5 py-3 border-t border-[#142335] bg-[#070c14] flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-[#142335] text-slate-300 text-xs font-semibold hover:bg-[#1b2b3d] transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}

