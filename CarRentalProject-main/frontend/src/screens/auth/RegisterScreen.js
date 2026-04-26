import React, { useState, useContext } from 'react';
import { View, Text, StyleSheet, TextInput, KeyboardAvoidingView, Platform, ScrollView, Pressable, Alert } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../../context/AuthContext';
import { COLORS, SHADOWS } from '../../theme/colors';
import AnimatedButton from '../../components/AnimatedButton';

const RegisterScreen = ({ navigation }) => {
  const { register, isLoading } = useContext(AuthContext);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleRegister = async () => {
    setError('');
    if (!name || !email || !password || !confirmPassword) return setError('Please fill in all fields');
    if (name.length < 3) return setError('Name must be at least 3 characters');
    if (/[0-9]/.test(name)) return setError('Name cannot contain numbers');
    
    if (phone && !/^\+?[0-9]{1,12}$/.test(phone)) {
        return setError('Phone can only contain numbers and + (max 12 digits)');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return setError('Please enter a valid email address');
    
    if (password.length < 8) return setError('Password must be at least 8 characters');
    if (!/(?=.*[A-Z])(?=.*\d)/.test(password)) return setError('Password must contain at least 1 uppercase letter and 1 number');
    if (password !== confirmPassword) return setError('Passwords do not match');

    const res = await register(name, email, password, phone);
    if (!res.success) {
      setError(res.message);
    } else {
      if (Platform.OS === 'web') {
        window.alert('Account created! Please log in.');
        navigation.goBack();
      } else {
        Alert.alert('Success', 'Account created! Please log in.', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      }
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Animated.View entering={FadeInDown.delay(100).duration(600)}>
          <Text style={styles.title}>Join Us</Text>
          <Text style={styles.subtitle}>Create your Smart Travel account</Text>
        </Animated.View>
        <Animated.View entering={FadeInDown.delay(200).duration(600)} style={styles.card}>
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          
          <TextInput style={styles.input} placeholder="Full Name" placeholderTextColor={COLORS.textMuted} value={name} onChangeText={setName} />
          <TextInput style={styles.input} placeholder="Emergency Contact Number (e.g. +94770000000)" placeholderTextColor={COLORS.textMuted} value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
          <TextInput style={styles.input} placeholder="Email Address (e.g., user@gmail.com)" placeholderTextColor={COLORS.textMuted} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
          
          <View style={styles.passwordContainer}>
            <TextInput style={styles.passwordInput} placeholder="Password" placeholderTextColor={COLORS.textMuted} value={password} onChangeText={setPassword} secureTextEntry={!showPassword} />
            <Pressable onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
              <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={24} color={COLORS.textMuted} />
            </Pressable>
          </View>

          <View style={styles.passwordContainer}>
            <TextInput style={styles.passwordInput} placeholder="Re-enter Password" placeholderTextColor={COLORS.textMuted} value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry={!showConfirmPassword} />
            <Pressable onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={styles.eyeIcon}>
              <Ionicons name={showConfirmPassword ? 'eye-off' : 'eye'} size={24} color={COLORS.textMuted} />
            </Pressable>
          </View>

          <AnimatedButton title={isLoading ? 'Creating Account...' : 'Register'} onPress={handleRegister} style={{ marginTop: 10 }} />
          <AnimatedButton title="Back to Login" variant="outline" onPress={() => navigation.goBack()} />
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  title: { fontSize: 32, fontWeight: '800', color: COLORS.primary, marginBottom: 8, textAlign: 'center' },
  subtitle: { fontSize: 16, color: COLORS.textMuted, marginBottom: 40, textAlign: 'center' },
  card: { backgroundColor: COLORS.white, padding: 24, borderRadius: 16, ...SHADOWS.floating },
  input: { backgroundColor: COLORS.inputBackground, borderRadius: 8, padding: 16, fontSize: 16, color: COLORS.textDark, marginBottom: 16 },
  passwordContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.inputBackground, borderRadius: 8, marginBottom: 16 },
  passwordInput: { flex: 1, padding: 16, fontSize: 16, color: COLORS.textDark },
  eyeIcon: { padding: 16 },
  errorText: { color: COLORS.error, marginBottom: 10, textAlign: 'center' },
});

export default RegisterScreen;
