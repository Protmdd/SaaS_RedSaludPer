"""Servicio del perfil médico.

Resuelve las operaciones que el médico realiza sobre su propia práctica:
consulta de su perfil profesional, agenda de citas programadas, gestión de
franjas de disponibilidad y registro de la atención (marcar completada o
inasistencia). Todas las operaciones se acotan al médico autenticado.
"""

from __future__ import annotations

from datetime import date, timedelta

from fastapi import HTTPException

from app.db.demo_repo import get_repo_demo
from app.db.supabase import is_demo_mode
from app.models.schemas import (
    CitaAgendaMedico,
    EstadoCita,
    FranjaHorario,
    FranjaHorarioCreacion,
    MedicoPublico,
    MensajeRespuesta,
    ResumenMedico,
)


def obtener_perfil(medico_id: str) -> MedicoPublico:
    """Devuelve el perfil profesional del médico autenticado."""
    _exigir_demo()
    repo = get_repo_demo()
    usuario = repo.obtener_usuario(medico_id)
    perfil = repo.obtener_perfil_medico(medico_id)
    if not usuario or not perfil:
        raise HTTPException(status_code=404, detail="Médico no encontrado")
    hospital = repo.obtener_hospital(perfil.hospital_id)
    return MedicoPublico(
        id=medico_id,
        nombres=usuario.nombres,
        apellidos=usuario.apellidos,
        email=usuario.email,
        colegiatura=perfil.colegiatura,
        especialidad=perfil.especialidad_nombre,
        hospital_id=perfil.hospital_id,
        hospital_nombre=hospital["nombre"] if hospital else "",
        activo=perfil.activo,
    )


def listar_agenda(medico_id: str, solo_futuras: bool = False) -> list[CitaAgendaMedico]:
    """Lista las citas del médico, opcionalmente solo las de hoy en adelante."""
    _exigir_demo()
    repo = get_repo_demo()
    citas = repo.listar_citas_medico(medico_id)
    hoy = date.today()
    salida: list[CitaAgendaMedico] = []
    for c in citas:
        if solo_futuras and c.fecha < hoy:
            continue
        paciente = repo.obtener_usuario(c.paciente_id)
        perfil_med = repo.obtener_perfil_medico(medico_id)
        salida.append(CitaAgendaMedico(
            id=c.id,
            numero_cita=c.numero_cita,
            fecha=c.fecha,
            hora=c.hora,
            estado=EstadoCita(c.estado),
            paciente_nombre=f"{paciente.nombres} {paciente.apellidos}" if paciente else "—",
            paciente_dni=paciente.dni if paciente else "—",
            especialidad=perfil_med.especialidad_nombre if perfil_med else "",
            consultorio=c.consultorio,
            motivo=c.motivo,
        ))
    return salida


def resumen(medico_id: str) -> ResumenMedico:
    """Calcula indicadores rápidos para el panel del médico."""
    _exigir_demo()
    repo = get_repo_demo()
    citas = repo.listar_citas_medico(medico_id)
    hoy = date.today()
    fin_semana = hoy + timedelta(days=7)
    inicio_mes = hoy.replace(day=1)

    citas_hoy = [c for c in citas if c.fecha == hoy and c.estado not in ("Cancelada",)]
    citas_semana = [c for c in citas if hoy <= c.fecha <= fin_semana and c.estado not in ("Cancelada",)]
    atendidos_mes = [
        c for c in citas
        if c.fecha >= inicio_mes and c.estado == "Completada"
    ]

    # Próxima cita futura confirmada
    futuras = sorted(
        (c for c in citas if c.fecha >= hoy and c.estado == "Confirmada"),
        key=lambda c: (c.fecha, c.hora),
    )
    proxima = None
    if futuras:
        c = futuras[0]
        paciente = repo.obtener_usuario(c.paciente_id)
        perfil_med = repo.obtener_perfil_medico(medico_id)
        proxima = CitaAgendaMedico(
            id=c.id,
            numero_cita=c.numero_cita,
            fecha=c.fecha,
            hora=c.hora,
            estado=EstadoCita(c.estado),
            paciente_nombre=f"{paciente.nombres} {paciente.apellidos}" if paciente else "—",
            paciente_dni=paciente.dni if paciente else "—",
            especialidad=perfil_med.especialidad_nombre if perfil_med else "",
            consultorio=c.consultorio,
            motivo=c.motivo,
        )

    return ResumenMedico(
        citas_hoy=len(citas_hoy),
        citas_semana=len(citas_semana),
        proxima_cita=proxima,
        pacientes_atendidos_mes=len(atendidos_mes),
    )


def marcar_estado_cita(medico_id: str, cita_id: str, estado: EstadoCita) -> MensajeRespuesta:
    """Permite al médico marcar una cita propia como completada o inasistencia."""
    _exigir_demo()
    repo = get_repo_demo()
    cita = repo.obtener_cita(cita_id)
    if not cita or cita.medico_id != medico_id:
        raise HTTPException(status_code=404, detail="Cita no encontrada en su agenda")
    if estado not in (EstadoCita.COMPLETADA, EstadoCita.NO_ASISTIO, EstadoCita.CONFIRMADA):
        raise HTTPException(status_code=400, detail="Estado no permitido para esta operación")
    repo.actualizar_estado_cita(cita_id, estado.value)
    return MensajeRespuesta(mensaje="Estado de la cita actualizado", detalle=f"{cita_id} → {estado.value}")


# --- Franjas de disponibilidad ---


def listar_franjas(medico_id: str) -> list[FranjaHorario]:
    _exigir_demo()
    franjas = get_repo_demo().listar_franjas_medico(medico_id)
    return [FranjaHorario(**f) for f in franjas]


def crear_franja(medico_id: str, datos: FranjaHorarioCreacion) -> FranjaHorario:
    _exigir_demo()
    franja = get_repo_demo().crear_franja_medico(
        medico_id, datos.dia_semana, datos.hora_inicio, datos.hora_fin
    )
    return FranjaHorario(**franja)


def eliminar_franja(medico_id: str, franja_id: str) -> MensajeRespuesta:
    _exigir_demo()
    ok = get_repo_demo().eliminar_franja_medico(medico_id, franja_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Franja no encontrada")
    return MensajeRespuesta(mensaje="Franja eliminada", detalle=franja_id)


def _exigir_demo() -> None:
    if not is_demo_mode():
        raise HTTPException(status_code=501, detail="Operación de médico con Supabase pendiente")
