"""Endpoints de autenticación.

Expone el registro de pacientes y un inicio de sesión unificado para los tres
roles del sistema (paciente, médico y administrador hospitalario). La
respuesta incluye la identidad pública del usuario —con su ruta de inicio
según rol— junto con el par de tokens, suficiente para que el cliente arme
el estado de sesión y redirija al área correspondiente sin consultas
adicionales.
"""

from fastapi import APIRouter, Depends, status

from app.api.deps import get_current_user, require_paciente
from app.models.schemas import (
    LoginUnificado,
    PacienteRegistro,
    PerfilPacienteDetalle,
    SesionUsuario,
    TokenPayload,
    UsuarioPublico,
)
from app.services import auth_service

router = APIRouter(prefix="/auth", tags=["Autenticación"])


@router.post(
    "/registro",
    response_model=SesionUsuario,
    status_code=status.HTTP_201_CREATED,
    summary="Registrar un nuevo paciente",
)
def registrar(datos: PacienteRegistro):
    """Crea una cuenta de paciente y devuelve la sesión inicial."""
    return auth_service.registrar_paciente(datos)


@router.post(
    "/login",
    response_model=SesionUsuario,
    summary="Iniciar sesión (cualquier rol)",
)
def login(credenciales: LoginUnificado):
    """Valida credenciales de cualquier rol y devuelve los tokens de sesión."""
    return auth_service.autenticar(credenciales)


@router.get(
    "/yo",
    response_model=UsuarioPublico,
    summary="Identidad del usuario autenticado",
)
def yo(user: TokenPayload = Depends(get_current_user)):
    """Devuelve la identidad pública del usuario correspondiente al token."""
    return auth_service.obtener_usuario_publico(user.sub)


@router.get(
    "/mi-perfil",
    response_model=PerfilPacienteDetalle,
    summary="Perfil completo del paciente autenticado",
)
def mi_perfil(user: TokenPayload = Depends(require_paciente)):
    """Devuelve el perfil completo del paciente (identidad + datos personales)."""
    return auth_service.obtener_perfil_paciente(user.sub)
