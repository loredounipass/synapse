"""Blueprint de rutas REST para Trading Setups: /api/setups."""

import logging
from typing import Any, Callable, Optional
from flask import Blueprint, jsonify, request, g

from services.setups import (
    create_trading_setup,
    get_user_setups,
    get_single_setup,
    modify_trading_setup,
    remove_trading_setup,
    evaluate_user_setup,
    evaluate_all_setups,
)

logger = logging.getLogger(__name__)

setups_bp = Blueprint("setups", __name__, url_prefix="/api/setups")

_get_cached_fn: Optional[Callable] = None


def init_setups_routes(get_trading_cached_fn: Callable) -> None:
    """Inyecta la función de lectura de Redis para evitar dependencias circulares."""
    global _get_cached_fn
    _get_cached_fn = get_trading_cached_fn


def _get_current_user_id() -> Optional[str]:
    user = getattr(g, "current_user", None)
    if not user or not user.get("id"):
        return None
    return str(user["id"])


@setups_bp.route("", methods=["GET"])
def list_setups():
    owner_id = _get_current_user_id()
    if not owner_id:
        return jsonify({"error": "Unauthorized"}), 401

    status = request.args.get("status")
    symbol = request.args.get("symbol")

    setups = get_user_setups(owner_id=owner_id, status=status, symbol=symbol)
    active_count = sum(1 for s in setups if s.get("status") == "PENDING")
    activated_count = sum(1 for s in setups if s.get("status") == "ACTIVATED")

    return jsonify({
        "setups": setups,
        "total_count": len(setups),
        "active_count": active_count,
        "activated_count": activated_count,
    }), 200


@setups_bp.route("", methods=["POST"])
def create_setup():
    owner_id = _get_current_user_id()
    if not owner_id:
        return jsonify({"error": "Unauthorized"}), 401

    data = request.get_json(silent=True) or {}
    symbol = data.get("symbol")
    direction = data.get("direction", "LONG")
    entry_price = data.get("entry_price")
    stop_loss = data.get("stop_loss")
    take_profit = data.get("take_profit")

    if not symbol or entry_price is None or stop_loss is None or take_profit is None:
        return jsonify({
            "error": "symbol, direction, entry_price, stop_loss y take_profit son campos requeridos."
        }), 400

    try:
        entry_f = float(entry_price)
        sl_f = float(stop_loss)
        tp_f = float(take_profit)
    except (ValueError, TypeError):
        return jsonify({"error": "Los niveles de precio deben ser numéricos."}), 400

    try:
        new_setup = create_trading_setup(
            owner_id=owner_id,
            symbol=str(symbol).strip().upper(),
            direction=str(direction).strip().upper(),
            entry_price=entry_f,
            stop_loss=sl_f,
            take_profit=tp_f,
            market=data.get("market", "crypto"),
            provider=data.get("provider", "coinbase"),
            timeframe=data.get("timeframe", "15m"),
            risk_amount=float(data.get("risk_amount") or 0.0),
            risk_percent=float(data.get("risk_percent") or 0.0),
            conditions=data.get("conditions") or [],
            notes=data.get("notes"),
            auto_evaluate=True,
            fetch_fn=_get_cached_fn,
        )
        return jsonify({"setup": new_setup}), 201
    except ValueError as val_err:
        return jsonify({"error": str(val_err)}), 400
    except Exception as exc:
        logger.exception(f"[RoutesSetups] Error creando setup: {exc}")
        return jsonify({"error": "No se pudo crear el setup."}), 500


@setups_bp.route("/<setup_id>", methods=["GET"])
def get_setup(setup_id):
    owner_id = _get_current_user_id()
    if not owner_id:
        return jsonify({"error": "Unauthorized"}), 401

    setup = get_single_setup(setup_id, owner_id=owner_id)
    if not setup:
        return jsonify({"error": "Setup no encontrado."}), 404

    return jsonify({"setup": setup}), 200


@setups_bp.route("/<setup_id>", methods=["PUT"])
def update_setup(setup_id):
    owner_id = _get_current_user_id()
    if not owner_id:
        return jsonify({"error": "Unauthorized"}), 401

    data = request.get_json(silent=True) or {}
    try:
        updated = modify_trading_setup(
            setup_id=setup_id,
            owner_id=owner_id,
            updates=data,
            fetch_fn=_get_cached_fn,
        )
        if not updated:
            return jsonify({"error": "Setup no encontrado o sin cambios."}), 404
        return jsonify({"setup": updated}), 200
    except ValueError as val_err:
        return jsonify({"error": str(val_err)}), 400
    except Exception as exc:
        logger.exception(f"[RoutesSetups] Error modificando setup {setup_id}: {exc}")
        return jsonify({"error": "No se pudo modificar el setup."}), 500


@setups_bp.route("/<setup_id>", methods=["DELETE"])
def delete_setup(setup_id):
    owner_id = _get_current_user_id()
    if not owner_id:
        return jsonify({"error": "Unauthorized"}), 401

    deleted = remove_trading_setup(setup_id=setup_id, owner_id=owner_id)
    if not deleted:
        return jsonify({"error": "Setup no encontrado."}), 404

    return jsonify({"deleted": True, "id": setup_id}), 200


@setups_bp.route("/<setup_id>/evaluate", methods=["POST"])
def evaluate_single(setup_id):
    owner_id = _get_current_user_id()
    if not owner_id:
        return jsonify({"error": "Unauthorized"}), 401

    try:
        eval_result = evaluate_user_setup(
            setup_id=setup_id,
            owner_id=owner_id,
            fetch_fn=_get_cached_fn,
        )
        return jsonify(eval_result), 200
    except ValueError as val_err:
        return jsonify({"error": str(val_err)}), 404
    except Exception as exc:
        logger.exception(f"[RoutesSetups] Error evaluando setup {setup_id}: {exc}")
        return jsonify({"error": "No se pudo evaluar el setup contra el feed."}), 500


@setups_bp.route("/evaluate-all", methods=["POST"])
def evaluate_all():
    owner_id = _get_current_user_id()
    if not owner_id:
        return jsonify({"error": "Unauthorized"}), 401

    data = request.get_json(silent=True) or {}
    status_filter = data.get("status", "PENDING")

    try:
        results = evaluate_all_setups(
            owner_id=owner_id,
            status=status_filter,
            fetch_fn=_get_cached_fn,
        )
        return jsonify({
            "evaluated_count": len(results),
            "results": results,
        }), 200
    except Exception as exc:
        logger.exception(f"[RoutesSetups] Error evaluando setups: {exc}")
        return jsonify({"error": "Fallo durante la evaluación masiva."}), 500

