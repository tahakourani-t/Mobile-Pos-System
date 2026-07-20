import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import type { Product } from '@/types';

interface ProductCardProps {
  product: Product;
  onPress: (p: Product) => void;
  cartQty?: number;
}

export default function ProductCard({ product, onPress, cartQty = 0 }: ProductCardProps) {
  const colors = useColors();
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const handlePress = () => {
    scale.value = withTiming(0.94, { duration: 80 }, () => { scale.value = withTiming(1, { duration: 120 }); });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress(product);
  };

  const isLowStock = product.stock <= product.lowStockAlert && product.stock > 0;
  const isOutOfStock = product.stock === 0;
  const stockColor = isOutOfStock ? colors.destructive : isLowStock ? colors.warning : colors.success;

  const categoryColors: Record<string, string> = {
    Beverages: '#3B82F6',
    Food: '#F59E0B',
    Electronics: '#8B5CF6',
    Clothing: '#EC4899',
    Pharmacy: '#10B981',
    Other: '#64748B',
  };
  const catColor = categoryColors[product.category] ?? colors.primary;

  return (
    <Animated.View style={animStyle}>
      <TouchableOpacity
        onPress={handlePress}
        style={[styles.card, { backgroundColor: colors.card, borderColor: cartQty > 0 ? colors.primary : colors.border, borderRadius: colors.radius }]}
        activeOpacity={0.9}
      >
        <View style={[styles.iconArea, { backgroundColor: catColor + '18', borderRadius: colors.radius - 2 }]}>
          <Ionicons name="cube-outline" size={28} color={catColor} />
          {cartQty > 0 && (
            <View style={[styles.qtyBadge, { backgroundColor: colors.primary }]}>
              <Text style={[styles.qtyText, { fontFamily: 'Inter_700Bold' }]}>{cartQty}</Text>
            </View>
          )}
        </View>
        <Text style={[styles.name, { color: colors.foreground, fontFamily: 'Inter_500Medium' }]} numberOfLines={2}>{product.name}</Text>
        <Text style={[styles.price, { color: colors.primary, fontFamily: 'Inter_700Bold' }]}>{product.price.toFixed(2)}</Text>
        <View style={styles.stockRow}>
          <View style={[styles.dot, { backgroundColor: stockColor }]} />
          <Text style={[styles.stock, { color: stockColor, fontFamily: 'Inter_400Regular' }]}>
            {isOutOfStock ? 'Out of stock' : `${product.stock} ${product.unit}`}
          </Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 12,
    borderWidth: 1.5,
    gap: 6,
  },
  iconArea: {
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  qtyBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyText: {
    fontSize: 11,
    color: '#FFFFFF',
  },
  name: {
    fontSize: 13,
    lineHeight: 18,
  },
  price: {
    fontSize: 16,
  },
  stockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  stock: {
    fontSize: 11,
  },
});
