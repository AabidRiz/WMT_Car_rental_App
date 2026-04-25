import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ActivityIndicator } from 'react-native';
import MapView, { Marker, Polyline, UrlTile } from 'react-native-maps';
import { COLORS } from '../theme/colors';

const MapComponent = ({ stops = [], height = 300, userLocation = null, pois = [] }) => {
  const [routeCoords, setRouteCoords] = useState([]);
  const [loadingRoute, setLoadingRoute] = useState(false);

  useEffect(() => {
    const fetchFullRoute = async () => {
      // Need at least 2 points to draw a route
      if (stops.length < 2) {
        setRouteCoords([]);
        return;
      }
      
      setLoadingRoute(true);
      try {
        // Build coordinate string for OSRM: lon1,lat1;lon2,lat2;lon3,lat3...
        const coordString = stops
          .map(stop => {
            const lat = stop.destination?.coordinates?.lat || stop.coordinates?.lat;
            const lng = stop.destination?.coordinates?.lng || stop.coordinates?.lng;
            return `${lng},${lat}`;
          })
          .join(';');

        const response = await fetch(
          `https://router.project-osrm.org/route/v1/driving/${coordString}?geometries=geojson&overview=full`
        );
        const data = await response.json();

        if (data.routes && data.routes.length > 0) {
          const points = data.routes[0].geometry.coordinates.map(coord => ({
            latitude: coord[1],
            longitude: coord[0]
          }));
          setRouteCoords(points); 
        }
      } catch (error) {
        console.error("Error fetching multi-stop route: ", error);
      } finally {
        setLoadingRoute(false);
      }
    };

    fetchFullRoute();
  }, [stops]);

  // Initial region calculation based on all stops
  const getInitialRegion = () => {
    if (stops.length === 0) return {
        latitude: 6.9271,
        longitude: 79.8612,
        latitudeDelta: 2.0,
        longitudeDelta: 2.0,
    };

    let minLat = 90, maxLat = -90, minLng = 180, maxLng = -180;
    stops.forEach(stop => {
      const lat = stop.destination?.coordinates?.lat || stop.coordinates?.lat;
      const lng = stop.destination?.coordinates?.lng || stop.coordinates?.lng;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
      if (lng < minLng) minLng = lng;
      if (lng > maxLng) maxLng = lng;
    });

    const midLat = (minLat + maxLat) / 2;
    const midLng = (minLng + maxLng) / 2;
    const deltaLat = Math.max(0.1, (maxLat - minLat) * 1.5);
    const deltaLng = Math.max(0.1, (maxLng - minLng) * 1.5);

    return {
      latitude: midLat,
      longitude: midLng,
      latitudeDelta: deltaLat || 2.0,
      longitudeDelta: deltaLng || 2.0,
    };
  };

  const tileUrl = "https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";

  return (
    <View style={[styles.container, { height }]}>
      <MapView
        style={styles.map}
        initialRegion={getInitialRegion()}
      >
        <UrlTile
          urlTemplate={tileUrl}
          maximumZ={19}
        />

        {stops.map((stop, index) => {
          const lat = stop.destination?.coordinates?.lat || stop.coordinates?.lat;
          const lng = stop.destination?.coordinates?.lng || stop.coordinates?.lng;
          if (!lat || !lng) return null;

          return (
            <Marker 
              key={stop._id || index}
              coordinate={{ latitude: lat, longitude: lng }}
              title={stop.destination?.name || stop.name || `Stop ${index + 1}`}
              description={stop.scheduledTime ? `Arriving at ${stop.scheduledTime}` : ''}
              pinColor={index === 0 ? '#10B981' : index === stops.length - 1 ? '#EF4444' : COLORS.primary}
            />
          );
        })}

        {userLocation && (
          <Marker 
            coordinate={{ latitude: userLocation.lat, longitude: userLocation.lng }}
            title="You"
          >
             <View style={styles.userMarker}>
                <View style={styles.userMarkerInner} />
             </View>
          </Marker>
        )}

        {pois.map((poi, idx) => (
          <Marker 
            key={`poi-${idx}`}
            coordinate={{ latitude: poi.lat, longitude: poi.lng }}
            title={poi.name}
          >
             <View style={styles.poiMarker}>
                <Ionicons name="local-gas-station" size={20} color={COLORS.white} />
             </View>
          </Marker>
        ))}

        {routeCoords.length > 0 && (
          <Polyline
            coordinates={routeCoords}
            strokeColor={COLORS.primary} 
            strokeWidth={5}
          />
        )}
      </MapView>
      {loadingRoute && (
          <View style={styles.loadingOverlay}>
              <ActivityIndicator color={COLORS.primary} size="small" />
          </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { 
    width: '100%', 
    borderRadius: 16, 
    overflow: 'hidden', 
    backgroundColor: '#E5E7EB',
    position: 'relative'
  },
  map: { 
    width: '100%', 
    height: '100%' 
  },
  loadingOverlay: {
      position: 'absolute',
      top: 10,
      right: 10,
      backgroundColor: 'rgba(255,255,255,0.8)',
      padding: 8,
      borderRadius: 20
  },
  userMarker: {
    width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(37, 99, 235, 0.2)',
    justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(37, 99, 235, 0.4)'
  },
  userMarkerInner: {
    width: 12, height: 12, borderRadius: 6, backgroundColor: '#2563EB',
    borderWidth: 2, borderColor: '#FFFFFF'
  },
  poiMarker: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: '#B45309',
    justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#FFFFFF'
  }
});

export default MapComponent;