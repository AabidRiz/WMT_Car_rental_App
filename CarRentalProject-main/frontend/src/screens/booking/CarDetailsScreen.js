import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, Pressable, ScrollView, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SHADOWS } from '../../theme/colors';
import AnimatedButton from '../../components/AnimatedButton';
import { API_URL } from '../../context/AuthContext';

const BASE_URL = API_URL.replace('/api', '');

const AGREEMENT_CLAUSES = [
  { title: '1. Driver Requirements & License', body: 'The Renter must be at least 21 years of age and possess a valid driver\'s license. By agreeing, you confirm that all provided identification documents are authentic and currently valid.' },
  { title: '2. Payment & Booking Confirmation', body: 'All bookings are subject to Admin approval. If choosing "Bank Transfer," the booking will remain in a Pending state until the uploaded Bank Slip is verified. If the payment is rejected, the booking will be canceled automatically.' },
  { title: '3. Fuel Policy (Return As Received)', body: 'The vehicle must be returned with the same fuel level as when it was picked up. Renters must log their fuel updates using the app\'s Fuel Tracker. Returning the vehicle with less fuel will result in additional penalty charges.' },
  { title: '4. Damage & SOS Emergency Protocol', body: 'In the event of an accident or breakdown, the Renter MUST immediately use the SOS Button in the app to notify the Admin and upload real-time photos of the damage. The Renter is liable for any damages not covered by standard insurance.' },
  { title: '5. Vehicle Usage & Restrictions', body: 'The vehicle must not be used for illegal activities, racing, or driving under the influence of alcohol or drugs. The Renter agrees not to sublease the vehicle to any third party.' },
  { title: '6. Cancellation & Refunds', body: 'Cancellations made 24 hours prior to the pickup time will receive a full refund. Cancellations made within 24 hours are subject to a one-day rental cancellation fee.' },
];

