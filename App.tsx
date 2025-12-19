import React, { useState, useEffect, useCallback, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Alert, ActivityIndicator, SafeAreaView, StatusBar, ScrollView, Dimensions } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { Home, Clock, QrCode, Bus, Navigation, StopCircle, MapPin, Settings } from 'lucide-react-native';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import * as Network from 'expo-network';
import { WebView } from 'react-native-webview';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// --- CONFIGURACIÓN ---
const API_URL = 'http://192.168.100.204:8000';

// --- TIPOS ---
interface RouteInfo { id: string; name: string; busNumber?: string; }
interface Trip {
  localId: string;
  databaseId?: number;
  route: RouteInfo;
  startTime: string;
  endTime?: string;
  status: 'active' | 'completed';
  // Campos para sincronización offline
  syncStatus: 'synced' | 'pending_start' | 'pending_end';
  startLatitude?: number;
  startLongitude?: number;
  startAddress?: string;
  endLatitude?: number;
  endLongitude?: number;
  endAddress?: string;
}

// --- TIPOS CONDUCTOR ---
interface ConductorData {
  id: number;
  nombre: string;
  bus_asignado: string;
}

interface JornadaData {
  id: number;
  inicio: string;
  estudiantes_transportados: number;
}

// --- COLORES ---
const COLORS = {
  background: '#FAFAFA',
  dark: '#111827',
  primary: '#4F46E5',
  text: '#1F2937',
  gray: '#9CA3AF',
  success: '#10B981',
  driver: '#F59E0B', // Color especial para modo conductor
};

