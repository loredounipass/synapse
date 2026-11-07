"""Unit tests for Alpaca historical bars mapping and pagination."""

import os
import sys
import unittest
from unittest.mock import patch

BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from services.data_fetchers.alpaca import (
    alpaca_bar_start_ms,
    fetch_alpaca_chart,
    fetch_alpaca_latest_trade,
)


def bar(timestamp, open_, high, low, close, volume):
    return {
        "t": timestamp,
        "o": open_,
        "h": high,
        "l": low,
        "c": close,
        "v": volume,
        "vw": close,
    }


class TestAlpacaAdapter(unittest.TestCase):
    @patch("services.data_fetchers.alpaca._request")
    def test_paginates_and_maps_iex_bars_to_backend_kline_format(self, request):
        request.side_effect = [
            {
                "bars": {
                    "AAPL": [
                        bar("2026-11-06T14:30:00Z", 100, 103, 99, 102, 5),
                    ]
                },
                "next_page_token": "next-page",
            },
            {
                "bars": {
                    "AAPL": [
                        bar("2026-11-06T14:45:00Z", 102, 104, 101, 103, 7),
                    ]
                },
                "next_page_token": None,
            },
        ]

        klines = fetch_alpaca_chart("AAPL", "15m")

        self.assertEqual(len(klines), 2)
        self.assertEqual(klines[0], [1793975400000, 100, 103, 99, 102, 5, 102, 510])
        self.assertEqual(klines[1], [1793976300000, 102, 104, 101, 103, 7, 103, 721])
        self.assertEqual(request.call_count, 2)
        self.assertEqual(request.call_args_list[0].args[0], "stocks/bars")
        self.assertEqual(request.call_args_list[0].args[1]["feed"], "iex")
        self.assertEqual(request.call_args_list[0].args[1]["timeframe"], "15Min")
        self.assertEqual(request.call_args_list[1].args[1]["page_token"], "next-page")

    @patch("services.data_fetchers.alpaca._request")
    def test_four_hour_interval_aggregates_hourly_bars(self, request):
        request.return_value = {
            "bars": {
                "AAPL": [
                    bar(timestamp, 100 + index, 110 + index, 90 + index, 105 + index, 10)
                    for index, timestamp in enumerate(
                        (
                            "2026-11-06T14:30:00Z",
                            "2026-11-06T15:30:00Z",
                            "2026-11-06T16:30:00Z",
                            "2026-11-06T17:30:00Z",
                        )
                    )
                ]
            },
            "next_page_token": None,
        }

        klines = fetch_alpaca_chart("AAPL", "4h")

        self.assertEqual(len(klines), 1)
        self.assertEqual(klines[0][0], 1793975400000)
        self.assertEqual(klines[0][1:6], [100, 113, 90, 108, 40])
        self.assertEqual(klines[0][7], sum((105 + index) * 10 for index in range(4)))
        self.assertEqual(request.call_args.args[1]["timeframe"], "1Hour")

    def test_equity_daily_and_intraday_buckets_match_new_york_session(self):
        daily_start = alpaca_bar_start_ms(1793979000000, "1d")
        first_four_hour_start = alpaca_bar_start_ms(1793979000000, "4h")
        second_four_hour_start = alpaca_bar_start_ms(1793997000000, "4h")

        self.assertEqual(daily_start, 1793941200000)
        self.assertEqual(first_four_hour_start, 1793975400000)
        self.assertEqual(second_four_hour_start, 1793989800000)

    @patch("services.data_fetchers.alpaca._request")
    def test_latest_trade_returns_trade_price(self, request):
        request.return_value = {"trade": {"p": 210.5, "s": 2, "t": "2026-11-06T20:59:00Z"}}
        self.assertEqual(fetch_alpaca_latest_trade("AAPL"), 210.5)
        request.assert_called_once_with(
            "stocks/AAPL/trades/latest",
            {"feed": "iex"},
        )

    def test_unsupported_interval_fails_explicitly(self):
        with self.assertRaisesRegex(ValueError, "does not support stock interval"):
            fetch_alpaca_chart("AAPL", "2m")


if __name__ == "__main__":
    unittest.main()
