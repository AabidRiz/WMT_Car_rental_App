import React, { useState } from 'react';
import { 
  Modal, View, Text, StyleSheet, Pressable, 
  TextInput, ScrollView, Image, ActivityIndicator, Alert 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import axios from 'axios';
import { COLORS, SHADOWS } from '../theme/colors';
import { API_URL } from '../context/AuthContext';

const IncidentReportModal = ({ visible, onClose, report, bookingId }) => {
  const BASE_URL = API_URL.replace('/api', '');
  const [description, setDescription] = useState('');
  const [images, setImages] = useState([]); // Array of objects: { uri: string, isExisting: boolean, serverPath?: string }
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    if (visible && report) {
      setDescription(report.damageDescription || '');
      // Load existing photos into state
      if (report.photos && report.photos.length > 0) {
        const existing = report.photos.map(path => ({
          uri: `${BASE_URL}/${path}`,
          isExisting: true,
          serverPath: path
        }));
        setImages(existing);
      } else {
        setImages([]);
      }
    } else {
      setDescription('');
      setImages([]);
    }
  }, [visible, report]);

  const pickImage = async () => {
    if (images.length >= 5) {
      return Alert.alert('Limit Reached', 'You can upload up to 5 photos.');
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 0.6,
    });

    if (!result.canceled) {
      const newImgs = result.assets.map(a => ({
        uri: a.uri,
        isExisting: false
      }));
      setImages([...images, ...newImgs]);
    }
  };

  const removeImage = (index) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    const isImageMandatory = report?.emergencyType === 'Accident';
    if (!description || (isImageMandatory && images.length === 0)) {
      return Alert.alert('Missing Info', `Please provide a description ${isImageMandatory ? 'and at least one photo' : ''}.`);
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('damageDescription', description);
      
      const existingToKeep = images.filter(img => img.isExisting).map(img => img.serverPath);
      formData.append('existingPhotos', JSON.stringify(existingToKeep));
      
      const newFiles = images.filter(img => !img.isExisting);
      newFiles.forEach((img, index) => {
        formData.append('images', {
          uri: img.uri,
          type: 'image/jpeg',
          name: `damage-${Date.now()}-${index}.jpg`,
        });
      });

      const res = await axios.put(`${API_URL}/sos/${report._id}/report`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (res.data.success) {
        Alert.alert(report?.damageDescription ? 'Report Updated' : 'Report Submitted', 'Your accident report details have been saved.');
        onClose();
      }
    } catch (e) {
      console.log('Report error:', e.message);
      Alert.alert('Error', 'Failed to submit report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Accident Report</Text>
          <Pressable onPress={onClose}><Ionicons name="close" size={28} color={COLORS.textDark} /></Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.alertBox}>
            <Ionicons name="information-circle" size={20} color={COLORS.primary} />
            <Text style={styles.alertText}>
              {report?.emergencyType === 'Accident' 
                ? 'Please provide clear photos of the vehicle damage for insurance purposes.'
                : 'Briefly describe the breakdown issue. Photos are optional but helpful.'}
            </Text>
          </View>

          <Text style={styles.label}>Damage Description</Text>
          <TextInput
            style={styles.input}
            placeholder="Describe what happened and where the damage is..."
            multiline
            numberOfLines={4}
            value={description}
            onChangeText={setDescription}
          />

          <Text style={styles.label}>Photos ({images.length}/5)</Text>
          <View style={styles.imageGrid}>
            {images.map((img, index) => (
              <View key={index} style={styles.imageBox}>
                <Image source={{ uri: img.uri }} style={styles.image} />
                <Pressable style={styles.removeBtn} onPress={() => removeImage(index)}>
                  <Ionicons name="close-circle" size={20} color={COLORS.error} />
                </Pressable>
              </View>
            ))}
            {images.length < 5 && (
              <Pressable style={styles.addBtn} onPress={pickImage}>
                <Ionicons name="camera" size={32} color={COLORS.textMuted} />
                <Text style={styles.addText}>Add Photo</Text>
              </Pressable>
            )}
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <Pressable 
            style={[
              styles.submitBtn, 
              (!description || (report?.emergencyType === 'Accident' && images.length === 0)) && styles.disabledBtn
            ]} 
            onPress={handleSubmit}
            disabled={loading || !description || (report?.emergencyType === 'Accident' && images.length === 0)}
          >
            {loading ? <ActivityIndicator color={COLORS.white} /> : (
              <>
                <Ionicons name="cloud-upload" size={20} color={COLORS.white} />
                <Text style={styles.submitText}>{report?.damageDescription ? 'Update Report' : 'Submit Formal Report'}</Text>
              </>
            )}
          </Pressable>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.white },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  title: { fontSize: 20, fontWeight: '800', color: COLORS.textDark },
  content: { padding: 20 },
  alertBox: { flexDirection: 'row', backgroundColor: '#EFF6FF', padding: 15, borderRadius: 15, gap: 10, marginBottom: 25 },
  alertText: { flex: 1, fontSize: 13, color: '#1E40AF', lineHeight: 18 },
  label: { fontSize: 16, fontWeight: '700', color: COLORS.textDark, marginBottom: 10 },
  input: { backgroundColor: '#F9FAFB', borderRadius: 15, padding: 15, fontSize: 15, textAlignVertical: 'top', minHeight: 120, marginBottom: 25, borderWidth: 1, borderColor: '#F1F5F9' },
  imageGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  imageBox: { width: '30%', aspectRatio: 1, borderRadius: 12, overflow: 'hidden', position: 'relative' },
  image: { width: '100%', height: '100%' },
  removeBtn: { position: 'absolute', top: 5, right: 5, backgroundColor: COLORS.white, borderRadius: 10 },
  addBtn: { width: '30%', aspectRatio: 1, borderRadius: 12, borderStyle: 'dashed', borderWidth: 1, borderColor: '#D1D5DB', justifyContent: 'center', alignItems: 'center', backgroundColor: '#F9FAFB' },
  addText: { fontSize: 10, color: COLORS.textMuted, marginTop: 4, fontWeight: '700', textAlign: 'center' },
  footer: { padding: 20, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  submitBtn: { backgroundColor: COLORS.primary, height: 56, borderRadius: 18, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10, ...SHADOWS.medium },
  submitText: { color: COLORS.white, fontSize: 16, fontWeight: '800' },
  disabledBtn: { backgroundColor: '#D1D5DB' },
  existingImageBox: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#EFF6FF', padding: 10, borderRadius: 8, marginBottom: 15 },
  existingImageText: { fontSize: 13, color: '#1E40AF', fontWeight: '600' }
});

export default IncidentReportModal;
