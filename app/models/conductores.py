"""
Modelos Pydantic para validación de datos de conductores
"""
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class ConductorLoginRequest(BaseModel):
    """Solicitud de login del conductor con PIN"""
    pin: str = Field(..., min_length=4, max_length=4, description="PIN de 4 dígitos")


class ConductorResponse(BaseModel):
    """Datos del conductor autenticado"""
    id: int
    nombre: str
    bus_asignado: str


class JornadaIniciarRequest(BaseModel):
    """Solicitud para iniciar jornada laboral"""
    conductor_id: int = Field(..., description="ID del conductor")
    ruta_id: int = Field(..., description="ID de la ruta asignada")


class JornadaResponse(BaseModel):
    """Información de una jornada"""
    id: int
    inicio: Optional[datetime] = None
    estudiantes_transportados: int = 0
    estado: Optional[str] = None
    ruta_id: Optional[int] = None
    
    class Config:
        from_attributes = True


class JornadaFinalizarResponse(BaseModel):
    """Resumen al finalizar jornada"""
    status: str
    mensaje: str
    estudiantes: int
    duracion_minutos: int
