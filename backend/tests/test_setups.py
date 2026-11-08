"""Pruebas unitarias para el motor de Trading Setups, evaluación de condiciones y herramientas MCP."""

import unittest
from unittest.mock import patch, MagicMock
from uuid import uuid4

from services.setups.condition_evaluator import (
    evaluate_conditions,
    evaluate_single_condition,
)
from services.setups.setup_service import (
    calculate_setup_metrics,
    validate_setup_levels,
)
from services.setups.setup_engine import (
    evaluate_setup_lifecycle,
    _is_price_at_entry,
)
from services.chat.tools_setups import (
    handle_create_trading_setup,
    handle_list_trading_setups,
    handle_update_trading_setup,
    handle_delete_trading_setup,
)


class TestConditionEvaluator(unittest.TestCase):
    def setUp(self):
        self.mock_payload = {
            "symbol": "BTCUSDT",
            "precio": 104200.0,
            "rsi": 32.5,
            "macdHistogram": 15.2,
            "adx": 28.0,
            "squeezeState": "ON",
            "squeezeMomentum": 4.5,
            "volCandle": 750.0,
            "volumen": 1500000.0,
            "buyerPercent": 58.5,
            "orderFlow": {
                "delta": -79077.0,
                "deltaPercent": -24.5,
                "buyVolume": 120000.0,
                "sellVolume": 199077.0,
            },
            "ema50": 103000.0,
            "ema200": 101000.0,
            "history": {
                "opens": [103800.0, 104000.0],
                "highs": [104500.0, 104600.0],
                "lows": [103700.0, 103900.0],
                "closes": [104000.0, 104200.0],
            },
        }

    def test_single_condition_numeric_passed(self):
        cond = {"indicator": "rsi", "operator": "<=", "value": 35.0}
        res = evaluate_single_condition(cond, self.mock_payload)
        self.assertTrue(res["passed"])
        self.assertEqual(res["actual_value"], 32.5)

    def test_single_condition_numeric_failed(self):
        cond = {"indicator": "rsi", "operator": "<=", "value": 30.0}
        res = evaluate_single_condition(cond, self.mock_payload)
        self.assertFalse(res["passed"])
        self.assertIn("32.5", res["reason"])

    def test_single_condition_string_squeeze(self):
        cond = {"indicator": "squeeze_state", "operator": "==", "value": "ON"}
        res = evaluate_single_condition(cond, self.mock_payload)
        self.assertTrue(res["passed"])

        cond_off = {"indicator": "squeeze_state", "operator": "==", "value": "OFF"}
        res_off = evaluate_single_condition(cond_off, self.mock_payload)
        self.assertFalse(res_off["passed"])

    def test_candle_volume_condition(self):
        cond = {"indicator": "candle_volume", "operator": ">", "value": 500.0}
        res = evaluate_single_condition(cond, self.mock_payload)
        self.assertTrue(res["passed"])
        self.assertEqual(res["actual_value"], 750.0)

    def test_order_flow_delta_condition(self):
        cond = {"indicator": "order_flow_delta", "operator": "<", "value": -20000.0}
        res = evaluate_single_condition(cond, self.mock_payload)
        self.assertTrue(res["passed"])
        self.assertEqual(res["actual_value"], -79077.0)

    def test_all_conditions_pass(self):
        conditions = [
            {"indicator": "rsi", "operator": "<=", "value": 35.0, "label": "RSI sobreventa"},
            {"indicator": "adx", "operator": ">=", "value": 25.0, "label": "Fuerza tendencial"},
            {"indicator": "squeeze_state", "operator": "==", "value": "ON", "label": "Squeeze activo"},
            {"indicator": "candle_volume", "operator": ">", "value": 500.0, "label": "Volumen > 500"},
        ]
        result = evaluate_conditions(conditions, self.mock_payload)
        self.assertTrue(result["passed"])
        self.assertEqual(result["passed_count"], 4)
        self.assertEqual(result["total_count"], 4)
        self.assertEqual(len(result["failed_reasons"]), 0)

    def test_partial_conditions_fail(self):
        conditions = [
            {"indicator": "rsi", "operator": "<=", "value": 30.0, "label": "RSI muy bajo"},  # Fails (32.5 > 30)
            {"indicator": "adx", "operator": ">=", "value": 25.0, "label": "Fuerza tendencial"},  # Passes
        ]
        result = evaluate_conditions(conditions, self.mock_payload)
        self.assertFalse(result["passed"])
        self.assertEqual(result["passed_count"], 1)
        self.assertEqual(result["total_count"], 2)
        self.assertEqual(len(result["failed_reasons"]), 1)


