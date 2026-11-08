"use client"

import React, { useState, useMemo } from "react"
import { useAuth } from "@/hooks/useAuth"
import { toast } from "sonner"

// Hooks de lógica desacoplada
import { useWatchlistPrices } from "./hooks/useWatchlistPrices"
import { usePriceAlerts } from "./hooks/usePriceAlerts"
import { useDemoPortfolio } from "./hooks/useDemoPortfolio"
import { get24hChangeFromHistory } from "./utils"

// Componentes modulares de interfaz
import { SidebarHeader } from "./components/SidebarHeader"
import { SidebarTelemetry } from "./components/SidebarTelemetry"
import { SidebarWorkspaceNav } from "./components/SidebarWorkspaceNav"
import { SidebarToolsNav } from "./components/SidebarToolsNav"
import { SidebarWatchlist } from "./components/SidebarWatchlist"
import { SidebarSeparator } from "./components/SidebarSeparator"
import { SidebarFooter } from "./components/SidebarFooter"

// Modales de acciones secundarias
import { PriceAlertsModal } from "./modals/PriceAlertsModal"
import { PortfolioModal } from "./modals/PortfolioModal"
import { ShortcutsModal } from "./modals/ShortcutsModal"

/**
 * Componente Principal DashboardSidebar (Orquestador Modular)
 */
