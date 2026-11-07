"""Alpaca IEX trade stream that updates stock indicator payloads."""

import json
import logging
import os
import threading
import time
from datetime import datetime

import websocket

from services.data_fetchers.alpaca import alpaca_bar_start_ms

logger = logging.getLogger(__name__)

BASE_RECONNECT = 2
MAX_RECONNECT = 60
MIN_RECOMPUTE_GAP = 1.5


class AlpacaStockStream:
    def __init__(self, socketio, hooks, symbols, intervals):
        self.socketio = socketio
        self.hooks = hooks
        self.symbols = symbols
        self.intervals = intervals
        self.bars = {}
        self.bars_lock = threading.Lock()
        self.seeding = set()
        self.seeding_lock = threading.Lock()
        self.last_recompute = {}
        self.last_emitted = {}
        self.running = True

    def _seed(self, symbol, interval):
        try:
            klines, _ = self.hooks["fetch_klines_vol"](symbol, interval, "stock")
            with self.bars_lock:
                self.bars[(symbol, interval)] = klines
        except Exception as error:
            logger.warning("[AlpacaStream] seed fallo para %s %s: %s", symbol, interval, error)
        finally:
            with self.seeding_lock:
                self.seeding.discard((symbol, interval))

    def _ensure_seeded(self, symbol, interval):
        with self.bars_lock:
            bars = self.bars.get((symbol, interval))
        if bars:
            return bars

        with self.seeding_lock:
            if (symbol, interval) not in self.seeding:
                self.seeding.add((symbol, interval))
                threading.Thread(
                    target=self._seed, args=(symbol, interval), daemon=True
                ).start()
        return None

    @staticmethod
    def _trade_timestamp_ms(value):
        return int(datetime.fromisoformat(value.replace("Z", "+00:00")).timestamp() * 1000)

    def handle_trade(self, trade):
        symbol = trade.get("S")
        if symbol not in self.symbols:
            return
        try:
            price = float(trade["p"])
            size = float(trade["s"])
            timestamp_ms = self._trade_timestamp_ms(trade["t"])
        except (KeyError, TypeError, ValueError):
            logger.warning("[AlpacaStream] trade mal formado para %s", symbol)
            return
        if price <= 0 or size <= 0:
            return

        for interval in self.intervals:
            room = f"stock:alpaca:{symbol}:{interval}"
            if not self.hooks["has_subscribers"](room):
                continue
            bars = self._ensure_seeded(symbol, interval)
            if not bars:
                continue

            bar_start = alpaca_bar_start_ms(timestamp_ms, interval)
            with self.bars_lock:
                bars = self.bars.get((symbol, interval))
                if not bars:
                    continue
                last = bars[-1]
                if bar_start < int(last[0]):
                    continue
                if bar_start > int(last[0]):
                    last = [
                        bar_start, price, price, price, price, 0.0, price, 0.0
                    ]
                    bars.append(last)
                last[2] = max(float(last[2]), price)
                last[3] = min(float(last[3]), price)
                last[4] = price
                last[5] = float(last[5]) + size
                last[6] = price
                last[7] = float(last[7]) + price * size
                if len(bars) > 2500:
                    del bars[:-2500]
                snapshot = list(bars)
            self._recompute_and_emit(symbol, interval, snapshot, price)

    def _recompute_and_emit(self, symbol, interval, bars, price):
        now = time.time()
        room = f"stock:alpaca:{symbol}:{interval}"
        if now - self.last_recompute.get(room, 0) < MIN_RECOMPUTE_GAP:
            return
        self.last_recompute[room] = now

        now_ms = int(now * 1000)
        vol_24h = sum(
            float(bar[5]) for bar in bars if now_ms - int(bar[0]) <= 86_400_000
        )
        try:
            payload = self.hooks["build_payload"](
                symbol, interval, "stock", bars, vol_24h, "alpaca"
            )
            payload["precio"] = price
        except Exception as error:
            logger.warning(
                "[AlpacaStream] build_payload fallo para %s %s: %s",
                symbol,
                interval,
                error,
            )
            return

        self.hooks["store_payload"](
            f"stock:alpaca:{symbol}_{interval}", payload
        )
        signature = json.dumps(payload, sort_keys=True, default=str)
        if self.last_emitted.get(room) == signature:
            return
        self.last_emitted[room] = signature
        self.socketio.emit("trading_data_update", payload, room=room)

    def run(self):
        key = os.getenv("APCA_API_KEY_ID")
        secret = os.getenv("APCA_API_SECRET_KEY")
        if not key or not secret:
            logger.error("[AlpacaStream] faltan credenciales; stream de acciones deshabilitado")
            return

        url = os.getenv(
            "ALPACA_STOCK_STREAM_URL",
            "wss://stream.data.alpaca.markets/v2/iex",
        )
        backoff = BASE_RECONNECT
        while self.running:
            connection = None
            try:
                connection = websocket.create_connection(url, timeout=20)
                connection.send(json.dumps({
                    "action": "auth",
                    "key": key,
                    "secret": secret,
                }))
                auth_response = json.loads(connection.recv())
                messages = auth_response if isinstance(auth_response, list) else [auth_response]
                if not any(
                    message.get("T") == "success"
                    and message.get("msg") == "authenticated"
                    for message in messages
                    if isinstance(message, dict)
                ):
                    raise RuntimeError("Alpaca stock stream authentication was rejected.")
                connection.send(json.dumps({
                    "action": "subscribe",
                    "trades": self.symbols,
                }))
                logger.info(
                    "[AlpacaStream] conectado al feed IEX; simbolos suscritos=%s",
                    len(self.symbols),
                )
                backoff = BASE_RECONNECT
                connection.settimeout(30)
                while self.running:
                    raw = connection.recv()
                    messages = json.loads(raw)
                    for message in messages if isinstance(messages, list) else [messages]:
                        if isinstance(message, dict) and message.get("T") == "t":
                            self.handle_trade(message)
            except Exception as error:
                logger.warning("[AlpacaStream] desconexion/error: %s", error)
            finally:
                if connection is not None:
                    try:
                        connection.close()
                    except Exception:
                        logger.debug("[AlpacaStream] cierre de socket fallo", exc_info=True)
            if self.running:
                time.sleep(backoff)
                backoff = min(backoff * 2, MAX_RECONNECT)


def init_alpaca_stream(socketio, hooks, symbols, intervals):
    stream = AlpacaStockStream(socketio, hooks, symbols, intervals)
    thread = threading.Thread(target=stream.run, daemon=True)
    thread.start()
    return stream
