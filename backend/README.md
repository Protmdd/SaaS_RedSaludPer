# RedSalud API

API REST de la plataforma RedSalud, construida con FastAPI. Provee
autenticación de pacientes, búsqueda de disponibilidad multi-hospital,
gestión de citas y catálogos.

## Requisitos

- Python 3.10 o superior

## Instalación

```bash
python -m venv .venv
source .venv/bin/activate   # En Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
```

Edite `.env` con sus credenciales de Supabase (opcional; sin ellas la API
arranca en modo demostración con datos sintéticos).

## Ejecución

```bash
uvicorn app.main:app --reload
```

La API queda disponible en `http://localhost:8000`. La documentación
interactiva está en `http://localhost:8000/docs`.

## Estructura

```
app/
├── main.py                 Entrypoint FastAPI
├── core/
│   ├── config.py           Configuración con Pydantic Settings
│   └── security.py         Hashing y JWT
├── api/
│   ├── deps.py             Dependencias FastAPI (auth)
│   └── v1/
│       ├── auth.py         Registro y login
│       ├── catalogo.py     Hospitales y especialidades
│       ├── disponibilidad.py  Búsqueda de cupos
│       └── citas.py        Reserva, listado, cancelación
├── services/               Lógica de negocio
├── db/                     Cliente Supabase + repo demo
└── models/schemas.py       Esquemas Pydantic del dominio
```

## Endpoints principales

- `POST /api/v1/auth/registro` — registro de paciente
- `POST /api/v1/auth/login` — inicio de sesión
- `GET  /api/v1/auth/yo` — perfil del paciente autenticado
- `GET  /api/v1/catalogo/especialidades` — lista de especialidades
- `GET  /api/v1/catalogo/hospitales` — lista de establecimientos
- `POST /api/v1/disponibilidad/buscar` — búsqueda multi-hospital
- `POST /api/v1/citas/` — reservar cita
- `GET  /api/v1/citas/` — listar citas del paciente
- `DELETE /api/v1/citas/{id}` — cancelar cita

## Despliegue

Ver `Dockerfile` y `docker-compose.yml` en la raíz del proyecto.
