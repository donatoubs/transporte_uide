import React from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { History } from 'lucide-react-native';
import { COLORS } from '../constants';

interface DriverHistoryScreenProps {
  driverHistorial: any[];
  onBack: () => void;
}

export default function DriverHistoryScreen({ driverHistorial, onBack }: DriverHistoryScreenProps) {
  return (
    <View style={{ flex: 1 }}>
      {/* Header con icono para volver */}
      <View style={styles.historyHeader}>
        <TouchableOpacity style={styles.historyBtn} onPress={onBack}>
          <History size={24} color={COLORS.gray} />
        </TouchableOpacity>
        <Text style={styles.historyTitle}>Historial de Jornadas</Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: 24 }}>
        {driverHistorial.length === 0 ? (
          <Text style={styles.emptyText}>No hay historial disponible.</Text>
        ) : (
          driverHistorial.map((h, idx) => (
            <View key={idx} style={styles.historyCard}>
              <Text style={styles.historyItem}>Jornada ID: {h.id}</Text>
              <Text style={styles.historyItem}>Ruta: {h.ruta?.nombre_ruta || '—'}</Text>
              <Text style={styles.historyItem}>Inicio: {h.inicio}</Text>
              <Text style={styles.historyItem}>Estudiantes: {h.estudiantes_transportados}</Text>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  historyHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingTop: 40, paddingBottom: 16, gap: 12 },
  historyBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' },
  historyTitle: { fontSize: 20, fontWeight: 'bold', color: COLORS.dark },
  emptyText: { fontSize: 16, color: COLORS.gray, textAlign: 'center', marginTop: 40 },
  historyCard: { backgroundColor: 'white', padding: 16, borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: '#F3F4F6' },
  historyItem: { fontSize: 14, color: COLORS.text, marginBottom: 4 },
});
