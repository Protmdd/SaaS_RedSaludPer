"""Configuración central de la aplicación.

Lee variables de entorno mediante Pydantic Settings, validando tipos y valores
en el arranque. Centralizar la configuración aquí permite que el resto del
código consuma `settings` sin acceder directamente a os.environ.
"""

from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Configuración tipada de la aplicación."""

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # Identidad de la aplicación
    APP_NAME: str = "RedSalud API"
    APP_VERSION: str = "1.0.0"
    ENVIRONMENT: str = Field(default="development", description="development | staging | production")

    # Seguridad
    SECRET_KEY: str = Field(default="cambiar-en-produccion-clave-secreta-larga-y-aleatoria")
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 horas
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30

    # CORS
    CORS_ORIGINS: list[str] = ["http://localhost:3000", "http://localhost:8000"]

    # Supabase (las credenciales nunca llegan al cliente)
    SUPABASE_URL: str = ""
    SUPABASE_KEY: str = ""
    SUPABASE_SERVICE_KEY: str = ""

    # Redis (cache distribuido). Si no está disponible, la app sigue funcionando.
    REDIS_URL: str = "redis://localhost:6379/0"
    REDIS_ENABLED: bool = False

    # Rate limiting
    RATE_LIMIT_PER_MINUTE: int = 60


@lru_cache
def get_settings() -> Settings:
    """Devuelve la configuración memorizada para no releer el .env en cada llamada."""
    return Settings()


settings = get_settings()
