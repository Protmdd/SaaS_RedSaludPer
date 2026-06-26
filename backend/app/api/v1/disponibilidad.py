"""Endpoints de búsqueda de disponibilidad.

El paciente busca cupos disponibles por especialidad, opcionalmente
acotando por ubicación, fechas o tipo de institución. La búsqueda devuelve
hospitales con cupos en orden de cercanía (si se proveen coordenadas) o
por fecha más próxima.
"""

from fastapi import APIRouter, Depends

from app.api.deps import require_paciente
from app.models.schemas import BusquedaDisponibilidad, CupoDisponible, TokenPayload
from app.services import disponibilidad_service

router = APIRouter(prefix="/disponibilidad", tags=["Disponibilidad"])


@router.post(
    "/buscar",
    response_model=list[CupoDisponible],
    summary="Buscar cupos disponibles multi-hospital",
)
def buscar(
    criterios: BusquedaDisponibilidad,
    _: TokenPayload = Depends(require_paciente),
):
    """Devuelve los cupos disponibles que satisfacen los criterios del paciente."""
    return disponibilidad_service.buscar_disponibilidad(criterios)
