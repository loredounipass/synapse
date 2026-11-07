"""Reproducible indicator regressions against a frozen Binance candle snapshot."""

import json
import math
import os
import sys
import unittest
from pathlib import Path
from unittest.mock import patch

BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from services.indicators import (
    compute_adx_series,
    compute_fair_value_gaps,
    compute_liquidity_swings,
    compute_mfi_series,
    compute_order_blocks,
    compute_rsi_series,
    compute_stoch_series,
)
from services.payload_builder.builder import build_payload


FIXTURE_PATH = Path(__file__).parent / "fixtures" / "ethusdt_15m_binance.json"
INTERVAL_MS = 15 * 60 * 1000
EXPECTED = {
    "rsi": 45.32917021754423,
    "rsiStoch": 85.26389494023664,
    "rsiStochD": 79.3767499064102,
    "macdValue": -1.894707073241534,
    "macdSignal": -2.1294221822107695,
    "macdHistogram": 0.23471510896923542,
    "stochK": 49.358652832317574,
    "stochD": 45.555979732106415,
    "mfi": 38.47,
    "adx": 31.193480486708154,
    "plusDi": 16.000805654049934,
    "minusDi": 26.466755602731837,
    "ema50": 2240.9307857966023,
    "ema100": 2242.7710030833978,
    "ema200": 2247.043745822484,
    "bbUpper": 2247.7788869956175,
    "bbMiddle": 2238.9065,
    "bbLower": 2230.0341130043826,
}


def load_frozen_klines():
    fixture = json.loads(FIXTURE_PATH.read_text(encoding="utf-8"))
    # Keep Binance's field positions consumed by parse_klines: base volume at
    # index 5 and quote volume at index 7.
    klines = [
        [timestamp, open_, high, low, close, base_volume, 0, quote_volume]
        for timestamp, open_, high, low, close, base_volume, quote_volume
        in fixture["klines"]
    ]
    return fixture, klines


def fake_order_flow_trades(klines):
    trades = []
    for index, kline in enumerate(klines[-20:]):
        trades.append({
            "id": f"fixture-trade-{index}",
            "time": kline[0],
            "side": "buy" if index % 2 else "sell",
            "price": float(kline[4]),
            "size": 0.1 + index / 100,
        })
    return trades


def build_frozen_payload(klines):
    no_external_order_book = {
        "bid_vol": None,
        "ask_vol": None,
        "best_bid": None,
        "best_ask": None,
        "buyer_percent": None,
        "ob_source": None,
        "ob_band": None,
        "book_age": None,
        "depth_raw": None,
    }
    with (
        patch(
            "services.payload_builder.builder.compute_liquidity",
            return_value=no_external_order_book,
        ),
        patch(
            "services.payload_builder.price_action.get_order_flow_trades",
            return_value=fake_order_flow_trades(klines),
        ),
    ):
        return build_payload(
            "ETHUSDT",
            "15m",
            "crypto",
            klines,
            vol_24h=123456.0,
            provider="binance",
        )


def assert_finite_tree(test_case, value, path="payload"):
    if isinstance(value, float):
        test_case.assertTrue(math.isfinite(value), f"{path} must be finite")
    elif isinstance(value, dict):
        for key, child in value.items():
            assert_finite_tree(test_case, child, f"{path}.{key}")
    elif isinstance(value, (list, tuple)):
        for index, child in enumerate(value):
            assert_finite_tree(test_case, child, f"{path}[{index}]")


