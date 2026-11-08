"""Servicios y motor de evaluación de Trading Setups."""

from services.setups.condition_evaluator import evaluate_conditions, evaluate_single_condition
from services.setups.setup_engine import evaluate_setup_lifecycle, evaluate_all_setups
from services.setups.setup_service import (
    create_trading_setup,
    get_user_setups,
    get_single_setup,
    modify_trading_setup,
    remove_trading_setup,
    evaluate_user_setup,
    calculate_setup_metrics,
)

__all__ = [
    "evaluate_conditions",
    "evaluate_single_condition",
    "evaluate_setup_lifecycle",
    "evaluate_all_setups",
    "create_trading_setup",
    "get_user_setups",
    "get_single_setup",
    "modify_trading_setup",
    "remove_trading_setup",
    "evaluate_user_setup",
    "calculate_setup_metrics",
]

