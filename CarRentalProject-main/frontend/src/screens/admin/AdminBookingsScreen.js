import React, { useState, useEffect, useContext } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Image, ActivityIndicator, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { COLORS, SHADOWS } from '../../theme/colors';
import { AuthContext, API_URL } from '../../context/AuthContext';

const BASE_URL = API_URL.replace('/api', '');

const STATUS_COLORS = {
  Pending: '#F59E0B',
  Approved: '#10B981',
  Cancelled: '#EF4444',
  Active: '#3B82F6',
  Completed: '#6B7280',
};

const AdminBookingsScreen = () => {
  const { logout } = useContext(AuthContext);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);

  useEffect(() => { fetchBookings(); }, []);

  const fetchBookings = async () => {
    try {
      const res = await axios.get(`${API_URL}/bookings`);
      if (res.data.success) setBookings(res.data.data);
    } catch (e) {
      console.log(e);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (bookingId) => {
    setActionLoading(bookingId + '_approve');
    try {
      await axios.put(`${API_URL}/bookings/${bookingId}/approve`);
      fetchBookings();
      if (Platform.OS === 'web') window.alert('Booking Approved! Invoice PDF generated and email sent.');
      else Alert.alert('Approved!', 'Invoice PDF generated and email sent to user.');
    } catch (e) {
      const msg = e.response?.data?.message || 'Failed to approve.';
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert('Error', msg);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (bookingId) => {
    setActionLoading(bookingId + '_reject');
    try {
      await axios.put(`${API_URL}/bookings/${bookingId}/reject`, { reason: 'Payment verification failed.' });
      fetchBookings();
      if (Platform.OS === 'web') window.alert('Booking Rejected. User notified via email.');
      else Alert.alert('Rejected', 'User has been notified via email.');
    } catch (e) {
      const msg = e.response?.data?.message || 'Failed to reject.';
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert('Error', msg);
    } finally {
      setActionLoading(null);
    }
  };

  const renderBooking = (booking) => {
    const car = booking.car;
    const user = booking.user;
    const statusColor = STATUS_COLORS[booking.status] || COLORS.textMuted;
    const isPending = booking.status === 'Pending';

    return (
      <View key={booking._id} style={styles.bookingCard}>
        {/* Car Info Header */}
        <View style={styles.cardHeader}>
          {car?.images?.length > 0 ? (
            <Image source={{ uri: `${BASE_URL}/${car.images[0]}` }} style={styles.carThumb} />
          ) : (
            <View style={[styles.carThumb, { backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' }]}>
              <Ionicons name="car" size={24} color={COLORS.white} />
            </View>
          )}
          <View style={styles.cardHeaderInfo}>
            <Text style={styles.carName}>{car?.brand} {car?.name}</Text>
            <Text style={styles.licensePlate}>{car?.licensePlate}</Text>
            <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
              <Text style={styles.statusText}>{booking.status}</Text>
            </View>
          </View>
        </View>

        {/* User & Booking Details */}
        <View style={styles.detailRow}>
          <Ionicons name="person" size={14} color={COLORS.textMuted} />
          <Text style={styles.detailText}>{user?.name} ({user?.email})</Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="calendar" size={14} color={COLORS.textMuted} />
          <Text style={styles.detailText}>
            {new Date(booking.startDate).toLocaleDateString()} → {new Date(booking.endDate).toLocaleDateString()} ({booking.totalDays} days)
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="card" size={14} color={COLORS.textMuted} />
          <Text style={styles.detailText}>{booking.paymentMethod} — <Text style={{ fontWeight: '700', color: COLORS.primary }}>LKR {booking.totalPrice?.toLocaleString()}</Text></Text>
        </View>

        {/* Bank Slip Preview */}
        {booking.paymentReceiptImage && (
          <View style={styles.slipContainer}>
            <Text style={styles.slipLabel}>Bank Transfer Slip:</Text>
            <Image
              source={{ uri: `${BASE_URL}/${booking.paymentReceiptImage}` }}
              style={styles.slipImage}
              resizeMode="cover"
            />
          </View>
        )}

        {/* Admin Actions - only for Pending */}
        {isPending && (
          <View style={styles.actionRow}>
            <Pressable
              style={[styles.actionBtn, styles.approveBtn]}
              onPress={() => handleApprove(booking._id)}
              disabled={!!actionLoading}
            >
              {actionLoading === booking._id + '_approve' ? (
                <ActivityIndicator size="small" color={COLORS.white} />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={18} color={COLORS.white} />
                  <Text style={styles.actionBtnText}>Approve</Text>
                </>
              )}
            </Pressable>
            <Pressable
              style={[styles.actionBtn, styles.rejectBtn]}
              onPress={() => handleReject(booking._id)}
              disabled={!!actionLoading}
            >
              {actionLoading === booking._id + '_reject' ? (
                <ActivityIndicator size="small" color={COLORS.white} />
              ) : (
                <>
                  <Ionicons name="close-circle" size={18} color={COLORS.white} />
                  <Text style={styles.actionBtnText}>Reject</Text>
                </>
              )}
            </Pressable>
          </View>
        )}

        {/* Invoice link if approved */}
        {booking.status === 'Approved' && booking.invoicePdfPath && (
          <View style={styles.detailRow}>
            <Ionicons name="document-text" size={14} color={COLORS.primary} />
            <Text style={[styles.detailText, { color: COLORS.primary }]}>Invoice PDF generated ✓</Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Pending Bookings</Text>
        <Pressable onPress={logout}>
          <Ionicons name="log-out" size={24} color={COLORS.error} />
        </Pressable>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 60 }} />
      ) : (
        <ScrollView contentContainerStyle={styles.list} refreshControl={undefined}>
          {bookings.length === 0 ? (
            <Text style={{ textAlign: 'center', marginTop: 60, color: COLORS.textMuted }}>No bookings yet.</Text>
          ) : (
            bookings.map(renderBooking)
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { padding: 20, backgroundColor: COLORS.white, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', ...SHADOWS.floating },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: COLORS.primary },
  list: { padding: 16 },
  bookingCard: { backgroundColor: COLORS.white, borderRadius: 16, padding: 16, marginBottom: 16, ...SHADOWS.floating },
  cardHeader: { flexDirection: 'row', marginBottom: 12 },
  carThumb: { width: 70, height: 70, borderRadius: 10, marginRight: 12 },
  cardHeaderInfo: { flex: 1, justifyContent: 'center' },
  carName: { fontSize: 16, fontWeight: '700', color: COLORS.textDark },
  licensePlate: { fontSize: 12, color: COLORS.textMuted, marginBottom: 6 },
  statusBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 },
  statusText: { color: COLORS.white, fontSize: 11, fontWeight: '700' },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  detailText: { fontSize: 13, color: COLORS.textMuted, flex: 1 },
  slipContainer: { marginTop: 10, marginBottom: 4 },
  slipLabel: { fontSize: 12, fontWeight: '600', color: COLORS.textDark, marginBottom: 6 },
  slipImage: { width: '100%', height: 160, borderRadius: 10, backgroundColor: '#F3F4F6' },
  actionRow: { flexDirection: 'row', gap: 12, marginTop: 14 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 10 },
  approveBtn: { backgroundColor: '#10B981' },
  rejectBtn: { backgroundColor: '#EF4444' },
  actionBtnText: { color: COLORS.white, fontWeight: '700', fontSize: 14 },
});

export default AdminBookingsScreen;
