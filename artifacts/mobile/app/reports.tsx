import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Platform, Alert, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { useData } from '@/contexts/DataContext';
import { useApp } from '@/contexts/AppContext';
import { useTranslation } from '@/hooks/useTranslation';
import AppHeader from '@/components/AppHeader';
import SimpleChart from '@/components/SimpleChart';
import type { WeeklySalesPoint } from '@/types';

type Period = 'today' | 'week' | 'month' | 'year';

export default function ReportsScreen() {
  const colors = useColors();
  const { orders, products } = useData();
  const { storeSettings } = useApp();
  const { t, lang } = useTranslation();
  const [period, setPeriod] = useState<Period>('today');
  const [sendingReport, setSendingReport] = useState(false);

  const filtered = useMemo(() => {
    const now = new Date();
    return orders.filter(o => {
      if (o.status !== 'completed') return false;
      const d = new Date(o.createdAt);
      if (period === 'today') return d.toDateString() === now.toDateString();
      if (period === 'week') return d >= new Date(now.getTime() - 7 * 86400000);
      if (period === 'month') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      return d.getFullYear() === now.getFullYear();
    });
  }, [orders, period]);

  const todayOrders = useMemo(() => {
    const now = new Date();
    return orders.filter(o => o.status === 'completed' && new Date(o.createdAt).toDateString() === now.toDateString());
  }, [orders]);

  const totalSales   = filtered.reduce((s, o) => s + o.total, 0);
  const totalProfit  = filtered.reduce((s, o) => s + o.items.reduce((p, i) => p + (i.product.price - i.product.purchasePrice) * i.quantity, 0), 0);
  const totalDiscount= filtered.reduce((s, o) => s + o.discountAmount, 0);
  const orderCount   = filtered.length;
  const avgOrder     = orderCount > 0 ? totalSales / orderCount : 0;

  const productSales: Record<string, { name: string; nameAr?: string; qty: number; revenue: number }> = {};
  filtered.forEach(o => o.items.forEach(i => {
    if (!productSales[i.product.id]) productSales[i.product.id] = { name: i.product.name, nameAr: i.product.nameAr, qty: 0, revenue: 0 };
    productSales[i.product.id].qty += i.quantity;
    productSales[i.product.id].revenue += i.product.price * i.quantity;
  }));
  const topProducts = Object.values(productSales).sort((a, b) => b.revenue - a.revenue).slice(0, 5);

  const payBreakdown = { cash: 0, card: 0, custom: 0 };
  filtered.forEach(o => { (payBreakdown as any)[o.paymentMethod] += o.total; });

  const chartData: WeeklySalesPoint[] = useMemo(() => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      const daySales = orders.filter(o => o.status === 'completed' && new Date(o.createdAt).toDateString() === d.toDateString()).reduce((s, o) => s + o.total, 0);
      return { day: days[d.getDay()], sales: daySales || 0 };
    });
  }, [orders]);

  const sendDailyReport = async () => {
    if (!storeSettings.phone) {
      Alert.alert(t('warning'), t('noPhoneSet'));
      return;
    }

    setSendingReport(true);
    try {
      const today = new Date().toLocaleDateString(lang === 'ar' ? 'ar-LB' : 'en-LB', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
      });
      const cur = storeSettings.currency;
      const storeName = storeSettings.name || 'POS Store';

      // Build top products list
      const todayProductSales: Record<string, { name: string; nameAr?: string; qty: number; revenue: number }> = {};
      todayOrders.forEach(o => o.items.forEach(i => {
        if (!todayProductSales[i.product.id]) todayProductSales[i.product.id] = { name: i.product.name, nameAr: i.product.nameAr, qty: 0, revenue: 0 };
        todayProductSales[i.product.id].qty += i.quantity;
        todayProductSales[i.product.id].revenue += i.product.price * i.quantity;
      }));
      const todayTop = Object.values(todayProductSales).sort((a, b) => b.revenue - a.revenue).slice(0, 5);

      const todaySalesTotal = todayOrders.reduce((s, o) => s + o.total, 0);
      const todayProfitTotal = todayOrders.reduce((s, o) => s + o.items.reduce((p, i) => p + (i.product.price - i.product.purchasePrice) * i.quantity, 0), 0);
      const todayCash = todayOrders.filter(o => o.paymentMethod === 'cash').reduce((s, o) => s + o.total, 0);
      const todayCard = todayOrders.filter(o => o.paymentMethod === 'card').reduce((s, o) => s + o.total, 0);

      let message: string;

      if (lang === 'ar') {
        const topList = todayTop.map((p, i) =>
          `${i + 1}. ${p.nameAr || p.name} — ${p.qty} وحدة — ${cur} ${p.revenue.toLocaleString()}`
        ).join('\n');

        message = `📊 *التقرير اليومي — ${storeName}*
📅 ${today}

━━━━━━━━━━━━━━━━━━
💰 إجمالي المبيعات: *${cur} ${todaySalesTotal.toLocaleString()}*
📦 عدد الفواتير: *${todayOrders.length}*
📈 الربح الصافي: *${cur} ${todayProfitTotal.toLocaleString()}*
💵 نقداً: ${cur} ${todayCash.toLocaleString()}
💳 بطاقة: ${cur} ${todayCard.toLocaleString()}

━━━━━━━━━━━━━━━━━━
🏆 *أكثر المنتجات مبيعاً:*
${todayTop.length > 0 ? topList : 'لا توجد مبيعات اليوم'}

━━━━━━━━━━━━━━━━━━
📱 تم التوليد بواسطة POS Mobile`;
      } else {
        const topList = todayTop.map((p, i) =>
          `${i + 1}. ${p.name} — ${p.qty} units — ${cur} ${p.revenue.toLocaleString()}`
        ).join('\n');

        message = `📊 *Daily Report — ${storeName}*
📅 ${today}

━━━━━━━━━━━━━━━━━━
💰 Total Sales: *${cur} ${todaySalesTotal.toLocaleString()}*
📦 Orders Count: *${todayOrders.length}*
📈 Net Profit: *${cur} ${todayProfitTotal.toLocaleString()}*
💵 Cash: ${cur} ${todayCash.toLocaleString()}
💳 Card: ${cur} ${todayCard.toLocaleString()}

━━━━━━━━━━━━━━━━━━
🏆 *Top Selling Products:*
${todayTop.length > 0 ? topList : 'No sales today'}

━━━━━━━━━━━━━━━━━━
📱 Generated by POS Mobile`;
      }

      // Strip + from phone number for wa.me
      const phoneNum = storeSettings.phone.replace(/[^0-9]/g, '');
      const url = `https://wa.me/${phoneNum}?text=${encodeURIComponent(message)}`;
      await Linking.openURL(url);
    } catch (e) {
      Alert.alert(t('error'), 'Could not open WhatsApp.');
    } finally {
      setSendingReport(false);
    }
  };

  const periods = [
    { key: 'today' as Period, label: t('today') },
    { key: 'week'  as Period, label: t('week') },
    { key: 'month' as Period, label: t('month') },
    { key: 'year'  as Period, label: t('year') },
  ];
  const cur = storeSettings.currency;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <AppHeader title={t('reports')} />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: Platform.OS === 'web' ? 34 : 100 }]} showsVerticalScrollIndicator={false}>

        {/* Daily Report WhatsApp Button */}
        <TouchableOpacity
          onPress={sendDailyReport}
          disabled={sendingReport}
          style={[styles.dailyReportBtn, {
            backgroundColor: sendingReport ? colors.muted : '#25D366',
            borderRadius: colors.radius,
          }]}
          activeOpacity={0.85}
        >
          <Ionicons name="logo-whatsapp" size={20} color="#FFFFFF" />
          <Text style={[styles.dailyReportText, { fontFamily: 'Inter_700Bold' }]}>
            {sendingReport ? t('sendingReport') : t('sendDailyReport')}
          </Text>
        </TouchableOpacity>

        {/* Period selector */}
        <View style={[styles.periodRow, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
          {periods.map(p => (
            <TouchableOpacity key={p.key} onPress={() => setPeriod(p.key)} style={[styles.periodBtn, { backgroundColor: period === p.key ? colors.primary : 'transparent', borderRadius: colors.radius - 4 }]}>
              <Text style={[styles.periodLabel, { color: period === p.key ? '#FFFFFF' : colors.mutedForeground, fontFamily: 'Inter_500Medium' }]}>{p.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Stats */}
        <View style={styles.statsGrid}>
          {[
            { label: t('revenue'),   value: `${cur} ${totalSales.toLocaleString()}`,   icon: 'cash-outline' as const,       color: colors.primary },
            { label: t('orders'),    value: String(orderCount),                          icon: 'receipt-outline' as const,    color: colors.info },
            { label: t('profit'),    value: `${cur} ${totalProfit.toLocaleString()}`,   icon: 'trending-up-outline' as const, color: colors.success },
            { label: t('avgOrder'),  value: `${cur} ${avgOrder.toLocaleString()}`,      icon: 'stats-chart-outline' as const, color: '#8B5CF6' },
            { label: t('discounts'), value: `${cur} ${totalDiscount.toLocaleString()}`, icon: 'pricetag-outline' as const,   color: colors.warning },
            { label: t('products'),  value: String(products.length),                    icon: 'cube-outline' as const,       color: '#EC4899' },
          ].map(s => (
            <View key={s.label} style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
              <View style={[styles.statIcon, { backgroundColor: s.color + '18', borderRadius: 10 }]}>
                <Ionicons name={s.icon} size={18} color={s.color} />
              </View>
              <Text style={[styles.statValue, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]} numberOfLines={1}>{s.value}</Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* 7-day trend */}
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>{t('sevenDayTrend')}</Text>
          <SimpleChart data={chartData} height={90} />
        </View>

        {/* Payment methods */}
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>{t('paymentMethods')}</Text>
          {(['cash', 'card', 'custom'] as const).map(m => {
            const val = payBreakdown[m];
            const pct = totalSales > 0 ? (val / totalSales) * 100 : 0;
            return (
              <View key={m} style={styles.payRow}>
                <View style={[styles.payIcon, { backgroundColor: colors.primary + '15', borderRadius: 8 }]}>
                  <Ionicons name={m === 'cash' ? 'cash-outline' : m === 'card' ? 'card-outline' : 'wallet-outline'} size={16} color={colors.primary} />
                </View>
                <Text style={[styles.payLabel, { color: colors.foreground, fontFamily: 'Inter_500Medium' }]}>{t(m)}</Text>
                <View style={[styles.payBar, { backgroundColor: colors.muted, borderRadius: 4, flex: 1 }]}>
                  <View style={[styles.payBarFill, { width: `${pct}%` as any, backgroundColor: colors.primary, borderRadius: 4 }]} />
                </View>
                <Text style={[styles.payValue, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>{pct.toFixed(0)}%</Text>
              </View>
            );
          })}
        </View>

        {/* Top products */}
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>{t('topProducts')}</Text>
          {topProducts.length === 0 ? (
            <Text style={[styles.noData, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>{t('noSalesThisPeriod')}</Text>
          ) : (
            topProducts.map((p, i) => (
              <View key={p.name} style={[styles.topRow, i < topProducts.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
                <View style={[styles.rank, { backgroundColor: i === 0 ? colors.warning + '20' : colors.muted, borderRadius: 8 }]}>
                  <Text style={[styles.rankText, { color: i === 0 ? colors.warning : colors.mutedForeground, fontFamily: 'Inter_700Bold' }]}>#{i + 1}</Text>
                </View>
                <Text style={[styles.topProdName, { color: colors.foreground, fontFamily: 'Inter_500Medium' }]} numberOfLines={1}>
                  {lang === 'ar' && p.nameAr ? p.nameAr : p.name}
                </Text>
                <View style={styles.topProdRight}>
                  <Text style={[styles.topProdQty, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>{p.qty} {t('sold')}</Text>
                  <Text style={[styles.topProdRev, { color: colors.primary, fontFamily: 'Inter_600SemiBold' }]}>{p.revenue.toLocaleString()}</Text>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: 16, gap: 14 },
  dailyReportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  dailyReportText: { fontSize: 15, color: '#FFFFFF' },
  periodRow: { flexDirection: 'row', padding: 4, borderWidth: 1, gap: 4 },
  periodBtn: { flex: 1, paddingVertical: 8, alignItems: 'center' },
  periodLabel: { fontSize: 14 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statCard: { width: '47%', padding: 14, borderWidth: 1, gap: 4 },
  statIcon: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  statValue: { fontSize: 18 },
  statLabel: { fontSize: 12 },
  section: { padding: 16, borderWidth: 1, gap: 12 },
  sectionTitle: { fontSize: 16 },
  payRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  payIcon: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center' },
  payLabel: { fontSize: 14, width: 48 },
  payBar: { height: 8 },
  payBarFill: { height: '100%' },
  payValue: { fontSize: 13, width: 36, textAlign: 'right' },
  noData: { fontSize: 14, textAlign: 'center', paddingVertical: 10 },
  topRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 10 },
  rank: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  rankText: { fontSize: 12 },
  topProdName: { flex: 1, fontSize: 14 },
  topProdRight: { alignItems: 'flex-end' },
  topProdQty: { fontSize: 12 },
  topProdRev: { fontSize: 15 },
});
