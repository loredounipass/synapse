"""Verify market-data source selection and liquidity source by market type."""

import os
import sys
import unittest
from pathlib import Path
from unittest.mock import patch

BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from services.data_fetchers.price_utils import (
    fetch_klines_and_volume,
    fetch_last_price,
)
from services.payload_builder.liquidity import compute_liquidity
from common.cache import get_stock_provider


def load_alpaca_credentials():
    env_path = Path(__file__).resolve().parents[1] / ".env"
    if not env_path.is_file():
        return
    for line in env_path.read_text(encoding="utf-8").splitlines():
        key, separator, value = line.partition("=")
        if separator and key.strip() in ("APCA_API_KEY_ID", "APCA_API_SECRET_KEY"):
            os.environ.setdefault(key.strip(), value.strip().strip("\"'"))


load_alpaca_credentials()


def stock_klines():
    return [
        [index * 900_000, 100, 110, 90, 100, 10, 100, 1000]
        for index in range(4)
    ]


class TestMarketDataSources(unittest.TestCase):
    def test_stock_market_uses_alpaca_and_sums_recent_share_volume(self):
        klines = stock_klines()
        with patch(
            "services.data_fetchers.price_utils.fetch_alpaca_chart",
            return_value=klines,
        ) as alpaca_chart:
            for symbol in ("AAPL", "NVDA", "MSFT"):
                with self.subTest(symbol=symbol):
                    result, volume_24h = fetch_klines_and_volume(
                        symbol, "15m", "stock", provider="alpaca"
                    )
                    self.assertIs(result, klines)
                    self.assertEqual(volume_24h, 40)

        self.assertEqual(
            alpaca_chart.call_args_list,
            [
                unittest.mock.call("AAPL", "15m"),
                unittest.mock.call("NVDA", "15m"),
                unittest.mock.call("MSFT", "15m"),
            ],
        )

    def test_stock_provider_routes_only_equities_to_alpaca(self):
        for symbol in ("AAPL", "NVDA", "MSFT", "LMT"):
            self.assertEqual(get_stock_provider(symbol), "alpaca")
        for symbol in ("^NDX", "GC=F", "EURUSD=X"):
            self.assertEqual(get_stock_provider(symbol), "yahoo")

    def test_stock_live_price_uses_alpaca_latest_trade(self):
        with (
            patch(
                "services.data_fetchers.price_utils.fetch_alpaca_latest_trade",
                return_value=101.25,
            ) as alpaca_trade,
        ):
            price = fetch_last_price("AAPL", "stock", provider="alpaca")

        self.assertEqual(price, 101.25)
        alpaca_trade.assert_called_once_with("AAPL")

    def test_yahoo_chart_maps_stock_volume_and_dollar_turnover(self):
        yahoo_response = {
            "chart": {
                "result": [
                    {
                        "timestamp": [1_800_000_000],
                        "indicators": {
                            "quote": [
                                {
                                    "open": [99.0],
                                    "high": [102.0],
                                    "low": [98.0],
                                    "close": [100.0],
                                    "volume": [250],
                                }
                            ]
                        },
                    }
                ]
            }
        }
        with patch("services.data_fetchers.yahoo.requests.get") as get:
            get.return_value.json.return_value = yahoo_response
            get.return_value.raise_for_status.return_value = None

            from services.data_fetchers.yahoo import fetch_yahoo_chart

            bars = fetch_yahoo_chart("^NDX", "15m")

        self.assertEqual(bars, [[1_800_000_000_000, 99.0, 102.0, 98.0, 100.0, 250.0, 100.0, 25_000.0]])
        request_url = get.call_args.args[0]
        self.assertIn("query1.finance.yahoo.com/v8/finance/chart/^NDX", request_url)

    def test_stock_liquidity_uses_candle_volume_profile_not_order_book(self):
        with patch(
            "services.payload_builder.liquidity.fetch_order_book_depth"
        ) as order_book:
            liquidity = compute_liquidity(
                "AAPL",
                "stock",
                100,
                [100] * 4,
                [110] * 4,
                [90] * 4,
                [100] * 4,
                [1000] * 4,
                provider="alpaca",
            )

        order_book.assert_not_called()
        # The depth map is a candle-derived profile, while directional
        # dominance comes from the separate up/down volume proxy.
        self.assertEqual(liquidity["ob_source"], "volume_proxy")
        self.assertEqual(liquidity["depth_raw"]["source"], "volume_profile")
        self.assertGreater(liquidity["depth_raw"]["levels"], 0)
        self.assertTrue(liquidity["depth_raw"]["bids"])
        self.assertTrue(liquidity["depth_raw"]["asks"])
        self.assertEqual(liquidity["bid_vol"], 0)
        self.assertEqual(liquidity["ask_vol"], 3000)
        self.assertEqual(liquidity["buyer_percent"], 0)


@unittest.skipUnless(
    os.environ.get("RUN_LIVE_MARKET_SOURCE_TESTS") == "1",
    "Set RUN_LIVE_MARKET_SOURCE_TESTS=1 and Alpaca credentials to call Alpaca.",
)
class TestLiveMarketDataSources(unittest.TestCase):
    def test_aapl_stock_candles_and_live_price_come_from_alpaca(self):
        klines, volume_24h = fetch_klines_and_volume(
            "AAPL", "15m", "stock", provider="alpaca"
        )
        live_price = fetch_last_price("AAPL", "stock", provider="alpaca")

        self.assertGreater(len(klines), 200)
        self.assertGreater(live_price, 0)
        self.assertGreater(volume_24h, 0)
        for previous, current in zip(klines, klines[1:]):
            self.assertLess(previous[0], current[0])
        self.assertAlmostEqual(klines[-1][7], klines[-1][5] * klines[-1][4])
        print(
            "Live source: Alpaca IEX | AAPL | "
            f"candles={len(klines)} | live_price={live_price} | "
            f"latest_share_volume={klines[-1][5]} | volume_24h={volume_24h}"
        )


if __name__ == "__main__":
    unittest.main()
