import React, { useState, useContext } from 'react';
import { View, Text, StyleSheet, TextInput, KeyboardAvoidingView, Platform, Pressable, Image, Dimensions } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../../context/AuthContext';
import { COLORS, SHADOWS } from '../../theme/colors';
import AnimatedButton from '../../components/AnimatedButton';

const { width, height } = Dimensions.get('window');

const WelcomeScreen = ({ navigation }) => {
  const { login, isLoading } = useContext(AuthContext);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    setError('');
    if (!email || !password) return setError('Please fill in all fields');
    const res = await login(email, password);
    if (!res.success) setError(res.message);
  };

  return (
    <View style={styles.container}>
      {/* Hero Image Section */}
      <View style={styles.heroContainer}>
        <Image 
          source={require('../../../assets/images/login_hero.png')} 
          style={styles.heroImage}
          resizeMode="cover"
        />
        <View style={styles.overlay} />
        
        <Animated.View entering={FadeInUp.delay(200).duration(800)} style={styles.heroContent}>
          <View style={styles.logoBadge}>
            <Ionicons name="car-sport" size={28} color={COLORS.white} />
          </View>
          <Text style={styles.heroTitle}>DriveMate</Text>
          <Text style={styles.heroSubtitle}>Your Gateway to Premium Travel</Text>
        </Animated.View>
      </View>

      <KeyboardAvoidingView 
        style={styles.formWrapper} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Animated.View 
          entering={FadeInDown.delay(400).duration(600)} 
          style={styles.card}
        >
          <Text style={styles.loginTitle}>Welcome Back</Text>
          <Text style={styles.loginSubtitle}>Login to continue your journey</Text>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          
          <View style={styles.inputContainer}>
            <Ionicons name="mail-outline" size={20} color={COLORS.textMuted} style={styles.inputIcon} />
            <TextInput 
              style={styles.input} 
              placeholder="Email Address" 
              placeholderTextColor={COLORS.textMuted} 
              value={email} 
              onChangeText={setEmail} 
              keyboardType="email-address" 
              autoCapitalize="none" 
            />
          </View>
          
          <View style={styles.passwordContainer}>
            <Ionicons name="lock-closed-outline" size={20} color={COLORS.textMuted} style={styles.inputIcon} />
            <TextInput 
              style={styles.passwordInput} 
              placeholder="Password" 
              placeholderTextColor={COLORS.textMuted} 
              value={password} 
              onChangeText={setPassword} 
              secureTextEntry={!showPassword} 
            />
            <Pressable onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
              <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={22} color={COLORS.textMuted} />
            </Pressable>
          </View>
          
          <Pressable onPress={() => navigation.navigate('ForgotPassword')} style={styles.forgotPasswordContainer}>
             <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
          </Pressable>

          <AnimatedButton 
            title={isLoading ? 'Verifying Account...' : 'Sign In'} 
            onPress={handleLogin} 
            style={{ marginTop: 10, height: 56 }} 
          />
          
          <View style={styles.registerRow}>
            <Text style={styles.noAccountText}>New to DriveMate?</Text>
            <Pressable onPress={() => navigation.navigate('Register')}>
              <Text style={styles.registerLink}> Create Account</Text>
            </Pressable>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  heroContainer: {
    height: height * 0.45,
    width: '100%',
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(4, 120, 87, 0.4)', // Semi-transparent primary color
  },
  heroContent: {
    position: 'absolute',
    bottom: 60,
    left: 24,
    right: 24,
    alignItems: 'center',
  },
  logoBadge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    ...SHADOWS.heavy,
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: '900',
    color: COLORS.white,
    letterSpacing: 1,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  heroSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 4,
    fontWeight: '600',
  },
  formWrapper: {
    flex: 1,
    marginTop: -40,
    paddingHorizontal: 24,
  },
  card: {
    backgroundColor: COLORS.white,
    padding: 24,
    borderRadius: 24,
    ...SHADOWS.floating,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  loginTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.textDark,
    marginBottom: 4,
  },
  loginSubtitle: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginBottom: 24,
    fontWeight: '500',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.inputBackground,
    borderRadius: 12,
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    height: 56,
    fontSize: 16,
    color: COLORS.textDark,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.inputBackground,
    borderRadius: 12,
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  passwordInput: {
    flex: 1,
    height: 56,
    fontSize: 16,
    color: COLORS.textDark,
  },
  eyeIcon: {
    padding: 4,
  },
  forgotPasswordContainer: {
    alignSelf: 'flex-end',
    marginBottom: 24,
  },
  forgotPasswordText: {
    color: COLORS.primary,
    fontWeight: '700',
    fontSize: 14,
  },
  errorText: {
    color: COLORS.error,
    marginBottom: 16,
    textAlign: 'center',
    fontWeight: '600',
    backgroundColor: '#FEF2F2',
    padding: 8,
    borderRadius: 8,
  },
  registerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  noAccountText: {
    color: COLORS.textMuted,
    fontSize: 14,
    fontWeight: '500',
  },
  registerLink: {
    color: COLORS.primary,
    fontWeight: '800',
    fontSize: 14,
  },
});

export default WelcomeScreen;

