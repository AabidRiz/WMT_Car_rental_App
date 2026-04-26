import React, { useContext, useState } from 'react';
import { View, Text, StyleSheet, Image, Pressable, TextInput, ScrollView, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { AuthContext } from '../../context/AuthContext';
import { COLORS, SHADOWS } from '../../theme/colors';
import AnimatedButton from '../../components/AnimatedButton';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn } from 'react-native-reanimated';

const ProfileScreen = ({ navigation }) => {
  const { user, logout, updateProfile, isLoading } = useContext(AuthContext);
  const [profileImage, setProfileImage] = useState(user?.profilePicture || null);
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [errorText, setErrorText] = useState('');
  const [successText, setSuccessText] = useState('');

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
      base64: true,
    });
    if (!result.canceled) {
      const b64 = `data:image/jpeg;base64,${result.assets[0].base64}`;
      setProfileImage(b64);
      setIsEditing(true);
    }
  };

  const saveProfile = async () => {
    setErrorText('');
    setSuccessText('');
    
    if (!name || !email) return setErrorText('Name and Email cannot be empty.');
    
    if (phone && !/^\+?[0-9]{1,12}$/.test(phone)) {
        return setErrorText('Phone can only contain numbers and + (max 12 digits)');
    }

    if (newPassword) {
      if (newPassword.length < 8) return setErrorText('Password must be at least 8 characters.');
      if (!/(?=.*[A-Z])(?=.*\d)/.test(newPassword)) return setErrorText('Password needs 1 uppercase letter and 1 number.');
    }

    const res = await updateProfile(name, email, profileImage, newPassword, phone);
    if (res.success) {
      setNewPassword('');
      setSuccessText(newPassword ? 'Profile and Password updated!' : 'Profile updated successfully!');
      setIsEditing(false);
      setTimeout(() => setSuccessText(''), 3000);
    } else {
      setErrorText(res.message || 'Failed to update profile.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textDark} />
        </Pressable>
        <Text style={styles.headerTitle}>My Profile</Text>
      </View>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} bounces={Platform.OS === 'ios'}>
        <Animated.View entering={FadeIn.duration(500)} style={styles.card}>
          <View style={styles.imageContainer}>
            {profileImage ? (
              <Image source={{ uri: profileImage }} style={styles.image} />
            ) : (
              <View style={styles.placeholderImage}>
                <Text style={styles.initials}>{name.charAt(0) || 'U'}</Text>
              </View>
            )}
            <Pressable style={styles.editIcon} onPress={pickImage}>
              <Ionicons name="camera" size={20} color={COLORS.white} />
            </Pressable>
          </View>

          {errorText ? <Text style={styles.errorText}>{errorText}</Text> : null}
          {successText ? <Text style={styles.successText}>{successText}</Text> : null}

          <View style={styles.infoRow}>
            <Text style={styles.label}>Full Name</Text>
            {isEditing ? (
              <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Enter your full name" />
            ) : (
              <Text style={styles.value}>{name}</Text>
            )}
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.label}>Email Address</Text>
            {isEditing ? (
              <TextInput style={styles.input} value={email} onChangeText={setEmail} keyboardType="email-address" placeholder="Enter your email" autoCapitalize="none" />
            ) : (
              <Text style={styles.value}>{email}</Text>
            )}
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.label}>Phone Number</Text>
            {isEditing ? (
              <TextInput style={styles.input} value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="Emergency Contact Number" />
            ) : (
              <Text style={styles.value}>{phone || 'No phone number added'}</Text>
            )}
          </View>

          {isEditing && (
            <View style={styles.infoRow}>
              <Text style={styles.label}>Change Password (Optional)</Text>
              <View style={styles.passwordContainer}>
                <TextInput style={styles.passwordInput} value={newPassword} onChangeText={setNewPassword} secureTextEntry={!showPassword} placeholder="Leave blank to keep same" />
                <Pressable onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                  <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={24} color={COLORS.textMuted} />
                </Pressable>
              </View>
            </View>
          )}

          {!isEditing ? (
            <AnimatedButton title="Edit Profile" onPress={() => { setIsEditing(true); setSuccessText(''); setErrorText(''); }} style={{ marginTop: 24 }} />
          ) : (
            <View style={{ marginTop: 24 }}>
              <AnimatedButton title={isLoading ? "Saving..." : "Save Changes"} onPress={saveProfile} />
              <AnimatedButton title="Cancel" variant="outline" onPress={() => { setIsEditing(false); setName(user?.name); setEmail(user?.email); setPhone(user?.phone); setProfileImage(user?.profilePicture); setNewPassword(''); setErrorText(''); }} />
            </View>
          )}

          <AnimatedButton title="Logout" variant="outline" onPress={logout} style={{ marginTop: isEditing ? 8 : 16, borderColor: COLORS.error }} textStyle={{ color: COLORS.error }} />
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', padding: 20 },
  backButton: { marginRight: 16 },
  headerTitle: { fontSize: 24, fontWeight: '700', color: COLORS.textDark },
  card: { backgroundColor: COLORS.white, margin: 20, borderRadius: 16, padding: 24, ...SHADOWS.floating },
  imageContainer: { alignSelf: 'center', position: 'relative', marginBottom: 24 },
  image: { width: 100, height: 100, borderRadius: 50 },
  placeholderImage: { width: 100, height: 100, borderRadius: 50, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
  initials: { color: COLORS.white, fontSize: 36, fontWeight: 'bold' },
  editIcon: { position: 'absolute', bottom: 0, right: 0, backgroundColor: COLORS.accent, padding: 8, borderRadius: 20, borderWidth: 3, borderColor: COLORS.white },
  infoRow: { marginBottom: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border, paddingBottom: 8 },
  label: { fontSize: 12, color: COLORS.textMuted, marginBottom: 4, textTransform: 'uppercase' },
  value: { fontSize: 16, color: COLORS.textDark, fontWeight: '500', paddingVertical: 8 },
  input: { fontSize: 16, color: COLORS.textDark, backgroundColor: COLORS.inputBackground, padding: 12, borderRadius: 8 },
  passwordContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.inputBackground, borderRadius: 8 },
  passwordInput: { flex: 1, padding: 12, fontSize: 16, color: COLORS.textDark },
  eyeIcon: { padding: 12 },
  errorText: { color: COLORS.error, textAlign: 'center', marginBottom: 16, fontWeight: '600' },
  successText: { color: COLORS.success, textAlign: 'center', marginBottom: 16, fontWeight: '600' },
});

export default ProfileScreen;
