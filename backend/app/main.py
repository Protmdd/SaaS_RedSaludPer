"""Aplicación FastAPI principal de RedSalud.

Inicializa la aplicación, configura CORS para el frontend Next.js, monta los
routers de la API v1 y expone un endpoint de salud para verificación de
disponibilidad. La configuración se carga desde variables de entorno; ver
`.env.example` para los valores requeridos.
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.v1 import admin, auth, catalogo, citas, disponibilidad, medico
from app.core.config import settings
from app.db.supabase import is_demo_mode


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Inicializa recursos al arrancar la app y los libera al detenerla."""
    # En el arranque podríamos pre-calentar caché de catálogos, validar
    # conexiones, etc. Por ahora simplemente registramos el modo de operación.
    print(f"[{settings.APP_NAME}] modo: {'demostración' if is_demo_mode() else 'producción'}")
    yield


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description=(
        "API REST de RedSalud, plataforma de coordinación de citas médicas "
        "entre establecimientos del MINSA y EsSalud."
    ),
    lifespan=lifespan,
)

# CORS: permite que el frontend Next.js consuma la API desde un dominio distinto
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Endpoints públicos del servicio
# ---------------------------------------------------------------------------


@app.get("/", tags=["Sistema"], summary="Información del servicio")
def root():
    return {
        "nombre": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "entorno": settings.ENVIRONMENT,
        "modo": "demostración" if is_demo_mode() else "producción",
        "documentacion": "/docs",
    }


@app.get("/salud", tags=["Sistema"], summary="Verificación de salud del servicio")
def salud():
    return JSONResponse({"estado": "ok"})


# ---------------------------------------------------------------------------
# Montaje de routers de la API v1
# ---------------------------------------------------------------------------

api_v1_prefix = "/api/v1"
app.include_router(auth.router, prefix=api_v1_prefix)
app.include_router(catalogo.router, prefix=api_v1_prefix)
app.include_router(disponibilidad.router, prefix=api_v1_prefix)
app.include_router(citas.router, prefix=api_v1_prefix)
app.include_router(medico.router, prefix=api_v1_prefix)
app.include_router(admin.router, prefix=api_v1_prefix)
