import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { COLORS, SHADOWS } from '../../theme/colors';
import AnimatedButton from '../../components/AnimatedButton';

const CheckoutScreen = ({ navigation }) => {
  const [odoImage, setOdoImage] = useState(null);
  const [checkoutData, setCheckoutData] = useState(null);
  
  const pickOdo = async () => {
    let res = await ImagePicker.launchImageLibraryAsync({ quality: 0.8 });
    if (!res.canceled) setOdoImage(res.assets[0].uri);
  };

  const processAPI = () => {
    if (!odoImage) return Alert.alert('Missing Requirement', 'Please upload a photo of the dashboard odometer.');
    setTimeout(() => {
      setCheckoutData({ drivenKms: 350, limit: 300, overKms: 50, overCharge: 25, basePrice: 150, damagePenalty: 0, finalTotal: 175 });
    }, 1000);
  };

  const downloadInvoice = () => Alert.alert('Downloaded', 'Final PDF Bill saved to your device files.');

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton}><Ionicons name="arrow-back" size={24} color={COLORS.textDark} /></Pressable>
        <Text style={styles.headerTitle}>Return Vehicle</Text>
      </View>
      <ScrollView contentContainerStyle={styles.scroll}>
        {!checkoutData ? (
          <View>
            <Text style={styles.instruction}>Your trip is complete! Please upload a photo of the Dashboard Odometer so the Administrator can verify the final mileage.</Text>
            <Pressable style={styles.uploadArea} onPress={pickOdo}>
              {odoImage ? <Image source={{ uri: odoImage }} style={styles.preview} /> : <View style={{ alignItems: 'center' }}><Ionicons name="speedometer" size={40} color={COLORS.primary} /><Text style={{ marginTop: 8, color: COLORS.primary }}>Upload Odometer</Text></View>}
            </Pressable>
            <AnimatedButton title="Calculate Final Bill" onPress={processAPI} style={{ marginTop: 20 }} />
          </View>
        ) : (
          <View style={styles.receiptCard}>
            <View style={styles.receiptHeader}><Ionicons name="checkmark-circle" size={48} color={COLORS.success} /><Text style={styles.successTitle}>Checkout Complete</Text><Text style={styles.successSub}>Thank you for choosing DriveMate</Text></View>
            <View style={styles.divider} />
            <View style={styles.row}><Text style={styles.label}>Booking Base Price</Text><Text style={styles.value}>${checkoutData.basePrice}</Text></View>
            <View style={styles.row}><Text style={styles.label}>Distance Driven</Text><Text style={styles.value}>{checkoutData.drivenKms} km</Text></View>
            <View style={styles.row}><Text style={styles.label}>Over-Limit Penalty</Text><Text style={[styles.value, { color: COLORS.error }]}>+${checkoutData.overCharge}</Text></View>
            <View style={styles.row}><Text style={styles.label}>Damage Penalty</Text><Text style={styles.value}>${checkoutData.damagePenalty}</Text></View>
            <View style={styles.divider} />
            <View style={styles.row}><Text style={styles.grandTotalLabel}>Grand Total</Text><Text style={styles.grandTotal}>${checkoutData.finalTotal}</Text></View>
            <AnimatedButton title="Download PDF Invoice" onPress={downloadInvoice} style={{ marginTop: 32 }} />
            <AnimatedButton title="Back to Home" variant="outline" onPress={() => navigation.navigate('Home')} />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', padding: 20, backgroundColor: COLORS.white, ...SHADOWS.floating },
  headerTitle: { fontSize: 22, fontWeight: '700', color: COLORS.textDark, marginLeft: 16 },
  scroll: { padding: 20 },
  instruction: { fontSize: 16, color: COLORS.textMuted, lineHeight: 24, marginBottom: 24 },
  uploadArea: { height: 200, borderWidth: 2, borderColor: '#E5E7EB', borderStyle: 'dashed', borderRadius: 16, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.white, overflow: 'hidden' },
  preview: { width: '100%', height: '100%', resizeMode: 'cover' },
  receiptCard: { backgroundColor: COLORS.white, borderRadius: 16, padding: 24, ...SHADOWS.floating },
  receiptHeader: { alignItems: 'center', marginBottom: 20 },
  successTitle: { fontSize: 22, color: COLORS.success, fontWeight: '800', marginTop: 12 },
  successSub: { color: COLORS.textMuted, marginTop: 4 },
  divider: { height: 1, backgroundColor: COLORS.border, marginVertical: 16 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 },
  label: { fontSize: 14, color: COLORS.textMuted },
  value: { fontSize: 14, fontWeight: '600', color: COLORS.textDark },
  grandTotalLabel: { fontSize: 18, fontWeight: '700', color: COLORS.textDark },
  grandTotal: { fontSize: 24, fontWeight: '800', color: COLORS.primary }
});

export default CheckoutScreen;
