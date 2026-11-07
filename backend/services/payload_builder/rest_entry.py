"""Entry point REST/socket: klines + volumen + indicadores + precio en vivo."""

import logging

from services.data_fetchers import fetch_klines_and_volume, fetch_last_price
from services.payload_builder.builder import build_payload
from common.cache import get_stock_provider

logger = logging.getLogger(__name__)


def fetch_trading_data(symbol, interval_str='15m', market='crypto',
                       provider='coinbase'):
    """ENTRY POINT REST/SOCKET: KLINES + VOLUMEN + INDICADORES COMPLETOS."""
    provider = get_stock_provider(symbol) if market == 'stock' else provider
    klines, vol_24h = fetch_klines_and_volume(
        symbol, interval_str, market, provider
    )
    payload = build_payload(
        symbol, interval_str, market, klines, vol_24h, provider
    )
    # Precio principal: ticker EN VIVO del PROVEEDOR SELECCIONADO (el cierre de la
    # ultima vela REST puede llevar unos segundos de retraso por la paginacion).
    # Nunca se toma el ticker del otro exchange: mezclar precios de dos feeds en
    # un mismo payload es lo que hacia dudar al agente de sus propios numeros.
    # Stocks: ultimo trade IEX de Alpaca. Yahoo se conserva solo para los
    # símbolos no-equity explícitamente relegados al fallback.
    if klines:
        try:
            live_price = fetch_last_price(symbol, market, provider)
            if live_price and live_price > 0:
                payload['precio'] = live_price
        except Exception as e:
            logger.warning(f"[TradingData] ticker en vivo fallo para {symbol}: {e}")
    return payload
