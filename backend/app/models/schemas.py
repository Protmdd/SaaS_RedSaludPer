"""Esquemas Pydantic del dominio.

Define las estructuras de datos que cruzan las fronteras del sistema (peticiones
HTTP, respuestas, contratos entre servicios). Mantener todos los esquemas en un
módulo único facilita la consistencia y evita ciclos de importación.
"""

from __future__ import annotations

from datetime import date, datetime, time
from enum import Enum

from pydantic import BaseModel, EmailStr, Field, field_validator


# ---------------------------------------------------------------------------
# Enumeraciones del dominio
# ---------------------------------------------------------------------------


class Rol(str, Enum):
    """Roles del sistema. Determina el alcance de operaciones permitidas.

    En esta versión se implementan completos tres perfiles: paciente, médico
    y administrador hospitalario. Los demás permanecen reservados para
    iteraciones posteriores.
    """

    PACIENTE = "paciente"
    MEDICO = "medico"
    ADMIN_HOSPITAL = "admin_hospital"
    # Reservados para futuras iteraciones
    ADMIN_CITAS = "admin_citas"
    DIRECTOR = "director"
    SOPORTE_TI = "soporte_ti"


# Rutas de inicio según el rol, consumidas por el frontend tras el login.
RUTA_INICIO_POR_ROL: dict[str, str] = {
    Rol.PACIENTE.value: "/portal",
    Rol.MEDICO.value: "/medico",
    Rol.ADMIN_HOSPITAL.value: "/admin",
}


class EstadoCita(str, Enum):
    PENDIENTE = "Pendiente"
    CONFIRMADA = "Confirmada"
    COMPLETADA = "Completada"
    CANCELADA = "Cancelada"
    NO_ASISTIO = "No asistió"
    REPROGRAMADA = "Reprogramada"


class EstadoReferencia(str, Enum):
    PENDIENTE = "Pendiente"
    ACEPTADA = "Aceptada"
    RECHAZADA = "Rechazada"
    COMPLETADA = "Completada"


class TipoInstitucion(str, Enum):
    MINSA = "MINSA"
    ESSALUD = "EsSalud"


class TipoSeguro(str, Enum):
    SIS = "SIS"
    ESSALUD = "EsSalud"
    PRIVADO = "Privado"
    NINGUNO = "Ninguno"


class Genero(str, Enum):
    MASCULINO = "Masculino"
    FEMENINO = "Femenino"
    OTRO = "Otro"


# ---------------------------------------------------------------------------
# Esquemas de autenticación
# ---------------------------------------------------------------------------


class TokenPair(BaseModel):
    """Par de tokens emitido tras un login exitoso."""

    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class TokenPayload(BaseModel):
    """Información extraída de un JWT validado."""

    sub: str
    rol: Rol
    email: str | None = None


class LoginUnificado(BaseModel):
    """Credenciales de inicio de sesión para cualquier rol.

    El mismo formulario sirve a pacientes, médicos y administradores. El
    identificador acepta DNI o correo; el backend resuelve el rol a partir
    del usuario encontrado.
    """

    identificador: str = Field(min_length=4, max_length=100)
    password: str = Field(min_length=8, max_length=72)


class UsuarioPublico(BaseModel):
    """Identidad mínima común a todos los roles, devuelta tras el login.

    Cada rol complementa esta base con su propio perfil detallado obtenido
    desde su endpoint correspondiente.
    """

    id: str
    rol: Rol
    nombres: str
    apellidos: str
    email: EmailStr
    ruta_inicio: str

    @property
    def nombre_completo(self) -> str:
        return f"{self.nombres} {self.apellidos}"


class SesionUsuario(BaseModel):
    """Respuesta de autenticación: identidad del usuario más sus tokens."""

    usuario: UsuarioPublico
    tokens: TokenPair


# ---------------------------------------------------------------------------
# Esquemas de paciente
# ---------------------------------------------------------------------------


