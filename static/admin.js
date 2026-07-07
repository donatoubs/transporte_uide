// ========================================
// PANEL ADMINISTRATIVO - JAVASCRIPT
// ========================================

const API_URL = '';
let emergenciaSeleccionada = null;
let conductorEditandoId = null;
let busEditandoId = null;

// ======= UTILIDADES DE FORMATO =======
function formatTime(dateStr) {
    if (!dateStr) return '--';
    return new Date(dateStr).toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' });
}

function formatDateTime(dateStr) {
    if (!dateStr) return '--';
    return new Date(dateStr).toLocaleString('es-EC', {
        day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
    });
}

function formatDate(dateStr) {
    if (!dateStr) return '--';
    return new Date(dateStr).toLocaleDateString('es-EC', { day: '2-digit', month: 'short' });
}

function actualizarFecha() {
    const options = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
    const fecha = new Date().toLocaleDateString('es-EC', options);
    document.getElementById('currentDate').textContent = fecha.charAt(0).toUpperCase() + fecha.slice(1);
}

// ======= NAVEGACIÓN =======
function showSection(sectionId, element) {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.getElementById(sectionId).classList.add('active');
    if (element) element.classList.add('active');

    const titles = {
        dashboard: 'Dashboard',
        emergencias: 'Emergencias',
        jornadas: 'Jornadas',
        conductores: 'Conductores',
        buses: 'Buses',
        viajes: 'Viajes'
    };
    document.getElementById('pageTitle').textContent = titles[sectionId] || 'Dashboard';

    if (sectionId === 'emergencias') cargarEmergencias();
    else if (sectionId === 'jornadas') cargarJornadas();
    else if (sectionId === 'conductores') cargarConductores();
    else if (sectionId === 'buses') cargarBuses();
    else if (sectionId === 'viajes') cargarTodosViajes();
}

// ======= DASHBOARD =======
async function cargarEstadisticas() {
    try {
        const res = await fetch(`${API_URL}/api/estadisticas/dashboard`);
        const data = await res.json();

        // Métricas principales
        document.getElementById('estudiantesHoy').textContent = data.estudiantes_hoy || 0;
        document.getElementById('busesOperativos').textContent = data.buses_operativos || 0;
        document.getElementById('busesTotal').textContent = data.buses_total || 0;
        document.getElementById('rutasActivas').textContent = data.rutas_activas || 0;

        // Gráfico de actividad semanal
        const chartContainer = document.getElementById('chartContainer');
        if (data.actividad_semanal) {
            const maxVal = Math.max(...data.actividad_semanal.map(d => d.viajes), 1);
            chartContainer.innerHTML = data.actividad_semanal.map((d, i) => {
                const height = Math.max((d.viajes / maxVal) * 140, 8);
                const esHoy = i === data.actividad_semanal.length - 1;
                return `
                    <div style="flex: 1; display: flex; flex-direction: column; align-items: center;">
                        <span style="font-size: 11px; font-weight: 600; margin-bottom: 4px; color: var(--text-primary);">${d.viajes}</span>
                        <div style="width: 100%; height: ${height}px; background: ${esHoy ? '#4F46E5' : '#E5E7EB'}; border-radius: 4px;"></div>
                        <span style="font-size: 11px; margin-top: 8px; color: ${esHoy ? '#4F46E5' : 'var(--text-muted)'}; font-weight: ${esHoy ? '600' : '400'};">${d.dia}</span>
                    </div>
                `;
            }).join('');
        }

        // Estado de la flota
        const total = data.buses_total || 1;
        const operativos = data.buses_operativos || 0;
        const mantenimiento = data.buses_mantenimiento || 0;
        const fuera = data.buses_fuera || 0;

        document.getElementById('flotaOperativos').textContent = operativos;
        document.getElementById('flotaMantenimiento').textContent = mantenimiento;
        document.getElementById('flotaFuera').textContent = fuera;

        document.getElementById('barraOperativos').style.width = `${(operativos / total) * 100}%`;
        document.getElementById('barraMantenimiento').style.width = `${(mantenimiento / total) * 100}%`;
        document.getElementById('barraFuera').style.width = `${(fuera / total) * 100}%`;

    } catch (e) {
        console.error('Error:', e);
    }
}

