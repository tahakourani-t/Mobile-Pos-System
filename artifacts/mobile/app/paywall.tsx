import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking, Image, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useTranslation } from '@/hooks/useTranslation';

const WHATSAPP_NUMBER = '96171735478';

export default function PaywallScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { t, isRTL } = useTranslation();

  const openWhatsApp = () => {
    const msg = encodeURIComponent('Hello, I would like to subscribe to POS Mobile for $15/month.');
    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${msg}`;
    Linking.openURL(url).catch(() => Linking.openURL(`https://wa.me/${WHATSAPP_NUMBER}`));
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={['#1A56DB', '#0F3A9E', '#07235C']}
        style={[styles.hero, { paddingTop: insets.top + 24 }]}
      >
        <View style={[styles.iconWrap, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
          <Ionicons name="lock-closed" size={44} color="#FFFFFF" />
        </View>
        <Text style={[styles.heroTitle, { fontFamily: 'Inter_700Bold' }]}>{t('trialExpired')}</Text>
        <Text style={[styles.heroSub, { fontFamily: 'Inter_400Regular' }]}>{t('trialExpiredSub')}</Text>
      </LinearGradient>

      <View style={styles.body}>
        {/* Plan card */}
        <View style={[styles.planCard, { backgroundColor: colors.card, borderColor: colors.primary, borderRadius: colors.radius + 4 }]}>
          <View style={[styles.planBadge, { backgroundColor: colors.primary }]}>
            <Text style={[styles.planBadgeText, { fontFamily: 'Inter_600SemiBold' }]}>MONTHLY</Text>
          </View>
          <Text style={[styles.planPrice, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>$15</Text>
          <Text style={[styles.planPer, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>/month</Text>

          <View style={styles.features}>
            {[
              'Unlimited sales & orders',
              'Products & inventory management',
              'Customer & expense tracking',
              'Sales reports & analytics',
              'Receipt printing',
              'Arabic & English support',
            ].map(f => (
              <View key={f} style={styles.featureRow}>
                <View style={[styles.featureCheck, { backgroundColor: colors.success + '20' }]}>
                  <Ionicons name="checkmark" size={14} color={colors.success} />
                </View>
                <Text style={[styles.featureText, { color: colors.foreground, fontFamily: 'Inter_400Regular' }]}>{f}</Text>
              </View>
            ))}
          </View>
        </View>

        <Text style={[styles.contactHint, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
          {t('contactViaWhatsApp')}
        </Text>

        <TouchableOpacity
          onPress={openWhatsApp}
          style={[styles.whatsappBtn, { borderRadius: colors.radius }]}
          activeOpacity={0.85}
        >
          <LinearGradient colors={['#25D366', '#128C7E']} style={styles.whatsappGradient}>
            <Ionicons name="logo-whatsapp" size={24} color="#FFFFFF" />
            <Text style={[styles.whatsappBtnText, { fontFamily: 'Inter_700Bold' }]}>{t('whatsappSubscribe')}</Text>
          </LinearGradient>
        </TouchableOpacity>

        <Text style={[styles.phoneNum, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
          +{WHATSAPP_NUMBER}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  hero: { paddingHorizontal: 24, paddingBottom: 40, alignItems: 'center', gap: 16 },
  iconWrap: { width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center' },
  heroTitle: { fontSize: 26, color: '#FFFFFF', textAlign: 'center' },
  heroSub: { fontSize: 15, color: 'rgba(255,255,255,0.75)', textAlign: 'center', lineHeight: 22 },
  body: { flex: 1, padding: 24, gap: 16, alignItems: 'center' },
  planCard: { width: '100%', borderWidth: 2, padding: 24, alignItems: 'center', gap: 4, overflow: 'hidden' },
  planBadge: { position: 'absolute', top: 0, right: 0, paddingHorizontal: 12, paddingVertical: 4, borderBottomLeftRadius: 10 },
  planBadgeText: { fontSize: 11, color: '#FFFFFF', letterSpacing: 1 },
  planPrice: { fontSize: 52, lineHeight: 60 },
  planPer: { fontSize: 16, marginTop: -4 },
  features: { width: '100%', gap: 10, marginTop: 16 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  featureCheck: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  featureText: { fontSize: 14 },
  contactHint: { fontSize: 13, textAlign: 'center', lineHeight: 20 },
  whatsappBtn: { width: '100%', overflow: 'hidden' },
  whatsappGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 16 },
  whatsappBtnText: { fontSize: 17, color: '#FFFFFF' },
  phoneNum: { fontSize: 14 },
});
