# RedSalud

Plataforma de coordinación de citas médicas centrada en el paciente, dirigida
a establecimientos del MINSA y EsSalud en Lima Metropolitana. Permite a los
pacientes registrarse, buscar disponibilidad en múltiples hospitales en
tiempo real, y reservar y gestionar sus citas desde una interfaz web.

Esta es la **arquitectura de producción**  implementa la separación profesional entre
frontend (Next.js), backend (FastAPI) y base de datos (Supabase) que
permite escalar, asegurar y evolucionar cada componente de manera
independiente.

## Características

La plataforma implementa **tres perfiles de usuario** con áreas segregadas:

**Paciente**
- Registro y autenticación con validación estricta y JWT.
- Búsqueda multi-hospital con cálculo de distancia geodésica y orden por
  proximidad cuando el paciente comparte su ubicación.
- Reserva de citas sobre horarios reales con verificación de disponibilidad
  atómica para evitar reservas dobles.
- Gestión de citas propias: listado de próximas y pasadas, cancelación con
  confirmación inmediata.
- Perfil personal con datos registrados.

**Médico**
- Panel con indicadores rápidos (citas de hoy, de la semana, atendidos del mes).
- Agenda de citas programadas con registro de atención (marcar atendida o
  inasistencia).
- Gestión de franjas de disponibilidad por día de la semana.

**Administrador hospitalario**
- Tablero de indicadores del establecimiento (médicos, ocupación, ausentismo)
  con gráficos de citas por especialidad y tendencia semanal.
- Gestión de médicos adscritos: alta de nuevos profesionales y activación.
- Supervisión de todas las citas del establecimiento con búsqueda.

**Transversal**
- Login unificado que redirige a cada usuario al área que corresponde a su rol.
- API REST documentada automáticamente vía OpenAPI/Swagger.
- Modo demostración que opera sin Supabase, con datos sintéticos realistas
  (hospitales reales de Lima con coordenadas GPS) y **usuarios semilla de
  cada rol** listos para usar.

## Cuentas de demostración

El sistema arranca en modo demostración con tres cuentas precargadas, una por
rol. Se puede iniciar sesión con el correo o el DNI indicado:

| Rol | Correo | DNI | Contraseña | Área |
| --- | --- | --- | --- | --- |
| Paciente | `paciente@demo.pe` | `10000001` | `paciente123` | `/portal` |
| Médico | `medico@demo.pe` | `20000002` | `medico123` | `/medico` |
| Administrador | `admin@demo.pe` | `30000003` | `admin123` | `/admin` |

Estas cuentas se regeneran en cada arranque del backend, por lo que siempre
están disponibles. Los pacientes registrados durante la sesión y las citas
creadas se mantienen en memoria hasta reiniciar el servidor.

## Arquitectura

```
┌─────────────────┐         ┌──────────────────┐         ┌──────────────┐
│                 │  HTTP   │                  │  HTTPS  │              │
│  Frontend       ├────────►│  Backend API     ├────────►│  Supabase    │
│  Next.js 14     │  JWT    │  FastAPI         │         │  PostgreSQL  │
│  Tailwind       │         │  Pydantic        │         │              │
│  React Query    │         │  JWT             │         │              │
└─────────────────┘         └──────────────────┘         └──────────────┘
       :3000                       :8000                    Supabase Cloud
```

### Capas y responsabilidades

| Capa | Tecnología | Responsabilidad |
| --- | --- | --- |
| Presentación | Next.js 14, Tailwind, shadcn/ui | Interfaz, validación de formularios, estado cliente |
| Aplicación | FastAPI, Pydantic v2 | Endpoints REST, autenticación, lógica de negocio |
| Datos | Supabase (PostgreSQL) | Persistencia transaccional, control de acceso a fila |
| Cache | Redis (opcional) | Caché distribuido para consultas recurrentes |
| Hosting | Docker, Vercel, AWS/GCP | Despliegue containerizado, escalado horizontal |


## Estructura del repositorio

```
redsalud/
├── backend/                    API FastAPI
│   ├── app/
│   │   ├── main.py             Entrypoint y configuración
│   │   ├── core/               Configuración y seguridad (JWT, hashing)
│   │   ├── api/v1/             Endpoints REST agrupados por dominio
│   │   ├── services/           Lógica de negocio
│   │   ├── db/                 Cliente Supabase + repo demo en memoria
│   │   └── models/schemas.py   Contratos Pydantic
│   ├── requirements.txt
│   ├── Dockerfile
│   ├── .env.example
│   └── README.md
├── frontend/                   Aplicación Next.js
│   ├── app/                    Rutas (App Router)
│   │   ├── page.tsx            Landing
│   │   ├── ingresar/           Login
│   │   ├── registro/           Registro
│   │   └── portal/             Portal autenticado del paciente
│   ├── components/             Componentes reutilizables
│   │   ├── ui/                 Primitivos (Button, Card, Input, etc.)
│   │   └── providers.tsx       Provider raíz (React Query + Toaster)
│   ├── lib/                    Utilidades, cliente HTTP, store de auth
│   ├── package.json
│   ├── tailwind.config.js
│   ├── Dockerfile
│   └── .env.local.example
├── docker-compose.yml          Orquestación local
├── .env.example
└── README.md
```

