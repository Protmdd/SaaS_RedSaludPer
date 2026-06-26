"""Cliente de Supabase.

Encapsula la creación y reutilización del cliente. Si las credenciales no
están configuradas, expone un modo demostración para permitir el desarrollo
local sin backend externo. Usa la service key para operaciones del servidor,
bypaseando RLS donde sea necesario (operaciones administrativas).
"""

from functools import lru_cache
from typing import Any

from app.core.config import settings


@lru_cache
def get_supabase() -> Any | None:
    """Devuelve el cliente de Supabase memorizado.

    Returns:
        Cliente inicializado si hay credenciales, None si la API debe operar
        en modo demostración con datos sintéticos.
    """
    if not settings.SUPABASE_URL or not settings.SUPABASE_KEY:
        return None
    # Importación diferida: la librería supabase es opcional y solo se necesita
    # cuando hay credenciales configuradas.
    try:
        from supabase import create_client
    except ImportError:
        return None
    key = settings.SUPABASE_SERVICE_KEY or settings.SUPABASE_KEY
    return create_client(settings.SUPABASE_URL, key)


def is_demo_mode() -> bool:
    """Indica si la API corre sin backend real."""
    return get_supabase() is None
