"""Motor de evaluación del ciclo de vida de Trading Setups contra el pool de Redis.

Evalúa los setups activos comparando el precio en vivo y los indicadores
calculados en Redis, gestionando las transiciones:
  PENDING -> ACTIVATED | INVALIDATED | CANCELLED
"""

import logging
from typing import Any, Callable, Dict, List, Optional

from common.cache import get_trading_cached
from database import setups_store
from services.setups.condition_evaluator import evaluate_conditions

logger = logging.getLogger(__name__)


def _is_price_at_entry(
    current_price: float,
    entry_price: float,
    direction: str,
    stop_loss: float,
    tolerance_pct: float = 0.003,  # 0.3% de tolerancia para tocar la zona
) -> bool:
    """Determina si el precio actual ha alcanzado la zona de entrada."""
    direction = (direction or "LONG").upper()
    tol = entry_price * tolerance_pct

    if direction == "LONG":
        # En compras, el precio llega a la zona desde arriba o cruza la entrada sin haber roto el SL
        if current_price <= (entry_price + tol) and current_price > stop_loss:
            return True
    elif direction == "SHORT":
        # En ventas, el precio llega a la zona desde abajo o cruza la entrada sin haber roto el SL
        if current_price >= (entry_price - tol) and current_price < stop_loss:
            return True

    return False


def evaluate_setup_lifecycle(
    setup: Dict[str, Any],
    market_payload: Optional[Dict[str, Any]] = None,
    fetch_fn: Optional[Callable] = None,
) -> Dict[str, Any]:
    """Evalúa un setup contra el snapshot de mercado y actualiza su estado.
    
    Devuelve un diccionario con el setup actualizado y los metadatos de evaluación.
    """
    setup_id = setup.get("id")
    current_status = setup.get("status", "PENDING").upper()
    symbol = setup.get("symbol", "").upper()
    market = setup.get("market", "crypto").lower()
    provider = setup.get("provider", "coinbase").lower()
    timeframe = setup.get("timeframe", "15m")
    direction = setup.get("direction", "LONG").upper()
    entry_price = float(setup.get("entry_price") or 0.0)
    stop_loss = float(setup.get("stop_loss") or 0.0)
    take_profit = float(setup.get("take_profit") or 0.0)
    conditions = setup.get("conditions") or []

    # 1. Obtener payload de mercado de Redis si no fue provisto
    payload = market_payload
    if payload is None:
        try:
            payload = get_trading_cached(
                symbol=symbol,
                interval_str=timeframe,
                market=market,
                provider=provider,
                fetch_fn=fetch_fn,
            )
        except Exception as exc:
            logger.warning(
                f"[SetupEngine] No se pudo leer snapshot de Redis para {provider}:{symbol} {timeframe}: {exc}"
            )
            return {
                "setup": setup,
                "error": f"No se pudo consultar el feed de mercado para {symbol}",
                "state_changed": False,
            }

    if not isinstance(payload, dict) or payload.get("precio") is None:
        return {
            "setup": setup,
            "error": f"Datos incompletos en el feed de {symbol}",
            "state_changed": False,
        }

    current_price = float(payload["precio"])

    # 2. Evaluar todas las condiciones técnicas sobre el snapshot
    cond_eval = evaluate_conditions(conditions, payload)

    new_status = current_status
    invalidation_reason = setup.get("invalidation_reason")
    alert_triggered = False

    # 3. Lógica de máquina de estados según el estado actual
    if current_status == "PENDING":
        # Verificación de Stop Loss inmediato (Invalidación por precio)
        if direction == "LONG" and current_price <= stop_loss:
            new_status = "INVALIDATED"
            invalidation_reason = (
                f"Stop Loss alcanzado en {current_price} (SL configurado: {stop_loss})"
            )
        elif direction == "SHORT" and current_price >= stop_loss:
            new_status = "INVALIDATED"
            invalidation_reason = (
                f"Stop Loss alcanzado en {current_price} (SL configurado: {stop_loss})"
            )
        else:
            # Verificar si el precio llegó a la zona de entrada
            reached_entry = _is_price_at_entry(
                current_price, entry_price, direction, stop_loss
            )

            if reached_entry:
                if cond_eval["passed"]:
                    # ACTIVADO: Precio en zona y TODAS las condiciones satisfechas
                    new_status = "ACTIVATED"
                    alert_triggered = True
                    invalidation_reason = None
                    logger.info(
                        f"[SetupEngine] 🎉 SETUP ACTIVADO: {symbol} {direction} @ {current_price}"
                    )
                else:
                    # Precio en zona pero una o más condiciones NO se cumplen
                    # Si el precio perforó la entrada en contra o falló la confirmación de vela:
                    failed_reasons_str = "; ".join(cond_eval["failed_reasons"])
                    new_status = "INVALIDATED"
                    invalidation_reason = (
                        f"Precio en entrada ({current_price}) pero fallaron condiciones: {failed_reasons_str}"
                    )
                    logger.info(
                        f"[SetupEngine] ❌ SETUP INVALIDADO: {symbol} {direction} - {invalidation_reason}"
                    )

    elif current_status == "ACTIVATED":
        # Monitoreo de cierre o invalidación post-activación
        if direction == "LONG":
            if current_price >= take_profit:
                new_status = "CLOSED"
                invalidation_reason = f"Take Profit completado en {current_price}"
            elif current_price <= stop_loss:
                new_status = "INVALIDATED"
                invalidation_reason = f"Stop Loss perforado en {current_price}"
        elif direction == "SHORT":
            if current_price <= take_profit:
                new_status = "CLOSED"
                invalidation_reason = f"Take Profit completado en {current_price}"
            elif current_price >= stop_loss:
                new_status = "INVALIDATED"
                invalidation_reason = f"Stop Loss perforado en {current_price}"

    state_changed = new_status != current_status

    evaluation_details = {
        "current_price": current_price,
        "entry_price": entry_price,
        "stop_loss": stop_loss,
        "take_profit": take_profit,
        "direction": direction,
        "conditions_passed": cond_eval["passed"],
        "conditions_passed_count": cond_eval["passed_count"],
        "conditions_total_count": cond_eval["total_count"],
        "conditions": cond_eval["details"],
        "failed_reasons": cond_eval["failed_reasons"],
        "alert_triggered": alert_triggered,
        "evaluated_at": payload.get("history", {}).get("times", [None])[-1] or None,
    }

    # 4. Actualizar base de datos con los resultados y estado
    updated_setup = setups_store.update_setup_status(
        setup_id=setup_id,
        status=new_status,
        invalidation_reason=invalidation_reason,
        evaluation_details=evaluation_details,
    )

    return {
        "setup": updated_setup or setup,
        "state_changed": state_changed,
        "alert_triggered": alert_triggered,
        "evaluation": evaluation_details,
    }


def evaluate_all_setups(
    owner_id: Any,
    status: str = "PENDING",
    fetch_fn: Optional[Callable] = None,
) -> List[Dict[str, Any]]:
    """Evalúa todos los setups activos de un usuario contra el pool de Redis."""
    active_setups = setups_store.get_setups_by_owner(owner_id, status=status)
    results = []

    for setup in active_setups:
        try:
            res = evaluate_setup_lifecycle(setup, fetch_fn=fetch_fn)
            results.append(res)
        except Exception as exc:
            logger.error(
                f"[SetupEngine] Error evaluando setup {setup.get('id')}: {exc}"
            )

    return results

