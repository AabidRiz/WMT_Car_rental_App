import React, { useState, useEffect, useContext } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, Pressable, Image, Alert, Modal, Platform, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import axios from 'axios';
import { COLORS, SHADOWS } from '../../theme/colors';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AnimatedButton from '../../components/AnimatedButton';
import { AuthContext, API_URL } from '../../context/AuthContext';

const AdminInventoryScreen = () => {
  const { user, logout } = useContext(AuthContext);
  const [cars, setCars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [year, setYear] = useState('');
  const [licensePlate, setLicensePlate] = useState('');
  const [pricePerDay, setPricePerDay] = useState('');
  const [kmPerLiter, setKmPerLiter] = useState('');
  const [tankCapacity, setTankCapacity] = useState('');
  const [currentFuel, setCurrentFuel] = useState('');
  const [description, setDescription] = useState('');
  const [fuelType, setFuelType] = useState('Petrol');
  const [transmission, setTransmission] = useState('Automatic');
  const [seats, setSeats] = useState('4');
  const [images, setImages] = useState([]); // Array of objects: { uri, isExisting, serverPath }
  const [editingCarId, setEditingCarId] = useState(null);

  useEffect(() => {
    fetchCars();
  }, []);

  const fetchCars = async () => {
    try {
      const res = await axios.get(`${API_URL}/cars`);
      if (res.data.success) {
        setCars(res.data.data);
      }
    } catch (e) {
      console.log(e);
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async () => {
    if (images.length >= 3) {
      if (Platform.OS === 'web') return window.alert('You can only upload up to 3 images.');
      return Alert.alert('Limit Reached', 'You can only upload up to 3 images.');
    }
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: 3 - images.length,
      quality: 0.7,
    });
    if (!result.canceled) {
      const newImgs = result.assets.map(asset => ({
        uri: asset.uri,
        isExisting: false
      }));
      setImages([...images, ...newImgs]);
    }
  };

  const handleAddCar = async () => {
    const isEditing = !!editingCarId;
    if (!name || !brand || !pricePerDay) {
      const msg = 'Please fill core details (Brand, Name, and Price).';
      if (Platform.OS === 'web') return window.alert(msg);
      return Alert.alert('Error', msg);
    }
    
    if (!isEditing && images.length === 0) {
      if (Platform.OS === 'web') return window.alert('Please add at least 1 image.');
      return Alert.alert('Error', 'Please add at least 1 image.');
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('name', name);
      formData.append('brand', brand);
      formData.append('year', year || '2023');
      formData.append('licensePlate', licensePlate || 'UNREGISTERED');
      formData.append('pricePerDay', pricePerDay);
      formData.append('kmPerLiter', kmPerLiter || '15');
      formData.append('tankCapacity', tankCapacity || '40');
      formData.append('currentFuel', currentFuel || '0');
      formData.append('description', description);
      formData.append('fuelType', fuelType);
      formData.append('transmission', transmission);
      formData.append('seats', seats);

      const existingToKeep = images.filter(img => img.isExisting).map(img => img.serverPath);
      formData.append('existingImages', JSON.stringify(existingToKeep));

      // Append multi-images specifically formatting for Multer exactly as backend requests
      const newFiles = images.filter(img => !img.isExisting);
      for (let i = 0; i < newFiles.length; i++) {
        const img = newFiles[i];
        if (Platform.OS === 'web') {
          // Web requires fetching the blob safely
          const res = await fetch(img.uri);
          const blob = await res.blob();
          formData.append('images', blob, `car-${Date.now()}-${i}.jpg`);
        } else {
          // Native uses localized payload
          formData.append('images', {
            uri: img.uri,
            type: 'image/jpeg',
            name: `car-${Date.now()}-${i}.jpg`,
          });
        }
      }
      
      console.log('Sending FormData to:', editingCarId ? 'PUT' : 'POST');
      
      if (editingCarId) {
          await axios.put(`${API_URL}/cars/${editingCarId}`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
          if (Platform.OS === 'web') window.alert('Car Updated Successfully!');
          else Alert.alert('Success', 'Car Updated Successfully!');
      } else {
          await axios.post(`${API_URL}/cars`, formData, {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
          });
          if (Platform.OS === 'web') window.alert('Car Added Successfully!');
          else Alert.alert('Success', 'Car Added Successfully!');
      }

      setModalVisible(false);
      resetForm();
      fetchCars();

    } catch (e) {
      const msg = e.response?.data?.message || 'Upload failed.';
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert('Error', msg);
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setName(''); setBrand(''); setYear(''); setLicensePlate('');
    setPricePerDay(''); setKmPerLiter(''); setTankCapacity('');
    setCurrentFuel('');
    setDescription(''); setImages([]);
    setEditingCarId(null);
  };

  const handleEditPress = (car) => {
    setEditingCarId(car._id);
    setName(car.name);
    setBrand(car.brand);
    setYear(car.year.toString());
    setLicensePlate(car.licensePlate);
    setPricePerDay(car.pricePerDay.toString());
    setKmPerLiter(car.kmPerLiter.toString());
    setTankCapacity(car.tankCapacity.toString());
    setCurrentFuel(car.currentFuel?.toString() || '0');
    setDescription(car.description || '');
    
    // Load existing images correctly
    if (car.images && car.images.length > 0) {
      const BASE_URL = API_URL.replace('/api', '');
      const existing = car.images.map(path => ({
        uri: `${BASE_URL}/${path}`,
        isExisting: true,
        serverPath: path
      }));
      setImages(existing);
    } else {
      setImages([]);
    }
    setModalVisible(true);
  };

  const toggleAvailability = async (carId, current) => {
    try {
      await axios.put(`${API_URL}/cars/${carId}/availability`);
      setCars(cars.map(c => c._id === carId ? { ...c, isAvailable: !current } : c));
    } catch (e) {
      const msg = Platform.OS === 'web' ? window.alert : (t) => Alert.alert('Error', t);
      msg(e.response?.data?.message || 'Failed to toggle availability.');
    }
  };

  const handleDeleteCar = async (carId) => {
    try {
      await axios.delete(`${API_URL}/cars/${carId}`);
      fetchCars();
      if (Platform.OS === 'web') window.alert('Car deleted.');
      else Alert.alert('Deleted', 'Car removed from inventory.');
    } catch (e) {
      const msg = e.response?.data?.message || 'Failed to delete.'; 
      if (Platform.OS === 'web') window.alert(msg); else Alert.alert('Error', msg);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={styles.headerTitle}>Car Inventory</Text>
          <Pressable onPress={logout} style={{ marginLeft: 16 }}>
            <Ionicons name="log-out" size={24} color={COLORS.error} />
          </Pressable>
        </View>
        <Pressable onPress={() => { resetForm(); setModalVisible(true); }} style={styles.addButton}>
          <Ionicons name="add" size={24} color={COLORS.white} />
          <Text style={styles.addButtonText}>Add Car</Text>
        </Pressable>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 50 }} />
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {cars.map((car) => (
              <View key={car._id} style={styles.carCard}>
              {car.images && car.images.length > 0 ? (
                <Image source={{ uri: `${API_URL.replace('/api', '')}/${car.images[0]}` }} style={styles.carImage} />
              ) : (
                <View style={styles.placeholderImg}><Ionicons name="car" size={40} color={COLORS.white} /></View>
              )}
              <View style={styles.carInfo}>
                <Text style={styles.carName}>{car.brand} {car.name}</Text>
                <Text style={styles.carPrice}>LKR {car.pricePerDay}/day</Text>
                <Text style={styles.carSpecs}>KMPL: {car.kmPerLiter} | Tank: {car.tankCapacity}L | Fuel: {car.currentFuel || 0}L</Text>
                <View style={styles.cardActions}>
                  <Pressable
                    style={[styles.toggleBtn, { backgroundColor: car.isAvailable ? '#10B981' : '#EF4444' }]}
                    onPress={() => toggleAvailability(car._id, car.isAvailable)}
                  >
                    <Text style={styles.toggleBtnText}>{car.isAvailable ? '✓ Available' : '✗ Unavailable'}</Text>
                  </Pressable>
                  <Pressable onPress={() => handleEditPress(car)} style={styles.editBtn}>
                    <Ionicons name="create" size={18} color={COLORS.primary} />
                  </Pressable>
                  <Pressable onPress={() => handleDeleteCar(car._id)} style={styles.deleteBtn}>
                    <Ionicons name="trash" size={18} color={COLORS.error} />
                  </Pressable>
                </View>
              </View>
            </View>
          ))}
          {cars.length === 0 && <Text style={{ textAlign: 'center', marginTop: 50, color: COLORS.textMuted }}>No cars in inventory.</Text>}
        </ScrollView>
      )}

      {/* ADD CAR FULL SCREEN MODAL */}
      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{editingCarId ? 'Edit Car Details' : 'Add New Car'}</Text>
            <Pressable onPress={() => setModalVisible(false)}><Ionicons name="close" size={28} color={COLORS.textDark} /></Pressable>
          </View>
          
          <ScrollView contentContainerStyle={styles.modalContent}>
            <Text style={styles.label}>Car Name & Details</Text>
            <TextInput style={styles.input} placeholder="Brand (e.g., Toyota)" value={brand} onChangeText={setBrand} />
            <TextInput style={styles.input} placeholder="Model (e.g., Prius)" value={name} onChangeText={setName} />
            <TextInput style={styles.input} placeholder="Year" value={year} onChangeText={setYear} keyboardType="numeric" />
            <TextInput style={styles.input} placeholder="License Plate" value={licensePlate} onChangeText={setLicensePlate} />
            <TextInput style={styles.input} placeholder="Short Description" value={description} onChangeText={setDescription} multiline />

            <Text style={[styles.label, { marginTop: 16 }]}>Specifications & Math Constraints</Text>
            <TextInput style={styles.input} placeholder="Price Per Day (Rs)" value={pricePerDay} onChangeText={setPricePerDay} keyboardType="numeric" />
            <TextInput style={styles.input} placeholder="Fuel Efficiency (km/L)" value={kmPerLiter} onChangeText={setKmPerLiter} keyboardType="numeric" />
            <TextInput style={styles.input} placeholder="Tank Capacity (Liters)" value={tankCapacity} onChangeText={setTankCapacity} keyboardType="numeric" />
            <TextInput style={styles.input} placeholder="Current Fuel Level (Liters)" value={currentFuel} onChangeText={setCurrentFuel} keyboardType="numeric" />

            <Text style={[styles.label, { marginTop: 16 }]}>Upload Images (Max 3)</Text>
            <View style={styles.imageRow}>
              {images.map((img, idx) => (
                <View key={idx} style={styles.thumbnailWrapper}>
                  <Image source={{ uri: img.uri }} style={styles.thumbnail} />
                  <Pressable style={styles.removeImage} onPress={() => setImages(images.filter((_, i) => i !== idx))}>
                    <Ionicons name="close" size={16} color={COLORS.white} />
                  </Pressable>
                </View>
              ))}
              {images.length < 3 && (
                <Pressable style={styles.addPhotoBox} onPress={pickImage}>
                  <Ionicons name="camera" size={32} color={COLORS.textMuted} />
                </Pressable>
              )}
            </View>

            <AnimatedButton title={submitting ? "Uploading..." : "Save Car to Database"} onPress={handleAddCar} style={{ marginTop: 32 }} />
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { padding: 20, backgroundColor: COLORS.white, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', ...SHADOWS.floating },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: COLORS.primary },
  addButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.accent, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  addButtonText: { color: COLORS.white, fontWeight: 'bold', marginLeft: 4 },
  list: { padding: 20 },
  carCard: { backgroundColor: COLORS.white, borderRadius: 16, overflow: 'hidden', marginBottom: 16, ...SHADOWS.floating, flexDirection: 'row' },
  carImage: { width: 120, height: '100%', resizeMode: 'cover' },
  placeholderImg: { width: 120, height: 120, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
  carInfo: { padding: 16, flex: 1 },
  carName: { fontSize: 18, fontWeight: 'bold', color: COLORS.textDark, marginBottom: 4 },
  carPrice: { fontSize: 16, color: COLORS.accent, fontWeight: '600', marginBottom: 8 },
  carSpecs: { fontSize: 12, color: COLORS.textMuted },
  cardActions: { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 8 },
  toggleBtn: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  toggleBtnText: { color: COLORS.white, fontSize: 11, fontWeight: '700' },
  deleteBtn: { padding: 4 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: COLORS.textDark },
  modalContent: { padding: 20, paddingBottom: 100 },
  label: { fontSize: 14, fontWeight: 'bold', color: COLORS.primary, marginBottom: 10, textTransform: 'uppercase' },
  input: { backgroundColor: COLORS.white, padding: 16, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border, marginBottom: 12, fontSize: 16, color: COLORS.textDark },
  imageRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  addPhotoBox: { width: 80, height: 80, borderRadius: 8, borderWidth: 2, borderColor: COLORS.border, borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center' },
  thumbnailWrapper: { width: 80, height: 80, position: 'relative' },
  thumbnail: { width: '100%', height: '100%', borderRadius: 8 },
  removeImage: { position: 'absolute', top: -5, right: -5, backgroundColor: COLORS.error, borderRadius: 10, zIndex: 10 },
});

export default AdminInventoryScreen;
