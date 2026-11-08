"use client"

import React, { useState } from "react"
import { Plus, Trash2, Sliders } from "lucide-react"
import { AVAILABLE_INDICATORS, COMPARISON_OPERATORS } from "./setupUtils"

export function SetupConditionBuilder({ conditions, onChange }) {
  const [selectedIndicator, setSelectedIndicator] = useState(AVAILABLE_INDICATORS[0].value)
  const [selectedOperator, setSelectedOperator] = useState(AVAILABLE_INDICATORS[0].defaultOp)
  const [thresholdValue, setThresholdValue] = useState(String(AVAILABLE_INDICATORS[0].defaultVal))
  const [customLabel, setCustomLabel] = useState("")

  const handleIndicatorChange = (indValue) => {
    setSelectedIndicator(indValue)
    const indConfig = AVAILABLE_INDICATORS.find((i) => i.value === indValue)
    if (indConfig) {
      setSelectedOperator(indConfig.defaultOp)
      setThresholdValue(String(indConfig.defaultVal))
    }
  }

  const handleAddCondition = (e) => {
    e.preventDefault()
    if (!thresholdValue.trim()) return

    const indConfig = AVAILABLE_INDICATORS.find((i) => i.value === selectedIndicator)
    const isNumber = indConfig ? indConfig.type === "number" : !isNaN(Number(thresholdValue))

    const newRule = {
      id: `c_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      indicator: selectedIndicator,
      operator: selectedOperator,
      value: isNumber ? Number(thresholdValue) : thresholdValue.trim(),
      label: customLabel.trim() || `${selectedIndicator} ${selectedOperator} ${thresholdValue}`,
    }

    onChange([...conditions, newRule])
    setCustomLabel("")
  }

  const handleRemoveCondition = (indexToRemove) => {
    onChange(conditions.filter((_, idx) => idx !== indexToRemove))
  }

  return (
    <div className="space-y-3 p-3 rounded-lg bg-[#070c14] border border-[#142335]">
      <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
        <Sliders className="w-3.5 h-3.5 text-[#00f5c4]" />
        <span>Condiciones Técnicas Multi-Indicador (Confirmación)</span>
      </div>
      <p className="text-[11px] text-slate-400">
        Configura los indicadores que deben cumplirse para activar el setup al llegar al precio. Si falla alguno, el setup se invalidará.
      </p>

      {/* Selector e Input de Regla */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 text-xs">
        {/* Indicador */}
        <div className="sm:col-span-5">
          <select
            value={selectedIndicator}
            onChange={(e) => handleIndicatorChange(e.target.value)}
            className="w-full bg-[#0c1420] border border-[#1b2b3d] rounded px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-[#00f5c4]"
          >
            {AVAILABLE_INDICATORS.map((ind) => (
              <option key={ind.value} value={ind.value}>
                {ind.label}
              </option>
            ))}
          </select>
        </div>

        {/* Operador */}
        <div className="sm:col-span-3">
          <select
            value={selectedOperator}
            onChange={(e) => setSelectedOperator(e.target.value)}
            className="w-full bg-[#0c1420] border border-[#1b2b3d] rounded px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-[#00f5c4]"
          >
            {COMPARISON_OPERATORS.map((op) => (
              <option key={op.value} value={op.value}>
                {op.label}
              </option>
            ))}
          </select>
        </div>

        {/* Valor Umbral */}
        <div className="sm:col-span-3">
          <input
            type="text"
            placeholder="Umbral"
            value={thresholdValue}
            onChange={(e) => setThresholdValue(e.target.value)}
            className="w-full bg-[#0c1420] border border-[#1b2b3d] rounded px-2.5 py-1.5 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-[#00f5c4]"
          />
        </div>

        {/* Botón Añadir */}
        <div className="sm:col-span-1 flex items-center">
          <button
            type="button"
            onClick={handleAddCondition}
            className="w-full h-full flex items-center justify-center rounded bg-[#00f5c4]/15 hover:bg-[#00f5c4]/30 border border-[#00f5c4]/40 text-[#00f5c4] py-1.5 transition-colors"
            title="Añadir condición"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Lista de condiciones añadidas */}
      {conditions.length === 0 ? (
        <div className="text-[11px] text-slate-500 italic py-1">
          Sin condiciones añadidas (se activará solo por precio al tocar la entrada).
        </div>
      ) : (
        <div className="space-y-1.5 pt-1">
          {conditions.map((cond, idx) => (
            <div
              key={cond.id || idx}
              className="flex items-center justify-between px-2.5 py-1.5 rounded bg-[#0c1420] border border-[#1b2b3d] text-xs"
            >
              <div className="flex items-center gap-2">
                <span className="font-bold text-[#00f5c4]">{cond.indicator}</span>
                <span className="text-yellow-400 font-mono">{cond.operator}</span>
                <span className="text-slate-100 font-mono">{String(cond.value)}</span>
                {cond.label && cond.label !== `${cond.indicator} ${cond.operator} ${cond.value}` && (
                  <span className="text-[10px] text-slate-400">({cond.label})</span>
                )}
              </div>
              <button
                type="button"
                onClick={() => handleRemoveCondition(idx)}
                className="text-slate-500 hover:text-rose-400 p-1 transition-colors"
                title="Eliminar regla"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

