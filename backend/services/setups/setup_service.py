"""Capa de servicio y lógica de negocio para Trading Setups.

Calcula métricas de riesgo cuantitativo (R:R, riesgo en $, riesgo en %),
valida coherencia matemática y coordina operaciones CRUD y de evaluación.
"""

import logging
from typing import Any, Callable, Dict, List, Optional, Tuple

from database import setups_store
from services.setups.setup_engine import evaluate_setup_lifecycle

logger = logging.getLogger(__name__)


def calculate_setup_metrics(
    direction: str,
    entry_price: float,
    stop_loss: float,
    take_profit: float,
    risk_amount: float = 0.0,
    risk_percent: float = 0.0,
) -> Dict[str, float]:
    """Calcula R:R y métricas de riesgo y ganancia para una operación."""
    direction = (direction or "LONG").upper()
    entry = float(entry_price)
    sl = float(stop_loss)
    tp = float(take_profit)

    if entry <= 0:
        return {
            "risk_amount": 0.0,
            "risk_percent": 0.0,
            "reward_amount": 0.0,
            "rr_ratio": 0.0,
        }

    if direction == "LONG":
        risk_per_unit = max(0.0, entry - sl)
        reward_per_unit = max(0.0, tp - entry)
        calc_risk_percent = (risk_per_unit / entry) * 100.0 if entry > 0 else 0.0
    else:  # SHORT
        risk_per_unit = max(0.0, sl - entry)
        reward_per_unit = max(0.0, entry - tp)
        calc_risk_percent = (risk_per_unit / entry) * 100.0 if entry > 0 else 0.0

    rr_ratio = (
        round(reward_per_unit / risk_per_unit, 2)
        if risk_per_unit > 0
        else 0.0
    )

    final_risk_percent = float(risk_percent) if risk_percent and risk_percent > 0 else round(calc_risk_percent, 2)
    final_risk_amount = float(risk_amount) if risk_amount and risk_amount > 0 else 0.0
    reward_amount = (
        round(final_risk_amount * rr_ratio, 2)
        if final_risk_amount > 0 and rr_ratio > 0
        else 0.0
    )

    return {
        "risk_amount": final_risk_amount,
        "risk_percent": final_risk_percent,
        "reward_amount": reward_amount,
        "rr_ratio": rr_ratio,
    }


def validate_setup_levels(
    direction: str,
    entry_price: float,
    stop_loss: float,
    take_profit: float,
) -> Tuple[bool, Optional[str]]:
    """Valida que los niveles de precio sean matemáticamente lógicos para la dirección elegida."""
    dir_upper = (direction or "LONG").upper()
    if dir_upper not in ("LONG", "SHORT"):
        return False, f"Dirección desconocida: {direction}"

    if entry_price <= 0 or stop_loss <= 0 or take_profit <= 0:
        return False, "Los precios deben ser valores numéricos positivos."

    if dir_upper == "LONG":
        if stop_loss >= entry_price:
            return False, "En una compra (LONG), el Stop Loss debe ser menor al precio de entrada."
        if take_profit <= entry_price:
            return False, "En una compra (LONG), el Take Profit debe ser mayor al precio de entrada."
    elif dir_upper == "SHORT":
        if stop_loss <= entry_price:
            return False, "En una venta (SHORT), el Stop Loss debe ser mayor al precio de entrada."
        if take_profit >= entry_price:
            return False, "En una venta (SHORT), el Take Profit debe ser menor al precio de entrada."

    return True, None


