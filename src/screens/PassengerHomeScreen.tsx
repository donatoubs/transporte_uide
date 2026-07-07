import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { QrCode } from 'lucide-react-native';
import { COLORS } from '../constants';

interface PassengerHomeScreenProps {
  onScanPress: () => void;
}

export default function PassengerHomeScreen({ onScanPress }: PassengerHomeScreenProps) {
  return (
    <View style={styles.centerContent}>
      <TouchableOpacity style={styles.orbButton} onPress={onScanPress}>
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
  );
}

const styles = StyleSheet.create({
  centerContent: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingBottom: 80 },
  orbButton: { width: 180, height: 180, borderRadius: 90, justifyContent: 'center', alignItems: 'center', elevation: 20, shadowColor: COLORS.primary, shadowOpacity: 0.3, shadowRadius: 20, shadowOffset: { width: 0, height: 10 } },
  orbGradient: { width: '100%', height: '100%', borderRadius: 90, justifyContent: 'center', alignItems: 'center', padding: 4 },
  orbText: { color: 'white', fontWeight: 'bold', letterSpacing: 2, fontSize: 12, marginTop: 8 },
  ring: { position: 'absolute', borderRadius: 200, borderWidth: 1, borderColor: '#C7D2FE', zIndex: -1 },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', color: COLORS.dark },
  sectionSub: { fontSize: 14, color: COLORS.gray, marginTop: 4 },
});
