import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useColors } from '@/hooks/useColors';

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'muted';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
}

export default function Badge({ label, variant = 'default', size = 'md' }: BadgeProps) {
  const colors = useColors();

  const bgMap: Record<BadgeVariant, string> = {
    default: colors.primary + '20',
    success: colors.success + '20',
    warning: colors.warning + '20',
    danger: colors.destructive + '20',
    info: colors.info + '20',
    muted: colors.muted,
  };
  const textMap: Record<BadgeVariant, string> = {
    default: colors.primary,
    success: colors.success,
    warning: colors.warning,
    danger: colors.destructive,
    info: colors.info,
    muted: colors.mutedForeground,
  };

  return (
    <View style={[styles.badge, { backgroundColor: bgMap[variant], borderRadius: 100 }, size === 'sm' && styles.sm]}>
      <Text style={[styles.text, { color: textMap[variant], fontFamily: 'Inter_500Medium' }, size === 'sm' && styles.textSm]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  sm: {
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  text: {
    fontSize: 12,
    fontWeight: '500',
  },
  textSm: {
    fontSize: 10,
  },
});
