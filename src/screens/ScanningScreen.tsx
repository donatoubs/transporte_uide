import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ActivityIndicator, SafeAreaView } from 'react-native';
import { CameraView } from 'expo-camera';

interface ScanningScreenProps {
  permissionGranted: boolean;
  requestPermission: () => Promise<any>;
  scanned: boolean;
  handleBarCodeScanned: (event: { data: string }) => void;
  loading: boolean;
  onCancel: () => void;
}

export default function ScanningScreen({
  permissionGranted,
  requestPermission,
  scanned,
  handleBarCodeScanned,
  loading,
  onCancel,
}: ScanningScreenProps) {
  if (!permissionGranted) {
    return (
      <View style={styles.center}>
        <Text style={{ marginBottom: 20 }}>Necesitamos acceso a la cámara</Text>
        <TouchableOpacity onPress={requestPermission} style={styles.btnBlack}>
          <Text style={styles.btnText}>Permitir</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: 'black' }}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
      />
      <SafeAreaView style={{ flex: 1 }}>
        <View style={{ flex: 1 }} />
        <View style={styles.scanOverlay}>
          <Text style={{ color: 'white', marginBottom: 20, fontWeight: 'bold' }}>Escanea el QR del Bus</Text>
          {loading && <ActivityIndicator color="white" />}
          <TouchableOpacity
            onPress={onCancel}
            style={{ marginTop: 20, backgroundColor: 'rgba(255,255,255,0.2)', padding: 10, borderRadius: 20 }}
          >
            <Text style={{ color: 'white' }}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  btnBlack: { backgroundColor: 'black', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  btnText: { color: 'white', fontWeight: 'bold', fontSize: 14, letterSpacing: 1 },
  scanOverlay: { alignItems: 'center', paddingBottom: 50, backgroundColor: 'rgba(0,0,0,0.6)', paddingTop: 20 },
});
