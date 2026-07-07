export interface RouteInfo {
  id: string;
  name: string;
  busNumber?: string;
}

export interface Trip {
  localId: string;
  databaseId?: number;
  route: RouteInfo;
  startTime: string;
  endTime?: string;
  status: 'active' | 'completed';
  syncStatus: 'synced' | 'pending_start' | 'pending_end';
  startLatitude?: number;
  startLongitude?: number;
  startAddress?: string;
  endLatitude?: number;
  endLongitude?: number;
  endAddress?: string;
}

export interface ConductorData {
  id: number;
  nombre: string;
  bus_asignado: string;
}

export interface JornadaData {
  id: number;
  inicio: string;
  estudiantes_transportados: number;
}

export interface HorarioGroup {
  hora: string;
  rutas: { ruta_id: number; nombre_ruta: string }[];
}
