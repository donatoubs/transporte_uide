import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { Bus } from 'lucide-react-native';
import { COLORS } from '../constants';

interface PassengerSettingsScreenProps {
  onBack: () => void;
  onSelectDriverMode: () => void;
}

export default function PassengerSettingsScreen({ onBack, onSelectDriverMode }: PassengerSettingsScreenProps) {
  return (
    <View style={{ flex: 1, paddingHorizontal: 20 }}>
      <View style={styles.settingsHeader}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Text style={{ fontSize: 24, color: COLORS.dark }}>←</Text>
        </TouchableOpacity>
        <Text style={styles.settingsTitle}>Configuración</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.settingsList}>
        <TouchableOpacity
          style={styles.settingsItem}
          onPress={onSelectDriverMode}
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
  );
}

const styles = StyleSheet.create({
  settingsHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 16, marginBottom: 10 },
  settingsTitle: { fontSize: 20, fontWeight: 'bold', color: COLORS.dark },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' },
  settingsList: { gap: 12 },
  settingsItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', padding: 16, borderRadius: 16, gap: 16 },
  settingsItemIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(245, 158, 11, 0.1)', justifyContent: 'center', alignItems: 'center' },
  settingsItemTitle: { fontSize: 16, fontWeight: '600', color: COLORS.dark },
  settingsItemSub: { fontSize: 13, color: COLORS.gray, marginTop: 2 },
});
