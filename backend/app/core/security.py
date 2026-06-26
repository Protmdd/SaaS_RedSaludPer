"""Utilidades de seguridad.

Concentra el manejo de contraseñas (hash con bcrypt) y la emisión y
verificación de JSON Web Tokens. Mantener esta lógica aislada permite
auditarla en un solo lugar y sustituir el algoritmo subyacente sin tocar
el resto de la aplicación.
"""

from datetime import datetime, timedelta, timezone
from typing import Any

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import settings

_pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    """Genera un hash bcrypt de la contraseña en texto plano."""
    return _pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    """Verifica que una contraseña en texto plano corresponde al hash dado."""
    return _pwd_context.verify(plain, hashed)


def create_access_token(subject: str, claims: dict[str, Any] | None = None) -> str:
    """Emite un token de acceso firmado con el subject (id de usuario) y claims adicionales.

    Args:
        subject: Identificador único del usuario (id de paciente o usuario).
        claims: Claims adicionales como rol, email, institución.

    Returns:
        JWT codificado como cadena.
    """
    payload: dict[str, Any] = {
        "sub": subject,
        "iat": datetime.now(timezone.utc),
        "exp": datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
        "type": "access",
    }
    if claims:
        payload.update(claims)
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def create_refresh_token(subject: str) -> str:
    """Emite un token de refresco de larga duración."""
    payload = {
        "sub": subject,
        "iat": datetime.now(timezone.utc),
        "exp": datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
        "type": "refresh",
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def decode_token(token: str) -> dict[str, Any]:
    """Decodifica y valida un JWT. Lanza JWTError si el token es inválido o expiró."""
    try:
        return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
    except JWTError as err:
        raise ValueError(f"Token inválido: {err}") from err
