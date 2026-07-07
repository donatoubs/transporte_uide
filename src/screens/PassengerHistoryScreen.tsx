import React from 'react';
import { StyleSheet, Text, View, ScrollView } from 'react-native';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Trip } from '../types';
import { COLORS } from '../constants';

interface PassengerHistoryScreenProps {
  history: Trip[];
}

export default function PassengerHistoryScreen({ history }: PassengerHistoryScreenProps) {
  return (
    <ScrollView style={{ paddingHorizontal: 20 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <Text style={styles.sectionTitle}>Historial</Text>
      </View>
      {history.length === 0 ? (
        <Text style={styles.emptyText}>Aún no tienes viajes registrados.</Text>
      ) : (
        history.map((trip, i) => (
          <View key={i} style={styles.historyCard}>
            <View style={styles.dateBox}>
              <Text style={styles.dateDay}>{format(new Date(trip.startTime), 'd')}</Text>
              <Text style={styles.dateMonth}>
                {format(new Date(trip.startTime), 'MMM', { locale: es })}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.historyTitle} numberOfLines={1}>{trip.route.name}</Text>
              <Text style={styles.historyTime}>
                {format(new Date(trip.startTime), 'HH:mm')} • {trip.status === 'active' ? 'En curso' : 'Completado'}
              </Text>
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  sectionTitle: { fontSize: 20, fontWeight: 'bold', color: COLORS.dark },
  emptyText: { fontSize: 16, color: COLORS.gray, textAlign: 'center', marginTop: 40 },
  historyCard: { flexDirection: 'row', backgroundColor: 'white', padding: 16, borderRadius: 16, marginBottom: 12, alignItems: 'center', borderWidth: 1, borderColor: '#F3F4F6' },
  dateBox: { width: 48, height: 48, backgroundColor: '#F9FAFB', borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 16, borderWidth: 1, borderColor: '#F3F4F6' },
  dateDay: { fontSize: 14, fontWeight: 'bold', color: COLORS.dark },
  dateMonth: { fontSize: 10, fontWeight: 'bold', color: COLORS.gray, textTransform: 'uppercase' },
  historyTitle: { fontSize: 15, fontWeight: 'bold', color: COLORS.dark },
  historyTime: { fontSize: 12, color: COLORS.gray },
});
