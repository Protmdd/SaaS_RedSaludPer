"""Repositorio en memoria para modo demostración.

Provee un conjunto de datos sintéticos pero coherentes (hospitales, médicos,
especialidades, horarios) que permite ejercitar el backend sin Supabase
poblado. A diferencia de la versión inicial, este repositorio precarga
usuarios semilla de los tres roles implementados (paciente, médico y
administrador hospitalario) con credenciales conocidas, de modo que el
sistema sea utilizable de inmediato sin necesidad de registrar cuentas.

Los pacientes y citas creados durante la sesión se acumulan en memoria y se
pierden al reiniciar el servidor; los usuarios semilla, en cambio, se
regeneran en cada arranque, garantizando que siempre exista un acceso válido.

Esta clase aísla todo el dato sintético en un solo lugar para que el resto
del código nunca dependa de detalles del modo demostración.
"""

from __future__ import annotations

import random
import threading
import uuid
from dataclasses import dataclass, field
from datetime import date, datetime, time, timedelta
from typing import Any


_SEMILLA = 2025


# Coordenadas reales aproximadas de hospitales públicos de Lima.
_HOSPITALES_BASE = [
    {
        "nombre": "Hospital Nacional Cayetano Heredia",
        "tipo": "MINSA",
        "distrito": "San Martín de Porres",
        "direccion": "Av. Honorio Delgado 262, San Martín de Porres",
        "telefono": "(01) 482-0402",
        "latitud": -11.9831,
        "longitud": -77.0654,
    },
    {
        "nombre": "Hospital Edgardo Rebagliati Martins",
        "tipo": "EsSalud",
        "distrito": "Jesús María",
        "direccion": "Av. Edgardo Rebagliati 490, Jesús María",
        "telefono": "(01) 265-4901",
        "latitud": -12.0792,
        "longitud": -77.0431,
    },
    {
        "nombre": "Hospital Nacional Arzobispo Loayza",
        "tipo": "MINSA",
        "distrito": "Cercado de Lima",
        "direccion": "Av. Alfonso Ugarte 848, Cercado de Lima",
        "telefono": "(01) 614-4646",
        "latitud": -12.0498,
        "longitud": -77.0428,
    },
    {
        "nombre": "Hospital Guillermo Almenara Irigoyen",
        "tipo": "EsSalud",
        "distrito": "La Victoria",
        "direccion": "Av. Grau 800, La Victoria",
        "telefono": "(01) 324-2983",
        "latitud": -12.0631,
        "longitud": -77.0237,
    },
    {
        "nombre": "Hospital María Auxiliadora",
        "tipo": "MINSA",
        "distrito": "San Juan de Miraflores",
        "direccion": "Av. Miguel Iglesias 968, San Juan de Miraflores",
        "telefono": "(01) 217-4499",
        "latitud": -12.1567,
        "longitud": -76.9714,
    },
    {
        "nombre": "Hospital Nacional Dos de Mayo",
        "tipo": "MINSA",
        "distrito": "Cercado de Lima",
        "direccion": "Av. Grau Cdra. 13, Cercado de Lima",
        "telefono": "(01) 328-0028",
        "latitud": -12.0561,
        "longitud": -77.0181,
    },
]

_ESPECIALIDADES_BASE = [
    "Medicina General",
    "Cardiología",
    "Neurología",
    "Traumatología",
    "Oftalmología",
    "Endocrinología",
    "Psiquiatría",
    "Oncología",
    "Pediatría",
    "Obstetricia",
    "Dermatología",
    "Gastroenterología",
    "Ginecología",
    "Urología",
    "Otorrinolaringología",
]

_NOMBRES_M = ["Juan", "Carlos", "Miguel", "José", "Luis", "Pedro", "Antonio", "Daniel", "Ricardo", "Fernando"]
_NOMBRES_F = ["María", "Ana", "Rosa", "Carmen", "Lucía", "Elena", "Patricia", "Diana", "Claudia", "Sofía"]
_APELLIDOS = [
    "García", "Rodríguez", "Martínez", "López", "González", "Hernández",
    "Pérez", "Sánchez", "Ramírez", "Torres", "Flores", "Rivera", "Gómez",
]


