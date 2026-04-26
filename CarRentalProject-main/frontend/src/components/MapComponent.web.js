import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';

const MapComponent = ({ startLoc, endLoc, destinationName }) => {
  // We use an iframe with an OpenStreetMap/Leaflet viewer for the web
  // This is completely free and works in any browser
  
  const startLat = startLoc?.latitude || 6.9271;
  const startLng = startLoc?.longitude || 79.8612;
  const endLat = endLoc?.latitude || 6.3776;
  const endLng = endLoc?.longitude || 81.5034;

  // We use a free Leaflet-based routing service URL (or just a simple map view)
  // For a pure OSM web view, we can use an embed if available or a custom HTML string
  const mapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${startLng-0.1}%2C${startLat-0.1}%2C${endLng+0.1}%2C${endLat+0.1}&layer=mapnik&marker=${endLat}%2C${endLng}`;

  return (
    <View style={styles.container}>
      {Platform.OS === 'web' ? (
        <iframe
          src={mapUrl}
          style={{ width: '100%', height: '100%', border: 'none', borderRadius: 16 }}
          title="Trip Map"
        />
      ) : (
        <View style={styles.placeholder}>
          <Text>Map not supported in this environment.</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: 300,
    backgroundColor: '#F3F4F6',
    borderRadius: 16,
    overflow: 'hidden'
  },
  placeholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  }
});

export default MapComponent;
