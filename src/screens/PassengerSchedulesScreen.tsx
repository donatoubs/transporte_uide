import React from 'react';
import { StyleSheet, Text, View, ScrollView } from 'react-native';
import { Clock, Bus } from 'lucide-react-native';
import { HorarioGroup } from '../types';
import { COLORS } from '../constants';

interface PassengerSchedulesScreenProps {
  schedules: HorarioGroup[];
  todayDate: string;
}

export default function PassengerSchedulesScreen({ schedules, todayDate }: PassengerSchedulesScreenProps) {
  return (
    <View style={{ flex: 1, paddingHorizontal: 20 }}>
      <Text style={styles.scheduleDateHeader}>{todayDate}</Text>

      <ScrollView showsVerticalScrollIndicator={false}>
        {schedules.length === 0 ? (
          <View style={{ alignItems: 'center', paddingTop: 40 }}>
            <Clock size={48} color={COLORS.gray} />
            <Text style={{ color: COLORS.gray, marginTop: 16 }}>Cargando horarios...</Text>
          </View>
        ) : (
          schedules.map((group, idx) => (
            <View key={idx} style={styles.scheduleGroup}>
              <View style={styles.scheduleTimeHeader}>
                <Clock size={16} color={COLORS.primary} />
                <Text style={styles.scheduleTime}>{group.hora.substring(0, 5)}</Text>
              </View>
              {group.rutas.map((ruta, i) => (
                <View key={i} style={styles.scheduleRoute}>
                  <Bus size={14} color={COLORS.gray} />
                  <Text style={styles.scheduleRouteName}>{ruta.nombre_ruta}</Text>
                </View>
              ))}
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  scheduleDateHeader: { fontSize: 14, fontWeight: '500', color: COLORS.gray, textTransform: 'capitalize', marginVertical: 16 },
  scheduleGroup: { backgroundColor: 'white', borderRadius: 16, padding: 16, marginBottom: 16 },
  scheduleTimeHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', marginBottom: 12 },
  scheduleTime: { fontSize: 18, fontWeight: 'bold', color: COLORS.primary },
  scheduleRoute: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  scheduleRouteName: { fontSize: 14, color: COLORS.dark },
});
