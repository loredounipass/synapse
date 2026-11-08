"use client"

import React from "react"
import { BellRing, CheckCircle2, X, TrendingUp, TrendingDown, Target, ShieldAlert } from "lucide-react"
import { formatPrice } from "./setupUtils"

export function SetupActivationDialog({ isOpen, onClose, setup }) {
  if (!isOpen || !setup) return null

  const isLong = setup.direction === "LONG"
  const evalDetails = setup.evaluation_details || {}
  const conditions = evalDetails.conditions || []

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-[#0a111a] border-2 border-emerald-500/60 rounded-2xl shadow-[0_0_50px_rgba(16,185,129,0.3)] overflow-hidden font-mono text-slate-100">
        {/* Header con destello */}
        <div className="relative px-6 py-5 bg-gradient-to-r from-emerald-950/60 via-[#0a111a] to-emerald-950/60 border-b border-emerald-500/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center text-emerald-400 animate-bounce">
              <BellRing className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-widest text-emerald-400 font-bold">
                ALERTA EN TIEMPO REAL
              </div>
              <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                <span>SETUP ACTIVADO</span>
                <span
                  className={`text-xs px-2 py-0.5 rounded font-bold ${isLong
                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                      : "bg-rose-500/20 text-rose-400 border border-rose-500/40"
                    }`}
                >
                  {setup.symbol} {setup.direction}
                </span>
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Cuerpo del Diálogo */}
        <div className="p-6 space-y-4">
          <div className="p-3.5 rounded-xl bg-[#060b11] border border-[#142335] space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400">Precio de Entrada:</span>
              <span className="font-bold text-slate-100">${formatPrice(setup.entry_price)}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400">Stop Loss (Invalidación):</span>
              <span className="font-bold text-rose-400">${formatPrice(setup.stop_loss)}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400">Take Profit (Target):</span>
              <span className="font-bold text-emerald-400">${formatPrice(setup.take_profit)}</span>
            </div>
            <div className="pt-2 border-t border-[#142335] flex justify-between items-center text-xs">
              <span className="text-slate-400">Ratio Riesgo / Beneficio:</span>
              <span className="font-extrabold text-[#00f5c4]">1:{setup.rr_ratio || "N/A"}</span>
            </div>
          </div>

          {/* Confirmaciones Cumplidas */}
          <div className="space-y-2">
            <div className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Condiciones Técnicas Validadas ({conditions.length})</span>
            </div>
            <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
              {conditions.length === 0 ? (
                <div className="text-xs text-slate-400">Activado por llegada al precio objetivo.</div>
              ) : (
                conditions.map((c, i) => (
                  <div
                    key={c.id || i}
                    className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-emerald-950/20 border border-emerald-500/30 text-xs"
                  >
                    <span className="text-slate-200">{c.label}</span>
                    <span className="font-bold text-emerald-400 font-mono">
                      {c.actual_value !== undefined ? String(c.actual_value) : "CUMPLIDO"}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-[#060b11] border-t border-[#142335] flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="w-full px-4 py-2.5 rounded-xl bg-emerald-500 text-slate-950 font-extrabold text-xs hover:bg-emerald-400 transition-colors shadow-lg shadow-emerald-500/20"
          >
            ENTENDIDO / MONITORIZAR
          </button>
        </div>
      </div>
    </div>
  )
}

