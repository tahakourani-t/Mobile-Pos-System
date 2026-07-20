import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Image, Animated, Platform, Alert, KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useColors } from '@/hooks/useColors';
import { useApp } from '@/contexts/AppContext';

const PIN_LENGTH = 4;
const PAD = ['1','2','3','4','5','6','7','8','9','','0','⌫'];

type Step = 'store' | 'pin' | 'confirm';

// Generate a simple unique store ID
const genStoreId = () =>
  Date.now().toString(36) + Math.random().toString(36).substr(2, 6);

export default function OnboardingScreen() {
  const colors  = useColors();
  const router  = useRouter();
  const { completeOnboarding } = useApp();

  const [storeName, setStoreName] = useState('');
  const [email, setEmail]         = useState('');
  const [location, setLocation]   = useState('');
  const [phone, setPhone]         = useState('');
  const [logoUri, setLogoUri]     = useState<string | null>(null);

  const [step, setStep]           = useState<Step>('store');
  const [pin, setPin]             = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinError, setPinError]   = useState('');
  const [saving, setSaving]       = useState(false);

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

  const goToStep = (next: Step) => {
    Animated.timing(slideAnim, { toValue: -30, duration: 120, useNativeDriver: true }).start(() => {
      setStep(next);
      slideAnim.setValue(30);
      Animated.timing(slideAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start();
    });
  };

  const handleStoreNext = () => {
    if (!storeName.trim()) { Alert.alert('Required', 'Please enter your store name.'); return; }
    if (!phone.trim())     { Alert.alert('Required', 'Please enter your phone number.'); return; }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    goToStep('pin');
  };

  const pickLogo = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission needed', 'Allow access to pick a logo.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, aspect: [1, 1], quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) setLogoUri(result.assets[0].uri);
  };

  const handlePinKey = (key: string, isConfirm: boolean) => {
    setPinError('');
    const current = isConfirm ? confirmPin : pin;
    const setter  = isConfirm ? setConfirmPin : setPin;

    if (key === '⌫') { setter(current.slice(0, -1)); return; }
    if (key === '' || current.length >= PIN_LENGTH) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const next = current + key;
    setter(next);

    if (next.length === PIN_LENGTH) {
      if (!isConfirm) {
        setTimeout(() => goToStep('confirm'), 200);
      } else {
        if (next !== pin) {
          shake();
          setPinError('PINs do not match. Try again.');
          setConfirmPin('');
        } else {
          finishSetup(next);
        }
      }
    }
  };

  const finishSetup = async (finalPin: string) => {
    setSaving(true);
    try {
      const storeId = genStoreId();
      await completeOnboarding(storeId, finalPin, {
        name:     storeName.trim(),
        email:    email.trim(),
        address:  location.trim(),
        phone:    phone.trim(),
        currency: 'LBP',
        logoUri:  logoUri ?? undefined,
      } as any);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace('/(tabs)');
    } catch {
      Alert.alert('Error', 'Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const currentPin = step === 'confirm' ? confirmPin : pin;
  const isConfirm  = step === 'confirm';

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Gradient header */}
      <LinearGradient colors={['#1A56DB', '#0F3A9E']} style={styles.hero}>
        <View style={[styles.heroIcon, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
          <Ionicons name="storefront" size={36} color="#FFFFFF" />
        </View>
        <Text style={[styles.heroTitle, { fontFamily: 'Inter_700Bold' }]}>Set up your store</Text>
        <Text style={[styles.heroSub, { fontFamily: 'Inter_400Regular' }]}>
          {step === 'store' ? 'Tell us about your business' : step === 'pin' ? 'Choose a 4-digit PIN to secure your POS' : 'Confirm your PIN'}
        </Text>
        <View style={styles.stepDots}>
          {(['store','pin','confirm'] as Step[]).map(s => (
            <View key={s} style={[styles.stepDot, { backgroundColor: step === s ? '#FFFFFF' : 'rgba(255,255,255,0.35)', width: step === s ? 20 : 8 }]} />
          ))}
        </View>
      </LinearGradient>

      <Animated.View style={[styles.sheet, { backgroundColor: colors.card, transform: [{ translateX: slideAnim }] }]}>

        {/* ── Step 1: Store Info ── */}
        {step === 'store' && (
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
            <ScrollView contentContainerStyle={styles.formContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

              {/* Logo picker */}
              <TouchableOpacity onPress={pickLogo} style={styles.logoPicker} activeOpacity={0.8}>
                {logoUri ? (
                  <Image source={{ uri: logoUri }} style={styles.logoImg} />
                ) : (
                  <View style={[styles.logoPlaceholder, { backgroundColor: colors.muted, borderColor: colors.border }]}>
                    <Ionicons name="camera-outline" size={28} color={colors.mutedForeground} />
                    <Text style={[styles.logoHint, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>Add logo</Text>
                    <Text style={[styles.logoSub, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>(optional)</Text>
                  </View>
                )}
                {logoUri && (
                  <View style={[styles.logoEditBadge, { backgroundColor: colors.primary }]}>
                    <Ionicons name="pencil" size={12} color="#FFFFFF" />
                  </View>
                )}
              </TouchableOpacity>

              {[
                { label: 'Store Name *',       placeholder: 'e.g. Abu Ali Supermarket',      value: storeName, onChange: setStoreName, kb: 'default' as const,       icon: 'storefront-outline' as const },
                { label: 'Phone Number *',     placeholder: '+961 xx xxx xxx',               value: phone,     onChange: setPhone,     kb: 'phone-pad' as const,      icon: 'call-outline' as const },
                { label: 'Email',              placeholder: 'store@email.com',               value: email,     onChange: setEmail,     kb: 'email-address' as const,  icon: 'mail-outline' as const },
                { label: 'Street / Location',  placeholder: 'e.g. Hamra Street, Beirut',     value: location,  onChange: setLocation,  kb: 'default' as const,        icon: 'location-outline' as const },
              ].map(f => (
                <View key={f.label} style={styles.fieldGroup}>
                  <Text style={[styles.fieldLabel, { color: colors.mutedForeground, fontFamily: 'Inter_500Medium' }]}>{f.label}</Text>
                  <View style={[styles.fieldRow, { backgroundColor: colors.muted, borderColor: colors.border, borderRadius: colors.radius - 2 }]}>
                    <Ionicons name={f.icon} size={18} color={colors.mutedForeground} style={styles.fieldIcon} />
                    <TextInput
                      style={[styles.fieldInput, { color: colors.foreground, fontFamily: 'Inter_400Regular' }]}
                      value={f.value}
                      onChangeText={f.onChange}
                      placeholder={f.placeholder}
                      placeholderTextColor={colors.mutedForeground}
                      keyboardType={f.kb}
                      autoCapitalize={f.kb === 'email-address' ? 'none' : 'words'}
                    />
                  </View>
                </View>
              ))}

              <TouchableOpacity
                onPress={handleStoreNext}
                style={[styles.nextBtn, { backgroundColor: colors.primary, borderRadius: colors.radius }]}
                activeOpacity={0.85}
              >
                <Text style={[styles.nextBtnText, { fontFamily: 'Inter_700Bold' }]}>Continue</Text>
                <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </ScrollView>
          </KeyboardAvoidingView>
        )}

        {/* ── Step 2 & 3: PIN ── */}
        {(step === 'pin' || step === 'confirm') && (
          <View style={styles.pinContent}>
            <Text style={[styles.pinTitle, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>
              {isConfirm ? 'Confirm your PIN' : 'Create a PIN'}
            </Text>
            <Text style={[styles.pinSub, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
              {isConfirm ? 'Enter the same PIN again to confirm' : 'Your cashiers will use this to sign in'}
            </Text>

            <Animated.View style={[styles.dotsRow, { transform: [{ translateX: shakeAnim }] }]}>
              {Array.from({ length: PIN_LENGTH }).map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.dot,
                    {
                      backgroundColor: i < currentPin.length ? colors.primary : colors.border,
                      borderColor:     i < currentPin.length ? colors.primary : colors.border,
                      transform: [{ scale: i < currentPin.length ? 1.15 : 1 }],
                    },
                  ]}
                />
              ))}
            </Animated.View>

            {pinError
              ? <Text style={[styles.pinError, { color: colors.destructive, fontFamily: 'Inter_400Regular' }]}>{pinError}</Text>
              : <View style={{ height: 20 }} />
            }

            <View style={styles.pad}>
              {PAD.map((key, i) => (
                <TouchableOpacity
                  key={i}
                  style={[
                    styles.padKey,
                    {
                      backgroundColor: key === '⌫' ? colors.muted : key === '' ? 'transparent' : colors.card,
                      borderColor: key === '' || key === '⌫' ? 'transparent' : colors.border,
                      borderRadius: colors.radius + 4,
                      shadowColor: key === '' || key === '⌫' ? 'transparent' : '#000',
                      shadowOpacity: 0.06, shadowRadius: 4, shadowOffset: { width: 0, height: 2 },
                      elevation: key === '' || key === '⌫' ? 0 : 2,
                    },
                  ]}
                  onPress={() => handlePinKey(key, isConfirm)}
                  activeOpacity={key === '' ? 1 : 0.7}
                  disabled={saving || key === ''}
                >
                  {key === '⌫'
                    ? <Ionicons name="backspace-outline" size={22} color={colors.foreground} />
                    : key !== ''
                      ? <Text style={[styles.padKeyText, { color: colors.foreground, fontFamily: 'Inter_500Medium' }]}>{key}</Text>
                      : null
                  }
                </TouchableOpacity>
              ))}
            </View>

            {step === 'confirm' && (
              <TouchableOpacity onPress={() => { setPin(''); setConfirmPin(''); setPinError(''); goToStep('pin'); }} style={styles.backLink}>
                <Ionicons name="arrow-back-outline" size={16} color={colors.mutedForeground} />
                <Text style={[styles.backLinkText, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>Change PIN</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  hero: {
    paddingTop: Platform.OS === 'web' ? 60 : 64,
    paddingBottom: 32, paddingHorizontal: 24,
    alignItems: 'center', gap: 8,
  },
  heroIcon: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  heroTitle: { fontSize: 24, color: '#FFFFFF' },
  heroSub: { fontSize: 14, color: 'rgba(255,255,255,0.75)', textAlign: 'center' },
  stepDots: { flexDirection: 'row', gap: 6, marginTop: 12, alignItems: 'center' },
  stepDot: { height: 8, borderRadius: 4 },
  sheet: { flex: 1, borderTopLeftRadius: 28, borderTopRightRadius: 28, marginTop: -20, overflow: 'hidden' },
  formContent: { padding: 24, gap: 4, paddingBottom: 40 },
  logoPicker: { alignSelf: 'center', marginBottom: 20, position: 'relative' },
  logoPlaceholder: { width: 90, height: 90, borderRadius: 45, borderWidth: 2, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', gap: 2 },
  logoImg: { width: 90, height: 90, borderRadius: 45 },
  logoHint: { fontSize: 12 },
  logoSub: { fontSize: 11 },
  logoEditBadge: { position: 'absolute', bottom: 2, right: 2, width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  fieldGroup: { marginBottom: 14 },
  fieldLabel: { fontSize: 13, marginBottom: 6 },
  fieldRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, paddingHorizontal: 12, paddingVertical: 4 },
  fieldIcon: { marginRight: 8 },
  fieldInput: { flex: 1, fontSize: 15, paddingVertical: 12 },
  nextBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, height: 56, marginTop: 8 },
  nextBtnText: { fontSize: 17, color: '#FFFFFF' },
  pinContent: { flex: 1, alignItems: 'center', paddingTop: 28, paddingHorizontal: 24, gap: 6 },
  pinTitle: { fontSize: 20 },
  pinSub: { fontSize: 14, textAlign: 'center', marginBottom: 8 },
  dotsRow: { flexDirection: 'row', gap: 20, marginVertical: 12 },
  dot: { width: 18, height: 18, borderRadius: 9, borderWidth: 2 },
  pinError: { fontSize: 13 },
  pad: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, width: '100%', maxWidth: 300, marginTop: 12, justifyContent: 'center' },
  padKey: { width: 82, height: 64, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  padKeyText: { fontSize: 24 },
  backLink: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 16 },
  backLinkText: { fontSize: 14 },
});
