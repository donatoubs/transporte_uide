import React, { useState, useEffect, useCallback, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Alert, SafeAreaView, StatusBar } from 'react-native';
import { useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { Home, Clock, Bus, MapPin, Settings } from 'lucide-react-native';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import * as Network from 'expo-network';

// Imports del proyecto modularizado
import { API_URL, COLORS } from './src/constants';
import { Trip, ConductorData, JornadaData, HorarioGroup } from './src/types';

// Componentes
import LeafletMap from './src/components/LeafletMap';

// Pantallas
import ScanningScreen from './src/screens/ScanningScreen';
import PassengerHomeScreen from './src/screens/PassengerHomeScreen';
import PassengerTripScreen from './src/screens/PassengerTripScreen';
import PassengerHistoryScreen from './src/screens/PassengerHistoryScreen';
import PassengerSchedulesScreen from './src/screens/PassengerSchedulesScreen';
import PassengerSettingsScreen from './src/screens/PassengerSettingsScreen';
import DriverLoginScreen from './src/screens/DriverLoginScreen';
import DriverHomeScreen from './src/screens/DriverHomeScreen';
import DriverJornadaScreen from './src/screens/DriverJornadaScreen';
import DriverHistoryScreen from './src/screens/DriverHistoryScreen';

export default function App() {
  const [view, setView] = useState<'HOME' | 'SCANNING' | 'ON_TRIP' | 'HISTORY' | 'MAP' | 'SETTINGS' | 'SCHEDULES' | 'DRIVER_LOGIN' | 'DRIVER_HOME' | 'DRIVER_HISTORIAL' | 'DRIVER_JORNADA_ACTIVA'>('HOME');
  const [activeTrip, setActiveTrip] = useState<Trip | null>(null);
  const [history, setHistory] = useState<Trip[]>([]);
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationWatcher, setLocationWatcher] = useState<Location.LocationSubscription | null>(null);

  // --- ESTADOS MODO CONDUCTOR ---
  const [pinInput, setPinInput] = useState('');
  const [driverData, setDriverData] = useState<ConductorData | null>(null);
  const [activeJornada, setActiveJornada] = useState<JornadaData | null>(null);
  const [routes, setRoutes] = useState<{ id: number; nombre_ruta: string }[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<{ id: number; nombre_ruta: string } | null>(null);
  const [selectedHorario, setSelectedHorario] = useState<string | null>(null);
  const [elapsedTime, setElapsedTime] = useState<string>('00:00:00');
  const [driverHistorial, setDriverHistorial] = useState<any[]>([]);

  // --- HORARIOS ---
  const [schedules, setSchedules] = useState<HorarioGroup[]>([]);

  const todayDate = format(new Date(), "EEEE, d 'de' MMMM", { locale: es });

  // --- SINCRONIZACIÓN DE VIAJES PENDIENTES ---
  const syncPendingTrips = useCallback(async () => {
    if (isSyncing) return;

    try {
      const networkState = await Network.getNetworkStateAsync();
      if (!networkState.isConnected) return;

      const saved = await AsyncStorage.getItem('trips_history');
      if (!saved) return;

      const trips: Trip[] = JSON.parse(saved);
      const pendingTrips = trips.filter(t => t.syncStatus === 'pending_start' || t.syncStatus === 'pending_end');

      if (pendingTrips.length === 0) return;

      setIsSyncing(true);
      console.log(`🔄 Sincronizando ${pendingTrips.length} viaje(s) pendiente(s)...`);

      let updatedTrips = [...trips];

      for (const trip of pendingTrips) {
        try {
          if (trip.syncStatus === 'pending_start') {
            // Sincronizar inicio de viaje
            const response = await fetch(`${API_URL}/api/viajes/iniciar`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                bus_id: trip.route.busNumber,
                route_id: trip.route.id,
                start_latitude: trip.startLatitude,
                start_longitude: trip.startLongitude
              })
            });

            if (response.ok) {
              const res = await response.json();
              updatedTrips = updatedTrips.map(t =>
                t.localId === trip.localId
                  ? { ...t, databaseId: res.viaje_id, syncStatus: trip.status === 'completed' ? 'pending_end' as const : 'synced' as const }
                  : t
              );
              console.log(`✅ Viaje ${trip.localId} sincronizado (inicio)`);
            }
          }

          // Buscar el viaje actualizado para sincronizar el fin
          const currentTrip = updatedTrips.find(t => t.localId === trip.localId);
          if (currentTrip && currentTrip.syncStatus === 'pending_end' && currentTrip.databaseId) {
            const response = await fetch(`${API_URL}/api/viajes/finalizar/${currentTrip.databaseId}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                latitude: currentTrip.endLatitude,
                longitude: currentTrip.endLongitude
              })
            });

            if (response.ok) {
              updatedTrips = updatedTrips.map(t =>
                t.localId === trip.localId ? { ...t, syncStatus: 'synced' as const } : t
              );
              console.log(`✅ Viaje ${trip.localId} sincronizado (fin)`);
            }
          }
        } catch (e) {
          console.log(`❌ Error sincronizando viaje ${trip.localId}:`, e);
        }
      }

      await AsyncStorage.setItem('trips_history', JSON.stringify(updatedTrips));
      setHistory(updatedTrips);

      const stillPending = updatedTrips.filter(t => t.syncStatus !== 'synced').length;
      if (stillPending === 0 && pendingTrips.length > 0) {
        Alert.alert("Sincronización Completa", `${pendingTrips.length} viaje(s) sincronizado(s) ☁️`);
      }

    } catch (e) {
      console.log("Error en sincronización:", e);
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing]);

  useEffect(() => {
    checkActiveTrip();
    loadHistory();
    // Intentar sincronizar al iniciar
    setTimeout(() => syncPendingTrips(), 2000);
    // Sincronizar cada 30 segundos
    const interval = setInterval(syncPendingTrips, 30000);
    return () => {
      clearInterval(interval);
      if (locationWatcher) locationWatcher.remove();
    };
  }, []);

  // --- VERIFICAR JORNADA ACTIVA AL INICIAR SESIÓN DE CONDUCTOR ---
  useEffect(() => {
    const checkActiveJornada = async () => {
      if (driverData && !activeJornada) {
        try {
          const res = await fetch(`${API_URL}/api/conductor/jornada/actual/${driverData.id}`);
          const data = await res.json();
          if (data.jornada && !data.jornada.fin) {
            setActiveJornada(data.jornada);
            setView('DRIVER_JORNADA_ACTIVA');
          }
        } catch (e) {
          console.log("Error verificando jornada activa:", e);
        }
      }
    };
    checkActiveJornada();
  }, [driverData]);

  // --- WATCH LOCATION FOR MAP ---
  const startWatchingLocation = useCallback(async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert("Permiso Denegado", "Se requiere GPS para ver el mapa.");
      setView('HOME');
      return;
    }

    try {
      const loc = await Location.getCurrentPositionAsync({});
      setUserLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
    } catch (e) {
      console.log("Error getting initial location:", e);
    }

    const watcher = await Location.watchPositionAsync(
      { accuracy: Location.Accuracy.High, distanceInterval: 10 },
      (loc) => {
        setUserLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
      }
    );
    setLocationWatcher(watcher);
  }, []);

  const stopWatchingLocation = useCallback(() => {
    if (locationWatcher) {
      locationWatcher.remove();
      setLocationWatcher(null);
    }
  }, [locationWatcher]);

  useEffect(() => {
    if (view === 'MAP') {
      startWatchingLocation();
    } else {
      stopWatchingLocation();
    }
  }, [view]);

  // --- POLLING PARA ACTUALIZAR CONTADOR EN TIEMPO REAL ---
  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | null = null;

    if (view === 'DRIVER_HOME' && driverData && activeJornada) {
      intervalId = setInterval(async () => {
        try {
          const res = await fetch(`${API_URL}/api/conductor/jornada/actual/${driverData.id}`);
          const data = await res.json();
          if (data.jornada) {
            setActiveJornada(data.jornada);
          }
        } catch (e) {
          console.log("Error actualizando contador:", e);
        }
      }, 5000);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [view, driverData, activeJornada?.id]);

  // --- TEMPORIZADOR DE TIEMPO EN RUTA ---
  useEffect(() => {
    let timerInterval: ReturnType<typeof setInterval> | null = null;

    if (view === 'DRIVER_JORNADA_ACTIVA' && activeJornada?.inicio) {
      const updateTimer = () => {
        const start = new Date(activeJornada.inicio).getTime();
        const now = Date.now();
        const diff = Math.floor((now - start) / 1000);
        const hours = Math.floor(diff / 3600);
        const minutes = Math.floor((diff % 3600) / 60);
        const seconds = diff % 60;
        setElapsedTime(
          `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
        );
      };
      updateTimer();
      timerInterval = setInterval(updateTimer, 1000);
    } else {
      setElapsedTime('00:00:00');
    }

    return () => {
      if (timerInterval) clearInterval(timerInterval);
    };
  }, [view, activeJornada?.inicio]);

  // --- FUNCIONES MODO CONDUCTOR ---
  const handleDriverLogin = async () => {
    if (pinInput.length !== 4) {
      Alert.alert("Error", "El PIN debe tener 4 dígitos");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/conductor/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: pinInput })
      });

      if (!res.ok) {
        Alert.alert("PIN Incorrecto", "Verifica tu código de acceso");
        setPinInput('');
        setLoading(false);
        return;
      }

      const data = await res.json();
      setDriverData(data.conductor);
      setSelectedHorario(null);
      setSelectedRoute(null);
      setActiveJornada(null);
      await loadActiveJornada(data.conductor.id);
      await loadRoutes();
      setView('DRIVER_HOME');
      setPinInput('');
    } catch (e) {
      Alert.alert("Error", "No se pudo conectar con el servidor");
    } finally {
      setLoading(false);
    }
  };

  const loadActiveJornada = async (conductorId: number) => {
    try {
      const res = await fetch(`${API_URL}/api/conductor/jornada/actual/${conductorId}`);
      const data = await res.json();
      if (data.jornada && data.jornada.id) {
        setActiveJornada(data.jornada);
        setView('DRIVER_JORNADA_ACTIVA');
      } else {
        setActiveJornada(null);
      }
    } catch (e) {
      console.log("Error cargando jornada:", e);
      setActiveJornada(null);
    }
  };

  const loadRoutes = async () => {
    try {
      const res = await fetch(`${API_URL}/api/rutas`);
      if (res.ok) {
        const data = await res.json();
        setRoutes(data.rutas || []);
      }
    } catch (e) { console.log("Error cargando rutas:", e); }
  };

  const handleStartJornada = async () => {
    if (!driverData) return;
    if (!selectedHorario) {
      Alert.alert("Selecciona Horario", "Debes elegir un horario antes de iniciar la jornada");
      return;
    }
    if (!selectedRoute) {
      Alert.alert("Selecciona Ruta", "Debes elegir una ruta antes de iniciar la jornada");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/conductor/jornada/iniciar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conductor_id: driverData.id, ruta_id: selectedRoute.id })
      });

      if (res.ok) {
        const data = await res.json();
        setActiveJornada({ id: data.jornada_id, inicio: new Date().toISOString(), estudiantes_transportados: 0 });
        setView('DRIVER_JORNADA_ACTIVA');
      } else {
        const err = await res.json();
        Alert.alert("Error", err.detail || "No se pudo iniciar la jornada");
      }
    } catch (e) {
      Alert.alert("Error", "Sin conexión al servidor");
    } finally {
      setLoading(false);
    }
  };

  const handleEmergency = () => {
    if (!driverData) {
      Alert.alert('Error', 'Conductor no autenticado');
      return;
    }
    Alert.alert(
      'Reportar Emergencia',
      'Selecciona el tipo de emergencia',
      [
        { text: 'Accidente', onPress: () => reportEmergency('Accidente') },
        { text: 'Problema mecánico', onPress: () => reportEmergency('Mecanico') },
        { text: 'Otro', onPress: () => reportEmergency('Otro') },
        { text: 'Cancelar', style: 'cancel' },
      ]
    );
  };

  const reportEmergency = async (type: string) => {
    if (!driverData) return;
    try {
      const res = await fetch(`${API_URL}/api/conductor/emergencia`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conductor_id: driverData.id, tipo: type }),
      });
      if (res.ok) {
        Alert.alert('Emergencia enviada', `Tipo: ${type}`);
      } else {
        const err = await res.json();
        Alert.alert('Error', err.detail || 'No se pudo enviar la emergencia');
      }
    } catch (e) {
      Alert.alert('Error', 'Sin conexión al servidor');
    }
  };

  const handleEndJornada = async () => {
    if (!activeJornada) return;

    Alert.alert("Finalizar Jornada", "¿Deseas terminar tu jornada laboral?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Finalizar", style: "destructive", onPress: async () => {
          setLoading(true);
          try {
            const res = await fetch(`${API_URL}/api/conductor/jornada/finalizar/${activeJornada.id}`, {
              method: 'PUT'
            });

            if (res.ok) {
              const data = await res.json();
              Alert.alert("Jornada Finalizada",
                `Estudiantes: ${data.estudiantes}\nDuración: ${data.duracion_minutos} min`);
              setActiveJornada(null);
              setView('DRIVER_HOME');
            }
          } catch (e) {
            Alert.alert("Error", "Sin conexión al servidor");
          } finally {
            setLoading(false);
          }
        }
      }
    ]);
  };

  const handleAddStudent = async () => {
    if (!activeJornada) return;
    try {
      const res = await fetch(`${API_URL}/api/conductor/jornada/estudiante/${activeJornada.id}`, {
        method: 'POST'
      });

      if (res.ok) {
        const data = await res.json();
        setActiveJornada(prev => prev ? { ...prev, estudiantes_transportados: data.estudiantes } : null);
      }
    } catch (e) {
      console.log("Error registrando estudiante:", e);
    }
  };

  const handleDriverLogout = () => {
    setDriverData(null);
    setActiveJornada(null);
    setView('HOME');
  };

  const checkActiveTrip = async () => {
    try {
      const saved = await AsyncStorage.getItem('active_trip');
      if (saved) {
        setActiveTrip(JSON.parse(saved));
        setView('ON_TRIP');
      }
    } catch (e) { console.error(e); }
  };

  const loadHistory = async () => {
    try {
      const saved = await AsyncStorage.getItem('trips_history');
      if (saved) setHistory(JSON.parse(saved));
    } catch (e) { console.error(e); }
  };

  const loadSchedules = async () => {
    try {
      const res = await fetch(`${API_URL}/api/horarios`);
      if (res.ok) {
        const data = await res.json();
        setSchedules(data.horarios || []);
      }
    } catch (e) { console.log("Error cargando horarios:", e); }
  };

  const addToHistory = async (trip: Trip) => {
    const newHistory = [trip, ...history];
    setHistory(newHistory);
    await AsyncStorage.setItem('trips_history', JSON.stringify(newHistory));
  };

  const getAddressFromCoords = async (latitude: number, longitude: number): Promise<string | undefined> => {
    try {
      const results = await Location.reverseGeocodeAsync({ latitude, longitude });
      if (results.length > 0) {
        const addr = results[0];
        const parts = [
          addr.street,
          addr.streetNumber,
          addr.district,
          addr.city,
          addr.region
        ].filter(Boolean);
        return parts.join(', ') || `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
      }
    } catch (e) {
      console.log("Error en geocodificación inversa:", e);
    }
    return undefined;
  };

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    setScanned(true);
    try {
      const parsed = JSON.parse(data);
      if (parsed.app !== "uide_transporte") {
        Alert.alert("QR Inválido", "Este código no es del sistema de transporte.");
        setScanned(false);
        return;
      }

      setLoading(true);
      const routeId = String(parsed.id);
      const routeName = parsed.ruta;
      const busId = parsed.bus_id || routeId;
      let dbId: number | undefined = undefined;

      let startLat: number | undefined;
      let startLon: number | undefined;
      let startAddress: string | undefined;
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({});
          startLat = loc.coords.latitude;
          startLon = loc.coords.longitude;
          startAddress = await getAddressFromCoords(startLat, startLon);
        }
      } catch (e) { console.log("No se pudo obtener ubicación de inicio"); }

      try {
        const response = await fetch(`${API_URL}/api/viajes/iniciar`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            bus_id: busId,
            route_id: routeId,
            start_latitude: startLat,
            start_longitude: startLon,
            start_address: startAddress
          })
        });

        if (response.ok) {
          const res = await response.json();
          dbId = res.viaje_id;
        } else {
          Alert.alert("Error Servidor", "El servidor respondió con error");
        }
      } catch (e) {
        Alert.alert("Modo Offline", "No se pudo conectar con la PC. Se guardará local.");
      }

      const newTrip: Trip = {
        localId: Date.now().toString(),
        databaseId: dbId,
        route: { id: routeId, name: routeName, busNumber: busId },
        startTime: new Date().toISOString(),
        status: 'active',
        syncStatus: dbId ? 'synced' : 'pending_start',
        startLatitude: startLat,
        startLongitude: startLon,
        startAddress
      };

      await AsyncStorage.setItem('active_trip', JSON.stringify(newTrip));
      setActiveTrip(newTrip);
      addToHistory(newTrip);
      setView('ON_TRIP');

    } catch (e) {
      Alert.alert("Error", "No se pudo leer el QR");
    } finally {
      setLoading(false);
      setScanned(false);
    }
  };

  const handleFinishTrip = async () => {
    if (!activeTrip) return;
    setLoading(true);

    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert("Permiso Denegado", "Se requiere GPS para finalizar.");
      setLoading(false);
      return;
    }

    try {
      const loc = await Location.getCurrentPositionAsync({});
      let synced = false;
      const endAddress = await getAddressFromCoords(loc.coords.latitude, loc.coords.longitude);

      if (activeTrip.databaseId) {
        try {
          const res = await fetch(`${API_URL}/api/viajes/finalizar/${activeTrip.databaseId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              latitude: loc.coords.latitude,
              longitude: loc.coords.longitude,
              address: endAddress
            })
          });
          if (res.ok) synced = true;
        } catch (e) { console.log("Error sync salida"); }
      }

      let syncStatus: 'synced' | 'pending_start' | 'pending_end' = 'synced';
      if (!activeTrip.databaseId) {
        syncStatus = 'pending_start';
      } else if (!synced) {
        syncStatus = 'pending_end';
      }

      const completedTrip: Trip = {
        ...activeTrip,
        status: 'completed',
        endTime: new Date().toISOString(),
        syncStatus,
        endLatitude: loc.coords.latitude,
        endLongitude: loc.coords.longitude,
        endAddress
      };

      const updatedHistory = history.map(t => t.localId === activeTrip.localId ? completedTrip : t);
      setHistory(updatedHistory);
      await AsyncStorage.setItem('trips_history', JSON.stringify(updatedHistory));

      await AsyncStorage.removeItem('active_trip');
      setActiveTrip(null);
      setView('HOME');

      if (syncStatus !== 'synced') {
        Alert.alert("Viaje Finalizado", "Se sincronizará cuando haya conexión 💾");
      }

    } catch (e) {
      Alert.alert("Error GPS", "No se pudo obtener ubicación");
    } finally {
      setLoading(false);
    }
  };

  // --- RENDERIZADO DE PANTALLA COMPLETA QR ---
  if (view === 'SCANNING') {
    return (
      <ScanningScreen
        permissionGranted={!!permission?.granted}
        requestPermission={requestPermission}
        scanned={scanned}
        handleBarCodeScanned={handleBarCodeScanned}
        loading={loading}
        onCancel={() => setView('HOME')}
      />
    );
  }

  // --- RENDERIZADO PRINCIPAL DE LA APP ---
  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <LinearGradient colors={['rgba(79, 70, 229, 0.1)', 'transparent']} style={styles.backgroundGradient} />

      <SafeAreaView style={{ flex: 1 }}>
        {/* Cabecera compartida para modo Estudiante/Pasajero */}
        {view !== 'MAP' && view !== 'SETTINGS' && view !== 'DRIVER_LOGIN' && view !== 'DRIVER_HOME' && view !== 'DRIVER_JORNADA_ACTIVA' && view !== 'DRIVER_HISTORIAL' && (
          <>
            <View style={styles.header}>
              <View style={styles.statusPill}>
                <View style={styles.dotContainer}><View style={styles.dotPing} /><View style={styles.dotSolid} /></View>
                <Text style={styles.statusText}>SISTEMA ONLINE</Text>
              </View>
              <View style={styles.headerRight}>
                <Text style={styles.dateText}>{todayDate}</Text>
                <TouchableOpacity
                  style={styles.settingsBtn}
                  onPress={() => setView('SETTINGS')}
                >
                  <Settings size={20} color={COLORS.gray} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.titleContainer}>
              <Text style={styles.mainTitle}>Bus</Text>
              <Text style={styles.subTitle}>Connect</Text>
              <Text style={styles.brandText}>Transporte UIDE</Text>
            </View>
          </>
        )}

        <View style={styles.content}>
          {view === 'HOME' ? (
            <PassengerHomeScreen onScanPress={() => setView('SCANNING')} />
          ) : view === 'DRIVER_HOME' ? (
            <DriverHomeScreen
              driverData={driverData}
              selectedHorario={selectedHorario}
              setSelectedHorario={setSelectedHorario}
              selectedRoute={selectedRoute}
              setSelectedRoute={setSelectedRoute}
              routes={routes}
              handleStartJornada={handleStartJornada}
              loading={loading}
              onViewHistory={() => setView('DRIVER_HISTORIAL')}
              onLogout={handleDriverLogout}
            />
          ) : view === 'DRIVER_HISTORIAL' ? (
            <DriverHistoryScreen
              driverHistorial={driverHistorial}
              onBack={() => setView('DRIVER_HOME')}
            />
          ) : view === 'DRIVER_JORNADA_ACTIVA' ? (
            <DriverJornadaScreen
              driverData={driverData}
              selectedRoute={selectedRoute}
              activeJornada={activeJornada}
              elapsedTime={elapsedTime}
              handleEndJornada={handleEndJornada}
              handleEmergency={handleEmergency}
              handleAddStudent={handleAddStudent}
            />
          ) : view === 'ON_TRIP' ? (
            <PassengerTripScreen
              activeTrip={activeTrip}
              onFinishTrip={handleFinishTrip}
              loading={loading}
            />
          ) : view === 'MAP' ? (
            <LeafletMap
              userLocation={userLocation}
              startWatchingLocation={startWatchingLocation}
            />
          ) : view === 'DRIVER_LOGIN' ? (
            <DriverLoginScreen
              pinInput={pinInput}
              setPinInput={setPinInput}
              handleDriverLogin={handleDriverLogin}
              loading={loading}
              onCancel={() => { setView('HOME'); setPinInput(''); }}
            />
          ) : view === 'SETTINGS' ? (
            <PassengerSettingsScreen
              onBack={() => setView('HOME')}
              onSelectDriverMode={() => setView('DRIVER_LOGIN')}
            />
          ) : view === 'SCHEDULES' ? (
            <PassengerSchedulesScreen
              schedules={schedules}
              todayDate={todayDate}
            />
          ) : (
            <PassengerHistoryScreen history={history} />
          )}
        </View>

        {/* Barra de navegación inferior compartida */}
        {(view === 'HOME' || view === 'HISTORY' || view === 'MAP' || view === 'SCHEDULES') && (
          <View style={styles.navbar}>
            <TouchableOpacity onPress={() => setView('HOME')} style={styles.navItem}>
              <Home color={view === 'HOME' ? COLORS.dark : COLORS.gray} size={24} />
              <Text style={[styles.navLabel, view === 'HOME' && styles.navLabelActive]}>Inicio</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setView('MAP')} style={styles.navItem}>
              <MapPin color={view === 'MAP' ? COLORS.dark : COLORS.gray} size={24} />
              <Text style={[styles.navLabel, view === 'MAP' && styles.navLabelActive]}>Mapa</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { loadSchedules(); setView('SCHEDULES'); }} style={styles.navItem}>
              <Bus color={view === 'SCHEDULES' ? COLORS.dark : COLORS.gray} size={24} />
              <Text style={[styles.navLabel, view === 'SCHEDULES' && styles.navLabelActive]}>Horarios</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setView('HISTORY')} style={styles.navItem}>
              <Clock color={view === 'HISTORY' ? COLORS.dark : COLORS.gray} size={24} />
              <Text style={[styles.navLabel, view === 'HISTORY' && styles.navLabelActive]}>Historial</Text>
            </TouchableOpacity>
          </View>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  backgroundGradient: { position: 'absolute', top: 0, left: 0, right: 0, height: 400 },
  header: { paddingHorizontal: 24, paddingTop: 33, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statusPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.8)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.5)' },
  dotContainer: { width: 10, height: 10, marginRight: 8, justifyContent: 'center', alignItems: 'center' },
  dotPing: { position: 'absolute', width: 10, height: 10, borderRadius: 5, backgroundColor: '#34D399', opacity: 0.5 },
  dotSolid: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#10B981' },
  statusText: { fontSize: 10, fontWeight: 'bold', color: '#6B7280', letterSpacing: 0.5 },
  dateText: { fontSize: 12, fontWeight: 'bold', color: '#9CA3AF', textTransform: 'capitalize' },
  titleContainer: { paddingHorizontal: 24, marginTop: 10 },
  mainTitle: { fontSize: 42, fontWeight: '800', color: COLORS.dark, lineHeight: 42 },
  subTitle: { fontSize: 42, fontWeight: '800', color: '#4B5563', lineHeight: 42 },
  brandText: { marginTop: 4, fontSize: 14, color: '#9CA3AF', fontWeight: '500' },
  content: { flex: 1, paddingTop: 20 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  settingsBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' },
  navbar: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.9)', paddingBottom: 20, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  navItem: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  navLabel: { fontSize: 10, fontWeight: '600', color: COLORS.gray, marginTop: 4 },
  navLabelActive: { color: COLORS.dark },
});