## Instalación y ejecución

### Opción 1: Docker Compose (recomendada)

Requiere Docker y Docker Compose instalados.

```bash
# Clonar el repositorio
git clone https://github.com/<usuario>/redsalud.git
cd redsalud

# Configurar variables de entorno
cp .env.example .env
# Editar .env y completar SECRET_KEY y credenciales de Supabase (opcional)

# Levantar todos los servicios
docker compose up --build
```

- Frontend disponible en `http://localhost:3000`
- Backend disponible en `http://localhost:8000`
- Documentación interactiva en `http://localhost:8000/docs`

### Opción 2: Ejecución local (sin Docker)

**Backend:**

```bash
cd backend
python -m venv .venv
source .venv/bin/activate            # En Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload
```

**Frontend** (en otra terminal):

```bash
cd frontend
npm install
cp .env.local.example .env.local
npm run dev
```

## Conexión a Supabase

El backend opera por defecto en **modo demostración** con datos sintéticos
en memoria, lo que permite ejecutar y evaluar el sistema sin configuración
adicional.

Para conectar a una base Supabase real:

1. Crear un proyecto en [supabase.com](https://supabase.com).
2. Ejecutar el script SQL del esquema (incluido en el proyecto anterior).
3. Obtener `Project URL`, `anon public key` y `service_role key` desde
   `Settings → API`.
4. Completar `.env` raíz con esas credenciales.
5. Reiniciar el backend.

## Despliegue en producción

### Frontend en Vercel

```bash
cd frontend
vercel
# Configurar NEXT_PUBLIC_API_URL con la URL pública del backend
```

### Backend en Google Cloud Run / AWS App Runner

```bash
cd backend
docker build -t redsalud-api .
# Push a registro de contenedores y desplegar
```

Configurar las variables de entorno en el panel del servicio: `SECRET_KEY`,
`SUPABASE_URL`, `SUPABASE_KEY`, `SUPABASE_SERVICE_KEY` y `CORS_ORIGINS`
apuntando al dominio del frontend.

## Endpoints principales

| Método | Ruta | Descripción |
| --- | --- | --- |
| `POST` | `/api/v1/auth/registro` | Registro de paciente |
| `POST` | `/api/v1/auth/login` | Inicio de sesión |
| `GET` | `/api/v1/auth/yo` | Perfil del paciente autenticado |
| `GET` | `/api/v1/catalogo/especialidades` | Listar especialidades |
| `GET` | `/api/v1/catalogo/hospitales` | Listar establecimientos |
| `POST` | `/api/v1/disponibilidad/buscar` | Búsqueda multi-hospital de cupos |
| `POST` | `/api/v1/citas/` | Reservar cita |
| `GET` | `/api/v1/citas/` | Listar citas del paciente |
| `DELETE` | `/api/v1/citas/{id}` | Cancelar cita |

## Roadmap

**Implementado:**
- Registro y autenticación de pacientes con JWT
- Búsqueda de disponibilidad multi-hospital con geolocalización
- Reserva, listado y cancelación de citas
- Portal del paciente responsivo

**Próximas iteraciones:**
- Integración con RENIEC para validación de identidad en el registro
  (requiere convenio y autorización formal).
- Notificaciones reales por SMS (Twilio) y correo (SendGrid).
- Backoffice administrativo para médicos y personal hospitalario.
- Referencias interinstitucionales MINSA ↔ EsSalud.
- Historial clínico compartido entre establecimientos.
- Aplicación móvil nativa (React Native o Flutter).

## Decisiones técnicas

- **Next.js 14 (App Router)** sobre React puro: enrutamiento integrado,
  SSR donde conviene, mejor performance percibida.
- **shadcn/ui + Tailwind** sobre Material UI: control visual sin
  apariencia genérica, sin lock-in de librería.
- **FastAPI** sobre Flask: validación automática con Pydantic,
  documentación OpenAPI gratuita, async nativo.
- **JWT propio** sobre Supabase Auth: el backend mantiene la fuente única
  de verdad sobre identidad; Supabase se usa solo como base de datos.
- **Leaflet** sobre Google Maps: sin API key, sin costo por uso, suficiente
  para mostrar hospitales en mapa.

## Licencia

Proyecto académico para curso de infraestructura tecnológica.
