"""Probe Alpaca US-equity quotes and bars without querying crypto assets."""

import json
import math
import os
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError


def load_alpaca_credentials():
    env_path = Path(__file__).resolve().parents[1] / ".env"
    if not env_path.is_file():
        return
    for line in env_path.read_text(encoding="utf-8").splitlines():
        key, separator, value = line.partition("=")
        if separator and key.strip() in ("APCA_API_KEY_ID", "APCA_API_SECRET_KEY"):
            os.environ.setdefault(key.strip(), value.strip().strip("\"'"))


load_alpaca_credentials()

API_KEY = os.environ.get("APCA_API_KEY_ID")
API_SECRET = os.environ.get("APCA_API_SECRET_KEY")
EQUITY_SYMBOLS = (
    "AAPL",
    "MSFT",
    "NVDA",
    "TSLA",
    "AMZN",
    "GOOGL",
    "META",
    "NFLX",
    "AMD",
    "INTC",
    "LMT",
)
DATA_API = "https://data.alpaca.markets/v2/stocks"


def fetch_alpaca(path, params):
    headers = {"Accept": "application/json"}
    if API_KEY and API_SECRET:
        headers["APCA-API-KEY-ID"] = API_KEY
        headers["APCA-API-SECRET-KEY"] = API_SECRET

    url = f"{DATA_API}/{path}?{urlencode(params)}"
    request = Request(url, headers=headers)
    try:
        with urlopen(request, timeout=15) as response:
            return response.status, response.read().decode("utf-8")
    except HTTPError as error:
        try:
            return error.code, error.read().decode("utf-8")
        finally:
            error.close()
    except URLError as error:
        raise AssertionError(f"Could not reach Alpaca market-data API: {error.reason}") from error


