import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { useApp } from '@/contexts/AppContext';
import { useTranslation } from '@/hooks/useTranslation';
import type { Product } from '@/types';

interface ProductCardProps {
  product: Product;
  onPress: (p: Product) => void;
  cartQty?: number;
}

export default function ProductCard({ product, onPress, cartQty = 0 }: ProductCardProps) {
  const colors = useColors();
  const { storeSettings } = useApp();
  const { lang } = useTranslation();
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const handlePress = () => {
    scale.value = withTiming(0.93, { duration: 70 }, () => { scale.value = withTiming(1, { duration: 130 }); });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress(product);
  };

  const isLowStock  = product.stock <= product.lowStockAlert && product.stock > 0;
  const isOutOfStock = product.stock === 0;
  const stockColor   = isOutOfStock ? colors.destructive : isLowStock ? colors.warning : colors.success;

  const categoryColors: Record<string, string> = {
    Beverages: '#3B82F6', Food: '#F59E0B', Electronics: '#8B5CF6',
    Clothing: '#EC4899', Pharmacy: '#10B981', Other: '#64748B',
  };
  const catColor = categoryColors[product.category] ?? colors.primary;

  const displayName = lang === 'ar' && product.nameAr ? product.nameAr : product.name;
  const inCart = cartQty > 0;

  return (
    <Animated.View style={[animStyle, styles.shadow]}>
      <TouchableOpacity
        onPress={handlePress}
        style={[
          styles.card,
          {
            backgroundColor: colors.card,
            borderColor: inCart ? colors.primary : colors.border,
            borderRadius: colors.radius + 2,
            borderWidth: inCart ? 2 : 1,
          },
        ]}
        activeOpacity={0.92}
      >
        {/* Image / icon area */}
        <View style={[styles.imageWrap, { borderRadius: colors.radius, overflow: 'hidden' }]}>
          {product.image ? (
            <>
              <Image
                source={{ uri: product.image }}
                style={styles.productImage}
                resizeMode="cover"
              />
              {/* Gradient overlay so stock/badge info is always readable */}
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.45)']}
                style={StyleSheet.absoluteFillObject}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 0, y: 1 }}
              />
              {/* Category pill on top-left */}
              <View style={[styles.catPill, { backgroundColor: catColor + 'CC' }]}>
                <Text style={styles.catPillText}>{product.category}</Text>
              </View>
            </>
          ) : (
            <View style={[styles.iconBg, { backgroundColor: catColor + '18' }]}>
              <View style={[styles.iconCircle, { backgroundColor: catColor + '25', borderRadius: 28 }]}>
                <Ionicons name="cube-outline" size={30} color={catColor} />
              </View>
              {/* Category label */}
              <View style={[styles.catPillPlain, { backgroundColor: catColor + '18' }]}>
                <Text style={[styles.catPillTextPlain, { color: catColor }]}>{product.category}</Text>
              </View>
            </View>
          )}

          {/* Cart qty badge */}
          {inCart && (
            <View style={[styles.qtyBadge, { backgroundColor: colors.primary }]}>
              <Text style={[styles.qtyText, { fontFamily: 'Inter_700Bold' }]}>{cartQty}</Text>
            </View>
          )}

          {/* Out of stock overlay */}
          {isOutOfStock && (
            <View style={styles.outOfStockOverlay}>
              <Text style={[styles.outOfStockText, { fontFamily: 'Inter_600SemiBold' }]}>Out of Stock</Text>
            </View>
          )}
        </View>

        {/* Name */}
        <Text
          style={[styles.name, { color: colors.foreground, fontFamily: 'Inter_600SemiBold', textAlign: lang === 'ar' ? 'right' : 'left' }]}
          numberOfLines={2}
        >
          {displayName}
        </Text>

        {/* Price row */}
        <View style={styles.priceRow}>
          <Text style={[styles.price, { color: colors.primary, fontFamily: 'Inter_700Bold' }]}>
            {storeSettings.currency} {product.price.toLocaleString()}
          </Text>
        </View>

        {/* Stock indicator */}
        <View style={styles.stockRow}>
          <View style={[styles.dot, { backgroundColor: stockColor }]} />
          <Text style={[styles.stock, { color: stockColor, fontFamily: 'Inter_400Regular' }]}>
            {isOutOfStock
              ? 'Out of stock'
              : isLowStock
                ? `Low: ${product.stock} ${product.unit}`
                : `${product.stock} ${product.unit}`}
          </Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  shadow: {
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  card: { padding: 0, overflow: 'hidden', gap: 0 },
  imageWrap: {
    height: 120,
    width: '100%',
    position: 'relative',
    marginBottom: 0,
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  iconBg: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  iconCircle: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catPill: {
    position: 'absolute',
    top: 6,
    left: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
  },
  catPillText: { fontSize: 9, color: '#FFFFFF', fontWeight: '600' },
  catPillPlain: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  catPillTextPlain: { fontSize: 9, fontWeight: '600' },
  qtyBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  qtyText: { fontSize: 11, color: '#FFFFFF' },
  outOfStockOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  outOfStockText: { color: '#FFFFFF', fontSize: 12 },
  name: {
    fontSize: 13,
    lineHeight: 18,
    paddingHorizontal: 10,
    paddingTop: 9,
  },
  priceRow: {
    paddingHorizontal: 10,
    paddingTop: 2,
  },
  price: { fontSize: 15 },
  stockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingBottom: 10,
    paddingTop: 4,
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  stock: { fontSize: 10 },
});
