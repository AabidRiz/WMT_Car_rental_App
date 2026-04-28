import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Animated, Dimensions, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import axios from 'axios';
import { API_URL } from '../../context/AuthContext';
import MapComponent from '../../components/MapComponent';
import IncidentReportModal from '../../components/IncidentReportModal';
import { COLORS, SHADOWS } from '../../theme/colors';

const { width } = Dimensions.get('window');

const LiveTripScreen = ({ route, navigation }) => {
    const { booking, stops: routeStopsParams, currentStopIndex: initialIndex, destination: routeDest } = route.params || {};
    const [stopIndex, setStopIndex] = useState(initialIndex || 0);

    const isMultiStop = routeStopsParams && routeStopsParams.length > 0;
    const activeDestination = isMultiStop ? routeStopsParams[stopIndex]?.destination : routeDest;

    const [userLoc, setUserLoc] = useState(null);
    const [gasStations, setGasStations] = useState([]);
    const [stats, setStats] = useState({ distance: 'Calculating...', time: '...', arrival: '...' });
    const [fuelInfo, setFuelInfo] = useState({ left: 0, range: 0 });
    const [reportVisible, setReportVisible] = useState(false);
    const [sosId, setSosId] = useState(null);
    const slideAnim = useRef(new Animated.Value(300)).current;
    
    // To track total distance traveled and deplete fuel
    const prevLoc = useRef(null);

    useEffect(() => {
        if (booking?.car) {
            setFuelInfo({
                left: booking.car.currentFuel,
                range: Math.round(booking.car.currentFuel * booking.car.kmPerLiter)
            });
        }
    }, [booking]);

    const fetchPetrolStations = async (lat, lon) => {
        if (gasStations.length > 0) return; // Only fetch once per low-fuel trigger
        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=fuel&limit=5&lat=${lat}&lon=${lon}`, {
                headers: { 'User-Agent': 'DriveMate/1.0' }
            });
            const data = await res.json();
            const poIs = data.map(item => ({
                lat: parseFloat(item.lat),
                lng: parseFloat(item.lon),
                name: item.display_name.split(',')[0]
            }));
            setGasStations(poIs);
        } catch (e) {
            console.log('Gas discovery error:', e.message);
        }
    };

    const updateFuelLevel = (distTravelledKm) => {
        if (!booking?.car) return;
        setFuelInfo(prev => {
            const consumed = distTravelledKm / booking.car.kmPerLiter;
            const newLeft = Math.max(0, prev.left - consumed);
            const newRange = Math.round(newLeft * booking.car.kmPerLiter);

            if (newRange < 20) fetchPetrolStations(userLoc.lat, userLoc.lng);
            
            return { left: newLeft, range: newRange };
        });
    };

    const getDistance = (l1, l2) => {
        const R = 6371; // km
        const dLat = (l2.lat - l1.lat) * Math.PI / 180;
        const dLon = (l2.lng - l1.lng) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(l1.lat * Math.PI / 180) * Math.cos(l2.lat * Math.PI / 180) * 
                  Math.sin(dLon/2) * Math.sin(dLon/2);
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    };

    const updateRouteStats = async (start, end) => {
        try {
            const res = await fetch(`https://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${end.lng},${end.lat}?overview=false`);
            const data = await res.json();
            if (data.routes && data.routes[0]) {
                const route = data.routes[0];
                const distKm = (route.distance / 1000).toFixed(1) + ' km';
                const timeMin = Math.round(route.duration / 60) + ' min';
                
                const arrivalDate = new Date();
                arrivalDate.setSeconds(arrivalDate.getSeconds() + route.duration);
                const arrivalStr = arrivalDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                setStats({ distance: distKm, time: timeMin, arrival: arrivalStr });
            }
        } catch (e) {
            console.log('Stats update error:', e.message);
        }
    };

    useEffect(() => {
        let subscription;
        (async () => {
          let { status } = await Location.requestForegroundPermissionsAsync();
          if (status !== 'granted') {
            setUserLoc({ lat: 6.9271, lng: 79.8612 }); // Fallback
            return;
          }

          let location = await Location.getCurrentPositionAsync({});
          const initialLoc = { lat: location.coords.latitude, lng: location.coords.longitude };
          setUserLoc(initialLoc);
          if (activeDestination) updateRouteStats(initialLoc, activeDestination.coordinates);

          // Start watching position
          subscription = await Location.watchPositionAsync(
            { accuracy: Location.Accuracy.High, distanceInterval: 20 },
            (newLocation) => {
              const currentPos = { lat: newLocation.coords.latitude, lng: newLocation.coords.longitude };
              
              if (prevLoc.current) {
                  const d = getDistance(prevLoc.current, currentPos);
                  if (d > 0.01) updateFuelLevel(d); // Only if moved > 10m
              }
              prevLoc.current = currentPos;
              
              setUserLoc(currentPos);
              if (activeDestination) updateRouteStats(currentPos, activeDestination.coordinates);
            }
          );
        })();

        Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 20 }).start();
        return () => subscription?.remove();
    }, [activeDestination]);

    const handleSOS = async (type = 'SOS') => {
        try {
            const res = await axios.post(`${API_URL}/sos`, {
                bookingId: booking?._id,
                lat: userLoc.lat,
                lng: userLoc.lng,
                emergencyType: type
            });
            if (res.data.success) {
                setSosId(res.data.data._id);
                if (type === 'Accident') {
                    setReportVisible(true);
                } else {
                    Alert.alert('SOS Triggered', 'Emergency services and DriveMate Admin have been notified of your exact location.');
                }
            }
        } catch (e) {
            console.log('SOS error:', e.message);
            Alert.alert('Error', 'Failed to trigger SOS. Please call 119 directly.');
        }
    };

    const openEmergencyMenu = () => {
        Alert.alert(
            'Emergency Assistance',
            'Please select the type of help you need:',
            [
                { text: '🚑 Call 119', onPress: () => { handleSOS('SOS'); navigateToEmergency('119'); } },
                { text: '💥 Report Accident', onPress: () => handleSOS('Accident') },
                { text: '🔧 Vehicle Breakdown', onPress: () => handleSOS('Breakdown') },
                { text: 'Cancel', style: 'cancel' }
            ]
        );
    };

    const navigateToEmergency = (num) => {
        // Linking.openURL(`tel:${num}`);
        console.log('Dialing', num);
    };

    if (!userLoc) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={{ marginTop: 10, color: COLORS.textMuted }}>Initializing GPS...</Text>
            </View>
        );
    }

    const mapTargetStops = activeDestination ? [{ coordinates: activeDestination.coordinates, name: activeDestination.name }] : [];
    // To show a route, we need a start and end. Use userLoc as start.
    const routeStops = [
        { coordinates: userLoc, name: "Current Location" },
        ...mapTargetStops
    ];

    return (
        <View style={styles.container}>
            {/* FULL SCREEN MAP */}
            <View style={StyleSheet.absoluteFill}>
                <MapComponent 
                    stops={routeStops} 
                    userLocation={userLoc} 
                    pois={gasStations}
                    height={Dimensions.get('window').height} 
                />
            </View>

            {/* TOP OVERLAY - HEADER */}
            <SafeAreaView style={styles.topHeader}>
                <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Ionicons name="close" size={24} color={COLORS.textDark} />
                </Pressable>

                <Pressable onPress={openEmergencyMenu} style={styles.sosButton}>
                    <Ionicons name="warning" size={20} color={COLORS.white} />
                    <Text style={styles.sosText}>SOS</Text>
                </Pressable>

                <View style={styles.navStatus}>
                    <View style={styles.pulse} />
                    <Text style={styles.statusText}>LIVE NAVIGATION</Text>
                </View>
                <View style={{ width: 44 }} />
            </SafeAreaView>

            {/* NAVIGATION PANEL */}
            <Animated.View style={[styles.navPanel, { transform: [{ translateY: slideAnim }] }]}>
                <View style={styles.pullBar} />
                
                <View style={styles.nextTurnLine}>
                    <View style={styles.turnIconBox}>
                        <Ionicons name="arrow-undo" size={32} color={COLORS.white} />
                    </View>
                    <View style={styles.turnInfo}>
                        <Text style={styles.distToTurn}>350 m</Text>
                        <Text style={styles.turnInstruction}>Turn left onto Kandy Road</Text>
                    </View>
                </View>

                <View style={styles.statsRow}>
                    <View style={styles.statItem}>
                        <Text style={styles.statVal}>{stats.time}</Text>
                        <Text style={styles.statLabel}>Remaining</Text>
                    </View>
                    <View style={styles.divider} />
                    <View style={styles.statItem}>
                        <Text style={styles.statVal}>{stats.distance}</Text>
                        <Text style={styles.statLabel}>Distance</Text>
                    </View>
                    <View style={styles.divider} />
                    <View style={styles.statItem}>
                        <Text style={[styles.statVal, { color: COLORS.primary }]}>{stats.arrival}</Text>
                        <Text style={styles.statLabel}>Arrival</Text>
                    </View>
                </View>

                <View style={[styles.destinationBox, fuelInfo.range < 20 && styles.warningBorder]}>
                    <View style={styles.destInfo}>
                        <Ionicons name="location" size={18} color={COLORS.primary} />
                        <Text style={styles.destText} numberOfLines={1}>
                            {activeDestination?.name || "Free Roam Mode"}
                        </Text>
                    </View>
                    <View style={styles.fuelHUD}>
                         <View style={{ alignItems: 'flex-end' }}>
                             <Text style={[styles.fuelVal, (fuelInfo.range || 0) < 20 && { color: COLORS.error }]}>
                                {(fuelInfo.left || 0).toFixed(1)} L
                             </Text>
                            <Text style={styles.fuelLabel}>Remaining</Text>
                         </View>
                         <View style={styles.fuelDivider} />
                         <View>
                            <Text style={[styles.fuelVal, fuelInfo.range < 20 && { color: COLORS.error }]}>{fuelInfo.range} km</Text>
                            <Text style={styles.fuelLabel}>Range</Text>
                         </View>
                    </View>
                </View>

                {fuelInfo.range < 20 && (
                    <View style={styles.gasAlert}>
                        <Ionicons name="warning" size={16} color={COLORS.white} />
                        <Text style={styles.gasAlertText}>Low fuel! Petrol stations marked in brown.</Text>
                    </View>
                )}

                <Pressable 
                    style={styles.finishBtn} 
                    onPress={() => {
                        if (isMultiStop && stopIndex < routeStopsParams.length - 1) {
                            setStopIndex(stopIndex + 1);
                        } else {
                            navigation.navigate('MainTabs');
                        }
                    }}
                >
                    <Text style={styles.finishBtnText}>
                        {isMultiStop && stopIndex < routeStopsParams.length - 1 
                            ? `Finish ${activeDestination?.name?.split(' ')[0]} (Next: ${routeStopsParams[stopIndex+1]?.destination?.name})` 
                            : 'Finish Journey'}
                    </Text>
                </Pressable>
            </Animated.View>

            <IncidentReportModal 
                visible={reportVisible} 
                onClose={() => setReportVisible(false)}
                sosId={sosId}
                bookingId={booking?._id}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.white },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.white },
    topHeader: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingHorizontal: 20, position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10
    },
    backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.white, justifyContent: 'center', alignItems: 'center', ...SHADOWS.medium },
    navStatus: { 
        flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(0,0,0,0.7)', 
        paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 
    },
    statusText: { color: COLORS.white, fontSize: 11, fontWeight: '800', letterSpacing: 1 },
    pulse: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#EF4444' },
    navPanel: {
        position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: COLORS.white,
        borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 25, ...SHADOWS.heavy, paddingBottom: 40
    },
    pullBar: { width: 40, height: 5, backgroundColor: '#E5E7EB', borderRadius: 3, alignSelf: 'center', marginBottom: 20 },
    nextTurnLine: { 
        flexDirection: 'row', alignItems: 'center', backgroundColor: '#1F2937', 
        padding: 15, borderRadius: 20, marginBottom: 20 
    },
    turnIconBox: { width: 50, height: 50, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },
    turnInfo: { marginLeft: 15, flex: 1 },
    distToTurn: { color: COLORS.white, fontSize: 24, fontWeight: '900' },
    turnInstruction: { color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: '600' },
    statsRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', marginBottom: 25 },
    statItem: { alignItems: 'center' },
    statVal: { fontSize: 20, fontWeight: '900', color: COLORS.textDark },
    statLabel: { fontSize: 12, color: COLORS.textMuted, fontWeight: '600', marginTop: 2 },
    divider: { width: 1, height: 30, backgroundColor: '#F3F4F6' },
    destinationBox: { 
        flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#F9FAFB', 
        padding: 15, borderRadius: 15, marginBottom: 25, borderWidth: 1, borderColor: '#F1F5F9' 
    },
    destText: { fontSize: 13, fontWeight: '700', color: COLORS.textDark, flex: 1 },
    destInfo: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
    fuelHUD: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingLeft: 12, borderLeftWidth: 1, borderLeftColor: '#E5E7EB' },
    fuelVal: { fontSize: 16, fontWeight: '900', color: COLORS.primary },
    fuelLabel: { fontSize: 9, fontWeight: '700', color: COLORS.textMuted, textTransform: 'uppercase' },
    fuelDivider: { width: 1, height: 20, backgroundColor: '#E5E7EB' },
    warningBorder: { borderColor: COLORS.error, borderWidth: 1.5 },
    gasAlert: { backgroundColor: COLORS.error, padding: 8, borderRadius: 10, marginBottom: 15, flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center' },
    gasAlertText: { color: COLORS.white, fontSize: 11, fontWeight: '700' },
    sosButton: { 
        backgroundColor: '#EF4444', flexDirection: 'row', alignItems: 'center', 
        gap: 6, paddingHorizontal: 15, paddingVertical: 10, borderRadius: 20, ...SHADOWS.medium 
    },
    sosText: { color: COLORS.white, fontWeight: '900', fontSize: 14 },
    finishBtn: { backgroundColor: '#EF4444', padding: 18, borderRadius: 20, alignItems: 'center' },
    finishBtnText: { color: COLORS.white, fontWeight: '800', fontSize: 16 }
});

export default LiveTripScreen;
