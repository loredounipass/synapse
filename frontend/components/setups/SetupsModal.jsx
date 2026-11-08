"use client"

import React, { useState } from "react"
import { Bell, X, Plus, RefreshCw, Filter, Sliders } from "lucide-react"
import { SetupsTable } from "./SetupsTable"
import { SetupFormModal } from "./SetupFormModal"
import { SetupActivationDialog } from "./SetupActivationDialog"

export function SetupsModal({
  isOpen,
  onClose,
  symbol,
  market = "crypto",
  provider = "coinbase",
  timeframe = "15m",
  currentPrice = null,
  setupsManager,
}) {
  const [activeTab, setActiveTab] = useState("active") // "active" | "history"
  const [filterCurrentSymbol, setFilterCurrentSymbol] = useState(false)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingSetup, setEditingSetup] = useState(null)

  if (!isOpen) return null

  const {
    setups,
    loading,
    error,
    evaluatingId,
    activeCount,
    activatedCount,
    newlyActivatedSetup,
    dismissActivationAlert,
    handleCreate,
    handleUpdate,
    handleDelete,
    handleEvaluate,
    refreshSetups,
  } = setupsManager

  // Filtrado de setups según la pestaña y el símbolo
  let filteredSetups = setups
  if (filterCurrentSymbol && symbol) {
    filteredSetups = filteredSetups.filter((s) => s.symbol === symbol)
  }

  const activeSetups = filteredSetups.filter(
    (s) => s.status === "PENDING" || s.status === "ACTIVATED"
  )
  const historySetups = filteredSetups.filter(
    (s) => s.status === "INVALIDATED" || s.status === "CLOSED" || s.status === "CANCELLED"
  )

  const displayedSetups = activeTab === "active" ? activeSetups : historySetups

  const handleOpenCreate = () => {
    setEditingSetup(null)
    setIsFormOpen(true)
  }

  const handleOpenEdit = (setup) => {
    setEditingSetup(setup)
    setIsFormOpen(true)
  }

  const handleFormSubmit = async (payload) => {
    if (editingSetup) {
      await handleUpdate(editingSetup.id, payload)
    } else {
      await handleCreate(payload)
    }
    setIsFormOpen(false)
    setEditingSetup(null)
  }

  return (
    <>
      <div className="fixed inset-0 z-[105] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="w-full max-w-6xl h-[88vh] min-h-[620px] max-h-[94vh] bg-[#0c1420] border border-[#1b2b3d] rounded-2xl shadow-2xl overflow-hidden font-mono text-slate-200 flex flex-col">
          {/* 1. Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-[#142335] bg-[#070c14]">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-yellow-400/10 text-yellow-400 border border-yellow-400/20">
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm tracking-wide text-slate-100">
                    CENTRO DE ALERTAS SETUP
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-yellow-400/20 text-yellow-300 font-bold">
                    {activeCount} en monitoreo
                  </span>
                  {activatedCount > 0 && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold animate-pulse">
                      {activatedCount} activados
                    </span>
                  )}
                </div>
                <div className="text-[10px] text-slate-400">
                  Gestión integral de entradas, stop loss y confirmaciones de indicadores vía Redis & Woody MCP
                </div>
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

          {/* 2. Barra de Control y Pestañas */}
          <div className="px-6 py-3 border-b border-[#142335] bg-[#080d16] flex flex-wrap items-center justify-between gap-3 text-xs">
            {/* Tabs */}
            <div className="flex items-center gap-1 p-1 rounded-lg bg-[#070c14] border border-[#1b2b3d]">
              <button
                type="button"
                onClick={() => setActiveTab("active")}
                className={`px-3 py-1.5 rounded-md font-bold text-xs transition-colors ${
                  activeTab === "active"
                    ? "bg-[#142335] text-[#00f5c4]"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Setups Activos ({activeSetups.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("history")}
                className={`px-3 py-1.5 rounded-md font-bold text-xs transition-colors ${
                  activeTab === "history"
                    ? "bg-[#142335] text-slate-200"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Invalidados / Historial ({historySetups.length})
              </button>
            </div>

            {/* Acciones Rápidas */}
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1.5 text-[11px] text-slate-400 cursor-pointer select-none px-2 py-1 rounded bg-[#070c14] border border-[#1b2b3d] hover:border-slate-600 transition-colors">
                <input
                  type="checkbox"
                  checked={filterCurrentSymbol}
                  onChange={(e) => setFilterCurrentSymbol(e.target.checked)}
                  className="rounded bg-[#0c1420] border-slate-700 text-[#00f5c4] focus:ring-0"
                />
                <Filter className="w-3 h-3 text-slate-400" />
                <span>Solo {symbol || "activo actual"}</span>
              </label>

              <button
                type="button"
                onClick={refreshSetups}
                disabled={loading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#070c14] border border-[#1b2b3d] text-slate-300 hover:text-white hover:border-slate-500 transition-colors text-xs"
                title="Refrescar lista y re-evaluar"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-[#00f5c4]" : ""}`} />
                <span className="hidden sm:inline">Refrescar</span>
              </button>

              <button
                type="button"
                onClick={handleOpenCreate}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-[#00f5c4] text-[#070c14] font-bold text-xs hover:bg-[#33f7d0] transition-colors shadow-lg shadow-[#00f5c4]/10"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>NUEVO SETUP</span>
              </button>
            </div>
          </div>

          {/* 3. Contenido Principal */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {error && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                {error}
              </div>
            )}

            <SetupsTable
              setups={displayedSetups}
              onEdit={handleOpenEdit}
              onDelete={handleDelete}
              onEvaluate={handleEvaluate}
              evaluatingId={evaluatingId}
            />
          </div>

          {/* 4. Footer */}
          <div className="px-6 py-3 border-t border-[#142335] bg-[#070c14] flex flex-wrap items-center justify-between gap-3 text-[11px] text-slate-500">
            <div>
              💡 <span className="text-slate-400">Tip:</span> Puedes configurar tú mismo o pedirle a{" "}
              <span className="text-[#00f5c4] font-bold">Woody Agent</span> desde el chat cualquier condición técnica:{" "}
              <span className="italic text-slate-300">
                soportes y resistencias (S1-S3, R1-R3), Order Flow Delta, EMAs, MACD, volumen o acción del precio
              </span>
            </div>
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

      {/* Modal de Creación / Edición */}
      <SetupFormModal
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false)
          setEditingSetup(null)
        }}
        onSubmit={handleFormSubmit}
        initialData={editingSetup}
        activeSymbol={symbol || "BTCUSDT"}
        activeMarket={market}
        activeProvider={provider}
        activeTimeframe={timeframe}
        currentPrice={currentPrice}
      />

      {/* Pop-up de Activación en Vivo */}
      <SetupActivationDialog
        isOpen={Boolean(newlyActivatedSetup)}
        onClose={dismissActivationAlert}
        setup={newlyActivatedSetup}
      />
    </>
  )
}

