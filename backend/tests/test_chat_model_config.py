import os
import sys
import unittest
from unittest.mock import patch

BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from services.chat.config import AVAILABLE_MODELS
from services.chat.context import resolve_request_context


class TestNemotronSuperVLConfig(unittest.TestCase):
    def test_model_uses_reasoning_and_expected_token_limit(self):
        model = AVAILABLE_MODELS["nvidia-nemotron-super-vl"]

        self.assertEqual(model["id"], "nvidia/nemotron-3.5-super-vl-120b-a12b")
        self.assertTrue(model["reasoning"])
        self.assertEqual(model["max_tokens"], 49152)
        self.assertTrue(model["stream"])

    @patch("services.chat.context.get_trading_system_prompt", return_value="system prompt")
    @patch("services.chat.context.get_api_key", return_value="test-api-key")
    def test_request_context_includes_model_specific_options(self, _get_api_key, _get_system_prompt):
        context = resolve_request_context(
            prompt="hola",
            model_key="nvidia-nemotron-super-vl",
            temperature=None,
            max_tokens=None,
            history=None,
            global_context=None,
            indicator_data=None,
            intent="analysis",
            web_search_enabled=False,
            streaming=True,
        )

        self.assertEqual(context["sampling"], {"temperature": 1.0, "top_p": 0.95})
        self.assertEqual(context["effective_max_tokens"], 49152)
        self.assertTrue(context["stream"])
        self.assertEqual(context["headers"]["Accept"], "text/event-stream")
        self.assertEqual(
            context["request_options"],
            {
                "seed": 42,
                "chat_template_kwargs": {"enable_thinking": True},
            },
        )

    @patch("services.chat.context.get_trading_system_prompt", return_value="system prompt")
    @patch("services.chat.context.get_api_key", return_value="test-api-key")
    def test_non_streaming_context_disables_stream_header(self, _get_api_key, _get_system_prompt):
        context = resolve_request_context(
            prompt="hola",
            model_key="nvidia-nemotron-super-vl",
            temperature=None,
            max_tokens=None,
            history=None,
            global_context=None,
            indicator_data=None,
            intent="analysis",
            web_search_enabled=False,
            streaming=False,
        )

        self.assertFalse(context["stream"])
        self.assertNotIn("Accept", context["headers"])


class TestMiniMaxM31FlashConfig(unittest.TestCase):
    def test_model_uses_tested_inference_parameters(self):
        model = AVAILABLE_MODELS["minimax-m3-1-flash"]

        self.assertEqual(model["id"], "minimaxai/minimax-m3.1-flash")
        self.assertTrue(model["reasoning"])
        self.assertEqual(model["temperature"], 1.0)
        self.assertEqual(model["top_p"], 0.95)
        self.assertEqual(model["max_tokens"], 262144)
        self.assertEqual(model["casual_max_tokens"], 262144)
        self.assertTrue(model["stream"])
        self.assertEqual(model["request_options"], {"seed": 0})

    @patch("services.chat.context.get_trading_system_prompt", return_value="system prompt")
    @patch("services.chat.context.get_api_key", return_value="test-api-key")
    def test_request_context_includes_seed_and_streaming(self, _get_api_key, _get_system_prompt):
        context = resolve_request_context(
            prompt="Hola",
            model_key="minimax-m3-1-flash",
            temperature=None,
            max_tokens=None,
            history=None,
            global_context=None,
            indicator_data=None,
            intent="analysis",
            web_search_enabled=False,
            streaming=True,
        )

        self.assertEqual(context["model_id"], "minimaxai/minimax-m3.1-flash")
        self.assertEqual(context["sampling"], {"temperature": 1.0, "top_p": 0.95})
        self.assertEqual(context["effective_max_tokens"], 262144)
        self.assertTrue(context["stream"])
        self.assertEqual(context["request_options"], {"seed": 0})

    @patch("services.chat.context.get_trading_system_prompt", return_value="system prompt")
    @patch("services.chat.context.get_api_key", return_value="test-api-key")
    def test_casual_request_uses_increased_token_limit(self, _get_api_key, _get_system_prompt):
        context = resolve_request_context(
            prompt="Hola",
            model_key="minimax-m3-1-flash",
            temperature=None,
            max_tokens=None,
            history=None,
            global_context=None,
            indicator_data=None,
            intent="casual",
            web_search_enabled=False,
            streaming=True,
        )

        self.assertEqual(context["effective_max_tokens"], 262144)


class TestStreamModelConfig(unittest.TestCase):
    def test_each_model_defines_streaming_preference(self):
        self.assertTrue(AVAILABLE_MODELS)
        self.assertTrue(all(isinstance(model.get("stream"), bool) for model in AVAILABLE_MODELS.values()))


if __name__ == "__main__":
    unittest.main()
