import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ScrollView, Modal, TextInput, Platform, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Print from 'expo-print';
import { useColors } from '@/hooks/useColors';
import { useCart } from '@/contexts/CartContext';
import { useData } from '@/contexts/DataContext';
import { useApp } from '@/contexts/AppContext';
import { useTranslation } from '@/hooks/useTranslation';
import ProductCard from '@/components/ProductCard';
import SearchBar from '@/components/SearchBar';
import { SkeletonProduct } from '@/components/Skeleton';
import { buildReceiptHTML } from '@/utils/receipt';
import type { Product } from '@/types';
import { PRODUCT_CATEGORIES } from '@/constants/mockData';

export default function POSScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { products, isLoading: dataLoading } = useData();
  const { addOrder, updateProduct } = useData();
  const { user, storeSettings, addNotification } = useApp();
  const { t, lang, isRTL } = useTranslation();
  const {
    items, addItem, removeItem, updateQuantity, clearCart,
    discountPercent, setDiscountPercent, taxRate,
    subtotal, discountAmount, taxAmount, total, itemCount,
    heldOrders, holdOrder, resumeOrder,
  } = useCart();

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [cartExpanded, setCartExpanded] = useState(false);
  const [checkoutVisible, setCheckoutVisible] = useState(false);
  const [heldVisible, setHeldVisible] = useState(false);
  const [cashInput, setCashInput] = useState('');
  const [discountInput, setDiscountInput] = useState('');
  const [printing, setPrinting] = useState(false);

  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  // Pre-fill cash with total when checkout opens
  useEffect(() => {
    if (checkoutVisible) {
      setCashInput(total.toFixed(0));
    }
  }, [checkoutVisible]);

  const filtered = useMemo(() => {
    return products.filter(p => {
      const matchCat = category === 'All' || p.category === category;
      const matchSearch = !search
        || p.name.toLowerCase().includes(search.toLowerCase())
        || (p.nameAr && p.nameAr.includes(search))
        || (p.sku && p.sku.toLowerCase().includes(search.toLowerCase()));
      return matchCat && matchSearch && p.isActive;
    });
  }, [products, category, search]);

  const getQty = useCallback((productId: string) => {
    return items.find(i => i.product.id === productId)?.quantity ?? 0;
  }, [items]);

  const handleProductPress = (product: Product) => {
    if (product.stock === 0) {
      Alert.alert(t('outOfStock'), `${product.name} ${t('outOfStockMsg')}`);
      return;
    }
    addItem(product);
    if (!cartExpanded && items.length === 0) setCartExpanded(true);
  };

  const cashReceived = parseFloat(cashInput) || 0;
  const change = cashReceived - total;

  const printReceipt = async (order: Parameters<typeof buildReceiptHTML>[0]) => {
    try {
      const html = buildReceiptHTML(order, storeSettings, lang);
      await Print.printAsync({ html, printerUrl: undefined });
    } catch {
      // Printer not connected or user dismissed — silently ok
    }
  };

  const handleConfirmCheckout = async () => {
    if (cashReceived < total) {
      Alert.alert(t('insufficient'), t('insufficientMsg'));
      return;
    }
    try {
      setPrinting(true);
      const order = await addOrder({
        items: items.map(i => ({ ...i })),
        subtotal,
        discountAmount,
        taxAmount,
        total,
        paymentMethod: 'cash',
        cashReceived,
        change: Math.max(0, change),
        status: 'completed',
        cashier: user?.name ?? 'Cashier',
      });
      // Deduct stock
      for (const item of items) {
        await updateProduct(item.product.id, { stock: Math.max(0, item.product.stock - item.quantity) });
      }
      addNotification({ type: 'new_order', title: `${t('newSale')} ${order.orderNumber}`, body: `${storeSettings.currency} ${total.toLocaleString()}`, read: false });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      await printReceipt(order);

      clearCart();
      setCheckoutVisible(false);
      setCashInput('');
      setDiscountInput('');
      setDiscountPercent(0);
      setCartExpanded(false);
    } catch {
      Alert.alert(t('error'), 'Failed to complete the order.');
    } finally {
      setPrinting(false);
    }
  };

  const renderProductItem = useCallback(({ item }: { item: Product }) => (
    <View style={styles.productCell}>
      <ProductCard product={item} onPress={handleProductPress} cartQty={getQty(item.id)} />
    </View>
  ), [handleProductPress, getQty]);

  const cartHeight = cartExpanded ? 280 : 68;
  const cur = storeSettings.currency;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Top bar */}
      <View style={[styles.topBar, { backgroundColor: colors.card, borderBottomColor: colors.border, paddingTop: topPad + 8, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <View style={styles.searchWrap}>
          <SearchBar value={search} onChangeText={setSearch} placeholder={t('searchProducts')} />
        </View>
        <TouchableOpacity
          onPress={() => setHeldVisible(true)}
          style={[styles.holdBtn, { backgroundColor: heldOrders.length > 0 ? colors.warning + '20' : colors.muted, borderRadius: colors.radius }]}
        >
          <Ionicons name="pause-circle-outline" size={22} color={heldOrders.length > 0 ? colors.warning : colors.mutedForeground} />
          {heldOrders.length > 0 && (
            <View style={[styles.holdBadge, { backgroundColor: colors.warning }]}>
              <Text style={[styles.holdBadgeText, { fontFamily: 'Inter_700Bold' }]}>{heldOrders.length}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Category chips */}
      <View style={[styles.catBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catScroll}>
          {PRODUCT_CATEGORIES.map(cat => (
            <TouchableOpacity
              key={cat}
              onPress={() => setCategory(cat)}
              style={[styles.catChip, { backgroundColor: category === cat ? colors.primary : colors.muted, borderRadius: 100, borderColor: category === cat ? colors.primary : colors.border, borderWidth: 1 }]}
            >
              <Text style={[styles.catLabel, { color: category === cat ? '#FFFFFF' : colors.foreground, fontFamily: 'Inter_500Medium' }]}>{cat}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Products grid */}
      {dataLoading && products.length === 0 ? (
        <ScrollView contentContainerStyle={[styles.grid, { paddingBottom: cartHeight + 16, flexDirection: 'row', flexWrap: 'wrap', gap: 10 }]}>
          {[0,1,2,3,4,5,6,7].map(i => <SkeletonProduct key={i} />)}
        </ScrollView>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          renderItem={renderProductItem}
          numColumns={2}
          contentContainerStyle={[styles.grid, { paddingBottom: cartHeight + 16 }]}
          columnWrapperStyle={styles.row}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="cube-outline" size={48} color={colors.mutedForeground} />
              <Text style={[styles.emptyText, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>{t('noProductsFound')}</Text>
            </View>
          }
        />
      )}

      {/* Cart panel */}
      <View style={[styles.cartPanel, { backgroundColor: colors.card, borderTopColor: colors.border, height: cartHeight, bottom: Platform.OS === 'web' ? 84 : insets.bottom + 64 }]}>
        <TouchableOpacity style={styles.cartToggle} onPress={() => setCartExpanded(e => !e)} activeOpacity={0.8}>
          <View style={styles.cartSummary}>
            <View style={[styles.cartBadge, { backgroundColor: colors.primary }]}>
              <Text style={[styles.cartBadgeText, { fontFamily: 'Inter_700Bold' }]}>{itemCount}</Text>
            </View>
            <Text style={[styles.cartLabel, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>
              {itemCount === 0 ? t('cartEmpty') : `${itemCount} ${itemCount === 1 ? t('item') : t('items')}`}
            </Text>
          </View>
          <View style={styles.cartRight}>
            <Text style={[styles.cartTotal, { color: colors.primary, fontFamily: 'Inter_700Bold' }]}>
              {cur} {total.toLocaleString()}
            </Text>
            <Ionicons name={cartExpanded ? 'chevron-down' : 'chevron-up'} size={18} color={colors.mutedForeground} />
          </View>
        </TouchableOpacity>

        {cartExpanded && (
          <>
            <ScrollView style={styles.cartItems} showsVerticalScrollIndicator={false}>
              {items.length === 0 ? (
                <Text style={[styles.cartEmptyText, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>{t('addProductsToStart')}</Text>
              ) : (
                items.map(item => (
                  <View key={item.product.id} style={[styles.cartItem, { borderBottomColor: colors.border, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    <Text style={[styles.cartItemName, { color: colors.foreground, fontFamily: 'Inter_500Medium', textAlign: isRTL ? 'right' : 'left' }]} numberOfLines={1}>
                      {lang === 'ar' && item.product.nameAr ? item.product.nameAr : item.product.name}
                    </Text>
                    <View style={styles.cartItemRight}>
                      <TouchableOpacity onPress={() => updateQuantity(item.product.id, item.quantity - 1)} style={[styles.qtyBtn, { backgroundColor: colors.muted, borderRadius: 8 }]}>
                        <Ionicons name="remove" size={16} color={colors.foreground} />
                      </TouchableOpacity>
                      <Text style={[styles.qtyNum, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>{item.quantity}</Text>
                      <TouchableOpacity onPress={() => updateQuantity(item.product.id, item.quantity + 1)} style={[styles.qtyBtn, { backgroundColor: colors.muted, borderRadius: 8 }]}>
                        <Ionicons name="add" size={16} color={colors.foreground} />
                      </TouchableOpacity>
                      <Text style={[styles.cartItemPrice, { color: colors.primary, fontFamily: 'Inter_600SemiBold' }]}>
                        {(item.product.price * item.quantity).toLocaleString()}
                      </Text>
                      <TouchableOpacity onPress={() => removeItem(item.product.id)}>
                        <Ionicons name="trash-outline" size={16} color={colors.destructive} />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}
            </ScrollView>
            <View style={[styles.cartActions, { borderTopColor: colors.border }]}>
              <TouchableOpacity onPress={() => holdOrder()} style={[styles.holdOrderBtn, { borderColor: colors.border, borderRadius: colors.radius }]}>
                <Ionicons name="pause-outline" size={18} color={colors.mutedForeground} />
                <Text style={[styles.holdOrderText, { color: colors.mutedForeground, fontFamily: 'Inter_500Medium' }]}>{t('hold')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => { if (items.length > 0) { setCheckoutVisible(true); } }}
                style={[styles.checkoutBtn, { backgroundColor: items.length > 0 ? colors.primary : colors.muted, borderRadius: colors.radius, flex: 1 }]}
                disabled={items.length === 0}
              >
                <Ionicons name="checkmark-circle-outline" size={20} color={items.length > 0 ? '#FFFFFF' : colors.mutedForeground} />
                <Text style={[styles.checkoutBtnText, { color: items.length > 0 ? '#FFFFFF' : colors.mutedForeground, fontFamily: 'Inter_600SemiBold' }]}>{t('checkout')}</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>

      {/* ── Checkout Modal ── */}
      <Modal visible={checkoutVisible} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.modalRoot, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border, backgroundColor: colors.card, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <Text style={[styles.modalTitle, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>{t('checkout')}</Text>
            <TouchableOpacity onPress={() => setCheckoutVisible(false)}>
              <Ionicons name="close" size={24} color={colors.foreground} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.modalContent} showsVerticalScrollIndicator={false}>
            {/* Order summary */}
            <View style={[styles.summaryBox, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
              <Text style={[styles.summaryTitle, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>{t('orderSummary')}</Text>
              {items.map(i => (
                <View key={i.product.id} style={[styles.summaryRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <Text style={[styles.summaryItem, { color: colors.foreground, fontFamily: 'Inter_400Regular', textAlign: isRTL ? 'right' : 'left' }]} numberOfLines={1}>
                    {i.quantity}× {lang === 'ar' && i.product.nameAr ? i.product.nameAr : i.product.name}
                  </Text>
                  <Text style={[styles.summaryItemPrice, { color: colors.foreground, fontFamily: 'Inter_500Medium' }]}>{(i.product.price * i.quantity).toLocaleString()}</Text>
                </View>
              ))}
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <View style={[styles.summaryRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Text style={[styles.summaryMeta, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>{t('subtotal')}</Text>
                <Text style={[styles.summaryMeta, { color: colors.foreground, fontFamily: 'Inter_500Medium' }]}>{subtotal.toLocaleString()}</Text>
              </View>
              <View style={[styles.summaryRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <View style={styles.discountRow}>
                  <Text style={[styles.summaryMeta, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>{t('discountPercent')}</Text>
                  <TextInput
                    style={[styles.discountInput, { color: colors.foreground, borderColor: colors.border, borderRadius: 8, fontFamily: 'Inter_400Regular', backgroundColor: colors.muted }]}
                    value={discountInput}
                    onChangeText={v => { setDiscountInput(v); setDiscountPercent(parseFloat(v) || 0); }}
                    keyboardType="decimal-pad"
                    placeholder="0"
                    placeholderTextColor={colors.mutedForeground}
                  />
                </View>
                <Text style={[styles.summaryMeta, { color: colors.destructive, fontFamily: 'Inter_500Medium' }]}>-{discountAmount.toLocaleString()}</Text>
              </View>
              {taxRate > 0 && (
                <View style={[styles.summaryRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <Text style={[styles.summaryMeta, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>{t('tax')} ({taxRate}%)</Text>
                  <Text style={[styles.summaryMeta, { color: colors.foreground, fontFamily: 'Inter_500Medium' }]}>{taxAmount.toLocaleString()}</Text>
                </View>
              )}
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <View style={[styles.summaryRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Text style={[styles.totalLabel, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>{t('total')}</Text>
                <Text style={[styles.totalValue, { color: colors.primary, fontFamily: 'Inter_700Bold' }]}>{cur} {total.toLocaleString()}</Text>
              </View>
            </View>

            {/* Payment method — cash only */}
            <Text style={[styles.payLabel, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>{t('paymentMethod')}</Text>
            <View style={[styles.cashOnlyBadge, { backgroundColor: colors.success + '15', borderColor: colors.success + '40', borderRadius: colors.radius }]}>
              <Ionicons name="cash-outline" size={20} color={colors.success} />
              <Text style={[styles.cashOnlyText, { color: colors.success, fontFamily: 'Inter_600SemiBold' }]}>{t('cash')}</Text>
            </View>

            {/* Cash input — pre-filled with total */}
            <View style={[styles.cashBox, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
              <Text style={[styles.cashLabel, { color: colors.foreground, fontFamily: 'Inter_500Medium' }]}>
                {t('cashReceived')} ({cur})
              </Text>
              <TextInput
                style={[styles.cashInput, { color: colors.foreground, borderColor: cashReceived < total && cashInput !== '' ? colors.destructive : colors.border, borderRadius: colors.radius, fontFamily: 'Inter_600SemiBold', backgroundColor: colors.muted }]}
                value={cashInput}
                onChangeText={setCashInput}
                keyboardType="decimal-pad"
                placeholder={total.toFixed(0)}
                placeholderTextColor={colors.mutedForeground}
              />
              {/* Quick cash buttons */}
              <View style={styles.quickCashRow}>
                {[total, Math.ceil(total / 5000) * 5000, Math.ceil(total / 10000) * 10000, Math.ceil(total / 50000) * 50000]
                  .filter((v, i, a) => a.indexOf(v) === i && v >= total)
                  .slice(0, 4)
                  .map(amt => (
                    <TouchableOpacity
                      key={amt}
                      onPress={() => setCashInput(amt.toFixed(0))}
                      style={[styles.quickCashBtn, { backgroundColor: cashInput === amt.toFixed(0) ? colors.primary + '20' : colors.muted, borderRadius: 8, borderColor: cashInput === amt.toFixed(0) ? colors.primary : colors.border, borderWidth: 1 }]}
                    >
                      <Text style={[styles.quickCashText, { color: cashInput === amt.toFixed(0) ? colors.primary : colors.foreground, fontFamily: 'Inter_500Medium' }]}>{(amt / 1000).toFixed(0)}k</Text>
                    </TouchableOpacity>
                  ))}
              </View>
              {cashReceived > 0 && cashReceived >= total && (
                <View style={[styles.changeRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <Text style={[styles.changeLabel, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>{t('change')}</Text>
                  <Text style={[styles.changeValue, { color: colors.success, fontFamily: 'Inter_700Bold' }]}>{cur} {Math.max(0, change).toLocaleString()}</Text>
                </View>
              )}
              {cashReceived > 0 && cashReceived < total && (
                <Text style={[{ color: colors.destructive, fontSize: 13, fontFamily: 'Inter_400Regular', textAlign: 'center' }]}>
                  {t('insufficientMsg')}
                </Text>
              )}
            </View>

            <TouchableOpacity
              onPress={handleConfirmCheckout}
              disabled={printing}
              style={[styles.confirmBtn, { backgroundColor: printing ? colors.muted : colors.primary, borderRadius: colors.radius }]}
              activeOpacity={0.85}
            >
              <Ionicons name={printing ? 'print-outline' : 'checkmark-circle'} size={22} color="#FFFFFF" />
              <Text style={[styles.confirmBtnText, { fontFamily: 'Inter_700Bold' }]}>
                {printing ? t('printingReceipt') : t('confirmPayment')}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      {/* ── Held Orders Modal ── */}
      <Modal visible={heldVisible} animationType="slide" presentationStyle="formSheet">
        <View style={[styles.modalRoot, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border, backgroundColor: colors.card, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <Text style={[styles.modalTitle, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>{t('heldOrders')}</Text>
            <TouchableOpacity onPress={() => setHeldVisible(false)}>
              <Ionicons name="close" size={24} color={colors.foreground} />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.modalContent}>
            {heldOrders.length === 0 ? (
              <View style={styles.empty}>
                <Ionicons name="pause-circle-outline" size={48} color={colors.mutedForeground} />
                <Text style={[styles.emptyText, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>{t('noHeldOrders')}</Text>
              </View>
            ) : (
              heldOrders.map(h => (
                <View key={h.id} style={[styles.heldCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.heldTitle, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>{h.items.length} {h.items.length === 1 ? t('item') : t('items')}</Text>
                    {h.note ? <Text style={[styles.heldNote, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>{h.note}</Text> : null}
                  </View>
                  <TouchableOpacity onPress={() => { resumeOrder(h.id); setHeldVisible(false); }} style={[styles.resumeBtn, { backgroundColor: colors.primary, borderRadius: 8 }]}>
                    <Text style={[styles.resumeText, { fontFamily: 'Inter_600SemiBold' }]}>{t('resume')}</Text>
                  </TouchableOpacity>
                </View>
              ))
            )}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topBar: { gap: 10, paddingHorizontal: 12, paddingBottom: 10, borderBottomWidth: 1, alignItems: 'center' },
  searchWrap: { flex: 1 },
  holdBtn: { width: 46, height: 46, alignItems: 'center', justifyContent: 'center' },
  holdBadge: { position: 'absolute', top: 4, right: 4, width: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  holdBadgeText: { fontSize: 9, color: '#FFFFFF' },
  catBar: { paddingVertical: 8, borderBottomWidth: 1 },
  catScroll: { paddingHorizontal: 12, gap: 8 },
  catChip: { paddingHorizontal: 14, paddingVertical: 7 },
  catLabel: { fontSize: 13 },
  grid: { padding: 10 },
  row: { gap: 10, marginBottom: 10 },
  productCell: { flex: 1 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60, gap: 10 },
  emptyText: { fontSize: 15 },
  cartPanel: { position: 'absolute', left: 0, right: 0, borderTopWidth: 1, paddingHorizontal: 12 },
  cartToggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 52, paddingTop: 8 },
  cartSummary: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cartBadge: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  cartBadgeText: { fontSize: 12, color: '#FFFFFF' },
  cartLabel: { fontSize: 15 },
  cartRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cartTotal: { fontSize: 18 },
  cartItems: { flex: 1 },
  cartEmptyText: { textAlign: 'center', paddingVertical: 16, fontSize: 14 },
  cartItem: { alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 0.5 },
  cartItemName: { flex: 1, fontSize: 14, marginRight: 8 },
  cartItemRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  qtyBtn: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  qtyNum: { fontSize: 15, minWidth: 22, textAlign: 'center' },
  cartItemPrice: { fontSize: 14, minWidth: 60, textAlign: 'right' },
  cartActions: { flexDirection: 'row', gap: 10, paddingVertical: 8, borderTopWidth: 1 },
  holdOrderBtn: { width: 70, height: 44, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 4, borderWidth: 1 },
  holdOrderText: { fontSize: 13 },
  checkoutBtn: { height: 44, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
  checkoutBtnText: { fontSize: 16 },
  modalRoot: { flex: 1 },
  modalHeader: { alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingTop: 24, borderBottomWidth: 1 },
  modalTitle: { fontSize: 20 },
  modalContent: { padding: 20, gap: 16, paddingBottom: 40 },
  summaryBox: { padding: 16, borderWidth: 1, gap: 10 },
  summaryTitle: { fontSize: 16, marginBottom: 4 },
  summaryRow: { alignItems: 'center', justifyContent: 'space-between' },
  summaryItem: { flex: 1, fontSize: 14, marginRight: 8 },
  summaryItemPrice: { fontSize: 14 },
  summaryMeta: { fontSize: 14 },
  divider: { height: 1, marginVertical: 4 },
  totalLabel: { fontSize: 16 },
  totalValue: { fontSize: 20 },
  discountRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  discountInput: { width: 60, height: 32, paddingHorizontal: 8, fontSize: 14, borderWidth: 1, textAlign: 'center' },
  payLabel: { fontSize: 16 },
  cashOnlyBadge: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderWidth: 1 },
  cashOnlyText: { fontSize: 16 },
  cashBox: { padding: 16, borderWidth: 1, gap: 10 },
  cashLabel: { fontSize: 15 },
  cashInput: { fontSize: 28, padding: 12, borderWidth: 1.5, textAlign: 'center' },
  quickCashRow: { flexDirection: 'row', gap: 8 },
  quickCashBtn: { flex: 1, paddingVertical: 9, alignItems: 'center' },
  quickCashText: { fontSize: 14 },
  changeRow: { justifyContent: 'space-between', alignItems: 'center' },
  changeLabel: { fontSize: 15 },
  changeValue: { fontSize: 22 },
  confirmBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 58, gap: 10 },
  confirmBtnText: { fontSize: 18, color: '#FFFFFF' },
  heldCard: { flexDirection: 'row', alignItems: 'center', padding: 16, borderWidth: 1, gap: 12, marginBottom: 10 },
  heldTitle: { fontSize: 15 },
  heldNote: { fontSize: 13 },
  resumeBtn: { paddingHorizontal: 14, paddingVertical: 8 },
  resumeText: { fontSize: 14, color: '#FFFFFF' },
});