const CarDetailsScreen = ({ route, navigation }) => {
  const { car } = route.params;
  const [days, setDays] = useState(3);
  const [agreementVisible, setAgreementVisible] = useState(false);
  const [imageModalVisible, setImageModalVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [agreed, setAgreed] = useState(false);
  const basePrice = car.pricePerDay * days;

  const getImageUrl = () => {
    if (car.images && car.images.length > 0) return `${BASE_URL}/${car.images[0]}`;
    return car.imageUrl || null;
  };

  const handleBookNow = () => {
    if (!car.isAvailable) return;
    setAgreementVisible(true);
  };

  const handleAgreeAndProceed = () => {
    if (!agreed) return;
    setAgreementVisible(false);
    navigation.navigate('Booking', { car, days, basePrice });
  };

  return (
    <View style={styles.container}>
      <ScrollView bounces={false} contentContainerStyle={{ paddingBottom: 120 }}>
        <View style={styles.imageContainer}>
          {car.images && car.images.length > 0 ? (
            <ScrollView 
              horizontal 
              pagingEnabled 
              showsHorizontalScrollIndicator={false}
              style={styles.imageScroll}
            >
              {car.images.map((img, idx) => (
                <Pressable key={idx} style={styles.imagePressable} onPress={() => { setSelectedImage(`${BASE_URL}/${img}`); setImageModalVisible(true); }}>
                  <Image source={{ uri: `${BASE_URL}/${img}` }} style={styles.image} />
                </Pressable>
              ))}
            </ScrollView>
          ) : car.imageUrl ? (
            <Pressable style={styles.imagePressable} onPress={() => { setSelectedImage(car.imageUrl); setImageModalVisible(true); }}>
              <Image source={{ uri: car.imageUrl }} style={styles.image} />
            </Pressable>
          ) : (
            <View style={[styles.image, { backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' }]}>
              <Ionicons name="car" size={80} color={COLORS.white} />
            </View>
          )}

          {/* Pagination Indicators if more than 1 image */}
          {car.images && car.images.length > 1 && (
            <View style={styles.paginationDots}>
              {car.images.map((_, i) => (
                <View key={i} style={styles.dot} />
              ))}
            </View>
          )}

          <SafeAreaView style={styles.overlayHeader} pointerEvents="box-none">
            <Pressable style={styles.backButton} onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={24} color={COLORS.textDark} />
            </Pressable>
            {/* Availability Badge */}
            <View style={[styles.badge, { backgroundColor: car.isAvailable ? '#10B981' : '#EF4444' }]}>
              <Text style={styles.badgeText}>{car.isAvailable ? '✓ Available' : '✗ Unavailable'}</Text>
            </View>
          </SafeAreaView>
        </View>

        <View style={styles.detailsContainer}>
          <Text style={styles.name}>{car.brand} {car.name}</Text>
          <Text style={styles.brand}>{car.brand} • {car.year}</Text>

          <View style={styles.specRow}>
            <View style={styles.specBox}>
              <Ionicons name="people" size={20} color={COLORS.primary} />
              <Text style={styles.specText}>{car.seats || 5} Seats</Text>
            </View>
            <View style={styles.specBox}>
              <Ionicons name="git-branch" size={20} color={COLORS.primary} />
              <Text style={styles.specText}>{car.transmission || 'Auto'}</Text>
            </View>
            <View style={styles.specBox}>
              <Ionicons name="flame" size={20} color={COLORS.primary} />
              <Text style={styles.specText}>{car.fuelType || 'Petrol'}</Text>
            </View>
          </View>

          <View style={styles.specsCard}>
            <View style={styles.specMetric}>
              <Text style={styles.metricValue}>{car.kmPerLiter}</Text>
              <Text style={styles.metricLabel}>km/L</Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.specMetric}>
              <Text style={styles.metricValue}>{car.tankCapacity}L</Text>
              <Text style={styles.metricLabel}>Tank</Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.specMetric}>
              <Text style={styles.metricValue}>LKR {car.pricePerDay}</Text>
              <Text style={styles.metricLabel}>Per Day</Text>
            </View>
          </View>

          {car.description ? (
            <Text style={styles.description}>{car.description}</Text>
          ) : (
            <Text style={styles.description}>
              Experience comfort and reliability in the {car.brand} {car.name}. Perfect for your road trips across Sri Lanka.
            </Text>
          )}

          <View style={styles.durationCard}>
            <Text style={styles.durationTitle}>Rental Duration</Text>
            <View style={styles.counterRow}>
              <Pressable style={styles.counterBtn} onPress={() => setDays(Math.max(1, days - 1))}>
                <Ionicons name="remove" size={24} color={COLORS.white} />
              </Pressable>
              <Text style={styles.counterValue}>{days} Days</Text>
              <Pressable style={styles.counterBtn} onPress={() => setDays(days + 1)}>
                <Ionicons name="add" size={24} color={COLORS.white} />
              </Pressable>
            </View>
          </View>
        </View>
      </ScrollView>

      <View style={styles.bottomBar}>
        <View>
          <Text style={styles.totalLabel}>Total Price</Text>
          <Text style={styles.totalPrice}>LKR {basePrice.toLocaleString()}</Text>
        </View>
        <AnimatedButton
          title={car.isAvailable ? 'Book Now' : 'Unavailable'}
          style={[styles.bookBtn, !car.isAvailable && { backgroundColor: '#9CA3AF' }]}
          onPress={handleBookNow}
        />
      </View>

      {/* USER AGREEMENT MODAL */}
      <Modal visible={agreementVisible} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Rental Agreement</Text>
            <Pressable onPress={() => setAgreementVisible(false)}>
              <Ionicons name="close" size={28} color={COLORS.textDark} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 120 }}>
            <Text style={styles.agreementIntro}>
              Please read and agree to the following terms before confirming your booking with DriveMate.
            </Text>
            {AGREEMENT_CLAUSES.map((clause, idx) => (
              <View key={idx} style={styles.clauseCard}>
                <Text style={styles.clauseTitle}>{clause.title}</Text>
                <Text style={styles.clauseBody}>{clause.body}</Text>
              </View>
            ))}
          </ScrollView>
          <View style={styles.agreementFooter}>
            <Pressable style={styles.checkRow} onPress={() => setAgreed(!agreed)}>
              <View style={[styles.checkbox, agreed && styles.checkboxChecked]}>
                {agreed && <Ionicons name="checkmark" size={16} color={COLORS.white} />}
              </View>
              <Text style={styles.checkLabel}>I have read and agree to all the above terms and conditions.</Text>
            </Pressable>
            <AnimatedButton
              title="Agree & Continue to Booking"
              onPress={handleAgreeAndProceed}
              style={{ opacity: agreed ? 1 : 0.4 }}
            />
          </View>
        </SafeAreaView>
      </Modal>

      {/* FULL SCREEN IMAGE PREVIEW */}
      <Modal visible={imageModalVisible} transparent animationType="fade">
        <View style={styles.fullImageOverlay}>
          <Pressable style={styles.closeImageBtn} onPress={() => setImageModalVisible(false)}>
            <Ionicons name="close-circle" size={44} color={COLORS.white} />
          </Pressable>
          {selectedImage && (
            <Image 
              source={{ uri: selectedImage }} 
              style={styles.fullImage} 
              resizeMode="contain" 
            />
          )}
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  imageContainer: { height: 320, position: 'relative' },
  image: { width: '100%', height: '100%', resizeMode: 'cover' },
  overlayHeader: { position: 'absolute', top: 0, left: 0, right: 0, paddingHorizontal: 20, paddingTop: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  backButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.9)', justifyContent: 'center', alignItems: 'center', ...SHADOWS.floating },
  badge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  badgeText: { color: COLORS.white, fontWeight: '700', fontSize: 12 },
  detailsContainer: { backgroundColor: COLORS.background, borderTopLeftRadius: 30, borderTopRightRadius: 30, marginTop: -30, padding: 24 },
  name: { fontSize: 28, fontWeight: '800', color: COLORS.textDark },
  brand: { fontSize: 16, color: COLORS.textMuted, marginTop: 4, marginBottom: 20 },
  specRow: { flexDirection: 'row', marginBottom: 20, flexWrap: 'wrap', gap: 8 },
  specBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, ...SHADOWS.floating },
  specText: { marginLeft: 8, fontSize: 14, color: COLORS.textDark, fontWeight: '600' },
  specsCard: { backgroundColor: COLORS.primary, borderRadius: 16, padding: 20, flexDirection: 'row', justifyContent: 'space-around', marginBottom: 20 },
  specMetric: { alignItems: 'center' },
  metricValue: { fontSize: 17, fontWeight: '800', color: COLORS.white },
  metricLabel: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 4 },
  metricDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.3)' },
  description: { fontSize: 15, color: COLORS.textMuted, lineHeight: 24, marginBottom: 24 },
  durationCard: { backgroundColor: COLORS.white, padding: 20, borderRadius: 16, ...SHADOWS.floating },
  durationTitle: { fontSize: 16, fontWeight: '700', color: COLORS.textDark, marginBottom: 16 },
  counterRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  counterBtn: { backgroundColor: COLORS.primary, width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  counterValue: { fontSize: 20, fontWeight: '700', color: COLORS.textDark },
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: COLORS.white, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 16, paddingBottom: 32, ...SHADOWS.heavy },
  totalLabel: { fontSize: 14, color: COLORS.textMuted },
  totalPrice: { fontSize: 24, fontWeight: '800', color: COLORS.primary },
  bookBtn: { width: 160, marginVertical: 0 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: COLORS.textDark },
  agreementIntro: { fontSize: 14, color: COLORS.textMuted, lineHeight: 22, marginBottom: 20 },
  clauseCard: { backgroundColor: COLORS.white, borderRadius: 12, padding: 16, marginBottom: 12, ...SHADOWS.floating },
  clauseTitle: { fontSize: 14, fontWeight: '700', color: COLORS.primary, marginBottom: 8 },
  clauseBody: { fontSize: 13, color: COLORS.textMuted, lineHeight: 20 },
  agreementFooter: { padding: 20, backgroundColor: COLORS.white, borderTopWidth: 1, borderTopColor: '#E5E7EB' },
  checkRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16 },
  checkbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', marginRight: 12, marginTop: 2 },
  checkboxChecked: { backgroundColor: COLORS.primary },
  checkLabel: { flex: 1, fontSize: 13, color: COLORS.textDark, lineHeight: 20 },
  imageScroll: { width: '100%', height: '100%' },
  imagePressable: { width: 393, height: 320 }, // Assuming standard width, pagingEnabled will handle it
  paginationDots: { position: 'absolute', bottom: 40, flexDirection: 'row', alignSelf: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.5)' },
  fullImageOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center' },
  closeImageBtn: { position: 'absolute', top: 60, right: 20, zIndex: 10 },
  fullImage: { width: '100%', height: '80%' },
});

export default CarDetailsScreen;
