"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { toast } from "sonner"
import {
  fetchSetups,
  createSetup,
  updateSetup,
  deleteSetup,
  evaluateSetup,
  evaluateAllSetups,
} from "@/services/api/setupsApi"

export function useSetups({ activeSymbol = null, enabled = true } = {}) {
  const [setups, setSetups] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [evaluatingId, setEvaluatingId] = useState(null)
  const [newlyActivatedSetup, setNewlyActivatedSetup] = useState(null)

  const prevStatusesRef = useRef({})

  const loadSetups = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true)
    try {
      const data = await fetchSetups()
      const list = data.setups || []

      // Detección de activación para disparar el diálogo
      list.forEach((s) => {
        const prevStatus = prevStatusesRef.current[s.id]
        if (prevStatus === "PENDING" && s.status === "ACTIVATED") {
          setNewlyActivatedSetup(s)
          toast.success(`🎉 SETUP ACTIVADO: ${s.symbol} ${s.direction}`, {
            description: `Entrada alcanzada en $${s.entry_price} con todas las condiciones cumplidas.`,
            duration: 8000,
          })
        }
        prevStatusesRef.current[s.id] = s.status
      })

      setSetups(list)
      setError(null)
    } catch (err) {
      if (!quiet) {
        loggerError("Error cargando setups:", err)
        setError(err.message || "No se pudieron cargar los setups.")
      }
    } finally {
      if (!quiet) setLoading(false)
    }
  }, [])

  // Carga inicial y auto-evaluación periódica
  useEffect(() => {
    if (!enabled) {
      setSetups([])
      return
    }

    loadSetups(false)

    // Polling ligero de evaluación cada 10 segundos para actualizar estado contra Redis
    const interval = setInterval(async () => {
      if (document.hidden) return
      try {
        await evaluateAllSetups("PENDING")
        await loadSetups(true)
      } catch (e) {
        // Silenciar errores de background polling
      }
    }, 10000)

    return () => clearInterval(interval)
  }, [enabled, loadSetups])

  const handleCreate = async (payload) => {
    try {
      const res = await createSetup(payload)
      const created = res.setup
      setSetups((prev) => [created, ...prev])
      prevStatusesRef.current[created.id] = created.status
      toast.success("Setup registrado exitosamente", {
        description: `${created.symbol} ${created.direction} en $${created.entry_price}`,
      })
      if (created.status === "ACTIVATED") {
        setNewlyActivatedSetup(created)
      }
      return created
    } catch (err) {
      toast.error("Error creando setup", {
        description: err.message || "Verifica los niveles de precio.",
      })
      throw err
    }
  }

  const handleUpdate = async (setupId, updates) => {
    try {
      const res = await updateSetup(setupId, updates)
      const updated = res.setup
      setSetups((prev) => prev.map((s) => (s.id === setupId ? updated : s)))
      prevStatusesRef.current[updated.id] = updated.status
      toast.success("Setup actualizado")
      return updated
    } catch (err) {
      toast.error("Error actualizando setup", {
        description: err.message,
      })
      throw err
    }
  }

  const handleDelete = async (setupId) => {
    try {
      await deleteSetup(setupId)
      setSetups((prev) => prev.filter((s) => s.id !== setupId))
      delete prevStatusesRef.current[setupId]
      toast.info("Setup eliminado")
    } catch (err) {
      toast.error("Error eliminando setup", {
        description: err.message,
      })
    }
  }

  const handleEvaluate = async (setupId) => {
    setEvaluatingId(setupId)
    try {
      const res = await evaluateSetup(setupId)
      const updated = res.setup
      if (updated) {
        setSetups((prev) => prev.map((s) => (s.id === setupId ? updated : s)))
        if (prevStatusesRef.current[setupId] === "PENDING" && updated.status === "ACTIVATED") {
          setNewlyActivatedSetup(updated)
        }
        prevStatusesRef.current[setupId] = updated.status
      }

      if (res.state_changed) {
        toast.info(`Estado actualizado: ${updated?.status}`)
      } else {
        toast.success("Setup evaluado contra el feed de mercado.")
      }
    } catch (err) {
      toast.error("Error al evaluar setup", {
        description: err.message,
      })
    } finally {
      setEvaluatingId(null)
    }
  }

  const activeCount = setups.filter((s) => s.status === "PENDING").length
  const activatedCount = setups.filter((s) => s.status === "ACTIVATED").length

  return {
    setups,
    loading,
    error,
    evaluatingId,
    activeCount,
    activatedCount,
    newlyActivatedSetup,
    dismissActivationAlert: () => setNewlyActivatedSetup(null),
    handleCreate,
    handleUpdate,
    handleDelete,
    handleEvaluate,
    refreshSetups: () => loadSetups(false),
  }
}

function loggerError(...args) {
  if (process.env.NODE_ENV !== "production") {
    console.error(...args)
  }
}

