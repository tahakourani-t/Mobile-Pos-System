import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useApp } from '@/contexts/AppContext';
import { useTranslation } from '@/hooks/useTranslation';

export default function MoreScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, unreadCount, logout, trialDaysLeft, trialExpired } = useApp();
  const { t } = useTranslation();

  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  const menuItems = [
    { label: t('inventory'),      icon: 'layers-outline' as const,        route: '/inventory',      color: '#3B82F6' },
    { label: t('customers'),      icon: 'people-outline' as const,        route: '/customers',      color: '#10B981' },
    { label: t('reports'),        icon: 'bar-chart-outline' as const,     route: '/reports',        color: '#8B5CF6' },
    { label: t('expenses'),       icon: 'wallet-outline' as const,        route: '/expenses',       color: '#EF4444' },
    { label: 'Invoices',          icon: 'receipt-outline' as const,       route: '/invoices',       color: '#0EA5E9' },
    { label: t('notifications'),  icon: 'notifications-outline' as const, route: '/notifications',  color: '#F59E0B', badge: unreadCount },
    { label: t('settings'),       icon: 'settings-outline' as const,      route: '/settings',       color: '#64748B' },
  ];

  const handleLogout = () => {
    Alert.alert(t('signOut'), t('signOutConfirm'), [
      { text: t('cancel'), style: 'cancel' },
      { text: t('signOut'), style: 'destructive', onPress: logout },
    ]);
  };

  const roleLabel = user?.role === 'admin' ? t('admin') : user?.role === 'manager' ? t('manager') : t('cashier');

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <LinearGradient colors={['#1A56DB', '#0F3A9E']} style={[styles.profileHero, { paddingTop: topPad + 16 }]}>
        <View style={[styles.avatar, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
          <Ionicons name="person" size={32} color="#FFFFFF" />
        </View>
        <Text style={[styles.userName, { fontFamily: 'Inter_700Bold' }]}>{user?.name ?? 'User'}</Text>
        <Text style={[styles.userRole, { fontFamily: 'Inter_400Regular' }]}>{roleLabel}</Text>
        {!trialExpired && (
          <View style={[styles.trialPill, { backgroundColor: trialDaysLeft <= 3 ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.15)' }]}>
            <Ionicons name="time-outline" size={12} color="#FFFFFF" />
            <Text style={[styles.trialPillText, { fontFamily: 'Inter_500Medium' }]}>
              {trialDaysLeft <= 1 ? t('trialLastDay') : t('trialBanner', { days: trialDaysLeft })}
            </Text>
          </View>
        )}
      </LinearGradient>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: Platform.OS === 'web' ? 34 : 100 }]} showsVerticalScrollIndicator={false}>
        <View style={styles.grid}>
          {menuItems.map(item => (
            <TouchableOpacity
              key={item.label}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push(item.route as any); }}
              style={[styles.menuCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius + 2 }]}
              activeOpacity={0.75}
            >
              <View style={[styles.menuIcon, { backgroundColor: item.color + '18', borderRadius: 14 }]}>
                <Ionicons name={item.icon} size={24} color={item.color} />
              </View>
              <Text style={[styles.menuLabel, { color: colors.foreground, fontFamily: 'Inter_500Medium' }]}>{item.label}</Text>
              {item.badge && item.badge > 0 ? (
                <View style={[styles.menuBadge, { backgroundColor: colors.destructive }]}>
                  <Text style={[styles.menuBadgeText, { fontFamily: 'Inter_700Bold' }]}>{item.badge}</Text>
                </View>
              ) : null}
            </TouchableOpacity>
          ))}
        </View>

        {/* Trial / Subscribe CTA */}
        {!trialExpired && trialDaysLeft <= 7 && (
          <TouchableOpacity
            onPress={() => router.push('/paywall')}
            style={[styles.subscribeCta, { backgroundColor: colors.primary + '12', borderColor: colors.primary + '40', borderRadius: colors.radius }]}
          >
            <Ionicons name="star-outline" size={20} color={colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.ctaTitle, { color: colors.primary, fontFamily: 'Inter_600SemiBold' }]}>{t('subscribeNow')}</Text>
              <Text style={[styles.ctaSub, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>{t('contactViaWhatsApp')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.primary} />
          </TouchableOpacity>
        )}

        <TouchableOpacity
          onPress={handleLogout}
          style={[styles.logoutBtn, { backgroundColor: colors.destructive + '12', borderColor: colors.destructive + '30', borderRadius: colors.radius }]}
        >
          <Ionicons name="log-out-outline" size={20} color={colors.destructive} />
          <Text style={[styles.logoutText, { color: colors.destructive, fontFamily: 'Inter_600SemiBold' }]}>{t('signOut')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  profileHero: { paddingHorizontal: 24, paddingBottom: 28, alignItems: 'center', gap: 6 },
  avatar: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  userName: { fontSize: 22, color: '#FFFFFF' },
  userRole: { fontSize: 14, color: 'rgba(255,255,255,0.7)' },
  trialPill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 100, marginTop: 4 },
  trialPillText: { fontSize: 12, color: '#FFFFFF' },
  content: { padding: 16, gap: 16 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  menuCard: { width: '47%', padding: 18, borderWidth: 1, gap: 10, position: 'relative' },
  menuIcon: { width: 52, height: 52, alignItems: 'center', justifyContent: 'center' },
  menuLabel: { fontSize: 14 },
  menuBadge: { position: 'absolute', top: 8, right: 8, width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  menuBadgeText: { fontSize: 10, color: '#FFFFFF' },
  subscribeCta: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderWidth: 1 },
  ctaTitle: { fontSize: 15 },
  ctaSub: { fontSize: 12, marginTop: 2 },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 16, borderWidth: 1 },
  logoutText: { fontSize: 16 },
});
