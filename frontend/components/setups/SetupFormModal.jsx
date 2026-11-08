"use client"

import React, { useState, useEffect } from "react"
import { X, TrendingUp, TrendingDown, Calculator, ShieldCheck } from "lucide-react"
import { SetupConditionBuilder } from "./SetupConditionBuilder"
import { calculateRiskReward } from "./setupUtils"

export function SetupFormModal({
  isOpen,
  onClose,
  onSubmit,
  initialData = null,
  activeSymbol = "BTCUSDT",
  activeMarket = "crypto",
  activeProvider = "coinbase",
  activeTimeframe = "15m",
  currentPrice = null,
}) {
  const [symbol, setSymbol] = useState(activeSymbol)
  const [market, setMarket] = useState(activeMarket)
  const [provider, setProvider] = useState(activeProvider)
  const [timeframe, setTimeframe] = useState(activeTimeframe)
  const [direction, setDirection] = useState("LONG")
  const [entryPrice, setEntryPrice] = useState("")
  const [stopLoss, setStopLoss] = useState("")
  const [takeProfit, setTakeProfit] = useState("")
  const [riskAmount, setRiskAmount] = useState("100")
  const [riskPercent, setRiskPercent] = useState("1.0")
  const [conditions, setConditions] = useState([])
  const [notes, setNotes] = useState("")
  const [calcMetrics, setCalcMetrics] = useState(null)

  useEffect(() => {
    if (initialData) {
      setSymbol(initialData.symbol || activeSymbol)
      setMarket(initialData.market || activeMarket)
      setProvider(initialData.provider || activeProvider)
      setTimeframe(initialData.timeframe || activeTimeframe)
      setDirection(initialData.direction || "LONG")
      setEntryPrice(String(initialData.entry_price || ""))
      setStopLoss(String(initialData.stop_loss || ""))
      setTakeProfit(String(initialData.take_profit || ""))
      setRiskAmount(String(initialData.risk_amount || "100"))
      setRiskPercent(String(initialData.risk_percent || "1.0"))
      setConditions(initialData.conditions || [])
      setNotes(initialData.notes || "")
    } else {
      setSymbol(activeSymbol)
      setMarket(activeMarket)
      setProvider(activeProvider)
      setTimeframe(activeTimeframe)
      setDirection("LONG")
      const curr = currentPrice ? String(currentPrice) : ""
      setEntryPrice(curr)
      setStopLoss("")
      setTakeProfit("")
      setRiskAmount("100")
      setRiskPercent("1.0")
      setConditions([])
      setNotes("")
    }
  }, [initialData, activeSymbol, activeMarket, activeProvider, activeTimeframe, currentPrice, isOpen])

  // Recalcular métricas de riesgo en vivo
  useEffect(() => {
    const res = calculateRiskReward({
      direction,
      entryPrice: Number(entryPrice),
      stopLoss: Number(stopLoss),
      takeProfit: Number(takeProfit),
      riskAmount: Number(riskAmount),
    })
    setCalcMetrics(res)
  }, [direction, entryPrice, stopLoss, takeProfit, riskAmount])

  if (!isOpen) return null

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!calcMetrics || !calcMetrics.isValid) return

    const payload = {
      symbol: symbol.trim().toUpperCase(),
      market,
      provider,
      timeframe,
      direction,
      entry_price: Number(entryPrice),
      stop_loss: Number(stopLoss),
      take_profit: Number(takeProfit),
      risk_amount: Number(riskAmount) || 0,
      risk_percent: Number(riskPercent) || calcMetrics.riskPercent,
      conditions,
      notes: notes.trim(),
    }

    onSubmit(payload)
  }

  const isFormValid =
    calcMetrics && calcMetrics.isValid && Number(entryPrice) > 0 && Number(stopLoss) > 0 && Number(takeProfit) > 0

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-3xl h-[88vh] min-h-[620px] max-h-[94vh] bg-[#0c1420] border border-[#1b2b3d] rounded-2xl shadow-2xl overflow-hidden font-mono text-slate-200 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#142335] bg-[#070c14]">
          <div className="flex items-center gap-2 text-[#00f5c4] font-bold text-sm">
            <Calculator className="w-4 h-4" />
            <span>{initialData ? "EDITAR TRADING SETUP" : "CONFIGURAR NUEVO SETUP"}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Formulario scrollable */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Fila 1: Activo, Dirección, Temporalidad */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <label className="block text-slate-400 mb-1 font-semibold">Activo</label>
              <input
                type="text"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
                className="w-full bg-[#070c14] border border-[#1b2b3d] rounded-lg px-3 py-2 text-slate-100 uppercase focus:outline-none focus:border-[#00f5c4]"
                required
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-semibold">Dirección</label>
              <div className="grid grid-cols-2 gap-1 p-0.5 bg-[#070c14] border border-[#1b2b3d] rounded-lg">
                <button
                  type="button"
                  onClick={() => setDirection("LONG")}
                  className={`py-1.5 rounded text-[11px] font-bold flex items-center justify-center gap-1 transition-colors ${
                    direction === "LONG"
                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <TrendingUp className="w-3 h-3" />
                  <span>LONG</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDirection("SHORT")}
                  className={`py-1.5 rounded text-[11px] font-bold flex items-center justify-center gap-1 transition-colors ${
                    direction === "SHORT"
                      ? "bg-rose-500/20 text-rose-400 border border-rose-500/40"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <TrendingDown className="w-3 h-3" />
                  <span>SHORT</span>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-semibold">Temporalidad</label>
              <select
                value={timeframe}
                onChange={(e) => setTimeframe(e.target.value)}
                className="w-full bg-[#070c14] border border-[#1b2b3d] rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-[#00f5c4]"
              >
                {["1m", "5m", "15m", "1h", "4h", "1d"].map((tf) => (
                  <option key={tf} value={tf}>
                    {tf}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-semibold">Feed de Datos</label>
              <input
                type="text"
                value={provider.toUpperCase()}
                disabled
                className="w-full bg-[#070c14]/50 border border-[#142335] rounded-lg px-3 py-2 text-slate-400 uppercase cursor-not-allowed"
              />
            </div>
          </div>

          {/* Fila 2: Precios de Entrada, Stop Loss, Take Profit */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-slate-400 font-semibold">Precio de Entrada</label>
                {currentPrice && (
                  <button
                    type="button"
                    onClick={() => setEntryPrice(String(currentPrice))}
                    className="text-[10px] text-[#00f5c4] hover:underline"
                  >
                    Usar actual
                  </button>
                )}
              </div>
              <input
                type="number"
                step="any"
                placeholder="Ej: 104250.00"
                value={entryPrice}
                onChange={(e) => setEntryPrice(e.target.value)}
                className="w-full bg-[#070c14] border border-[#1b2b3d] rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-[#00f5c4]"
                required
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-semibold text-rose-400">
                Stop Loss (Invalidación)
              </label>
              <input
                type="number"
                step="any"
                placeholder="Ej: 103200.00"
                value={stopLoss}
                onChange={(e) => setStopLoss(e.target.value)}
                className="w-full bg-[#070c14] border border-[#1b2b3d] rounded-lg px-3 py-2 text-rose-300 focus:outline-none focus:border-rose-500"
                required
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-semibold text-emerald-400">
                Take Profit (Target)
              </label>
              <input
                type="number"
                step="any"
                placeholder="Ej: 107500.00"
                value={takeProfit}
                onChange={(e) => setTakeProfit(e.target.value)}
                className="w-full bg-[#070c14] border border-[#1b2b3d] rounded-lg px-3 py-2 text-emerald-300 focus:outline-none focus:border-emerald-500"
                required
              />
            </div>
          </div>

          {/* Panel de Cálculo de Riesgo y Ganancia en Vivo */}
          <div className="p-3.5 rounded-xl bg-[#070c14] border border-[#142335] text-xs">
            <div className="flex items-center justify-between mb-2 pb-2 border-b border-[#142335]">
              <span className="font-bold text-slate-300 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-[#00f5c4]" />
                <span>Gestión de Riesgo Cuantitativa</span>
              </span>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-400">Riesgo en $:</span>
                <input
                  type="number"
                  value={riskAmount}
                  onChange={(e) => setRiskAmount(e.target.value)}
                  className="w-20 bg-[#0c1420] border border-[#1b2b3d] rounded px-2 py-0.5 text-right text-slate-200 text-xs focus:outline-none focus:border-[#00f5c4]"
                />
              </div>
            </div>

            {calcMetrics && calcMetrics.isValid ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                <div className="p-2 rounded bg-[#0c1420]">
                  <div className="text-[10px] text-slate-500 uppercase">Riesgo (%)</div>
                  <div className="font-bold text-rose-400 text-sm">-{calcMetrics.riskPercent}%</div>
                </div>
                <div className="p-2 rounded bg-[#0c1420]">
                  <div className="text-[10px] text-slate-500 uppercase">Ganancia (%)</div>
                  <div className="font-bold text-emerald-400 text-sm">+{calcMetrics.rewardPercent}%</div>
                </div>
                <div className="p-2 rounded bg-[#0c1420]">
                  <div className="text-[10px] text-slate-500 uppercase">Ratio R:R</div>
                  <div className="font-extrabold text-[#00f5c4] text-sm">1:{calcMetrics.rrRatio}</div>
                </div>
                <div className="p-2 rounded bg-[#0c1420]">
                  <div className="text-[10px] text-slate-500 uppercase">Ganancia Estimada</div>
                  <div className="font-bold text-slate-100 text-sm">${calcMetrics.potentialReward}</div>
                </div>
              </div>
            ) : (
              <div className="text-[11px] text-rose-400/90 py-1 flex items-center gap-1">
                <span>⚠️ {calcMetrics?.error || "Ingresa precios válidos para calcular el R:R."}</span>
              </div>
            )}
          </div>

          {/* Constructor Dinámico de Condiciones Multi-Indicador */}
          <SetupConditionBuilder conditions={conditions} onChange={setConditions} />

          {/* Notas / Análisis del Setup */}
          <div>
            <label className="block text-slate-400 mb-1 text-xs font-semibold">Tesis / Notas del Análisis</label>
            <textarea
              rows={2}
              placeholder="Ej: Entrada tras barrido de liquidez en soporte 4H con divergencia alcista en RSI..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-[#070c14] border border-[#1b2b3d] rounded-lg px-3 py-2 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-[#00f5c4]"
            />
          </div>

          {/* Footer del Formulario */}
          <div className="pt-3 border-t border-[#142335] flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-[#142335] text-slate-300 text-xs font-semibold hover:bg-[#1b2b3d] transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!isFormValid}
              className={`px-5 py-2 rounded-lg font-bold text-xs transition-colors shadow-lg ${
                isFormValid
                  ? "bg-[#00f5c4] text-[#070c14] hover:bg-[#33f7d0] shadow-[#00f5c4]/10 cursor-pointer"
                  : "bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed"
              }`}
            >
              {initialData ? "GUARDAR CAMBIOS" : "+ CREAR SETUP"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

