from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional
import mysql.connector
from datetime import datetime, date

app = FastAPI()

# --- 1. CONFIGURACIÓN DE PERMISOS (CORS) ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- 2. CONEXIÓN A BASE DE DATOS ---
db_config = {
    'host': 'localhost',
    'user': 'root',
    'password': 'donato123',
    'database': 'transporte_uide'
}

def get_db_connection():
    try:
        conn = mysql.connector.connect(**db_config)
        return conn
    except mysql.connector.Error as err:
        print(f"❌ Error conectando a MySQL: {err}")
        return None


# --- 3. MODELOS DE DATOS ---
class SolicitudIniciarViaje(BaseModel):
    bus_id: str
    route_id: str
    start_latitude: Optional[float] = None
    start_longitude: Optional[float] = None
    start_address: Optional[str] = None


class SolicitudFinalizarViaje(BaseModel):
    latitude: float
    longitude: float
    address: Optional[str] = None


class SolicitudLoginConductor(BaseModel):
    pin: str


class SolicitudIniciarJornada(BaseModel):
    conductor_id: int


# --- 4. ENDPOINTS DE LA API ---

@app.get("/")
def home():
    """Sirve el dashboard web"""
    return FileResponse("static/index.html")


@app.post("/api/viajes/iniciar")
def iniciar_viaje(dato: SolicitudIniciarViaje):
    print(f"📩 Iniciando viaje: Bus={dato.bus_id}, Ruta={dato.route_id}")
    
    conn = get_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="No hay conexión a la BD")
    
    cursor = conn.cursor()
    
    try:
        sql = """
            INSERT INTO viajes (bus_id, route_id, start_time, start_latitude, start_longitude, start_address, device_sync_status) 
            VALUES (%s, %s, NOW(), %s, %s, %s, 'synced')
        """
        val = (dato.bus_id, dato.route_id, dato.start_latitude, dato.start_longitude, dato.start_address)
        
        cursor.execute(sql, val)
        conn.commit()
        
        nuevo_id = cursor.lastrowid
        print(f"✅ Viaje registrado en BD con ID: {nuevo_id}")
        
        return {
            "status": "exito",
            "mensaje": "Viaje iniciado correctamente",
            "viaje_id": nuevo_id
        }
        
    except mysql.connector.Error as err:
        print(f"❌ Error SQL: {err}")
        raise HTTPException(status_code=500, detail=str(err))
        
    finally:
        cursor.close()
        conn.close()


@app.put("/api/viajes/finalizar/{viaje_id}")
def finalizar_viaje(viaje_id: int, dato: SolicitudFinalizarViaje):
    print(f"📍 Finalizando viaje ID={viaje_id}, Lat={dato.latitude}, Lon={dato.longitude}")
    
    conn = get_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="No hay conexión a la BD")
    
    cursor = conn.cursor()
    
    try:
        sql = """
            UPDATE viajes 
            SET end_time = NOW(),
                latitude = %s,
                longitude = %s,
                address = %s,
                device_sync_status = 'synced'
            WHERE id = %s
        """
        val = (dato.latitude, dato.longitude, dato.address, viaje_id)
        
        cursor.execute(sql, val)
        conn.commit()
        
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Viaje no encontrado")
        
        print(f"✅ Viaje {viaje_id} finalizado correctamente")
        
        return {
            "status": "exito",
            "mensaje": "Viaje finalizado correctamente",
            "viaje_id": viaje_id
        }
        
    except mysql.connector.Error as err:
        print(f"❌ Error SQL: {err}")
        raise HTTPException(status_code=500, detail=str(err))
        
    finally:
        cursor.close()
        conn.close()


