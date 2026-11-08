"""Configuración estática del agente de chat NVIDIA.

Contiene constantes de la API, catálogo de modelos, esquemas de las
herramientas expuestas al modelo (MCP de memoria + búsqueda web), la excepción
de error y el lector de la API key. Separado de agent.py (orquestador)
para mantener el módulo principal enfocado en el loop de llamadas.
"""

import logging
import os
from typing import Optional

logger = logging.getLogger(__name__)

NVIDIA_API_KEY_ENV = "NVIDIA_API_KEY"
NVIDIA_API_BASE = "https://integrate.api.nvidia.com/v1"
REQUEST_TIMEOUT = 180


# Catalogo de modelos con SUS parametros de inferencia correctos por modelo
# (verificado contra la API real de integrate.api.nvidia.com y las model cards
# de build.nvidia.com / docs.nvidia.com).
#   - temperature/top_p: Nemotron-3, Muse Glimmer y DiffusionGemma recomiendan
#     temperature=1.0 y top_p=0.95 (estan RL-trained esperando temp alta; usar
#     0.3 los degrada).
#   - top_k: Muse Glimmer recomienda top_k=64.
#   - max_tokens: techo de salida por modelo. Verificado contra la API real:
#     Nano/Bolt/Muse tienen tope de max_tokens de 1.048.576; Ultra no lo valida
#     (>=1M); DiffusionGemma tiene ventana total de 250.000. El peor caso de
#     entrada (system prompt con TODOS los indicadores + MTF de 6 marcos + price
#     action + series + web_search) son ~6.8k tokens y cabe holgadamente en la
#     ventana, asi que analizar todo NUNCA se limita por entrada. El techo de
#     SALIDA si importa: en los razonadores el `thinking` comparte presupuesto
#     con el informe, por eso van a 49152 (~5% del tope); los no-razonadores
#     emiten solo contenido y van a 32768 (4-5x el informe mas largo posible).
#     Muse SI EMITE reasoning_content (verificado contra la API) -> es
#     razonador, NO moverlo a no-razonador. finish_reason='length' se recupera
#     ademas con auto-continuacion en nvidia_chat_stream.
#   - timeout: los grandes (Ultra 550B, Muse) son mas lentos -> timeout mayor.
AVAILABLE_MODELS = {
    "nvidia-nemotron": {
        "id": "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning",
        "name": "Nemotron 3 Nano Omni",
        "provider": "NVIDIA",
        "free": True,
        "reasoning": True,
        "temperature": 1.0,
        "top_p": 0.95,
        "max_tokens": 49152,
        "timeout": 180,
    },
    "nvidia-nemotron-bolt": {
        "id": "nvidia/nemotron-3.5-bolt-e4b",
        "name": "Nemotron 3.5 Bolt E4B",
        "provider": "NVIDIA",
        "free": True,
        "reasoning": False,
        "temperature": 1.0,
        "top_p": 0.95,
        "max_tokens": 32768,
        "timeout": 180,
    },
    "nvidia-nemotron-ultra": {
        "id": "nvidia/nemotron-3-ultra-550b-a55b",
        "name": "Nemotron 3 Ultra 550B",
        "provider": "NVIDIA",
        "free": True,
        "reasoning": True,
        "temperature": 1.0,
        "top_p": 0.95,
        "max_tokens": 49152,
        "timeout": 240,
    },
    "meta-muse": {
        "id": "meta/muse-glimmer-30b",
        "name": "Muse Glimmer 30B",
        "provider": "Meta",
        "free": True,
        "reasoning": True,
        "temperature": 1.0,
        "top_p": 0.95,
        "top_k": 64,
        "max_tokens": 49152,
        "timeout": 240,
    },
    "google-diffusiongemma": {
        "id": "google/diffusiongemma-26b-a4b-it",
        "name": "DiffusionGemma 26B",
        "provider": "Google",
        "free": True,
        "reasoning": False,
        "temperature": 1.0,
        "top_p": 0.95,
        "max_tokens": 32768,
        "timeout": 180,
    },
}


