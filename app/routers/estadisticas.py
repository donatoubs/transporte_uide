"""
Router para endpoints de Estadísticas y Datos
Proporciona métricas para el dashboard
"""
from fastapi import APIRouter, HTTPException
from datetime import datetime
import logging

from app.database import get_db_cursor

# Configurar logger
logger = logging.getLogger(__name__)

# Crear router
router = APIRouter(
    prefix="/api",
    tags=["Estadísticas"],
    responses={500: {"description": "Error interno del servidor"}}
)


@router.get("/estadisticas")
def obtener_estadisticas():
    """
    Obtiene estadísticas generales para el dashboard:
    - Total de viajes
    - Viajes de hoy
    - Rutas activas
    - Tiempo promedio de viaje
    """
    try:
        with get_db_cursor() as cursor:
            # Total de viajes
            cursor.execute("SELECT COUNT(*) as total FROM viajes")
            total_viajes = cursor.fetchone()['total']
            
            # Viajes de hoy
            cursor.execute("""
                SELECT COUNT(*) as total FROM viajes 
                WHERE DATE(fecha_hora_subida) = CURDATE()
            """)
            viajes_hoy = cursor.fetchone()['total']
            
            # Rutas activas
            cursor.execute("SELECT COUNT(DISTINCT ruta_id) as total FROM viajes")
            rutas_activas = cursor.fetchone()['total']
            
            # Tiempo promedio
            cursor.execute("""
                SELECT AVG(TIMESTAMPDIFF(MINUTE, fecha_hora_subida, fecha_hora_bajada)) as promedio 
                FROM viajes 
                WHERE fecha_hora_bajada IS NOT NULL
            """)
            result = cursor.fetchone()
            tiempo_promedio = result['promedio'] if result['promedio'] else 0
            
            tiempo_str = f"{int(tiempo_promedio)} min" if tiempo_promedio > 0 else "--"
            
        return {
            "total_viajes": total_viajes,
            "viajes_hoy": viajes_hoy,
            "rutas_activas": rutas_activas,
            "tiempo_promedio": tiempo_str
        }
        
    except Exception as err:
        logger.error(f"❌ Error al obtener estadísticas: {err}")
        raise HTTPException(status_code=500, detail=str(err))


@router.get("/horarios")
def obtener_horarios():
    """
    Obtiene todos los horarios de salida agrupados por hora.
    """
    try:
        with get_db_cursor() as cursor:
            cursor.execute("""
                SELECT h.hora_salida, r.nombre_ruta, r.id as ruta_id
                FROM horarios h
                JOIN rutas r ON h.ruta_id = r.id
                ORDER BY h.hora_salida, r.nombre_ruta
            """)
            
            rows = cursor.fetchall()
            
            # Agrupar por hora
            horarios_agrupados = {}
            for row in rows:
                hora = str(row['hora_salida'])
                if hora not in horarios_agrupados:
                    horarios_agrupados[hora] = []
                horarios_agrupados[hora].append({
                    "ruta_id": row['ruta_id'],
                    "nombre_ruta": row['nombre_ruta']
                })
            
            # Convertir a lista ordenada
            resultado = [
                {"hora": hora, "rutas": rutas}
                for hora, rutas in sorted(horarios_agrupados.items())
            ]
            
        return {"horarios": resultado}
        
    except Exception as err:
        logger.error(f"❌ Error al obtener horarios: {err}")
        raise HTTPException(status_code=500, detail=str(err))


@router.get("/rutas")
def obtener_rutas():
    """
    Obtiene todas las rutas disponibles para el selector del conductor.
    """
    try:
        with get_db_cursor() as cursor:
            cursor.execute("SELECT id, nombre_ruta FROM rutas ORDER BY nombre_ruta")
            rutas = cursor.fetchall()
            
        return {"rutas": rutas}
        
    except Exception as err:
        logger.error(f"❌ Error al obtener rutas: {err}")
        raise HTTPException(status_code=500, detail=str(err))


@router.get("/jornadas/activas")
def obtener_jornadas_activas():
    """
    Obtiene las jornadas de conductor que están actualmente en curso.
    """
    try:
        with get_db_cursor() as cursor:
            cursor.execute("""
                SELECT j.*, c.nombre as nombre_conductor, r.nombre_ruta
                FROM jornadas j
                LEFT JOIN conductores c ON j.conductor_id = c.id
                LEFT JOIN rutas r ON j.ruta_id = r.id
                WHERE j.estado = 'EN_CURSO'
                ORDER BY j.fecha_hora_inicio DESC
            """)
            jornadas = cursor.fetchall()
            
            # Convertir objetos datetime a formato ISO string para JSON
            for j in jornadas:
                for key, value in j.items():
                    if isinstance(value, datetime):
                        j[key] = value.isoformat()
            
        return {"jornadas": jornadas}
        
    except Exception as err:
        logger.error(f"❌ Error al obtener jornadas activas: {err}")
        raise HTTPException(status_code=500, detail=str(err))