class PacienteRegistro(BaseModel):
    """Datos requeridos para registrar un nuevo paciente.

    En producción, el DNI se validaría contra RENIEC para confirmar la identidad
    y autocompletar nombres. En el MVP se acepta lo declarado por el usuario.
    """

    dni: str = Field(min_length=8, max_length=8, pattern=r"^\d{8}$")
    nombres: str = Field(min_length=2, max_length=100)
    apellido_paterno: str = Field(min_length=2, max_length=50)
    apellido_materno: str = Field(min_length=2, max_length=50)
    fecha_nacimiento: date
    genero: Genero
    email: EmailStr
    celular: str = Field(min_length=9, max_length=15, pattern=r"^\+?\d{9,15}$")
    direccion: str | None = Field(default=None, max_length=200)
    distrito: str = Field(min_length=2, max_length=80)
    tipo_seguro: TipoSeguro
    password: str = Field(min_length=8, max_length=72)

    @field_validator("fecha_nacimiento")
    @classmethod
    def validar_edad(cls, v: date) -> date:
        edad = (date.today() - v).days / 365.25
        if edad < 0 or edad > 120:
            raise ValueError("Fecha de nacimiento fuera de rango")
        return v


class PacienteLogin(BaseModel):
    """Credenciales de inicio de sesión del paciente.

    Se acepta DNI o correo en el mismo campo para mayor flexibilidad.
    """

    identificador: str = Field(min_length=4, max_length=100)
    password: str = Field(min_length=8, max_length=72)


class PacientePublico(BaseModel):
    """Datos del paciente que pueden exponerse al cliente autenticado."""

    id: str
    dni: str
    nombres: str
    apellido_paterno: str
    apellido_materno: str
    email: EmailStr
    celular: str
    distrito: str
    tipo_seguro: TipoSeguro
    fecha_nacimiento: date
    genero: Genero

    @property
    def nombre_completo(self) -> str:
        return f"{self.nombres} {self.apellido_paterno} {self.apellido_materno}"


class PerfilPacienteDetalle(BaseModel):
    """Perfil completo del paciente para la vista de 'Mi perfil'.

    Combina la identidad del usuario con los datos del perfil de paciente.
    Los apellidos se exponen unidos en `apellidos` y también el nombre completo.
    """

    id: str
    dni: str
    nombres: str
    apellidos: str
    email: EmailStr
    celular: str
    direccion: str | None = None
    distrito: str
    tipo_seguro: TipoSeguro
    fecha_nacimiento: date
    genero: Genero


# ---------------------------------------------------------------------------
# Esquemas de búsqueda de citas y disponibilidad
# ---------------------------------------------------------------------------


class BusquedaDisponibilidad(BaseModel):
    """Criterios de búsqueda del paciente para encontrar disponibilidad de citas."""

    especialidad: str = Field(min_length=2, max_length=80)
    distrito: str | None = Field(default=None, max_length=80)
    fecha_desde: date | None = None
    fecha_hasta: date | None = None
    tipo_institucion: TipoInstitucion | None = None
    latitud: float | None = Field(default=None, ge=-90, le=90)
    longitud: float | None = Field(default=None, ge=-180, le=180)
    radio_km: float | None = Field(default=None, gt=0, le=50)


class CupoDisponible(BaseModel):
    """Un cupo de cita disponible en un establecimiento."""

    hospital_id: str
    hospital_nombre: str
    hospital_tipo: TipoInstitucion
    hospital_distrito: str
    hospital_latitud: float | None = None
    hospital_longitud: float | None = None
    distancia_km: float | None = None
    medico_id: str
    medico_nombre: str
    especialidad: str
    fecha: date
    hora: time
    cupos_disponibles: int


# ---------------------------------------------------------------------------
# Esquemas de citas
# ---------------------------------------------------------------------------


class CitaCreacion(BaseModel):
    """Datos para reservar una nueva cita."""

    medico_id: str
    hospital_id: str
    fecha: date
    hora: time
    motivo: str | None = Field(default=None, max_length=500)


class CitaPublica(BaseModel):
    """Vista de una cita expuesta al paciente o al backoffice."""

    id: str
    numero_cita: str
    fecha: date
    hora: time
    estado: EstadoCita
    paciente_id: str
    paciente_nombre: str
    medico_id: str
    medico_nombre: str
    especialidad: str
    hospital_id: str
    hospital_nombre: str
    hospital_direccion: str | None = None
    consultorio: str | None = None
    motivo: str | None = None
    creada_en: datetime


# ---------------------------------------------------------------------------
# Esquemas de catálogo
# ---------------------------------------------------------------------------


