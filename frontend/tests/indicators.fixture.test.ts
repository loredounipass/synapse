import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"
import {
  formatLevel,
  formatMetric,
  formatVolume,
} from "@/components/indicators/indicatorFormatters"
import {
  buildCandleAndVolumeSeries,
} from "@/components/indicators/indicatorSeries"

type BinanceKline = [
  number,
  string,
  string,
  string,
  string,
  string,
  string,
]

type BinanceFixture = {
  symbol: string
  interval: string
  klines: BinanceKline[]
}

const fixture = JSON.parse(
  readFileSync(
    resolve(process.cwd(), "../backend/tests/fixtures/ethusdt_15m_binance.json"),
    "utf8",
  ),
) as BinanceFixture

const regressionIndicators = {
  rsi: 45.32917021754423,
  rsiStoch: 85.26389494023664,
  rsiStochD: 79.3767499064102,
  macdValue: -1.894707073241534,
  macdSignal: -2.1294221822107695,
  macdHistogram: 0.23471510896923542,
  stochK: 49.358652832317574,
  stochD: 45.555979732106415,
  mfi: 38.47,
  adx: 31.193480486708154,
  plusDi: 16.000805654049934,
  minusDi: 26.466755602731837,
  ema50: 2240.9307857966023,
  ema100: 2242.7710030833978,
  ema200: 2247.043745822484,
  bbUpper: 2247.7788869956175,
  bbMiddle: 2238.9065,
  bbLower: 2230.0341130043826,
}

function makeApiHistory() {
  const rows = fixture.klines
  const history: Record<string, Array<number | null>> = {
    opens: rows.map((row) => Number(row[1])),
    highs: rows.map((row) => Number(row[2])),
    lows: rows.map((row) => Number(row[3])),
    closes: rows.map((row) => Number(row[4])),
    times: rows.map((row) => row[0]),
    volumes: rows.map((row) => Number(row[6])),
    volumesBase: rows.map((row) => Number(row[5])),
  }

  for (const [key, value] of Object.entries({
    ema50: regressionIndicators.ema50,
    ema100: regressionIndicators.ema100,
    ema200: regressionIndicators.ema200,
  })) {
    history[key] = Array(rows.length).fill(null)
    history[key][rows.length - 1] = value
  }

  return history
}

describe("Frozen Binance fixture in frontend indicator views", () => {
  it("maps every historical OHLCV candle to matching chart and volume points", () => {
    const history = makeApiHistory()
    const { candleData, volumeChartData } = buildCandleAndVolumeSeries({ history })

    expect(fixture.symbol).toBe("ETHUSDT")
    expect(fixture.interval).toBe("15m")
    expect(candleData).toHaveLength(fixture.klines.length)
    expect(volumeChartData).toHaveLength(fixture.klines.length)

    for (let index = 0; index < fixture.klines.length; index += 1) {
      const row = fixture.klines[index]
      const candle = candleData[index]
      const volume = volumeChartData[index]

      expect(candle.open).toBe(Number(row[1]))
      expect(candle.high).toBe(Number(row[2]))
      expect(candle.low).toBe(Number(row[3]))
      expect(candle.close).toBe(Number(row[4]))
      expect(candle.wickRange).toEqual([Number(row[3]), Number(row[2])])
      expect(candle.bodyRange).toEqual([Number(row[1]), Number(row[4])])
      expect(volume.volume).toBe(Number(row[6]))
      expect(volume.isBull).toBe(Number(row[4]) >= Number(row[1]))
      expect(candle.time).toBe(volume.time)
      expect(candle.ema50).toBe(history.ema50[index])
      expect(candle.ema100).toBe(history.ema100[index])
      expect(candle.ema200).toBe(history.ema200[index])
    }

    const latestCandle = candleData.at(-1)
    expect(latestCandle?.open).toBe(Number(fixture.klines.at(-1)?.[1]))
    expect(latestCandle?.close).toBe(Number(fixture.klines.at(-1)?.[4]))
    expect(latestCandle?.ema50).toBe(regressionIndicators.ema50)
    expect(latestCandle?.ema100).toBe(regressionIndicators.ema100)
    expect(latestCandle?.ema200).toBe(regressionIndicators.ema200)
  })

  it("formats frozen backend indicator values consistently for display", () => {
    const latest = fixture.klines.at(-1)
    expect(latest).toBeDefined()
    if (!latest) throw new Error("Frozen Binance fixture has no candles")
    const close = Number(latest[4])
    const quoteVolume = Number(latest[6])

    expect(formatLevel(close)).toBe(`$${close.toFixed(2)}`)
    expect(formatVolume(quoteVolume)).toBe("904.45K")
    expect(formatMetric(regressionIndicators.rsi, "%")).toBe("45.33%")
    expect(formatMetric(regressionIndicators.macdHistogram)).toBe("0.23")
    expect(formatMetric(regressionIndicators.adx)).toBe("31.19")
    expect(formatMetric(regressionIndicators.mfi)).toBe("38.47")
  })

  it("keeps the chart window capped at 500 candles", () => {
    const history = makeApiHistory()
    const repeats = 3
    const longHistory = Object.fromEntries(
      Object.entries(history).map(([key, values]) => [key, Array.from({ length: repeats }, () => values).flat()]),
    )
    const { candleData, volumeChartData } = buildCandleAndVolumeSeries({
      history: longHistory,
    })

    expect(candleData).toHaveLength(500)
    expect(volumeChartData).toHaveLength(500)
    expect(candleData[0].open).toBe(longHistory.opens[longHistory.opens.length - 500])
    expect(volumeChartData[0].volume).toBe(longHistory.volumes[longHistory.volumes.length - 500])
  })

  it("does not invent volume when it is missing or invalid", () => {
    const oneCandle = {
      history: {
        opens: [10, 10],
        highs: [12, 12],
        lows: [9, 9],
        closes: [11, 9],
        times: [fixture.klines[0][0], fixture.klines[1][0]],
        volumes: [undefined, "invalid"],
      },
    }
    const { candleData, volumeChartData } = buildCandleAndVolumeSeries(oneCandle)

    expect(candleData).toHaveLength(2)
    expect(volumeChartData.map((item) => item.volume)).toEqual([0, 0])
    expect(volumeChartData.map((item) => item.isBull)).toEqual([true, false])
  })
})
