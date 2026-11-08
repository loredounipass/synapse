"use client"

import React, { useState } from "react"
import { Plus, Trash2, Sliders, Sparkles } from "lucide-react"
import { AVAILABLE_INDICATORS, COMPARISON_OPERATORS } from "./setupUtils"

export function SetupConditionBuilder({ conditions, onChange }) {
  const [selectedIndicator, setSelectedIndicator] = useState(AVAILABLE_INDICATORS[0].value)
  const [customIndicatorKey, setCustomIndicatorKey] = useState("")
  const [selectedOperator, setSelectedOperator] = useState(AVAILABLE_INDICATORS[0].defaultOp)
  const [thresholdValue, setThresholdValue] = useState(String(AVAILABLE_INDICATORS[0].defaultVal))
  const [customLabel, setCustomLabel] = useState("")

  // Agrupamiento por categorías
  const categories = Array.from(
    new Set(AVAILABLE_INDICATORS.map((i) => i.category || "General"))
  )

  const handleIndicatorChange = (indValue) => {
    setSelectedIndicator(indValue)
    if (indValue === "custom") {
      setSelectedOperator(">=")
      setThresholdValue("")
      return
    }
    const indConfig = AVAILABLE_INDICATORS.find((i) => i.value === indValue)
    if (indConfig) {
      setSelectedOperator(indConfig.defaultOp)
      setThresholdValue(String(indConfig.defaultVal))
    }
  }

  const handleAddCondition = (e) => {
    e.preventDefault()
    const activeKey = selectedIndicator === "custom" ? customIndicatorKey.trim() : selectedIndicator
    if (!activeKey) return
    if (!thresholdValue.trim()) return

    const indConfig = AVAILABLE_INDICATORS.find((i) => i.value === selectedIndicator)
    const isNumber = indConfig && indConfig.type !== "custom" 
      ? indConfig.type === "number" 
      : !isNaN(Number(thresholdValue))

    const newRule = {
      id: `c_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      indicator: activeKey,
      operator: selectedOperator,
      value: isNumber ? Number(thresholdValue) : thresholdValue.trim(),
      label: customLabel.trim() || `${activeKey} ${selectedOperator} ${thresholdValue}`,
    }

    onChange([...conditions, newRule])
    setCustomLabel("")
    if (selectedIndicator === "custom") {
      setCustomIndicatorKey("")
    }
  }

  const handleRemoveCondition = (indexToRemove) => {
    onChange(conditions.filter((_, idx) => idx !== indexToRemove))
  }

  return (
    <div className="space-y-3 p-3.5 rounded-xl bg-[#070c14] border border-[#142335]">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
          <Sliders className="w-4 h-4 text-[#00f5c4]" />
          <span>Condiciones Técnicas del Setup (Multi-Indicador Dinámico)</span>
        </div>
        <span className="text-[10px] text-[#00f5c4] bg-[#00f5c4]/10 border border-[#00f5c4]/20 px-2 py-0.5 rounded-full font-mono">
          Todos los indicadores disponibles
        </span>
      </div>

      <p className="text-[11px] text-slate-400">
        Configura libremente las confirmaciones requeridas (soportes/resistencias, osciladores, order flow, volumen o medias). Al llegar al precio de entrada, el sistema validará que todas se cumplan antes de activar la alerta.
      </p>

      {/* Selector e Input de Regla */}
      <div className="space-y-2 text-xs">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
          {/* Indicador / Categorías */}
          <div className="sm:col-span-5">
            <select
              value={selectedIndicator}
              onChange={(e) => handleIndicatorChange(e.target.value)}
              className="w-full bg-[#0c1420] border border-[#1b2b3d] rounded-lg px-2.5 py-2 text-slate-200 focus:outline-none focus:border-[#00f5c4]"
            >
              {categories.map((category) => (
                <optgroup key={category} label={category} className="bg-[#070c14] text-slate-300 font-bold">
                  {AVAILABLE_INDICATORS.filter((i) => (i.category || "General") === category).map((ind) => (
                    <option key={ind.value} value={ind.value} className="bg-[#0c1420] text-slate-200 font-normal">
                      {ind.label}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          {/* Operador */}
          <div className="sm:col-span-3">
            <select
              value={selectedOperator}
              onChange={(e) => setSelectedOperator(e.target.value)}
              className="w-full bg-[#0c1420] border border-[#1b2b3d] rounded-lg px-2.5 py-2 text-slate-200 focus:outline-none focus:border-[#00f5c4]"
            >
              {COMPARISON_OPERATORS.map((op) => (
                <option key={op.value} value={op.value}>
                  {op.label}
                </option>
              ))}
            </select>
          </div>

          {/* Valor Umbral o Indicador de Referencia */}
          <div className="sm:col-span-3">
            <input
              type="text"
              placeholder="Umbral o nivel (ej: 35, s1, ema50)"
              value={thresholdValue}
              onChange={(e) => setThresholdValue(e.target.value)}
              className="w-full bg-[#0c1420] border border-[#1b2b3d] rounded-lg px-2.5 py-2 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-[#00f5c4]"
            />
          </div>

          {/* Botón Añadir */}
          <div className="sm:col-span-1 flex items-center">
            <button
              type="button"
              onClick={handleAddCondition}
              className="w-full h-full flex items-center justify-center rounded-lg bg-[#00f5c4]/15 hover:bg-[#00f5c4]/30 border border-[#00f5c4]/40 text-[#00f5c4] py-2 transition-colors font-bold"
              title="Añadir condición"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
            </button>
          </div>
        </div>

        {/* Input si seleccionó 'custom' */}
        {selectedIndicator === "custom" && (
          <div className="p-2 rounded-lg bg-[#0c1420] border border-cyan-500/30">
            <label className="block text-[10px] text-cyan-300 font-semibold mb-1">
              Nombre exacto de la clave del feed (ej: s1, r2, history.closes[-1], orderFlow.delta):
            </label>
            <input
              type="text"
              placeholder="Clave exacta del indicador en Redis"
              value={customIndicatorKey}
              onChange={(e) => setCustomIndicatorKey(e.target.value)}
              className="w-full bg-[#070c14] border border-[#1b2b3d] rounded px-2.5 py-1 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-[#00f5c4]"
            />
          </div>
        )}
      </div>

      {/* Lista de condiciones añadidas */}
      {conditions.length === 0 ? (
        <div className="text-[11px] text-slate-500 italic py-2 px-3 rounded-lg bg-[#0c1420]/50 border border-dashed border-[#1b2b3d] flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>Sin condiciones añadidas (se activará directamente al tocar el precio de entrada).</span>
        </div>
      ) : (
        <div className="space-y-1.5 pt-1">
          {conditions.map((cond, idx) => (
            <div
              key={cond.id || idx}
              className="flex items-center justify-between px-3 py-2 rounded-lg bg-[#0c1420] border border-[#1b2b3d] text-xs"
            >
              <div className="flex items-center gap-2">
                <span className="font-bold text-[#00f5c4]">{cond.indicator}</span>
                <span className="text-yellow-400 font-mono font-bold">{cond.operator}</span>
                <span className="text-slate-100 font-mono font-semibold">{String(cond.value)}</span>
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

