import React, { useState, useContext } from 'react';
import { View, Text, StyleSheet, Image, Pressable, ScrollView, TextInput, Alert, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import axios from 'axios';
import { COLORS, SHADOWS } from '../../theme/colors';
import AnimatedButton from '../../components/AnimatedButton';
import { AuthContext, API_URL } from '../../context/AuthContext';

const BookingScreen = ({ route, navigation }) => {
  const { car, days, basePrice } = route.params;
  const { user } = useContext(AuthContext);

  const [paymentMethod, setPaymentMethod] = useState('BankTransfer');
  const [receiptImage, setReceiptImage] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Card form state
  const [cardNumber, setCardNumber] = useState('');
  const [cardName, setCardName] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCVV, setCardCVV] = useState('');

  const startDate = new Date();
  const endDate = new Date();
  endDate.setDate(startDate.getDate() + days);

  const pickReceipt = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (!result.canceled) setReceiptImage(result.assets[0].uri);
  };

  const formatCardNumber = (text) => {
    const cleaned = text.replace(/\D/g, '').slice(0, 16);
    return cleaned.replace(/(.{4})/g, '$1 ').trim();
  };

  const formatExpiry = (text) => {
    const cleaned = text.replace(/\D/g, '').slice(0, 4);
    if (cleaned.length >= 2) return cleaned.slice(0, 2) + '/' + cleaned.slice(2);
    return cleaned;
  };

  const confirmBooking = async () => {
    setError('');

    if (paymentMethod === 'BankTransfer' && !receiptImage) {
      return setError('Please upload your bank transfer slip to confirm.');
    }

    if (paymentMethod === 'Card') {
      if (!cardNumber || !cardName || !cardExpiry || !cardCVV) {
        return setError('Please fill in all card details.');
      }
      if (cardNumber.replace(/\s/g, '').length < 16) return setError('Please enter a valid 16-digit card number.');
      if (cardCVV.length < 3) return setError('CVV must be 3 digits.');
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('carId', car._id);
      formData.append('startDate', startDate.toISOString());
      formData.append('endDate', endDate.toISOString());
      formData.append('paymentMethod', paymentMethod);

      if (receiptImage && paymentMethod === 'BankTransfer') {
        if (Platform.OS === 'web') {
          const res = await fetch(receiptImage);
          const blob = await res.blob();
          formData.append('receipt', blob, `receipt-${Date.now()}.jpg`);
        } else {
          formData.append('receipt', {
            uri: receiptImage,
            type: 'image/jpeg',
            name: `receipt-${Date.now()}.jpg`,
          });
        }
      }

      await axios.post(`${API_URL}/bookings`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      navigation.replace('BookingSuccess');

    } catch (e) {
      setError(e.response?.data?.message || 'Booking failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textDark} />
        </Pressable>
        <Text style={styles.headerTitle}>Confirm Booking</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Trip Summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Trip Summary</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Vehicle:</Text>
            <Text style={styles.summaryValue}>{car.brand} {car.name}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Duration:</Text>
            <Text style={styles.summaryValue}>{days} Days</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Pick-up:</Text>
            <Text style={styles.summaryValue}>{startDate.toLocaleDateString()}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Return:</Text>
            <Text style={styles.summaryValue}>{endDate.toLocaleDateString()}</Text>
          </View>
          <View style={[styles.summaryRow, { borderBottomWidth: 0, marginTop: 10 }]}>
            <Text style={[styles.summaryLabel, { color: COLORS.white, fontWeight: '700' }]}>Total (LKR):</Text>
            <Text style={styles.totalPrice}>LKR {basePrice.toLocaleString()}</Text>
          </View>
        </View>

        {/* Payment Method Selector */}
        <Text style={styles.sectionTitle}>Payment Method</Text>
        <View style={styles.paymentRow}>
          <Pressable
            style={[styles.paymentOption, paymentMethod === 'BankTransfer' && styles.paymentOptionActive]}
            onPress={() => setPaymentMethod('BankTransfer')}
          >
            <Ionicons name="business" size={22} color={paymentMethod === 'BankTransfer' ? COLORS.white : COLORS.primary} />
            <Text style={[styles.paymentLabel, paymentMethod === 'BankTransfer' && { color: COLORS.white }]}>Bank Transfer</Text>
          </Pressable>
          <Pressable
            style={[styles.paymentOption, paymentMethod === 'Card' && styles.paymentOptionActive]}
            onPress={() => setPaymentMethod('Card')}
          >
            <Ionicons name="card" size={22} color={paymentMethod === 'Card' ? COLORS.white : COLORS.primary} />
            <Text style={[styles.paymentLabel, paymentMethod === 'Card' && { color: COLORS.white }]}>Pay by Card</Text>
          </Pressable>
        </View>

        {/* === BANK TRANSFER === */}
        {paymentMethod === 'BankTransfer' && (
          <>
            <Text style={styles.instruction}>
              Transfer LKR {basePrice.toLocaleString()} to DriveMate Bank Account and upload your slip below.
            </Text>
            <Pressable style={styles.uploadArea} onPress={pickReceipt}>
              {receiptImage ? (
                <Image source={{ uri: receiptImage }} style={styles.receiptPreview} />
              ) : (
                <View style={styles.uploadPlaceholder}>
                  <Ionicons name="cloud-upload" size={40} color={COLORS.primary} />
                  <Text style={styles.uploadText}>Tap to upload Bank Slip</Text>
                </View>
              )}
            </Pressable>
          </>
        )}

        {/* === CARD PAYMENT FORM === */}
        {paymentMethod === 'Card' && (
          <View style={styles.cardForm}>
            <Text style={styles.cardFormTitle}>Card Details</Text>

            <Text style={styles.inputLabel}>Cardholder Name</Text>
            <TextInput
              style={styles.input}
              placeholder="Name on card"
              value={cardName}
              onChangeText={setCardName}
              autoCapitalize="words"
            />

            <Text style={styles.inputLabel}>Card Number</Text>
            <View style={styles.inputWithIcon}>
              <Ionicons name="card-outline" size={20} color={COLORS.textMuted} style={{ marginRight: 8 }} />
              <TextInput
                style={[styles.input, { flex: 1, borderWidth: 0, padding: 0 }]}
                placeholder="1234 5678 9012 3456"
                value={cardNumber}
                onChangeText={(t) => setCardNumber(formatCardNumber(t))}
                keyboardType="numeric"
                maxLength={19}
              />
            </View>

            <View style={styles.cardRow}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={styles.inputLabel}>Expiry Date</Text>
                <TextInput
                  style={styles.input}
                  placeholder="MM/YY"
                  value={cardExpiry}
                  onChangeText={(t) => setCardExpiry(formatExpiry(t))}
                  keyboardType="numeric"
                  maxLength={5}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>CVV</Text>
                <TextInput
                  style={styles.input}
                  placeholder="123"
                  value={cardCVV}
                  onChangeText={(t) => setCardCVV(t.replace(/\D/g, '').slice(0, 3))}
                  keyboardType="numeric"
                  secureTextEntry
                  maxLength={3}
                />
              </View>
            </View>

            <View style={styles.secureNote}>
              <Ionicons name="lock-closed" size={14} color="#10B981" />
              <Text style={styles.secureText}>Your card details are encrypted and secure</Text>
            </View>
          </View>
        )}

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <AnimatedButton
          title={isSubmitting ? 'Submitting...' : 'Confirm Booking'}
          onPress={confirmBooking}
          style={{ marginTop: 24 }}
        />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', padding: 20 },
  backButton: { marginRight: 16 },
  headerTitle: { fontSize: 22, fontWeight: '700', color: COLORS.textDark },
  scroll: { padding: 20, paddingBottom: 60 },
  summaryCard: { backgroundColor: COLORS.primary, borderRadius: 16, padding: 24, marginBottom: 24, ...SHADOWS.floating },
  summaryTitle: { fontSize: 18, fontWeight: '700', color: COLORS.white, marginBottom: 16 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.2)' },
  summaryLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 14 },
  summaryValue: { color: COLORS.white, fontSize: 14, fontWeight: '600' },
  totalPrice: { color: COLORS.accent, fontSize: 20, fontWeight: '800' },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: COLORS.textDark, marginBottom: 12 },
  paymentRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  paymentOption: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 14, borderRadius: 12, borderWidth: 2, borderColor: COLORS.primary, backgroundColor: COLORS.white, gap: 8 },
  paymentOptionActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  paymentLabel: { fontSize: 13, fontWeight: '600', color: COLORS.primary },
  instruction: { fontSize: 14, color: COLORS.textMuted, lineHeight: 22, marginBottom: 16 },
  uploadArea: { width: '100%', height: 180, backgroundColor: COLORS.white, borderRadius: 16, borderWidth: 2, borderColor: '#E5E7EB', borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', overflow: 'hidden', marginBottom: 8 },
  uploadPlaceholder: { alignItems: 'center' },
  uploadText: { marginTop: 8, color: COLORS.primary, fontWeight: '600' },
  receiptPreview: { width: '100%', height: '100%', resizeMode: 'cover' },
  cardForm: { backgroundColor: COLORS.white, borderRadius: 16, padding: 20, ...SHADOWS.floating },
  cardFormTitle: { fontSize: 16, fontWeight: '700', color: COLORS.textDark, marginBottom: 16 },
  inputLabel: { fontSize: 12, fontWeight: '600', color: COLORS.textMuted, marginBottom: 6, textTransform: 'uppercase' },
  input: { backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, padding: 14, fontSize: 15, color: COLORS.textDark, marginBottom: 14 },
  inputWithIcon: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 14, marginBottom: 14 },
  cardRow: { flexDirection: 'row' },
  secureNote: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  secureText: { fontSize: 12, color: '#10B981' },
  errorText: { color: '#EF4444', textAlign: 'center', marginTop: 8, marginBottom: 4, fontWeight: '600' },
});

export default BookingScreen;