class EspecialidadPublica(BaseModel):
    id: str
    nombre: str
    descripcion: str | None = None


class HospitalPublico(BaseModel):
    id: str
    nombre: str
    tipo: TipoInstitucion
    distrito: str
    direccion: str | None = None
    telefono: str | None = None
    latitud: float | None = None
    longitud: float | None = None


# ---------------------------------------------------------------------------
# Esquemas de respuesta genéricos
# ---------------------------------------------------------------------------


class MensajeRespuesta(BaseModel):
    """Respuesta genérica para operaciones que solo confirman éxito."""

    mensaje: str
    detalle: str | None = None


# ---------------------------------------------------------------------------
# Esquemas del perfil médico
# ---------------------------------------------------------------------------


class MedicoPublico(BaseModel):
    """Perfil del médico autenticado o listado en gestión hospitalaria."""

    id: str
    nombres: str
    apellidos: str
    email: EmailStr
    colegiatura: str
    especialidad: str
    hospital_id: str
    hospital_nombre: str
    activo: bool = True

    @property
    def nombre_completo(self) -> str:
        return f"{self.nombres} {self.apellidos}"


class CitaAgendaMedico(BaseModel):
    """Una cita tal como la ve el médico en su agenda."""

    id: str
    numero_cita: str
    fecha: date
    hora: time
    estado: EstadoCita
    paciente_nombre: str
    paciente_dni: str
    especialidad: str
    consultorio: str | None = None
    motivo: str | None = None


class FranjaHorario(BaseModel):
    """Franja de disponibilidad declarada por el médico."""

    id: str
    dia_semana: int = Field(ge=0, le=6, description="0=lunes ... 6=domingo")
    hora_inicio: time
    hora_fin: time
    activo: bool = True


class FranjaHorarioCreacion(BaseModel):
    """Datos para crear o actualizar una franja de disponibilidad."""

    dia_semana: int = Field(ge=0, le=6)
    hora_inicio: time
    hora_fin: time

    @field_validator("hora_fin")
    @classmethod
    def validar_rango(cls, v: time, info) -> time:
        inicio = info.data.get("hora_inicio")
        if inicio and v <= inicio:
            raise ValueError("La hora de fin debe ser posterior a la de inicio")
        return v


class ResumenMedico(BaseModel):
    """Indicadores rápidos para el panel del médico."""

    citas_hoy: int
    citas_semana: int
    proxima_cita: CitaAgendaMedico | None = None
    pacientes_atendidos_mes: int


# ---------------------------------------------------------------------------
# Esquemas del perfil administrador hospitalario
# ---------------------------------------------------------------------------


class AdminPublico(BaseModel):
    """Perfil del administrador hospitalario autenticado."""

    id: str
    nombres: str
    apellidos: str
    email: EmailStr
    cargo: str
    hospital_id: str
    hospital_nombre: str

    @property
    def nombre_completo(self) -> str:
        return f"{self.nombres} {self.apellidos}"


class MedicoCreacion(BaseModel):
    """Datos para dar de alta un médico en el establecimiento."""

    nombres: str = Field(min_length=2, max_length=100)
    apellidos: str = Field(min_length=2, max_length=100)
    email: EmailStr
    colegiatura: str = Field(min_length=4, max_length=20)
    especialidad: str = Field(min_length=2, max_length=80)
    password: str = Field(min_length=8, max_length=72)


class CitaSupervisbion(BaseModel):
    """Cita vista desde la supervisión del administrador hospitalario."""

    id: str
    numero_cita: str
    fecha: date
    hora: time
    estado: EstadoCita
    paciente_nombre: str
    medico_nombre: str
    especialidad: str


class KPIHospital(BaseModel):
    """Indicadores agregados del establecimiento para el panel de administración."""

    total_medicos: int
    total_citas: int
    citas_hoy: int
    tasa_ocupacion: float = Field(description="Porcentaje de cupos ocupados (0-100)")
    tasa_ausentismo: float = Field(description="Porcentaje de citas no asistidas (0-100)")
    citas_por_especialidad: dict[str, int]
    citas_por_estado: dict[str, int]
    tendencia_semanal: list[int] = Field(description="Citas por día, últimos 7 días")
