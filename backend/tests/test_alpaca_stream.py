"""Unit tests for Alpaca stock trade isolation and candle updates."""

import os
import sys
import unittest
from unittest.mock import Mock

BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from gateways.alpaca_stream import AlpacaStockStream
from services.data_fetchers.alpaca import alpaca_bar_start_ms


class TestAlpacaStockStream(unittest.TestCase):
    def test_trade_updates_only_subscribed_alpaca_stock_room(self):
        room = "stock:alpaca:AAPL:1m"
        stored = []
        emitted = []
        hooks = {
            "has_subscribers": lambda candidate: candidate == room,
            "build_payload": lambda symbol, interval, market, bars, volume, provider: {
                "symbol": symbol,
                "market": market,
                "provider": provider,
                "volume_24h": volume,
            },
            "store_payload": lambda key, payload: stored.append((key, payload)),
        }
        socketio = Mock()
        socketio.emit.side_effect = lambda event, payload, room: emitted.append(
            (event, payload, room)
        )
        stream = AlpacaStockStream(socketio, hooks, ["AAPL", "MSFT"], ["1m"])
        stream.bars[("AAPL", "1m")] = [
            [1735828200000, 100.0, 100.0, 100.0, 100.0, 2.0, 100.0, 200.0]
        ]
        stream.bars[("MSFT", "1m")] = [
            [1735828200000, 200.0, 200.0, 200.0, 200.0, 3.0, 200.0, 600.0]
        ]

        stream.handle_trade({
            "S": "AAPL",
            "p": 101.5,
            "s": 4,
            "t": "2025-01-02T14:30:20Z",
        })

        updated_bar = stream.bars[("AAPL", "1m")][-1]
        self.assertEqual(updated_bar[1:8], [100.0, 101.5, 100.0, 101.5, 6.0, 101.5, 606.0])
        self.assertEqual(stream.bars[("MSFT", "1m")][0][4], 200.0)
        self.assertEqual(stored[0][0], "stock:alpaca:AAPL_1m")
        self.assertEqual(stored[0][1]["provider"], "alpaca")
        self.assertEqual(emitted[0][2], room)
        socketio.emit.assert_called_once()

    def test_daily_trade_updates_the_alpaca_session_day(self):
        room = "stock:alpaca:AAPL:1d"
        socketio = Mock()
        stream = AlpacaStockStream(
            socketio,
            {
                "has_subscribers": lambda candidate: candidate == room,
                "build_payload": lambda symbol, interval, market, bars, volume, provider: {
                    "symbol": symbol,
                    "market": market,
                    "provider": provider,
                },
                "store_payload": Mock(),
            },
            ["AAPL"],
            ["1d"],
        )
        trade_time = "2025-01-02T14:30:20Z"
        trade_timestamp_ms = 1735828220000
        session_day_start = alpaca_bar_start_ms(trade_timestamp_ms, "1d")
        stream.bars[("AAPL", "1d")] = [
            [session_day_start, 100.0, 100.0, 100.0, 100.0, 2.0, 100.0, 200.0]
        ]

        stream.handle_trade({
            "S": "AAPL",
            "p": 101.5,
            "s": 4,
            "t": trade_time,
        })

        self.assertEqual(len(stream.bars[("AAPL", "1d")]), 1)
        self.assertEqual(stream.bars[("AAPL", "1d")][0][4], 101.5)
        socketio.emit.assert_called_once()


if __name__ == "__main__":
    unittest.main()