async function cargarEmergenciasDashboard() {
    try {
        const res = await fetch(`${API_URL}/api/emergencias`);
        const data = await res.json();
        const container = document.getElementById('emergenciasDashboard');

        const pendientes = data.emergencias ? data.emergencias.filter(e => !e.atendida) : [];
        document.getElementById('contadorEmergencias').textContent = `${pendientes.length} pendiente${pendientes.length !== 1 ? 's' : ''}`;

        if (pendientes.length === 0) {
            container.innerHTML = '<div class="empty-state" style="padding: 32px;">Sin emergencias pendientes</div>';
        } else {
            container.innerHTML = pendientes.map(e => `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid var(--border);">
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <div style="width: 8px; height: 8px; background: #EF4444; border-radius: 50%;"></div>
                        <div>
                            <div style="font-weight: 500;">${e.tipo || 'Emergencia'}</div>
                            <div style="font-size: 12px; color: var(--text-muted);">${formatDateTime(e.fecha_hora_reporte)} · ${e.nombre_conductor || 'Conductor #' + e.conductor_id}</div>
                        </div>
                    </div>
                    <button class="btn" onclick="showSection('emergencias', document.querySelector('.nav-item:nth-child(2)'))">Atender</button>
                </div>
            `).join('');
        }
    } catch (e) {
        console.error('Error:', e);
    }
}

// ======= EMERGENCIAS =======
async function cargarEmergencias() {
    try {
        const res = await fetch(`${API_URL}/api/emergencias`);
        const data = await res.json();
        const container = document.getElementById('emergenciasContainer');

        if (!data.emergencias || data.emergencias.length === 0) {
            container.innerHTML = '<div class="empty-state">No hay emergencias registradas</div>';
            const emergenciasEl = document.getElementById('emergenciasActivas');
            if (emergenciasEl) emergenciasEl.textContent = '0';
            return;
        }

        const pendientes = data.emergencias.filter(e => !e.atendida).length;
        const emergenciasEl = document.getElementById('emergenciasActivas');
        if (emergenciasEl) emergenciasEl.textContent = pendientes;

        container.innerHTML = data.emergencias.map(e => `
            <div class="emergency-card ${e.atendida ? 'resolved' : ''}">
                <div class="emergency-header">
                    <span class="emergency-type">${e.tipo || 'Emergencia'}</span>
                    <span class="badge ${e.atendida ? 'badge-success' : 'badge-danger'}">
                        ${e.atendida ? 'Atendida' : 'Pendiente'}
                    </span>
                </div>
                <div class="emergency-meta">
                    ${formatDateTime(e.fecha_hora_reporte)} · ${e.nombre_conductor || 'Conductor #' + e.conductor_id}
                </div>
                ${e.direccion ? `<div class="emergency-location">${e.direccion}</div>` : ''}
                ${e.descripcion ? `<div class="emergency-meta">${e.descripcion}</div>` : ''}
                ${!e.atendida ? `
                    <div class="emergency-actions">
                        <button class="btn btn-primary" onclick="abrirModal(${e.id})">Atender</button>
                        ${e.latitud ? `<a class="btn" href="https://www.google.com/maps?q=${e.latitud},${e.longitud}" target="_blank">Ver ubicación</a>` : ''}
                    </div>
                ` : `<div class="emergency-meta">Atendida: ${formatDateTime(e.fecha_hora_atencion)}</div>`}
            </div>
        `).join('');
    } catch (e) {
        console.error('Error:', e);
    }
}

function abrirModal(id) {
    emergenciaSeleccionada = id;
    document.getElementById('modalAtender').classList.add('active');
}

function cerrarModal() {
    document.getElementById('modalAtender').classList.remove('active');
    document.getElementById('notasAtencion').value = '';
    emergenciaSeleccionada = null;
}

async function confirmarAtencion() {
    if (!emergenciaSeleccionada) return;
    const notas = document.getElementById('notasAtencion').value;

    try {
        const res = await fetch(`${API_URL}/api/emergencia/${emergenciaSeleccionada}/atender`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ notas_atencion: notas })
        });

        if (res.ok) {
            cerrarModal();
            cargarEmergencias();
        }
    } catch (e) {
        console.error('Error:', e);
    }
}

// ======= JORNADAS =======
async function cargarJornadas() {
    try {
        const filtro = document.getElementById('filtroJornadaEstado')?.value || 'todos';
        const res = await fetch(`${API_URL}/api/jornadas?estado=${filtro}`);
        const data = await res.json();
        const tbody = document.getElementById('tablaJornadas');

        // Cargar estadísticas
        const resStats = await fetch(`${API_URL}/api/jornadas/estadisticas`);
        const stats = await resStats.json();

        document.getElementById('jornadasHoy').textContent = stats.jornadas_hoy || 0;
        document.getElementById('jornadasEnCurso').textContent = stats.en_curso || 0;
        document.getElementById('estudiantesJornadas').textContent = stats.estudiantes_hoy || 0;
        document.getElementById('jornadasTotal').textContent = stats.total || 0;

        if (!data.jornadas || data.jornadas.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="empty-state">No hay jornadas registradas</td></tr>';
            return;
        }

        tbody.innerHTML = data.jornadas.map(j => `
            <tr>
                <td>${formatDate(j.fecha_hora_inicio)}</td>
                <td>${j.nombre_conductor || 'Conductor #' + j.conductor_id}</td>
                <td>${j.nombre_ruta || 'Ruta #' + j.ruta_id}</td>
                <td>${formatTime(j.fecha_hora_inicio)}</td>
                <td>${formatTime(j.fecha_hora_fin)}</td>
                <td><strong>${j.estudiantes_transportados || 0}</strong></td>
                <td><span class="badge ${j.estado === 'FINALIZADA' ? 'badge-success' : 'badge-warning'}">
                    ${j.estado === 'FINALIZADA' ? 'Finalizada' : 'En curso'}
                </span></td>
            </tr>
        `).join('');
    } catch (e) {
        console.error('Error:', e);
    }
}