# ---------------------------------------------------------------------------
# Modelos de datos en memoria
# ---------------------------------------------------------------------------


@dataclass
class _Usuario:
    """Identidad común a todos los roles del sistema.

    Centralizar credenciales y rol en una sola entidad permite que el login
    sea unificado: un único punto de búsqueda por DNI o correo,
    independientemente del rol. Los datos específicos de cada rol viven en
    estructuras complementarias (paciente, médico, administrador) ligadas por
    `id`.
    """

    id: str
    rol: str
    dni: str
    nombres: str
    apellidos: str
    email: str
    password_hash: str
    creado_en: datetime = field(default_factory=datetime.utcnow)


@dataclass
class _PerfilPaciente:
    """Datos del paciente complementarios a su identidad."""

    usuario_id: str
    fecha_nacimiento: date
    genero: str
    celular: str
    direccion: str | None
    distrito: str
    tipo_seguro: str


@dataclass
class _PerfilMedico:
    """Datos profesionales del médico complementarios a su identidad."""

    usuario_id: str
    colegiatura: str
    especialidad_id: str
    especialidad_nombre: str
    hospital_id: str
    cupos_diarios: int
    activo: bool = True


@dataclass
class _PerfilAdmin:
    """Datos del administrador hospitalario complementarios a su identidad."""

    usuario_id: str
    cargo: str
    hospital_id: str


@dataclass
class _CitaReservada:
    """Cita creada en memoria por un paciente."""

    id: str
    numero_cita: str
    paciente_id: str
    medico_id: str
    hospital_id: str
    fecha: date
    hora: time
    estado: str
    motivo: str | None
    consultorio: str
    creada_en: datetime = field(default_factory=datetime.utcnow)


