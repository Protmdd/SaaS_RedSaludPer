"""Endpoints de citas del paciente.

Operaciones que el paciente realiza sobre sus propias citas: reservar un
cupo, listar su agenda y cancelar una cita programada. Todas las rutas
requieren autenticación de paciente y operan únicamente sobre las citas
del usuario autenticado.
"""

from fastapi import APIRouter, Depends, status

from app.api.deps import require_paciente
from app.models.schemas import (
    CitaCreacion,
    CitaPublica,
    MensajeRespuesta,
    TokenPayload,
)
from app.services import citas_service

router = APIRouter(prefix="/citas", tags=["Citas del paciente"])


@router.post(
    "/",
    response_model=CitaPublica,
    status_code=status.HTTP_201_CREATED,
    summary="Reservar una cita",
)
def reservar(
    datos: CitaCreacion,
    user: TokenPayload = Depends(require_paciente),
):
    """Reserva una cita sobre un horario disponible del médico indicado."""
    return citas_service.reservar_cita(user.sub, datos)


@router.get(
    "/",
    response_model=list[CitaPublica],
    summary="Listar mis citas",
)
def listar(user: TokenPayload = Depends(require_paciente)):
    """Devuelve todas las citas del paciente autenticado, recientes primero."""
    return citas_service.listar_citas_paciente(user.sub)


@router.delete(
    "/{cita_id}",
    response_model=MensajeRespuesta,
    summary="Cancelar una cita propia",
)
def cancelar(cita_id: str, user: TokenPayload = Depends(require_paciente)):
    """Cancela una cita del paciente. La cita debe estar en estado cancelable."""
    return citas_service.cancelar_cita(user.sub, cita_id)