// ======= VIAJES =======
async function cargarTodosViajes() {
    const filtroFecha = document.getElementById('filtroFecha')?.value || 'todos';
    const filtroEstado = document.getElementById('filtroEstado')?.value || 'todos';

    try {
        const res = await fetch(`${API_URL}/api/viajes?fecha=${filtroFecha}&estado=${filtroEstado}`);
        const data = await res.json();
        const tbody = document.getElementById('tablaTodosViajes');

        if (!data.viajes || data.viajes.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="empty-state">No hay viajes con estos filtros</td></tr>';
            document.getElementById('contadorViajes').textContent = '0 viajes';
            return;
        }

        document.getElementById('contadorViajes').textContent = `${data.viajes.length} viajes`;

        tbody.innerHTML = data.viajes.map(v => `
            <tr>
                <td><span class="badge-id">${v.id}</span></td>
                <td>${formatDate(v.fecha_hora_subida)}</td>
                <td>${v.nombre_ruta || 'Sin ruta'}</td>
                <td>${formatTime(v.fecha_hora_subida)}</td>
                <td>${formatTime(v.fecha_hora_bajada)}</td>
                <td><span class="badge ${v.estado === 'FINALIZADO' ? 'badge-success' : 'badge-warning'}">
                    ${v.estado === 'FINALIZADO' ? 'Completado' : 'En curso'}
                </span></td>
            </tr>
        `).join('');
    } catch (e) {
        console.error('Error:', e);
    }
}

// ======= CONDUCTORES =======
async function cargarConductores() {
    try {
        const res = await fetch(`${API_URL}/api/conductores`);
        const data = await res.json();
        const tbody = document.getElementById('tablaConductores');

        if (!data.conductores || data.conductores.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="empty-state">No hay conductores registrados</td></tr>';
            return;
        }

        tbody.innerHTML = data.conductores.map(c => `
            <tr>
                <td><span class="badge-id">${c.id}</span></td>
                <td>${c.nombre}</td>
                <td>${c.cedula || '--'}</td>
                <td>${c.telefono || '--'}</td>
                <td>${c.bus_placa || 'Sin asignar'}</td>
                <td><span class="badge ${c.activo ? 'badge-success' : 'badge-default'}">
                    ${c.activo ? 'Activo' : 'Inactivo'}
                </span></td>
                <td>
                    <button class="btn" onclick="editarConductor(${c.id}, '${c.nombre}', '${c.cedula || ''}', '${c.telefono || ''}', '${c.pin || ''}', ${c.bus_id || 'null'})">Editar</button>
                </td>
            </tr>
        `).join('');
    } catch (e) {
        console.error('Error:', e);
    }
}

async function abrirModalConductor() {
    try {
        const res = await fetch(`${API_URL}/api/buses`);
        const data = await res.json();
        const select = document.getElementById('conductorBus');
        select.innerHTML = '<option value="">Sin bus asignado</option>';
        if (data.buses) {
            data.buses.forEach(b => {
                select.innerHTML += `<option value="${b.id}">${b.placa} - ${b.marca || ''}</option>`;
            });
        }
    } catch (e) {
        console.error('Error cargando buses:', e);
    }
    document.getElementById('modalConductor').classList.add('active');
}

function editarConductor(id, nombre, cedula, telefono, pin, busId) {
    conductorEditandoId = id;
    document.getElementById('conductorNombre').value = nombre;
    document.getElementById('conductorCedula').value = cedula;
    document.getElementById('conductorTelefono').value = telefono;
    document.getElementById('conductorPin').value = pin;

    fetch(`${API_URL}/api/buses`)
        .then(res => res.json())
        .then(data => {
            const select = document.getElementById('conductorBus');
            select.innerHTML = '<option value="">Sin bus asignado</option>';
            if (data.buses) {
                data.buses.forEach(b => {
                    select.innerHTML += `<option value="${b.id}" ${b.id === busId ? 'selected' : ''}>${b.placa} - ${b.marca || ''}</option>`;
                });
            }
        });

    document.getElementById('modalConductor').classList.add('active');
}

