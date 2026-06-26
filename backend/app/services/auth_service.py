"""Servicio de autenticación unificado.

Encapsula el ciclo completo de identidad para los tres roles implementados:
registro de pacientes, inicio de sesión común (paciente, médico y
administrador hospitalario) y resolución del perfil correspondiente a partir
del token. El login es unificado: un único punto de entrada resuelve el rol
del usuario a partir de sus credenciales, y el frontend redirige según la
`ruta_inicio` devuelta.

El servicio es la única ruta legítima para crear o autenticar usuarios; las
rutas HTTP nunca tocan el repositorio directamente.
"""

from __future__ import annotations

import uuid

from fastapi import HTTPException, status

from app.core.security import (
    create_access_token,
    create_refresh_token,
    hash_password,
    verify_password,
)
from app.db.demo_repo import _PerfilPaciente, _Usuario, get_repo_demo
from app.db.supabase import is_demo_mode
from app.models.schemas import (
    LoginUnificado,
    PacienteRegistro,
    Rol,
    RUTA_INICIO_POR_ROL,
    SesionUsuario,
    TokenPair,
    UsuarioPublico,
)


# ---------------------------------------------------------------------------
# Registro de pacientes
# ---------------------------------------------------------------------------


def registrar_paciente(datos: PacienteRegistro) -> SesionUsuario:
    """Crea un paciente y devuelve su sesión inicial (usuario + tokens).

    Raises:
        HTTPException(409): Si el DNI o correo ya están registrados.
    """
    if not is_demo_mode():
        raise HTTPException(status_code=501, detail="Registro con Supabase pendiente")

    repo = get_repo_demo()
    if repo.existe_usuario(datos.dni, datos.email):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Ya existe una cuenta con ese DNI o correo electrónico",
        )

    usuario_id = f"PAC-{uuid.uuid4().hex[:10].upper()}"
    usuario = _Usuario(
        id=usuario_id,
        rol=Rol.PACIENTE.value,
        dni=datos.dni,
        nombres=datos.nombres,
        apellidos=f"{datos.apellido_paterno} {datos.apellido_materno}",
        email=datos.email,
        password_hash=hash_password(datos.password),
    )
    perfil = _PerfilPaciente(
        usuario_id=usuario_id,
        fecha_nacimiento=datos.fecha_nacimiento,
        genero=datos.genero.value,
        celular=datos.celular,
        direccion=datos.direccion,
        distrito=datos.distrito,
        tipo_seguro=datos.tipo_seguro.value,
    )
    repo.crear_paciente(usuario, perfil)
    return _construir_sesion(usuario)


# ---------------------------------------------------------------------------
# Login unificado (todos los roles)
# ---------------------------------------------------------------------------


def autenticar(credenciales: LoginUnificado) -> SesionUsuario:
    """Valida credenciales de cualquier rol y devuelve la sesión.

    Raises:
        HTTPException(401): Si las credenciales son inválidas.
    """
    if not is_demo_mode():
        raise HTTPException(status_code=501, detail="Autenticación con Supabase pendiente")

    repo = get_repo_demo()
    usuario = repo.buscar_usuario_por_identificador(credenciales.identificador)
    if not usuario or not verify_password(credenciales.password, usuario.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales inválidas. Verifique su DNI/correo y contraseña.",
        )
    return _construir_sesion(usuario)


def obtener_usuario_publico(usuario_id: str) -> UsuarioPublico:
    """Recupera la identidad pública de un usuario por su id.

    Raises:
        HTTPException(404): Si el usuario no existe.
    """
    if not is_demo_mode():
        raise HTTPException(status_code=501, detail="Integración con Supabase pendiente")

    usuario = get_repo_demo().obtener_usuario(usuario_id)
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return _a_usuario_publico(usuario)


# ---------------------------------------------------------------------------
# Auxiliares internos
# ---------------------------------------------------------------------------


def _construir_sesion(usuario: _Usuario) -> SesionUsuario:
    """Arma la respuesta de sesión: identidad pública + par de tokens."""
    publico = _a_usuario_publico(usuario)
    tokens = TokenPair(
        access_token=create_access_token(
            subject=usuario.id,
            claims={"rol": usuario.rol, "email": usuario.email},
        ),
        refresh_token=create_refresh_token(usuario.id),
    )
    return SesionUsuario(usuario=publico, tokens=tokens)


def _a_usuario_publico(usuario: _Usuario) -> UsuarioPublico:
    rol = Rol(usuario.rol)
    return UsuarioPublico(
        id=usuario.id,
        rol=rol,
        nombres=usuario.nombres,
        apellidos=usuario.apellidos,
        email=usuario.email,
        ruta_inicio=RUTA_INICIO_POR_ROL.get(usuario.rol, "/"),
    )


def obtener_perfil_paciente(usuario_id: str):
    """Devuelve el perfil completo del paciente (identidad + datos de perfil).

    Raises:
        HTTPException(404): Si el paciente o su perfil no existen.
    """
    from app.models.schemas import Genero, PerfilPacienteDetalle, TipoSeguro

    if not is_demo_mode():
        raise HTTPException(status_code=501, detail="Integración con Supabase pendiente")

    repo = get_repo_demo()
    usuario = repo.obtener_usuario(usuario_id)
    perfil = repo.obtener_perfil_paciente(usuario_id)
    if not usuario or not perfil:
        raise HTTPException(status_code=404, detail="Paciente no encontrado")
    return PerfilPacienteDetalle(
        id=usuario.id,
        dni=usuario.dni,
        nombres=usuario.nombres,
        apellidos=usuario.apellidos,
        email=usuario.email,
        celular=perfil.celular,
        direccion=perfil.direccion,
        distrito=perfil.distrito,
        tipo_seguro=TipoSeguro(perfil.tipo_seguro),
        fecha_nacimiento=perfil.fecha_nacimiento,
        genero=Genero(perfil.genero),
    )
