import React from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { History, Bus } from 'lucide-react-native';
import { ConductorData } from '../types';
import { COLORS, HORARIOS_SALIDA } from '../constants';

interface DriverHomeScreenProps {
  driverData: ConductorData | null;
  selectedHorario: string | null;
  setSelectedHorario: React.Dispatch<React.SetStateAction<string | null>>;
  selectedRoute: { id: number; nombre_ruta: string } | null;
  setSelectedRoute: React.Dispatch<React.SetStateAction<{ id: number; nombre_ruta: string } | null>>;
  routes: { id: number; nombre_ruta: string }[];
  handleStartJornada: () => void;
  loading: boolean;
  onViewHistory: () => void;
  onLogout: () => void;
}

export default function DriverHomeScreen({
  driverData,
  selectedHorario,
  setSelectedHorario,
  selectedRoute,
  setSelectedRoute,
  routes,
  handleStartJornada,
  loading,
  onViewHistory,
  onLogout,
}: DriverHomeScreenProps) {
  return (
    <View style={{ flex: 1 }}>
      {/* Fixed Header */}
      <View style={styles.driverHomeHeader}>
        <TouchableOpacity style={styles.historyBtn} onPress={onViewHistory}>
          <History size={24} color={COLORS.gray} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.driverTitle}>Modo Conductor</Text>
          <View style={styles.driverSubInfoContainer}>
            <Text style={styles.driverSubInfo}>
              {driverData?.nombre || 'Conductor'} • Bus: {driverData?.bus_asignado || '---'}
            </Text>
            <TouchableOpacity style={styles.logoutBtn} onPress={onLogout}>
              <Text style={styles.logoutText}>Salir</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Scrollable content */}
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 20 }}>
        {/* Schedule selector - horizontal */}
        <Text style={styles.label}>1. Selecciona el horario</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {HORARIOS_SALIDA.map(h => (
              <TouchableOpacity
                key={h}
                style={[styles.optionBtn, selectedHorario === h && styles.optionBtnSelected]}
                onPress={() => {
                  setSelectedHorario(h);
                  setSelectedRoute(null);
                }}
              >
                <Text style={[styles.optionText, selectedHorario === h && { color: COLORS.driver }]}>{h}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {/* Route selector */}
        {selectedHorario && (
          <View style={styles.routeCard}>
            <Text style={styles.routeCardTitle}>2. Selecciona la ruta</Text>
            {routes.length === 0 ? (
              <Text style={styles.emptyText}>No hay rutas disponibles</Text>
            ) : (
              <View style={{ gap: 10 }}>
                {routes.map(r => (
                  <TouchableOpacity
                    key={r.id}
                    style={[styles.routeItem, selectedRoute?.id === r.id && styles.routeItemSelected]}
                    onPress={() => setSelectedRoute(r)}
                  >
                    <Bus size={20} color={selectedRoute?.id === r.id ? COLORS.driver : COLORS.gray} />
                    <Text style={[styles.routeItemText, selectedRoute?.id === r.id && styles.routeItemTextSelected]}>
                      {r.nombre_ruta}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Fixed bottom button */}
      <View style={styles.driverBottomActions}>
        <TouchableOpacity
          style={[styles.startBtn, (!selectedHorario || !selectedRoute) && { opacity: 0.5 }]}
          onPress={handleStartJornada}
          disabled={loading || !selectedHorario || !selectedRoute}
        >
          {loading ? <ActivityIndicator color="white" /> : <Text style={styles.btnText}>INICIAR JORNADA</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  driverHomeHeader: { paddingHorizontal: 24, paddingTop: 40, paddingBottom: 16, flexDirection: 'row', alignItems: 'center' },
  historyBtn: { position: 'absolute', top: 16, right: 16, width: 44, height: 44, borderRadius: 22, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center', zIndex: 10 },
  driverTitle: { fontSize: 28, fontWeight: 'bold', color: COLORS.dark, marginBottom: 8, textAlign: 'center' },
  driverSubInfoContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10 },
  driverSubInfo: { fontSize: 13, color: COLORS.gray },
  logoutBtn: { backgroundColor: '#F3F4F6', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  logoutText: { fontSize: 11, fontWeight: '600', color: COLORS.danger },
  label: { fontSize: 14, fontWeight: '600', color: COLORS.gray, marginBottom: 12, marginTop: 16 },
  optionBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, backgroundColor: '#F3F4F6', borderWidth: 2, borderColor: 'transparent' },
  optionBtnSelected: { backgroundColor: 'rgba(17, 24, 39, 0.1)', borderColor: COLORS.driver },
  optionText: { fontSize: 14, fontWeight: '600', color: COLORS.dark },
  routeCard: { backgroundColor: '#F3F4F6', borderRadius: 16, padding: 20, marginBottom: 16 },
  routeCardTitle: { fontSize: 14, fontWeight: '600', color: COLORS.gray, marginBottom: 16 },
  emptyText: { fontSize: 16, color: COLORS.gray, textAlign: 'center', marginTop: 40 },
  routeItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', padding: 14, borderRadius: 12, gap: 12, borderWidth: 2, borderColor: 'transparent' },
  routeItemSelected: { borderColor: COLORS.driver, backgroundColor: 'rgba(17, 24, 39, 0.05)' },
  routeItemText: { fontSize: 16, color: COLORS.dark, flex: 1 },
  routeItemTextSelected: { fontWeight: '600', color: COLORS.driver },
  driverBottomActions: { padding: 24, gap: 12, backgroundColor: COLORS.background, borderTopWidth: 1, borderTopColor: '#E5E7EB' },
  startBtn: { backgroundColor: COLORS.driver, paddingVertical: 16, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  btnText: { color: 'white', fontWeight: 'bold', fontSize: 14, letterSpacing: 1 },
});
