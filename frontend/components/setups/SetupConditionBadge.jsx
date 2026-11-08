"use client"

import React from "react"
import { Check, X, Clock } from "lucide-react"

/**
 * Micro-componente que renderiza una condición técnica con su estado de evaluación live.
 */
export function SetupConditionBadge({ condition, evalDetail }) {
  const isEvaluated = evalDetail !== undefined && evalDetail !== null
  const passed = isEvaluated && evalDetail.passed

  let badgeColor = "bg-slate-800/80 text-slate-300 border-slate-700"
  let icon = <Clock className="w-2.5 h-2.5 text-slate-400" />

  if (isEvaluated) {
    if (passed) {
      badgeColor = "bg-emerald-500/15 text-emerald-300 border-emerald-500/40"
      icon = <Check className="w-2.5 h-2.5 text-emerald-400 stroke-[3]" />
    } else {
      badgeColor = "bg-rose-500/15 text-rose-300 border-rose-500/40"
      icon = <X className="w-2.5 h-2.5 text-rose-400 stroke-[3]" />
    }
  }

  const indicatorName = condition.indicator || "ind"
  const op = condition.operator || "=="
  const target = condition.value !== undefined ? condition.value : ""
  const actual = isEvaluated && evalDetail.actual_value !== undefined ? evalDetail.actual_value : null

  const tooltipText = isEvaluated
    ? `Actual: ${actual !== null ? actual : "N/A"} | Esperado: ${op} ${target}`
    : `Objetivo: ${indicatorName} ${op} ${target}`

  return (
    <div
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono border transition-colors cursor-help ${badgeColor}`}
      title={tooltipText}
    >
      {icon}
      <span className="font-semibold">{indicatorName}</span>
      <span className="opacity-75">{op}</span>
      <span className="font-bold">{String(target)}</span>
      {actual !== null && (
        <span className="text-[9px] opacity-60 ml-0.5">({typeof actual === "number" ? Number(actual).toFixed(1) : actual})</span>
      )}
    </div>
  )
}

