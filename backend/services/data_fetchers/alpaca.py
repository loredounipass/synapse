"""Alpaca IEX stock bars and latest trades for supported US equities."""

import os
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

import requests

ALPACA_DATA_API_URL = os.getenv(
    "ALPACA_DATA_API_URL", "https://data.alpaca.markets/v2"
).rstrip("/")

_HISTORY_DAYS = {
    "1m": 7,
    "5m": 30,
    "15m": 30,
    "1h": 180,
    "4h": 365,
    "6h": 365,
    "1d": 365 * 5,
}

_ALPACA_TIMEFRAMES = {
    "1m": "1Min",
    "5m": "5Min",
    "15m": "15Min",
    "1h": "1Hour",
    "4h": "1Hour",
    "6h": "1Hour",
    "1d": "1Day",
}
_NEW_YORK = ZoneInfo("America/New_York")


def alpaca_bar_start_ms(timestamp_ms, interval_str):
    """Return candle boundaries matching Alpaca's New York equity sessions."""
    timestamp = datetime.fromtimestamp(
        timestamp_ms / 1000, tz=timezone.utc
    ).astimezone(_NEW_YORK)
    if interval_str == "1d":
        start = timestamp.replace(hour=0, minute=0, second=0, microsecond=0)
    elif interval_str in ("4h", "6h"):
        hours = 4 if interval_str == "4h" else 6
        session_open = timestamp.replace(
            hour=9, minute=30, second=0, microsecond=0
        )
        elapsed = (timestamp - session_open).total_seconds()
        bucket = int(elapsed // (hours * 3600))
        start = session_open + timedelta(hours=bucket * hours)
    else:
        interval_ms = {
            "1m": 60_000,
            "5m": 300_000,
            "15m": 900_000,
            "1h": 3_600_000,
        }.get(interval_str)
        if interval_ms is None:
            raise ValueError(f"Alpaca does not support stock interval {interval_str}.")
        return timestamp_ms // interval_ms * interval_ms
    return int(start.astimezone(timezone.utc).timestamp() * 1000)


def _headers():
    key = os.getenv("APCA_API_KEY_ID")
    secret = os.getenv("APCA_API_SECRET_KEY")
    if not key or not secret:
        raise RuntimeError(
            "Alpaca market data requires APCA_API_KEY_ID and APCA_API_SECRET_KEY."
        )
    return {
        "APCA-API-KEY-ID": key,
        "APCA-API-SECRET-KEY": secret,
        "Accept": "application/json",
    }


def _request(path, params):
    response = requests.get(
        f"{ALPACA_DATA_API_URL}/{path.lstrip('/')}",
        params=params,
        headers=_headers(),
        timeout=15,
    )
    response.raise_for_status()
    payload = response.json()
    if not isinstance(payload, dict):
        raise ValueError("Alpaca returned a malformed market-data response.")
    return payload


def _timestamp_ms(value):
    timestamp = datetime.fromisoformat(value.replace("Z", "+00:00"))
    return int(timestamp.timestamp() * 1000)


def _timeframe_and_bars(symbol, interval_str):
    timeframe = _ALPACA_TIMEFRAMES.get(interval_str)
    if timeframe is None:
        raise ValueError(f"Alpaca does not support stock interval {interval_str}.")

    now = datetime.now(timezone.utc)
    end = now
    start = end - timedelta(days=_HISTORY_DAYS[interval_str])
    start_text = start.isoformat(timespec="seconds").replace("+00:00", "Z")
    end_text = end.isoformat(timespec="seconds").replace("+00:00", "Z")
    page_token = None
    seen_tokens = set()
    klines = []

    while True:
        params = {
            "symbols": symbol,
            "timeframe": timeframe,
            "start": start_text,
            "end": end_text,
            "limit": 10_000,
            "feed": "iex",
            "adjustment": "split",
            "sort": "asc",
        }
        if page_token:
            params["page_token"] = page_token

        payload = _request("stocks/bars", params)
        bars_by_symbol = payload.get("bars")
        if not isinstance(bars_by_symbol, dict):
            raise ValueError("Alpaca response is missing its bars map.")
        bars = bars_by_symbol.get(symbol, [])
        if not isinstance(bars, list):
            raise ValueError(f"Alpaca returned malformed bars for {symbol}.")

        for bar in bars:
            try:
                close = float(bar["c"])
                volume = float(bar["v"])
                klines.append(
                    [
                        _timestamp_ms(bar["t"]),
                        float(bar["o"]),
                        float(bar["h"]),
                        float(bar["l"]),
                        close,
                        volume,
                        close,
                        volume * close,
                    ]
                )
            except (KeyError, TypeError, ValueError) as error:
                raise ValueError(f"Alpaca returned a malformed bar for {symbol}.") from error

        page_token = payload.get("next_page_token")
        if not page_token:
            break
        if page_token in seen_tokens:
            raise ValueError("Alpaca repeated a historical bars pagination token.")
        seen_tokens.add(page_token)

    if interval_str in ("4h", "6h") and klines:
        grouped = {}
        for bar in klines:
            bucket_start = alpaca_bar_start_ms(bar[0], interval_str)
            aggregate = grouped.get(bucket_start)
            if aggregate is None:
                grouped[bucket_start] = [
                    bucket_start,
                    bar[1],
                    bar[2],
                    bar[3],
                    bar[4],
                    bar[5],
                    bar[6],
                    bar[7],
                ]
                continue
            aggregate[2] = max(aggregate[2], bar[2])
            aggregate[3] = min(aggregate[3], bar[3])
            aggregate[4] = bar[4]
            aggregate[5] += bar[5]
            aggregate[6] = bar[6]
            aggregate[7] += bar[7]
        klines = list(grouped.values())

    return klines


def fetch_alpaca_chart(symbol, interval_str="15m"):
    """Fetch IEX OHLCV bars in the backend's shared kline format."""
    klines = _timeframe_and_bars(symbol, interval_str)
    if not klines:
        raise ValueError(f"Alpaca IEX returned no bars for {symbol}.")
    return klines


def fetch_alpaca_latest_trade(symbol):
    """Return Alpaca's latest IEX trade price for a stock symbol."""
    payload = _request(
        f"stocks/{symbol}/trades/latest",
        {"feed": "iex"},
    )
    trade = payload.get("trade")
    if not isinstance(trade, dict):
        raise ValueError(f"Alpaca returned no latest trade for {symbol}.")
    price = float(trade.get("p", 0))
    if price <= 0:
        raise ValueError(f"Alpaca returned an invalid latest trade for {symbol}.")
    return price
