"""Herramientas MCP de gestión de Trading Setups para el agente Woody.

Permite al LLM crear, listar, modificar y eliminar setups de trading
con validación de niveles y reglas condicionales multi-indicador.
"""

import logging
from typing import Any, Dict, Tuple

from services.setups.setup_service import (
    create_trading_setup,
    get_user_setups,
    get_single_setup,
    modify_trading_setup,
    remove_trading_setup,
)

logger = logging.getLogger(__name__)


def handle_create_trading_setup(
    args: Dict[str, Any], owner_id: Any, fetch_fn=None
) -> Tuple[Dict[str, Any], Dict[str, Any]]:
    """Ejecuta la tool create_trading_setup invocada por el modelo."""
    symbol = args.get("symbol")
    direction = (args.get("direction") or "LONG").upper()
    entry_price = args.get("entry_price")
    stop_loss = args.get("stop_loss")
    take_profit = args.get("take_profit")
    market = args.get("market", "crypto")
    provider = args.get("provider", "coinbase")
    timeframe = args.get("timeframe", "15m")
    conditions = args.get("conditions") or []
    notes = args.get("notes") or "Setup formulado por Woody AI Agent"
    risk_amount = args.get("risk_amount", 0.0)
    risk_percent = args.get("risk_percent", 0.0)

    if not symbol or entry_price is None or stop_loss is None or take_profit is None:
        return (
            {
                "success": False,
                "error": "symbol, direction, entry_price, stop_loss y take_profit son obligatorios.",
            },
            {"tool": "create_trading_setup", "success": False},
        )

    try:
        setup = create_trading_setup(
            owner_id=owner_id,
            symbol=str(symbol).strip().upper(),
            direction=direction,
            entry_price=float(entry_price),
            stop_loss=float(stop_loss),
            take_profit=float(take_profit),
            market=market,
            provider=provider,
            timeframe=timeframe,
            risk_amount=float(risk_amount or 0.0),
            risk_percent=float(risk_percent or 0.0),
            conditions=conditions,
            notes=notes,
            auto_evaluate=True,
            fetch_fn=fetch_fn,
        )

        meta = {
            "tool": "create_trading_setup",
            "setup_id": setup.get("id"),
            "symbol": setup.get("symbol"),
            "direction": setup.get("direction"),
            "status": setup.get("status"),
            "success": True,
        }

        result = {
            "success": True,
            "message": f"Setup {setup.get('direction')} creado para {setup.get('symbol')} en {setup.get('entry_price')}.",
            "setup": setup,
        }
        return result, meta
    except Exception as exc:
        logger.warning(f"[ToolsSetups] Error al crear setup: {exc}")
        return (
            {"success": False, "error": str(exc)},
            {"tool": "create_trading_setup", "success": False, "error": str(exc)},
        )


def handle_list_trading_setups(
    args: Dict[str, Any], owner_id: Any
) -> Tuple[Dict[str, Any], Dict[str, Any]]:
    """Ejecuta la tool list_trading_setups invocada por el modelo."""
    status = args.get("status")
    symbol = args.get("symbol")

    try:
        setups = get_user_setups(owner_id=owner_id, status=status, symbol=symbol)
        meta = {
            "tool": "list_trading_setups",
            "found_count": len(setups),
            "status_filter": status,
        }
        return {"success": True, "count": len(setups), "setups": setups}, meta
    except Exception as exc:
        logger.warning(f"[ToolsSetups] Error listando setups: {exc}")
        return (
            {"success": False, "error": str(exc)},
            {"tool": "list_trading_setups", "success": False, "error": str(exc)},
        )


def handle_update_trading_setup(
    args: Dict[str, Any], owner_id: Any, fetch_fn=None
) -> Tuple[Dict[str, Any], Dict[str, Any]]:
    """Ejecuta la tool update_trading_setup invocada por el modelo."""
    setup_id = args.get("setup_id")
    if not setup_id:
        return (
            {"success": False, "error": "setup_id es obligatorio."},
            {"tool": "update_trading_setup", "success": False},
        )

    updates = {k: v for k, v in args.items() if k != "setup_id" and v is not None}

    try:
        updated = modify_trading_setup(
            setup_id=setup_id,
            owner_id=owner_id,
            updates=updates,
            fetch_fn=fetch_fn,
        )
        if not updated:
            return (
                {"success": False, "error": "Setup no encontrado o no pertenece al usuario."},
                {"tool": "update_trading_setup", "success": False},
            )

        meta = {
            "tool": "update_trading_setup",
            "setup_id": setup_id,
            "success": True,
        }
        return {
            "success": True,
            "message": f"Setup {setup_id} actualizado exitosamente.",
            "setup": updated,
        }, meta
    except Exception as exc:
        logger.warning(f"[ToolsSetups] Error actualizando setup {setup_id}: {exc}")
        return (
            {"success": False, "error": str(exc)},
            {"tool": "update_trading_setup", "success": False, "error": str(exc)},
        )


def handle_delete_trading_setup(
    args: Dict[str, Any], owner_id: Any
) -> Tuple[Dict[str, Any], Dict[str, Any]]:
    """Ejecuta la tool delete_trading_setup invocada por el modelo."""
    setup_id = args.get("setup_id")
    if not setup_id:
        return (
            {"success": False, "error": "setup_id es obligatorio."},
            {"tool": "delete_trading_setup", "success": False},
        )

    try:
        deleted = remove_trading_setup(setup_id=setup_id, owner_id=owner_id)
        if not deleted:
            return (
                {"success": False, "error": "Setup no encontrado."},
                {"tool": "delete_trading_setup", "success": False},
            )

        meta = {
            "tool": "delete_trading_setup",
            "setup_id": setup_id,
            "deleted": True,
        }
        return {"success": True, "message": f"Setup {setup_id} eliminado."}, meta
    except Exception as exc:
        logger.warning(f"[ToolsSetups] Error eliminando setup {setup_id}: {exc}")
        return (
            {"success": False, "error": str(exc)},
            {"tool": "delete_trading_setup", "success": False, "error": str(exc)},
        )

