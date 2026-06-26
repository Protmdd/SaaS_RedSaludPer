"""Endpoints del perfil médico.

Operaciones que el médico realiza sobre su práctica: consultar su perfil,
revisar su agenda de citas, ver indicadores rápidos, marcar la atención de
una cita y administrar sus franjas de disponibilidad. Todas requieren rol de
médico y se acotan al profesional autenticado.
"""

from fastapi import APIRouter, Depends, Query, status

from app.api.deps import require_medico
from app.models.schemas import (
    CitaAgendaMedico,
    EstadoCita,
    FranjaHorario,
    FranjaHorarioCreacion,
    MedicoPublico,
    MensajeRespuesta,
    ResumenMedico,
    TokenPayload,
)
from app.services import medico_service

router = APIRouter(prefix="/medico", tags=["Médico"])


@router.get("/perfil", response_model=MedicoPublico, summary="Perfil del médico")
def perfil(user: TokenPayload = Depends(require_medico)):
    return medico_service.obtener_perfil(user.sub)


@router.get("/resumen", response_model=ResumenMedico, summary="Indicadores del médico")
def resumen(user: TokenPayload = Depends(require_medico)):
    return medico_service.resumen(user.sub)


@router.get("/agenda", response_model=list[CitaAgendaMedico], summary="Agenda de citas")
def agenda(
    solo_futuras: bool = Query(default=False, description="Solo citas de hoy en adelante"),
    user: TokenPayload = Depends(require_medico),
):
    return medico_service.listar_agenda(user.sub, solo_futuras)


@router.patch(
    "/citas/{cita_id}/estado",
    response_model=MensajeRespuesta,
    summary="Marcar atención o inasistencia",
)
def marcar_estado(
    cita_id: str,
    estado: EstadoCita,
    user: TokenPayload = Depends(require_medico),
):
    return medico_service.marcar_estado_cita(user.sub, cita_id, estado)


@router.get("/horarios", response_model=list[FranjaHorario], summary="Franjas de disponibilidad")
def listar_horarios(user: TokenPayload = Depends(require_medico)):
    return medico_service.listar_franjas(user.sub)


@router.post(
    "/horarios",
    response_model=FranjaHorario,
    status_code=status.HTTP_201_CREATED,
    summary="Agregar franja de disponibilidad",
)
def crear_horario(datos: FranjaHorarioCreacion, user: TokenPayload = Depends(require_medico)):
    return medico_service.crear_franja(user.sub, datos)


@router.delete(
    "/horarios/{franja_id}",
    response_model=MensajeRespuesta,
    summary="Eliminar franja de disponibilidad",
)
def eliminar_horario(franja_id: str, user: TokenPayload = Depends(require_medico)):
    return medico_service.eliminar_franja(user.sub, franja_id)