export default function App() {
  const [view, setView] = useState<'HOME' | 'SCANNING' | 'ON_TRIP' | 'HISTORY' | 'MAP' | 'SETTINGS' | 'DRIVER_LOGIN' | 'DRIVER_HOME'>('HOME');
  const [activeTrip, setActiveTrip] = useState<Trip | null>(null);
  const [history, setHistory] = useState<Trip[]>([]);
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationWatcher, setLocationWatcher] = useState<Location.LocationSubscription | null>(null);
  const webViewRef = useRef<WebView>(null);

  // --- ESTADOS MODO CONDUCTOR ---
  const [isDriverMode, setIsDriverMode] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [driverData, setDriverData] = useState<ConductorData | null>(null);
  const [activeJornada, setActiveJornada] = useState<JornadaData | null>(null);

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

  // --- WATCH LOCATION FOR MAP ---
  const startWatchingLocation = useCallback(async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert("Permiso Denegado", "Se requiere GPS para ver el mapa.");
      setView('HOME');
      return;
    }

    // Get initial location
    try {
      const loc = await Location.getCurrentPositionAsync({});
      setUserLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
    } catch (e) {
      console.log("Error getting initial location:", e);
    }

    // Watch location
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
      await loadActiveJornada(data.conductor.id);
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
      if (data.jornada) {
        setActiveJornada(data.jornada);
      }
    } catch (e) {
      console.log("Error cargando jornada:", e);
    }
  };

  const handleStartJornada = async () => {
    if (!driverData) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/conductor/jornada/iniciar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conductor_id: driverData.id })
      });

      if (res.ok) {
        const data = await res.json();
        setActiveJornada({ id: data.jornada_id, inicio: new Date().toISOString(), estudiantes_transportados: 0 });
        Alert.alert("Jornada Iniciada", "¡Buen viaje! 🚌");
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
    setIsDriverMode(false);
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

  const addToHistory = async (trip: Trip) => {
    const newHistory = [trip, ...history];
    setHistory(newHistory);
    await AsyncStorage.setItem('trips_history', JSON.stringify(newHistory));
  };

  // --- FUNCIÓN PARA OBTENER DIRECCIÓN DESDE COORDENADAS ---
  const getAddressFromCoords = async (latitude: number, longitude: number): Promise<string | undefined> => {
    try {
      const results = await Location.reverseGeocodeAsync({ latitude, longitude });
      if (results.length > 0) {
        const addr = results[0];
        // Construir dirección legible
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

  // --- LÓGICA SCAN ---
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

      // Obtener ubicación de inicio y dirección
      let startLat: number | undefined;
      let startLon: number | undefined;
      let startAddress: string | undefined;
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({});
          startLat = loc.coords.latitude;
          startLon = loc.coords.longitude;
          // Obtener dirección legible
          startAddress = await getAddressFromCoords(startLat, startLon);
          console.log("📍 Dirección de inicio:", startAddress);
        }
      } catch (e) { console.log("No se pudo obtener ubicación de inicio"); }

      try {
        console.log("Intentando conectar a:", `${API_URL}/api/viajes/iniciar`);

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
          console.log("¡Conexión exitosa! ID BD:", dbId);
        } else {
          console.log("Error servidor:", await response.text());
          Alert.alert("Error Servidor", "El servidor respondió con error");
        }
      } catch (e) {
        console.log("Error de Red / Modo Offline:", e);
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

  // --- LÓGICA GPS ---
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

      // Obtener dirección legible
      const endAddress = await getAddressFromCoords(loc.coords.latitude, loc.coords.longitude);
      console.log("📍 Dirección de fin:", endAddress);

      // Intentar sincronizar con el servidor si tenemos databaseId
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

      // Determinar el estado de sincronización
      let syncStatus: 'synced' | 'pending_start' | 'pending_end' = 'synced';
      if (!activeTrip.databaseId) {
        // Nunca se sincronizó el inicio
        syncStatus = 'pending_start';
      } else if (!synced) {
        // El inicio se sincronizó pero el fin no
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

      // Solo mostrar alerta si hubo problema de sincronización
      if (syncStatus !== 'synced') {
        Alert.alert("Viaje Finalizado", "Se sincronizará cuando haya conexión 💾");
      }

    } catch (e) {
      Alert.alert("Error GPS", "No se pudo obtener ubicación");
    } finally {
      setLoading(false);
    }
  };

  // --- UI (Sin cambios) ---
  if (view === 'SCANNING') {
    if (!permission?.granted) {
      return (
        <View style={styles.center}>
          <Text style={{ marginBottom: 20 }}>Necesitamos acceso a la cámara</Text>
          <TouchableOpacity onPress={requestPermission} style={styles.btnBlack}><Text style={styles.btnText}>Permitir</Text></TouchableOpacity>
        </View>
      );
    }
    return (
      <View style={{ flex: 1, backgroundColor: 'black' }}>
        <CameraView style={StyleSheet.absoluteFill} facing="back" onBarcodeScanned={scanned ? undefined : handleBarCodeScanned} />
        <SafeAreaView style={{ flex: 1 }}>
          <View style={{ flex: 1 }} />
          <View style={styles.scanOverlay}>
            <Text style={{ color: 'white', marginBottom: 20, fontWeight: 'bold' }}>Escanea el QR del Bus</Text>
            {loading && <ActivityIndicator color="white" />}
            <TouchableOpacity onPress={() => setView('HOME')} style={{ marginTop: 20, backgroundColor: 'rgba(255,255,255,0.2)', padding: 10, borderRadius: 20 }}>
              <Text style={{ color: 'white' }}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <LinearGradient colors={['rgba(79, 70, 229, 0.1)', 'transparent']} style={styles.backgroundGradient} />

      <SafeAreaView style={{ flex: 1 }}>
        {view !== 'MAP' && view !== 'SETTINGS' && view !== 'DRIVER_LOGIN' && view !== 'DRIVER_HOME' && (
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
            <View style={styles.centerContent}>
              <TouchableOpacity style={styles.orbButton} onPress={() => setView('SCANNING')}>
                <LinearGradient colors={['#111827', '#374151']} style={styles.orbGradient}>
                  <QrCode color="white" size={48} />
                  <Text style={styles.orbText}>ESCANEAR</Text>
                </LinearGradient>
                <View style={[styles.ring, { width: 220, height: 220 }]} />
                <View style={[styles.ring, { width: 260, height: 260, opacity: 0.3 }]} />
              </TouchableOpacity>
              <View style={{ marginTop: 40, alignItems: 'center' }}>
                <Text style={styles.sectionTitle}>Iniciar Nuevo Viaje</Text>
                <Text style={styles.sectionSub}>Acerca tu dispositivo al código QR</Text>
              </View>
            </View>
          ) : view === 'ON_TRIP' ? (
            <View style={styles.tripCard}>
              <View style={styles.tripHeader}><View style={styles.statusBadge}><View style={[styles.dotSolid, { backgroundColor: '#10B981' }]} /></View></View>
              <View style={styles.busIconBox}><Bus color="white" size={32} /></View>
              <Text style={styles.tripTitle}>{activeTrip?.route.name}</Text>
              <Text style={styles.tripSub}>Unidad #{activeTrip?.route.busNumber || '---'}</Text>

              <View style={styles.infoGrid}>
                <View style={styles.infoBox}><Clock size={16} color={COLORS.gray} /><Text style={styles.infoLabel}>INICIO</Text><Text style={styles.infoValue}>{activeTrip ? format(new Date(activeTrip.startTime), 'HH:mm') : '--'}</Text></View>
                <View style={styles.infoBox}><Navigation size={16} color={COLORS.gray} /><Text style={styles.infoLabel}>ESTADO</Text><Text style={styles.infoValue}>En Ruta</Text></View>
              </View>

              <TouchableOpacity style={styles.finishBtn} onPress={handleFinishTrip} disabled={loading}>
                {loading ? <ActivityIndicator color="white" /> : (<><StopCircle color="white" size={20} style={{ marginRight: 10 }} /><Text style={styles.btnText}>FINALIZAR VIAJE</Text></>)}
              </TouchableOpacity>
            </View>
          ) : view === 'MAP' ? (
            <View style={styles.mapContainer}>
              <View style={styles.mapHeader}>
                <Text style={styles.mapTitle}>Tu Ubicación</Text>
                <TouchableOpacity
                  style={styles.centerBtn}
                  onPress={() => {
                    // Force refresh location
                    startWatchingLocation();
                  }}
                >
                  <Navigation size={18} color="#fff" />
                </TouchableOpacity>
              </View>
              {userLocation ? (
                <WebView
                  style={styles.map}
                  originWhitelist={['*']}
                  source={{
                    html: `
                      <!DOCTYPE html>
                      <html>
                      <head>
                        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
                        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
                        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
                        <style>
                          * { margin: 0; padding: 0; }
                          html, body, #map { width: 100%; height: 100%; }
                        </style>
                      </head>
                      <body>
                        <div id="map"></div>
                        <script>
                          var map = L.map('map').setView([${userLocation.latitude}, ${userLocation.longitude}], 16);
                          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                            attribution: '© OpenStreetMap'
                          }).addTo(map);
                          
                          var pulsingIcon = L.divIcon({
                            className: 'pulsing-marker',
                            html: '<div style="width: 20px; height: 20px; background: #4F46E5; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 10px rgba(0,0,0,0.3);"><div style="position: absolute; width: 40px; height: 40px; background: rgba(79,70,229,0.3); border-radius: 50%; top: -10px; left: -10px; animation: pulse 2s infinite;"></div></div><style>@keyframes pulse { 0% { transform: scale(1); opacity: 1; } 100% { transform: scale(2); opacity: 0; } }</style>',
                            iconSize: [20, 20],
                            iconAnchor: [10, 10]
                          });
                          
                          L.marker([${userLocation.latitude}, ${userLocation.longitude}], {icon: pulsingIcon})
                            .addTo(map)
                            .bindPopup('<b>Tu ubicación</b><br>Estás aquí');
                        </script>
                      </body>
                      </html>
                    `
                  }}
                />
              ) : (
                <View style={styles.mapLoading}>
                  <ActivityIndicator size="large" color={COLORS.dark} />
                  <Text style={styles.mapLoadingText}>Obteniendo ubicación...</Text>
                </View>
              )}
              <View style={styles.locationInfo}>
                <MapPin size={16} color={COLORS.gray} />
                <Text style={styles.locationText}>
                  {userLocation
                    ? `${userLocation.latitude.toFixed(6)}, ${userLocation.longitude.toFixed(6)}`
                    : 'Buscando GPS...'}
                </Text>
              </View>
            </View>
          ) : view === 'DRIVER_LOGIN' ? (
            <View style={styles.driverLoginContainer}>
              <View style={styles.driverLoginCard}>
                <View style={styles.driverIconBox}>
                  <Bus color="white" size={40} />
                </View>
                <Text style={styles.driverLoginTitle}>Modo Conductor</Text>
                <Text style={styles.driverLoginSub}>Ingresa tu PIN de acceso</Text>

                <View style={styles.pinDisplay}>
                  {[0, 1, 2, 3].map(i => (
                    <View key={i} style={[styles.pinDot, pinInput.length > i && styles.pinDotFilled]} />
                  ))}
                </View>

                <View style={styles.pinPad}>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, null, 0, 'del'].map((num, i) => (
                    <TouchableOpacity
                      key={i}
                      style={[styles.pinKey, num === null && { opacity: 0 }]}
                      disabled={num === null}
                      onPress={() => {
                        if (num === 'del') {
                          setPinInput(prev => prev.slice(0, -1));
                        } else if (typeof num === 'number' && pinInput.length < 4) {
                          setPinInput(prev => prev + num.toString());
                        }
                      }}
                    >
                      <Text style={styles.pinKeyText}>{num === 'del' ? '⌫' : num}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <TouchableOpacity
                  style={[styles.driverLoginBtn, pinInput.length !== 4 && { opacity: 0.5 }]}
                  onPress={handleDriverLogin}
                  disabled={pinInput.length !== 4 || loading}
                >
                  {loading ? <ActivityIndicator color="white" /> : <Text style={styles.btnText}>INGRESAR</Text>}
                </TouchableOpacity>

                <TouchableOpacity onPress={() => { setView('HOME'); setPinInput(''); }} style={{ marginTop: 20 }}>
                  <Text style={{ color: COLORS.gray }}>Cancelar</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : view === 'DRIVER_HOME' ? (
            <ScrollView style={{ flex: 1 }}>
              <View style={styles.driverHeader}>
                <View style={styles.driverAvatarBox}>
                  <Bus color="white" size={28} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.driverName}>{driverData?.nombre || 'Conductor'}</Text>
                  <Text style={styles.driverBus}>Bus: {driverData?.bus_asignado || '---'}</Text>
                </View>
                <TouchableOpacity onPress={handleDriverLogout} style={styles.logoutBtn}>
                  <Text style={{ color: COLORS.gray, fontSize: 12 }}>Salir</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.studentCounter}>
                <Text style={styles.studentLabel}>ESTUDIANTES TRANSPORTADOS</Text>
                <Text style={styles.studentCount}>{activeJornada?.estudiantes_transportados || 0}</Text>
                <TouchableOpacity
                  style={[styles.addStudentBtn, !activeJornada && { opacity: 0.5 }]}
                  onPress={handleAddStudent}
                  disabled={!activeJornada}
                >
                  <Text style={styles.addStudentText}>+ Registrar Estudiante</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.jornadaCard}>
                {activeJornada ? (
                  <>
                    <View style={styles.jornadaActive}>
                      <View style={[styles.dotSolid, { backgroundColor: COLORS.success }]} />
                      <Text style={styles.jornadaStatus}>Jornada Activa</Text>
                    </View>
                    <Text style={styles.jornadaTime}>
                      Inicio: {activeJornada.inicio ? format(new Date(activeJornada.inicio), 'HH:mm') : '--'}
                    </Text>
                    <TouchableOpacity style={styles.endJornadaBtn} onPress={handleEndJornada} disabled={loading}>
                      {loading ? <ActivityIndicator color="white" /> : (
                        <><StopCircle color="white" size={18} style={{ marginRight: 8 }} /><Text style={styles.btnText}>FINALIZAR JORNADA</Text></>
                      )}
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <Text style={styles.jornadaInactive}>Sin jornada activa</Text>
                    <TouchableOpacity style={styles.startJornadaBtn} onPress={handleStartJornada} disabled={loading}>
                      {loading ? <ActivityIndicator color="white" /> : (
                        <><Clock color="white" size={18} style={{ marginRight: 8 }} /><Text style={styles.btnText}>INICIAR JORNADA</Text></>
                      )}
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </ScrollView>
          ) : view === 'SETTINGS' ? (
            <View style={{ flex: 1, paddingHorizontal: 20 }}>
              <View style={styles.settingsHeader}>
                <TouchableOpacity onPress={() => setView('HOME')} style={styles.backBtn}>
                  <Text style={{ fontSize: 24, color: COLORS.dark }}>←</Text>
                </TouchableOpacity>
                <Text style={styles.settingsTitle}>Configuración</Text>
                <View style={{ width: 40 }} />
              </View>

              <View style={styles.settingsList}>
                <TouchableOpacity
                  style={styles.settingsItem}
                  onPress={() => setView('DRIVER_LOGIN')}
                >
                  <View style={styles.settingsItemIcon}>
                    <Bus size={22} color={COLORS.driver} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.settingsItemTitle}>Modo Conductor</Text>
                    <Text style={styles.settingsItemSub}>Acceso para conductores de bus</Text>
                  </View>
                  <Text style={{ fontSize: 18, color: COLORS.gray }}>›</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <ScrollView style={{ paddingHorizontal: 20 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <Text style={styles.sectionTitle}>Historial</Text>
              </View>
              {history.map((trip, i) => (
                <View key={i} style={styles.historyCard}>
                  <View style={styles.dateBox}>
                    <Text style={styles.dateDay}>{format(new Date(trip.startTime), 'd')}</Text>
                    <Text style={styles.dateMonth}>{format(new Date(trip.startTime), 'MMM', { locale: es })}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.historyTitle} numberOfLines={1}>{trip.route.name}</Text>
                    <Text style={styles.historyTime}>{format(new Date(trip.startTime), 'HH:mm')} • {trip.status === 'active' ? 'En curso' : 'Completado'}</Text>
                  </View>
                </View>
              ))}
            </ScrollView>
          )}
        </View>

        {(view === 'HOME' || view === 'HISTORY' || view === 'MAP') && (
          <View style={styles.navbar}>
            <TouchableOpacity onPress={() => setView('HOME')} style={styles.navItem}>
              <Home color={view === 'HOME' ? COLORS.dark : COLORS.gray} size={24} />
              <Text style={[styles.navLabel, view === 'HOME' && styles.navLabelActive]}>Inicio</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setView('MAP')} style={styles.navItem}>
              <MapPin color={view === 'MAP' ? COLORS.dark : COLORS.gray} size={24} />
              <Text style={[styles.navLabel, view === 'MAP' && styles.navLabelActive]}>Mapa</Text>
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
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
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
  centerContent: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingBottom: 80 },
  orbButton: { width: 180, height: 180, borderRadius: 90, justifyContent: 'center', alignItems: 'center', elevation: 20, shadowColor: COLORS.primary, shadowOpacity: 0.3, shadowRadius: 20, shadowOffset: { width: 0, height: 10 } },
  orbGradient: { width: '100%', height: '100%', borderRadius: 90, justifyContent: 'center', alignItems: 'center', padding: 4 },
  orbText: { color: 'white', fontWeight: 'bold', letterSpacing: 2, fontSize: 12, marginTop: 8 },
  ring: { position: 'absolute', borderRadius: 200, borderWidth: 1, borderColor: '#C7D2FE', zIndex: -1 },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', color: COLORS.dark },
  sectionSub: { fontSize: 14, color: COLORS.gray, marginTop: 4 },
  tripCard: { margin: 24, backgroundColor: 'white', borderRadius: 32, padding: 30, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 20, elevation: 5 },
  tripHeader: { width: '100%', alignItems: 'flex-end', marginBottom: -20, zIndex: 1 },
  statusBadge: { width: 12, height: 12, backgroundColor: '#D1FAE5', borderRadius: 6, justifyContent: 'center', alignItems: 'center' },
  busIconBox: { width: 80, height: 80, backgroundColor: 'black', borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  tripTitle: { fontSize: 24, fontWeight: 'bold', color: COLORS.dark, textAlign: 'center' },
  tripSub: { fontSize: 14, color: COLORS.gray, fontWeight: '500', marginBottom: 30 },
  infoGrid: { flexDirection: 'row', gap: 15, width: '100%', marginBottom: 30 },
  infoBox: { flex: 1, backgroundColor: '#F9FAFB', padding: 15, borderRadius: 16, alignItems: 'center', borderWidth: 1, borderColor: '#F3F4F6' },
  infoLabel: { fontSize: 10, fontWeight: 'bold', color: COLORS.gray, marginTop: 5 },
  infoValue: { fontSize: 18, fontWeight: 'bold', color: COLORS.dark, marginTop: 2 },
  finishBtn: { width: '100%', backgroundColor: 'black', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 18, borderRadius: 16 },
  btnText: { color: 'white', fontWeight: 'bold', fontSize: 14, letterSpacing: 1 },
  btnBlack: { backgroundColor: 'black', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  historyCard: { flexDirection: 'row', backgroundColor: 'white', padding: 16, borderRadius: 16, marginBottom: 12, alignItems: 'center', borderWidth: 1, borderColor: '#F3F4F6' },
  dateBox: { width: 48, height: 48, backgroundColor: '#F9FAFB', borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 16, borderWidth: 1, borderColor: '#F3F4F6' },
  dateDay: { fontSize: 14, fontWeight: 'bold', color: COLORS.dark },
  dateMonth: { fontSize: 10, fontWeight: 'bold', color: COLORS.gray, textTransform: 'uppercase' },
  historyTitle: { fontSize: 14, fontWeight: 'bold', color: COLORS.dark },
  historyTime: { fontSize: 12, color: COLORS.gray },
  navbar: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.9)', paddingBottom: 20, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  navItem: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  navLabel: { fontSize: 10, fontWeight: '600', color: COLORS.gray, marginTop: 4 },
  navLabelActive: { color: COLORS.dark },
  scanOverlay: { alignItems: 'center', paddingBottom: 50, backgroundColor: 'rgba(0,0,0,0.6)', paddingTop: 20 },
  // Map styles
  mapContainer: { flex: 1, margin: 16, borderRadius: 24, overflow: 'hidden', backgroundColor: 'white', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, elevation: 5 },
  mapHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  mapTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.dark },
  centerBtn: { width: 40, height: 40, backgroundColor: COLORS.dark, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  map: { flex: 1, width: '100%' },
  mapLoading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F9FAFB' },
  mapLoadingText: { marginTop: 12, fontSize: 14, color: COLORS.gray },
  locationInfo: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: 'white', borderTopWidth: 1, borderTopColor: '#F3F4F6', gap: 8 },
  locationText: { fontSize: 13, color: COLORS.gray, fontFamily: 'monospace' },
  markerContainer: { alignItems: 'center', justifyContent: 'center' },
  markerOuter: { width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(79, 70, 229, 0.2)', justifyContent: 'center', alignItems: 'center' },
  markerInner: { width: 14, height: 14, borderRadius: 7, backgroundColor: COLORS.primary, borderWidth: 2, borderColor: 'white' },
  // Settings styles
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  settingsBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' },
  settingsDropdown: { position: 'absolute', top: 90, right: 24, backgroundColor: 'white', borderRadius: 16, padding: 8, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 20, elevation: 10, zIndex: 100 },
  settingsOption: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12 },
  settingsOptionText: { fontSize: 15, fontWeight: '500', color: COLORS.dark },
  // Driver mode styles
  driverToggle: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 30, backgroundColor: 'rgba(245, 158, 11, 0.1)', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 100, borderWidth: 1, borderColor: 'rgba(245, 158, 11, 0.3)' },
  driverToggleText: { color: COLORS.driver, fontWeight: '600', fontSize: 14 },
  driverLoginContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  driverLoginCard: { width: '100%', backgroundColor: 'white', borderRadius: 32, padding: 32, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 20, elevation: 5 },
  driverIconBox: { width: 80, height: 80, backgroundColor: COLORS.driver, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  driverLoginTitle: { fontSize: 24, fontWeight: 'bold', color: COLORS.dark },
  driverLoginSub: { fontSize: 14, color: COLORS.gray, marginTop: 4, marginBottom: 24 },
  pinDisplay: { flexDirection: 'row', gap: 16, marginBottom: 24 },
  pinDot: { width: 16, height: 16, borderRadius: 8, backgroundColor: '#E5E7EB', borderWidth: 2, borderColor: '#D1D5DB' },
  pinDotFilled: { backgroundColor: COLORS.driver, borderColor: COLORS.driver },
  pinPad: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', width: 240, gap: 12 },
  pinKey: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' },
  pinKeyText: { fontSize: 24, fontWeight: '600', color: COLORS.dark },
  driverLoginBtn: { width: '100%', backgroundColor: COLORS.driver, alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRadius: 16, marginTop: 24 },
  driverHeader: { flexDirection: 'row', alignItems: 'center', padding: 20, backgroundColor: 'white', marginHorizontal: 16, marginTop: 16, borderRadius: 20, gap: 16 },
  driverAvatarBox: { width: 56, height: 56, backgroundColor: COLORS.driver, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  driverName: { fontSize: 18, fontWeight: 'bold', color: COLORS.dark },
  driverBus: { fontSize: 13, color: COLORS.gray, marginTop: 2 },
  logoutBtn: { backgroundColor: '#F3F4F6', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  studentCounter: { backgroundColor: 'white', marginHorizontal: 16, marginTop: 16, borderRadius: 20, padding: 24, alignItems: 'center' },
  studentLabel: { fontSize: 11, fontWeight: 'bold', color: COLORS.gray, letterSpacing: 1 },
  studentCount: { fontSize: 72, fontWeight: 'bold', color: COLORS.dark, marginVertical: 8 },
  addStudentBtn: { backgroundColor: COLORS.success, paddingHorizontal: 24, paddingVertical: 14, borderRadius: 14, marginTop: 8 },
  addStudentText: { color: 'white', fontWeight: 'bold', fontSize: 15 },
  jornadaCard: { backgroundColor: 'white', marginHorizontal: 16, marginTop: 16, marginBottom: 32, borderRadius: 20, padding: 24, alignItems: 'center' },
  jornadaActive: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  jornadaStatus: { fontSize: 14, fontWeight: '600', color: COLORS.success },
  jornadaTime: { fontSize: 13, color: COLORS.gray, marginBottom: 20 },
  jornadaInactive: { fontSize: 16, color: COLORS.gray, marginBottom: 20 },
  startJornadaBtn: { width: '100%', backgroundColor: COLORS.driver, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRadius: 16 },
  endJornadaBtn: { width: '100%', backgroundColor: '#EF4444', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRadius: 16 },
  // Settings view styles
  settingsHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 16, marginBottom: 10 },
  settingsTitle: { fontSize: 20, fontWeight: 'bold', color: COLORS.dark },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' },
  settingsList: { gap: 12 },
  settingsItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', padding: 16, borderRadius: 16, gap: 16 },
  settingsItemIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(245, 158, 11, 0.1)', justifyContent: 'center', alignItems: 'center' },
  settingsItemTitle: { fontSize: 16, fontWeight: '600', color: COLORS.dark },
  settingsItemSub: { fontSize: 13, color: COLORS.gray, marginTop: 2 },
});