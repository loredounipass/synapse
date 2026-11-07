"use client"

import { useEffect, useState } from "react"
import { Download } from "lucide-react"

/**
 * Boton "Instalar" que aparece SOLO cuando el navegador ofrece instalar la PWA
 * (evento beforeinstallprompt). Al instalar, se oculta.
 *
 * En iOS Safari no existe beforeinstallprompt (se instala desde el menu
 * Compartir -> "Agregar a inicio"), por eso aqui simplemente no se muestra
 * nada: no fingimos un boton que no funcionaria en esa plataforma.
 */
export default function InstallButton() {
  const [deferred, setDeferred] = useState(null)
  const [installed, setInstalled] = useState(false)

  useEffect(() => {
    const onBeforeInstall = (e) => {
      e.preventDefault()
      setDeferred(e)
    }
    const onInstalled = () => {
      setInstalled(true)
      setDeferred(null)
    }
    window.addEventListener("beforeinstallprompt", onBeforeInstall)
    window.addEventListener("appinstalled", onInstalled)
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall)
      window.removeEventListener("appinstalled", onInstalled)
    }
  }, [])

  if (installed || !deferred) return null

  const handleClick = async () => {
    deferred.prompt()
    try {
      await deferred.userChoice
    } finally {
      setDeferred(null)
    }
  }

  return (
    <button
      onClick={handleClick}
      title="Instalar app"
      className="flex h-9 w-9 items-center justify-center rounded-full p-0 text-white transition-all hover:bg-white/5 active:scale-95 sm:h-auto sm:w-auto sm:gap-2 sm:rounded-full sm:border sm:border-[#16283d] sm:bg-[#09111b] sm:px-4 sm:py-2 sm:text-sm sm:shadow-sm sm:hover:border-[#00f5c4]/40 sm:hover:bg-[#00f5c4]/5"
    >
      <Download className="w-4 h-4 text-[#00f5c4]" />
      <span className="hidden sm:inline font-semibold whitespace-nowrap">Instalar</span>
    </button>
  )
}
