"""Servicio de disponibilidad de citas.

Resuelve la búsqueda principal del paciente: dada una especialidad y un
contexto geográfico, devuelve los hospitales con cupos disponibles y los
ordena por relevancia (cercanía, fecha más próxima). Incluye cálculo de
distancia geodésica para ranking por proximidad cuando el cliente envía
coordenadas.
"""

from __future__ import annotations

import math
from collections import defaultdict
from datetime import date

from app.db.demo_repo import get_repo_demo
from app.db.supabase import is_demo_mode
from app.models.schemas import (
    BusquedaDisponibilidad,
    CupoDisponible,
    HospitalPublico,
    TipoInstitucion,
)


# Radio terrestre en kilómetros, usado por la fórmula de Haversine.
_RADIO_TIERRA_KM = 6371.0


def _haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calcula la distancia en kilómetros entre dos coordenadas geográficas.

    Usa la fórmula de Haversine, suficientemente precisa para distancias
    urbanas (errores < 0.5% en escalas de pocos kilómetros).
    """
    lat1_r, lat2_r = math.radians(lat1), math.radians(lat2)
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2) ** 2 + math.cos(lat1_r) * math.cos(lat2_r) * math.sin(dlon / 2) ** 2
    return 2 * _RADIO_TIERRA_KM * math.asin(math.sqrt(a))


def buscar_disponibilidad(criterios: BusquedaDisponibilidad) -> list[CupoDisponible]:
    """Devuelve los cupos disponibles que satisfacen los criterios del paciente.

    Args:
        criterios: Filtros de búsqueda (especialidad, ubicación, fechas).

    Returns:
        Lista de cupos ordenados por proximidad (si hay coordenadas) o por fecha.
    """
    if is_demo_mode():
        return _buscar_demo(criterios)
    return _buscar_supabase(criterios)


def listar_hospitales(distrito: str | None = None) -> list[HospitalPublico]:
    """Lista los establecimientos disponibles, opcionalmente filtrados por distrito."""
    repo = get_repo_demo() if is_demo_mode() else None
    if repo is None:
        return []
    hospitales = repo.listar_hospitales()
    if distrito:
        hospitales = [h for h in hospitales if h["distrito"].lower() == distrito.lower()]
    return [
        HospitalPublico(
            id=h["id"],
            nombre=h["nombre"],
            tipo=TipoInstitucion(h["tipo"]),
            distrito=h["distrito"],
            direccion=h["direccion"],
            telefono=h["telefono"],
            latitud=h["latitud"],
            longitud=h["longitud"],
        )
        for h in hospitales
    ]


def listar_especialidades() -> list[str]:
    """Devuelve los nombres de especialidades disponibles."""
    if is_demo_mode():
        return [e["nombre"] for e in get_repo_demo().listar_especialidades()]
    return []


# ---------------------------------------------------------------------------
# Implementación con repositorio demo
# ---------------------------------------------------------------------------


def _buscar_demo(criterios: BusquedaDisponibilidad) -> list[CupoDisponible]:
    repo = get_repo_demo()
    slots = repo.listar_horarios_disponibles(
        criterios.especialidad,
        fecha_desde=criterios.fecha_desde or date.today(),
        fecha_hasta=criterios.fecha_hasta,
    )

    # Filtros adicionales por tipo de institución y distrito
    if criterios.tipo_institucion:
        slots = [s for s in slots if s["hospital_tipo"] == criterios.tipo_institucion.value]
    if criterios.distrito:
        slots = [s for s in slots if s["hospital_distrito"].lower() == criterios.distrito.lower()]

    # Agrupa por hospital + médico + fecha para mostrar el slot más temprano de
    # cada combinación, con el contador de cupos disponibles en esa fecha.
    grupos: dict[tuple[str, str, date], list[dict]] = defaultdict(list)
    for s in slots:
        grupos[(s["hospital_id"], s["medico_id"], s["fecha"])].append(s)

    resultados: list[CupoDisponible] = []
    for (hospital_id, medico_id, fecha), items in grupos.items():
        items.sort(key=lambda s: s["hora"])
        primero = items[0]
        distancia = None
        if criterios.latitud and criterios.longitud and primero["hospital_latitud"]:
            distancia = round(
                _haversine(
                    criterios.latitud,
                    criterios.longitud,
                    primero["hospital_latitud"],
                    primero["hospital_longitud"],
                ),
                2,
            )
            # Si se definió radio, descarta los que están fuera
            if criterios.radio_km and distancia > criterios.radio_km:
                continue
        resultados.append(CupoDisponible(
            hospital_id=hospital_id,
            hospital_nombre=primero["hospital_nombre"],
            hospital_tipo=TipoInstitucion(primero["hospital_tipo"]),
            hospital_distrito=primero["hospital_distrito"],
            hospital_latitud=primero["hospital_latitud"],
            hospital_longitud=primero["hospital_longitud"],
            distancia_km=distancia,
            medico_id=medico_id,
            medico_nombre=primero["medico_nombre"],
            especialidad=primero["especialidad"],
            fecha=fecha,
            hora=primero["hora"],
            cupos_disponibles=len(items),
        ))

    # Ordena por distancia si está disponible, sino por fecha
    if criterios.latitud and criterios.longitud:
        resultados.sort(key=lambda r: (r.distancia_km or float("inf"), r.fecha))
    else:
        resultados.sort(key=lambda r: (r.fecha, r.hora))

    return resultados[:50]  # Limita a 50 para no sobrecargar la respuesta


def _buscar_supabase(criterios: BusquedaDisponibilidad) -> list[CupoDisponible]:
    # En producción esto se traduce a una consulta SQL contra la vista
    # `vista_disponibilidad_citas`, con joins a `hospitales`, `medicos` y
    # `horarios_medicos`. Aquí se deja como stub explícito.
    return []
