import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp, FadeInDown } from 'react-native-reanimated';
import axios from 'axios';
import * as Location from 'expo-location';
import MapComponent from '../../components/MapComponent';
import { COLORS, SHADOWS } from '../../theme/colors';
import { API_URL } from '../../context/AuthContext';

const BASE_URL = API_URL.replace('/api', '');

const TimetableScreen = ({ route, navigation }) => {
  const { planId } = route.params || {};
  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState(null);
  const [userLoc, setUserLoc] = useState(null);

  useEffect(() => {
    if (planId) fetchPlan();
    else setLoading(false);
    getUserLocation();
  }, [planId]);

  const getUserLocation = async () => {
    try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
            let location = await Location.getCurrentPositionAsync({});
            setUserLoc({ lat: location.coords.latitude, lng: location.coords.longitude });
        }
    } catch (e) {
        console.log('Loc error in timetable:', e.message);
    }
  };

  const fetchPlan = async () => {
    try {
        // We find the plan by its ID and populate data
        const res = await axios.get(`${API_URL}/trips/${planId}`);
        if (res.data.success) {
            setPlan(res.data.data);
        }
    } catch (e) {
        console.log('Fetch plan error:', e.message);
    } finally {
        setLoading(false);
    }
  };

  if (loading) {
      return (
          <View style={styles.center}>
              <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
      );
  }

  const stops = plan?.stops || [];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textDark} />
        </Pressable>
        <View style={styles.headerInfo}>
            <Text style={styles.headerTitle}>{plan?.title || 'Trip Timetable'}</Text>
            <Text style={styles.headerSub}>{stops.length} Stops Configured</Text>
        </View>
        <Pressable 
            onPress={() => navigation.navigate('LiveTrip', { stops: stops, currentStopIndex: 0, booking: plan?.booking })} 
            style={styles.startTripBtn}
        >
            <Ionicons name="play" size={16} color={COLORS.white} />
            <Text style={styles.startTripText}>Start Journey</Text>
        </Pressable>
        <Pressable 
            onPress={() => navigation.navigate('TripPlanner', { existingPlanId: planId })} 
            style={styles.editIconBtn}
        >
            <Ionicons name="create-outline" size={24} color={COLORS.primary} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ flexGrow: 1 }} bounces={false} showsVerticalScrollIndicator={false}>
        <View style={styles.mapContainer}>
          <MapComponent stops={stops} height={320} userLocation={userLoc} />
          <View style={styles.mapBadge}>
            <Ionicons name="navigate" size={16} color={COLORS.white} />
            <Text style={styles.mapBadgeText}>Generated via DriveMate Engine</Text>
          </View>
        </View>

        <View style={styles.content}>
          <Text style={styles.sectionTitle}>Journey Timeline</Text>
          
          {stops.length === 0 ? (
              <View style={styles.emptyState}>
                  <Text style={styles.emptyText}>No stops scheduled yet. Go to Plan Your Trip to build your itinerary.</Text>
                  <Pressable style={styles.ctaBtn} onPress={() => navigation.navigate('TripPlanner')}>
                      <Text style={styles.ctaText}>Plan Full Trip Now</Text>
                  </Pressable>
              </View>
          ) : (
              stops.map((stop, index) => (
                <View key={index}>
                    {/* Day Marker if it's the first stop of a new day */}
                    {(index === 0 || stops[index - 1].dayNumber !== stop.dayNumber) && (
                        <View style={styles.daySeparator}>
                            <View style={styles.dayLine} />
                            <Text style={styles.dayLabel}>Day {stop.dayNumber}</Text>
                            <View style={styles.dayLine} />
                        </View>
                    )}

                    <Animated.View entering={FadeInUp.delay(index * 100).duration(400)} style={styles.timelineRow}>
                        <View style={styles.timeColumn}>
                            <Text style={styles.timeText}>{stop.scheduledTime}</Text>
                            <View style={styles.dotIndicator} />
                            {index !== stops.length - 1 && <View style={styles.lineIndicator} />}
                        </View>
                        
                        <View style={styles.cardDetails}>
                            <View style={styles.cardHeader}>
                                <Text style={styles.stopName}>{stop.destination?.name || 'Unknown Stop'}</Text>
                                <Pressable 
                                    style={styles.navBtnSmall} 
                                    onPress={() => navigation.navigate('LiveTrip', { stops: stops, currentStopIndex: index, booking: plan?.booking })}
                                >
                                    <Ionicons name="navigate" size={14} color={COLORS.white} />
                                    <Text style={styles.navBtnTextSmall}>Go Now</Text>
                                </Pressable>
                            </View>
                            <Text style={styles.activity}>{stop.activityLabel || 'Arrive & Explore'}</Text>
                            {stop.notes && <Text style={styles.notes}>"{stop.notes}"</Text>}
                            
                            {stop.destination?.coverPhoto && (
                                <Image source={{ uri: `${BASE_URL}/${stop.destination.coverPhoto}` }} style={styles.stopImg} />
                            )}
                        </View>
                    </Animated.View>
                </View>
              ))
          )}
        </View>
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 20, backgroundColor: COLORS.white, ...SHADOWS.floating, zIndex: 10 },
  headerInfo: { flex: 1, marginLeft: 16 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: COLORS.textDark },
  headerSub: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  startTripBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.primary, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 12, marginRight: 10, ...SHADOWS.small },
  startTripText: { color: COLORS.white, fontWeight: '700', fontSize: 13 },
  editIconBtn: { padding: 8 },
  mapContainer: { width: '100%', height: 320, position: 'relative' },
  mapBadge: { position: 'absolute', bottom: 20, alignSelf: 'center', flexDirection: 'row', backgroundColor: COLORS.primary, paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, alignItems: 'center', ...SHADOWS.heavy },
  mapBadgeText: { color: COLORS.white, fontWeight: '600', marginLeft: 8, fontSize: 14 },
  content: { padding: 20 },
  sectionTitle: { fontSize: 22, fontWeight: '900', color: COLORS.textDark, marginBottom: 25 },
  daySeparator: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 20 },
  dayLine: { flex: 1, height: 1, backgroundColor: '#E5E7EB' },
  dayLabel: { fontSize: 14, fontWeight: '800', color: COLORS.primary, backgroundColor: '#EFF6FF', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 },
  timelineRow: { flexDirection: 'row', marginBottom: 20 },
  timeColumn: { width: 80, alignItems: 'center', paddingRight: 10 },
  timeText: { fontSize: 12, color: COLORS.textDark, fontWeight: '800' },
  dotIndicator: { width: 12, height: 12, borderRadius: 6, backgroundColor: COLORS.primary, marginTop: 8, borderWidth: 2, borderColor: COLORS.white },
  lineIndicator: { width: 2, flex: 1, backgroundColor: '#E2E8F0', marginTop: 4 },
  cardDetails: { flex: 1, backgroundColor: COLORS.white, padding: 18, borderRadius: 20, ...SHADOWS.small },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  stopName: { fontSize: 17, fontWeight: '800', color: COLORS.textDark, flex: 1 },
  navBtnSmall: { backgroundColor: COLORS.primary, flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 10 },
  navBtnTextSmall: { color: COLORS.white, fontSize: 11, fontWeight: '700' },
  travelBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#F0F9FF', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  travelText: { fontSize: 10, fontWeight: '700', color: COLORS.primary },
  activity: { fontSize: 14, color: COLORS.secondary, fontWeight: '600', marginTop: 2 },
  notes: { fontSize: 13, color: COLORS.textMuted, fontStyle: 'italic', marginTop: 8 },
  stopImg: { width: '100%', height: 120, borderRadius: 12, marginTop: 15 },
  emptyState: { alignItems: 'center', padding: 40 },
  emptyText: { textAlign: 'center', color: COLORS.textMuted, fontSize: 15, marginBottom: 20, lineHeight: 22 },
  ctaBtn: { backgroundColor: COLORS.primary, paddingVertical: 14, paddingHorizontal: 24, borderRadius: 15 },
  ctaText: { color: COLORS.white, fontWeight: '700' }
});

export default TimetableScreen;