"use client"

import React from "react"
import { Newspaper, Globe, Clock, TrendingUp, ArrowUpRight } from "lucide-react"
import { Article, CoinMeta } from "../types"
import { formatTime } from "../utils"

interface NewsHeroCardProps {
  article: Article
  coinMeta?: CoinMeta
  hasImageError?: boolean
  onImageError: () => void
}

export function NewsHeroCard({
  article,
  coinMeta,
  hasImageError,
  onImageError,
}: NewsHeroCardProps) {
  const hasImg = Boolean(article.imageurl && !hasImageError)

  return (
    <a
      href={article.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group block mb-12 sm:mb-16"
      data-news-card
      data-idx="hero"
    >
      <div
        className="relative rounded-2xl overflow-hidden transition-all duration-500"
        style={{
          background: "rgba(17, 17, 17, 0.5)",
          border: "1px solid rgba(255,255,255,0.04)",
          boxShadow: "0 4px 40px rgba(0,0,0,0.3)",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.border = `1px solid ${coinMeta?.color || "#10b981"}25`
          e.currentTarget.style.boxShadow = `0 8px 60px rgba(0,0,0,0.4), 0 0 40px ${coinMeta?.color || "#10b981"}08`
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.border = "1px solid rgba(255,255,255,0.04)"
          e.currentTarget.style.boxShadow = "0 4px 40px rgba(0,0,0,0.3)"
        }}
      >
        <div className="relative overflow-hidden h-[320px] sm:h-[420px] bg-[#080a0e]">
          {hasImg ? (
            <img
              src={article.imageurl}
              alt={article.title || "Featured headline"}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-[1200ms] ease-out"
              onError={onImageError}
            />
          ) : (
            <div
              className="w-full h-full flex items-center justify-center"
              style={{
                background: `linear-gradient(135deg, ${coinMeta?.color || "#10b981"}10, transparent)`,
              }}
            >
              <Newspaper className="w-16 h-16 text-gray-800/50" />
            </div>
          )}

          {/* Gradient overlays */}
          <div
            className="absolute inset-0"
            style={{
              background: "linear-gradient(180deg, rgba(5,7,10,0.1) 0%, rgba(5,7,10,0.3) 40%, rgba(5,7,10,0.95) 100%)",
            }}
          />
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(135deg, ${coinMeta?.color || "#10b981"}08, transparent 60%)`,
            }}
          />

          {/* Content overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-8 lg:p-10">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2.5 sm:mb-4">
              {coinMeta && (
                <span
                  className="text-[10px] sm:text-[11px] font-mono font-bold px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg tracking-wider"
                  style={{
                    background: `${coinMeta.color}18`,
                    color: coinMeta.color,
                    border: `1px solid ${coinMeta.color}30`,
                    backdropFilter: "blur(12px)",
                    boxShadow: `0 0 12px ${coinMeta.color}10`,
                  }}
                >
                  {coinMeta.name.toUpperCase()}
                </span>
              )}
              <span className="text-[10px] sm:text-[11px] font-mono text-gray-400 flex items-center gap-1.5 bg-white/5 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg backdrop-blur-sm">
                <Globe className="w-3 h-3" />
                {article.source}
              </span>
              <span className="text-[10px] sm:text-[11px] font-mono text-gray-500 flex items-center gap-1.5 bg-white/5 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg backdrop-blur-sm">
                <Clock className="w-3 h-3" />
                {formatTime(article.published)}
              </span>
            </div>

            <h2
              className="text-lg sm:text-2xl lg:text-3xl font-bold text-white group-hover:text-emerald-200 transition-colors duration-500 leading-snug sm:leading-tight line-clamp-3 max-w-4xl"
              style={{ textShadow: "0 2px 20px rgba(0,0,0,0.5)" }}
            >
              {article.title}
            </h2>

            {article.body && (
              <p className="text-xs sm:text-sm text-gray-400 mt-2 sm:mt-3 line-clamp-2 max-w-3xl leading-relaxed">
                {article.body}
              </p>
            )}

            <div className="flex items-center gap-1.5 sm:gap-2 mt-3 sm:mt-5 text-emerald-400/70 group-hover:text-emerald-400 transition-colors">
              <span className="text-[11px] sm:text-xs font-mono font-medium tracking-wider">READ FULL ARTICLE</span>
              <ArrowUpRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </div>
          </div>

          {/* Featured badge */}
          <div className="absolute top-5 left-5">
            <span
              className="flex items-center gap-1.5 text-[10px] font-mono font-bold tracking-widest px-3 py-1.5 rounded-lg text-emerald-400"
              style={{
                background: "rgba(5, 7, 10, 0.7)",
                border: "1px solid rgba(16, 185, 129, 0.2)",
                backdropFilter: "blur(12px)",
              }}
            >
              <TrendingUp className="w-3 h-3" />
              FEATURED
            </span>
          </div>
        </div>
      </div>
    </a>
  )
}

