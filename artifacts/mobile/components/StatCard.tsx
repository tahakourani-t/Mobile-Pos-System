import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';

interface StatCardProps {
  label: string;
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  trend?: { value: string; positive: boolean };
  small?: boolean;
}

export default function StatCard({ label, value, icon, iconColor, trend, small }: StatCardProps) {
  const colors = useColors();
  const iconBg = iconColor ? iconColor + '20' : colors.primary + '20';
  const resolvedIconColor = iconColor ?? colors.primary;

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
      <View style={[styles.iconWrap, { backgroundColor: iconBg, borderRadius: 10 }]}>
        <Ionicons name={icon} size={small ? 18 : 20} color={resolvedIconColor} />
      </View>
      <Text style={[styles.label, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular', fontSize: small ? 11 : 12 }]} numberOfLines={1}>{label}</Text>
      <Text style={[styles.value, { color: colors.foreground, fontFamily: 'Inter_700Bold', fontSize: small ? 16 : 20 }]} numberOfLines={1}>{value}</Text>
      {trend && (
        <View style={styles.trendRow}>
          <Ionicons name={trend.positive ? 'trending-up' : 'trending-down'} size={12} color={trend.positive ? colors.success : colors.destructive} />
          <Text style={[styles.trendText, { color: trend.positive ? colors.success : colors.destructive, fontFamily: 'Inter_500Medium' }]}>{trend.value}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    padding: 14,
    borderWidth: 1,
    gap: 4,
  },
  iconWrap: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  label: {
    lineHeight: 16,
  },
  value: {
    lineHeight: 26,
  },
  trendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 2,
  },
  trendText: {
    fontSize: 11,
  },
});
