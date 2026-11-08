"""Persistencia en PostgreSQL para Trading Setups."""

import json
import logging
import os
from typing import Any, Dict, List, Optional
from uuid import UUID, uuid4

import psycopg
from psycopg.rows import dict_row

logger = logging.getLogger(__name__)


def _get_connection():
    return psycopg.connect(
        host=os.getenv("POSTGRES_HOST", "localhost"),
        port=int(os.getenv("POSTGRES_PORT", "5432")),
        dbname=os.getenv("POSTGRES_DB", "trading"),
        user=os.getenv("POSTGRES_USER", "trading"),
        password=os.getenv("POSTGRES_PASSWORD", ""),
        row_factory=dict_row,
    )


def normalize_uuid(value: Any) -> UUID:
    try:
        return UUID(str(value))
    except (ValueError, TypeError, AttributeError) as error:
        raise ValueError(f"A valid UUID is required, got: {value}") from error


def serialize_setup(row: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    if not row:
        return None
    data = dict(row)
    if isinstance(data.get("id"), UUID):
        data["id"] = str(data["id"])
    if isinstance(data.get("owner_id"), UUID):
        data["owner_id"] = str(data["owner_id"])
    if data.get("created_at") and hasattr(data["created_at"], "isoformat"):
        data["created_at"] = data["created_at"].isoformat()
    if data.get("updated_at") and hasattr(data["updated_at"], "isoformat"):
        data["updated_at"] = data["updated_at"].isoformat()

    # Asegurar que conditions y evaluation_details sean estructuras JSON válidas
    if isinstance(data.get("conditions"), str):
        try:
            data["conditions"] = json.loads(data["conditions"])
        except Exception:
            data["conditions"] = []
    elif not isinstance(data.get("conditions"), list):
        data["conditions"] = []

    if isinstance(data.get("evaluation_details"), str):
        try:
            data["evaluation_details"] = json.loads(data["evaluation_details"])
        except Exception:
            data["evaluation_details"] = {}
    elif not isinstance(data.get("evaluation_details"), dict):
        data["evaluation_details"] = {}

    return data


def create_setup(
    *,
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
    reward_amount: float = 0.0,
    rr_ratio: float = 0.0,
    conditions: Optional[List[Dict[str, Any]]] = None,
    notes: Optional[str] = None,
) -> Dict[str, Any]:
    owner_uuid = normalize_uuid(owner_id)
    setup_id = uuid4()
    conditions_json = json.dumps(conditions or [])
    direction_normalized = direction.upper()

    with _get_connection() as connection, connection.cursor() as cursor:
        cursor.execute(
            """
            INSERT INTO trading_setups (
                id, owner_id, symbol, market, provider, timeframe, direction,
                entry_price, stop_loss, take_profit,
                risk_amount, risk_percent, reward_amount, rr_ratio,
                conditions, status, notes
            )
            VALUES (
                %s, %s, %s, %s, %s, %s, %s,
                %s, %s, %s,
                %s, %s, %s, %s,
                %s::jsonb, 'PENDING', %s
            )
            RETURNING *
            """,
            (
                setup_id,
                owner_uuid,
                symbol.upper(),
                market.lower(),
                provider.lower(),
                timeframe,
                direction_normalized,
                float(entry_price),
                float(stop_loss),
                float(take_profit),
                float(risk_amount or 0.0),
                float(risk_percent or 0.0),
                float(reward_amount or 0.0),
                float(rr_ratio or 0.0),
                conditions_json,
                notes,
            ),
        )
        row = cursor.fetchone()
        connection.commit()
        return serialize_setup(row)


def get_setups_by_owner(
    owner_id: Any,
    status: Optional[str] = None,
    symbol: Optional[str] = None,
) -> List[Dict[str, Any]]:
    owner_uuid = normalize_uuid(owner_id)
    query = "SELECT * FROM trading_setups WHERE owner_id = %s"
    params: List[Any] = [owner_uuid]

    if status and status.upper() != "ALL":
        query += " AND status = %s"
        params.append(status.upper())

    if symbol:
        query += " AND symbol = %s"
        params.append(symbol.upper())

    query += " ORDER BY created_at DESC"

    with _get_connection() as connection, connection.cursor() as cursor:
        cursor.execute(query, tuple(params))
        rows = cursor.fetchall()
        return [serialize_setup(row) for row in rows]


def get_setup_by_id(setup_id: Any, owner_id: Optional[Any] = None) -> Optional[Dict[str, Any]]:
    setup_uuid = normalize_uuid(setup_id)
    query = "SELECT * FROM trading_setups WHERE id = %s"
    params: List[Any] = [setup_uuid]

    if owner_id:
        query += " AND owner_id = %s"
        params.append(normalize_uuid(owner_id))

    with _get_connection() as connection, connection.cursor() as cursor:
        cursor.execute(query, tuple(params))
        row = cursor.fetchone()
        return serialize_setup(row)


def update_setup(
    setup_id: Any,
    owner_id: Any,
    updates: Dict[str, Any],
) -> Optional[Dict[str, Any]]:
    setup_uuid = normalize_uuid(setup_id)
    owner_uuid = normalize_uuid(owner_id)

    allowed_fields = {
        "symbol",
        "market",
        "provider",
        "timeframe",
        "direction",
        "entry_price",
        "stop_loss",
        "take_profit",
        "risk_amount",
        "risk_percent",
        "reward_amount",
        "rr_ratio",
        "conditions",
        "status",
        "invalidation_reason",
        "evaluation_details",
        "notes",
    }

    set_clauses = []
    params: List[Any] = []

    for key, value in updates.items():
        if key not in allowed_fields:
            continue
        if key in ("conditions", "evaluation_details"):
            set_clauses.append(f"{key} = %s::jsonb")
            params.append(json.dumps(value if value is not None else ({} if key == "evaluation_details" else [])))
        else:
            set_clauses.append(f"{key} = %s")
            params.append(value)

    if not set_clauses:
        return get_setup_by_id(setup_uuid, owner_uuid)

    set_clauses.append("updated_at = NOW()")
    params.extend([setup_uuid, owner_uuid])

    query = f"""
        UPDATE trading_setups
        SET {', '.join(set_clauses)}
        WHERE id = %s AND owner_id = %s
        RETURNING *
    """

    with _get_connection() as connection, connection.cursor() as cursor:
        cursor.execute(query, tuple(params))
        row = cursor.fetchone()
        connection.commit()
        return serialize_setup(row)


def update_setup_status(
    setup_id: Any,
    status: str,
    invalidation_reason: Optional[str] = None,
    evaluation_details: Optional[Dict[str, Any]] = None,
) -> Optional[Dict[str, Any]]:
    setup_uuid = normalize_uuid(setup_id)
    status_normalized = status.upper()

    eval_json = json.dumps(evaluation_details or {})

    query = """
        UPDATE trading_setups
        SET status = %s,
            invalidation_reason = %s,
            evaluation_details = %s::jsonb,
            updated_at = NOW()
        WHERE id = %s
        RETURNING *
    """

    with _get_connection() as connection, connection.cursor() as cursor:
        cursor.execute(
            query,
            (
                status_normalized,
                invalidation_reason,
                eval_json,
                setup_uuid,
            ),
        )
        row = cursor.fetchone()
        connection.commit()
        return serialize_setup(row)


def delete_setup(setup_id: Any, owner_id: Any) -> bool:
    setup_uuid = normalize_uuid(setup_id)
    owner_uuid = normalize_uuid(owner_id)

    with _get_connection() as connection, connection.cursor() as cursor:
        cursor.execute(
            "DELETE FROM trading_setups WHERE id = %s AND owner_id = %s",
            (setup_uuid, owner_uuid),
        )
        deleted = cursor.rowcount > 0
        connection.commit()
        return deleted

