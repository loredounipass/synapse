"""Motor de evaluación de reglas condicionales multi-indicador.

Evalúa reglas lógicas de manera segura (sin eval) sobre el snapshot
de mercado proveniente del pool de Redis.
"""

import logging
import operator
from typing import Any, Dict, List, Optional, Tuple

logger = logging.getLogger(__name__)

# Operadores de comparación matemáticos seguros
COMPARISON_OPERATORS = {
    ">": operator.gt,
    ">=": operator.ge,
    "<": operator.lt,
    "<=": operator.le,
    "==": operator.eq,
    "=": operator.eq,
    "!=": operator.ne,
}


def _extract_indicator_value(indicator_name: str, payload: Dict[str, Any]) -> Any:
    """Extrae el valor del indicador solicitado del payload normalizado de Redis."""
    if not isinstance(payload, dict):
        return None

    key = str(indicator_name or "").strip().lower()

    # Mapeo a las claves del payload de builder.py / Redis
    if key in ("precio", "price", "close", "candle_close"):
        return payload.get("precio")

    if key in ("open", "candle_open"):
        history = payload.get("history")
        if isinstance(history, dict) and history.get("opens"):
            return history["opens"][-1]
        return payload.get("precio")

    if key in ("high", "candle_high"):
        history = payload.get("history")
        if isinstance(history, dict) and history.get("highs"):
            return history["highs"][-1]
        return payload.get("precio")

    if key in ("low", "candle_low"):
        history = payload.get("history")
        if isinstance(history, dict) and history.get("lows"):
            return history["lows"][-1]
        return payload.get("precio")

    if key in ("volcandle", "candle_volume", "vol_candle", "volume_candle", "volumecandle"):
        return payload.get("volCandle") or payload.get("volCandleBase")

    if key in ("volumen", "volume", "volume_24h", "vol_24h"):
        return payload.get("volumen")

    if key == "rsi":
        return payload.get("rsi")

    if key in ("rsistoch", "rsi_stoch", "stoch_rsi_k", "stochrsik"):
        return payload.get("rsiStoch")

    if key in ("rsistochd", "rsi_stoch_d", "stoch_rsi_d", "stochrsid"):
        return payload.get("rsiStochD")

    if key in ("macd", "macd_hist", "macdhistogram", "macd_histogram"):
        return payload.get("macdHistogram")

    if key in ("macd_line", "macdvalue", "macd_value"):
        return payload.get("macdValue")

    if key in ("macd_signal", "macdsignal"):
        return payload.get("macdSignal")

    if key == "adx":
        return payload.get("adx")

    if key in ("plus_di", "plusdi"):
        return payload.get("plusDi")

    if key in ("minus_di", "minusdi"):
        return payload.get("minusDi")

    if key in ("squeezestate", "squeeze_state", "squeeze"):
        return payload.get("squeezeState")

    if key in ("squeezemomentum", "squeeze_momentum", "sqz_mom"):
        return payload.get("squeezeMomentum")

    if key in ("buyerpercent", "buyer_percent", "buyer_dominance"):
        return payload.get("buyerPercent")

    if key in ("stochk", "stoch_k"):
        return payload.get("stochK")

    if key in ("stochd", "stoch_d"):
        return payload.get("stochD")

    if key == "cci":
        return payload.get("cci")

    if key == "mfi":
        return payload.get("mfi")

    if key == "ema50":
        return payload.get("ema50")

    if key == "ema100":
        return payload.get("ema100")

    if key == "ema200":
        return payload.get("ema200")

    if key in ("bbupper", "bb_upper"):
        return payload.get("bbUpper")

    if key in ("bbmiddle", "bb_middle"):
        return payload.get("bbMiddle")

    if key in ("bblower", "bb_lower"):
        return payload.get("bbLower")

    # Fallback por coincidencia directa insensible a mayúsculas
    for payload_key, val in payload.items():
        if payload_key.lower() == key:
            return val

    return None


def evaluate_single_condition(
    condition: Dict[str, Any], payload: Dict[str, Any]
) -> Dict[str, Any]:
    """Evalúa una sola condición contra el snapshot del mercado."""
    indicator_key = condition.get("indicator") or condition.get("field") or ""
    op_str = condition.get("operator") or condition.get("op") or "=="
    target_value = condition.get("value")
    custom_label = condition.get("label") or condition.get("description")

    actual_value = _extract_indicator_value(indicator_key, payload)

    result_detail = {
        "id": condition.get("id"),
        "indicator": indicator_key,
        "operator": op_str,
        "target_value": target_value,
        "actual_value": actual_value,
        "passed": False,
        "label": custom_label or f"{indicator_key} {op_str} {target_value}",
        "reason": "",
    }

    if actual_value is None:
        result_detail["reason"] = f"Indicador '{indicator_key}' no disponible en el feed."
        return result_detail

    op_func = COMPARISON_OPERATORS.get(op_str)
    if not op_func:
        result_detail["reason"] = f"Operador no soportado: '{op_str}'"
        return result_detail

    try:
        # Comparación numérica o textual
        if isinstance(actual_value, (int, float)) and target_value is not None:
            num_target = float(target_value)
            passed = bool(op_func(float(actual_value), num_target))
        elif isinstance(actual_value, str):
            str_actual = actual_value.strip().upper()
            str_target = str(target_value).strip().upper() if target_value is not None else ""
            passed = bool(op_func(str_actual, str_target))
        elif isinstance(actual_value, bool):
            bool_target = bool(target_value)
            passed = bool(op_func(actual_value, bool_target))
        else:
            passed = bool(op_func(actual_value, target_value))

        result_detail["passed"] = passed
        if not passed:
            result_detail["reason"] = (
                f"Valor actual ({actual_value}) no cumple '{op_str} {target_value}'"
            )
    except Exception as exc:
        logger.warning(f"[ConditionEvaluator] Error evaluando {condition}: {exc}")
        result_detail["reason"] = f"Error de evaluación: {exc}"
        result_detail["passed"] = False

    return result_detail


def evaluate_conditions(
    conditions: Optional[List[Dict[str, Any]]], payload: Dict[str, Any]
) -> Dict[str, Any]:
    """Evalúa un conjunto de condiciones técnicas.
    
    Devuelve un dict con:
    - passed (bool): True si todas las condiciones se cumplen (o si la lista es vacía).
    - passed_count (int)
    - total_count (int)
    - details (list de evaluaciones detalladas)
    - failed_reasons (list de strings descriptivos)
    """
    conditions = conditions or []
    if not conditions:
        return {
            "passed": True,
            "passed_count": 0,
            "total_count": 0,
            "details": [],
            "failed_reasons": [],
        }

    details = []
    failed_reasons = []
    passed_count = 0

    for cond in conditions:
        if not isinstance(cond, dict):
            continue
        eval_result = evaluate_single_condition(cond, payload)
        details.append(eval_result)
        if eval_result["passed"]:
            passed_count += 1
        else:
            failed_reasons.append(
                f"{eval_result['label']}: {eval_result.get('reason', 'no cumplida')}"
            )

    all_passed = passed_count == len(details)

    return {
        "passed": all_passed,
        "passed_count": passed_count,
        "total_count": len(details),
        "details": details,
        "failed_reasons": failed_reasons,
    }

