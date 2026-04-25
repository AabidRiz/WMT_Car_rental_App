import React, { useState, useEffect, useContext } from 'react';
import { View, Text, StyleSheet, TextInput, Modal, Image, Linking, Alert, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import axios from 'axios';
import { COLORS, SHADOWS } from '../../theme/colors';
import AnimatedButton from '../../components/AnimatedButton';
import { AuthContext, API_URL } from '../../context/AuthContext';

const FuelTrackerScreen = ({ navigation }) => {
  const { user } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState([]);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [tripPlan, setTripPlan] = useState(null);
  const [totalDistance, setTotalDistance] = useState(0); // km
  const [fuelHistory, setFuelHistory] = useState([]);
  const [editingLogId, setEditingLogId] = useState(null);
  const [oldLitres, setOldLitres] = useState(0);
  
  const [litres, setLitres] = useState('');
  const [cost, setCost] = useState('');
  const [receiptImage, setReceiptImage] = useState(null);
  
  const animatedWidth = useSharedValue('0%');
  const barStyle = useAnimatedStyle(() => ({ width: animatedWidth.value }));

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      const res = await axios.get(`${API_URL}/bookings/my`);
      if (res.data.success) {
          // Filter only approved/ongoing bookings
          const active = res.data.data.filter(b => b.status === 'Approved');
          setBookings(active);
          if (active.length > 0) handleSelectBooking(active[0]);
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
        const [tripRes, fuelRes] = await Promise.all([
            axios.get(`${API_URL}/trips/booking/${booking._id}`),
            axios.get(`${API_URL}/fuel/${booking._id}`)
        ]);

        if (tripRes.data.success) {
            const plan = tripRes.data.data;
            setTripPlan(plan);
            calculateTripDistance(plan.stops);
        } else {
            setTripPlan(null);
            setTotalDistance(0);
        }

        if (fuelRes.data.success) {
            setFuelHistory(fuelRes.data.data);
        } else {
            setFuelHistory([]);
        }

    } catch (e) {
        setTripPlan(null);
        setTotalDistance(0);
        setFuelHistory([]);
    } finally {
        setLoading(false);
    }
  };

  const calculateTripDistance = async (stops) => {
    if (!stops || stops.length < 2) return;
    try {
        const coordString = stops.map(s => `${s.destination.coordinates.lng},${s.destination.coordinates.lat}`).join(';');
        const res = await fetch(`https://router.project-osrm.org/trip/v1/driving/${coordString}?overview=false`);
        const data = await res.json();
        if (data.trips && data.trips[0]) {
            const km = data.trips[0].distance / 1000;
            setTotalDistance(Math.round(km));
        }
    } catch (e) {
        console.log('Distance calc error:', e.message);
    }
  };

  const currentFuel = selectedBooking?.car?.currentFuel || 0;
  const tankCapacity = selectedBooking?.car?.tankCapacity || 50;
  const kmPerLiter = selectedBooking?.car?.kmPerLiter || 15;
  
  const tankPercent = Math.min(100, Math.round((currentFuel / tankCapacity) * 100));
  const rangeRemaining = Math.round(currentFuel * kmPerLiter);
  const fuelNeededForTrip = kmPerLiter > 0 ? (totalDistance / kmPerLiter).toFixed(1) : '0.0';

  useEffect(() => {
    animatedWidth.value = withTiming(`${tankPercent}%`, { duration: 300 });
  }, [tankPercent]);

  const pickReceipt = async () => {
    let res = await ImagePicker.launchImageLibraryAsync({ quality: 0.8 });
    if (!res.canceled) setReceiptImage(res.assets[0].uri);
  };

  const pickDamage = async () => {
    let res = await ImagePicker.launchImageLibraryAsync({ quality: 0.8 });
    if (!res.canceled) setDamageImage(res.assets[0].uri);
  };

  const submitFuel = async () => {
    if (!litres || !cost) return Alert.alert('Error', 'Please enter litres and cost.');
    
    setLoading(true);
    try {
        const fuelToLog = parseFloat(litres) || 0;
        const currentInCar = parseFloat(currentFuel) || 0;
        
        let url = `${API_URL}/fuel`;
        let method = 'post';
        
        if (editingLogId) {
            url = `${API_URL}/fuel/${editingLogId}`;
            method = 'put';
        }

        const res = await axios[method](url, {
            bookingId: selectedBooking._id,
            litresFilled: fuelToLog,
            costPaid: cost
        });

        if (res.data.success) {
            // Recalculate physical car fuel offset locally and update car DB
            let offsetLitres = fuelToLog;
            if (editingLogId) {
                offsetLitres = fuelToLog - oldLitres;
            }
            
            const newFuel = Math.max(0, Math.min(tankCapacity, currentInCar + offsetLitres));
            await axios.put(`${API_URL}/cars/${selectedBooking.car._id}/fuel`, { currentFuel: newFuel });

            Alert.alert('Success', `Refueling entry ${editingLogId ? 'updated' : 'recorded'} successfully!`);
            cancelEdit();
            fetchBookings(); // Fetch new car payload fully
        }
    } catch (e) {
        Alert.alert('Error', 'Could not process fuel update.');
    } finally {
        setLoading(false);
    }
  };

  const handleEditItem = (item) => {
    setEditingLogId(item._id);
    setOldLitres(item.litresFilled);
    setLitres(item.litresFilled.toString());
    setCost(item.costPaid.toString());
  };

  const cancelEdit = () => {
    setEditingLogId(null);
    setOldLitres(0);
    setLitres('');
    setCost('');
  };

  const deleteFuelLog = async (item) => {
    Alert.alert("Confirm Delete", "Are you sure you want to remove this top-up log?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
          setLoading(true);
          try {
              const res = await axios.delete(`${API_URL}/fuel/${item._id}`);
              if (res.data.success) {
                  const currentInCar = parseFloat(currentFuel) || 0;
                  const newFuel = Math.max(0, currentInCar - item.litresFilled);
                  await axios.put(`${API_URL}/cars/${selectedBooking.car._id}/fuel`, { currentFuel: newFuel });
                  Alert.alert('Deleted', 'Fuel log successfully removed.');
                  cancelEdit();
                  fetchBookings(); // Fetch new car payload fully
              }
          } catch (e) {
              Alert.alert('Error', 'Could not delete fuel entry.');
          } finally {
              setLoading(false);
          }
      }}
    ]);
  };

  const handleSOS = () => {
    Linking.openURL('tel:119');
    setSosVisible(true);
  };

  if (loading && !selectedBooking) {
    return (
        <View style={styles.center}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={{ marginTop: 10, color: COLORS.textMuted }}>Syncing vehicle data...</Text>
        </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
            <Text style={styles.headerTitle}>Fuel Manager</Text>
            <Pressable onPress={() => navigation.navigate('Profile')}>
               <View style={styles.profileAvatar}>
                 {user?.profilePicture ? (
                   <Image source={{ uri: user.profilePicture }} style={{ width: 36, height: 36, borderRadius: 18 }} />
                 ) : (
                   <Text style={styles.avatarText}>{user?.name.charAt(0)}</Text>
                 )}
               </View>
            </Pressable>
        </View>

        {/* Vehicle & Trip Selection */}
        <View style={styles.selectionCard}>
            <Text style={styles.sectLabel}>Select Active Booking</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.bookingList}>
                {bookings.map(b => (
                    <Pressable 
                        key={b._id} 
                        style={[styles.bookingItem, selectedBooking?._id === b._id && styles.activeBooking]}
                        onPress={() => handleSelectBooking(b)}
                    >
                        <Ionicons name="car" size={20} color={selectedBooking?._id === b._id ? COLORS.white : COLORS.primary} />
                        <Text style={[styles.bookingText, selectedBooking?._id === b._id && styles.activeBookingText]}>{b.car?.name}</Text>
                    </Pressable>
                ))}
            </ScrollView>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>{selectedBooking?.car?.name} - Fuel Dashboard</Text>
          <View style={styles.progressBg}><Animated.View style={[styles.progressFill, barStyle]} /></View>
          <View style={styles.rangeTextRow}>
            <Text style={styles.tankPercentText}>Tank: {tankPercent}% ({currentFuel}L / {tankCapacity}L)</Text>
            <Text style={styles.kmRemText}>{rangeRemaining} km range</Text>
          </View>
        </View>

        {tripPlan && (
            <View style={styles.tripFuelCard}>
                <View style={styles.tripHeader}>
                    <Ionicons name="map-outline" size={24} color={COLORS.primary} />
                    <Text style={styles.tripTitle}>Trip: {tripPlan.title}</Text>
                </View>
                <View style={styles.tripStats}>
                    <View style={styles.tripStatItem}>
                        <Text style={styles.tripStatVal}>{totalDistance} km</Text>
                        <Text style={styles.tripStatLabel}>Total Distance</Text>
                    </View>
                    <View style={styles.tripStatDivider} />
                    <View style={styles.tripStatItem}>
                        <Text style={styles.tripStatVal}>{fuelNeededForTrip} L</Text>
                        <Text style={styles.tripStatLabel}>Fuel Needed</Text>
                    </View>
                </View>
                {parseFloat(fuelNeededForTrip) > currentFuel && (
                    <View style={styles.warningBox}>
                        <Ionicons name="warning" size={16} color="#B45309" />
                        <Text style={styles.warningText}>Refill needed before completing this trip!</Text>
                    </View>
                )}
            </View>
        )}

        <View style={styles.formHeader}>
            <Text style={styles.sectionTitle}>{editingLogId ? 'Update Log' : 'Log Fuel Purchase'}</Text>
            {editingLogId && (
                <Pressable onPress={cancelEdit}><Text style={{color: COLORS.secondary, fontWeight: '700'}}>Cancel</Text></Pressable>
            )}
        </View>
        <TextInput style={styles.input} placeholder="Litres pumped" placeholderTextColor={COLORS.textMuted} keyboardType="numeric" value={litres} onChangeText={setLitres} />
        <TextInput style={styles.input} placeholder="Total Cost (Rs)" placeholderTextColor={COLORS.textMuted} keyboardType="numeric" value={cost} onChangeText={setCost} />
        
        <AnimatedButton title={loading ? "Processing..." : (editingLogId ? "Update Top-Up" : "Submit Top-Up Log")} onPress={submitFuel} />

        {fuelHistory.length > 0 && (
            <View style={{ marginTop: 30 }}>
                <Text style={styles.sectionTitle}>Refueling History</Text>
                {fuelHistory.map((item, index) => (
                    <Animated.View key={item._id} style={styles.historyCard}>
                        <View style={styles.historyInfo}>
                            <Text style={styles.historyLitres}>{item.litresFilled} L</Text>
                            <Text style={styles.historyCost}>Rs {item.costPaid}</Text>
                            <Text style={styles.historyDate}>{new Date(item.createdAt).toLocaleDateString()} {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                        </View>
                        <View style={styles.historyActions}>
                            <Pressable style={styles.iconBtnC} onPress={() => handleEditItem(item)}>
                                <Ionicons name="pencil" size={16} color={COLORS.primary} />
                            </Pressable>
                            <Pressable style={styles.iconBtnC} onPress={() => deleteFuelLog(item)}>
                                <Ionicons name="trash" size={16} color="#ef4444" />
                            </Pressable>
                        </View>
                    </Animated.View>
                ))}
            </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { padding: 20, paddingBottom: 100 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  headerTitle: { fontSize: 28, fontWeight: '800', color: COLORS.textDark },
  profileAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.accent, justifyContent: 'center', alignItems: 'center', ...SHADOWS.floating },
  avatarText: { color: COLORS.white, fontWeight: '700', fontSize: 16 },
  selectionCard: { marginBottom: 20 },
  sectLabel: { fontSize: 13, fontWeight: '800', color: COLORS.primary, textTransform: 'uppercase', marginBottom: 10, letterSpacing: 1 },
  bookingList: { flexDirection: 'row' },
  bookingItem: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.white, paddingVertical: 10, paddingHorizontal: 16, borderRadius: 12, marginRight: 10, ...SHADOWS.small, borderWeight: 1, borderColor: '#F1F5F9' },
  activeBooking: { backgroundColor: COLORS.primary },
  bookingText: { fontSize: 14, fontWeight: '700', color: COLORS.textDark },
  activeBookingText: { color: COLORS.white },
  card: { backgroundColor: COLORS.white, padding: 25, borderRadius: 20, marginBottom: 24, ...SHADOWS.heavy },
  cardTitle: { fontSize: 15, fontWeight: '800', color: COLORS.textDark, marginBottom: 16 },
  progressBg: { height: 12, backgroundColor: '#F3F4F6', borderRadius: 6, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: COLORS.primary },
  rangeTextRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 15 },
  tankPercentText: { fontWeight: '700', color: COLORS.textDark, fontSize: 13 },
  kmRemText: { color: COLORS.primary, fontWeight: '800', fontSize: 13 },
  tripFuelCard: { backgroundColor: '#F0F9FF', padding: 20, borderRadius: 20, borderStyle: 'solid', borderWidth: 1, borderColor: '#BAE6FD', marginBottom: 25 },
  tripHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 15 },
  tripTitle: { fontSize: 16, fontWeight: '800', color: COLORS.textDark },
  tripStats: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
  tripStatItem: { alignItems: 'center' },
  tripStatVal: { fontSize: 22, fontWeight: '900', color: COLORS.primary },
  tripStatLabel: { fontSize: 11, color: COLORS.textMuted, fontWeight: '600', marginTop: 2 },
  tripStatDivider: { width: 1, height: 30, backgroundColor: '#BAE6FD' },
  warningBox: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FFFBEB', padding: 8, borderRadius: 10, marginTop: 15 },
  warningText: { color: '#B45309', fontSize: 11, fontWeight: '700' },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: COLORS.textDark, marginBottom: 15 },
  formHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  input: { backgroundColor: COLORS.white, borderRadius: 12, padding: 18, fontSize: 16, color: COLORS.textDark, marginBottom: 15, ...SHADOWS.small, borderWidth: 1, borderColor: '#F1F5F9' },
  historyCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: COLORS.white, padding: 15, borderRadius: 15, marginBottom: 10, ...SHADOWS.small },
  historyInfo: { flex: 1 },
  historyLitres: { fontSize: 16, fontWeight: '800', color: COLORS.textDark },
  historyCost: { fontSize: 13, color: COLORS.primary, fontWeight: '700', marginTop: 2 },
  historyDate: { fontSize: 11, color: COLORS.textMuted, marginTop: 4 },
  historyActions: { flexDirection: 'row', gap: 8 },
  iconBtnC: { backgroundColor: '#F8FAFC', padding: 8, borderRadius: 8, borderWidth: 1, borderColor: '#F1F5F9' }
});

export default FuelTrackerScreen;
