import React, { useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useColors } from '@/hooks/useColors';
import { useApp } from '@/contexts/AppContext';
import { useData } from '@/contexts/DataContext';
import { WEEKLY_SALES } from '@/constants/mockData';
import StatCard from '@/components/StatCard';
import OrderCard from '@/components/OrderCard';
import SimpleChart from '@/components/SimpleChart';

export default function DashboardScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, unreadCount, storeSettings } = useApp();
  const { todaySales, todayOrders, todayProfit, orders, expenses } = useData();

  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  const todayExpenses = useMemo(() => {
    const today = new Date().toDateString();
    return expenses.filter(e => new Date(e.date).toDateString() === today).reduce((s, e) => s + e.amount, 0);
  }, [expenses]);

  const recentOrders = useMemo(() => orders.filter(o => o.status === 'completed').slice(0, 5), [orders]);

  const quickActions = [
    { label: 'New Sale', icon: 'cart-outline' as const, route: '/(tabs)/pos', color: colors.primary },
    { label: 'Products', icon: 'cube-outline' as const, route: '/(tabs)/products', color: '#8B5CF6' },
    { label: 'Customers', icon: 'people-outline' as const, route: '/customers', color: '#F59E0B' },
    { label: 'Reports', icon: 'bar-chart-outline' as const, route: '/reports', color: colors.success },
  ];

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingBottom: Platform.OS === 'web' ? 34 : 100 }}
      showsVerticalScrollIndicator={false}
    >
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
                <View style={styles.badge}>
                  <Text style={[styles.badgeText, { fontFamily: 'Inter_700Bold' }]}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>
        <View style={[styles.heroCard, { backgroundColor: 'rgba(255,255,255,0.12)' }]}>
          <Text style={[styles.heroLabel, { fontFamily: 'Inter_400Regular' }]}>Today's Revenue</Text>
          <Text style={[styles.heroValue, { fontFamily: 'Inter_700Bold' }]}>{storeSettings.currency} {todaySales.toFixed(2)}</Text>
          <Text style={[styles.heroSub, { fontFamily: 'Inter_400Regular' }]}>{todayOrders} orders · {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</Text>
        </View>
      </LinearGradient>

      <View style={styles.content}>
        {/* Stats Row */}
        <View style={styles.statsRow}>
          <StatCard label="Orders" value={String(todayOrders)} icon="receipt-outline" iconColor={colors.primary} small />
          <StatCard label="Profit" value={`${storeSettings.currency} ${todayProfit.toFixed(0)}`} icon="trending-up-outline" iconColor={colors.success} small />
          <StatCard label="Expenses" value={`${storeSettings.currency} ${todayExpenses.toFixed(0)}`} icon="wallet-outline" iconColor={colors.warning} small />
        </View>

        {/* Quick Actions */}
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            {quickActions.map((a, i) => (
              <TouchableOpacity
                key={i}
                onPress={() => router.push(a.route as any)}
                style={[styles.actionBtn, { backgroundColor: a.color + '15', borderRadius: colors.radius - 2, borderColor: a.color + '30', borderWidth: 1 }]}
                activeOpacity={0.7}
              >
                <Ionicons name={a.icon} size={26} color={a.color} />
                <Text style={[styles.actionLabel, { color: a.color, fontFamily: 'Inter_500Medium' }]}>{a.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Weekly Chart */}
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>Weekly Sales</Text>
            <Text style={[styles.sectionSub, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>This week</Text>
          </View>
          <SimpleChart data={WEEKLY_SALES} height={80} />
        </View>

        {/* Recent Orders */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>Recent Orders</Text>
          <TouchableOpacity onPress={() => router.push('/reports')}>
            <Text style={[styles.seeAll, { color: colors.primary, fontFamily: 'Inter_500Medium' }]}>See all</Text>
          </TouchableOpacity>
        </View>
        {recentOrders.length === 0 ? (
          <View style={[styles.emptyBox, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
            <Ionicons name="receipt-outline" size={36} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>No orders yet today</Text>
          </View>
        ) : (
          recentOrders.map(o => <OrderCard key={o.id} order={o} />)
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 28 },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 },
  headerRight: { flexDirection: 'row', gap: 8 },
  notifBtn: { position: 'relative', padding: 4 },
  badge: { position: 'absolute', top: 0, right: 0, backgroundColor: '#EF4444', width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  badgeText: { fontSize: 10, color: '#FFFFFF' },
  greeting: { fontSize: 14, color: 'rgba(255,255,255,0.8)' },
  userName: { fontSize: 22, color: '#FFFFFF' },
  heroCard: { borderRadius: 16, padding: 18, gap: 4 },
  heroLabel: { fontSize: 13, color: 'rgba(255,255,255,0.75)' },
  heroValue: { fontSize: 32, color: '#FFFFFF' },
  heroSub: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  content: { padding: 16, gap: 14 },
  statsRow: { flexDirection: 'row', gap: 10 },
  section: { padding: 16, borderWidth: 1, gap: 12 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { fontSize: 16 },
  sectionSub: { fontSize: 13 },
  seeAll: { fontSize: 14 },
  actionsGrid: { flexDirection: 'row', gap: 10 },
  actionBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 16, gap: 8 },
  actionLabel: { fontSize: 12 },
  emptyBox: { alignItems: 'center', justifyContent: 'center', padding: 32, borderWidth: 1, gap: 8 },
  emptyText: { fontSize: 14 },
});