class TestSetupCalculations(unittest.TestCase):
    def test_long_rr_calculation(self):
        # Entry 100, SL 95, TP 115 -> Risk = 5, Reward = 15, R:R = 3.0
        metrics = calculate_setup_metrics(
            direction="LONG",
            entry_price=100.0,
            stop_loss=95.0,
            take_profit=115.0,
            risk_amount=200.0,
        )
        self.assertEqual(metrics["rr_ratio"], 3.0)
        self.assertEqual(metrics["risk_percent"], 5.0)
        self.assertEqual(metrics["reward_amount"], 600.0)

    def test_short_rr_calculation(self):
        # Entry 100, SL 105, TP 85 -> Risk = 5, Reward = 15, R:R = 3.0
        metrics = calculate_setup_metrics(
            direction="SHORT",
            entry_price=100.0,
            stop_loss=105.0,
            take_profit=85.0,
            risk_amount=150.0,
        )
        self.assertEqual(metrics["rr_ratio"], 3.0)
        self.assertEqual(metrics["risk_percent"], 5.0)
        self.assertEqual(metrics["reward_amount"], 450.0)

    def test_level_validation(self):
        # Valid LONG
        valid_long, err = validate_setup_levels("LONG", 100.0, 95.0, 110.0)
        self.assertTrue(valid_long)
        self.assertIsNone(err)

        # Invalid LONG: SL >= Entry
        invalid_long, err = validate_setup_levels("LONG", 100.0, 105.0, 110.0)
        self.assertFalse(invalid_long)
        self.assertIn("menor al precio de entrada", err)

        # Invalid SHORT: TP >= Entry
        invalid_short, err = validate_setup_levels("SHORT", 100.0, 105.0, 110.0)
        self.assertFalse(invalid_short)
        self.assertIn("menor al precio de entrada", err)


