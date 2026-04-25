import React, { useState, useContext } from 'react';
import { View, Text, StyleSheet, TextInput, KeyboardAvoidingView, Platform, ScrollView, Pressable, Alert } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../../context/AuthContext';
import { COLORS, SHADOWS } from '../../theme/colors';
import AnimatedButton from '../../components/AnimatedButton';

const ForgotPasswordScreen = ({ navigation }) => {
  const { forgotPassword, isLoading } = useContext(AuthContext);
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleReset = async () => {
    setError('');
    if (!email || !newPassword || !confirmPassword) return setError('Please fill in all fields');
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return setError('Please enter a valid email address');
    
    if (newPassword.length < 8) return setError('Password must be at least 8 characters');
    if (!/(?=.*[A-Z])(?=.*\d)/.test(newPassword)) return setError('Password must contain at least 1 uppercase letter and 1 number');
    if (newPassword !== confirmPassword) return setError('Passwords do not match');

    const res = await forgotPassword(email, newPassword);
    if (!res.success) {
      setError(res.message);
    } else {
      Alert.alert('Success', 'Password has been updated perfectly.', [{ text: 'Login', onPress: () => navigation.goBack() }]);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Animated.View entering={FadeInDown.delay(100).duration(600)}>
          <Text style={styles.title}>Reset Password</Text>
          <Text style={styles.subtitle}>Enter your email to change your password directly</Text>
        </Animated.View>
        <Animated.View entering={FadeInDown.delay(200).duration(600)} style={styles.card}>
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          
          <TextInput style={styles.input} placeholder="Email Address" placeholderTextColor={COLORS.textMuted} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
          
          <View style={styles.passwordContainer}>
            <TextInput style={styles.passwordInput} placeholder="New Password" placeholderTextColor={COLORS.textMuted} value={newPassword} onChangeText={setNewPassword} secureTextEntry={!showPassword} />
            <Pressable onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
              <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={24} color={COLORS.textMuted} />
            </Pressable>
          </View>

          <View style={styles.passwordContainer}>
            <TextInput style={styles.passwordInput} placeholder="Re-enter New Password" placeholderTextColor={COLORS.textMuted} value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry={!showConfirmPassword} />
            <Pressable onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={styles.eyeIcon}>
              <Ionicons name={showConfirmPassword ? 'eye-off' : 'eye'} size={24} color={COLORS.textMuted} />
            </Pressable>
          </View>

          <AnimatedButton title={isLoading ? 'Resetting...' : 'Change Password'} onPress={handleReset} style={{ marginTop: 10 }} />
          <AnimatedButton title="Cancel" variant="outline" onPress={() => navigation.goBack()} />
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  title: { fontSize: 32, fontWeight: '800', color: COLORS.primary, marginBottom: 8, textAlign: 'center' },
  subtitle: { fontSize: 16, color: COLORS.textMuted, marginBottom: 40, textAlign: 'center', paddingHorizontal: 20 },
  card: { backgroundColor: COLORS.white, padding: 24, borderRadius: 16, ...SHADOWS.floating },
  input: { backgroundColor: COLORS.inputBackground, borderRadius: 8, padding: 16, fontSize: 16, color: COLORS.textDark, marginBottom: 16 },
  passwordContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.inputBackground, borderRadius: 8, marginBottom: 16 },
  passwordInput: { flex: 1, padding: 16, fontSize: 16, color: COLORS.textDark },
  eyeIcon: { padding: 16 },
  errorText: { color: COLORS.error, marginBottom: 10, textAlign: 'center' },
});

export default ForgotPasswordScreen;
