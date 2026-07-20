import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
  const { login, storeSettings } = useApp();
  const router = useRouter();
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
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

  const handleKey = async (key: string) => {
    if (key === '⌫') {
      setPin(p => p.slice(0, -1));
      setError('');
      return;
    }
    if (key === '') return;
    if (pin.length >= PIN_LENGTH) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newPin = pin + key;
    setPin(newPin);
    setError('');

    if (newPin.length === PIN_LENGTH) {
      setLoading(true);
      await new Promise(r => setTimeout(r, 300));
      const ok = await login(newPin);
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

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={['#1A56DB', '#0F3A9E']}
        style={styles.hero}
      >
        <View style={[styles.logoCircle, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
          <Ionicons name="storefront" size={44} color="#FFFFFF" />
        </View>
        <Text style={[styles.storeName, { fontFamily: 'Inter_700Bold' }]}>{storeSettings.name}</Text>
        <Text style={[styles.storeTagline, { fontFamily: 'Inter_400Regular' }]}>Point of Sale</Text>
      </LinearGradient>

      <View style={[styles.sheet, { backgroundColor: colors.card }]}>
        <Text style={[styles.greeting, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>Welcome back</Text>
        <Text style={[styles.hint, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>Enter your 4-digit PIN to continue</Text>

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
          <Text style={[styles.errorPlaceholder, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>Demo PIN: 1234</Text>
        )}

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
                },
              ]}
              onPress={() => handleKey(key)}
              activeOpacity={key === '' ? 1 : 0.7}
              disabled={loading || key === ''}
            >
              {key === '⌫' ? (
                <Ionicons name="backspace-outline" size={22} color={colors.foreground} />
              ) : (
                <Text style={[styles.padKeyText, { color: colors.foreground, fontFamily: 'Inter_500Medium' }]}>{key}</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  hero: {
    paddingTop: Platform.OS === 'web' ? 100 : 80,
    paddingBottom: 50,
    alignItems: 'center',
    gap: 12,
  },
  logoCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  storeName: {
    fontSize: 26,
    color: '#FFFFFF',
  },
  storeTagline: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
  },
  sheet: {
    flex: 1,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    marginTop: -20,
    paddingTop: 32,
    paddingHorizontal: 32,
    paddingBottom: Platform.OS === 'web' ? 34 : 0,
    alignItems: 'center',
    gap: 8,
  },
  greeting: {
    fontSize: 22,
  },
  hint: {
    fontSize: 14,
    marginBottom: 8,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 20,
    marginVertical: 12,
  },
  dot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
  },
  error: {
    fontSize: 13,
    marginBottom: 4,
  },
  errorPlaceholder: {
    fontSize: 13,
    marginBottom: 4,
  },
  pad: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    width: '100%',
    maxWidth: 300,
    marginTop: 12,
    justifyContent: 'center',
  },
  padKey: {
    width: 82,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  padKeyText: {
    fontSize: 24,
  },
});
