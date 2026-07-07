import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Clock, Navigation, StopCircle, Bus } from 'lucide-react-native';
import { format } from 'date-fns';
import { Trip } from '../types';
import { COLORS } from '../constants';

interface PassengerTripScreenProps {
  activeTrip: Trip | null;
  onFinishTrip: () => void;
  loading: boolean;
}

export default function PassengerTripScreen({ activeTrip, onFinishTrip, loading }: PassengerTripScreenProps) {
  return (
    <View style={styles.tripCard}>
      <View style={styles.tripHeader}>
        <View style={styles.statusBadge}>
          <View style={[styles.dotSolid, { backgroundColor: '#10B981' }]} />
        </View>
      </View>
      <View style={styles.busIconBox}>
        <Bus color="white" size={32} />
      </View>
      <Text style={styles.tripTitle}>{activeTrip?.route.name}</Text>
      <Text style={styles.tripSub}>Unidad #{activeTrip?.route.busNumber || '---'}</Text>

      <View style={styles.infoGrid}>
        <View style={styles.infoBox}>
          <Clock size={16} color={COLORS.gray} />
          <Text style={styles.infoLabel}>INICIO</Text>
          <Text style={styles.infoValue}>
            {activeTrip ? format(new Date(activeTrip.startTime), 'HH:mm') : '--'}
          </Text>
        </View>
        <View style={styles.infoBox}>
          <Navigation size={16} color={COLORS.gray} />
          <Text style={styles.infoLabel}>ESTADO</Text>
          <Text style={styles.infoValue}>En Ruta</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.finishBtn} onPress={onFinishTrip} disabled={loading}>
        {loading ? (
          <ActivityIndicator color="white" />
        ) : (
          <>
            <StopCircle color="white" size={20} style={{ marginRight: 10 }} />
            <Text style={styles.btnText}>FINALIZAR VIAJE</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  tripCard: { margin: 24, backgroundColor: 'white', borderRadius: 32, padding: 30, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 20, elevation: 5 },
  tripHeader: { width: '100%', alignItems: 'flex-end', marginBottom: -20, zIndex: 1 },
  statusBadge: { width: 12, height: 12, backgroundColor: '#D1FAE5', borderRadius: 6, justifyContent: 'center', alignItems: 'center' },
  dotSolid: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#10B981' },
  busIconBox: { width: 80, height: 80, backgroundColor: 'black', borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  tripTitle: { fontSize: 24, fontWeight: 'bold', color: COLORS.dark, textAlign: 'center' },
  tripSub: { fontSize: 14, color: COLORS.gray, fontWeight: '500', marginBottom: 30 },
  infoGrid: { flexDirection: 'row', gap: 15, width: '100%', marginBottom: 30 },
  infoBox: { flex: 1, backgroundColor: '#F9FAFB', padding: 15, borderRadius: 16, alignItems: 'center', borderWidth: 1, borderColor: '#F3F4F6' },
  infoLabel: { fontSize: 10, fontWeight: 'bold', color: COLORS.gray, marginTop: 5 },
  infoValue: { fontSize: 18, fontWeight: 'bold', color: COLORS.dark, marginTop: 2 },
  finishBtn: { width: '100%', backgroundColor: 'black', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 18, borderRadius: 16 },
  btnText: { color: 'white', fontWeight: 'bold', fontSize: 14, letterSpacing: 1 },
});
