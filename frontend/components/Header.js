"use client"

import { useEffect, useRef } from "react"
import { ArrowLeftRight, Newspaper, Activity, LayoutDashboard, ChevronLeft, ChevronRight, LogIn, UserPlus, LogOut, User, PanelLeft } from "lucide-react"
import { useRouter, usePathname } from "next/navigation"
import InstallButton from "./InstallButton"
import { useAuth } from "@/hooks/useAuth"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

/**
 * @param {Object} props
 * @param {(() => void) | null} [props.onCambiarMoneda]
 * @param {string} [props.timeframe]
 * @param {((tf: string) => void) | null} [props.onTimeframeChange]
 * @param {"crypto" | "stock"} [props.market]
 * @param {string} [props.provider]
 * @param {boolean} [props.providerReady]
 * @param {((e: any) => void) | null} [props.onProviderChange]
 * @param {string | null} [props.providerPreferenceError]
 * @param {(() => void) | null} [props.onToggleSidebar]
 * @param {boolean} [props.isSidebarCollapsed]
 */
export default function Header({
  onCambiarMoneda = null,
  timeframe = "15m",
  onTimeframeChange = null,
  market = "crypto",
  provider = "coinbase",
  providerReady = false,
  onProviderChange = null,
  providerPreferenceError = null,
  onToggleSidebar = null,
  isSidebarCollapsed = false,
}) {
  const router = useRouter()
  const pathname = usePathname()
  const isNewsPage = pathname === "/news"
  const { user, isAuthenticated, openLoginDialog, openRegisterDialog, logout } = useAuth()

  const handleCambiarMoneda = () => {
    if (onCambiarMoneda) {
      onCambiarMoneda()
    } else {
      try {
        window.localStorage.removeItem("woody-terminal-asset")
      } catch (e) { }
      router.push("/")
    }
  }

  const timeframes = ["1m", "5m", "15m", "1h", "4h", "6h", "1d"]

  // Selector de temporalidades: las opciones se desplazan horizontalmente
  // cuando no caben, sin comprimir los controles de navegación.
  const tfScrollRef = useRef(null)
  const scrollTf = (dir) => {
    const el = tfScrollRef.current
    if (el) el.scrollBy({ left: dir * 64, behavior: "smooth" })
  }

  useEffect(() => {
    const el = tfScrollRef.current
    if (!el) return
    // Rueda vertical -> scroll horizontal (desktop con mouse, sin scrollbar visible).
    const onWheel = (e) => {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        e.preventDefault()
        el.scrollLeft += e.deltaY
      }
    }
    el.addEventListener("wheel", onWheel, { passive: false })
    return () => el.removeEventListener("wheel", onWheel)
  }, [])

  useEffect(() => {
    // Al cambiar de temporalidad, traer la activa al centro del recuadro.
    const el = tfScrollRef.current
    if (!el) return
    const active = el.querySelector('[data-active="true"]')
    if (active) active.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" })
  }, [timeframe])

  return (
    <header className="w-full bg-[#070c14]/95 border-b border-[#142335] sticky top-0 z-40 backdrop-blur-md px-3 sm:px-6 py-2.5 mb-5 shadow-lg shadow-black/40">
      <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-2 text-xs font-mono sm:gap-3 w-full min-w-0">
        {/* Left: Sidebar Toggle on Dashboard or Brand fallback */}
        <div className="flex flex-shrink-0 items-center gap-2">
          {onToggleSidebar ? (
            <button
              type="button"
              onClick={onToggleSidebar}
              title={isSidebarCollapsed ? "Expandir menú lateral (Ctrl+B)" : "Colapsar menú lateral (Ctrl+B)"}
              aria-label="Alternar menú lateral"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#16283d] bg-[#0c1420]/80 text-slate-400 hover:border-[#00f5c4]/40 hover:text-[#00f5c4] hover:bg-[#00f5c4]/10 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00f5c4]/60 active:scale-95 flex-shrink-0"
            >
              <PanelLeft className="w-4 h-4" />
            </button>
          ) : (
            <div
              onClick={() => router.push("/dashboard")}
              className="flex min-w-0 flex-shrink-0 cursor-pointer items-center gap-2 group"
            >
              <div className="w-8 h-8 rounded-lg bg-[#00f5c4]/10 border border-[#00f5c4]/40 flex items-center justify-center text-[#00f5c4] shadow-[0_0_12px_rgba(0,245,196,0.3)] group-hover:scale-105 transition-transform flex-shrink-0">
                <Activity className="w-4.5 h-4.5 animate-pulse" />
              </div>
              <span className="font-extrabold tracking-wider text-white text-base sm:text-lg whitespace-nowrap group-hover:text-[#00f5c4] transition-colors">
                SYNAPSE
              </span>
            </div>
          )}
        </div>

        {/* Center: Navigation actions + timeframe selector */}
        <div className="flex min-w-0 flex-1 flex-nowrap items-center justify-start sm:justify-center gap-1 sm:gap-3 overflow-x-auto overscroll-x-contain [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <div className="flex flex-shrink-0 items-center gap-1 sm:gap-2 lg:gap-4">
            {/* Install app button */}
            <InstallButton />

            {/* Dashboard button (shown when on news page) */}
            {isNewsPage && (
              <button
                onClick={() => router.push("/dashboard")}
                className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-lg sm:rounded-none p-0 text-slate-400 transition-colors hover:bg-white/5 hover:text-[#00f5c4] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00f5c4]/60 sm:h-auto sm:w-auto sm:gap-2 sm:px-2 sm:py-2 sm:text-sm"
                title="Return to Trading Dashboard"
              >
                <LayoutDashboard className="w-4 h-4 text-[#00f5c4]" />
                <span className="hidden sm:inline font-semibold whitespace-nowrap">Dashboard</span>
              </button>
            )}

            {/* Market News button (only shown when not on news page) */}
            {!isNewsPage && (
              <button
                onClick={() => router.push("/news")}
                className="relative flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-lg sm:rounded-none p-0 text-slate-300 transition-colors hover:bg-white/5 hover:text-cyan-300 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/60 sm:h-auto sm:w-auto sm:gap-2 sm:px-2 sm:py-2 sm:text-sm"
                title="Market News"
              >
                <Newspaper className="w-4 h-4 text-cyan-400" />
                <span className="hidden sm:inline font-semibold whitespace-nowrap">MarketNews</span>
              </button>
            )}

            {/* Change pair button (only on dashboard) */}
            {!isNewsPage && (
              <button
                onClick={handleCambiarMoneda}
                className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-lg sm:rounded-none p-0 text-slate-300 transition-colors hover:bg-white/5 hover:text-[#00f5c4] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00f5c4]/60 sm:h-auto sm:w-auto sm:gap-2 sm:px-2 sm:py-2 sm:text-sm"
                title="Change Trading Pair"
              >
                <ArrowLeftRight className="w-4 h-4 text-[#00f5c4]" />
                <span className="hidden sm:inline font-semibold whitespace-nowrap">Change Pair</span>
              </button>
            )}

            {market === "crypto" && onProviderChange && (
              <label className="flex items-center gap-1.5 px-1 py-1 text-[10px] sm:text-xs font-semibold text-slate-500">
                <span className="hidden sm:inline">Provider</span>
                <select
                  aria-label="Market data provider"
                  value={provider}
                  onChange={onProviderChange}
                  disabled={!providerReady}
                  className="cursor-pointer bg-transparent text-[#00f5c4] outline-none hover:text-white focus-visible:ring-2 focus-visible:ring-[#00f5c4]/70 disabled:cursor-not-allowed disabled:opacity-50 text-[11px]"
                >
                  <option className="bg-[#0c1420]" value="coinbase">Coinbase</option>
                  <option className="bg-[#0c1420]" value="binance">Binance</option>
                </select>
              </label>
            )}
          </div>

          {market === "crypto" && providerPreferenceError && (
            <span role="alert" className="text-[10px] text-[#ff3b69] whitespace-nowrap">
              {providerPreferenceError}
            </span>
          )}

          {/* Selector compacto de temporalidades (solo en dashboard cuando se provee callback) */}
          {onTimeframeChange && (
            <div className="flex w-[min(100%,8rem)] flex-none items-center gap-0 sm:w-[min(100%,9rem)] sm:gap-1 lg:w-[min(100%,12rem)]">
              <button
                type="button"
                onClick={() => scrollTf(-1)}
                aria-label="Temporalidades anteriores"
                className="flex h-6 w-5 flex-none items-center justify-center text-slate-500 transition-colors hover:text-[#00f5c4] focus-visible:outline-none focus-visible:text-[#00f5c4] sm:h-7 sm:w-7"
              >
                <ChevronLeft className="h-3.5 w-3.5 flex-none sm:h-4 sm:w-4" />
              </button>

              <div
                ref={tfScrollRef}
                className="flex h-7 min-w-0 flex-1 touch-pan-x items-center gap-0 overflow-x-auto overscroll-contain [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] sm:h-9 sm:gap-1"
              >
                {timeframes.map((tf) => {
                  const isActive = timeframe.toLowerCase() === tf.toLowerCase()
                  return (
                    <button
                      key={tf}
                      data-active={isActive ? "true" : "false"}
                      aria-pressed={isActive}
                      onClick={() => onTimeframeChange(tf)}
                      className={`relative flex h-full flex-shrink-0 items-center whitespace-nowrap px-0.5 text-[10px] font-semibold tracking-wide transition-colors uppercase text-center focus-visible:outline-none focus-visible:text-[#00f5c4] sm:px-1.5 sm:text-xs ${isActive
                        ? "text-[#00f5c4] after:absolute after:inset-x-1.5 after:bottom-1 after:h-px after:bg-[#00f5c4]"
                        : "text-slate-400 hover:text-white"
                        }`}
                    >
                      {tf}
                    </button>
                  )
                })}
              </div>

              <button
                type="button"
                onClick={() => scrollTf(1)}
                aria-label="Temporalidades siguientes"
                className="flex h-6 w-5 flex-none items-center justify-center text-slate-500 transition-colors hover:text-[#00f5c4] focus-visible:outline-none focus-visible:text-[#00f5c4] sm:h-7 sm:w-7"
              >
                <ChevronRight className="h-3.5 w-3.5 flex-none sm:h-4 sm:w-4" />
              </button>
            </div>
          )}
        </div>

        {/* Right: Account controls remain anchored to the right edge of the navbar. */}
        <div className="flex flex-shrink-0 items-center justify-end gap-2">
          {!isAuthenticated ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => openLoginDialog()}
                className="flex h-9 w-9 items-center justify-center rounded-full p-0 text-slate-300 transition-colors hover:bg-white/5 hover:text-[#00f5c4] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00f5c4]/60 sm:h-auto sm:w-auto sm:gap-1.5 sm:rounded-none sm:px-2 sm:py-2 sm:text-xs"
              >
                <LogIn className="w-3.5 h-3.5 text-[#00f5c4]" />
                <span className="hidden sm:inline">LOGIN</span>
              </button>
              <button
                type="button"
                onClick={() => openRegisterDialog()}
                className="flex h-9 w-9 items-center justify-center rounded-full p-0 text-[#00f5c4] transition-colors hover:bg-white/5 hover:text-white active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00f5c4]/60 sm:h-auto sm:w-auto sm:gap-1.5 sm:rounded-none sm:px-2 sm:py-2 sm:text-xs"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">REGISTRO</span>
              </button>
            </div>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label="Abrir menú de usuario"
                  title="Cuenta"
                  className="flex h-9 w-9 items-center justify-center rounded-full text-[#00f5c4] transition-colors hover:bg-[#00f5c4]/10 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00f5c4]/70"
                >
                  <User className="h-4 w-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="min-w-48 border-[#1b2b3d] bg-[#0b121d] text-slate-100"
              >
                <DropdownMenuLabel className="font-mono text-xs text-slate-400">
                  {user?.username || user?.email?.split("@")[0] || "Trader"}
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-[#1b2b3d]" />
                <DropdownMenuItem
                  onSelect={() => logout()}
                  className="cursor-pointer font-mono text-xs text-slate-300 focus:bg-[#ff3b69]/10 focus:text-[#ff3b69]"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Cerrar sesión
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </header>
  )
}
