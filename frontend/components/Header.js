"use client"

import { useEffect, useRef } from "react"
import { ArrowLeftRight, Newspaper, Activity, LayoutDashboard, ChevronLeft, ChevronRight, LogIn, UserPlus, LogOut, User } from "lucide-react"
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

export default function Header({
  onCambiarMoneda,
  timeframe = "15m",
  onTimeframeChange,
  market,
  provider = "coinbase",
  providerReady = false,
  onProviderChange,
  providerPreferenceError = null,
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
      } catch (e) {}
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
    <header className="w-full bg-[#070c14]/95 border-b border-[#142335] sticky top-0 z-50 backdrop-blur-md px-3 sm:px-6 py-2.5 mb-5 shadow-lg shadow-black/40">
      <div className={`mx-auto grid max-w-[1600px] items-center gap-x-2 gap-y-2.5 text-xs font-mono sm:gap-x-3 lg:grid-cols-[auto_minmax(0,1fr)_auto] ${
        isNewsPage
          ? "grid-cols-[auto_minmax(0,1fr)_auto] sm:grid-cols-[minmax(0,1fr)_auto]"
          : "grid-cols-[minmax(0,1fr)_auto]"
      }`}>
        {/* Brand (left). On large screens it shares a single row with the
            controls and status; on mobile it sits above them. */}
          <div
            onClick={() => router.push("/dashboard")}
            className="col-start-1 row-start-1 flex min-w-0 flex-shrink-0 cursor-pointer items-center gap-2.5 group lg:col-start-1 lg:row-start-1"
          >
            <div className="w-8 h-8 rounded-lg bg-[#00f5c4]/10 border border-[#00f5c4]/40 flex items-center justify-center text-[#00f5c4] shadow-[0_0_12px_rgba(0,245,196,0.3)] group-hover:scale-105 transition-transform flex-shrink-0">
              <Activity className="w-4.5 h-4.5 animate-pulse" />
            </div>
            <span className="font-extrabold tracking-wider text-white text-base sm:text-lg whitespace-nowrap group-hover:text-[#00f5c4] transition-colors">
              SYNAPSE
            </span>
          </div>
  
        {/* Asset badge + navigation actions + timeframe selector. Centered in the
            navbar on large screens; its own full-width row on mobile. */}
        <div className={`${isNewsPage
          ? "col-start-2 row-start-1 w-auto justify-end sm:col-start-1 sm:row-start-2 sm:w-full sm:justify-center"
          : "col-start-1 row-start-2 w-full justify-start"
        } flex min-w-0 flex-nowrap items-center gap-1 overflow-x-auto overscroll-x-contain [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] sm:gap-3 lg:col-start-2 lg:row-start-1 lg:ml-8 lg:w-auto lg:flex-1 lg:justify-center`}>
          {/* Navigation actions: icon-only on mobile, icon + label from sm up */}
          <div className="flex flex-shrink-0 items-center gap-1 sm:gap-2 lg:gap-4">
            {/* Install app button (solo aparece si el navegador ofrece instalar la PWA) */}
            <InstallButton />
  
            {/* Dashboard button (shown when on news page) */}
            {isNewsPage && (
              <button
                onClick={() => router.push("/dashboard")}
                className="flex h-9 w-9 items-center justify-center rounded-full p-0 text-slate-400 transition-colors hover:bg-white/5 hover:text-[#00f5c4] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00f5c4]/60 sm:h-auto sm:w-auto sm:gap-2 sm:rounded-none sm:px-2 sm:py-2 sm:text-sm"
                title="Return to Trading Dashboard"
              >
                <LayoutDashboard className="w-4 h-4 text-[#00f5c4]" />
                <span className="hidden sm:inline font-semibold whitespace-nowrap">Dashboard</span>
              </button>
            )}
  
            {/* Market News button */}
            <button
              onClick={() => router.push("/news")}
              aria-current={isNewsPage ? "page" : undefined}
              className={`relative flex h-9 w-9 items-center justify-center rounded-full p-0 transition-colors active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/60 sm:h-auto sm:w-auto sm:gap-2 sm:rounded-none sm:px-2 sm:py-2 sm:text-sm ${
                isNewsPage
                  ? "bg-cyan-300/10 text-cyan-300 sm:bg-transparent sm:after:absolute sm:after:inset-x-2 sm:after:-bottom-0.5 sm:after:h-px sm:after:bg-cyan-300"
                  : "text-slate-300 hover:bg-white/5 hover:text-cyan-300 sm:hover:bg-transparent"
              }`}
              title="Market News"
            >
              <Newspaper className="w-4 h-4 text-cyan-400" />
              <span className="hidden sm:inline font-semibold whitespace-nowrap">MarketNews</span>
            </button>
  
            {/* Change pair button */}
            <button
              onClick={handleCambiarMoneda}
              className="flex h-9 w-9 items-center justify-center rounded-full p-0 text-slate-300 transition-colors hover:bg-white/5 hover:text-[#00f5c4] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00f5c4]/60 sm:h-auto sm:w-auto sm:gap-2 sm:rounded-none sm:px-2 sm:py-2 sm:text-sm"
              title="Change Trading Pair"
            >
              <ArrowLeftRight className="w-4 h-4 text-[#00f5c4]" />
              <span className="hidden sm:inline font-semibold whitespace-nowrap">Change Pair</span>
            </button>
            {market === "crypto" && onProviderChange && (
              <label className="flex items-center gap-2 px-1 py-2 text-[10px] sm:text-xs font-semibold text-slate-500">
                <span className="hidden sm:inline">Provider</span>
                <select
                  aria-label="Market data provider"
                  value={provider}
                  onChange={onProviderChange}
                  disabled={!providerReady}
                  className="cursor-pointer bg-transparent text-[#00f5c4] outline-none hover:text-white focus-visible:ring-2 focus-visible:ring-[#00f5c4]/70 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option className="bg-[#0c1420]" value="coinbase">Coinbase</option>
                  <option className="bg-[#0c1420]" value="binance">Binance</option>
                </select>
              </label>
            )}
          </div>
          {market === "crypto" && providerPreferenceError && (
            <span role="alert" className="basis-full text-[10px] text-[#ff3b69]">
              {providerPreferenceError}
            </span>
          )}
  
          {/* Selector compacto: las demás temporalidades se alcanzan deslizando horizontalmente. */}
          {onTimeframeChange && (
            <div
              className="flex w-[min(100%,8rem)] flex-none items-center gap-0 sm:w-[min(100%,9rem)] sm:gap-1 lg:w-[min(100%,12rem)]"
            >
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

        {/* Account controls remain anchored to the right edge of the navbar. */}
        <div className={`${isNewsPage
          ? "col-start-3 row-start-1 sm:col-start-2 sm:row-start-2"
          : "col-start-2 row-start-2"
        } flex flex-shrink-0 items-center justify-end gap-2 lg:col-start-3 lg:row-start-1`}>
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
