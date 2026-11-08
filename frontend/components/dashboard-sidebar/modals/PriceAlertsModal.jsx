"use client"

import React from "react"
import { Bell, X } from "lucide-react"

/**
 * Modal interactivo para gestión de alertas de precio
 */
export function PriceAlertsModal({
  isOpen,
  onClose,
  symbol,
  alerts,
  newAlertCondition,
  setNewAlertCondition,
  onCreateAlert,
  onToggleAlert,
  onDeleteAlert,
}) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-[#0c1420] border border-[#1b2b3d] rounded-xl shadow-2xl overflow-hidden font-mono text-slate-200">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#142335] bg-[#070c14]">
          <div className="flex items-center gap-2 text-yellow-400 font-bold text-sm">
            <Bell className="w-4 h-4" />
            <span>CENTRO DE ALERTAS DE PRECIO</span>
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
          <form onSubmit={onCreateAlert} className="flex gap-2">
            <input
              type="text"
              placeholder={`Ej: ${symbol || "BTCUSDT"} > $102,000`}
              value={newAlertCondition}
              onChange={(e) => setNewAlertCondition(e.target.value)}
              className="flex-1 bg-[#070c14] border border-[#1b2b3d] rounded-lg px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-[#00f5c4]"
            />
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-[#00f5c4] text-[#070c14] font-bold text-xs hover:bg-[#33f7d0] transition-colors"
            >
              + CREAR
            </button>
          </form>

          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {alerts.map((al) => (
              <div
                key={al.id}
                className="flex items-center justify-between p-3 rounded-lg bg-[#070c14] border border-[#142335] text-xs"
              >
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[#00f5c4]">{al.symbol}</span>
                    <span className="text-slate-200">{al.condition}</span>
                  </div>
                  <span className="text-[10px] text-slate-500">{al.note}</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onToggleAlert(al.id)}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors ${
                      al.active
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                        : "bg-slate-800 text-slate-400 border border-slate-700"
                    }`}
                  >
                    {al.active ? "ACTIVA" : "PAUSADA"}
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteAlert(al.id)}
                    className="text-slate-500 hover:text-rose-400 p-1"
                    title="Eliminar alerta"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
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

