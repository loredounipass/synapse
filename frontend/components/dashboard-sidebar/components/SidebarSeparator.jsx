"use client"

import React from "react"

/**
 * Separador profesional de secciones para la barra lateral
 * Presenta un degradado fino de estilo fintech/cyberpunk que se atenúa en los extremos.
 */
export function SidebarSeparator({ className = "" }) {
  return (
    <div className={`relative px-2 py-1.5 flex items-center justify-center overflow-hidden select-none ${className}`}>
      <div className="h-px w-full bg-gradient-to-r from-transparent via-[#1e344d] to-transparent shadow-[0_1px_0_rgba(255,255,255,0.02)]" />
    </div>
  )
}

