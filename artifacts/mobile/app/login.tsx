import React, { useState, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Animated,
  Platform, TextInput, KeyboardAvoidingView, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useColors } from '@/hooks/useColors';
import { useApp } from '@/contexts/AppContext';

const PIN_LENGTH = 4;
const PAD = ['1','2','3','4','5','6','7','8','9','','0','⌫'];

export default function LoginScreen() {
  const colors = useColors();
  const { login } = useApp();
  const router = useRouter();

  const [email, setEmail]     = useState('');
  const [pin, setPin]         = useState('');
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep]       = useState<'email' | 'pin'>('email');

  const shakeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  const shake = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  };

  const handleEmailContinue = () => {
    if (!email.trim() || !email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }
    setError('');
    setPin('');
    slideAnim.setValue(30);
    Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 90, friction: 12 }).start();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setStep('pin');
  };

  const handleKey = async (key: string) => {
    if (key === '⌫') { setPin(p => p.slice(0, -1)); setError(''); return; }
    if (key === '' || pin.length >= PIN_LENGTH) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newPin = pin + key;
    setPin(newPin);
    setError('');

    if (newPin.length === PIN_LENGTH) {
      setLoading(true);
      await new Promise(r => setTimeout(r, 300));
      const result = await login(email.trim(), newPin);
      setLoading(false);
      if (result.ok) {
        router.replace('/(tabs)');
      } else if (result.emailVerificationRequired) {
        router.push(`/verify-email?storeId=${result.storeId ?? ''}&email=${encodeURIComponent(email.trim())}`);
      } else {
        shake();
        setError('Incorrect email or PIN. Try again.');
        setPin('');
      }
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Hero header */}
      <LinearGradient colors={['#1A56DB', '#0F3A9E']} style={styles.hero}>
        <View style={[styles.heroIcon, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
          <Ionicons name="storefront" size={40} color="#FFFFFF" />
        </View>
        <Text style={[styles.heroTitle, { fontFamily: 'Inter_700Bold' }]}>Welcome Back</Text>
        <Text style={[styles.heroSub, { fontFamily: 'Inter_400Regular' }]}>Sign in to your POS account</Text>
      </LinearGradient>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.sheet, { backgroundColor: colors.card }]}>

          {/* ── Step 1: Email ── */}
          <View style={styles.stepIndicatorRow}>
            <View style={[styles.stepDot, { backgroundColor: colors.primary }]} />
            <View style={[styles.stepLine, { backgroundColor: step === 'pin' ? colors.primary : colors.border }]} />
            <View style={[styles.stepDot, { backgroundColor: step === 'pin' ? colors.primary : colors.border }]} />
          </View>

          {step === 'email' ? (
            <Animated.View style={[styles.stepView, { transform: [{ translateY: slideAnim }] }]}>
              <Text style={[styles.stepTitle, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>
                Enter your email
              </Text>
              <Text style={[styles.stepHint, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
                We'll find your store automatically
              </Text>

              <View style={[styles.inputWrap, { borderColor: error ? colors.destructive : colors.border, backgroundColor: colors.muted, borderRadius: colors.radius }]}>
                <Ionicons name="mail-outline" size={20} color={colors.mutedForeground} style={styles.inputIcon} />
                <TextInput
                  style={[styles.emailInput, { color: colors.foreground, fontFamily: 'Inter_400Regular' }]}
                  value={email}
                  onChangeText={v => { setEmail(v); setError(''); }}
                  placeholder="you@example.com"
                  placeholderTextColor={colors.mutedForeground}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="next"
                  onSubmitEditing={handleEmailContinue}
                />
              </View>

              {error ? (
                <Text style={[styles.errorText, { color: colors.destructive, fontFamily: 'Inter_400Regular' }]}>{error}</Text>
              ) : null}

              <TouchableOpacity
                onPress={handleEmailContinue}
                style={[styles.continueBtn, { backgroundColor: colors.primary, borderRadius: colors.radius }]}
                activeOpacity={0.85}
              >
                <Text style={[styles.continueBtnText, { fontFamily: 'Inter_700Bold' }]}>Continue</Text>
                <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </Animated.View>
          ) : (
            /* ── Step 2: PIN ── */
            <Animated.View style={[styles.stepView, { transform: [{ translateY: slideAnim }] }]}>
              <Text style={[styles.stepTitle, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>
                Enter your PIN
              </Text>
              <Text style={[styles.stepHint, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]} numberOfLines={1}>
                {email}
              </Text>

              <Animated.View style={[styles.dotsRow, { transform: [{ translateX: shakeAnim }] }]}>
                {Array.from({ length: PIN_LENGTH }).map((_, i) => (
                  <View
                    key={i}
                    style={[
                      styles.dot,
                      {
                        backgroundColor: i < pin.length ? colors.primary : colors.border,
                        borderColor: i < pin.length ? colors.primary : colors.border,
                        transform: [{ scale: i < pin.length ? 1.2 : 1 }],
                      },
                    ]}
                  />
                ))}
              </Animated.View>

              {error ? (
                <Text style={[styles.errorText, { color: colors.destructive, fontFamily: 'Inter_400Regular' }]}>{error}</Text>
              ) : (
                <Text style={[styles.errorText, { color: 'transparent' }]}>_</Text>
              )}

              <View style={styles.pad}>
                {PAD.map((k, i) => (
                  <TouchableOpacity
                    key={i}
                    style={[
                      styles.padKey,
                      {
                        backgroundColor: k === '⌫' ? colors.muted : k === '' ? 'transparent' : colors.background,
                        borderColor: k === '' || k === '⌫' ? 'transparent' : colors.border,
                        borderRadius: colors.radius + 4,
                        shadowColor: k === '' || k === '⌫' ? 'transparent' : '#000',
                        shadowOpacity: 0.06,
                        shadowRadius: 4,
                        shadowOffset: { width: 0, height: 2 },
                        elevation: k === '' || k === '⌫' ? 0 : 2,
                      },
                    ]}
                    onPress={() => handleKey(k)}
                    activeOpacity={k === '' ? 1 : 0.7}
                    disabled={loading || k === ''}
                  >
                    {k === '⌫' ? (
                      <Ionicons name="backspace-outline" size={22} color={colors.foreground} />
                    ) : k !== '' ? (
                      <Text style={[styles.padKeyText, { color: colors.foreground, fontFamily: 'Inter_500Medium' }]}>{k}</Text>
                    ) : null}
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                onPress={() => { setStep('email'); setPin(''); setError(''); }}
                style={styles.backBtn}
              >
                <Ionicons name="arrow-back-outline" size={16} color={colors.primary} />
                <Text style={[styles.backBtnText, { color: colors.primary, fontFamily: 'Inter_500Medium' }]}>
                  Change email
                </Text>
              </TouchableOpacity>
            </Animated.View>
          )}
        </View>

        {/* Create store link */}
        <TouchableOpacity
          onPress={() => router.push('/onboarding')}
          style={styles.adminLink}
        >
          <Ionicons name="storefront-outline" size={14} color={colors.mutedForeground} />
          <Text style={[styles.adminLinkText, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
            Don't have a store?{' '}
            <Text style={{ color: colors.primary, fontFamily: 'Inter_600SemiBold' }}>Create one</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  hero: {
    paddingTop: Platform.OS === 'web' ? 80 : 80,
    paddingBottom: 40,
    paddingHorizontal: 24,
    alignItems: 'center',
    gap: 8,
  },
  heroIcon: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  heroTitle: { fontSize: 24, color: '#FFFFFF' },
  heroSub: { fontSize: 14, color: 'rgba(255,255,255,0.75)' },
  scroll: { flex: 1, marginTop: -20 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40, gap: 16 },
  sheet: {
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  stepIndicatorRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 24, gap: 0 },
  stepDot: { width: 10, height: 10, borderRadius: 5 },
  stepLine: { flex: 1, height: 2, marginHorizontal: 6 },
  stepView: { gap: 12 },
  stepTitle: { fontSize: 22 },
  stepHint: { fontSize: 14, marginBottom: 4 },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    paddingHorizontal: 14,
    height: 52,
    gap: 10,
  },
  inputIcon: {},
  emailInput: { flex: 1, fontSize: 16, height: '100%' },
  errorText: { fontSize: 13, textAlign: 'center' },
  continueBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    gap: 10,
    marginTop: 4,
  },
  continueBtnText: { fontSize: 16, color: '#FFFFFF' },
  dotsRow: { flexDirection: 'row', gap: 20, justifyContent: 'center', marginVertical: 8 },
  dot: { width: 18, height: 18, borderRadius: 9, borderWidth: 2 },
  pad: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 10,
    width: '100%', maxWidth: 300, alignSelf: 'center',
    justifyContent: 'center', marginTop: 4,
  },
  padKey: { width: 80, height: 60, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  padKeyText: { fontSize: 22 },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center', marginTop: 8 },
  backBtnText: { fontSize: 14 },
  adminLink: { flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center', paddingVertical: 8 },
  adminLinkText: { fontSize: 13 },
});
