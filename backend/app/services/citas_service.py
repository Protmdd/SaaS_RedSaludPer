"""Servicio de citas.

Gestiona el ciclo de vida de una cita desde la perspectiva del paciente:
reserva sobre un horario disponible, listado de citas propias y cancelación.
La verificación de disponibilidad y la ocupación del slot ocurren de forma
atómica para evitar reservas dobles, asumiendo que el repositorio subyacente
serializa las operaciones de escritura.
"""

from __future__ import annotations

import uuid
from datetime import date, datetime

from fastapi import HTTPException

from app.db.demo_repo import _CitaReservada, get_repo_demo
from app.db.supabase import is_demo_mode
from app.models.schemas import (
    CitaCreacion,
    CitaPublica,
    EstadoCita,
    MensajeRespuesta,
)


def reservar_cita(paciente_id: str, datos: CitaCreacion) -> CitaPublica:
    """Reserva una cita en nombre del paciente sobre un slot disponible.

    Raises:
        HTTPException(400): Si el slot no existe o ya está ocupado.
        HTTPException(404): Si el médico u hospital no existen.
    """
    if is_demo_mode():
        return _reservar_demo(paciente_id, datos)
    raise HTTPException(status_code=501, detail="Reserva con Supabase pendiente")


def listar_citas_paciente(paciente_id: str) -> list[CitaPublica]:
    """Lista todas las citas del paciente autenticado, las más recientes primero."""
    if is_demo_mode():
        return _listar_demo(paciente_id)
    return []


def cancelar_cita(paciente_id: str, cita_id: str) -> MensajeRespuesta:
    """Cancela una cita propia del paciente.

    Raises:
        HTTPException(404): Si la cita no existe o no pertenece al paciente.
        HTTPException(400): Si la cita ya está completada o cancelada.
    """
    if is_demo_mode():
        cancelada = get_repo_demo().cancelar_cita(cita_id, paciente_id)
        if not cancelada:
            raise HTTPException(
                status_code=400,
                detail="La cita no puede cancelarse o no pertenece a este paciente",
            )
        return MensajeRespuesta(mensaje="Cita cancelada", detalle=f"ID: {cita_id}")
    raise HTTPException(status_code=501, detail="Cancelación con Supabase pendiente")


# ---------------------------------------------------------------------------
# Implementación con repositorio demo
# ---------------------------------------------------------------------------


def _reservar_demo(paciente_id: str, datos: CitaCreacion) -> CitaPublica:
    repo = get_repo_demo()
    medico = repo.obtener_medico(datos.medico_id)
    hospital = repo.obtener_hospital(datos.hospital_id)
    paciente = repo.obtener_usuario(paciente_id)

    if not medico or not hospital:
        raise HTTPException(status_code=404, detail="Médico u hospital no encontrado")
    if not paciente:
        raise HTTPException(status_code=404, detail="Paciente no encontrado")

    # Verifica y ocupa el slot de manera atómica
    ocupado = repo.marcar_slot_ocupado(datos.medico_id, datos.fecha, datos.hora)
    if not ocupado:
        raise HTTPException(
            status_code=400,
            detail="El horario solicitado ya no está disponible",
        )

    cita = _CitaReservada(
        id=f"CIT-{uuid.uuid4().hex[:10].upper()}",
        numero_cita=f"C{datetime.utcnow().strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}",
        paciente_id=paciente_id,
        medico_id=datos.medico_id,
        hospital_id=datos.hospital_id,
        fecha=datos.fecha,
        hora=datos.hora,
        estado=EstadoCita.CONFIRMADA.value,
        motivo=datos.motivo,
        consultorio=f"C-{(hash(datos.medico_id) % 250) + 100}",
    )
    repo.crear_cita(cita)
    return _a_cita_publica(cita, paciente, medico, hospital)


def _listar_demo(paciente_id: str) -> list[CitaPublica]:
    repo = get_repo_demo()
    paciente = repo.obtener_usuario(paciente_id)
    if not paciente:
        return []
    citas = repo.listar_citas_paciente(paciente_id)
    resultado = []
    for cita in citas:
        medico = repo.obtener_medico(cita.medico_id)
        hospital = repo.obtener_hospital(cita.hospital_id)
        if not medico or not hospital:
            continue
        resultado.append(_a_cita_publica(cita, paciente, medico, hospital))
    return resultado


def _a_cita_publica(cita: _CitaReservada, paciente, medico: dict, hospital: dict) -> CitaPublica:
    return CitaPublica(
        id=cita.id,
        numero_cita=cita.numero_cita,
        fecha=cita.fecha,
        hora=cita.hora,
        estado=EstadoCita(cita.estado),
        paciente_id=cita.paciente_id,
        paciente_nombre=f"{paciente.nombres} {paciente.apellidos}",
        medico_id=medico["id"],
        medico_nombre=medico["nombre"],
        especialidad=medico["especialidad_nombre"],
        hospital_id=hospital["id"],
        hospital_nombre=hospital["nombre"],
        hospital_direccion=hospital["direccion"],
        consultorio=cita.consultorio,
        motivo=cita.motivo,
        creada_en=cita.creada_en,
    )