@app.get("/api/viajes")
def listar_viajes():
    """Lista los últimos 50 viajes con nombre de ruta"""
    conn = get_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="No hay conexión a la BD")
    
    cursor = conn.cursor(dictionary=True)
    
    try:
        # JOIN con tabla rutas para obtener el nombre de la ruta
        cursor.execute("""
            SELECT v.*, r.nombre_ruta 
            FROM viajes v
            LEFT JOIN rutas r ON v.route_id = r.id
            ORDER BY v.created_at DESC 
            LIMIT 50
        """)
        viajes = cursor.fetchall()
        
        # Convertir datetime a string para JSON
        for viaje in viajes:
            for key, value in viaje.items():
                if isinstance(value, datetime):
                    viaje[key] = value.isoformat()
        
        return {"viajes": viajes}
        
    finally:
        cursor.close()
        conn.close()


@app.get("/api/estadisticas")
def obtener_estadisticas():
    """Obtiene estadísticas para el dashboard"""
    conn = get_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="No hay conexión a la BD")
    
    cursor = conn.cursor(dictionary=True)
    
    try:
        # Total de viajes
        cursor.execute("SELECT COUNT(*) as total FROM viajes")
        total_viajes = cursor.fetchone()['total']
        
        # Viajes de hoy
        cursor.execute("""
            SELECT COUNT(*) as total FROM viajes 
            WHERE DATE(created_at) = CURDATE()
        """)
        viajes_hoy = cursor.fetchone()['total']
        
        # Rutas activas (rutas únicas)
        cursor.execute("SELECT COUNT(DISTINCT route_id) as total FROM viajes")
        rutas_activas = cursor.fetchone()['total']
        
        # Tiempo promedio de viaje (en minutos)
        cursor.execute("""
            SELECT AVG(TIMESTAMPDIFF(MINUTE, start_time, end_time)) as promedio 
            FROM viajes 
            WHERE end_time IS NOT NULL AND start_time IS NOT NULL
        """)
        result = cursor.fetchone()
        tiempo_promedio = result['promedio'] if result['promedio'] else 0
        
        # Formatear tiempo promedio
        if tiempo_promedio > 0:
            tiempo_str = f"{int(tiempo_promedio)} min"
        else:
            tiempo_str = "--"
        
        return {
            "total_viajes": total_viajes,
            "viajes_hoy": viajes_hoy,
            "rutas_activas": rutas_activas,
            "tiempo_promedio": tiempo_str
        }
        
    finally:
        cursor.close()
        conn.close()


# --- 5. ENDPOINTS DEL CONDUCTOR ---

@app.post("/api/conductor/login")
def login_conductor(dato: SolicitudLoginConductor):
    """Validar PIN del conductor"""
    conn = get_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="No hay conexión a la BD")
    
    cursor = conn.cursor(dictionary=True)
    
    try:
        cursor.execute("""
            SELECT id, nombre, bus_asignado 
            FROM conductores 
            WHERE pin = %s AND activo = TRUE
        """, (dato.pin,))
        
        conductor = cursor.fetchone()
        
        if not conductor:
            raise HTTPException(status_code=401, detail="PIN incorrecto")
        
        print(f"✅ Conductor {conductor['nombre']} logueado")
        
        return {
            "status": "exito",
            "conductor": {
                "id": conductor['id'],
                "nombre": conductor['nombre'],
                "bus_asignado": conductor['bus_asignado']
            }
        }
        
    finally:
        cursor.close()
        conn.close()


@app.post("/api/conductor/jornada/iniciar")
def iniciar_jornada(dato: SolicitudIniciarJornada):
    """Iniciar jornada laboral del conductor"""
    conn = get_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="No hay conexión a la BD")
    
    cursor = conn.cursor()
    
    try:
        # Verificar si ya tiene una jornada activa
        cursor.execute("""
            SELECT id FROM jornadas 
            WHERE conductor_id = %s AND estado = 'EN_CURSO'
        """, (dato.conductor_id,))
        
        if cursor.fetchone():
            raise HTTPException(status_code=400, detail="Ya tienes una jornada activa")
        
        cursor.execute("""
            INSERT INTO jornadas (conductor_id, fecha_hora_inicio, estudiantes_transportados, estado)
            VALUES (%s, NOW(), 0, 'EN_CURSO')
        """, (dato.conductor_id,))
        
        conn.commit()
        jornada_id = cursor.lastrowid
        
        print(f"✅ Jornada {jornada_id} iniciada para conductor {dato.conductor_id}")
        
        return {
            "status": "exito",
            "jornada_id": jornada_id,
            "mensaje": "Jornada iniciada correctamente"
        }
        
    except mysql.connector.Error as err:
        raise HTTPException(status_code=500, detail=str(err))
        
    finally:
        cursor.close()
        conn.close()


