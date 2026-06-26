"""Servicio del perfil administrador hospitalario.

Resuelve las operaciones de gobierno del establecimiento: consulta del perfil
del administrador, gestión de los médicos adscritos (alta y activación),
supervisión de las citas del hospital y cálculo de los indicadores agregados
(KPIs) que alimentan el panel de administración. Todas las operaciones se
acotan al establecimiento del administrador autenticado.
"""

from __future__ import annotations

import uuid
from collections import Counter
from datetime import date, timedelta

from fastapi import HTTPException, status

from app.core.security import hash_password
from app.db.demo_repo import _PerfilMedico, _Usuario, get_repo_demo
from app.db.supabase import is_demo_mode
from app.models.schemas import (
    AdminPublico,
    CitaSupervisbion,
    EstadoCita,
    KPIHospital,
    MedicoCreacion,
    MedicoPublico,
    MensajeRespuesta,
)


def obtener_perfil(admin_id: str) -> AdminPublico:
    """Devuelve el perfil del administrador hospitalario autenticado."""
    _exigir_demo()
    repo = get_repo_demo()
    usuario = repo.obtener_usuario(admin_id)
    perfil = repo.obtener_perfil_admin(admin_id)
    if not usuario or not perfil:
        raise HTTPException(status_code=404, detail="Administrador no encontrado")
    hospital = repo.obtener_hospital(perfil.hospital_id)
    return AdminPublico(
        id=admin_id,
        nombres=usuario.nombres,
        apellidos=usuario.apellidos,
        email=usuario.email,
        cargo=perfil.cargo,
        hospital_id=perfil.hospital_id,
        hospital_nombre=hospital["nombre"] if hospital else "",
    )


def _hospital_id_de(admin_id: str) -> str:
    perfil = get_repo_demo().obtener_perfil_admin(admin_id)
    if not perfil:
        raise HTTPException(status_code=404, detail="Administrador no encontrado")
    return perfil.hospital_id


# --- Gestión de médicos ---


def listar_medicos(admin_id: str) -> list[MedicoPublico]:
    """Lista los médicos adscritos al establecimiento del administrador."""
    _exigir_demo()
    repo = get_repo_demo()
    hospital_id = _hospital_id_de(admin_id)
    hospital = repo.obtener_hospital(hospital_id)
    medicos = repo.listar_medicos_hospital(hospital_id)
    return [
        MedicoPublico(
            id=m["id"],
            nombres=m["nombres"],
            apellidos=m["apellidos"],
            email=m["email"],
            colegiatura=m["colegiatura"],
            especialidad=m["especialidad"],
            hospital_id=m["hospital_id"],
            hospital_nombre=hospital["nombre"] if hospital else "",
            activo=m["activo"],
        )
        for m in medicos
    ]


def crear_medico(admin_id: str, datos: MedicoCreacion) -> MedicoPublico:
    """Da de alta un médico en el establecimiento del administrador."""
    _exigir_demo()
    repo = get_repo_demo()
    hospital_id = _hospital_id_de(admin_id)

    # Validar correo único
    if repo.existe_usuario(dni=f"MED{uuid.uuid4().hex[:5]}", email=datos.email):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Ya existe un usuario con ese correo",
        )

    especialidad = repo.obtener_especialidad_por_nombre(datos.especialidad)
    especialidad_id = especialidad["id"] if especialidad else "ESP-000"

    medico_id = f"MED-{uuid.uuid4().hex[:8].upper()}"
    usuario = _Usuario(
        id=medico_id,
        rol="medico",
        dni=f"{abs(hash(datos.email)) % 90_000_000 + 10_000_000}",
        nombres=datos.nombres,
        apellidos=datos.apellidos,
        email=datos.email,
        password_hash=hash_password(datos.password),
    )
    perfil = _PerfilMedico(
        usuario_id=medico_id,
        colegiatura=datos.colegiatura,
        especialidad_id=especialidad_id,
        especialidad_nombre=datos.especialidad,
        hospital_id=hospital_id,
        cupos_diarios=12,
    )
    repo.crear_medico(usuario, perfil)
    hospital = repo.obtener_hospital(hospital_id)
    return MedicoPublico(
        id=medico_id,
        nombres=usuario.nombres,
        apellidos=usuario.apellidos,
        email=usuario.email,
        colegiatura=perfil.colegiatura,
        especialidad=perfil.especialidad_nombre,
        hospital_id=hospital_id,
        hospital_nombre=hospital["nombre"] if hospital else "",
        activo=True,
    )


