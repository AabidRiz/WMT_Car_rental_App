import React, { useState, useEffect, useContext } from 'react';
import {
  View, Text, StyleSheet, FlatList, Pressable, Image,
  ActivityIndicator, RefreshControl, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { COLORS, SHADOWS } from '../../theme/colors';
import { AuthContext, API_URL } from '../../context/AuthContext';

const BASE_URL = API_URL.replace('/api', '');

const MyTripsScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [trips, setTrips] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchTrips();
  }, []);

  const fetchTrips = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/trips`);
      if (res.data.success) {
        setTrips(res.data.data);
      }
    } catch (e) {
      console.log('Fetch trips error:', e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchTrips();
  };

  const handleDeleteTrip = async (tripId) => {
    Alert.alert(
      "Delete Itinerary",
      "Are you sure you want to delete this trip plan? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive", 
          onPress: async () => {
            try {
              const res = await axios.delete(`${API_URL}/trips/${tripId}`);
              if (res.data.success) {
                setTrips(trips.filter(t => t._id !== tripId));
                Alert.alert("Deleted", "Your trip itinerary has been removed.");
              }
            } catch (e) {
              Alert.alert("Error", "Failed to delete trip. Please try again.");
            }
          }
        }
      ]
    );
  };

  const renderTripCard = ({ item, index }) => {
    const carImage = item.booking?.car?.images?.[0] || 'https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?q=80&w=400';
    const stopCount = item.stops?.length || 0;
    const maxDay = stopCount > 0 ? Math.max(...item.stops.map(s => s.dayNumber)) : 0;

    return (
      <Pressable 
        style={styles.card} 
        onPress={() => navigation.navigate('Timetable', { planId: item._id })}
      >
        <Image source={{ uri: carImage.startsWith('http') ? carImage : `${BASE_URL}/${carImage}` }} style={styles.cardImg} />
        <View style={styles.cardOverlay}>
            <View style={styles.dayBadge}>
                <Text style={styles.dayBadgeText}>{maxDay} Days</Text>
            </View>
        </View>
        
        <View style={styles.cardContent}>
            <View style={styles.cardHeader}>
                <Text style={styles.tripTitle}>{item.title || 'My Trip'}</Text>
                <View style={styles.statusBadge}>
                    <Text style={styles.statusText}>{item.isFinalized ? 'Confirmed' : 'Draft'}</Text>
                </View>
            </View>
            
            <View style={styles.tripDetails}>
                <View style={styles.detailItem}>
                    <Ionicons name="car-outline" size={14} color={COLORS.textMuted} />
                    <Text style={styles.detailText}>{item.booking?.car?.brand} {item.booking?.car?.model}</Text>
                </View>
                <View style={styles.detailItem}>
                    <Ionicons name="location-outline" size={14} color={COLORS.textMuted} />
                    <Text style={styles.detailText}>{stopCount} Stops</Text>
                </View>
            </View>

            <View style={styles.cardFooter}>
                <Pressable style={styles.viewBtn} onPress={() => navigation.navigate('Timetable', { planId: item._id })}>
                    <Text style={styles.viewBtnText}>View Itinerary</Text>
                </Pressable>
                <Pressable 
                    style={styles.editBtn} 
                    onPress={() => navigation.navigate('TripPlanner', { existingPlanId: item._id, bookingId: item.booking?._id })}
                >
                    <Ionicons name="create-outline" size={18} color={COLORS.primary} />
                </Pressable>
                <Pressable 
                    style={[styles.editBtn, { backgroundColor: '#FEE2E2', marginLeft: 10 }]} 
                    onPress={() => handleDeleteTrip(item._id)}
                >
                    <Ionicons name="trash-outline" size={18} color={COLORS.error} />
                </Pressable>
            </View>
        </View>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()}><Ionicons name="arrow-back" size={24} color={COLORS.textDark} /></Pressable>
        <Text style={styles.headerTitle}>My Itineraries</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading && !refreshing ? (
          <View style={styles.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>
      ) : (
          <FlatList
            data={trips}
            renderItem={renderTripCard}
            keyExtractor={item => item._id}
            contentContainerStyle={styles.listContent}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
            ListEmptyComponent={
                <View style={styles.emptyBox}>
                    <Ionicons name="map-outline" size={60} color="#D1D5DB" />
                    <Text style={styles.emptyText}>You haven't planned any trips yet.</Text>
                    <Pressable style={styles.createBtn} onPress={() => navigation.navigate('TripPlanner')}>
                        <Text style={styles.createBtnText}>Plan Your First Trip</Text>
                    </Pressable>
                </View>
            }
          />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  headerTitle: { fontSize: 20, fontWeight: '800', color: COLORS.textDark },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { padding: 20 },
  card: { backgroundColor: COLORS.white, borderRadius: 20, marginBottom: 20, overflow: 'hidden', ...SHADOWS.medium },
  cardImg: { width: '100%', height: 160 },
  cardOverlay: { position: 'absolute', top: 15, left: 15 },
  dayBadge: { backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  dayBadgeText: { color: COLORS.white, fontSize: 12, fontWeight: '700' },
  cardContent: { padding: 18 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  tripTitle: { fontSize: 18, fontWeight: '800', color: COLORS.textDark },
  statusBadge: { backgroundColor: '#ECFDF5', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 10, fontWeight: '700', color: '#059669', textTransform: 'uppercase' },
  tripDetails: { flexDirection: 'row', gap: 15, marginTop: 8 },
  detailItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  detailText: { fontSize: 12, color: COLORS.textMuted, fontWeight: '600' },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 20, paddingTop: 15, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  viewBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12 },
  viewBtnText: { color: COLORS.white, fontWeight: '700', fontSize: 14 },
  editBtn: { padding: 8, backgroundColor: '#F0F9FF', borderRadius: 10 },
  emptyBox: { marginTop: 100, alignItems: 'center' },
  emptyText: { color: COLORS.textMuted, marginTop: 20, fontSize: 16, fontWeight: '600' },
  createBtn: { marginTop: 20, backgroundColor: COLORS.primary, paddingHorizontal: 25, paddingVertical: 12, borderRadius: 15 },
  createBtnText: { color: COLORS.white, fontWeight: '700' }
});

export default MyTripsScreen;
