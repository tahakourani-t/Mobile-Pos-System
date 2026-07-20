import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import type { Order } from '@/types';

interface OrderCardProps {
  order: Order;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const paymentIcons: Record<string, keyof typeof Ionicons.glyphMap> = {
  cash: 'cash-outline',
  card: 'card-outline',
  custom: 'wallet-outline',
};

export default function OrderCard({ order }: OrderCardProps) {
  const colors = useColors();

  return (
    <View style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
      <View style={[styles.iconWrap, { backgroundColor: colors.primary + '15', borderRadius: 10 }]}>
        <Ionicons name="receipt-outline" size={20} color={colors.primary} />
      </View>
      <View style={styles.info}>
        <Text style={[styles.orderId, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>{order.orderNumber}</Text>
        <Text style={[styles.items, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
          {order.items.reduce((s, i) => s + i.quantity, 0)} items · {order.cashier}
        </Text>
      </View>
      <View style={styles.right}>
        <Text style={[styles.total, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>{order.total.toFixed(2)}</Text>
        <View style={styles.metaRow}>
          <Ionicons name={paymentIcons[order.paymentMethod]} size={12} color={colors.mutedForeground} />
          <Text style={[styles.time, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>{timeAgo(order.createdAt)}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderWidth: 1,
    gap: 12,
    marginBottom: 8,
  },
  iconWrap: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
    gap: 3,
  },
  orderId: {
    fontSize: 15,
  },
  items: {
    fontSize: 13,
  },
  right: {
    alignItems: 'flex-end',
    gap: 3,
  },
  total: {
    fontSize: 16,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  time: {
    fontSize: 12,
  },
});
