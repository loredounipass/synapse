"use client"

import { useState } from "react"
import { toast } from "sonner"

/**
 * Hook para gestionar las alertas de precio en la barra lateral
 */
export function usePriceAlerts(activeSymbol = "BTCUSDT") {
  const [alerts, setAlerts] = useState([
    {
      id: 1,
      symbol: activeSymbol,
      condition: "> $105,000",
      active: true,
      note: "Ruptura de resistencia",
    },
    {
      id: 2,
      symbol: "ETHUSDT",
      condition: "RSI (14) < 30",
      active: true,
      note: "Rebote por sobreventa",
    },
    {
      id: 3,
      symbol: "SOLUSDT",
      condition: "Cruce MACD alcista",
      active: false,
      note: "Confirmación de tendencia",
    },
  ])
  const [newAlertCondition, setNewAlertCondition] = useState("")

  const toggleAlert = (id) => {
    setAlerts((prev) =>
      prev.map((al) => (al.id === id ? { ...al, active: !al.active } : al))
    )
  }

  const handleCreateAlert = (e) => {
    e.preventDefault()
    if (!newAlertCondition.trim()) return
    const newAlert = {
      id: Date.now(),
      symbol: activeSymbol,
      condition: newAlertCondition.trim(),
      active: true,
      note: "Alerta personalizada",
    }
    setAlerts([newAlert, ...alerts])
    setNewAlertCondition("")
    toast.success("Alerta de precio creada", {
      description: `${newAlert.symbol}: ${newAlert.condition}`,
    })
  }

  const handleDeleteAlert = (id) => {
    setAlerts((prev) => prev.filter((al) => al.id !== id))
    toast.info("Alerta eliminada")
  }

  return {
    alerts,
    newAlertCondition,
    setNewAlertCondition,
    toggleAlert,
    handleCreateAlert,
    handleDeleteAlert,
  }
}

