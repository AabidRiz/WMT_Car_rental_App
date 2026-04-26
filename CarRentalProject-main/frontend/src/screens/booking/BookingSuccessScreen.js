import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../theme/colors';
import AnimatedButton from '../../components/AnimatedButton';
import Animated, { FadeInDown } from 'react-native-reanimated';

const BookingSuccessScreen = ({ navigation }) => {
  return (
    <SafeAreaView style={styles.container}>
      <Animated.View entering={FadeInDown.duration(600)} style={styles.content}>
        <View style={styles.iconCircle}>
          <Ionicons name="checkmark" size={60} color={COLORS.white} />
        </View>
        <Text style={styles.title}>Thank You!</Text>
        <Text style={styles.subtitle}>Your booking is currently being processed.</Text>
        <Text style={styles.description}>
          Our admin team is reviewing your payment. You will receive an email notification once your booking is approved or rejected.
        </Text>
        <View style={styles.infoCard}>
          <Ionicons name="time-outline" size={20} color={COLORS.primary} />
          <Text style={styles.infoText}>Approval usually takes a few minutes during business hours.</Text>
        </View>
        <AnimatedButton
          title="Back to Home"
          onPress={() => navigation.navigate('MainTabs')}
          style={{ marginTop: 24 }}
        />
      </Animated.View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, justifyContent: 'center' },
  content: { alignItems: 'center', padding: 32 },
  iconCircle: { width: 120, height: 120, borderRadius: 60, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', marginBottom: 32 },
  title: { fontSize: 36, fontWeight: '800', color: COLORS.textDark, marginBottom: 8 },
  subtitle: { fontSize: 18, color: COLORS.primary, fontWeight: '600', marginBottom: 16, textAlign: 'center' },
  description: { fontSize: 15, color: COLORS.textMuted, textAlign: 'center', lineHeight: 24, marginBottom: 24 },
  infoCard: { flexDirection: 'row', backgroundColor: COLORS.white, borderRadius: 12, padding: 16, gap: 10, alignItems: 'center', width: '100%' },
  infoText: { flex: 1, fontSize: 13, color: COLORS.textDark, lineHeight: 20 },
});

export default BookingSuccessScreen;