class TestSetupEngine(unittest.TestCase):
    @patch("database.setups_store.update_setup_status")
    def test_pending_to_activated_when_all_conditions_met(self, mock_update):
        mock_update.side_effect = lambda setup_id, status, invalidation_reason, evaluation_details: {
            "id": setup_id,
            "status": status,
            "invalidation_reason": invalidation_reason,
            "evaluation_details": evaluation_details,
        }

        setup = {
            "id": str(uuid4()),
            "symbol": "BTCUSDT",
            "direction": "LONG",
            "entry_price": 104250.0,
            "stop_loss": 103000.0,
            "take_profit": 107000.0,
            "status": "PENDING",
            "conditions": [
                {"indicator": "rsi", "operator": "<=", "value": 35.0},
                {"indicator": "squeeze_state", "operator": "==", "value": "ON"},
            ],
        }

        payload = {
            "precio": 104200.0,  # En zona de entrada
            "rsi": 33.0,        # <= 35 OK
            "squeezeState": "ON",  # == ON OK
        }

        res = evaluate_setup_lifecycle(setup, market_payload=payload)
        self.assertTrue(res["state_changed"])
        self.assertTrue(res["alert_triggered"])
        self.assertEqual(res["setup"]["status"], "ACTIVATED")

    @patch("database.setups_store.update_setup_status")
    def test_pending_to_invalidated_when_stop_loss_hit(self, mock_update):
        mock_update.side_effect = lambda setup_id, status, invalidation_reason, evaluation_details: {
            "id": setup_id,
            "status": status,
            "invalidation_reason": invalidation_reason,
            "evaluation_details": evaluation_details,
        }

        setup = {
            "id": str(uuid4()),
            "symbol": "BTCUSDT",
            "direction": "LONG",
            "entry_price": 104250.0,
            "stop_loss": 103000.0,
            "take_profit": 107000.0,
            "status": "PENDING",
            "conditions": [],
        }

        payload = {
            "precio": 102950.0,  # Perforó el Stop Loss (103000)
            "rsi": 25.0,
        }

        res = evaluate_setup_lifecycle(setup, market_payload=payload)
        self.assertTrue(res["state_changed"])
        self.assertEqual(res["setup"]["status"], "INVALIDATED")
        self.assertIn("Stop Loss alcanzado", res["setup"]["invalidation_reason"])

    @patch("database.setups_store.update_setup_status")
    def test_pending_to_invalidated_when_conditions_fail_at_entry(self, mock_update):
        mock_update.side_effect = lambda setup_id, status, invalidation_reason, evaluation_details: {
            "id": setup_id,
            "status": status,
            "invalidation_reason": invalidation_reason,
            "evaluation_details": evaluation_details,
        }

        setup = {
            "id": str(uuid4()),
            "symbol": "BTCUSDT",
            "direction": "LONG",
            "entry_price": 104250.0,
            "stop_loss": 103000.0,
            "take_profit": 107000.0,
            "status": "PENDING",
            "conditions": [
                {"indicator": "rsi", "operator": "<=", "value": 30.0, "label": "RSI <= 30"}
            ],
        }

        payload = {
            "precio": 103500.0,  # Perforó la entrada hacia Stop Loss (>35% de distancia a SL)
            "rsi": 45.0,        # No cumple (45 > 30)
        }

        res = evaluate_setup_lifecycle(setup, market_payload=payload)
        self.assertTrue(res["state_changed"])
        self.assertEqual(res["setup"]["status"], "INVALIDATED")
        self.assertIn("Precio quebró la entrada", res["setup"]["invalidation_reason"])

    @patch("database.setups_store.update_setup_status")
    def test_pending_remains_pending_when_conditions_not_yet_met_at_entry(self, mock_update):
        mock_update.side_effect = lambda setup_id, status, invalidation_reason, evaluation_details: {
            "id": setup_id,
            "status": status,
            "invalidation_reason": invalidation_reason,
            "evaluation_details": evaluation_details,
        }

        setup = {
            "id": str(uuid4()),
            "symbol": "BTCUSDT",
            "direction": "LONG",
            "entry_price": 104250.0,
            "stop_loss": 103000.0,
            "take_profit": 107000.0,
            "status": "PENDING",
            "conditions": [
                {"indicator": "rsi", "operator": "<=", "value": 30.0, "label": "RSI <= 30"}
            ],
        }

        payload = {
            "precio": 104200.0,  # En zona de entrada
            "rsi": 45.0,        # Aún no cumple, pero tampoco ha roto hacia SL
        }

        res = evaluate_setup_lifecycle(setup, market_payload=payload)
        self.assertFalse(res["state_changed"])
        self.assertEqual(res["setup"]["status"], "PENDING")


class TestSetupMCPTools(unittest.TestCase):
    @patch("services.setups.setup_service.setups_store.create_setup")
    def test_mcp_create_setup(self, mock_store_create):
        fake_id = str(uuid4())
        mock_store_create.return_value = {
            "id": fake_id,
            "symbol": "ETHUSDT",
            "direction": "LONG",
            "entry_price": 2750.0,
            "stop_loss": 2700.0,
            "take_profit": 2900.0,
            "status": "PENDING",
            "rr_ratio": 3.0,
            "conditions": [{"indicator": "rsi", "operator": "<=", "value": 35}],
        }

        args = {
            "symbol": "ETHUSDT",
            "direction": "LONG",
            "entry_price": 2750.0,
            "stop_loss": 2700.0,
            "take_profit": 2900.0,
            "conditions": [{"indicator": "rsi", "operator": "<=", "value": 35}],
        }

        result, meta = handle_create_trading_setup(args, owner_id=uuid4(), fetch_fn=None)
        self.assertTrue(result["success"])
        self.assertEqual(meta["tool"], "create_trading_setup")
        self.assertEqual(result["setup"]["symbol"], "ETHUSDT")

    @patch("services.setups.setup_service.setups_store.get_setups_by_owner")
    def test_mcp_list_setups(self, mock_list):
        mock_list.return_value = [
            {"id": str(uuid4()), "symbol": "BTCUSDT", "status": "PENDING"},
            {"id": str(uuid4()), "symbol": "ETHUSDT", "status": "ACTIVATED"},
        ]
        result, meta = handle_list_trading_setups({}, owner_id=uuid4())
        self.assertTrue(result["success"])
        self.assertEqual(result["count"], 2)


