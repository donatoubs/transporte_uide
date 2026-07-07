# Bus-Connect 
### Sistema de Gestión de Transporte Universitario UIDE
**Proyecto Académico para la Gestión y Control de Rutas de Autobuses Universitarios**

---

##  Descripción del Proyecto

**Bus-Connect** es una solución integral orientada a la gestión y supervisión del transporte universitario de la UIDE. El sistema está diseñado bajo una arquitectura cliente-servidor dual, permitiendo que tanto los **estudiantes** como los **conductores de autobuses** interactúen con la plataforma en tiempo real. 

El proyecto consta de una aplicación móvil con soporte offline inteligente, un backend de API REST de alto rendimiento y un panel de control administrativo web para visualizar estadísticas de uso y emergencias.

---

##  Tecnologías Utilizadas

### Frontend (Aplicación Móvil)
* **React Native & Expo**: Framework para el desarrollo de la aplicación móvil multiplataforma.
* **TypeScript**: Tipado estático para asegurar la robustez del código.
* **Leaflet & WebView**: Renderizado de mapas interactivos de OpenStreetMap sin costo de licencias.
* **Expo Camera**: Escaneo de códigos QR para registrar subidas a los buses.
* **AsyncStorage**: Sistema de persistencia local utilizado para almacenar datos sin conexión.
* **Expo Network**: Monitoreo en tiempo real del estado de conexión para sincronización diferida.

### Backend (Servidor de API)
* **Python**: Lenguaje base para el desarrollo del servidor.
* **FastAPI**: Framework web moderno, de alto rendimiento y documentación interactiva automática (Swagger UI en `/docs`).
* **MySQL**: Base de datos relacional para el almacenamiento de viajes, conductores, rutas e historiales.
* **MySQL Connection Pooling**: Pool de conexiones integrado para un acceso concurrente rápido y optimizado a la base de datos.
* **Pydantic**: Validación y tipado estático de datos en peticiones HTTP.

---

##  Características Principales

### Modo Estudiante (Pasajero)
* **Escaneo QR**: Registro instantáneo al subir al autobús escaneando el código QR del vehículo.
* **Viajes en Curso**: Pantalla interactiva que detalla el inicio del trayecto y la ruta seleccionada.
* **Geolocalización en Vivo**: Visualización en tiempo real de la ubicación actual sobre el mapa durante el recorrido.
* **Historial de Viajes**: Registro local de los trayectos previos realizados por el usuario.
* **Consulta de Horarios**: Horarios de salida de las rutas programadas del día.
* **Soporte Offline**: Si el estudiante aborda el autobús en una zona sin cobertura celular, la app almacena localmente el inicio del viaje y su ubicación GPS, sincronizándolo automáticamente con el servidor de base de datos tan pronto como se recupere la conexión a internet.

### Modo Conductor
* **Inicio de Sesión Seguro**: Autenticación rápida mediante un PIN numérico de 4 dígitos.
* **Control de Jornadas**: Selección de horario de salida y ruta asignada antes de iniciar la marcha.
* **Contador de Pasajeros en Vivo**: Visualización en tiempo real de la cantidad de estudiantes que escanean el QR a bordo del autobús.
* **Temporizador de Trayecto**: Control del tiempo transcurrido desde el inicio de la ruta.
* **Reporte de Emergencias**: Envío de alertas inmediatas al panel administrativo en caso de accidentes, problemas mecánicos u otros contratiempos.

###  Dashboard Administrativo (Web)
* **Métricas Clave**: Cantidad total de viajes registrados, viajes realizados en el día, cantidad de rutas activas y tiempo promedio de trayecto.
* **Monitoreo de Buses**: Vista en tiempo real de qué conductores y buses están en ruta en el momento exacto.
* **Historial Detallado**: Consulta y filtrado dinámico de trayectos por fecha y estado.

---

## Estructura del Repositorio

El código está organizado de manera modular siguiendo las mejores prácticas de desarrollo:

```text
Bus-Connect/
├── app/                      # Backend (FastAPI)
│   ├── models/               # Modelos Pydantic para validación
│   │   ├── conductores.py
│   │   └── viajes.py
│   ├── routers/              # Controladores de rutas/endpoints de la API
│   │   ├── conductor.py
│   │   ├── estadisticas.py
│   │   └── viajes.py
│   ├── config.py             # Configuración global y variables de entorno
│   ├── database.py           # Pool de conexiones y context manager de MySQL
│   └── main.py               # Inicializador de FastAPI y servidor estático
├── src/                      # Frontend Móvil (React Native/Expo)
│   ├── components/           # Componentes UI reutilizables (ej. LeafletMap)
│   ├── screens/              # Pantallas específicas de Pasajero y Conductor
│   ├── constants.ts          # Paleta de colores e IP de la API
│   └── types.ts              # Tipos TypeScript compartidos
├── static/                   # Dashboard Web Servido por el Backend
│   ├── admin.js              # Lógica de consumo de API y gráficos
│   └── index.html            # Interfaz web del Panel Administrativo
├── App.tsx                   # Controlador de vistas y estado del celular
├── .env                      # Variables de entorno locales (Excluido de Git)
└── README.md                 # Fichero de documentación
```

---

## Instrucciones de Instalación y Uso

### 1. Configuración de la Base de Datos (MySQL)
Crea una base de datos llamada `transporte_uide` y define las tablas correspondientes para:
* **conductores**: ID, Nombre, PIN y Bus Asignado.
* **rutas**: ID y Nombre de la ruta.
* **jornadas**: ID, Conductor ID, Ruta ID, Fecha Inicio, Fecha Fin, Estado y Estudiantes Transportados.
* **viajes**: ID, Estudiante ID, Ruta ID, Jornada ID, Coordenadas y direcciones de subida/bajada, Estado y fechas.
* **horarios**: ID, Ruta ID y Hora Salida.

### 2. Configuración y Ejecución del Backend
1. **Crear entorno virtual e instalar dependencias:**
   ```bash
   python -m venv .venv
   # Activar en Windows PowerShell:
   .\.venv\Scripts\Activate.ps1
   # Instalar paquetes:
   pip install fastapi uvicorn mysql-connector-python python-dotenv
   ```
2. **Configurar el archivo `.env` en la raíz del proyecto:**
   ```env
   DB_HOST=localhost
   DB_USER=tu_usuario
   DB_PASSWORD=tu_contraseña
   DB_DATABASE=transporte_uide
   ```
3. **Iniciar el servidor:**
   ```bash
   uvicorn app.main:app --reload
   ```
   El backend estará corriendo en `http://localhost:8000`. Puedes acceder a la documentación interactiva en `http://localhost:8000/docs`.

### 3. Configuración y Ejecución del Frontend (App Móvil)
1. **Instalar dependencias de Node.js:**
   ```bash
   npm install
   ```
2. **Configurar IP del Backend:**
   Abre el archivo [src/constants.ts](src/constants.ts) y actualiza la constante `API_URL` con la IP local de tu computadora en la red Wi-Fi:
   ```typescript
   export const API_URL = 'http://192.168.X.X:8000';
   ```
3. **Iniciar Expo Go:**
   ```bash
   npx expo start
   ```
   Escanea el código QR generado en la terminal con la aplicación **Expo Go** en tu dispositivo móvil Android o iOS.

---

## Autor
* **Donato Oña** - *Desarrollador y Autor del Proyecto* - UIDE
