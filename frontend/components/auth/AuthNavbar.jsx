"use client"

import { useAuth } from "@/hooks/useAuth"
import { Activity, LogIn, UserPlus, LogOut, User } from "lucide-react"
import Link from "next/link"

export function AuthNavbar({ showLogo = true }) {
  const { user, isAuthenticated, openLoginDialog, openRegisterDialog, logout } = useAuth()

  return (
    <nav className="w-full bg-[#070c14]/90 border-b border-[#142335] sticky top-0 z-50 backdrop-blur-md px-3 sm:px-6 py-2.5 font-mono text-xs">
      <div className="mx-auto grid max-w-[1600px] grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2 gap-y-2.5 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:gap-x-4">
        {/* Left: Brand SYNAPSE */}
        {showLogo ? (
          <Link
            href="/"
            className="col-start-1 row-start-1 flex min-w-0 flex-shrink-0 cursor-pointer items-center gap-2.5 group"
          >
            <div className="w-8 h-8 rounded-lg bg-[#00f5c4]/10 border border-[#00f5c4]/40 flex items-center justify-center text-[#00f5c4] shadow-[0_0_12px_rgba(0,245,196,0.3)] group-hover:scale-105 transition-transform">
              <Activity className="w-4 h-4 animate-pulse" />
            </div>
            <span className="font-extrabold tracking-wider text-white text-base sm:text-lg whitespace-nowrap group-hover:text-[#00f5c4] transition-colors">
              SYNAPSE
            </span>
          </Link>
        ) : (
          <div />
        )}

        {/* Right: Auth buttons / User Profile */}
        <div className="col-start-2 row-start-1 flex flex-shrink-0 items-center justify-self-end gap-1.5 sm:col-start-3 sm:gap-3">
          {!isAuthenticated ? (
            <>
              {/* Login Button */}
              <button
                type="button"
                onClick={() => openLoginDialog()}
                className="flex items-center gap-1 px-2 py-1.5 rounded-full bg-[#0c1420] border border-[#16283d] hover:border-[#00f5c4]/50 hover:bg-[#111d2e] text-slate-200 transition-all text-[10px] font-semibold tracking-wider uppercase shadow-sm whitespace-nowrap sm:gap-1.5 sm:px-3.5 sm:text-xs"
              >
                <LogIn className="w-3.5 h-3.5 text-[#00f5c4]" />
                <span>LOGIN</span>
              </button>

              {/* Register Button */}
              <button
                type="button"
                onClick={() => openRegisterDialog()}
                className="flex items-center gap-1 px-2 py-1.5 rounded-full bg-[#00f5c4] hover:bg-[#33f7d0] text-[#070c14] transition-all text-[10px] font-bold tracking-wider uppercase shadow-[0_0_15px_rgba(0,245,196,0.3)] whitespace-nowrap sm:gap-1.5 sm:px-4 sm:text-xs"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>REGISTRO</span>
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2">
              {/* User Badge */}
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#0c1420] border border-[#00f5c4]/30 text-white shadow-[0_0_10px_rgba(0,245,196,0.1)]">
                <div className="w-5 h-5 rounded-full bg-[#00f5c4]/15 border border-[#00f5c4]/50 flex items-center justify-center text-[#00f5c4]">
                  <User className="w-3 h-3" />
                </div>
                <span className="font-bold text-xs text-slate-100 max-w-[120px] truncate">
                  {user?.username || user?.email?.split("@")[0] || "Trader"}
                </span>
              </div>

              {/* Logout Button */}
              <button
                type="button"
                onClick={() => logout()}
                title="Cerrar Sesión"
                className="p-1.5 rounded-full bg-[#0c1420] border border-[#16283d] hover:border-[#ff3b69]/50 hover:bg-[#ff3b69]/10 text-slate-400 hover:text-[#ff3b69] transition-all"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}
