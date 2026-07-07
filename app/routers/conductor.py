"""
Router para endpoints del Conductor
Maneja autenticación, jornadas y conteo de estudiantes
"""
from fastapi import APIRouter, HTTPException
from datetime import datetime
import logging

from app.database import get_db_cursor
from app.models.conductores import (
    ConductorLoginRequest, 
    JornadaIniciarRequest
)

# Configurar logger
logger = logging.getLogger(__name__)

# Crear router
router = APIRouter(
    prefix="/api/conductor",
    tags=["Conductor"],
    responses={500: {"description": "Error interno del servidor"}}
)


@router.post("/login")
def login_conductor(dato: ConductorLoginRequest):
    """
    Valida el PIN del conductor y devuelve sus datos.
    """
    logger.info(f"🔐 Intento de login de conductor")
    
    try:
        with get_db_cursor() as cursor:
            cursor.execute("""
                SELECT id, nombre, bus_asignado 
                FROM conductores 
                WHERE pin = %s
            """, (dato.pin,))
            
            conductor = cursor.fetchone()
            
            if not conductor:
                raise HTTPException(status_code=401, detail="PIN incorrecto")
            
        logger.info(f"✅ Conductor {conductor['nombre']} autenticado")
        
        return {
            "status": "exito",
            "conductor": conductor
        }
        
    except HTTPException:
        raise
    except Exception as err:
        logger.error(f"❌ Error en login: {err}")
        raise HTTPException(status_code=500, detail=str(err))


@router.post("/jornada/iniciar")
def iniciar_jornada(dato: JornadaIniciarRequest):
    """
    Inicia la jornada laboral del conductor con la ruta asignada.
    """
    logger.info(f"🚌 Iniciando jornada: Conductor={dato.conductor_id}, Ruta={dato.ruta_id}")
    
    try:
        with get_db_cursor() as cursor:
            # Verificar si ya tiene jornada activa
            cursor.execute("""
                SELECT id FROM jornadas 
                WHERE conductor_id = %s AND estado = 'EN_CURSO'
            """, (dato.conductor_id,))
            
            if cursor.fetchone():
                raise HTTPException(status_code=400, detail="Ya tienes una jornada activa")
            
            # Crear nueva jornada
            cursor.execute("""
                INSERT INTO jornadas (conductor_id, ruta_id, fecha_hora_inicio, 
                                     estudiantes_transportados, estado)
                VALUES (%s, %s, NOW(), 0, 'EN_CURSO')
            """, (dato.conductor_id, dato.ruta_id))
            
            jornada_id = cursor.lastrowid
            
        logger.info(f"✅ Jornada #{jornada_id} iniciada")
        
        return {
            "status": "exito",
            "mensaje": "Jornada iniciada correctamente",
            "jornada_id": jornada_id
        }
        
    except HTTPException:
        raise
    except Exception as err:
        logger.error(f"❌ Error al iniciar jornada: {err}")
        raise HTTPException(status_code=500, detail=str(err))


@router.put("/jornada/finalizar/{jornada_id}")
def finalizar_jornada(jornada_id: int):
    """
    Finaliza la jornada laboral y devuelve resumen.
    """
    logger.info(f"🏁 Finalizando jornada #{jornada_id}")
    
    try:
        with get_db_cursor() as cursor:
            # Finalizar jornada
            cursor.execute("""
                UPDATE jornadas 
                SET estado = 'FINALIZADO', fecha_hora_fin = NOW()
                WHERE id = %s AND estado = 'EN_CURSO'
            """, (jornada_id,))
            
            if cursor.rowcount == 0:
                raise HTTPException(
                    status_code=404, 
                    detail="Jornada no encontrada o ya finalizada"
                )
            
            # Obtener resumen
            cursor.execute("""
                SELECT estudiantes_transportados, 
                       TIMESTAMPDIFF(MINUTE, fecha_hora_inicio, fecha_hora_fin) as duracion
                FROM jornadas WHERE id = %s
            """, (jornada_id,))
            
            resumen = cursor.fetchone()
            
        logger.info(f"✅ Jornada #{jornada_id} finalizada")
        
        return {
            "status": "exito",
            "mensaje": "Jornada finalizada",
            "estudiantes": resumen['estudiantes_transportados'],
            "duracion_minutos": resumen['duracion']
        }
        
    except HTTPException:
        raise
    except Exception as err:
        logger.error(f"❌ Error al finalizar jornada: {err}")
        raise HTTPException(status_code=500, detail=str(err))


@router.post("/jornada/estudiante/{jornada_id}")
def registrar_estudiante(jornada_id: int):
    """
    Incrementa manualmente el contador de estudiantes.
    """
    try:
        with get_db_cursor() as cursor:
            cursor.execute("""
                UPDATE jornadas 
                SET estudiantes_transportados = estudiantes_transportados + 1
                WHERE id = %s AND estado = 'EN_CURSO'
            """, (jornada_id,))
            
            if cursor.rowcount == 0:
                raise HTTPException(status_code=404, detail="Jornada no encontrada")
            
            cursor.execute("""
                SELECT estudiantes_transportados FROM jornadas WHERE id = %s
            """, (jornada_id,))
            
            result = cursor.fetchone()
            
        return {
            "status": "exito",
            "estudiantes": result['estudiantes_transportados']
        }
        
    except HTTPException:
        raise
    except Exception as err:
        logger.error(f"❌ Error al registrar estudiante: {err}")
        raise HTTPException(status_code=500, detail=str(err))


@router.get("/jornada/actual/{conductor_id}")
def obtener_jornada_actual(conductor_id: int):
    """
    Obtiene la jornada activa del conductor.
    """
    try:
        with get_db_cursor() as cursor:
            cursor.execute("""
                SELECT id, fecha_hora_inicio as inicio, estudiantes_transportados, ruta_id
                FROM jornadas 
                WHERE conductor_id = %s AND estado = 'EN_CURSO'
            """, (conductor_id,))
            
            jornada = cursor.fetchone()
            
            if jornada and jornada['inicio']:
                jornada['inicio'] = jornada['inicio'].isoformat()
            
        return {"jornada": jornada}
        
    except Exception as err:
        logger.error(f"❌ Error al obtener jornada: {err}")
        raise HTTPException(status_code=500, detail=str(err))
