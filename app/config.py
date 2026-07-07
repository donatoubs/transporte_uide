import os
from dotenv import load_dotenv

# Cargar variables de entorno desde un archivo .env si existe
load_dotenv()

class APIConfig:
    TITLE = "Bus Connect API"
    DESCRIPTION = "Sistema de Gestión de Transporte Universitario UIDE"
    VERSION = "1.0.0"
    
    # Configuración de Base de Datos
    DB_HOST = os.getenv("DB_HOST", "localhost")
    DB_USER = os.getenv("DB_USER", "root")
    DB_PASSWORD = os.getenv("DB_PASSWORD", "donato123")
    DB_DATABASE = os.getenv("DB_DATABASE", "transporte_uide")
    DB_POOL_NAME = "bus_connect_pool"
    DB_POOL_SIZE = 5
    
    # Configuración de CORS
    CORS_ORIGINS = ["*"]
    CORS_METHODS = ["*"]
    CORS_HEADERS = ["*"]
