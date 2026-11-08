import { describe, it, expect } from "vitest"
import {
  calculateRiskReward,
  formatPrice,
  getStatusBadgeConfig,
  AVAILABLE_INDICATORS,
} from "@/components/setups/setupUtils"

describe("Setups Math & Utilities", () => {
  it("calculates accurate R:R for LONG position", () => {
    const res = calculateRiskReward({
      direction: "LONG",
      entryPrice: 100,
      stopLoss: 95,
      takeProfit: 115,
      riskAmount: 200,
    })

    expect(res.isValid).toBe(true)
    expect(res.rrRatio).toBe(3.0)
    expect(res.riskPercent).toBe(5.0)
    expect(res.rewardPercent).toBe(15.0)
    expect(res.potentialReward).toBe(600.0)
  })

  it("calculates accurate R:R for SHORT position", () => {
    const res = calculateRiskReward({
      direction: "SHORT",
      entryPrice: 100,
      stopLoss: 105,
      takeProfit: 85,
      riskAmount: 100,
    })

    expect(res.isValid).toBe(true)
    expect(res.rrRatio).toBe(3.0)
    expect(res.riskPercent).toBe(5.0)
    expect(res.rewardPercent).toBe(15.0)
    expect(res.potentialReward).toBe(300.0)
  })

  it("rejects invalid LONG levels when Stop Loss >= Entry", () => {
    const res = calculateRiskReward({
      direction: "LONG",
      entryPrice: 100,
      stopLoss: 102,
      takeProfit: 110,
    })

    expect(res.isValid).toBe(false)
    expect(res.error).toContain("Stop Loss debe ser menor")
  })

  it("rejects invalid SHORT levels when Take Profit >= Entry", () => {
    const res = calculateRiskReward({
      direction: "SHORT",
      entryPrice: 100,
      stopLoss: 105,
      takeProfit: 102,
    })

    expect(res.isValid).toBe(false)
    expect(res.error).toContain("Take Profit debe ser menor")
  })

  it("formats prices consistently", () => {
    expect(formatPrice(104250.5, 2)).toBe("104,250.50")
    expect(formatPrice(null)).toBe("-")
    expect(formatPrice(undefined)).toBe("-")
  })

  it("returns correct styling configuration for each setup status", () => {
    const activated = getStatusBadgeConfig("ACTIVATED")
    expect(activated.label).toBe("ACTIVADO")
    expect(activated.bgClass).toContain("emerald")

    const invalidated = getStatusBadgeConfig("INVALIDATED")
    expect(invalidated.label).toBe("INVALIDADO")
    expect(invalidated.bgClass).toContain("rose")

    const pending = getStatusBadgeConfig("PENDING")
    expect(pending.label).toBe("MONITOREANDO")
    expect(pending.bgClass).toContain("amber")
  })

  it("exposes all key technical indicators in the catalog", () => {
    const indicatorKeys = AVAILABLE_INDICATORS.map((i) => i.value)
    expect(indicatorKeys).toContain("rsi")
    expect(indicatorKeys).toContain("squeeze_state")
    expect(indicatorKeys).toContain("squeeze_momentum")
    expect(indicatorKeys).toContain("macd_hist")
    expect(indicatorKeys).toContain("adx")
    expect(indicatorKeys).toContain("volCandle")
    expect(indicatorKeys).toContain("candle_close")
    expect(indicatorKeys).toContain("buyer_percent")
    expect(indicatorKeys).toContain("order_flow_delta")
    expect(indicatorKeys).toContain("order_flow_delta_percent")
    expect(indicatorKeys).toContain("s1")
    expect(indicatorKeys).toContain("r1")
    expect(indicatorKeys).toContain("soporte")
    expect(indicatorKeys).toContain("resistencia")
    expect(indicatorKeys).toContain("ema50")
    expect(indicatorKeys).toContain("ema200")
    expect(indicatorKeys).toContain("nearest_order_block_top")
    expect(indicatorKeys).toContain("custom")
  })
})

