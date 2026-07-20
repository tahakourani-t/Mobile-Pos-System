import React, { useState, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Animated,
  Platform, Image, ScrollView, FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useColors } from '@/hooks/useColors';
import { useApp } from '@/contexts/AppContext';
import type { StoreProfile } from '@/types';

const PIN_LENGTH = 4;
const PAD = ['1','2','3','4','5','6','7','8','9','','0','⌫'];

export default function LoginScreen() {
  const colors = useColors();
  const { login, storeProfiles } = useApp();
  const router = useRouter();

  // If there's only one store, pre-select it; else show the picker
  const [selectedStore, setSelectedStore] = useState<StoreProfile | null>(
    storeProfiles.length === 1 ? storeProfiles[0] : null
  );
  const [pin, setPin]       = useState('');
  const [error, setError]   = useState('');
  const [loading, setLoading] = useState(false);

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

  const selectStore = (profile: StoreProfile) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    slideAnim.setValue(40);
    setSelectedStore(profile);
    setPin('');
    setError('');
    Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 80, friction: 10 }).start();
  };

  const handleKey = async (key: string) => {
    if (!selectedStore) return;
    if (key === '⌫') { setPin(p => p.slice(0, -1)); setError(''); return; }
    if (key === '' || pin.length >= PIN_LENGTH) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newPin = pin + key;
    setPin(newPin);
    setError('');

    if (newPin.length === PIN_LENGTH) {
      setLoading(true);
      await new Promise(r => setTimeout(r, 300));
      const ok = await login(selectedStore.storeId, newPin);
      setLoading(false);
      if (ok) {
        router.replace('/(tabs)');
      } else {
        shake();
        setError('Incorrect PIN. Try again.');
        setPin('');
      }
    }
  };

  // ── Store Picker ──────────────────────────────────────────────────────────
  if (!selectedStore) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <LinearGradient colors={['#1A56DB', '#0F3A9E']} style={styles.hero}>
          <View style={[styles.heroIcon, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
            <Ionicons name="storefront" size={40} color="#FFFFFF" />
          </View>
          <Text style={[styles.heroTitle, { fontFamily: 'Inter_700Bold' }]}>Select Your Store</Text>
          <Text style={[styles.heroSub, { fontFamily: 'Inter_400Regular' }]}>
            {storeProfiles.length} stores registered on this device
          </Text>
        </LinearGradient>

        <View style={[styles.sheet, { backgroundColor: colors.background }]}>
          <Text style={[styles.pickerLabel, { color: colors.mutedForeground, fontFamily: 'Inter_500Medium' }]}>
            TAP YOUR STORE TO SIGN IN
          </Text>
          <FlatList
            data={storeProfiles}
            keyExtractor={p => p.storeId}
            numColumns={2}
            columnWrapperStyle={{ gap: 12 }}
            contentContainerStyle={{ gap: 12, paddingBottom: 60 }}
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => selectStore(item)}
                style={[styles.storeCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}
                activeOpacity={0.82}
              >
                {item.logoUri ? (
                  <Image source={{ uri: item.logoUri }} style={styles.storeCardLogo} resizeMode="cover" />
                ) : (
                  <View style={[styles.storeCardIconWrap, { backgroundColor: colors.primary + '18', borderRadius: 24 }]}>
                    <Ionicons name="storefront-outline" size={32} color={colors.primary} />
                  </View>
                )}
                <Text style={[styles.storeCardName, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]} numberOfLines={2}>
                  {item.name}
                </Text>
                <View style={[styles.storeCardBadge, { backgroundColor: colors.primary + '15', borderRadius: 20 }]}>
                  <Text style={[styles.storeCardBadgeText, { color: colors.primary, fontFamily: 'Inter_500Medium' }]}>
                    Tap to enter PIN
                  </Text>
                </View>
              </TouchableOpacity>
            )}
          />

          <TouchableOpacity
            onPress={() => router.push('/onboarding')}
            style={[styles.addStoreBtn, { borderColor: colors.border, borderRadius: colors.radius }]}
          >
            <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
            <Text style={[styles.addStoreBtnText, { color: colors.primary, fontFamily: 'Inter_500Medium' }]}>
              Add Another Store
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── PIN Entry ─────────────────────────────────────────────────────────────
  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <LinearGradient colors={['#1A56DB', '#0F3A9E']} style={styles.hero}>
        {selectedStore.logoUri ? (
          <Image source={{ uri: selectedStore.logoUri }} style={styles.storeLogo} />
        ) : (
          <View style={[styles.logoCircle, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
            <Ionicons name="storefront" size={44} color="#FFFFFF" />
          </View>
        )}
        <Text style={[styles.storeName, { fontFamily: 'Inter_700Bold' }]}>{selectedStore.name}</Text>
        <Text style={[styles.storeTagline, { fontFamily: 'Inter_400Regular' }]}>Point of Sale</Text>
      </LinearGradient>

      <Animated.View style={[styles.sheet, { backgroundColor: colors.card, transform: [{ translateY: slideAnim }] }]}>
        <Text style={[styles.greeting, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>Welcome back</Text>
        <Text style={[styles.hint, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
          Enter your 4-digit PIN to continue
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
                  transform: [{ scale: i < pin.length ? 1.15 : 1 }],
                },
              ]}
            />
          ))}
        </Animated.View>

        {error ? (
          <Text style={[styles.error, { color: colors.destructive, fontFamily: 'Inter_400Regular' }]}>{error}</Text>
        ) : (
          <Text style={[styles.error, { color: 'transparent' }]}>_</Text>
        )}

        <View style={styles.pad}>
          {PAD.map((k, i) => (
            <TouchableOpacity
              key={i}
              style={[
                styles.padKey,
                {
                  backgroundColor: k === '⌫' ? colors.muted : k === '' ? 'transparent' : colors.card,
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

        {/* Switch store — only show if multiple stores exist */}
        {storeProfiles.length > 1 && (
          <TouchableOpacity onPress={() => setSelectedStore(null)} style={styles.switchStoreBtn}>
            <Ionicons name="swap-horizontal-outline" size={16} color={colors.primary} />
            <Text style={[styles.switchStoreText, { color: colors.primary, fontFamily: 'Inter_500Medium' }]}>
              Switch Store
            </Text>
          </TouchableOpacity>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  hero: {
    paddingTop: Platform.OS === 'web' ? 80 : 80,
    paddingBottom: 36,
    paddingHorizontal: 24,
    alignItems: 'center',
    gap: 6,
  },
  heroIcon: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  heroTitle: { fontSize: 22, color: '#FFFFFF' },
  heroSub: { fontSize: 14, color: 'rgba(255,255,255,0.75)', textAlign: 'center', marginTop: 2 },
  sheet: {
    flex: 1,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    marginTop: -20,
    paddingTop: 32,
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === 'web' ? 34 : 0,
    alignItems: 'center',
    gap: 8,
  },
  // Store picker
  pickerLabel: { fontSize: 11, letterSpacing: 1, marginBottom: 16, alignSelf: 'flex-start' },
  storeCard: {
    flex: 1,
    padding: 16,
    borderWidth: 1,
    alignItems: 'center',
    gap: 10,
    minHeight: 150,
    justifyContent: 'center',
  },
  storeCardLogo: { width: 56, height: 56, borderRadius: 28 },
  storeCardIconWrap: { width: 56, height: 56, alignItems: 'center', justifyContent: 'center' },
  storeCardName: { fontSize: 15, textAlign: 'center' },
  storeCardBadge: { paddingHorizontal: 10, paddingVertical: 4 },
  storeCardBadgeText: { fontSize: 12 },
  addStoreBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 1, paddingVertical: 14, paddingHorizontal: 24,
    width: '100%', justifyContent: 'center', marginTop: 8,
  },
  addStoreBtnText: { fontSize: 15 },
  // PIN view
  logoCircle: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center' },
  storeLogo: { width: 80, height: 80, borderRadius: 40 },
  storeName: { fontSize: 22, color: '#FFFFFF' },
  storeTagline: { fontSize: 14, color: 'rgba(255,255,255,0.75)' },
  greeting: { fontSize: 22 },
  hint: { fontSize: 14, marginBottom: 8 },
  dotsRow: { flexDirection: 'row', gap: 20, marginVertical: 12 },
  dot: { width: 18, height: 18, borderRadius: 9, borderWidth: 2 },
  error: { fontSize: 13, marginBottom: 4 },
  pad: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 12,
    width: '100%', maxWidth: 300, marginTop: 12, justifyContent: 'center',
  },
  padKey: { width: 82, height: 64, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  padKeyText: { fontSize: 24 },
  switchStoreBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12 },
  switchStoreText: { fontSize: 14 },
});
