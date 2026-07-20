/**
 * Skeleton — animated shimmer placeholder shown while data loads.
 *
 * Usage:
 *   <Skeleton width={200} height={20} />
 *   <Skeleton width="100%" height={120} borderRadius={12} />
 *   <SkeletonCard />   ← pre-built store / product card placeholder
 */
import React, { useEffect, useRef } from 'react';
import { Animated, View, StyleSheet, ViewStyle } from 'react-native';
import { useColors } from '@/hooks/useColors';

interface SkeletonProps {
  width?: number | `${number}%`;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export function Skeleton({ width = '100%', height = 16, borderRadius = 8, style }: SkeletonProps) {
  const colors = useColors();
  const anim   = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1,   duration: 750, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0.4, duration: 750, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [anim]);

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: colors.border,
          opacity: anim,
        },
        style,
      ]}
    />
  );
}

// ── Pre-built skeletons ───────────────────────────────────────────────────────

/** Dashboard stat row (4 cards) */
export function SkeletonStatRow() {
  return (
    <View style={sk.statRow}>
      {[0, 1, 2, 3].map(i => (
        <View key={i} style={sk.statCard}>
          <Skeleton height={12} width={60} />
          <Skeleton height={22} width={80} style={{ marginTop: 8 }} />
          <Skeleton height={10} width={50} style={{ marginTop: 6 }} />
        </View>
      ))}
    </View>
  );
}

/** A single list-row placeholder (name + subtitle + trailing value) */
export function SkeletonRow() {
  return (
    <View style={sk.row}>
      <Skeleton width={44} height={44} borderRadius={12} />
      <View style={{ flex: 1, gap: 6 }}>
        <Skeleton height={14} width="65%" />
        <Skeleton height={11} width="45%" />
      </View>
      <Skeleton height={14} width={50} />
    </View>
  );
}

/** A product / store card placeholder */
export function SkeletonCard() {
  const colors = useColors();
  return (
    <View style={[sk.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={sk.cardHead}>
        <Skeleton width={44} height={44} borderRadius={12} />
        <View style={{ flex: 1, gap: 8 }}>
          <Skeleton height={14} width="60%" />
          <Skeleton height={11} width="40%" />
        </View>
        <Skeleton height={22} width={72} borderRadius={20} />
      </View>
      <Skeleton height={38} borderRadius={10} />
      <View style={sk.btnRow}>
        <Skeleton height={38} width="31%" borderRadius={8} />
        <Skeleton height={38} width="31%" borderRadius={8} />
        <Skeleton height={38} width="31%" borderRadius={8} />
      </View>
    </View>
  );
}

/** POS product grid cell */
export function SkeletonProduct() {
  const colors = useColors();
  return (
    <View style={[sk.product, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Skeleton height={80} borderRadius={10} />
      <Skeleton height={13} width="80%" style={{ marginTop: 8 }} />
      <Skeleton height={11} width="50%" style={{ marginTop: 4 }} />
    </View>
  );
}

/** Dashboard recent-order row */
export function SkeletonOrderRow() {
  return (
    <View style={sk.orderRow}>
      <Skeleton width={40} height={40} borderRadius={10} />
      <View style={{ flex: 1, gap: 6 }}>
        <Skeleton height={13} width="55%" />
        <Skeleton height={10} width="35%" />
      </View>
      <Skeleton height={18} width={60} borderRadius={6} />
    </View>
  );
}

const sk = StyleSheet.create({
  statRow:  { flexDirection: 'row', gap: 10, paddingHorizontal: 16 },
  statCard: {
    flex: 1, padding: 12, borderRadius: 12,
    backgroundColor: 'transparent',
    gap: 4,
  },
  row: {
    flexDirection: 'row', alignItems: 'center',
    gap: 12, paddingHorizontal: 16, paddingVertical: 10,
  },
  card: {
    borderWidth: 1, padding: 16, gap: 12,
    borderRadius: 14,
    marginHorizontal: 16, marginBottom: 12,
  },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  btnRow:   { flexDirection: 'row', gap: 8, justifyContent: 'space-between' },
  product:  {
    width: '47%', padding: 12, borderRadius: 12, borderWidth: 1,
    gap: 4,
  },
  orderRow: {
    flexDirection: 'row', alignItems: 'center',
    gap: 12, paddingHorizontal: 16, paddingVertical: 8,
  },
});
