import React, { useState, useEffect, useContext } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Image,
  ActivityIndicator, Alert, Modal, TextInput, Platform, RefreshControl, Linking
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { COLORS, SHADOWS } from '../../theme/colors';
import { AuthContext, API_URL } from '../../context/AuthContext';
import AnimatedButton from '../../components/AnimatedButton';

const BASE_URL = API_URL.replace('/api', '');

const STATUS_COLORS = {
  Pending:   { bg: '#FEF3C7', text: '#D97706' },
  Approved:  { bg: '#D1FAE5', text: '#065F46' },
  Cancelled: { bg: '#FEE2E2', text: '#991B1B' },
  Active:    { bg: '#DBEAFE', text: '#1E40AF' },
  Completed: { bg: '#F3F4F6', text: '#374151' },
};

const MyBookingsScreen = ({ navigation }) => {
  const { user } = useContext(AuthContext);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);

  const downloadPDF = async (pdfPath) => {
    const url = `${BASE_URL}/${pdfPath}`;
    try {
      await Linking.openURL(url);
    } catch (e) {
      if (Platform.OS === 'web') window.alert('Could not open PDF.');
      else Alert.alert('Error', 'Could not open the PDF.');
    }
  };

  // Edit modal state
  const [editModal, setEditModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [editDays, setEditDays] = useState('');

  useEffect(() => { fetchBookings(); }, []);

  const fetchBookings = async () => {
    try {
      const res = await axios.get(`${API_URL}/bookings/my`);
      if (res.data.success) setBookings(res.data.data);
    } catch (e) {
      console.log('Failed to fetch bookings:', e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => { setRefreshing(true); fetchBookings(); };

  // -------------------------------------------------------
  // Cancel Logic — only on Approved bookings
  // Check 24hr cancellation fee rule
  // -------------------------------------------------------
  const handleCancel = (booking) => {
    const startDate = new Date(booking.startDate);
    const now = new Date();
    const hoursUntilPickup = (startDate - now) / (1000 * 60 * 60);

    const isSameDayCancel = hoursUntilPickup < 24;
    const fee = booking.car?.pricePerDay || 0; // 1-day fee
    const refund = isSameDayCancel ? booking.totalPrice - fee : booking.totalPrice;

    const message = isSameDayCancel
      ? `⚠️ Cancellation within 24 hours of pickup.\n\nCancellation Fee: LKR ${fee.toLocaleString()} (1 day rental)\nYou will be refunded: LKR ${refund.toLocaleString()}\n\nDo you want to proceed?`
      : `You will receive a full refund of LKR ${refund.toLocaleString()}.\n\nAre you sure you want to cancel this booking?`;

    if (Platform.OS === 'web') {
      if (window.confirm(message)) confirmCancel(booking._id);
    } else {
      Alert.alert(
        isSameDayCancel ? 'Cancellation Fee Applies' : 'Cancel Booking',
        message,
        [
          { text: 'Keep Booking', style: 'cancel' },
          { text: 'Cancel Booking', style: 'destructive', onPress: () => confirmCancel(booking._id) },
        ]
      );
    }
  };

  const confirmCancel = async (bookingId) => {
    setActionLoading(bookingId + '_cancel');
    try {
      await axios.put(`${API_URL}/bookings/${bookingId}/cancel`);
      fetchBookings();
    } catch (e) {
      const msg = e.response?.data?.message || 'Failed to cancel.';
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert('Error', msg);
    } finally {
      setActionLoading(null);
    }
  };

  // -------------------------------------------------------
  // Edit Logic — change number of days → goes back to Pending
  // -------------------------------------------------------
  const openEdit = (booking) => {
    setSelectedBooking(booking);
    setEditDays(String(booking.totalDays || 1));
    setEditModal(true);
  };

  const confirmEdit = async () => {
    if (!editDays || parseInt(editDays) < 1) {
      if (Platform.OS === 'web') return window.alert('Please enter at least 1 day.');
      return Alert.alert('Error', 'Please enter at least 1 day.');
    }
    setActionLoading(selectedBooking._id + '_edit');
    try {
      const newEndDate = new Date(selectedBooking.startDate);
      newEndDate.setDate(newEndDate.getDate() + parseInt(editDays));

      await axios.put(`${API_URL}/bookings/${selectedBooking._id}/edit`, {
        endDate: newEndDate.toISOString(),
        days: parseInt(editDays),
      });

      setEditModal(false);
      fetchBookings();

      if (Platform.OS === 'web') window.alert('Booking updated. It has been sent back for Admin approval.');
      else Alert.alert('Updated!', 'Your booking dates have been updated and sent for Admin re-approval.');
    } catch (e) {
      const msg = e.response?.data?.message || 'Failed to update booking.';
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert('Error', msg);
    } finally {
      setActionLoading(null);
    }
  };

  const renderBooking = (booking) => {
    const car = booking.car;
    const isApproved = booking.status === 'Approved';
    const isPending = booking.status === 'Pending';
    const isCancelled = booking.status === 'Cancelled';
    const statusStyle = STATUS_COLORS[booking.status] || STATUS_COLORS.Completed;
    const startDate = new Date(booking.startDate);
    const endDate = new Date(booking.endDate);

    // 24hr check for cancellation warning label
    const now = new Date();
    const hoursUntilPickup = (startDate - now) / (1000 * 60 * 60);
    const within24hrs = isApproved && hoursUntilPickup < 24 && hoursUntilPickup > 0;

    return (
      <View key={booking._id} style={styles.card}>
        {/* Car image + info */}
        <View style={styles.cardTop}>
          {car?.images?.length > 0 ? (
            <Image source={{ uri: `${BASE_URL}/${car.images[0]}` }} style={styles.carThumb} />
          ) : (
            <View style={[styles.carThumb, styles.thumbPlaceholder]}>
              <Ionicons name="car" size={28} color={COLORS.white} />
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={styles.carName}>{car?.brand} {car?.name}</Text>
            <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
              <Text style={[styles.statusText, { color: statusStyle.text }]}>{booking.status}</Text>
            </View>
          </View>
        </View>

        {/* Booking info */}
        <View style={styles.infoBlock}>
          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={14} color={COLORS.textMuted} />
            <Text style={styles.infoText}>
              {startDate.toLocaleDateString()} → {endDate.toLocaleDateString()} ({booking.totalDays} days)
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="cash-outline" size={14} color={COLORS.textMuted} />
            <Text style={styles.infoText}>
              LKR {booking.totalPrice?.toLocaleString()} via {booking.paymentMethod}
            </Text>
          </View>
          {booking.adminNote ? (
            <View style={styles.infoRow}>
              <Ionicons name="information-circle-outline" size={14} color="#D97706" />
              <Text style={[styles.infoText, { color: '#D97706' }]}>Admin: {booking.adminNote}</Text>
            </View>
          ) : null}
        </View>

        {/* 24hr warning */}
        {within24hrs && (
          <View style={styles.warningBanner}>
            <Ionicons name="warning" size={14} color="#D97706" />
            <Text style={styles.warningText}>
              Pickup in less than 24 hrs — cancellation fee applies (LKR {car?.pricePerDay?.toLocaleString()})
            </Text>
          </View>
        )}

        {/* Status messages */}
        {isPending && (
          <View style={styles.infoBanner}>
            <Ionicons name="time" size={14} color={COLORS.primary} />
            <Text style={styles.infoBannerText}>Awaiting admin approval. No changes allowed yet.</Text>
          </View>
        )}
        {isCancelled && (
          <View style={[styles.infoBanner, { backgroundColor: '#FEE2E2' }]}>
            <Ionicons name="close-circle" size={14} color="#EF4444" />
            <Text style={[styles.infoBannerText, { color: '#991B1B' }]}>This booking has been cancelled.</Text>
          </View>
        )}

        {/* Invoice PDF available */}
        {isApproved && booking.invoicePdfPath && (
          <Pressable
            style={styles.pdfBtn}
            onPress={() => downloadPDF(booking.invoicePdfPath)}
          >
            <Ionicons name="document-text" size={16} color={COLORS.white} />
            <Text style={styles.pdfBtnText}>Download Invoice PDF</Text>
          </Pressable>
        )}

        {/* Actions — ONLY on Approved */}
        {isApproved && (
          <View style={styles.actionRow}>
            <Pressable
              style={[styles.actionBtn, styles.editBtn, actionLoading && { opacity: 0.5 }]}
              onPress={() => openEdit(booking)}
              disabled={!!actionLoading}
            >
              {actionLoading === booking._id + '_edit' ? (
                <ActivityIndicator size="small" color={COLORS.primary} />
              ) : (
                <>
                  <Ionicons name="pencil" size={16} color={COLORS.primary} />
                  <Text style={styles.editBtnText}>Edit Dates</Text>
                </>
              )}
            </Pressable>
            <Pressable
              style={[styles.actionBtn, styles.cancelBtn, actionLoading && { opacity: 0.5 }]}
              onPress={() => handleCancel(booking)}
              disabled={!!actionLoading}
            >
              {actionLoading === booking._id + '_cancel' ? (
                <ActivityIndicator size="small" color="#EF4444" />
              ) : (
                <>
                  <Ionicons name="close-circle" size={16} color="#EF4444" />
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </>
              )}
            </Pressable>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Bookings</Text>
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

      {loading ? (
        <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 80 }} />
      ) : (
        <ScrollView
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
        >
          {bookings.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="receipt-outline" size={64} color="#D1D5DB" />
              <Text style={styles.emptyTitle}>No Bookings Yet</Text>
              <Text style={styles.emptySubtitle}>Your booking history will appear here after you book a car.</Text>
            </View>
          ) : (
            bookings.map(renderBooking)
          )}
        </ScrollView>
      )}

      {/* EDIT DATES MODAL */}
      <Modal visible={editModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Edit Booking</Text>
            <Text style={styles.modalSubtitle}>
              Changing your dates will send the booking back to Admin for re-approval.
            </Text>
            <Text style={styles.inputLabel}>New number of rental days</Text>
            <TextInput
              style={styles.input}
              value={editDays}
              onChangeText={setEditDays}
              keyboardType="numeric"
              placeholder="e.g. 5"
            />
            {selectedBooking && (
              <Text style={styles.newPricePreview}>
                New estimated total: LKR {((selectedBooking.car?.pricePerDay || 0) * parseInt(editDays || 0)).toLocaleString()}
              </Text>
            )}
            <View style={styles.modalActions}>
              <Pressable style={styles.modalCancelBtn} onPress={() => setEditModal(false)}>
                <Text style={styles.modalCancelText}>Discard</Text>
              </Pressable>
              <Pressable style={styles.modalConfirmBtn} onPress={confirmEdit}>
                {actionLoading?.includes('_edit') ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <Text style={styles.modalConfirmText}>Save & Resubmit</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, backgroundColor: COLORS.white, ...SHADOWS.floating },
  headerTitle: { fontSize: 22, fontWeight: '800', color: COLORS.primary },
  profileAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.accent, justifyContent: 'center', alignItems: 'center', ...SHADOWS.floating },
  avatarText: { color: COLORS.white, fontWeight: '700', fontSize: 16 },
  list: { padding: 16, paddingBottom: 40 },
  card: { backgroundColor: COLORS.white, borderRadius: 16, marginBottom: 16, overflow: 'hidden', ...SHADOWS.floating },
  cardTop: { flexDirection: 'row', padding: 16, gap: 12 },
  carThumb: { width: 72, height: 72, borderRadius: 12 },
  thumbPlaceholder: { backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
  carName: { fontSize: 16, fontWeight: '700', color: COLORS.textDark, marginBottom: 8 },
  statusBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12 },
  statusText: { fontSize: 12, fontWeight: '700' },
  infoBlock: { paddingHorizontal: 16, paddingBottom: 12 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 5 },
  infoText: { fontSize: 13, color: COLORS.textMuted, flex: 1 },
  warningBanner: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FEF3C7', paddingHorizontal: 16, paddingVertical: 10 },
  warningText: { fontSize: 12, color: '#92400E', flex: 1, fontWeight: '600' },
  infoBanner: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#EFF6FF', paddingHorizontal: 16, paddingVertical: 10 },
  infoBannerText: { fontSize: 12, color: COLORS.primary, flex: 1 },
  actionRow: { flexDirection: 'row', gap: 12, padding: 16, paddingTop: 8 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 10 },
  editBtn: { backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: COLORS.primary },
  editBtnText: { color: COLORS.primary, fontWeight: '700', fontSize: 14 },
  cancelBtn: { backgroundColor: '#FEE2E2', borderWidth: 1, borderColor: '#EF4444' },
  cancelBtnText: { color: '#EF4444', fontWeight: '700', fontSize: 14 },
  pdfBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#065F46', margin: 16, marginTop: 4, padding: 12, borderRadius: 10, justifyContent: 'center' },
  pdfBtnText: { color: COLORS.white, fontWeight: '700', fontSize: 14 },
  emptyState: { alignItems: 'center', paddingTop: 80 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: COLORS.textDark, marginTop: 16 },
  emptySubtitle: { fontSize: 14, color: COLORS.textMuted, textAlign: 'center', marginTop: 8, paddingHorizontal: 32 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalBox: { backgroundColor: COLORS.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 28, paddingBottom: 40 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: COLORS.textDark, marginBottom: 8 },
  modalSubtitle: { fontSize: 13, color: COLORS.textMuted, lineHeight: 20, marginBottom: 20 },
  inputLabel: { fontSize: 12, fontWeight: '600', color: COLORS.textMuted, marginBottom: 8, textTransform: 'uppercase' },
  input: { backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, padding: 14, fontSize: 18, color: COLORS.textDark, marginBottom: 8, textAlign: 'center' },
  newPricePreview: { fontSize: 14, color: COLORS.primary, fontWeight: '700', textAlign: 'center', marginBottom: 20 },
  modalActions: { flexDirection: 'row', gap: 12 },
  modalCancelBtn: { flex: 1, padding: 14, borderRadius: 10, borderWidth: 1, borderColor: '#E5E7EB', alignItems: 'center' },
  modalCancelText: { color: COLORS.textMuted, fontWeight: '600' },
  modalConfirmBtn: { flex: 1, padding: 14, borderRadius: 10, backgroundColor: COLORS.primary, alignItems: 'center' },
  modalConfirmText: { color: COLORS.white, fontWeight: '700' },
});

export default MyBookingsScreen;
