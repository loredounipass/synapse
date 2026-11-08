"use client"

import React from "react"
import {
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Edit2,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Sliders,
} from "lucide-react"
import { SetupConditionBadge } from "./SetupConditionBadge"
import { formatPrice, getStatusBadgeConfig } from "./setupUtils"

export function SetupsTable({
  setups = [],
  onEdit,
  onDelete,
  onEvaluate,
  evaluatingId = null,
}) {
  if (setups.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 rounded-xl bg-[#070c14] border border-[#142335] text-center space-y-2 font-mono">
        <Sliders className="w-8 h-8 text-slate-600" />
        <div className="text-xs font-bold text-slate-400">NO HAY SETUPS REGISTRADOS</div>
        <p className="text-[11px] text-slate-500 max-w-sm">
          Crea un nuevo setup manual o pídele a Woody Agent desde el chat que formule una operación con confirmaciones técnicas.
        </p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-[#142335] bg-[#070c14] font-mono">
      <table className="w-full text-left text-xs text-slate-300">
        <thead className="bg-[#0c1420] text-[11px] uppercase tracking-wider text-slate-400 border-b border-[#142335]">
          <tr>
            <th className="px-3.5 py-3">Activo / Tipo</th>
            <th className="px-3.5 py-3">Niveles (Entrada / SL / TP)</th>
            <th className="px-3.5 py-3">R:R & Riesgo</th>
            <th className="px-3.5 py-3">Condiciones Técnicas</th>
            <th className="px-3.5 py-3">Estado</th>
            <th className="px-3.5 py-3 text-right">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#142335]">
          {setups.map((setup) => {
            const isLong = setup.direction === "LONG"
            const statusConfig = getStatusBadgeConfig(setup.status)
            const isInvalidated = setup.status === "INVALIDATED"
            const isActivated = setup.status === "ACTIVATED"
            const evalDetails = setup.evaluation_details || {}
            const evalConditions = evalDetails.conditions || []

            // Map eval condition details by indicator or id
            const evalMap = {}
            evalConditions.forEach((c) => {
              if (c.id) evalMap[c.id] = c
              if (c.indicator) evalMap[c.indicator] = c
            })

            return (
              <tr
                key={setup.id}
                className={`transition-colors hover:bg-[#0c1420]/60 ${
                  isInvalidated
                    ? "bg-rose-950/10 border-l-2 border-l-rose-500"
                    : isActivated
                    ? "bg-emerald-950/10 border-l-2 border-l-emerald-500"
                    : ""
                }`}
              >
                {/* 1. Activo / Tipo */}
                <td className="px-3.5 py-3 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <span
                      className={`p-1 rounded font-bold text-[10px] flex items-center justify-center ${
                        isLong
                          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                          : "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                      }`}
                    >
                      {isLong ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                    </span>
                    <div>
                      <div className="font-bold text-slate-100 flex items-center gap-1.5">
                        <span>{setup.symbol}</span>
                        <span className="text-[10px] text-slate-400 font-normal">({setup.timeframe})</span>
                      </div>
                      <div className="text-[10px] text-slate-500 uppercase">{setup.provider}</div>
                    </div>
                  </div>
                </td>

                {/* 2. Niveles de Precio */}
                <td className="px-3.5 py-3 whitespace-nowrap">
                  <div className="space-y-0.5 text-[11px]">
                    <div className="text-slate-200">
                      <span className="text-slate-500 text-[10px]">Entrada: </span>
                      <span className="font-semibold">${formatPrice(setup.entry_price)}</span>
                    </div>
                    <div className="text-rose-400">
                      <span className="text-rose-500/70 text-[10px]">SL: </span>
                      <span>${formatPrice(setup.stop_loss)}</span>
                    </div>
                    <div className="text-emerald-400">
                      <span className="text-emerald-500/70 text-[10px]">TP: </span>
                      <span>${formatPrice(setup.take_profit)}</span>
                    </div>
                  </div>
                </td>

                {/* 3. R:R & Riesgo */}
                <td className="px-3.5 py-3 whitespace-nowrap">
                  <div className="space-y-0.5">
                    <div className="font-extrabold text-[#00f5c4] text-xs">
                      1:{setup.rr_ratio || "N/A"}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      Riesgo: <span className="text-rose-400">-{setup.risk_percent}%</span>
                    </div>
                    {setup.risk_amount > 0 && (
                      <div className="text-[10px] text-slate-500">
                        ${setup.risk_amount} ({setup.reward_amount ? `+$${setup.reward_amount}` : ""})
                      </div>
                    )}
                  </div>
                </td>

                {/* 4. Condiciones Técnicas */}
                <td className="px-3.5 py-3">
                  <div className="flex flex-wrap gap-1 max-w-xs">
                    {(setup.conditions || []).length === 0 ? (
                      <span className="text-[11px] text-slate-500 italic">Solo precio</span>
                    ) : (
                      setup.conditions.map((cond, idx) => (
                        <SetupConditionBadge
                          key={cond.id || idx}
                          condition={cond}
                          evalDetail={evalMap[cond.id] || evalMap[cond.indicator]}
                        />
                      ))
                    )}
                  </div>
                  {isInvalidated && setup.invalidation_reason && (
                    <div className="mt-1.5 flex items-start gap-1 text-[10px] text-rose-400 font-sans leading-tight">
                      <AlertTriangle className="w-3 h-3 flex-shrink-0 text-rose-500 mt-0.5" />
                      <span>{setup.invalidation_reason}</span>
                    </div>
                  )}
                </td>

                {/* 5. Estado */}
                <td className="px-3.5 py-3 whitespace-nowrap">
                  <div
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border ${statusConfig.bgClass}`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.dotClass}`} />
                    <span>{statusConfig.label}</span>
                  </div>
                </td>

                {/* 6. Acciones */}
                <td className="px-3.5 py-3 whitespace-nowrap text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    <button
                      type="button"
                      onClick={() => onEvaluate && onEvaluate(setup.id)}
                      disabled={evaluatingId === setup.id}
                      className="p-1.5 rounded hover:bg-[#142335] text-slate-400 hover:text-[#00f5c4] transition-colors"
                      title="Evaluar setup contra Redis ahora"
                    >
                      <RefreshCw
                        className={`w-3.5 h-3.5 ${evaluatingId === setup.id ? "animate-spin text-[#00f5c4]" : ""}`}
                      />
                    </button>
                    <button
                      type="button"
                      onClick={() => onEdit && onEdit(setup)}
                      className="p-1.5 rounded hover:bg-[#142335] text-slate-400 hover:text-white transition-colors"
                      title="Editar setup"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete && onDelete(setup.id)}
                      className="p-1.5 rounded hover:bg-[#142335] text-slate-400 hover:text-rose-400 transition-colors"
                      title="Eliminar setup"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