class RepositorioDemo:
    """Repositorio singleton thread-safe del modo demostración."""

    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._rng = random.Random(_SEMILLA)
        self._hospitales = self._construir_hospitales()
        self._especialidades = self._construir_especialidades()

        # Tablas de identidad y perfiles
        self._usuarios: dict[str, _Usuario] = {}
        self._perfiles_paciente: dict[str, _PerfilPaciente] = {}
        self._perfiles_medico: dict[str, _PerfilMedico] = {}
        self._perfiles_admin: dict[str, _PerfilAdmin] = {}

        # Catálogo de médicos sintéticos (con identidad incluida)
        self._construir_medicos()
        self._horarios = self._construir_horarios()
        self._franjas_medico: dict[str, list[dict]] = {}

        self._citas: dict[str, _CitaReservada] = {}

        # Usuarios semilla de los tres roles + citas de ejemplo
        self._sembrar_usuarios_demo()
        self._sembrar_citas_demo()

    # ------------------------------------------------------------------
    # Constructores de catálogos
    # ------------------------------------------------------------------

    def _construir_hospitales(self) -> list[dict]:
        return [
            {"id": f"HOSP-{i + 1:03d}", **datos}
            for i, datos in enumerate(_HOSPITALES_BASE)
        ]

    def _construir_especialidades(self) -> list[dict]:
        return [
            {"id": f"ESP-{i + 1:03d}", "nombre": nombre, "descripcion": None}
            for i, nombre in enumerate(_ESPECIALIDADES_BASE)
        ]

    def _construir_medicos(self) -> None:
        """Genera 60 médicos sintéticos como usuarios con perfil médico."""
        from app.core.security import hash_password

        hash_demo = hash_password("medico123")
        for i in range(60):
            femenino = self._rng.random() > 0.5
            tratamiento = "Dra." if femenino else "Dr."
            nombre = self._rng.choice(_NOMBRES_F if femenino else _NOMBRES_M)
            ap1 = self._rng.choice(_APELLIDOS)
            ap2 = self._rng.choice(_APELLIDOS)
            hospital = self._rng.choice(self._hospitales)
            especialidad = self._rng.choice(self._especialidades)
            medico_id = f"MED-{i + 1:04d}"
            dni = f"{self._rng.randint(40_000_000, 49_999_999)}"
            self._usuarios[medico_id] = _Usuario(
                id=medico_id,
                rol="medico",
                dni=dni,
                nombres=f"{tratamiento} {nombre}",
                apellidos=f"{ap1} {ap2}",
                email=f"{nombre.lower()}.{ap1.lower()}{i}@redsalud.pe",
                password_hash=hash_demo,
            )
            self._perfiles_medico[medico_id] = _PerfilMedico(
                usuario_id=medico_id,
                colegiatura=f"CMP-{self._rng.randint(10_000, 99_999)}",
                especialidad_id=especialidad["id"],
                especialidad_nombre=especialidad["nombre"],
                hospital_id=hospital["id"],
                cupos_diarios=self._rng.randint(10, 20),
            )

    def _medicos_dicts(self) -> list[dict]:
        """Vista de compatibilidad: médicos como diccionarios enriquecidos."""
        salida = []
        idx_hosp = {h["id"]: h for h in self._hospitales}
        for mid, perfil in self._perfiles_medico.items():
            u = self._usuarios[mid]
            hosp = idx_hosp[perfil.hospital_id]
            salida.append({
                "id": mid,
                "nombre": f"{u.nombres} {u.apellidos}",
                "colegiado": perfil.colegiatura,
                "especialidad_id": perfil.especialidad_id,
                "especialidad_nombre": perfil.especialidad_nombre,
                "hospital_id": perfil.hospital_id,
                "hospital_nombre": hosp["nombre"],
                "cupos_diarios": perfil.cupos_diarios,
            })
        return salida

    def _construir_horarios(self) -> list[dict]:
        """Genera horarios disponibles para los próximos 14 días por médico."""
        horarios = []
        hoy = date.today()
        for medico in self._medicos_dicts():
            for desfase in range(14):
                fecha_h = hoy + timedelta(days=desfase + 1)
                if fecha_h.weekday() >= 5:  # Solo días laborables
                    continue
                slots_disponibles = self._rng.randint(0, medico["cupos_diarios"])
                for slot in range(slots_disponibles):
                    hora_inicio = 7 + slot // 2
                    minuto = 0 if slot % 2 == 0 else 30
                    if hora_inicio >= 17:
                        break
                    horarios.append({
                        "id": str(uuid.uuid4()),
                        "medico_id": medico["id"],
                        "fecha": fecha_h,
                        "hora": time(hora_inicio, minuto),
                        "ocupado": False,
                    })
        return horarios

    # ------------------------------------------------------------------
    # Siembra de usuarios y citas demo
    # ------------------------------------------------------------------

    def _sembrar_usuarios_demo(self) -> None:
        """Crea cuentas de acceso conocidas para cada rol implementado.

        Credenciales demo:
          - Paciente:  DNI 10000001 / paciente@demo.pe   · clave: paciente123
          - Médico:    DNI 20000002 / medico@demo.pe      · clave: medico123
          - Admin:     DNI 30000003 / admin@demo.pe       · clave: admin123
        """
        from app.core.security import hash_password

        # --- Paciente demo ---
        pac_id = "PAC-DEMO0001"
        self._usuarios[pac_id] = _Usuario(
            id=pac_id,
            rol="paciente",
            dni="10000001",
            nombres="Lucía",
            apellidos="Ramírez Soto",
            email="paciente@demo.pe",
            password_hash=hash_password("paciente123"),
        )
        self._perfiles_paciente[pac_id] = _PerfilPaciente(
            usuario_id=pac_id,
            fecha_nacimiento=date(1990, 5, 14),
            genero="Femenino",
            celular="987654321",
            direccion="Av. Los Próceres 123",
            distrito="San Juan de Lurigancho",
            tipo_seguro="SIS",
        )

        # --- Médico demo: vinculado a un médico sintético existente ---
        # Se normaliza su identidad para que sea coherente y reconocible.
        med_id = "MED-0001"
        med_user = self._usuarios[med_id]
        med_user.dni = "20000002"
        med_user.nombres = "Dr. Javier"
        med_user.apellidos = "Salazar Ríos"
        med_user.email = "medico@demo.pe"
        med_user.password_hash = hash_password("medico123")
        # Nombre coherente para la cuenta demo de médico.
        med_user.nombres = "Dr. Roberto"
        med_user.apellidos = "Salas Quispe"

        # --- Administrador hospitalario demo ---
        adm_id = "ADM-DEMO0001"
        hospital_admin = self._perfiles_medico[med_id].hospital_id
        self._usuarios[adm_id] = _Usuario(
            id=adm_id,
            rol="admin_hospital",
            dni="30000003",
            nombres="Carlos",
            apellidos="Mendoza Vega",
            email="admin@demo.pe",
            password_hash=hash_password("admin123"),
        )
        self._perfiles_admin[adm_id] = _PerfilAdmin(
            usuario_id=adm_id,
            cargo="Jefe de Admisión y Citas",
            hospital_id=hospital_admin,
        )

    def _sembrar_citas_demo(self) -> None:
        """Crea algunas citas de ejemplo para el paciente y médico demo."""
        pac_id = "PAC-DEMO0001"
        med_id = "MED-0001"
        perfil_med = self._perfiles_medico[med_id]
        hoy = date.today()
        ejemplos = [
            (hoy + timedelta(days=2), time(9, 0), "Confirmada", "Control de rutina"),
            (hoy + timedelta(days=5), time(11, 30), "Confirmada", "Dolor persistente"),
            (hoy - timedelta(days=10), time(8, 30), "Completada", "Consulta inicial"),
            (hoy - timedelta(days=3), time(10, 0), "No asistió", "Seguimiento"),
        ]
        for i, (fecha, hora, estado, motivo) in enumerate(ejemplos):
            cita_id = f"CIT-DEMO{i:04d}"
            self._citas[cita_id] = _CitaReservada(
                id=cita_id,
                numero_cita=f"C{fecha.strftime('%Y%m%d')}-{1000 + i}",
                paciente_id=pac_id,
                medico_id=med_id,
                hospital_id=perfil_med.hospital_id,
                fecha=fecha,
                hora=hora,
                estado=estado,
                motivo=motivo,
                consultorio="C-101",
            )

    # ------------------------------------------------------------------
    # Consultas de catálogo
    # ------------------------------------------------------------------

    def listar_hospitales(self) -> list[dict]:
        return list(self._hospitales)

    def listar_especialidades(self) -> list[dict]:
        return list(self._especialidades)

    def obtener_hospital(self, hospital_id: str) -> dict | None:
        return next((h for h in self._hospitales if h["id"] == hospital_id), None)

    def obtener_medico(self, medico_id: str) -> dict | None:
        """Devuelve el médico como diccionario enriquecido (compatibilidad)."""
        if medico_id not in self._perfiles_medico:
            return None
        perfil = self._perfiles_medico[medico_id]
        u = self._usuarios[medico_id]
        hosp = self.obtener_hospital(perfil.hospital_id)
        return {
            "id": medico_id,
            "nombre": f"{u.nombres} {u.apellidos}",
            "colegiado": perfil.colegiatura,
            "especialidad_id": perfil.especialidad_id,
            "especialidad_nombre": perfil.especialidad_nombre,
            "hospital_id": perfil.hospital_id,
            "hospital_nombre": hosp["nombre"] if hosp else "",
            "cupos_diarios": perfil.cupos_diarios,
        }

    def obtener_especialidad_por_nombre(self, nombre: str) -> dict | None:
        return next(
            (e for e in self._especialidades if e["nombre"].lower() == nombre.lower()),
            None,
        )

    def listar_horarios_disponibles(
        self, especialidad_nombre: str, fecha_desde: date | None = None, fecha_hasta: date | None = None
    ) -> list[dict[str, Any]]:
        """Devuelve los horarios libres para una especialidad enriquecidos con datos del médico y hospital."""
        with self._lock:
            medicos = self._medicos_dicts()
            medicos_esp = [m for m in medicos if m["especialidad_nombre"].lower() == especialidad_nombre.lower()]
            medicos_ids = {m["id"] for m in medicos_esp}
            slots = [h for h in self._horarios if h["medico_id"] in medicos_ids and not h["ocupado"]]
            if fecha_desde:
                slots = [s for s in slots if s["fecha"] >= fecha_desde]
            if fecha_hasta:
                slots = [s for s in slots if s["fecha"] <= fecha_hasta]
            enriquecidos = []
            indice_medicos = {m["id"]: m for m in medicos}
            indice_hospitales = {h["id"]: h for h in self._hospitales}
            for slot in slots:
                medico = indice_medicos[slot["medico_id"]]
                hospital = indice_hospitales[medico["hospital_id"]]
                enriquecidos.append({
                    "slot_id": slot["id"],
                    "medico_id": medico["id"],
                    "medico_nombre": medico["nombre"],
                    "especialidad": medico["especialidad_nombre"],
                    "hospital_id": hospital["id"],
                    "hospital_nombre": hospital["nombre"],
                    "hospital_tipo": hospital["tipo"],
                    "hospital_distrito": hospital["distrito"],
                    "hospital_direccion": hospital["direccion"],
                    "hospital_latitud": hospital["latitud"],
                    "hospital_longitud": hospital["longitud"],
                    "fecha": slot["fecha"],
                    "hora": slot["hora"],
                })
            return sorted(enriquecidos, key=lambda s: (s["fecha"], s["hora"]))

    def marcar_slot_ocupado(self, medico_id: str, fecha: date, hora: time) -> bool:
        """Marca un slot como ocupado. Devuelve True si encontró y ocupó el slot."""
        with self._lock:
            for slot in self._horarios:
                if (
                    slot["medico_id"] == medico_id
                    and slot["fecha"] == fecha
                    and slot["hora"] == hora
                    and not slot["ocupado"]
                ):
                    slot["ocupado"] = True
                    return True
        return False

    # ------------------------------------------------------------------
    # Identidad y usuarios (login unificado)
    # ------------------------------------------------------------------

    def buscar_usuario_por_identificador(self, identificador: str) -> _Usuario | None:
        """Busca un usuario de cualquier rol por DNI o por correo.

        La comparación de correo es insensible a mayúsculas; la de DNI es
        exacta sobre el texto normalizado sin espacios. Corrige el bug previo
        donde el DNI se comparaba contra una cadena ya pasada a minúsculas.
        """
        ident = identificador.strip()
        ident_lower = ident.lower()
        for u in self._usuarios.values():
            if u.dni == ident or u.email.lower() == ident_lower:
                return u
        return None

    def obtener_usuario(self, usuario_id: str) -> _Usuario | None:
        return self._usuarios.get(usuario_id)

    def existe_usuario(self, dni: str, email: str) -> bool:
        return any(
            u.dni == dni or u.email.lower() == email.lower()
            for u in self._usuarios.values()
        )

    # ------------------------------------------------------------------
    # Pacientes
    # ------------------------------------------------------------------

    def crear_paciente(self, usuario: _Usuario, perfil: _PerfilPaciente) -> _Usuario:
        with self._lock:
            self._usuarios[usuario.id] = usuario
            self._perfiles_paciente[usuario.id] = perfil
        return usuario

    def obtener_perfil_paciente(self, usuario_id: str) -> _PerfilPaciente | None:
        return self._perfiles_paciente.get(usuario_id)

    # ------------------------------------------------------------------
    # Médicos
    # ------------------------------------------------------------------

    def obtener_perfil_medico(self, usuario_id: str) -> _PerfilMedico | None:
        return self._perfiles_medico.get(usuario_id)

    def listar_medicos_hospital(self, hospital_id: str) -> list[dict]:
        """Devuelve los médicos de un establecimiento como diccionarios."""
        salida = []
        for mid, perfil in self._perfiles_medico.items():
            if perfil.hospital_id != hospital_id:
                continue
            u = self._usuarios[mid]
            salida.append({
                "id": mid,
                "nombres": u.nombres,
                "apellidos": u.apellidos,
                "email": u.email,
                "colegiatura": perfil.colegiatura,
                "especialidad": perfil.especialidad_nombre,
                "hospital_id": perfil.hospital_id,
                "activo": perfil.activo,
            })
        return sorted(salida, key=lambda m: (m["especialidad"], m["apellidos"]))

    def crear_medico(self, usuario: _Usuario, perfil: _PerfilMedico) -> _Usuario:
        with self._lock:
            self._usuarios[usuario.id] = usuario
            self._perfiles_medico[usuario.id] = perfil
            self._generar_horarios_medico(usuario.id, perfil.cupos_diarios)
        return usuario

    def _generar_horarios_medico(self, medico_id: str, cupos_diarios: int) -> None:
        hoy = date.today()
        for desfase in range(14):
            fecha_h = hoy + timedelta(days=desfase + 1)
            if fecha_h.weekday() >= 5:
                continue
            for slot in range(cupos_diarios):
                hora_inicio = 7 + slot // 2
                minuto = 0 if slot % 2 == 0 else 30
                if hora_inicio >= 17:
                    break
                self._horarios.append({
                    "id": str(uuid.uuid4()),
                    "medico_id": medico_id,
                    "fecha": fecha_h,
                    "hora": time(hora_inicio, minuto),
                    "ocupado": False,
                })

    def cambiar_estado_medico(self, medico_id: str, activo: bool) -> bool:
        with self._lock:
            perfil = self._perfiles_medico.get(medico_id)
            if not perfil:
                return False
            perfil.activo = activo
            return True

    def listar_franjas_medico(self, medico_id: str) -> list[dict]:
        return list(self._franjas_medico.get(medico_id, []))

    def crear_franja_medico(self, medico_id: str, dia_semana: int, hora_inicio: time, hora_fin: time) -> dict:
        franja = {
            "id": f"FRA-{uuid.uuid4().hex[:8].upper()}",
            "dia_semana": dia_semana,
            "hora_inicio": hora_inicio,
            "hora_fin": hora_fin,
            "activo": True,
        }
        with self._lock:
            self._franjas_medico.setdefault(medico_id, []).append(franja)
        return franja

    def eliminar_franja_medico(self, medico_id: str, franja_id: str) -> bool:
        with self._lock:
            franjas = self._franjas_medico.get(medico_id, [])
            nuevas = [f for f in franjas if f["id"] != franja_id]
            if len(nuevas) == len(franjas):
                return False
            self._franjas_medico[medico_id] = nuevas
            return True

    # ------------------------------------------------------------------
    # Administradores
    # ------------------------------------------------------------------

    def obtener_perfil_admin(self, usuario_id: str) -> _PerfilAdmin | None:
        return self._perfiles_admin.get(usuario_id)

    # ------------------------------------------------------------------
    # Citas
    # ------------------------------------------------------------------

    def crear_cita(self, cita: _CitaReservada) -> _CitaReservada:
        with self._lock:
            self._citas[cita.id] = cita
        return cita

    def listar_citas_paciente(self, paciente_id: str) -> list[_CitaReservada]:
        return sorted(
            (c for c in self._citas.values() if c.paciente_id == paciente_id),
            key=lambda c: (c.fecha, c.hora),
            reverse=True,
        )

    def listar_citas_medico(self, medico_id: str) -> list[_CitaReservada]:
        return sorted(
            (c for c in self._citas.values() if c.medico_id == medico_id),
            key=lambda c: (c.fecha, c.hora),
        )

    def listar_citas_hospital(self, hospital_id: str) -> list[_CitaReservada]:
        return sorted(
            (c for c in self._citas.values() if c.hospital_id == hospital_id),
            key=lambda c: (c.fecha, c.hora),
            reverse=True,
        )

    def obtener_cita(self, cita_id: str) -> _CitaReservada | None:
        return self._citas.get(cita_id)

    def cancelar_cita(self, cita_id: str, paciente_id: str) -> bool:
        with self._lock:
            cita = self._citas.get(cita_id)
            if cita and cita.paciente_id == paciente_id and cita.estado not in ("Cancelada", "Completada"):
                cita.estado = "Cancelada"
                return True
        return False

    def actualizar_estado_cita(self, cita_id: str, nuevo_estado: str) -> bool:
        """Permite al médico marcar atención/inasistencia sobre sus citas."""
        with self._lock:
            cita = self._citas.get(cita_id)
            if not cita:
                return False
            cita.estado = nuevo_estado
            return True


# Singleton del repositorio en memoria
_repo: RepositorioDemo | None = None


def get_repo_demo() -> RepositorioDemo:
    """Devuelve la instancia única del repositorio demo."""
    global _repo
    if _repo is None:
        _repo = RepositorioDemo()
    return _repo
