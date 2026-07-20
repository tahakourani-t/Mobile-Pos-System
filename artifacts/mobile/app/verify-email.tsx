import React, { useState, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  TextInput, KeyboardAvoidingView, Platform, ScrollView, Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useColors } from '@/hooks/useColors';
import * as api from '@/lib/api';

export default function VerifyEmailScreen() {
  const colors = useColors();
  const router = useRouter();
  const { storeId, email } = useLocalSearchParams<{ storeId: string; email: string }>();

  const [code, setCode]         = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [resending, setResending] = useState(false);
  const [success, setSuccess]   = useState(false);

  const shakeAnim = useRef(new Animated.Value(0)).current;

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

  const handleVerify = async () => {
    if (code.length !== 6) {
      setError('Please enter the 6-digit code.');
      return;
    }
    if (!storeId) {
      setError('Missing store ID. Please go back and try again.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await api.auth.verifyEmail(storeId, code);
      setSuccess(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: any) {
      shake();
      setError(e?.message ?? 'Invalid or expired code.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!storeId) return;
    setResending(true);
    setError('');
    try {
      await api.auth.resendVerification(storeId);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setError('');
      setCode('');
    } catch (e: any) {
      setError(e?.message ?? 'Could not resend. Try again.');
    } finally {
      setResending(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <LinearGradient colors={['#1A56DB', '#0F3A9E']} style={styles.hero}>
        <View style={[styles.heroIcon, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
          <Ionicons name="mail" size={40} color="#FFFFFF" />
        </View>
        <Text style={[styles.heroTitle, { fontFamily: 'Inter_700Bold' }]}>Verify your email</Text>
        <Text style={[styles.heroSub, { fontFamily: 'Inter_400Regular' }]}>
          {email ? `We sent a code to ${email}` : 'Check your inbox for the verification code'}
        </Text>
      </LinearGradient>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.sheet, { backgroundColor: colors.card }]}>
          {success ? (
            <View style={styles.successWrap}>
              <View style={[styles.successIcon, { backgroundColor: '#dcfce7' }]}>
                <Ionicons name="checkmark-circle" size={48} color="#16a34a" />
              </View>
              <Text style={[styles.successTitle, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>
                Email verified!
              </Text>
              <Text style={[styles.successSub, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
                Your store is now active. You can sign in.
              </Text>
              <TouchableOpacity
                style={[styles.continueBtn, { backgroundColor: colors.primary, borderRadius: colors.radius }]}
                onPress={() => router.replace('/login')}
                activeOpacity={0.85}
              >
                <Text style={[styles.continueBtnText, { fontFamily: 'Inter_700Bold' }]}>Go to Login</Text>
                <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          ) : (
            <Animated.View style={[styles.form, { transform: [{ translateX: shakeAnim }] }]}>
              <Text style={[styles.label, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>
                Verification Code
              </Text>
              <Text style={[styles.hint, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
                Enter the 6-digit code from your email. It expires in 30 minutes.
              </Text>

              <View style={[styles.inputWrap, {
                borderColor: error ? colors.destructive : colors.border,
                backgroundColor: colors.muted,
                borderRadius: colors.radius,
              }]}>
                <Ionicons name="keypad-outline" size={20} color={colors.mutedForeground} style={styles.inputIcon} />
                <TextInput
                  style={[styles.codeInput, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}
                  value={code}
                  onChangeText={(v) => { setCode(v.replace(/\D/g, '').slice(0, 6)); setError(''); }}
                  placeholder="123456"
                  placeholderTextColor={colors.mutedForeground}
                  keyboardType="number-pad"
                  returnKeyType="done"
                  onSubmitEditing={handleVerify}
                  maxLength={6}
                />
              </View>

              {error ? (
                <Text style={[styles.errorText, { color: colors.destructive, fontFamily: 'Inter_400Regular' }]}>
                  {error}
                </Text>
              ) : null}

              <TouchableOpacity
                style={[styles.continueBtn, {
                  backgroundColor: loading ? colors.muted : colors.primary,
                  borderRadius: colors.radius,
                }]}
                onPress={handleVerify}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading ? (
                  <Text style={[styles.continueBtnText, { fontFamily: 'Inter_700Bold', color: colors.mutedForeground }]}>
                    Verifying…
                  </Text>
                ) : (
                  <>
                    <Text style={[styles.continueBtnText, { fontFamily: 'Inter_700Bold' }]}>Verify Email</Text>
                    <Ionicons name="checkmark" size={20} color="#FFFFFF" />
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.resendBtn}
                onPress={handleResend}
                disabled={resending}
                activeOpacity={0.7}
              >
                <Ionicons name="refresh-outline" size={14} color={colors.primary} />
                <Text style={[styles.resendText, { color: colors.primary, fontFamily: 'Inter_500Medium' }]}>
                  {resending ? 'Sending…' : 'Resend code'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.backBtn}
                onPress={() => router.replace('/login')}
                activeOpacity={0.7}
              >
                <Ionicons name="arrow-back-outline" size={14} color={colors.mutedForeground} />
                <Text style={[styles.backBtnText, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
                  Back to login
                </Text>
              </TouchableOpacity>
            </Animated.View>
          )}
        </View>
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
  heroSub: { fontSize: 14, color: 'rgba(255,255,255,0.75)', textAlign: 'center' },
  scroll: { flex: 1, marginTop: -20 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40, gap: 16 },
  sheet: {
    borderRadius: 20, padding: 24,
    shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 }, elevation: 4,
  },
  form: { gap: 12 },
  label: { fontSize: 18 },
  hint: { fontSize: 14, marginBottom: 4 },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, paddingHorizontal: 14, height: 56, gap: 10,
  },
  inputIcon: {},
  codeInput: { flex: 1, fontSize: 28, letterSpacing: 8 },
  errorText: { fontSize: 13 },
  continueBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    height: 52, gap: 10, marginTop: 4,
  },
  continueBtnText: { fontSize: 16, color: '#FFFFFF' },
  resendBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center', paddingVertical: 8 },
  resendText: { fontSize: 14 },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center', paddingVertical: 4 },
  backBtnText: { fontSize: 13 },
  successWrap: { gap: 16, alignItems: 'center' },
  successIcon: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center' },
  successTitle: { fontSize: 22 },
  successSub: { fontSize: 14, textAlign: 'center' },
});
