import React from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { Bus, StopCircle, AlertTriangle } from 'lucide-react-native';
import { format } from 'date-fns';
import { ConductorData, JornadaData } from '../types';
import { COLORS } from '../constants';

interface DriverJornadaScreenProps {
  driverData: ConductorData | null;
  selectedRoute: { id: number; nombre_ruta: string } | null;
  activeJornada: JornadaData | null;
  elapsedTime: string;
  handleEndJornada: () => void;
  handleEmergency: () => void;
  handleAddStudent?: () => void; // Opcional por compatibilidad
}

export default function DriverJornadaScreen({
  driverData,
  selectedRoute,
  activeJornada,
  elapsedTime,
  handleEndJornada,
  handleEmergency,
  handleAddStudent,
}: DriverJornadaScreenProps) {
  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      {/* Header fijo del conductor */}
      <View style={styles.driverFixedHeader}>
        <View style={styles.driverInfoCard}>
          <View style={styles.driverAvatarCircle}>
            <Bus color="white" size={28} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.driverNameText}>{driverData?.nombre || 'Conductor'}</Text>
            <Text style={styles.driverBusText}>
              Bus: {driverData?.bus_asignado || '---'} • Ruta: {selectedRoute?.nombre_ruta || '---'}
            </Text>
          </View>
        </View>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 24 }}>
        {/* Contador de estudiantes */}
        <View style={styles.studentCounter}>
          <Text style={styles.studentLabel}>ESTUDIANTES TRANSPORTADOS</Text>
          <Text style={styles.studentCount}>{activeJornada?.estudiantes_transportados || 0}</Text>
          <Text style={{ color: COLORS.gray, fontSize: 12 }}>Conteo automático por escaneo QR</Text>
          
          {/* Botón manual si el conductor necesita añadir uno manualmente */}
          {handleAddStudent && (
            <TouchableOpacity style={styles.addStudentBtn} onPress={handleAddStudent}>
              <Text style={styles.addStudentText}>+ Registrar Manual</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Info de la jornada unificada */}
        <View style={styles.jornadaInfoCard}>
          <View style={styles.jornadaActiveStatus}>
            <View style={[styles.dotSolid, { backgroundColor: COLORS.success }]} />
            <Text style={styles.jornadaStatus}>Jornada Activa</Text>
          </View>
          <Text style={styles.jornadaRutaText}>Ruta: {selectedRoute?.nombre_ruta || '---'}</Text>
        </View>

        {/* Tiempo en ruta */}
        <View style={styles.jornadaTimeCard}>
          <Text style={styles.jornadaTimeLabel}>Tiempo en ruta</Text>
          <Text style={styles.jornadaTimer}>{elapsedTime}</Text>
          <Text style={styles.jornadaInicioText}>
            Inicio: {activeJornada?.inicio ? format(new Date(activeJornada.inicio), 'HH:mm') : '--:--'}
          </Text>
        </View>
      </ScrollView>

      {/* Botones fijos abajo */}
      <View style={styles.driverBottomActions}>
        <TouchableOpacity style={styles.endJornadaBtn} onPress={handleEndJornada}>
          <StopCircle size={20} color="white" />
          <Text style={styles.btnText}>FINALIZAR JORNADA</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.emergencyBtnNew} onPress={handleEmergency}>
          <AlertTriangle size={20} color="#B91C1C" />
          <Text style={styles.emergencyBtnText}>REPORTAR EMERGENCIA</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  driverFixedHeader: { paddingTop: 50, paddingHorizontal: 20, paddingBottom: 16 },
  driverInfoCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#4B5563', borderRadius: 16, padding: 16, gap: 14 },
  driverAvatarCircle: { width: 56, height: 56, borderRadius: 28, backgroundColor: COLORS.driver, justifyContent: 'center', alignItems: 'center' },
  driverNameText: { fontSize: 18, fontWeight: 'bold', color: 'white' },
  driverBusText: { fontSize: 13, color: '#D1D5DB', marginTop: 4 },
  studentCounter: { backgroundColor: 'white', borderRadius: 20, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: '#F3F4F6' },
  studentLabel: { fontSize: 11, fontWeight: 'bold', color: COLORS.gray, letterSpacing: 1 },
  studentCount: { fontSize: 72, fontWeight: 'bold', color: COLORS.dark, marginVertical: 8 },
  addStudentBtn: { backgroundColor: COLORS.success, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 14, marginTop: 12 },
  addStudentText: { color: 'white', fontWeight: 'bold', fontSize: 14 },
  jornadaInfoCard: { backgroundColor: 'white', borderRadius: 20, padding: 24, alignItems: 'center', marginTop: 16, borderWidth: 1, borderColor: '#F3F4F6' },
  jornadaActiveStatus: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  dotSolid: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#10B981' },
  jornadaStatus: { fontSize: 14, fontWeight: '600', color: COLORS.success },
  jornadaRutaText: { fontSize: 16, fontWeight: '600', color: COLORS.dark },
  jornadaTimeCard: { backgroundColor: '#E5E7EB', borderRadius: 20, padding: 24, alignItems: 'center', marginTop: 16 },
  jornadaTimeLabel: { fontSize: 12, color: COLORS.gray, marginBottom: 4 },
  jornadaTimer: { fontSize: 48, fontWeight: 'bold', color: COLORS.dark, marginBottom: 8 },
  jornadaInicioText: { fontSize: 14, color: COLORS.gray },
  driverBottomActions: { padding: 24, gap: 12, backgroundColor: COLORS.background, borderTopWidth: 1, borderTopColor: '#E5E7EB' },
  endJornadaBtn: { width: '100%', backgroundColor: '#EF4444', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRadius: 16, gap: 10 },
  btnText: { color: 'white', fontWeight: 'bold', fontSize: 14, letterSpacing: 1 },
  emergencyBtnNew: { width: '80%', alignSelf: 'center', backgroundColor: 'rgba(248, 113, 113, 0.3)', paddingVertical: 16, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderWidth: 2, borderColor: '#B91C1C', marginTop: 8 },
  emergencyBtnText: { color: '#B91C1C', fontWeight: 'bold', fontSize: 14, letterSpacing: 1 },
});