export default function DashboardSidebar({
  moneda,
  market = "crypto",
  timeframe = "15m",
  provider = "coinbase",
  onCambiarMoneda = () => {},
  isOpenMobile = false,
  setIsOpenMobile,
  isCollapsed = false,
  setIsCollapsed,
  datos = null,
}) {
  const { user, isAuthenticated, openLoginDialog, logout } = useAuth()

  // Control de modales
  const [showAlertsModal, setShowAlertsModal] = useState(false)
  const [showPortfolioModal, setShowPortfolioModal] = useState(false)
  const [showShortcutsModal, setShowShortcutsModal] = useState(false)

  // Lógica desacoplada en hooks especializados
  const { livePrices } = useWatchlistPrices(moneda?.symbol)
  const {
    alerts,
    newAlertCondition,
    setNewAlertCondition,
    toggleAlert,
    handleCreateAlert,
    handleDeleteAlert,
  } = usePriceAlerts(moneda?.symbol)
  const { portfolioPositions } = useDemoPortfolio(datos, moneda)

  // Cálculo del cambio 24h real del activo actualmente seleccionado
  const active24hChange = useMemo(() => {
    if (!datos?.history || !datos?.precio) return null
    return get24hChangeFromHistory(datos.history, datos.precio)
  }, [datos?.history, datos?.precio])

  // Desplazamiento suave hacia secciones del dashboard
  const scrollTo = (elementId) => {
    const el = document.getElementById(elementId)
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" })
      if (setIsOpenMobile) setIsOpenMobile(false)
    }
  }

  // Despliegue de Woody AI Terminal
  const triggerWoodyChat = () => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("open-woody-chat"))
      toast.success("Woody Agent activado", {
        description: "Terminal de inteligencia artificial desplegado.",
      })
      if (setIsOpenMobile) setIsOpenMobile(false)
    }
  }

  // Cambio de activo desde el Watchlist
  const handleSelectWatchlistAsset = (asset) => {
    try {
      window.localStorage.setItem(
        "woody-terminal-asset",
        JSON.stringify({
          nombre: asset.name,
          symbol: asset.symbol,
          icon: asset.icon,
          badge: asset.badge,
          market: asset.market,
        })
      )
      toast.success(`Cargando terminal para ${asset.name}`, {
        description: `Símbolo: ${asset.symbol}`,
      })
      if (setIsOpenMobile) setIsOpenMobile(false)
      window.location.reload()
    } catch (e) {
      console.error(e)
    }
  }

  // Estructura interna de navegación reutilizable para desktop y mobile
  // En mobile drawer (forceExpanded = true) SIEMPRE se muestra completo con logo, títulos y textos
  const renderSidebarContent = (forceExpanded = false) => {
    const collapsed = forceExpanded ? false : isCollapsed

    return (
      <div className="flex flex-col h-full w-full select-none overflow-hidden">
        {/* 1. Header con branding y colapso/cierre */}
        <SidebarHeader
          isCollapsed={collapsed}
          setIsCollapsed={setIsCollapsed}
          setIsOpenMobile={setIsOpenMobile}
          isMobileDrawer={forceExpanded}
        />

        {/* 2. Telemetría de red y latencia */}
        <SidebarTelemetry
          isCollapsed={collapsed}
          market={market}
          provider={provider}
        />

        {/* 3. Contenedor con scroll de navegación */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-2 space-y-1 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-[#142335] [&::-webkit-scrollbar-thumb]:rounded">
          <SidebarWorkspaceNav
            isCollapsed={collapsed}
            onCambiarMoneda={onCambiarMoneda}
            setIsOpenMobile={setIsOpenMobile}
          />

          {/* Separador entre Espacio de Trabajo y Herramientas & IA */}
          <SidebarSeparator />

          <SidebarToolsNav
            isCollapsed={collapsed}
            onTriggerWoodyChat={triggerWoodyChat}
            onScrollTo={scrollTo}
            onOpenAlerts={() => setShowAlertsModal(true)}
            onOpenPortfolio={() => setShowPortfolioModal(true)}
            activeAlertsCount={alerts.filter((a) => a.active).length}
          />

          {/* Separador entre Herramientas & IA y Top Mercados */}
          <SidebarSeparator />

          <SidebarWatchlist
            isCollapsed={collapsed}
            moneda={moneda}
            datos={datos}
            livePrices={livePrices}
            active24hChange={active24hChange}
            onSelectAsset={handleSelectWatchlistAsset}
          />
        </div>

        {/* 4. Footer con sesión y atajos */}
        <SidebarFooter
          isCollapsed={collapsed}
          setIsCollapsed={setIsCollapsed}
          isAuthenticated={isAuthenticated}
          user={user}
          onOpenLogin={() => openLoginDialog()}
          onLogout={() => logout()}
          onOpenShortcuts={() => setShowShortcutsModal(true)}
        />
      </div>
    )
  }

  return (
    <>
      {/* Sidebar Desktop (fijo a la izquierda con animación fluida 60fps) */}
      <aside
        className={`hidden lg:flex flex-col fixed top-0 left-0 bottom-0 z-40 bg-[#070c14]/95 border-r border-[#142335] backdrop-blur-xl transition-[width] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] will-change-[width] overflow-hidden ${
          isCollapsed ? "w-[68px]" : "w-64"
        }`}
      >
        {renderSidebarContent(false)}
      </aside>

      {/* Espaciador fantasma para contenido desktop perfectamente sincronizado */}
      <div
        className={`hidden lg:block flex-shrink-0 transition-[width] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] will-change-[width] overflow-hidden ${
          isCollapsed ? "w-[68px]" : "w-64"
        }`}
      />

      {/* Sidebar Mobile (drawer deslizable con z-index superior al header y contenido 100% expandido) */}
      {isOpenMobile && (
        <div className="fixed inset-0 z-[100] lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
            onClick={() => setIsOpenMobile(false)}
          />
          <aside className="relative w-72 max-w-[85vw] h-full bg-[#070c14] border-r border-[#142335] z-[101] shadow-2xl flex flex-col animate-in slide-in-from-left duration-300">
            {renderSidebarContent(true)}
          </aside>
        </div>
      )}

      {/* Modales de interfaz */}
      <PriceAlertsModal
        isOpen={showAlertsModal}
        onClose={() => setShowAlertsModal(false)}
        symbol={moneda?.symbol}
        alerts={alerts}
        newAlertCondition={newAlertCondition}
        setNewAlertCondition={setNewAlertCondition}
        onCreateAlert={handleCreateAlert}
        onToggleAlert={toggleAlert}
        onDeleteAlert={handleDeleteAlert}
      />

      <PortfolioModal
        isOpen={showPortfolioModal}
        onClose={() => setShowPortfolioModal(false)}
        positions={portfolioPositions}
      />

      <ShortcutsModal
        isOpen={showShortcutsModal}
        onClose={() => setShowShortcutsModal(false)}
      />
    </>
  )
}