def create_trading_setup(
    owner_id: Any,
    symbol: str,
    direction: str,
    entry_price: float,
    stop_loss: float,
    take_profit: float,
    market: str = "crypto",
    provider: str = "coinbase",
    timeframe: str = "15m",
    risk_amount: float = 0.0,
    risk_percent: float = 0.0,
    conditions: Optional[List[Dict[str, Any]]] = None,
    notes: Optional[str] = None,
    auto_evaluate: bool = True,
    fetch_fn: Optional[Callable] = None,
) -> Dict[str, Any]:
    """Crea un nuevo setup, calcula métricas y ejecuta evaluación inmediata opcional."""
    valid, error_msg = validate_setup_levels(direction, entry_price, stop_loss, take_profit)
    if not valid:
        raise ValueError(error_msg)

    metrics = calculate_setup_metrics(
        direction=direction,
        entry_price=entry_price,
        stop_loss=stop_loss,
        take_profit=take_profit,
        risk_amount=risk_amount,
        risk_percent=risk_percent,
    )

    setup = setups_store.create_setup(
        owner_id=owner_id,
        symbol=symbol,
        direction=direction,
        entry_price=entry_price,
        stop_loss=stop_loss,
        take_profit=take_profit,
        market=market,
        provider=provider,
        timeframe=timeframe,
        risk_amount=metrics["risk_amount"],
        risk_percent=metrics["risk_percent"],
        reward_amount=metrics["reward_amount"],
        rr_ratio=metrics["rr_ratio"],
        conditions=conditions,
        notes=notes,
    )

    if auto_evaluate:
        try:
            eval_result = evaluate_setup_lifecycle(setup, fetch_fn=fetch_fn)
            return eval_result.get("setup") or setup
        except Exception as exc:
            logger.warning(f"[SetupService] Auto-evaluación inicial falló: {exc}")

    return setup


def get_user_setups(
    owner_id: Any,
    status: Optional[str] = None,
    symbol: Optional[str] = None,
) -> List[Dict[str, Any]]:
    return setups_store.get_setups_by_owner(owner_id, status=status, symbol=symbol)


def get_single_setup(setup_id: Any, owner_id: Optional[Any] = None) -> Optional[Dict[str, Any]]:
    return setups_store.get_setup_by_id(setup_id, owner_id=owner_id)


def modify_trading_setup(
    setup_id: Any,
    owner_id: Any,
    updates: Dict[str, Any],
    fetch_fn: Optional[Callable] = None,
) -> Optional[Dict[str, Any]]:
    """Modifica un setup existente y recalcula métricas si cambiaron los precios."""
    current = setups_store.get_setup_by_id(setup_id, owner_id)
    if not current:
        return None

    direction = updates.get("direction", current.get("direction"))
    entry_price = float(updates.get("entry_price", current.get("entry_price")))
    stop_loss = float(updates.get("stop_loss", current.get("stop_loss")))
    take_profit = float(updates.get("take_profit", current.get("take_profit")))

    valid, error_msg = validate_setup_levels(direction, entry_price, stop_loss, take_profit)
    if not valid:
        raise ValueError(error_msg)

    risk_amt = updates.get("risk_amount", current.get("risk_amount"))
    risk_pct = updates.get("risk_percent", current.get("risk_percent"))

    metrics = calculate_setup_metrics(
        direction=direction,
        entry_price=entry_price,
        stop_loss=stop_loss,
        take_profit=take_profit,
        risk_amount=risk_amt,
        risk_percent=risk_pct,
    )

    merged_updates = dict(updates)
    merged_updates.update(metrics)

    updated = setups_store.update_setup(setup_id, owner_id, merged_updates)
    if updated and updated.get("status") == "PENDING":
        try:
            eval_res = evaluate_setup_lifecycle(updated, fetch_fn=fetch_fn)
            return eval_res.get("setup") or updated
        except Exception as exc:
            logger.warning(f"[SetupService] Re-evaluación post-update falló: {exc}")

    return updated


def remove_trading_setup(setup_id: Any, owner_id: Any) -> bool:
    return setups_store.delete_setup(setup_id, owner_id)


def evaluate_user_setup(
    setup_id: Any,
    owner_id: Any,
    fetch_fn: Optional[Callable] = None,
) -> Dict[str, Any]:
    setup = setups_store.get_setup_by_id(setup_id, owner_id)
    if not setup:
        raise ValueError("Trading setup no encontrado o no pertenece al usuario.")
    return evaluate_setup_lifecycle(setup, fetch_fn=fetch_fn)