class TestSetupRoutes(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        patch("database.chat_store.initialize_database").start()
        patch("common.sockets.init_sockets").start()
        patch("gateways.stream_manager.init_market_streams").start()

        from app import app
        from auth.strategies import jwt_strategy

        app.config["TESTING"] = True
        cls.client = app.test_client()
        cls.user_id = uuid4()
        cls.user = {
            "id": cls.user_id,
            "email": "trader@synapse.com",
            "username": "trader",
            "is_active": True,
        }
        cls.token, _, _ = jwt_strategy.encode_access_token(str(cls.user_id))
        cls.auth_headers = {"Authorization": f"Bearer {cls.token}"}

    def test_routes_require_auth(self):
        # Without auth -> 401
        res = self.client.get("/api/setups")
        self.assertEqual(res.status_code, 401)

        res_post = self.client.post("/api/setups", json={"symbol": "BTCUSDT"})
        self.assertEqual(res_post.status_code, 401)

    @patch("auth.strategies.jwt_strategy.is_blacklisted", return_value=False)
    @patch("database.user_store.find_by_id")
    @patch("database.setups_store.get_setups_by_owner")
    def test_get_setups_authenticated(self, mock_get_setups, mock_find_user, mock_blacklisted):
        mock_find_user.return_value = self.user
        mock_get_setups.return_value = [
            {
                "id": str(uuid4()),
                "symbol": "BTCUSDT",
                "direction": "LONG",
                "entry_price": 104000.0,
                "status": "PENDING",
            }
        ]

        res = self.client.get("/api/setups", headers=self.auth_headers)
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertEqual(data["total_count"], 1)
        self.assertEqual(data["active_count"], 1)

    @patch("auth.strategies.jwt_strategy.is_blacklisted", return_value=False)
    @patch("database.user_store.find_by_id")
    @patch("database.setups_store.create_setup")
    @patch("services.setups.setup_service.evaluate_setup_lifecycle")
    def test_post_setup_success(self, mock_eval, mock_create, mock_find_user, mock_blacklisted):
        mock_find_user.return_value = self.user
        fake_setup = {
            "id": str(uuid4()),
            "symbol": "BTCUSDT",
            "direction": "LONG",
            "entry_price": 104000.0,
            "stop_loss": 102000.0,
            "take_profit": 108000.0,
            "status": "PENDING",
        }
        mock_create.return_value = fake_setup
        mock_eval.return_value = {"setup": fake_setup, "state_changed": False}

        payload = {
            "symbol": "BTCUSDT",
            "direction": "LONG",
            "entry_price": 104000.0,
            "stop_loss": 102000.0,
            "take_profit": 108000.0,
            "conditions": [{"indicator": "rsi", "operator": "<=", "value": 35}],
        }

        res = self.client.post("/api/setups", json=payload, headers=self.auth_headers)
        self.assertEqual(res.status_code, 201)
        data = res.get_json()
        self.assertEqual(data["setup"]["symbol"], "BTCUSDT")

    @patch("auth.strategies.jwt_strategy.is_blacklisted", return_value=False)
    @patch("database.user_store.find_by_id")
    def test_post_setup_invalid_levels_rejected(self, mock_find_user, mock_blacklisted):
        mock_find_user.return_value = self.user
        # LONG with Stop Loss > Entry -> must be rejected with 400
        payload = {
            "symbol": "BTCUSDT",
            "direction": "LONG",
            "entry_price": 104000.0,
            "stop_loss": 106000.0,
            "take_profit": 108000.0,
        }

        res = self.client.post("/api/setups", json=payload, headers=self.auth_headers)
        self.assertEqual(res.status_code, 400)
        self.assertIn("Stop Loss debe ser menor", res.get_json()["error"])


if __name__ == "__main__":
    unittest.main()