def cambiar_estado_medico(admin_id: str, medico_id: str, activo: bool) -> MensajeRespuesta:
    """Activa o desactiva un médico del establecimiento."""
    _exigir_demo()
    repo = get_repo_demo()
    hospital_id = _hospital_id_de(admin_id)
    perfil = repo.obtener_perfil_medico(medico_id)
    if not perfil or perfil.hospital_id != hospital_id:
        raise HTTPException(status_code=404, detail="Médico no pertenece a su establecimiento")
    repo.cambiar_estado_medico(medico_id, activo)
    estado = "activado" if activo else "desactivado"
    return MensajeRespuesta(mensaje=f"Médico {estado}", detalle=medico_id)


# --- Supervisión de citas ---


def listar_citas(admin_id: str) -> list[CitaSupervisbion]:
    """Lista las citas del establecimiento, las más recientes primero."""
    _exigir_demo()
    repo = get_repo_demo()
    hospital_id = _hospital_id_de(admin_id)
    citas = repo.listar_citas_hospital(hospital_id)
    salida: list[CitaSupervisbion] = []
    for c in citas:
        paciente = repo.obtener_usuario(c.paciente_id)
        medico = repo.obtener_medico(c.medico_id)
        salida.append(CitaSupervisbion(
            id=c.id,
            numero_cita=c.numero_cita,
            fecha=c.fecha,
            hora=c.hora,
            estado=EstadoCita(c.estado),
            paciente_nombre=f"{paciente.nombres} {paciente.apellidos}" if paciente else "—",
            medico_nombre=medico["nombre"] if medico else "—",
            especialidad=medico["especialidad_nombre"] if medico else "—",
        ))
    return salida


# --- KPIs ---


def kpis(admin_id: str) -> KPIHospital:
    """Calcula los indicadores agregados del establecimiento."""
    _exigir_demo()
    repo = get_repo_demo()
    hospital_id = _hospital_id_de(admin_id)
    medicos = repo.listar_medicos_hospital(hospital_id)
    citas = repo.listar_citas_hospital(hospital_id)
    hoy = date.today()

    citas_hoy = [c for c in citas if c.fecha == hoy]
    completadas = [c for c in citas if c.estado == "Completada"]
    no_asistidas = [c for c in citas if c.estado == "No asistió"]

    total_finalizadas = len(completadas) + len(no_asistidas)
    tasa_ausentismo = (len(no_asistidas) / total_finalizadas * 100) if total_finalizadas else 0.0

    # Ocupación aproximada: citas activas frente a capacidad teórica semanal.
    capacidad = max(len(medicos) * 12 * 5, 1)
    activas = [c for c in citas if c.estado in ("Confirmada", "Completada")]
    tasa_ocupacion = min(len(activas) / capacidad * 100, 100.0)

    # Distribución por especialidad
    por_especialidad: Counter[str] = Counter()
    for c in citas:
        medico = repo.obtener_medico(c.medico_id)
        if medico:
            por_especialidad[medico["especialidad_nombre"]] += 1

    # Distribución por estado
    por_estado = Counter(c.estado for c in citas)

    # Tendencia últimos 7 días
    tendencia = []
    for i in range(6, -1, -1):
        dia = hoy - timedelta(days=i)
        tendencia.append(sum(1 for c in citas if c.fecha == dia))

    return KPIHospital(
        total_medicos=len(medicos),
        total_citas=len(citas),
        citas_hoy=len(citas_hoy),
        tasa_ocupacion=round(tasa_ocupacion, 1),
        tasa_ausentismo=round(tasa_ausentismo, 1),
        citas_por_especialidad=dict(por_especialidad.most_common(8)),
        citas_por_estado=dict(por_estado),
        tendencia_semanal=tendencia,
    )


def _exigir_demo() -> None:
    if not is_demo_mode():
        raise HTTPException(status_code=501, detail="Operación de administración con Supabase pendiente")
