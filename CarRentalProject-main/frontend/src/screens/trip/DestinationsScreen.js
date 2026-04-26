import React, { useState, useEffect, useContext, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, Image,
  Pressable, ScrollView, Animated, PanResponder
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Reanimated, { FadeInUp, FadeInRight } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { COLORS, SHADOWS } from '../../theme/colors';
import { AuthContext, API_URL } from '../../context/AuthContext';
import AnimatedButton from '../../components/AnimatedButton';

const BASE_URL = API_URL.replace('/api', '');

const TRENDING = [
    { _id: 't1', name: 'Sigiriya Rock', location: 'Matale', image: 'https://images.unsplash.com/photo-1612862862126-865765df2ded?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8c2lnaXJpeWF8ZW58MHx8MHx8fDA%3D', rating: '4.9' },
    { _id: 't2', name: 'Galle Fort', location: 'Galle', image: 'https://images.unsplash.com/photo-1734279135096-2854a06faba8?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8M3x8Z2FsbGUlMjBmb3J0fGVufDB8fDB8fHww', rating: '4.8' },
    { _id: 't3', name: 'Nine Arches Bridge', location: 'Ella', image: 'https://images.unsplash.com/photo-1566766189268-ecac9118f2b7?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8bmluZSUyMGFyY2glMjBicmlkZ2V8ZW58MHx8MHx8fDA%3D', rating: '4.9' },
    { _id: 't4', name: 'Trincomalee Beach', location: 'Trincomalee', image: 'https://images.unsplash.com/photo-1640036293568-452ba4463fce?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTF8fHRyaW5jb21hbGVlfGVufDB8fDB8fHww', rating: '4.7' },
];

const DestinationsScreen = ({ navigation }) => {
  const { user } = useContext(AuthContext);
  const [activeBooking, setActiveBooking] = useState(null);
  
  const pan = useRef(new Animated.ValueXY()).current;
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (e, gestureState) => Math.abs(gestureState.dx) > 5 || Math.abs(gestureState.dy) > 5,
      onPanResponderGrant: () => {
        pan.setOffset({ x: pan.x._value, y: pan.y._value });
      },
      onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], { useNativeDriver: false }),
      onPanResponderRelease: () => {
        pan.flattenOffset();
      }
    })
  ).current;

  useEffect(() => {
    fetchActiveBooking();
  }, []);

  const fetchActiveBooking = async () => {
    try {
        const res = await axios.get(`${API_URL}/bookings/my`);
        if (res.data.success) {
            const active = res.data.data.find(b => b.status === 'Approved');
            setActiveBooking(active);
        }
    } catch (e) {
        console.log('Error fetching active booking:', e.message);
    }
  };



  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Animated.View
        style={[pan.getLayout(), styles.fabContainer]}
        {...panResponder.panHandlers}
      >
        <Pressable style={styles.fabBtn} onPress={() => navigation.navigate('LiveTrip', { booking: activeBooking })}>
          <Ionicons name="navigate" size={24} color={COLORS.white} />
        </Pressable>
      </Animated.View>

      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.headerTitle}>Explore</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Popular Destinations */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Top Trending</Text>
          </View>
          <FlatList 
            horizontal
            data={TRENDING}
            keyExtractor={item => item._id}
            renderItem={({ item, index }) => (
                <Reanimated.View entering={FadeInRight.delay(index * 100)} style={[styles.card, styles.horizontalCard]}>
                    <Image source={{ uri: item.image }} style={styles.cardImage} />
                    <View style={styles.cardContent}>
                        <View style={styles.cardHeader}>
                            <Text style={styles.cardTitle} numberOfLines={1}>{item.name}</Text>
                            <Ionicons name="star" size={14} color="#F59E0B" />
                            <Text style={styles.ratingText}>{item.rating}</Text>
                        </View>
                        <Text style={styles.cardCategory}>{item.location}</Text>
                    </View>
                </Reanimated.View>
            )}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 10 }}
          />
        </View>

        {/* My Trips Area */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Your Adventures</Text>
          </View>
          <Pressable style={styles.myTripsBanner} onPress={() => navigation.navigate('MyTrips')}>
            <View style={styles.myTripsContent}>
              <Ionicons name="calendar" size={32} color={COLORS.primary} />
              <View style={{ marginLeft: 15, flex: 1 }}>
                <Text style={styles.myTripsTitle}>View My Trips</Text>
                <Text style={styles.myTripsSub}>Review your scheduled itineraries and historical journeys.</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
            </View>
          </Pressable>
        </View>

        {/* Featured Card */}
        <View style={styles.featuredContainer}>
            <Image 
                source={{ uri: 'https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?q=80&w=1000' }} 
                style={styles.featuredImg}
            />
            <View style={styles.featuredContent}>
                <Text style={styles.featuredTag}>PROMOTION</Text>
                <Text style={styles.featuredTitle}>Explore the Wildness of Yala</Text>
                <Text style={styles.featuredSub}>Get 20% off on your safari booking when you rent a 4x4 with DriveMate.</Text>
            </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.white },
  header: { padding: 20, backgroundColor: COLORS.white },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { fontSize: 32, fontWeight: '900', color: COLORS.textDark, letterSpacing: -1 },
  headerActions: { flexDirection: 'row', gap: 10 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#F0F9FF', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 12 },
  actionBtnText: { color: COLORS.primary, fontWeight: '700', fontSize: 13 },
  startNowBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.primary, paddingVertical: 8, paddingHorizontal: 15, borderRadius: 12, ...SHADOWS.small },
  startNowText: { color: COLORS.white, fontWeight: '800', fontSize: 13 },
  searchContainer: { marginTop: 15 },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6', borderRadius: 15, paddingHorizontal: 16, height: 56 },
  searchInput: { flex: 1, marginLeft: 10, fontSize: 16, color: COLORS.textDark },
  scrollContent: { padding: 20 },
  section: { marginBottom: 25 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  sectionTitle: { fontSize: 20, fontWeight: '800', color: COLORS.textDark },
  card: { backgroundColor: COLORS.white, borderRadius: 25, overflow: 'hidden', ...SHADOWS.medium, marginBottom: 20 },
  horizontalCard: { width: 280, marginRight: 20, marginBottom: 5 },
  cardImage: { width: '100%', height: 180 },
  cardContent: { padding: 18 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cardTitle: { fontSize: 18, fontWeight: '800', color: COLORS.textDark, flex: 1 },
  ratingText: { fontSize: 13, fontWeight: '700', color: COLORS.textDark },
  cardCategory: { fontSize: 12, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginVertical: 8 },
  featuredContainer: { borderRadius: 25, overflow: 'hidden', ...SHADOWS.medium, backgroundColor: COLORS.white },
  featuredImg: { width: '100%', height: 200 },
  featuredContent: { padding: 20 },
  featuredTag: { fontSize: 10, fontWeight: '900', color: COLORS.primary, letterSpacing: 2, marginBottom: 6 },
  featuredTitle: { fontSize: 22, fontWeight: '900', color: COLORS.textDark },
  featuredSub: { fontSize: 14, color: COLORS.textMuted, marginTop: 8, lineHeight: 20 },
  myTripsBanner: { backgroundColor: '#F0F9FF', padding: 20, borderRadius: 20, ...SHADOWS.small, borderWidth: 1, borderColor: '#E0F2FE' },
  myTripsContent: { flexDirection: 'row', alignItems: 'center' },
  myTripsTitle: { fontSize: 16, fontWeight: '800', color: COLORS.primary },
  myTripsSub: { fontSize: 12, color: COLORS.textMuted, marginTop: 4, lineHeight: 18 },
  fabContainer: { position: 'absolute', bottom: 30, right: 30, zIndex: 9999, ...SHADOWS.heavy, elevation: 15 },
  fabBtn: { width: 64, height: 64, borderRadius: 32, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' }
});

export default DestinationsScreen;
