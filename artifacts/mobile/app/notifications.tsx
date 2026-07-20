import React from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { useApp } from '@/contexts/AppContext';
import { useTranslation } from '@/hooks/useTranslation';
import AppHeader from '@/components/AppHeader';
import type { NotificationItem } from '@/types';

function timeAgo(dateStr: string, lang: 'en' | 'ar'): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (lang === 'ar') {
    if (mins < 60) return `منذ ${mins} دقيقة`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `منذ ${hrs} ساعة`;
    return `منذ ${Math.floor(hrs / 24)} يوم`;
  }
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const TYPE_CONFIG: Record<NotificationItem['type'], { icon: keyof typeof Ionicons.glyphMap; color: string }> = {
  new_order:          { icon: 'receipt-outline',            color: '#3B82F6' },
  low_stock:          { icon: 'warning-outline',            color: '#F59E0B' },
  employee_activity:  { icon: 'person-outline',             color: '#8B5CF6' },
  new_customer:       { icon: 'person-add-outline',         color: '#10B981' },
  system:             { icon: 'information-circle-outline', color: '#64748B' },
  subscription:       { icon: 'card-outline',               color: '#EC4899' },
  daily_summary:      { icon: 'bar-chart-outline',          color: '#059669' },
};

export default function NotificationsScreen() {
  const colors = useColors();
  const { notifications, markRead, markAllRead, unreadCount } = useApp();
  const { t, lang } = useTranslation();

  const handleTap = (n: NotificationItem) => {
    if (!n.read) {
      markRead(n.id);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const renderItem = ({ item }: { item: NotificationItem }) => {
    const cfg = TYPE_CONFIG[item.type];
    return (
      <TouchableOpacity
        onPress={() => handleTap(item)}
        style={[styles.card, {
          backgroundColor: item.read ? colors.card : colors.primary + '08',
          borderColor: item.read ? colors.border : colors.primary + '30',
          borderRadius: colors.radius,
        }]}
        activeOpacity={0.75}
      >
        <View style={[styles.iconWrap, { backgroundColor: cfg.color + '18', borderRadius: 12 }]}>
          <Ionicons name={cfg.icon} size={20} color={cfg.color} />
        </View>
        <View style={styles.body}>
          <View style={styles.titleRow}>
            <Text style={[styles.title, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]} numberOfLines={1}>{item.title}</Text>
            {!item.read && <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} />}
          </View>
          <Text style={[styles.bodyText, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]} numberOfLines={2}>{item.body}</Text>
          <Text style={[styles.time, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>{timeAgo(item.createdAt, lang)}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <AppHeader
        title={t('notifications')}
        subtitle={unreadCount > 0 ? `${unreadCount} ${t('unread')}` : t('allCaughtUp')}
        rightActions={
          unreadCount > 0 ? (
            <TouchableOpacity onPress={() => { markAllRead(); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); }}>
              <Ionicons name="checkmark-done-outline" size={22} color={colors.primary} />
            </TouchableOpacity>
          ) : undefined
        }
      />

      {unreadCount > 0 && (
        <TouchableOpacity
          onPress={() => { markAllRead(); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); }}
          style={[styles.markAllBtn, { backgroundColor: colors.primary + '12', borderColor: colors.primary + '30', borderRadius: colors.radius }]}
        >
          <Ionicons name="checkmark-done-outline" size={18} color={colors.primary} />
          <Text style={[styles.markAllText, { color: colors.primary, fontFamily: 'Inter_500Medium' }]}>{t('markAllRead')}</Text>
        </TouchableOpacity>
      )}

      <FlatList
        data={notifications}
        keyExtractor={n => n.id}
        renderItem={renderItem}
        contentContainerStyle={[styles.list, { paddingBottom: Platform.OS === 'web' ? 34 : 100 }]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="notifications-off-outline" size={56} color={colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>{t('noNotifications')}</Text>
            <Text style={[styles.emptyText, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>{t('allCaughtUpSub')}</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  markAllBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, margin: 12, padding: 12, borderWidth: 1 },
  markAllText: { fontSize: 14 },
  list: { padding: 12, gap: 10 },
  card: { flexDirection: 'row', padding: 14, borderWidth: 1, gap: 12 },
  iconWrap: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  body: { flex: 1, gap: 4 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { flex: 1, fontSize: 15 },
  unreadDot: { width: 8, height: 8, borderRadius: 4 },
  bodyText: { fontSize: 13, lineHeight: 19 },
  time: { fontSize: 12 },
  empty: { alignItems: 'center', paddingTop: 80, gap: 8 },
  emptyTitle: { fontSize: 18 },
  emptyText: { fontSize: 14 },
});
