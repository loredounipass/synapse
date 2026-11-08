"use client"

import React from "react"
import { Newspaper, Clock, ArrowUpRight } from "lucide-react"
import { Article, CoinMeta } from "../types"
import { formatTime } from "../utils"

interface NewsGridCardProps {
  article: Article
  index: number
  coinMeta?: CoinMeta
  hasImageError?: boolean
  isVisible: boolean
  onImageError: () => void
}

export function NewsGridCard({
  article,
  index,
  coinMeta,
  hasImageError,
  isVisible,
  onImageError,
}: NewsGridCardProps) {
  const hasImg = Boolean(article.imageurl && !hasImageError)

  return (
    <a
      href={article.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group block"
      data-news-card
      data-idx={index}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? "translateY(0)" : "translateY(24px)",
        transition: `opacity 0.5s ease ${(index % 3) * 0.08}s, transform 0.5s ease ${(index % 3) * 0.08}s`,
      }}
    >
      <div
        className="relative rounded-2xl overflow-hidden h-full transition-all duration-300"
        style={{
          background: "rgba(17, 17, 17, 0.4)",
          border: "1px solid rgba(255,255,255,0.04)",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.border = `1px solid ${coinMeta?.color || "#10b981"}20`
          e.currentTarget.style.boxShadow = `0 8px 40px rgba(0,0,0,0.3), 0 0 30px ${coinMeta?.color || "#10b981"}06`
          e.currentTarget.style.transform = "translateY(-4px)"
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.border = "1px solid rgba(255,255,255,0.04)"
          e.currentTarget.style.boxShadow = "none"
          e.currentTarget.style.transform = "translateY(0)"
        }}
      >
        {/* Card image */}
        <div className="relative overflow-hidden" style={{ height: "220px", background: "#080a0e" }}>
          {hasImg ? (
            <img
              src={article.imageurl}
              alt={article.title || "Market article"}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-[900ms] ease-out"
              onError={onImageError}
            />
          ) : (
            <div
              className="w-full h-full flex items-center justify-center"
              style={{
                background: `linear-gradient(135deg, ${coinMeta?.color || "#10b981"}08, transparent)`,
              }}
            >
              <Newspaper className="w-10 h-10 text-gray-800/40" />
            </div>
          )}

          {/* Gradient overlay */}
          <div
            className="absolute inset-0"
            style={{
              background: "linear-gradient(180deg, transparent 30%, rgba(5,7,10,0.9) 100%)",
            }}
          />

          {/* Colored accent line at top */}
          <div
            className="absolute top-0 left-0 right-0 h-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-500"
            style={{
              background: `linear-gradient(90deg, transparent, ${coinMeta?.color || "#10b981"}, transparent)`,
            }}
          />

          {/* Coin badge */}
          {coinMeta && (
            <div className="absolute top-4 left-4">
              <span
                className="text-[10px] font-mono font-bold px-2.5 py-1.5 rounded-lg tracking-wider"
                style={{
                  background: "rgba(5, 7, 10, 0.6)",
                  color: coinMeta.color,
                  border: `1px solid ${coinMeta.color}30`,
                  backdropFilter: "blur(12px)",
                }}
              >
                {coinMeta.short}
              </span>
            </div>
          )}

          {/* Time badge */}
          <div className="absolute bottom-4 right-4">
            <span
              className="flex items-center gap-1.5 text-[10px] font-mono text-gray-400 px-2.5 py-1 rounded-lg"
              style={{
                background: "rgba(5, 7, 10, 0.5)",
                backdropFilter: "blur(8px)",
              }}
            >
              <Clock className="w-3 h-3 text-gray-500" />
              {formatTime(article.published)}
            </span>
          </div>
        </div>

        {/* Card content */}
        <div className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[10px] font-mono text-gray-600 tracking-wider uppercase">
              {article.source}
            </span>
            <span className="w-1 h-1 rounded-full bg-gray-800" />
            <span className="text-[10px] font-mono text-gray-700">
              {article.categories?.split("|")?.[0] || "Markets"}
            </span>
          </div>
          <h3 className="text-[15px] font-semibold text-gray-200 group-hover:text-emerald-300 transition-colors duration-300 leading-snug line-clamp-2 mb-2">
            {article.title}
          </h3>
          {article.body && (
            <p className="text-[12px] text-gray-600 leading-relaxed line-clamp-2">{article.body}</p>
          )}
          <div className="flex items-center gap-1.5 mt-4 text-emerald-500/50 group-hover:text-emerald-400/80 transition-colors">
            <span className="text-[10px] font-mono font-medium tracking-wider">READ MORE</span>
            <ArrowUpRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </div>
        </div>
      </div>
    </a>
  )
}