# ---------------------------------------------------------------------------
# MCP-style Tool Definitions
# ---------------------------------------------------------------------------
CHAT_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "get_selected_market_data",
            "description": "Consulta el snapshot de mercado del proveedor seleccionado por el usuario para el activo y timeframe de esta solicitud. Debes usarlo antes de responder cualquier análisis de mercado. El resultado procede del feed de mercado elegido por el backend; no acepta un proveedor alternativo.",
            "parameters": {
                "type": "object",
                "properties": {},
                "additionalProperties": False,
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "search_chat_history",
            "description": "Busca en TODOS los mensajes de TODAS las sesiones guardadas del usuario, sin límite de sesiones, mensajes ni resultados. Úsala para encontrar mensajes exactos, detalles, niveles, recomendaciones o conversaciones pasadas. Puedes filtrar por ID de sesión o por parte de su nombre; también puedes filtrar por símbolo. Devuelve cada mensaje encontrado con su sesión, ID, autor, fecha y contenido completo. NO la uses para noticias o información externa: para eso existe web_search.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "Término, activo o concepto clave a buscar en el historial (ej: 'soporte ETH', 'estrategia', 'invalidation', 'BTC')"
                    },
                    "symbol": {
                        "type": "string",
                        "description": "Símbolo del activo si la búsqueda es específica de una moneda o acción (ej: 'ETHUSDT', 'SOLUSDT', 'AAPL')"
                    },
                    "session_id": {
                        "type": "string",
                        "description": "ID UUID de una sesión específica para limitar la búsqueda a esa sesión"
                    },
                    "session_name": {
                        "type": "string",
                        "description": "Nombre o fragmento del nombre de una sesión específica"
                    }
                },
                "required": ["query"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "rename_chat_session",
            "description": "Asigna un nombre breve, específico y descriptivo a la sesión ACTUAL usando el tema real de la conversación. Llama a esta herramienta cuando el usuario ya haya expresado el tema o después de la primera respuesta sustantiva; no la llames por un saludo o antes de tener contexto. El título debe identificar el tema y activo si aplica, no usar el nombre genérico '[símbolo] Analysis'.",
            "parameters": {
                "type": "object",
                "properties": {
                    "title": {
                        "type": "string",
                        "description": "Título conciso basado en el contenido real de esta conversación, en el idioma del usuario"
                    }
                },
                "required": ["title"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "create_trading_setup",
            "description": "Crea un setup de trading formal en el sistema de alertas. Debe llamarse cuando formules o recomiendes un setup con entrada, stop loss y take profit, o cuando el usuario solicite registrar una alerta de setup. Permite configurar condiciones multi-indicador para validar la entrada.",
            "parameters": {
                "type": "object",
                "properties": {
                    "symbol": {
                        "type": "string",
                        "description": "Símbolo del activo (ej: 'BTCUSDT', 'ETHUSDT', 'AAPL')"
                    },
                    "direction": {
                        "type": "string",
                        "enum": ["LONG", "SHORT"],
                        "description": "Dirección de la operación: LONG (compra) o SHORT (venta)"
                    },
                    "entry_price": {
                        "type": "number",
                        "description": "Precio numérico de entrada / activación"
                    },
                    "stop_loss": {
                        "type": "number",
                        "description": "Precio de stop loss o invalidación de la estructura"
                    },
                    "take_profit": {
                        "type": "number",
                        "description": "Precio objetivo de toma de ganancia (Target)"
                    },
                    "market": {
                        "type": "string",
                        "enum": ["crypto", "stock"],
                        "description": "Tipo de mercado: 'crypto' o 'stock'"
                    },
                    "provider": {
                        "type": "string",
                        "enum": ["binance", "coinbase", "alpaca", "yahoo"],
                        "description": "Proveedor de datos de mercado"
                    },
                    "timeframe": {
                        "type": "string",
                        "description": "Temporalidad para la evaluación (ej: '15m', '1h', '4h')"
                    },
                    "risk_amount": {
                        "type": "number",
                        "description": "Riesgo en dólares asignado al setup (opcional)"
                    },
                    "risk_percent": {
                        "type": "number",
                        "description": "Porcentaje de riesgo de la cuenta (ej: 1.0 para 1%)"
                    },
                    "conditions": {
                        "type": "array",
                        "description": "Lista de condiciones multi-indicador para activar el setup. Ej: [{'indicator': 'rsi', 'operator': '<=', 'value': 35, 'label': 'RSI <= 35'}, {'indicator': 'volCandle', 'operator': '>', 'value': 500, 'label': 'Volumen > 500'}]",
                        "items": {
                            "type": "object",
                            "properties": {
                                "indicator": {
                                    "type": "string",
                                    "description": "Indicador técnico a evaluar: 'rsi', 'macd_hist', 'adx', 'squeeze_state', 'volCandle', 'buyer_percent', 'candle_close', 'ema50', 'ema200', etc."
                                },
                                "operator": {
                                    "type": "string",
                                    "enum": [">", ">=", "<", "<=", "==", "!="],
                                    "description": "Operador relacional matemático"
                                },
                                "value": {
                                    "description": "Valor numérico o cadena de umbral esperado (ej: 35.0, 'ON', 500)"
                                },
                                "label": {
                                    "type": "string",
                                    "description": "Descripción humana de la regla de confirmación"
                                }
                            },
                            "required": ["indicator", "operator", "value"]
                        }
                    },
                    "notes": {
                        "type": "string",
                        "description": "Tesis o justificación técnica detallada del setup"
                    }
                },
                "required": ["symbol", "direction", "entry_price", "stop_loss", "take_profit"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "list_trading_setups",
            "description": "Lista los setups de trading registrados por el usuario. Permite consultar setups activos o historial para dar seguimiento.",
            "parameters": {
                "type": "object",
                "properties": {
                    "status": {
                        "type": "string",
                        "enum": ["PENDING", "ACTIVATED", "INVALIDATED", "ALL"],
                        "description": "Filtrar por estado del setup"
                    },
                    "symbol": {
                        "type": "string",
                        "description": "Filtrar por símbolo de activo"
                    }
                }
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "update_trading_setup",
            "description": "Modifica los niveles o condiciones de un setup existente.",
            "parameters": {
                "type": "object",
                "properties": {
                    "setup_id": {
                        "type": "string",
                        "description": "UUID del setup a modificar"
                    },
                    "entry_price": {"type": "number"},
                    "stop_loss": {"type": "number"},
                    "take_profit": {"type": "number"},
                    "conditions": {"type": "array"},
                    "notes": {"type": "string"}
                },
                "required": ["setup_id"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "delete_trading_setup",
            "description": "Elimina o cancela un setup de trading del usuario.",
            "parameters": {
                "type": "object",
                "properties": {
                    "setup_id": {
                        "type": "string",
                        "description": "UUID del setup a eliminar"
                    }
                },
                "required": ["setup_id"]
            }
        }
    }
]


# Herramienta de busqueda web (solo se expone al modelo cuando el usuario la
# activa desde la barra de Acciones Rapidas). Backed by services.chat.web_search.
WEB_SEARCH_TOOL = {
    "type": "function",
    "function": {
        "name": "web_search",
        "description": "Busca informacion actualizada en internet: noticias, eventos macro, anuncios, listados, regulacion, y TAMBIEN redes sociales (X/Twitter y Reddit) para announcements oficiales, metricas de comunidad, sentimiento, hype y memes del mercado. Usala cuando la respuesta dependa de datos externos que NO estan en los indicadores del terminal ni en el historial. NO la uses para el precio en vivo ni para senales tecnicas: eso viene exclusivamente del terminal.",
        "parameters": {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "Consulta concreta con el tema EXACTO que pidio el usuario: cualquier coin, token, ticker, proyecto, protocolo, exchange o topico que nombre (SOL, XRP, DOGE, ARB, LINK, un alt especifico, una empresa, una regulacion, etc.). NO la limites a Bitcoin/Ethereum ni sustituyas un major cuando el usuario pidio otra cosa; reutiliza sus propias palabras. Ej: 'Pepe token listing Binance', 'Solana ETF approval news', 'ultimo anuncio Fed tasas', 'Cardano scaling upgrade'"
                },
                "source": {
                    "type": "string",
                    "enum": ["all", "news", "reddit", "x"],
                    "description": "Donde buscar: 'news' = prensa/medios; 'reddit' = los subreddits relevantes al tema activo (el de la coin/proyecto preguntado, r/CryptoCurrency, mercados, etc.) para sentimiento/metricas/memes; 'x' = posts de X/Twitter (anuncios, hype); 'all' (o omitir) = web general sin restringir. Para announcements o reaccion de la comunidad usa 'reddit' o 'x'."
                },
                "time_range": {
                    "type": "string",
                    "enum": ["day", "week", "month", "year"],
                    "description": "Ventana de frescura. Usa 'day' o 'week' para noticias de mercado recientes."
                },
                "max_results": {
                    "type": "integer",
                    "description": "Numero maximo de resultados (por defecto 6, maximo 10)."
                }
            },
            "required": ["query"]
        }
    }
}


class NvidiaChatError(Exception):
    """Custom exception to carry specific error info from NVIDIA API."""
    def __init__(self, message, code=None):
        super().__init__(message)
        self.code = code


def get_api_key() -> Optional[str]:
    key = os.environ.get(NVIDIA_API_KEY_ENV)
    if not key:
        logger.warning("NVIDIA_API_KEY not set in environment")
    return key
