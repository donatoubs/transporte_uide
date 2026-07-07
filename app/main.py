"""
Bus Connect API - Sistema de Gestión de Transporte Universitario UIDE

Autor: Donato Oña
Versión: 1.0.0
Descripción: Backend profesional para gestión de transporte universitario
             con registro de viajes, control de conductores y estadísticas.
"""
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
import logging

# Importar configuración
from app.config import APIConfig
from app.database import init_connection_pool

# Importar routers
from app.routers import viajes, conductor, estadisticas

# Configurar logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


# =============================================================================
# INICIALIZACIÓN DE LA APLICACIÓN
# =============================================================================

app = FastAPI(
    title=APIConfig.TITLE,
    description=APIConfig.DESCRIPTION,
    version=APIConfig.VERSION,
    docs_url="/docs",      # Swagger UI
    redoc_url="/redoc"     # ReDoc
)

# Configurar CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=APIConfig.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=APIConfig.CORS_METHODS,
    allow_headers=APIConfig.CORS_HEADERS,
)


# =============================================================================
# EVENTOS DE INICIO Y CIERRE
# =============================================================================

@app.on_event("startup")
async def startup_event():
    """Se ejecuta al iniciar el servidor"""
    logger.info("🚌 Iniciando Bus Connect API...")
    init_connection_pool()
    logger.info("✅ API lista para recibir peticiones")


@app.on_event("shutdown")
async def shutdown_event():
    """Se ejecuta al cerrar el servidor"""
    logger.info("🛑 Cerrando Bus Connect API...")


# =============================================================================
# REGISTRAR ROUTERS
# =============================================================================

# Endpoints de viajes
app.include_router(viajes.router)

# Endpoints del conductor
app.include_router(conductor.router)

# Endpoints de estadísticas, horarios y rutas
app.include_router(estadisticas.router)


# =============================================================================
# ENDPOINTS ADICIONALES
# =============================================================================

@app.get("/", tags=["Dashboard"])
def home():
    """Sirve el dashboard web principal"""
    return FileResponse("static/index.html")


@app.get("/health", tags=["Sistema"])
def health_check():
    """Endpoint para verificar que el servidor está funcionando"""
    return {"status": "ok", "message": "Bus Connect API funcionando correctamente"}


# =============================================================================
# ARCHIVOS ESTÁTICOS
# =============================================================================

# Servir archivos estáticos (CSS, JS, imágenes del dashboard) en la raíz
app.mount("/", StaticFiles(directory="static", html=True), name="static")


# =============================================================================
# EJECUCIÓN DIRECTA
# =============================================================================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
