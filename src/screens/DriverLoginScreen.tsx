import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Bus } from 'lucide-react-native';
import { COLORS } from '../constants';

interface DriverLoginScreenProps {
  pinInput: string;
  setPinInput: React.Dispatch<React.SetStateAction<string>>;
  handleDriverLogin: () => void;
  loading: boolean;
  onCancel: () => void;
}

export default function DriverLoginScreen({
  pinInput,
  setPinInput,
  handleDriverLogin,
  loading,
  onCancel,
}: DriverLoginScreenProps) {
  return (
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

        <TouchableOpacity onPress={onCancel} style={{ marginTop: 20 }}>
          <Text style={{ color: COLORS.gray }}>Cancelar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
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
  btnText: { color: 'white', fontWeight: 'bold', fontSize: 14, letterSpacing: 1 },
});
