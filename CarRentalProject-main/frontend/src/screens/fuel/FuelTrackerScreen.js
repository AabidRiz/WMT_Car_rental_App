import React, { useState, useEffect, useContext } from 'react';
import { View, Text, StyleSheet, TextInput, Modal, Image, Linking, Alert, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import axios from 'axios';
import { COLORS, SHADOWS } from '../../theme/colors';
import AnimatedButton from '../../components/AnimatedButton';
import { AuthContext, API_URL } from '../../context/AuthContext';

const FuelTrackerScreen = ({ navigation }) => {
  const { user } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  // FIX #8: Separate submitting state for actions so full-screen spinner isn't triggered
  const [submitting, setSubmitting] = useState(false);
  const [bookings, setBookings] = useState([]);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [tripPlan, setTripPlan] = useState(null);
  const [totalDistance, setTotalDistance] = useState(0);
  const [fuelHistory, setFuelHistory] = useState([]);
  const [editingLogId, setEditingLogId] = useState(null);
  const [oldLitres, setOldLitres] = useState(0);

  const [litres, setLitres] = useState('');
  const [cost, setCost] = useState('');
  // FIX #3: Added stationName state
  const [stationName, setStationName] = useState('');
  const [receiptImage, setReceiptImage] = useState(null);
  // FIX #1: Declared missing state variables
  const [sosVisible, setSosVisible] = useState(false);
  const [damageImage, setDamageImage] = useState(null);

  const animatedWidth = useSharedValue('0%');
  const barStyle = useAnimatedStyle(() => ({ width: animatedWidth.value }));

  useEffect(() => {
    fetchBookings();
  }, []);

  // FIX #5: Moved handleSelectBooking above fetchBookings to avoid declaration order issues
  const handleSelectBooking = async (booking) => {
    setSelectedBooking(booking);
    setLoading(true);
    try {
      // FIX #1: Backticks for all template literals
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

  const fetchBookings = async () => {
    try {
      // FIX #1: Backtick template literal
      const res = await axios.get(`${API_URL}/bookings/my`);
      if (res.data.success) {
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

  const calculateTripDistance = async (stops) => {
    if (!stops || stops.length < 2) return;
    try {
      // FIX #1: Backtick template literals
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

  // FIX #4: Safe fallback if car is not populated (returns plain ID string)
  const car = typeof selectedBooking?.car === 'object' ? selectedBooking.car : null;
  const currentFuel = car?.currentFuel || 0;
  const tankCapacity = car?.tankCapacity || 50;
  const kmPerLiter = car?.kmPerLiter || 15;

  const tankPercent = Math.min(100, Math.round((currentFuel / tankCapacity) * 100));
  const rangeRemaining = Math.round(currentFuel * kmPerLiter);
  const fuelNeededForTrip = kmPerLiter > 0 ? (totalDistance / kmPerLiter).toFixed(1) : '0.0';

  useEffect(() => {
    // FIX #1: Backtick template literal
    animatedWidth.value = withTiming(`${tankPercent}%`, { duration: 300 });
  }, [tankPercent]);

  const pickReceipt = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permissionResult.granted === false) {
      Alert.alert("Permission required", "You've refused to allow this app to access your photos!");
      return;
    }
    let res = await ImagePicker.launchImageLibraryAsync({ quality: 0.8 });
    if (!res.canceled) setReceiptImage(res.assets[0].uri);
  };

  const downloadReport = async () => {
    if (!selectedBooking) return;
    try {
      setSubmitting(true);
      // FIX #1: Backtick template literals throughout
      const url = `${API_URL}/fuel/${selectedBooking._id}/report`;
      const fileUri = FileSystem.documentDirectory + `fuel_report_${selectedBooking._id}.pdf`;

      console.log("Downloading PDF from:", url);

      const { uri, status } = await FileSystem.downloadAsync(url, fileUri, {
        headers: {
          Authorization: `Bearer ${user?.token || ''}`
        }
      });

      console.log("Download complete. Status:", status, "URI:", uri);

      if (status === 200) {
        const isAvailable = await Sharing.isAvailableAsync();
        if (isAvailable) {
          await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
        } else {
          Alert.alert('Error', 'Sharing is not available on this device');
        }
      } else {
        Alert.alert('Error', `Failed to generate PDF. Server returned status: ${status}`);
      }
    } catch (error) {
      console.error("PDF Download Error:", error);
      Alert.alert('Error', `Failed to download report: ${error.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  // FIX #7: pickDamage now properly uses damageImage state (keep or remove if unused in UI)
  const pickDamage = async () => {
    let res = await ImagePicker.launchImageLibraryAsync({ quality: 0.8 });
    if (!res.canceled) setDamageImage(res.assets[0].uri);
  };

  const submitFuel = async () => {
    // FIX #9: Proper numeric validation on frontend
    const parsedLitres = parseFloat(litres);
    const parsedCost = parseFloat(cost);

    if (!litres || isNaN(parsedLitres) || parsedLitres <= 0) {
      return Alert.alert('Error', 'Please enter a valid positive number for litres.');
    }
    if (!cost || isNaN(parsedCost) || parsedCost < 0) {
      return Alert.alert('Error', 'Please enter a valid cost.');
    }

    setSubmitting(true);
    try {
      const currentInCar = parseFloat(currentFuel) || 0;

      // FIX #1: Backtick template literals
      let url = `${API_URL}/fuel`;
      let method = 'post';

      if (editingLogId) {
        url = `${API_URL}/fuel/${editingLogId}`;
        method = 'put';
      }

      let reqData;
      let headers = {};

      if (editingLogId) {
        reqData = {
          litresFilled: parsedLitres,
          costPaid: parsedCost,
          stationName,
        };
      } else {
        const formData = new FormData();
        formData.append('bookingId', selectedBooking._id);
        formData.append('litresFilled', parsedLitres);
        formData.append('costPaid', parsedCost);
        // FIX #3: Append stationName to formData
        formData.append('stationName', stationName);

        if (receiptImage) {
          const uriParts = receiptImage.split('.');
          const fileType = uriParts[uriParts.length - 1];
          formData.append('receiptPhoto', {
            uri: receiptImage,
            // FIX #1: Backtick template literal
            name: `receipt_${Date.now()}.${fileType}`,
            type: `image/${fileType}`
          });
        }

        reqData = formData;
        headers = { 'Content-Type': 'multipart/form-data' };
      }

      const res = await axios[method](url, reqData, { headers });

      if (res.data.success) {
        let offsetLitres = parsedLitres;
        if (editingLogId) {
          offsetLitres = parsedLitres - oldLitres;
        }

        const newFuel = Math.max(0, Math.min(tankCapacity, currentInCar + offsetLitres));
        // FIX #1: Backtick template literal
        await axios.put(`${API_URL}/cars/${car?._id}/fuel`, { currentFuel: newFuel });

        // FIX #1: Backtick template literal
        Alert.alert('Success', `Refueling entry ${editingLogId ? 'updated' : 'recorded'} successfully!`);
        cancelEdit();
        setReceiptImage(null);
        setStationName('');
        fetchBookings();
      }
    } catch (e) {
      Alert.alert('Error', 'Could not process fuel update.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditItem = (item) => {
    setEditingLogId(item._id);
    setOldLitres(item.litresFilled);
    setLitres(item.litresFilled.toString());
    setCost(item.costPaid.toString());
    setStationName(item.stationName || '');
  };

  const cancelEdit = () => {
    setEditingLogId(null);
    setOldLitres(0);
    setLitres('');
    setCost('');
    setStationName('');
  };

  const deleteFuelLog = async (item) => {
    Alert.alert("Confirm Delete", "Are you sure you want to remove this top-up log?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive", onPress: async () => {
          setSubmitting(true);
          try {
            // FIX #1: Backtick template literal
            const res = await axios.delete(`${API_URL}/fuel/${item._id}`);
            if (res.data.success) {
              // FIX #6: Refetch bookings fully so car fuel level is accurate from server,
              // rather than doing potentially incorrect local subtraction.
              Alert.alert('Deleted', 'Fuel log successfully removed.');
              cancelEdit();
              fetchBookings();
            }
          } catch (e) {
            Alert.alert('Error', 'Could not delete fuel entry.');
          } finally {
            setSubmitting(false);
          }
        }
      }
    ]);
  };

  const handleSOS = () => {
    Linking.openURL('tel:119');
    // FIX #1: setSosVisible now properly declared
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
                <Text style={[styles.bookingText, selectedBooking?._id === b._id && styles.activeBookingText]}>
                  {typeof b.car === 'object' ? b.car?.name : 'Vehicle'}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>{car?.name} - Fuel Dashboard</Text>
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
            <Pressable onPress={cancelEdit}>
              <Text style={{ color: COLORS.secondary, fontWeight: '700' }}>Cancel</Text>
            </Pressable>
          )}
        </View>

        <TextInput
          style={styles.input}
          placeholder="Litres pumped"
          placeholderTextColor={COLORS.textMuted}
          keyboardType="numeric"
          value={litres}
          onChangeText={setLitres}
        />
        <TextInput
          style={styles.input}
          placeholder="Total Cost (Rs)"
          placeholderTextColor={COLORS.textMuted}
          keyboardType="numeric"
          value={cost}
          onChangeText={setCost}
        />
        {/* FIX #3: Added stationName input */}
        <TextInput
          style={styles.input}
          placeholder="Station Name (optional)"
          placeholderTextColor={COLORS.textMuted}
          value={stationName}
          onChangeText={setStationName}
        />

        {!editingLogId && (
          <Pressable style={styles.photoUploadBtn} onPress={pickReceipt}>
            <Ionicons name="camera-outline" size={20} color={COLORS.primary} />
            <Text style={styles.photoUploadText}>{receiptImage ? 'Change Receipt Photo' : 'Upload Receipt Photo'}</Text>
          </Pressable>
        )}

        {receiptImage && (
          <Image source={{ uri: receiptImage }} style={{ width: '100%', height: 150, borderRadius: 10, marginBottom: 15, resizeMode: 'cover' }} />
        )}

        <AnimatedButton
          title={submitting ? "Processing..." : (editingLogId ? "Update Top-Up" : "Submit Top-Up Log")}
          onPress={submitFuel}
          disabled={submitting}
        />

        {fuelHistory && fuelHistory.length > 0 && (
          <View style={{ marginTop: 30 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
              <Text style={{ fontSize: 18, fontWeight: '800', color: COLORS.textDark }}>Refueling History</Text>
              <Pressable onPress={downloadReport} style={styles.pdfBtn} disabled={submitting}>
                <Ionicons name="download-outline" size={16} color={COLORS.white} />
                <Text style={styles.pdfBtnText}>PDF</Text>
              </Pressable>
            </View>
            {fuelHistory.map((item) => (
              <Animated.View key={item._id} style={styles.historyCard}>
                <View style={styles.historyInfo}>
                  <Text style={styles.historyLitres}>{item.litresFilled} L</Text>
                  <Text style={styles.historyCost}>Rs {item.costPaid}</Text>
                  <Text style={styles.historyDate}>
                    {new Date(item.createdAt).toLocaleDateString()}{' '}
                    {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                  {item.stationName ? <Text style={styles.historyStation}>{item.stationName}</Text> : null}
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
  // FIX #10: borderWeight -> borderWidth
  bookingItem: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.white, paddingVertical: 10, paddingHorizontal: 16, borderRadius: 12, marginRight: 10, ...SHADOWS.small, borderWidth: 1, borderColor: '#F1F5F9' },
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
  historyStation: { fontSize: 11, color: COLORS.textMuted, marginTop: 2, fontStyle: 'italic' },
  historyActions: { flexDirection: 'row', gap: 8 },
  iconBtnC: { backgroundColor: '#F8FAFC', padding: 8, borderRadius: 8, borderWidth: 1, borderColor: '#F1F5F9' },
  photoUploadBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#F0F9FF', padding: 15, borderRadius: 12, marginBottom: 15, borderWidth: 1, borderColor: '#BAE6FD', borderStyle: 'dashed' },
  photoUploadText: { color: COLORS.primary, fontWeight: '700', fontSize: 14 },
  pdfBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: COLORS.primary, paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8 },
  pdfBtnText: { color: COLORS.white, fontWeight: '700', fontSize: 14 }
});

export default FuelTrackerScreen;
