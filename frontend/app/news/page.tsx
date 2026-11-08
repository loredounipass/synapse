"use client"

import { useState, useEffect } from "react"
import Header from "@/components/Header"
import DashboardSidebar from "@/components/DashboardSidebar"
import { PrivateRoute } from "@/components/guards/PrivateRoute"
import {
  Moneda,
  useNewsFeed,
  getCoinMeta,
  NewsPageHeader,
  NewsMarketToggle,
  NewsFilterTabs,
  NewsHeroCard,
  NewsGridCard,
  NewsLoadingState,
  NewsEmptyState,
  NewsFooter,
} from "@/components/news"

export default function NewsPage() {
  // ── Hook de datos y lógica del feed de noticias ──
  const {
    loading,
    market,
    marketList,
    activeCoin,
    allNews,
    filteredNews,
    featured,
    rest,
    newsByCoin,
    imgErrors,
    visibleCards,
    gridRef,
    tabsRef,
    handleImageError,
    handleSelectMarket,
    handleSelectCoin,
  } = useNewsFeed()

  // ── Estado de la barra lateral (sincronizado con Dashboard) ──
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [sidebarOpenMobile, setSidebarOpenMobile] = useState(false)

  // Restaurar y guardar preferencia de colapso en localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("synapse_sidebar_collapsed")
      if (saved !== null) {
        setSidebarCollapsed(saved === "true")
      }
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem("synapse_sidebar_collapsed", String(sidebarCollapsed))
    } catch {
      // ignore
    }
  }, [sidebarCollapsed])

  // Atajo de teclado: Ctrl+B / Cmd+B para alternar la barra lateral
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "b") {
        e.preventDefault()
        setSidebarCollapsed((prev) => !prev)
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  // Moneda activa de terminal sincronizada
  const [moneda, setMoneda] = useState<Moneda>({ symbol: "BTCUSDT", nombre: "Bitcoin", market: "crypto" })
  useEffect(() => {
    try {
      const savedAsset = localStorage.getItem("woody-terminal-asset")
      if (savedAsset) {
        const parsed = JSON.parse(savedAsset)
        if (parsed && parsed.symbol) {
          setMoneda(parsed)
        }
      }
    } catch {
      // ignore
    }
  }, [])

  const handleToggleSidebar = () => {
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      setSidebarOpenMobile((prev) => !prev)
    } else {
      setSidebarCollapsed((prev) => !prev)
    }
  }

  return (
    <PrivateRoute>
      <div className="min-h-screen flex" style={{ background: "#05070a" }}>
        {/* Dashboard Sidebar */}
        <DashboardSidebar
          moneda={moneda}
          market={moneda.market || "crypto"}
          isOpenMobile={sidebarOpenMobile}
          setIsOpenMobile={setSidebarOpenMobile}
          isCollapsed={sidebarCollapsed}
          setIsCollapsed={setSidebarCollapsed}
        />

        {/* Contenido principal */}
        <div className="flex-1 min-w-0 flex flex-col transition-[margin,padding,width] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]">
          <Header
            onToggleSidebar={handleToggleSidebar}
            isSidebarCollapsed={sidebarCollapsed}
          />

          {/* Animated grid background */}
          <div
            className="fixed inset-0 opacity-[0.03] pointer-events-none"
            style={{
              backgroundImage: `linear-gradient(rgba(16, 185, 129, 0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(16, 185, 129, 0.5) 1px, transparent 1px)`,
              backgroundSize: "60px 60px",
            }}
          />

          {/* Radial glow */}
          <div
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full opacity-20 pointer-events-none"
            style={{ background: "radial-gradient(circle, rgba(16, 185, 129, 0.15) 0%, transparent 70%)" }}
          />

          {/* Corner accents */}
          <div
            className="fixed top-0 left-0 w-32 h-32 opacity-20 pointer-events-none z-50"
            style={{ borderTop: "1px solid #10b981", borderLeft: "1px solid #10b981" }}
          />
          <div
            className="fixed bottom-0 right-0 w-32 h-32 opacity-20 pointer-events-none z-50"
            style={{ borderBottom: "1px solid #10b981", borderRight: "1px solid #10b981" }}
          />

          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-2 pb-8">
            {/* Encabezado del Market News */}
            <NewsPageHeader market={market} storiesCount={filteredNews.length} />

            {/* Selector de Mercado (Crypto / Stocks) */}
            <NewsMarketToggle market={market} onSelectMarket={handleSelectMarket} />

            {/* Barra de Filtros por Activo */}
            <NewsFilterTabs
              activeCoin={activeCoin}
              marketList={marketList}
              allNewsCount={allNews.length}
              newsByCoin={newsByCoin}
              tabsRef={tabsRef}
              onSelectCoin={handleSelectCoin}
            />

            {/* Feed principal: Loading, Vacío o Grilla con Hero */}
            {loading ? (
              <NewsLoadingState />
            ) : filteredNews.length === 0 ? (
              <NewsEmptyState />
            ) : (
              <>
                {/* Artículo Destacado Hero */}
                {featured && (
                  <NewsHeroCard
                    article={featured}
                    coinMeta={getCoinMeta(featured.coin, marketList)}
                    hasImageError={imgErrors["hero"]}
                    onImageError={() => handleImageError("hero")}
                  />
                )}

                {/* Grilla de Noticias con espaciado amplio y elegante */}
                <div
                  ref={gridRef}
                  className="news-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-7 lg:gap-8"
                >
                  {rest.map((article, i) => (
                    <NewsGridCard
                      key={`${article.url || article.title}-${i}`}
                      article={article}
                      index={i}
                      coinMeta={getCoinMeta(article.coin, marketList)}
                      hasImageError={imgErrors[`card-${i}`]}
                      isVisible={visibleCards.has(String(i))}
                      onImageError={() => handleImageError(`card-${i}`)}
                    />
                  ))}
                </div>
              </>
            )}

            {/* Pie de página con telemetry provider */}
            <NewsFooter market={market} />
          </div>
        </div>
      </div>
    </PrivateRoute>
  )
}
