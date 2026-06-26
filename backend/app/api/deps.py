"""Dependencias compartidas de los endpoints.

Centraliza la extracción del usuario autenticado a partir del JWT presente
en el header Authorization y provee guardas de autorización por rol. Las
rutas que requieran autenticación declaran la dependencia adecuada y reciben
directamente el TokenPayload validado, sin tocar el header por su cuenta.
"""

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.security import decode_token
from app.models.schemas import Rol, TokenPayload

bearer_scheme = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> TokenPayload:
    """Valida el token Bearer y devuelve los claims del usuario autenticado."""
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token de autenticación requerido",
            headers={"WWW-Authenticate": "Bearer"},
        )
    try:
        payload = decode_token(credentials.credentials)
    except ValueError as err:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(err),
            headers={"WWW-Authenticate": "Bearer"},
        ) from err

    if payload.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Tipo de token inválido",
        )

    return TokenPayload(
        sub=payload["sub"],
        rol=Rol(payload.get("rol", "paciente")),
        email=payload.get("email"),
    )


def _exigir_rol(rol_requerido: Rol):
    """Construye una dependencia que restringe el acceso a un rol específico."""

    def guard(user: TokenPayload = Depends(get_current_user)) -> TokenPayload:
        if user.rol != rol_requerido:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Esta operación requiere rol de {rol_requerido.value}",
            )
        return user

    return guard


# Guardas por rol implementado
require_paciente = _exigir_rol(Rol.PACIENTE)
require_medico = _exigir_rol(Rol.MEDICO)
require_admin_hospital = _exigir_rol(Rol.ADMIN_HOSPITAL)
