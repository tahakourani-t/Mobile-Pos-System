import React, { useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useColors } from '@/hooks/useColors';
import { useApp } from '@/contexts/AppContext';
import { useData } from '@/contexts/DataContext';
import { useTranslation } from '@/hooks/useTranslation';
import StatCard from '@/components/StatCard';
import OrderCard from '@/components/OrderCard';
import SimpleChart from '@/components/SimpleChart';
import type { WeeklySalesPoint } from '@/types';

export default function DashboardScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, unreadCount, storeSettings, trialDaysLeft, trialExpired } = useApp();
  const { todaySales, todayOrders, todayProfit, orders, expenses } = useData();
  const { t, isRTL } = useTranslation();

  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  const todayExpenses = useMemo(() => {
    const today = new Date().toDateString();
    return expenses.filter(e => new Date(e.date).toDateString() === today).reduce((s, e) => s + e.amount, 0);
  }, [expenses]);

  const recentOrders = useMemo(() => orders.filter(o => o.status === 'completed').slice(0, 5), [orders]);

  // Compute last 7 days of sales from real orders
  const weeklySales = useMemo((): WeeklySalesPoint[] => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const result: WeeklySalesPoint[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayStr = d.toDateString();
      const sales = orders
        .filter(o => o.status === 'completed' && new Date(o.createdAt).toDateString() === dayStr)
        .reduce((s, o) => s + o.total, 0);
      result.push({ day: days[d.getDay()]!, sales });
    }
    return result;
  }, [orders]);

  const quickActions = [
    { label: t('newSale'),   icon: 'cart-outline' as const,      route: '/(tabs)/pos',    color: colors.primary },
    { label: t('products'),  icon: 'cube-outline' as const,      route: '/(tabs)/products', color: '#8B5CF6' },
    { label: t('customers'), icon: 'people-outline' as const,    route: '/customers',     color: '#F59E0B' },
    { label: t('reports'),   icon: 'bar-chart-outline' as const, route: '/reports',       color: colors.success },
  ];

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return t('goodMorning');
    if (h < 17) return t('goodAfternoon');
    return t('goodEvening');
  };

  const trialBannerText = trialDaysLeft <= 1
    ? t('trialLastDay')
    : t('trialBanner', { days: trialDaysLeft });

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingBottom: Platform.OS === 'web' ? 34 : 100 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Trial Banner */}
      {!trialExpired && trialDaysLeft <= 14 && (
        <TouchableOpacity
          onPress={() => router.push('/settings')}
          style={[styles.trialBanner, { backgroundColor: trialDaysLeft <= 3 ? colors.destructive : colors.warning }]}
        >
          <Ionicons name="time-outline" size={16} color="#FFFFFF" />
          <Text style={[styles.trialBannerText, { fontFamily: 'Inter_600SemiBold' }]}>{trialBannerText}</Text>
          <Ionicons name="chevron-forward" size={14} color="#FFFFFF" />
        </TouchableOpacity>
      )}

      {/* Header */}
      <LinearGradient colors={['#1A56DB', '#0F3A9E']} style={[styles.header, { paddingTop: topPad + 12 }]}>
        <View style={styles.headerRow}>
          <View>
            <Text style={[styles.greeting, { fontFamily: 'Inter_400Regular' }]}>{greeting()},</Text>
            <Text style={[styles.userName, { fontFamily: 'Inter_700Bold' }]}>{user?.name ?? 'Welcome'}</Text>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity onPress={() => router.push('/notifications')} style={styles.notifBtn}>
              <Ionicons name="notifications-outline" size={24} color="#FFFFFF" />
              {unreadCount > 0 && (
                <View style={[styles.notifBadge, { backgroundColor: colors.destructive }]}>
                  <Text style={[styles.notifBadgeText, { fontFamily: 'Inter_700Bold' }]}>{unreadCount}</Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/settings')} style={styles.settingsBtn}>
              <Ionicons name="settings-outline" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
        <Text style={[styles.storeName, { fontFamily: 'Inter_500Medium' }]}>{storeSettings.name}</Text>
      </LinearGradient>

      {/* Stats */}
      <View style={styles.statsRow}>
        <StatCard label={t('todaySales')} value={`${storeSettings.currency} ${todaySales.toFixed(0)}`} icon="cash-outline" trend={+5.2} color={colors.primary} />
        <StatCard label={t('todayOrders')} value={String(todayOrders)} icon="receipt-outline" trend={+2} color={colors.success} />
        <StatCard label={t('todayProfit')} value={`${storeSettings.currency} ${todayProfit.toFixed(0)}`} icon="trending-up-outline" trend={+8.1} color="#8B5CF6" />
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>{t('quickActions')}</Text>
        <View style={styles.actionsGrid}>
          {quickActions.map(a => (
            <TouchableOpacity
              key={a.label}
              onPress={() => router.push(a.route as any)}
              style={[styles.actionCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}
              activeOpacity={0.75}
            >
              <View style={[styles.actionIcon, { backgroundColor: a.color + '18', borderRadius: 12 }]}>
                <Ionicons name={a.icon} size={22} color={a.color} />
              </View>
              <Text style={[styles.actionLabel, { color: colors.foreground, fontFamily: 'Inter_500Medium' }]}>{a.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Weekly Chart */}
      <View style={[styles.chartCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius, marginHorizontal: 16 }]}>
        <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>{t('weeklySales')}</Text>
        <SimpleChart data={weeklySales} height={80} />
      </View>

      {/* Recent Orders */}
      <View style={[styles.section, { marginTop: 8 }]}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>{t('recentOrders')}</Text>
          <TouchableOpacity onPress={() => router.push('/reports')}><Text style={[styles.viewAll, { color: colors.primary, fontFamily: 'Inter_500Medium' }]}>{t('viewAll')}</Text></TouchableOpacity>
        </View>
        {recentOrders.length === 0 ? (
          <Text style={[styles.noData, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>{t('noData')}</Text>
        ) : (
          recentOrders.map(o => <OrderCard key={o.id} order={o} />)
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  trialBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 10, paddingHorizontal: 16 },
  trialBannerText: { color: '#FFFFFF', fontSize: 13 },
  header: { paddingHorizontal: 20, paddingBottom: 24 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 },
  greeting: { fontSize: 15, color: 'rgba(255,255,255,0.75)' },
  userName: { fontSize: 22, color: '#FFFFFF' },
  headerRight: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  notifBtn: { position: 'relative', padding: 4 },
  notifBadge: { position: 'absolute', top: 0, right: 0, width: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  notifBadgeText: { fontSize: 9, color: '#FFFFFF' },
  settingsBtn: { padding: 4 },
  storeName: { fontSize: 14, color: 'rgba(255,255,255,0.65)', marginTop: 2 },
  statsRow: { flexDirection: 'row', gap: 10, padding: 16 },
  section: { paddingHorizontal: 16, paddingBottom: 8 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 16, marginBottom: 12 },
  viewAll: { fontSize: 14 },
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  actionCard: { width: '47%', padding: 16, borderWidth: 1, gap: 10 },
  actionIcon: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  actionLabel: { fontSize: 14 },
  chartCard: { padding: 16, borderWidth: 1, marginBottom: 16 },
  noData: { fontSize: 14, textAlign: 'center', paddingVertical: 20 },
});