@app.put("/api/conductor/jornada/finalizar/{jornada_id}")
def finalizar_jornada(jornada_id: int):
    """Finalizar jornada laboral"""
    conn = get_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="No hay conexión a la BD")
    
    cursor = conn.cursor(dictionary=True)
    
    try:
        cursor.execute("""
            UPDATE jornadas SET fecha_hora_fin = NOW(), estado = 'FINALIZADA' 
            WHERE id = %s AND estado = 'EN_CURSO'
        """, (jornada_id,))
        
        conn.commit()
        
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Jornada no encontrada o ya finalizada")
        
        # Obtener resumen
        cursor.execute("""
            SELECT estudiantes_transportados, 
                   TIMESTAMPDIFF(MINUTE, fecha_hora_inicio, fecha_hora_fin) as duracion_minutos
            FROM jornadas WHERE id = %s
        """, (jornada_id,))
        
        resumen = cursor.fetchone()
        
        print(f"✅ Jornada {jornada_id} finalizada")
        
        return {
            "status": "exito",
            "mensaje": "Jornada finalizada",
            "estudiantes": resumen['estudiantes_transportados'],
            "duracion_minutos": resumen['duracion_minutos']
        }
        
    finally:
        cursor.close()
        conn.close()


@app.post("/api/conductor/jornada/estudiante/{jornada_id}")
def registrar_estudiante(jornada_id: int):
    """Incrementar contador de estudiantes"""
    conn = get_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="No hay conexión a la BD")
    
    cursor = conn.cursor(dictionary=True)
    
    try:
        cursor.execute("""
            UPDATE jornadas 
            SET estudiantes_transportados = estudiantes_transportados + 1
            WHERE id = %s AND estado = 'EN_CURSO'
        """, (jornada_id,))
        
        conn.commit()
        
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Jornada no encontrada o ya finalizada")
        
        # Obtener nuevo total
        cursor.execute("""
            SELECT estudiantes_transportados FROM jornadas WHERE id = %s
        """, (jornada_id,))
        
        result = cursor.fetchone()
        
        return {
            "status": "exito",
            "estudiantes": result['estudiantes_transportados']
        }
        
    finally:
        cursor.close()
        conn.close()


@app.get("/api/conductor/jornada/actual/{conductor_id}")
def obtener_jornada_actual(conductor_id: int):
    """Obtener jornada activa del conductor"""
    conn = get_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="No hay conexión a la BD")
    
    cursor = conn.cursor(dictionary=True)
    
    try:
        cursor.execute("""
            SELECT id, fecha_hora_inicio as inicio, estudiantes_transportados
            FROM jornadas 
            WHERE conductor_id = %s AND estado = 'EN_CURSO'
        """, (conductor_id,))
        
        jornada = cursor.fetchone()
        
        if not jornada:
            return {"jornada": None}
        
        # Convertir datetime
        if jornada['inicio']:
            jornada['inicio'] = jornada['inicio'].isoformat()
        
        return {"jornada": jornada}
        
    finally:
        cursor.close()
        conn.close()


# --- 6. SERVIR ARCHIVOS ESTÁTICOS ---
# Esto debe ir al final para no interferir con las rutas de la API
app.mount("/", StaticFiles(directory="static", html=True), name="static")