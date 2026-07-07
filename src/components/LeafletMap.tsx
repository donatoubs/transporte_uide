import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import { Navigation, MapPin } from 'lucide-react-native';
import { COLORS } from '../constants';

interface LeafletMapProps {
  userLocation: { latitude: number; longitude: number } | null;
  startWatchingLocation: () => void;
}

export default function LeafletMap({ userLocation, startWatchingLocation }: LeafletMapProps) {
  return (
    <View style={styles.mapContainer}>
      <View style={styles.mapHeader}>
        <Text style={styles.mapTitle}>Tu Ubicación</Text>
        <TouchableOpacity
          style={styles.centerBtn}
          onPress={startWatchingLocation}
        >
          <Navigation size={18} color="#fff" />
        </TouchableOpacity>
      </View>
      {userLocation ? (
        <WebView
          style={styles.map}
          originWhitelist={['*']}
          source={{
            html: `
              <!DOCTYPE html>
              <html>
              <head>
                <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
                <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
                <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
                <style>
                  * { margin: 0; padding: 0; }
                  html, body, #map { width: 100%; height: 100%; }
                </style>
              </head>
              <body>
                <div id="map"></div>
                <script>
                  var map = L.map('map').setView([${userLocation.latitude}, ${userLocation.longitude}], 16);
                  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    attribution: '© OpenStreetMap'
                  }).addTo(map);
                  
                  var pulsingIcon = L.divIcon({
                    className: 'pulsing-marker',
                    html: '<div style="width: 20px; height: 20px; background: #4F46E5; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 10px rgba(0,0,0,0.3);"><div style="position: absolute; width: 40px; height: 40px; background: rgba(79,70,229,0.3); border-radius: 50%; top: -10px; left: -10px; animation: pulse 2s infinite;"></div></div><style>@keyframes pulse { 0% { transform: scale(1); opacity: 1; } 100% { transform: scale(2); opacity: 0; } }</style>',
                    iconSize: [20, 20],
                    iconAnchor: [10, 10]
                  });
                  
                  L.marker([${userLocation.latitude}, ${userLocation.longitude}], {icon: pulsingIcon})
                    .addTo(map)
                    .bindPopup('<b>Tu ubicación</b><br>Estás aquí');
                </script>
              </body>
              </html>
            `
          }}
        />
      ) : (
        <View style={styles.mapLoading}>
          <ActivityIndicator size="large" color={COLORS.dark} />
          <Text style={styles.mapLoadingText}>Obteniendo ubicación...</Text>
        </View>
      )}
      <View style={styles.locationInfo}>
        <MapPin size={16} color={COLORS.gray} />
        <Text style={styles.locationText}>
          {userLocation
            ? `${userLocation.latitude.toFixed(6)}, ${userLocation.longitude.toFixed(6)}`
            : 'Buscando GPS...'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  mapContainer: { flex: 1, margin: 16, borderRadius: 24, overflow: 'hidden', backgroundColor: 'white', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, elevation: 5 },
  mapHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  mapTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.dark },
  centerBtn: { width: 40, height: 40, backgroundColor: COLORS.dark, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  map: { flex: 1, width: '100%' },
  mapLoading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F9FAFB' },
  mapLoadingText: { marginTop: 12, fontSize: 14, color: COLORS.gray },
  locationInfo: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: 'white', borderTopWidth: 1, borderTopColor: '#F3F4F6', gap: 8 },
  locationText: { fontSize: 13, color: COLORS.gray, fontFamily: 'monospace' },
});