class TestFrozenIndicatorRegression(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.fixture, cls.klines = load_frozen_klines()
        cls.payload = build_frozen_payload(cls.klines)

    def test_frozen_binance_snapshot_matches_indicator_regressions(self):
        history = self.payload["history"]
        self.assertEqual(self.fixture["symbol"], "ETHUSDT")
        self.assertEqual(self.fixture["interval"], "15m")
        self.assertEqual(len(history["closes"]), 219)
        self.assertEqual(history["times"][-1], self.klines[-1][0])
        for name, expected in EXPECTED.items():
            with self.subTest(indicator=name):
                self.assertAlmostEqual(self.payload[name], expected, places=8)
                history_name = {
                    "rsiStoch": "rsiStoch",
                    "rsiStochD": "rsiStochD",
                    "macdValue": "macd",
                    "macdSignal": "macd_signal",
                    "macdHistogram": "macd_hist",
                    "bbUpper": "bb_upper",
                    "bbMiddle": "bb_middle",
                    "bbLower": "bb_lower",
                }.get(name, name)
                actual_history = [value for value in history[history_name] if value is not None]
                self.assertAlmostEqual(actual_history[-1], expected, places=8)

        self.assertAlmostEqual(
            self.payload["macdHistogram"],
            self.payload["macdValue"] - self.payload["macdSignal"],
            places=10,
        )

    def test_ohlcv_and_indicator_series_share_the_same_candle_timestamps(self):
        history = self.payload["history"]
        times = history["times"]
        self.assertEqual(len(times), len(history["opens"]))
        self.assertEqual(len(times), len(history["highs"]))
        self.assertEqual(len(times), len(history["lows"]))
        self.assertEqual(len(times), len(history["closes"]))

        for timestamp, kline in zip(times, self.klines):
            self.assertEqual(timestamp, kline[0])
        for previous, current in zip(times, times[1:]):
            self.assertEqual(current - previous, INTERVAL_MS)

        for name, series in history.items():
            if isinstance(series, list):
                with self.subTest(series=name):
                    self.assertEqual(len(series), len(times))
        assert_finite_tree(self, self.payload)

    def test_market_zone_states_and_timestamps_are_consistent(self):
        times = set(self.payload["history"]["times"])
        order_blocks = self.payload["orderBlocks"]
        gaps = self.payload["fairValueGaps"]
        swings = self.payload["liquiditySwings"]

        self.assertEqual(len(order_blocks), 12)
        self.assertEqual(len(gaps), 12)
        self.assertEqual(len(swings), 12)

        for zone in order_blocks:
            self.assertIn(zone["status"], {"active", "tested", "invalidated"})
            self.assertIn(zone["originTime"], times)
            self.assertIn(zone["confirmationTime"], times)
            self.assertGreater(zone["confirmationTime"], zone["originTime"])
            self.assertEqual(
                zone["invalidatedAt"] is not None,
                zone["status"] == "invalidated",
            )
            if zone["status"] == "tested":
                self.assertIsNotNone(zone["testedAt"])
            for key in ("testedAt", "invalidatedAt"):
                if zone[key] is not None:
                    self.assertGreater(zone[key], zone["confirmationTime"])
                    self.assertIn(zone[key], times)

        for gap in gaps:
            self.assertIn(gap["status"], {"open", "partial", "filled"})
            self.assertIn(gap["formedAt"], times)
            self.assertGreater(gap["top"], gap["bottom"])
            self.assertAlmostEqual(gap["midpoint"], (gap["top"] + gap["bottom"]) / 2)
            self.assertGreaterEqual(gap["fillPercent"], 0)
            self.assertLessEqual(gap["fillPercent"], 100)
            self.assertEqual(gap["filledAt"] is not None, gap["status"] == "filled")
            if gap["status"] == "filled":
                self.assertEqual(gap["fillPercent"], 100)
            for key in ("firstTouchAt", "filledAt"):
                if gap[key] is not None:
                    self.assertGreater(gap[key], gap["formedAt"])
                    self.assertIn(gap[key], times)

        for swing in swings:
            self.assertIn(swing["status"], {"active", "swept", "broken"})
            self.assertIn(swing["formedAt"], times)
            self.assertIn(swing["confirmedAt"], times)
            self.assertGreater(swing["confirmedAt"], swing["formedAt"])
            self.assertEqual(swing["sweptAt"] is not None, swing["status"] == "swept")
            self.assertEqual(swing["brokenAt"] is not None, swing["status"] == "broken")
            for key in ("sweptAt", "brokenAt"):
                if swing[key] is not None:
                    self.assertGreater(swing[key], swing["confirmedAt"])
                    self.assertIn(swing[key], times)

    def test_identical_candles_produce_identical_indicators_and_zones(self):
        repeated = build_frozen_payload(self.klines)
        for key in (
            "rsi",
            "macdValue",
            "macdSignal",
            "macdHistogram",
            "stochK",
            "stochD",
            "mfi",
            "adx",
            "plusDi",
            "minusDi",
            "ema50",
            "ema100",
            "ema200",
            "orderBlocks",
            "fairValueGaps",
            "liquiditySwings",
            "history",
        ):
            with self.subTest(field=key):
                self.assertEqual(self.payload[key], repeated[key])

    def test_order_flow_regression_uses_fixed_binance_trades(self):
        flow = self.payload["orderFlow"]
        self.assertEqual(flow["provider"], "binance")
        self.assertEqual(flow["source"], "binance_executed_trades")
        self.assertEqual(flow["tradeCount"], 20)
        self.assertEqual(flow["buyTradeCount"], 10)
        self.assertEqual(flow["sellTradeCount"], 10)
        self.assertAlmostEqual(flow["buyVolume"], 4474.4913, places=7)
        self.assertAlmostEqual(flow["sellVolume"], 4253.6076, places=7)
        self.assertAlmostEqual(flow["delta"], 220.8837, places=7)
        self.assertAlmostEqual(flow["buyVolume"] - flow["sellVolume"], flow["delta"], places=8)

    def test_edge_cases_for_flat_short_and_zero_volume_series(self):
        flat = [100.0] * 30
        flat_rsi = compute_rsi_series(flat, period=14)
        self.assertEqual(flat_rsi[13], None)
        self.assertEqual(flat_rsi[14], 50.0)
        self.assertEqual(flat_rsi[-1], 50.0)

        short_rsi = compute_rsi_series(flat[:14], period=14)
        self.assertEqual(short_rsi, [None] * 14)

        zero_vol_mfi = compute_mfi_series(
            flat,
            flat,
            flat,
            [0.0] * len(flat),
            period=14,
        )
        self.assertEqual(zero_vol_mfi[-1], 50.0)

        highs = [101.0] * len(flat)
        lows = [99.0] * len(flat)
        adx, plus_di, minus_di = compute_adx_series(highs, lows, flat, period=14)
        self.assertEqual(adx[-1], 0.0)
        self.assertEqual(plus_di[-1], 0.0)
        self.assertEqual(minus_di[-1], 0.0)

        stoch_k, stoch_d = compute_stoch_series(highs, lows, flat)
        self.assertEqual(stoch_k[-1], 50.0)
        self.assertEqual(stoch_d[-1], 50.0)

        zeros = [0.0] * 30
        zero_rsi = compute_rsi_series(zeros, period=14)
        zero_mfi = compute_mfi_series(zeros, zeros, zeros, zeros, period=14)
        zero_adx, zero_plus_di, zero_minus_di = compute_adx_series(
            zeros,
            zeros,
            zeros,
            period=14,
        )
        zero_stoch_k, zero_stoch_d = compute_stoch_series(zeros, zeros, zeros)
        self.assertEqual(zero_rsi[-1], 50.0)
        self.assertEqual(zero_mfi[-1], 50.0)
        self.assertEqual(zero_adx[-1], 0.0)
        self.assertEqual(zero_plus_di[-1], 0.0)
        self.assertEqual(zero_minus_di[-1], 0.0)
        self.assertEqual(zero_stoch_k[-1], 0.0)
        self.assertEqual(zero_stoch_d[-1], 0.0)

    def test_price_action_returns_empty_for_incomplete_series(self):
        self.assertEqual(compute_order_blocks([1], [1], [1], [1], []), [])
        self.assertEqual(compute_fair_value_gaps([1, 2], [1, 2], [1, 2], [1]), [])
        self.assertEqual(
            compute_liquidity_swings([1, 2, 1], [0, 1, 0], [1, 2, 1], [1, 2]),
            [],
        )


if __name__ == "__main__":
    unittest.main()
