"use client"

import { useState, useEffect, useRef } from "react"
import { Article, CoinMeta, MarketType } from "../types"
import { COINS, STOCKS } from "../constants"
import { fetchNewsBySymbol } from "@/services/api/newsApi"

export function useNewsFeed() {
  const [newsByCoin, setNewsByCoin] = useState<Record<string, Article[]>>({})
  const [loading, setLoading] = useState(true)
  const [activeCoin, setActiveCoin] = useState("ALL")
  const [market, setMarket] = useState<MarketType>("crypto")
  const [imgErrors, setImgErrors] = useState<Record<string, boolean>>({})
  const [visibleCards, setVisibleCards] = useState<Set<string>>(new Set())
  const gridRef = useRef<HTMLDivElement>(null)
  const tabsRef = useRef<HTMLDivElement>(null)

  const marketList: CoinMeta[] = market === "stock" ? STOCKS : COINS

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setNewsByCoin({})
    setActiveCoin("ALL")

    Promise.all(
      marketList.map(item =>
        fetchNewsBySymbol(item.symbol, market).then((articles: Article[]) => ({ symbol: item.symbol, articles }))
      )
    ).then(results => {
      if (!cancelled) {
        const grouped: Record<string, Article[]> = {}
        results.forEach(r => { grouped[r.symbol] = r.articles })
        setNewsByCoin(grouped)
        setLoading(false)
      }
    }).catch(() => {
      if (!cancelled) setLoading(false)
    })

    return () => { cancelled = true }
  }, [market])

  // Intersection observer for card reveal animations
  useEffect(() => {
    if (loading) return
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const idx = (entry.target as HTMLElement).dataset?.idx
            if (idx) {
              setVisibleCards(prev => new Set([...prev, idx]))
            }
          }
        })
      },
      { threshold: 0.1, rootMargin: "50px" }
    )

    const cards = document.querySelectorAll("[data-news-card]")
    cards.forEach(card => observer.observe(card))
    return () => observer.disconnect()
  }, [loading, activeCoin])

  const allNews: Article[] = marketList.flatMap(item =>
    (newsByCoin[item.symbol] || []).map((a: Article) => ({ ...a, coin: item.symbol }))
  ).sort((a, b) => (b.published || 0) - (a.published || 0))

  const filteredNews: Article[] = activeCoin === "ALL"
    ? allNews
    : (newsByCoin[activeCoin] || []).map((a: Article) => ({ ...a, coin: activeCoin }))

  const featured = filteredNews[0]
  const rest = filteredNews.slice(1)

  const handleImageError = (id: string) => {
    setImgErrors(prev => ({ ...prev, [id]: true }))
  }

  const handleSelectMarket = (newMarket: MarketType) => {
    setMarket(newMarket)
    setVisibleCards(new Set())
  }

  const handleSelectCoin = (symbol: string) => {
    setActiveCoin(symbol)
    setVisibleCards(new Set())
  }

  return {
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
  }
}

