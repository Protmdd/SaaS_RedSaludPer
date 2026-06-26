"""Endpoints del perfil administrador hospitalario.

Operaciones de gobierno del establecimiento: perfil del administrador,
gestión de médicos adscritos (alta y activación), supervisión de citas y
consulta de los indicadores agregados (KPIs). Todas requieren rol de
administrador hospitalario y se acotan a su establecimiento.
"""

from fastapi import APIRouter, Depends, status

from app.api.deps import require_admin_hospital
from app.models.schemas import (
    AdminPublico,
    CitaSupervisbion,
    KPIHospital,
    MedicoCreacion,
    MedicoPublico,
    MensajeRespuesta,
    TokenPayload,
)
from app.services import admin_service

router = APIRouter(prefix="/admin-hospital", tags=["Administración hospitalaria"])


@router.get("/perfil", response_model=AdminPublico, summary="Perfil del administrador")
def perfil(user: TokenPayload = Depends(require_admin_hospital)):
    return admin_service.obtener_perfil(user.sub)


@router.get("/kpis", response_model=KPIHospital, summary="Indicadores del establecimiento")
def kpis(user: TokenPayload = Depends(require_admin_hospital)):
    return admin_service.kpis(user.sub)


@router.get("/medicos", response_model=list[MedicoPublico], summary="Médicos del establecimiento")
def listar_medicos(user: TokenPayload = Depends(require_admin_hospital)):
    return admin_service.listar_medicos(user.sub)


@router.post(
    "/medicos",
    response_model=MedicoPublico,
    status_code=status.HTTP_201_CREATED,
    summary="Dar de alta un médico",
)
def crear_medico(datos: MedicoCreacion, user: TokenPayload = Depends(require_admin_hospital)):
    return admin_service.crear_medico(user.sub, datos)


@router.patch(
    "/medicos/{medico_id}/estado",
    response_model=MensajeRespuesta,
    summary="Activar o desactivar un médico",
)
def cambiar_estado_medico(
    medico_id: str,
    activo: bool,
    user: TokenPayload = Depends(require_admin_hospital),
):
    return admin_service.cambiar_estado_medico(user.sub, medico_id, activo)


@router.get("/citas", response_model=list[CitaSupervisbion], summary="Supervisión de citas")
def listar_citas(user: TokenPayload = Depends(require_admin_hospital)):
    return admin_service.listar_citas(user.sub)
