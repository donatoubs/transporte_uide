import mysql.connector
from mysql.connector import pooling
from contextlib import contextmanager
import logging
from app.config import APIConfig

logger = logging.getLogger(__name__)

db_pool = None

def init_connection_pool():
    global db_pool
    try:
        db_pool = mysql.connector.pooling.MySQLConnectionPool(
            pool_name=APIConfig.DB_POOL_NAME,
            pool_size=APIConfig.DB_POOL_SIZE,
            host=APIConfig.DB_HOST,
            user=APIConfig.DB_USER,
            password=APIConfig.DB_PASSWORD,
            database=APIConfig.DB_DATABASE
        )
        logger.info("✅ Pool de conexiones de base de datos inicializado con éxito")
    except mysql.connector.Error as err:
        logger.error(f"❌ Error al inicializar el pool de conexiones: {err}")
        raise err

@contextmanager
def get_db_cursor():
    """
    Context manager para obtener un cursor de base de datos (con formato diccionario).
    Toma una conexión del pool, inicia transacción, y la libera al finalizar.
    """
    global db_pool
    if db_pool is None:
        init_connection_pool()
        
    conn = None
    cursor = None
    try:
        conn = db_pool.get_connection()
        cursor = conn.cursor(dictionary=True)
        yield cursor
        conn.commit()
    except Exception as err:
        if conn:
            try:
                conn.rollback()
            except mysql.connector.Error as rollback_err:
                logger.error(f"⚠️ Error al hacer rollback: {rollback_err}")
        logger.error(f"⚠️ Error de base de datos durante la transacción: {err}")
        raise err
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()