async function crearConductor() {
    const nombre = document.getElementById('conductorNombre').value;
    const cedula = document.getElementById('conductorCedula').value;
    const telefono = document.getElementById('conductorTelefono').value;
    const pin = document.getElementById('conductorPin').value;
    const bus_id = document.getElementById('conductorBus').value || null;

    if (!nombre || !pin) {
        alert('Nombre y PIN son obligatorios');
        return;
    }

    const url = conductorEditandoId
        ? `${API_URL}/api/conductor/${conductorEditandoId}/editar`
        : `${API_URL}/api/conductor/crear`;
    const method = conductorEditandoId ? 'PUT' : 'POST';

    try {
        const res = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nombre, cedula, telefono, pin, bus_id: bus_id ? parseInt(bus_id) : null })
        });

        if (res.ok) {
            cerrarModalConductor();
            cargarConductores();
            alert(conductorEditandoId ? 'Conductor actualizado' : 'Conductor creado');
        } else {
            const data = await res.json();
            alert('Error: ' + (data.detail || 'No se pudo guardar'));
        }
    } catch (e) {
        console.error('Error:', e);
        alert('Error de conexión');
    }
}

function cerrarModalConductor() {
    conductorEditandoId = null;
    document.getElementById('modalConductor').classList.remove('active');
    document.getElementById('conductorNombre').value = '';
    document.getElementById('conductorCedula').value = '';
    document.getElementById('conductorTelefono').value = '';
    document.getElementById('conductorPin').value = '';
}

// ======= BUSES =======
async function cargarBuses() {
    try {
        const res = await fetch(`${API_URL}/api/buses`);
        const data = await res.json();
        const tbody = document.getElementById('tablaBuses');

        if (!data.buses || data.buses.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="empty-state">No hay buses registrados</td></tr>';
            return;
        }

        tbody.innerHTML = data.buses.map(b => `
            <tr>
                <td><span class="badge-id">${b.id}</span></td>
                <td><strong>${b.placa}</strong></td>
                <td>${b.marca || '--'}</td>
                <td>${b.modelo || '--'}</td>
                <td>${b.capacidad || '--'}</td>
                <td><span class="badge ${b.estado === 'OPERATIVO' ? 'badge-success' : b.estado === 'EN_MANTENIMIENTO' ? 'badge-warning' : 'badge-danger'}">
                    ${b.estado}
                </span></td>
                <td>
                    <button class="btn" onclick="editarBus(${b.id}, '${b.placa}', '${b.marca || ''}', '${b.modelo || ''}', ${b.capacidad || 'null'}, '${b.estado}')">Editar</button>
                </td>
            </tr>
        `).join('');
    } catch (e) {
        console.error('Error:', e);
    }
}

function abrirModalBus() {
    document.getElementById('modalBus').classList.add('active');
}

function editarBus(id, placa, marca, modelo, capacidad, estado) {
    busEditandoId = id;
    document.getElementById('busPlaca').value = placa;
    document.getElementById('busMarca').value = marca;
    document.getElementById('busModelo').value = modelo;
    document.getElementById('busCapacidad').value = capacidad || '';
    document.getElementById('busEstado').value = estado;
    document.getElementById('modalBus').classList.add('active');
}

async function crearBus() {
    const placa = document.getElementById('busPlaca').value;
    const marca = document.getElementById('busMarca').value;
    const modelo = document.getElementById('busModelo').value;
    const capacidad = document.getElementById('busCapacidad').value;
    const estado = document.getElementById('busEstado').value;

    if (!placa) {
        alert('La placa es obligatoria');
        return;
    }

    const url = busEditandoId
        ? `${API_URL}/api/bus/${busEditandoId}/editar`
        : `${API_URL}/api/bus/crear`;
    const method = busEditandoId ? 'PUT' : 'POST';

    try {
        const res = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ placa, marca, modelo, capacidad: capacidad ? parseInt(capacidad) : null, estado })
        });

        if (res.ok) {
            cerrarModalBus();
            cargarBuses();
            alert(busEditandoId ? 'Bus actualizado' : 'Bus creado');
        } else {
            const data = await res.json();
            alert('Error: ' + (data.detail || 'No se pudo guardar'));
        }
    } catch (e) {
        console.error('Error:', e);
        alert('Error de conexión');
    }
}

function cerrarModalBus() {
    busEditandoId = null;
    document.getElementById('modalBus').classList.remove('active');
    document.getElementById('busPlaca').value = '';
    document.getElementById('busMarca').value = '';
    document.getElementById('busModelo').value = '';
    document.getElementById('busCapacidad').value = '';
}

// ======= INICIALIZACIÓN =======
async function cargarDatos() {
    await Promise.all([cargarEstadisticas(), cargarEmergenciasDashboard()]);
}

// Iniciar al cargar la página
document.addEventListener('DOMContentLoaded', () => {
    actualizarFecha();
    cargarDatos();
    setInterval(cargarDatos, 30000);
});