class TestAlpacaMarketData(unittest.TestCase):
    def test_equity_quotes_and_latest_bars_for_all_app_stock_symbols(self):
        self.assertTrue(all(symbol.isalpha() for symbol in EQUITY_SYMBOLS))
        self.assertFalse(any(symbol.endswith("USDT") for symbol in EQUITY_SYMBOLS))
        symbols = ",".join(EQUITY_SYMBOLS)

        quote_status, quote_body = fetch_alpaca(
            "quotes/latest",
            {"symbols": symbols, "feed": "iex"},
        )
        self.assertIn(
            quote_status,
            (200, 401, 403),
            f"Unexpected Alpaca quote response: HTTP {quote_status} {quote_body[:300]}",
        )
        if not (API_KEY and API_SECRET):
            self.assertIn(quote_status, (401, 403))
            print("Alpaca requires APCA_API_KEY_ID and APCA_API_SECRET_KEY.")
            return
        self.assertEqual(
            quote_status,
            200,
            f"Alpaca rejected the configured quote request: {quote_body[:300]}",
        )
        quote_payload = json.loads(quote_body)
        quotes = quote_payload.get("quotes")
        self.assertIsInstance(quotes, dict, "Expected latest quotes map in response.")

        missing_quotes = sorted(set(EQUITY_SYMBOLS) - quotes.keys())
        self.assertFalse(missing_quotes, f"Alpaca returned no quote for: {missing_quotes}")
        for symbol in EQUITY_SYMBOLS:
            quote = quotes[symbol]
            for field in ("bp", "bs", "ap", "as", "t", "ax", "bx"):
                self.assertIn(field, quote, f"{symbol} quote missing {field}.")
            for field in ("bp", "bs", "ap", "as"):
                value = float(quote[field])
                self.assertTrue(math.isfinite(value), f"{symbol} {field} must be finite.")
                self.assertGreaterEqual(value, 0, f"{symbol} {field} must be non-negative.")

        bar_status, bar_body = fetch_alpaca(
            "bars/latest",
            {"symbols": symbols, "feed": "iex"},
        )
        self.assertIn(
            bar_status,
            (200, 401, 403),
            f"Unexpected Alpaca bars response: HTTP {bar_status} {bar_body[:300]}",
        )
        self.assertEqual(
            bar_status,
            200,
            f"Alpaca rejected the configured bars request: {bar_body[:300]}",
        )
        bar_payload = json.loads(bar_body)
        bars = bar_payload.get("bars")
        self.assertIsInstance(bars, dict, "Expected latest bars map in response.")
        missing_bars = sorted(set(EQUITY_SYMBOLS) - bars.keys())
        self.assertFalse(missing_bars, f"Alpaca returned no latest bar for: {missing_bars}")

        for symbol in EQUITY_SYMBOLS:
            bar = bars[symbol]
            for field in ("t", "o", "h", "l", "c", "v", "vw"):
                self.assertIn(field, bar, f"{symbol} bar missing {field}.")
            for field in ("o", "h", "l", "c", "v", "vw"):
                value = float(bar[field])
                self.assertTrue(math.isfinite(value), f"{symbol} bar {field} must be finite.")
            self.assertGreater(float(bar["c"]), 0, f"{symbol} close must be positive.")
            self.assertGreaterEqual(float(bar["v"]), 0, f"{symbol} volume must be non-negative.")
            self.assertGreaterEqual(float(bar["h"]), float(bar["l"]))

        summaries = []
        for symbol in EQUITY_SYMBOLS:
            quote = quotes[symbol]
            bar = bars[symbol]
            summaries.append(
                {
                    "symbol": symbol,
                    "market": "equity",
                    "feed": "iex",
                    "quote_timestamp": quote["t"],
                    "bid": quote["bp"],
                    "bid_size": quote["bs"],
                    "ask": quote["ap"],
                    "ask_size": quote["as"],
                    "bar_timestamp": bar["t"],
                    "bar_close": bar["c"],
                    "bar_volume": bar["v"],
                }
            )

        print(
            f"Alpaca returned equity quotes and latest bars for "
            f"{len(summaries)} stock symbols (feed=iex):"
        )
        print(json.dumps(summaries, indent=2))
        print(
            "This test only calls Alpaca from the backend test process. It does "
            "not publish market data to the app, socket, or crypto feeds."
        )

    def test_paginated_15_minute_history_has_indicator_warmup_for_each_stock(self):
        self.assertTrue(API_KEY and API_SECRET, "Alpaca API credentials are required.")
        now = datetime.now(timezone.utc)
        end = now - timedelta(minutes=16)
        start = end - timedelta(days=30)
        start_text = start.isoformat(timespec="seconds").replace("+00:00", "Z")
        end_text = end.isoformat(timespec="seconds").replace("+00:00", "Z")

        summaries = []
        for symbol in EQUITY_SYMBOLS:
            page_token = None
            collected = []
            seen_tokens = set()
            while True:
                params = {
                    "symbols": symbol,
                    "timeframe": "15Min",
                    "start": start_text,
                    "end": end_text,
                    "limit": 10_000,
                    "feed": "iex",
                    "adjustment": "split",
                    "sort": "asc",
                }
                if page_token:
                    params["page_token"] = page_token
                status, body = fetch_alpaca("bars", params)
                self.assertEqual(
                    status,
                    200,
                    f"{symbol} historical bars returned HTTP {status}: {body[:300]}",
                )
                payload = json.loads(body)
                bars = payload.get("bars", {}).get(symbol, [])
                collected.extend(bars)

                next_token = payload.get("next_page_token")
                if not next_token:
                    break
                self.assertNotIn(next_token, seen_tokens, f"{symbol} pagination token repeated.")
                seen_tokens.add(next_token)
                page_token = next_token

            timestamps = []
            for bar in collected:
                for field in ("t", "o", "h", "l", "c", "v", "vw"):
                    self.assertIn(field, bar, f"{symbol} historical bar missing {field}.")
                timestamp = datetime.fromisoformat(bar["t"].replace("Z", "+00:00"))
                timestamps.append(timestamp)
                for field in ("o", "h", "l", "c", "v", "vw"):
                    self.assertTrue(
                        math.isfinite(float(bar[field])),
                        f"{symbol} historical bar {field} must be finite.",
                    )
                self.assertGreater(float(bar["c"]), 0)
                self.assertGreaterEqual(float(bar["v"]), 0)
                self.assertGreaterEqual(float(bar["h"]), float(bar["l"]))

            self.assertGreaterEqual(
                len(collected),
                200,
                f"{symbol} returned fewer than 200 15-minute bars; insufficient EMA200 warm-up.",
            )
            self.assertEqual(timestamps, sorted(timestamps), f"{symbol} bars are not chronological.")
            self.assertGreaterEqual(timestamps[0], start)
            self.assertLessEqual(timestamps[-1], end)

            summaries.append(
                {
                    "symbol": symbol,
                    "feed": "iex",
                    "timeframe": "15Min",
                    "bars_30d": len(collected),
                    "first_bar": collected[0]["t"],
                    "last_bar": collected[-1]["t"],
                    "pages": len(seen_tokens) + 1,
                    "enough_for_ema200": True,
                }
            )

        print(
            "Paginated historical IEX stock bars (backend-only; no data propagation):"
        )
        print(json.dumps(summaries, indent=2))


if __name__ == "__main__":
    unittest.main()
