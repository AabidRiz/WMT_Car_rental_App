import React, { useState, useEffect, useContext } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, TextInput,
  ActivityIndicator, Alert, Modal, FlatList, Platform, RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { COLORS, SHADOWS } from '../../theme/colors';
import { AuthContext, API_URL } from '../../context/AuthContext';
import MapComponent from '../../components/MapComponent';
import AnimatedButton from '../../components/AnimatedButton';

const TripPlannerScreen = ({ route, navigation }) => {
  const { user } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [activeBookings, setActiveBookings] = useState([]);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [tripPlan, setTripPlan] = useState(null);
  
  // Builder state
  const [currentDay, setCurrentDay] = useState(1);
  const [stops, setStops] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [selectedResult, setSelectedResult] = useState(null);
  const [stopTime, setStopTime] = useState('08:00 AM');
  const [activity, setActivity] = useState('');
  
  // Edit mode
  const [editIndex, setEditIndex] = useState(null);

  useEffect(() => {
    fetchBookings();
    const { existingPlanId, bookingId } = route.params || {};
    if (existingPlanId) {
        loadExistingPlan(existingPlanId);
    }
  }, [route.params]);

  const loadExistingPlan = async (planId) => {
    setLoading(true);
    try {
        const res = await axios.get(`${API_URL}/trips/${planId}`);
        if (res.data.success) {
            setTripPlan(res.data.data);
            setStops(res.data.data.stops || []);
            setSelectedBooking(res.data.data.booking);
            if (res.data.data.stops.length > 0) {
                const maxDay = Math.max(...res.data.data.stops.map(s => s.dayNumber));
                setCurrentDay(maxDay);
            }
        }
    } catch (e) {
        console.log('Load existing plan error:', e.message);
    } finally {
        setLoading(false);
    }
  };

  const fetchBookings = async () => {
    try {
      const res = await axios.get(`${API_URL}/bookings/my`);
      if (res.data.success) {
        const approved = res.data.data.filter(b => b.status === 'Approved');
        setActiveBookings(approved);
        if (approved.length > 0) handleSelectBooking(approved[0]);
      }
    } catch (e) {
      console.log('Fetch bookings error:', e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectBooking = async (booking) => {
    setSelectedBooking(booking);
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/trips/booking/${booking._id}`);
      if (res.data.success && res.data.data) {
        setTripPlan(res.data.data);
        setStops(res.data.data.stops || []);
        if (res.data.data.stops.length > 0) {
            const maxDay = Math.max(...res.data.data.stops.map(s => s.dayNumber));
            setCurrentDay(maxDay);
        }
      } else {
        // Create a new shell plan if none exists
        const createRes = await axios.post(`${API_URL}/trips`, {
          bookingId: booking._id,
          title: `Trip for ${booking.car?.name}`
        });
        setTripPlan(createRes.data.data);
        setStops([]);
      }
    } catch (e) {
      console.log('Trip plan fetch error:', e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=5&countrycodes=lk`,
        { headers: { 'User-Agent': 'DriveMate-App' } }
      );
      const data = await res.json();
      setSearchResults(data);
    } catch (e) {
      console.log('Search error:', e.message);
    } finally {
      setSearching(false);
    }
  };

  const addStop = async () => {
    if (!selectedResult) return Alert.alert('Error', 'Please select a location.');
    
    // Create new stop object
    const newStop = {
      destination: {
        name: selectedResult.display_name.split(',')[0],
        coordinates: { lat: parseFloat(selectedResult.lat), lng: parseFloat(selectedResult.lon) }
      },
      dayNumber: currentDay,
      scheduledTime: stopTime,
      activityLabel: activity
    };

    let updatedStops;
    if (editIndex !== null) {
        updatedStops = [...stops];
        updatedStops[editIndex] = newStop;
        setEditIndex(null);
    } else {
        updatedStops = [...stops, newStop];
    }

    // Sort by day and time (basic string sort for demo)
    updatedStops.sort((a, b) => {
        if (a.dayNumber !== b.dayNumber) return a.dayNumber - b.dayNumber;
        return a.scheduledTime.localeCompare(b.scheduledTime);
    });

    setStops(updatedStops);
    setShowSearchModal(false);
    resetForm();
  };

  const resetForm = () => {
    setSearchQuery('');
    setSearchResults([]);
    setSelectedResult(null);
    setActivity('');
  };

  const deleteStop = (index) => {
    setStops(stops.filter((_, i) => i !== index));
  };

  const handleSaveTrip = async () => {
    if (!tripPlan) return;
    setLoading(true);
    try {
      console.log('Starting trip save. Processing stops:', stops.length);
      
      const processedStops = [];
      for (let stop of stops) {
        let destinationId = null;

        // Condition 1: Destination is already a string ID
        if (typeof stop.destination === 'string') {
          destinationId = stop.destination;
        } 
        // Condition 2: Destination is a DB object with _id
        else if (stop.destination?._id) {
          destinationId = stop.destination._id;
        } 
        // Condition 3: Destination is a raw search result object
        else if (stop.destination?.name && stop.destination?.coordinates) {
          const destData = {
            name: stop.destination.name,
            location: stop.destination.name,
            lat: stop.destination.coordinates.lat,
            lng: stop.destination.coordinates.lng,
            category: 'Other'
          };
          console.log('Registering new destination:', destData.name);
          const res = await axios.post(`${API_URL}/destinations`, destData);
          destinationId = res.data.data._id;
        }

        if (!destinationId) throw new Error('Invalid destination at one of your stops.');

        processedStops.push({
          ...stop,
          destination: destinationId
        });
      }

      console.log('Saving trip with processed stops IDs:', processedStops.map(s => s.destination));

      const res = await axios.put(`${API_URL}/trips/${tripPlan._id}`, {
        stops: processedStops
      });

      if (res.data.success) {
        Alert.alert('Success', 'Trip plan saved & timetable generated!');
        navigation.navigate('Timetable', { planId: tripPlan._id });
      }
    } catch (e) {
      console.log('Save error detail:', e.response?.data || e.message);
      Alert.alert('Error', 'Failed to save trip plan: ' + (e.response?.data?.message || e.message));
    } finally {
      setLoading(false);
    }
  };

  const renderStop = (item, index) => (
    <View key={index} style={styles.stopCard}>
        <View style={styles.stopTimeBox}>
            <Text style={styles.stopDay}>Day {item.dayNumber}</Text>
            <Text style={styles.stopTime}>{item.scheduledTime}</Text>
        </View>
        <View style={styles.stopInfo}>
            <Text style={styles.stopName}>{item.destination?.name || 'Unknown'}</Text>
            <Text style={styles.stopActivity}>{item.activityLabel || 'Travel'}</Text>
        </View>
        <View style={styles.stopActions}>
            <Pressable onPress={() => {
                setEditIndex(index);
                setStopTime(item.scheduledTime);
                setActivity(item.activityLabel);
                setShowSearchModal(true);
            }}>
                <Ionicons name="pencil" size={20} color={COLORS.primary} />
            </Pressable>
            <Pressable onPress={() => deleteStop(index)}>
                <Ionicons name="trash-outline" size={20} color={COLORS.error} />
            </Pressable>
        </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()}><Ionicons name="arrow-back" size={24} color={COLORS.textDark} /></Pressable>
        <Text style={styles.headerTitle}>Plan Your Trip</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Booking Selector */}
        <View style={styles.section}>
            <Text style={styles.sectLabel}>Link to Booking</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.bookingRow}>
                {activeBookings.map(b => (
                    <Pressable 
                        key={b._id} 
                        style={[styles.bookingChip, selectedBooking?._id === b._id && styles.activeChip]}
                        onPress={() => handleSelectBooking(b)}
                    >
                        <Text style={[styles.chipText, selectedBooking?._id === b._id && styles.activeChipText]}>
                            {b.car?.brand} ({new Date(b.startDate).toLocaleDateString()})
                        </Text>
                    </Pressable>
                ))}
            </ScrollView>
        </View>

        {/* Map Preview */}
        <View style={styles.mapWrap}>
            <MapComponent stops={stops} height={220} />
            <View style={styles.mapOverlay}>
                <Text style={styles.overlayText}>{stops.length} Stops Configured</Text>
            </View>
        </View>

        {/* Day Selector Tabs */}
        <View style={styles.section}>
            <Text style={styles.sectLabel}>Currently Planning: Day {currentDay}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dayTabs}>
                {Array.from({ length: selectedBooking?.totalDays || 1 }, (_, i) => i + 1).map(day => (
                    <Pressable 
                        key={day} 
                        style={[styles.dayTab, currentDay === day && styles.activeDayTab]}
                        onPress={() => setCurrentDay(day)}
                    >
                        <Text style={[styles.dayTabText, currentDay === day && styles.activeDayTabText]}>Day {day}</Text>
                    </Pressable>
                ))}
            </ScrollView>
        </View>

        {/* Timeline Builder */}
        <View style={styles.timelineHeader}>
            <Text style={styles.sectLabel}>Stops for Day {currentDay}</Text>
            <Pressable style={styles.addStopBtn} onPress={() => setShowSearchModal(true)}>
                <Ionicons name="add-circle" size={18} color={COLORS.primary} />
                <Text style={styles.addStopText}>Add Stop to Day {currentDay}</Text>
            </Pressable>
        </View>

        {stops.filter(s => s.dayNumber === currentDay).length === 0 ? (
            <View style={styles.emptyTimeline}>
                <Ionicons name="map-outline" size={48} color="#D1D5DB" />
                <Text style={styles.emptyText}>No stops added for Day {currentDay} yet.</Text>
            </View>
        ) : (
            stops.filter(s => s.dayNumber === currentDay).map((item, idx) => renderStop(item, stops.indexOf(item)))
        )}

        {stops.length > 0 && (
            <View style={styles.footerActions}>
                {currentDay < (selectedBooking?.totalDays || 1) ? (
                    <Pressable style={styles.newDayBtn} onPress={() => setCurrentDay(d => d + 1)}>
                        <Ionicons name="moon-outline" size={18} color={COLORS.textDark} />
                        <Text style={styles.newDayText}>End Day {currentDay} & Start Day {currentDay + 1}</Text>
                    </Pressable>
                ) : (
                    <View style={styles.limitBox}>
                        <Ionicons name="information-circle-outline" size={18} color={COLORS.primary} />
                        <Text style={styles.limitText}>
                            Maximum days reached ({selectedBooking?.totalDays} days booking). 
                            Edit booking to add more days.
                        </Text>
                    </View>
                )}
                
                <AnimatedButton 
                    title="Generate & Save Timetable" 
                    onPress={handleSaveTrip} 
                    style={{ marginTop: 20 }}
                />
            </View>
        )}
      </ScrollView>

      {/* SEARCH & ADD STOP MODAL */}
      <Modal visible={showSearchModal} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>{editIndex !== null ? 'Edit Stop' : 'Add Stop'}</Text>
                    <Pressable onPress={() => setShowSearchModal(false)}><Ionicons name="close" size={24} color={COLORS.textDark} /></Pressable>
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Location Name</Text>
                    <View style={styles.modalSearchBar}>
                        <TextInput 
                            style={styles.modalSearchInput} 
                            placeholder="Enter destination..." 
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            onSubmitEditing={handleSearch}
                        />
                        <Pressable onPress={handleSearch} style={styles.searchIconBtn}>
                            {searching ? <ActivityIndicator size="small" color={COLORS.primary} /> : <Ionicons name="search" size={20} color={COLORS.white} />}
                        </Pressable>
                    </View>
                </View>

                {searchResults.length > 0 && (
                    <View style={styles.resultsList}>
                        {searchResults.map((res, i) => (
                            <Pressable 
                                key={i} 
                                style={[styles.resultItem, selectedResult?.place_id === res.place_id && styles.activeResult]}
                                onPress={() => setSelectedResult(res)}
                            >
                                <Ionicons name="location" size={16} color={COLORS.primary} />
                                <Text style={styles.resultText} numberOfLines={1}>{res.display_name}</Text>
                            </Pressable>
                        ))}
                    </View>
                )}

                <View style={styles.rowInputs}>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.inputLabel}>Time</Text>
                        <TextInput 
                            style={styles.smallInput} 
                            value={stopTime} 
                            onChangeText={setStopTime} 
                            placeholder="08:00 AM" 
                        />
                    </View>
                    <View style={{ flex: 2, marginLeft: 15 }}>
                        <Text style={styles.inputLabel}>Activity</Text>
                        <TextInput 
                            style={styles.smallInput} 
                            value={activity} 
                            onChangeText={setActivity} 
                            placeholder="e.g. Hiking" 
                        />
                    </View>
                </View>

                <Pressable style={styles.confirmAddBtn} onPress={addStop}>
                    <Text style={styles.confirmAddText}>{editIndex !== null ? 'Update Stop' : 'Add to Day ' + currentDay}</Text>
                </Pressable>
              </View>
          </View>
      </Modal>

      {loading && (
          <View style={styles.globalLoader}>
              <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.white },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  headerTitle: { fontSize: 20, fontWeight: '800', color: COLORS.textDark },
  scrollContent: { paddingBottom: 40 },
  section: { padding: 20 },
  sectLabel: { fontSize: 13, fontWeight: '700', color: COLORS.textMuted, textTransform: 'uppercase', marginBottom: 12 },
  bookingRow: { flexDirection: 'row' },
  bookingChip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, backgroundColor: '#F3F4F6', marginRight: 10, borderWidth: 1, borderColor: 'transparent' },
  activeChip: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { fontSize: 14, color: COLORS.textDark, fontWeight: '600' },
  activeChipText: { color: COLORS.white },
  mapWrap: { height: 220, marginHorizontal: 20, borderRadius: 20, overflow: 'hidden', ...SHADOWS.medium },
  mapOverlay: { position: 'absolute', bottom: 15, right: 15, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  overlayText: { color: COLORS.white, fontSize: 12, fontWeight: '700' },
  timelineHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginTop: 25 },
  addStopBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#EFF6FF', padding: 8, borderRadius: 10 },
  addStopText: { fontSize: 13, fontWeight: '700', color: COLORS.primary },
  emptyTimeline: { padding: 40, alignItems: 'center' },
  emptyText: { color: COLORS.textMuted, marginTop: 15, textAlign: 'center', fontSize: 14 },
  stopCard: { flexDirection: 'row', alignItems: 'center', padding: 15, backgroundColor: '#F9FAFB', marginHorizontal: 20, marginBottom: 12, borderRadius: 15, borderWidth: 1, borderColor: '#F1F5F9' },
  stopTimeBox: { width: 70 },
  stopDay: { fontSize: 10, fontWeight: '800', color: COLORS.primary, textTransform: 'uppercase' },
  stopTime: { fontSize: 14, fontWeight: '700', color: COLORS.textDark, marginTop: 2 },
  stopInfo: { flex: 1, marginLeft: 10 },
  stopName: { fontSize: 16, fontWeight: '700', color: COLORS.textDark },
  stopActivity: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  stopActions: { flexDirection: 'row', gap: 12 },
  footerActions: { padding: 20 },
  dayTabs: { flexDirection: 'row', marginTop: 5 },
  dayTab: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12, backgroundColor: '#F3F4F6', marginRight: 10, borderWidth: 1, borderColor: '#E5E7EB' },
  activeDayTab: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  dayTabText: { fontSize: 14, fontWeight: '700', color: COLORS.textDark },
  activeDayTabText: { color: COLORS.white },
  newDayBtn: { padding: 15, borderRadius: 12, backgroundColor: '#F0F9FF', alignItems: 'center', flexDirection: 'row', justifyContent: 'center', borderStyle: 'solid', borderWidth: 1, borderColor: '#BAE6FD' },
  newDayText: { color: COLORS.primary, fontWeight: '800', marginLeft: 8 },
  limitBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', padding: 15, borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', gap: 10 },
  limitText: { flex: 1, color: COLORS.textMuted, fontSize: 13, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: COLORS.white, borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 25, paddingBottom: 40 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: COLORS.textDark },
  inputGroup: { marginBottom: 20 },
  inputLabel: { fontSize: 12, fontWeight: '700', color: COLORS.textMuted, marginBottom: 8, textTransform: 'uppercase' },
  modalSearchBar: { flexDirection: 'row', backgroundColor: '#F3F4F6', borderRadius: 12, height: 50, overflow: 'hidden' },
  modalSearchInput: { flex: 1, paddingHorizontal: 15, fontSize: 15, color: COLORS.textDark },
  searchIconBtn: { width: 50, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
  resultsList: { marginBottom: 20, backgroundColor: '#F9FAFB', borderRadius: 12, padding: 10 },
  resultItem: { flexDirection: 'row', padding: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  activeResult: { backgroundColor: '#DBEAFE' },
  resultText: { marginLeft: 10, fontSize: 13, color: COLORS.textDark, flex: 1 },
  rowInputs: { flexDirection: 'row', marginBottom: 25 },
  smallInput: { backgroundColor: '#F3F4F6', borderRadius: 12, height: 50, paddingHorizontal: 15, fontSize: 15, fontWeight: '600' },
  confirmAddBtn: { backgroundColor: COLORS.primary, padding: 16, borderRadius: 15, alignItems: 'center' },
  confirmAddText: { color: COLORS.white, fontWeight: '800', fontSize: 16 },
  globalLoader: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,0.7)', justifyContent: 'center', alignItems: 'center', zIndex: 100 }
});

export default TripPlannerScreen;
