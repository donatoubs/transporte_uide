"""
Router para endpoints de Viajes
Maneja el registro y consulta de viajes de estudiantes
"""
from fastapi import APIRouter, HTTPException
from datetime import datetime
import logging

from app.database import get_db_cursor
from app.models.viajes import ViajeIniciarRequest, ViajeFinalizarRequest

# Configurar logger
logger = logging.getLogger(__name__)

# Crear router con prefijo y tags para documentación
router = APIRouter(
    prefix="/api/viajes",
    tags=["Viajes"],
    responses={500: {"description": "Error interno del servidor"}}
)


@router.post("/iniciar")
def iniciar_viaje(dato: ViajeIniciarRequest):
    """
    Inicia un nuevo viaje cuando el estudiante escanea el QR.
    Registra la ubicación GPS de subida y actualiza el contador del conductor.
    """
    logger.info(f"📩 Iniciando viaje: Bus={dato.bus_id}, Ruta={dato.route_id}")
    
    try:
        with get_db_cursor() as cursor:
            # Insertar viaje con ubicación de subida
            cursor.execute("""
                INSERT INTO viajes (estudiante_id, ruta_id, fecha_hora_subida, 
                                   latitud_subida, longitud_subida, direccion_subida, estado) 
                VALUES (%s, %s, NOW(), %s, %s, %s, 'EN_CURSO')
            """, (dato.bus_id, dato.route_id, dato.start_latitude, 
                  dato.start_longitude, dato.start_address))
            
            nuevo_id = cursor.lastrowid
            
            # Incrementar contador de jornada activa para esta ruta
            cursor.execute("""
                UPDATE jornadas 
                SET estudiantes_transportados = estudiantes_transportados + 1
                WHERE ruta_id = %s AND estado = 'EN_CURSO'
            """, (dato.route_id,))
            
            conductor_actualizado = cursor.rowcount > 0
            
        logger.info(f"✅ Viaje #{nuevo_id} registrado. Conductor actualizado: {conductor_actualizado}")
        
        return {
            "status": "exito",
            "mensaje": "Viaje iniciado correctamente",
            "viaje_id": nuevo_id,
            "conductor_actualizado": conductor_actualizado
        }
        
    except Exception as err:
        logger.error(f"❌ Error al iniciar viaje: {err}")
        raise HTTPException(status_code=500, detail=str(err))


@router.put("/finalizar/{viaje_id}")
def finalizar_viaje(viaje_id: int, dato: ViajeFinalizarRequest):
    """
    Finaliza un viaje registrando la ubicación de bajada.
    """
    logger.info(f"📍 Finalizando viaje #{viaje_id}")
    
    try:
        with get_db_cursor() as cursor:
            cursor.execute("""
                UPDATE viajes 
                SET fecha_hora_bajada = NOW(),
                    latitud = %s,
                    longitud = %s,
                    direccion_aproximada = %s,
                    estado = 'FINALIZADO'
                WHERE id = %s
            """, (dato.latitude, dato.longitude, dato.address, viaje_id))
            
            if cursor.rowcount == 0:
                raise HTTPException(status_code=404, detail="Viaje no encontrado")
        
        logger.info(f"✅ Viaje #{viaje_id} finalizado")
        
        return {
            "status": "exito",
            "mensaje": "Viaje finalizado correctamente",
            "viaje_id": viaje_id
        }
        
    except HTTPException:
        raise
    except Exception as err:
        logger.error(f"❌ Error al finalizar viaje: {err}")
        raise HTTPException(status_code=500, detail=str(err))


@router.get("/")
def listar_viajes(fecha: str = "todos", estado: str = "todos"):
    """
    Lista los viajes con filtros opcionales por fecha y estado.
    """
    try:
        with get_db_cursor() as cursor:
            # Construir query con filtros
            query = """
                SELECT v.id, v.estudiante_id, v.ruta_id, v.fecha_hora_subida, 
                       v.fecha_hora_bajada, v.latitud, v.longitud, 
                       v.direccion_aproximada, v.estado, r.nombre_ruta,
                       v.latitud_subida, v.longitud_subida, v.direccion_subida
                FROM viajes v
                LEFT JOIN rutas r ON v.ruta_id = r.id
                WHERE 1=1
            """
            params = []
            
            # Filtro por fecha
            if fecha == "hoy":
                query += " AND DATE(v.fecha_hora_subida) = CURDATE()"
            elif fecha == "ayer":
                query += " AND DATE(v.fecha_hora_subida) = DATE_SUB(CURDATE(), INTERVAL 1 DAY)"
            elif fecha == "semana":
                query += " AND v.fecha_hora_subida >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)"
            
            # Filtro por estado
            if estado != "todos":
                query += " AND v.estado = %s"
                params.append(estado)
            
            query += " ORDER BY v.fecha_hora_subida DESC LIMIT 100"
            
            cursor.execute(query, params)
            viajes = cursor.fetchall()
            
            # Convertir datetime a string para JSON
            for viaje in viajes:
                for key, value in viaje.items():
                    if isinstance(value, datetime):
                        viaje[key] = value.isoformat()
            
            return {"viajes": viajes}
            
    except Exception as err:
        logger.error(f"❌ Error al listar viajes: {err}")
        raise HTTPException(status_code=500, detail=str(err))

