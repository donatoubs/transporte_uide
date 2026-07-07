"""
Modelos Pydantic para validación de datos de viajes
"""
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class ViajeIniciarRequest(BaseModel):
    """Solicitud para iniciar un viaje (escaneo QR)"""
    bus_id: str = Field(..., description="ID del bus escaneado")
    route_id: str = Field(..., description="ID de la ruta")
    start_latitude: Optional[float] = Field(None, description="Latitud de subida")
    start_longitude: Optional[float] = Field(None, description="Longitud de subida")
    start_address: Optional[str] = Field(None, description="Dirección de subida")


class ViajeFinalizarRequest(BaseModel):
    """Solicitud para finalizar un viaje"""
    latitude: float = Field(..., description="Latitud de bajada")
    longitude: float = Field(..., description="Longitud de bajada")
    address: Optional[str] = Field(None, description="Dirección de bajada")


class ViajeResponse(BaseModel):
    """Respuesta con información del viaje"""
    id: int
    estudiante_id: str
    ruta_id: int
    nombre_ruta: Optional[str] = None
    fecha_hora_subida: Optional[datetime] = None
    fecha_hora_bajada: Optional[datetime] = None
    estado: str
    direccion_subida: Optional[str] = None
    direccion_aproximada: Optional[str] = None
    
    class Config:
        from_attributes = True
