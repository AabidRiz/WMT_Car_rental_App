import React, { useContext, useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, Image, ActivityIndicator, ScrollView, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInRight } from 'react-native-reanimated';
import { COLORS, SHADOWS } from '../../theme/colors';
import { AuthContext, API_URL } from '../../context/AuthContext';
import axios from 'axios';
import CustomerReviews from '../../components/CustomerReviews';

// Base URL for static file access (strip /api suffix)
const BASE_URL = API_URL.replace('/api', '');

const HomeScreen = ({ navigation }) => {
  const { width } = Dimensions.get('window');
  const cardWidth = (width - 50) / 2; // 20 padding each side + 10 gap in middle
  const { user } = useContext(AuthContext);
  const [cars, setCars] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCars = async () => {
      try {
        const res = await axios.get(`${API_URL}/cars`);
        if (res.data.success) setCars(res.data.data);
      } catch (e) {
        console.log('Failed to fetch cars:', e.message);
      } finally {
        setLoading(false);
      }
    };
    fetchCars();
  }, []);

  const getImageUrl = (car) => {
    if (car.images && car.images.length > 0) {
      return `${BASE_URL}/${car.images[0]}`;
    }
    return null;
  };

  const renderCarCard = ({ item, index }) => (
    <Animated.View entering={FadeInRight.delay(index * 100).duration(400)} style={{ width: cardWidth }}>
      <Pressable style={[styles.card, { width: cardWidth }]} onPress={() => navigation.navigate('CarDetails', { car: item })}>
        {getImageUrl(item) ? (
          <Image source={{ uri: getImageUrl(item) }} style={styles.carImage} />
        ) : (
          <View style={[styles.carImage, styles.placeholderImage]}>
            <Text style={{ fontSize: 20 }}>🚗</Text>
          </View>
        )}
        <View style={styles.cardDetails}>
          <Text style={styles.carName} numberOfLines={1}>{item.brand} {item.name}</Text>
          <Text style={styles.carBrand}>{item.brand} • {item.year}</Text>
          <View style={styles.priceRow}>
            <Text style={styles.price}>Rs {item.pricePerDay}</Text>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hello, {user?.name.split(' ')[0]}</Text>
          <Text style={styles.subtitle}>Find your perfect ride today</Text>
        </View>
        <Pressable onPress={() => navigation.navigate('Profile')}>
           <View style={styles.profileAvatar}>
             {user?.profilePicture ? (
               <Image source={{ uri: user.profilePicture }} style={{ width: 44, height: 44, borderRadius: 22 }} />
             ) : (
               <Text style={styles.avatarText}>{user?.name.charAt(0)}</Text>
             )}
           </View>
        </Pressable>
      </View>
      <Text style={styles.sectionTitle}>Available Cars</Text>
      <View style={styles.listContainer}>
        {loading ? (
          <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 50 }} />
        ) : (
          <FlatList
            data={cars}
            keyExtractor={(item) => item._id}
            renderItem={renderCarCard}
            numColumns={2}
            scrollEnabled={false}
            columnWrapperStyle={styles.columnWrapper}
            contentContainerStyle={{ paddingHorizontal: 20 }}
            ListEmptyComponent={<Text style={{ color: COLORS.textMuted, marginTop: 60, textAlign: 'center' }}>No cars available yet.</Text>}
          />
        )}
      </View>
      
      {/* Customer Reviews Section */}
      <CustomerReviews />
      
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, marginTop: 10 },
  greeting: { fontSize: 24, fontWeight: '800', color: COLORS.textDark },
  subtitle: { fontSize: 14, color: COLORS.textMuted, marginTop: 4 },
  profileAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.accent, justifyContent: 'center', alignItems: 'center', ...SHADOWS.floating },
  avatarText: { color: COLORS.white, fontWeight: '700', fontSize: 18 },
  sectionTitle: { fontSize: 20, fontWeight: '700', color: COLORS.primary, marginHorizontal: 20, marginTop: 20, marginBottom: 15 },
  listContainer: { paddingBottom: 20 },
  columnWrapper: { justifyContent: 'space-between', marginBottom: 20 },
  card: { backgroundColor: COLORS.white, borderRadius: 20, overflow: 'hidden', ...SHADOWS.floating },
  carImage: { width: '100%', height: 160, resizeMode: 'cover' },
  placeholderImage: { backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
  cardDetails: { padding: 16 },
  carName: { fontSize: 16, fontWeight: '700', color: COLORS.textDark },
  carBrand: { fontSize: 12, color: COLORS.textMuted, marginTop: 4, marginBottom: 10 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline' },
  price: { fontSize: 18, fontWeight: '800', color: COLORS.primary },
});

export default HomeScreen;

