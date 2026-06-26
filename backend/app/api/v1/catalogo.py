"""Endpoints de catálogo.

Datos de referencia consumidos por la interfaz para poblar selectores:
listas de hospitales y especialidades. Son endpoints públicos porque no
contienen información sensible y se cachean en el cliente.
"""

from fastapi import APIRouter, Query

from app.models.schemas import HospitalPublico
from app.services import disponibilidad_service

router = APIRouter(prefix="/catalogo", tags=["Catálogo"])


@router.get(
    "/hospitales",
    response_model=list[HospitalPublico],
    summary="Listar hospitales públicos",
)
def hospitales(distrito: str | None = Query(default=None, description="Filtrar por distrito")):
    """Devuelve todos los hospitales del sistema, opcionalmente filtrados por distrito."""
    return disponibilidad_service.listar_hospitales(distrito)


@router.get(
    "/especialidades",
    response_model=list[str],
    summary="Listar especialidades disponibles",
)
def especialidades():
    """Devuelve los nombres de especialidades médicas atendidas."""
    return disponibilidad_service.listar_especialidades()
