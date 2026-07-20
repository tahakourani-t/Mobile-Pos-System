import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ScrollView, Modal, TextInput, Platform, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { useCart } from '@/contexts/CartContext';
import { useData } from '@/contexts/DataContext';
import { useApp } from '@/contexts/AppContext';
import ProductCard from '@/components/ProductCard';
import SearchBar from '@/components/SearchBar';
import type { Product } from '@/types';
import { PRODUCT_CATEGORIES } from '@/constants/mockData';

type PaymentMethod = 'cash' | 'card' | 'custom';

export default function POSScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { products } = useData();
  const { addOrder, updateProduct } = useData();
  const { user, storeSettings, addNotification } = useApp();
  const { items, addItem, removeItem, updateQuantity, clearCart, discountPercent, setDiscountPercent, taxRate, subtotal, discountAmount, taxAmount, total, itemCount, heldOrders, holdOrder, resumeOrder } = useCart();

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [cartExpanded, setCartExpanded] = useState(false);
  const [checkoutVisible, setCheckoutVisible] = useState(false);
  const [heldVisible, setHeldVisible] = useState(false);
  const [payMethod, setPayMethod] = useState<PaymentMethod>('cash');
  const [cashInput, setCashInput] = useState('');
  const [discountInput, setDiscountInput] = useState('');

  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  const filtered = useMemo(() => {
    return products.filter(p => {
      const matchCat = category === 'All' || p.category === category;
      const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || (p.sku && p.sku.toLowerCase().includes(search.toLowerCase()));
      return matchCat && matchSearch && p.isActive;
    });
  }, [products, category, search]);

  const getQty = useCallback((productId: string) => {
    return items.find(i => i.product.id === productId)?.quantity ?? 0;
  }, [items]);

  const handleProductPress = (product: Product) => {
    if (product.stock === 0) {
      Alert.alert('Out of Stock', `${product.name} is out of stock.`);
      return;
    }
    addItem(product);
    if (!cartExpanded && items.length === 0) setCartExpanded(true);
  };

  const cashReceived = parseFloat(cashInput) || 0;
  const change = cashReceived - total;

  const handleConfirmCheckout = async () => {
    if (payMethod === 'cash' && cashReceived < total) {
      Alert.alert('Insufficient', 'Cash received is less than the total amount.');
      return;
    }
    try {
      const order = await addOrder({
        items: items.map(i => ({ ...i })),
        subtotal,
        discountAmount,
        taxAmount,
        total,
        paymentMethod: payMethod,
        cashReceived: payMethod === 'cash' ? cashReceived : undefined,
        change: payMethod === 'cash' ? Math.max(0, change) : undefined,
        status: 'completed',
        cashier: user?.name ?? 'Cashier',
      });
      // Update stock
      for (const item of items) {
        await updateProduct(item.product.id, { stock: Math.max(0, item.product.stock - item.quantity) });
      }
      addNotification({ type: 'new_order', title: `New Order ${order.orderNumber}`, body: `${storeSettings.currency} ${total.toFixed(2)} — ${payMethod}`, read: false });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      clearCart();
      setCheckoutVisible(false);
      setCashInput('');
      setDiscountInput('');
      setCartExpanded(false);
      Alert.alert('Success', `Order ${order.orderNumber} completed!`);
    } catch {
      Alert.alert('Error', 'Failed to complete the order.');
    }
  };

  const renderProductItem = useCallback(({ item }: { item: Product }) => (
    <View style={styles.productCell}>
      <ProductCard product={item} onPress={handleProductPress} cartQty={getQty(item.id)} />
    </View>
  ), [handleProductPress, getQty]);

  const cartHeight = cartExpanded ? 280 : 68;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Top bar */}
      <View style={[styles.topBar, { backgroundColor: colors.card, borderBottomColor: colors.border, paddingTop: topPad + 8 }]}>
        <View style={styles.searchWrap}>
          <SearchBar value={search} onChangeText={setSearch} placeholder="Search products or SKU…" />
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
            <Text style={[styles.emptyText, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>No products found</Text>
          </View>
        }
      />

      {/* Cart panel */}
      <View style={[styles.cartPanel, { backgroundColor: colors.card, borderTopColor: colors.border, height: cartHeight, bottom: Platform.OS === 'web' ? 84 : insets.bottom + 64 }]}>
        <TouchableOpacity
          style={styles.cartToggle}
          onPress={() => setCartExpanded(e => !e)}
          activeOpacity={0.8}
        >
          <View style={styles.cartSummary}>
            <View style={[styles.cartBadge, { backgroundColor: colors.primary }]}>
              <Text style={[styles.cartBadgeText, { fontFamily: 'Inter_700Bold' }]}>{itemCount}</Text>
            </View>
            <Text style={[styles.cartLabel, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>
              {itemCount === 0 ? 'Cart is empty' : `${itemCount} item${itemCount > 1 ? 's' : ''}`}
            </Text>
          </View>
          <View style={styles.cartRight}>
            <Text style={[styles.cartTotal, { color: colors.primary, fontFamily: 'Inter_700Bold' }]}>
              {storeSettings.currency} {total.toFixed(2)}
            </Text>
            <Ionicons name={cartExpanded ? 'chevron-down' : 'chevron-up'} size={18} color={colors.mutedForeground} />
          </View>
        </TouchableOpacity>

        {cartExpanded && (
          <>
            <ScrollView style={styles.cartItems} showsVerticalScrollIndicator={false}>
              {items.length === 0 ? (
                <Text style={[styles.cartEmpty, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>Add products to start a sale</Text>
              ) : (
                items.map(item => (
                  <View key={item.product.id} style={[styles.cartItem, { borderBottomColor: colors.border }]}>
                    <Text style={[styles.cartItemName, { color: colors.foreground, fontFamily: 'Inter_500Medium' }]} numberOfLines={1}>{item.product.name}</Text>
                    <View style={styles.cartItemRight}>
                      <TouchableOpacity onPress={() => updateQuantity(item.product.id, item.quantity - 1)} style={[styles.qtyBtn, { backgroundColor: colors.muted, borderRadius: 8 }]}>
                        <Ionicons name="remove" size={16} color={colors.foreground} />
                      </TouchableOpacity>
                      <Text style={[styles.qtyNum, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>{item.quantity}</Text>
                      <TouchableOpacity onPress={() => updateQuantity(item.product.id, item.quantity + 1)} style={[styles.qtyBtn, { backgroundColor: colors.muted, borderRadius: 8 }]}>
                        <Ionicons name="add" size={16} color={colors.foreground} />
                      </TouchableOpacity>
                      <Text style={[styles.cartItemPrice, { color: colors.primary, fontFamily: 'Inter_600SemiBold' }]}>
                        {(item.product.price * item.quantity).toFixed(2)}
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
                <Text style={[styles.holdOrderText, { color: colors.mutedForeground, fontFamily: 'Inter_500Medium' }]}>Hold</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => { if (items.length > 0) { setCashInput(''); setCheckoutVisible(true); } }}
                style={[styles.checkoutBtn, { backgroundColor: items.length > 0 ? colors.primary : colors.muted, borderRadius: colors.radius, flex: 1 }]}
                disabled={items.length === 0}
              >
                <Ionicons name="checkmark-circle-outline" size={20} color={items.length > 0 ? '#FFFFFF' : colors.mutedForeground} />
                <Text style={[styles.checkoutBtnText, { color: items.length > 0 ? '#FFFFFF' : colors.mutedForeground, fontFamily: 'Inter_600SemiBold' }]}>Checkout</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>

      {/* Checkout Modal */}
      <Modal visible={checkoutVisible} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.modalRoot, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border, backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>Checkout</Text>
            <TouchableOpacity onPress={() => setCheckoutVisible(false)}>
              <Ionicons name="close" size={24} color={colors.foreground} />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.modalContent} showsVerticalScrollIndicator={false}>
            {/* Order summary */}
            <View style={[styles.summaryBox, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
              <Text style={[styles.summaryTitle, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>Order Summary</Text>
              {items.map(i => (
                <View key={i.product.id} style={styles.summaryRow}>
                  <Text style={[styles.summaryItem, { color: colors.foreground, fontFamily: 'Inter_400Regular' }]} numberOfLines={1}>{i.quantity}× {i.product.name}</Text>
                  <Text style={[styles.summaryItemPrice, { color: colors.foreground, fontFamily: 'Inter_500Medium' }]}>{(i.product.price * i.quantity).toFixed(2)}</Text>
                </View>
              ))}
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <View style={styles.summaryRow}><Text style={[styles.summaryMeta, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>Subtotal</Text><Text style={[styles.summaryMeta, { color: colors.foreground, fontFamily: 'Inter_500Medium' }]}>{subtotal.toFixed(2)}</Text></View>
              <View style={styles.summaryRow}>
                <View style={styles.discountRow}>
                  <Text style={[styles.summaryMeta, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>Discount %</Text>
                  <TextInput
                    style={[styles.discountInput, { color: colors.foreground, borderColor: colors.border, borderRadius: 8, fontFamily: 'Inter_400Regular', backgroundColor: colors.muted }]}
                    value={discountInput}
                    onChangeText={v => { setDiscountInput(v); setDiscountPercent(parseFloat(v) || 0); }}
                    keyboardType="decimal-pad"
                    placeholder="0"
                    placeholderTextColor={colors.mutedForeground}
                  />
                </View>
                <Text style={[styles.summaryMeta, { color: colors.destructive, fontFamily: 'Inter_500Medium' }]}>-{discountAmount.toFixed(2)}</Text>
              </View>
              <View style={styles.summaryRow}><Text style={[styles.summaryMeta, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>Tax ({taxRate}%)</Text><Text style={[styles.summaryMeta, { color: colors.foreground, fontFamily: 'Inter_500Medium' }]}>{taxAmount.toFixed(2)}</Text></View>
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <View style={styles.summaryRow}><Text style={[styles.totalLabel, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>Total</Text><Text style={[styles.totalValue, { color: colors.primary, fontFamily: 'Inter_700Bold' }]}>{storeSettings.currency} {total.toFixed(2)}</Text></View>
            </View>

            {/* Payment method */}
            <Text style={[styles.payLabel, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>Payment Method</Text>
            <View style={styles.payMethods}>
              {(['cash', 'card', 'custom'] as PaymentMethod[]).map(m => (
                <TouchableOpacity
                  key={m}
                  onPress={() => setPayMethod(m)}
                  style={[styles.payMethod, { backgroundColor: payMethod === m ? colors.primary : colors.card, borderColor: payMethod === m ? colors.primary : colors.border, borderRadius: colors.radius }]}
                >
                  <Ionicons name={m === 'cash' ? 'cash-outline' : m === 'card' ? 'card-outline' : 'wallet-outline'} size={22} color={payMethod === m ? '#FFFFFF' : colors.foreground} />
                  <Text style={[styles.payMethodText, { color: payMethod === m ? '#FFFFFF' : colors.foreground, fontFamily: 'Inter_500Medium' }]}>{m.charAt(0).toUpperCase() + m.slice(1)}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {payMethod === 'cash' && (
              <View style={[styles.cashBox, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
                <Text style={[styles.cashLabel, { color: colors.foreground, fontFamily: 'Inter_500Medium' }]}>Cash Received</Text>
                <TextInput
                  style={[styles.cashInput, { color: colors.foreground, borderColor: colors.border, borderRadius: colors.radius, fontFamily: 'Inter_600SemiBold', backgroundColor: colors.muted }]}
                  value={cashInput}
                  onChangeText={setCashInput}
                  keyboardType="decimal-pad"
                  placeholder={`0.00`}
                  placeholderTextColor={colors.mutedForeground}
                />
                {cashReceived >= total && (
                  <View style={styles.changeRow}>
                    <Text style={[styles.changeLabel, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>Change</Text>
                    <Text style={[styles.changeValue, { color: colors.success, fontFamily: 'Inter_700Bold' }]}>{storeSettings.currency} {Math.max(0, change).toFixed(2)}</Text>
                  </View>
                )}
              </View>
            )}

            <TouchableOpacity
              onPress={handleConfirmCheckout}
              style={[styles.confirmBtn, { backgroundColor: colors.primary, borderRadius: colors.radius }]}
              activeOpacity={0.85}
            >
              <Ionicons name="checkmark-circle" size={22} color="#FFFFFF" />
              <Text style={[styles.confirmBtnText, { fontFamily: 'Inter_700Bold' }]}>Confirm Payment</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      {/* Held orders modal */}
      <Modal visible={heldVisible} animationType="slide" presentationStyle="formSheet">
        <View style={[styles.modalRoot, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border, backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>Held Orders</Text>
            <TouchableOpacity onPress={() => setHeldVisible(false)}>
              <Ionicons name="close" size={24} color={colors.foreground} />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.modalContent}>
            {heldOrders.length === 0 ? (
              <View style={styles.empty}>
                <Ionicons name="pause-circle-outline" size={48} color={colors.mutedForeground} />
                <Text style={[styles.emptyText, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>No held orders</Text>
              </View>
            ) : (
              heldOrders.map(h => (
                <View key={h.id} style={[styles.heldCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.heldTitle, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>{h.items.length} item{h.items.length > 1 ? 's' : ''}</Text>
                    {h.note ? <Text style={[styles.heldNote, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>{h.note}</Text> : null}
                  </View>
                  <TouchableOpacity onPress={() => { resumeOrder(h.id); setHeldVisible(false); }} style={[styles.resumeBtn, { backgroundColor: colors.primary, borderRadius: 8 }]}>
                    <Text style={[styles.resumeText, { fontFamily: 'Inter_600SemiBold' }]}>Resume</Text>
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
  topBar: { flexDirection: 'row', gap: 10, paddingHorizontal: 12, paddingBottom: 10, borderBottomWidth: 1, alignItems: 'center' },
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
  cartPanel: { position: 'absolute', left: 0, right: 0, borderTopWidth: 1, paddingHorizontal: 12, paddingTop: 0 },
  cartToggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 52, paddingTop: 8 },
  cartSummary: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cartBadge: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  cartBadgeText: { fontSize: 12, color: '#FFFFFF' },
  cartLabel: { fontSize: 15 },
  cartRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cartTotal: { fontSize: 18 },
  cartItems: { flex: 1 },
  cartEmpty: { textAlign: 'center', paddingVertical: 16, fontSize: 14 },
  cartItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 0.5 },
  cartItemName: { flex: 1, fontSize: 14, marginRight: 8 },
  cartItemRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  qtyBtn: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  qtyNum: { fontSize: 15, minWidth: 22, textAlign: 'center' },
  cartItemPrice: { fontSize: 14, minWidth: 50, textAlign: 'right' },
  cartActions: { flexDirection: 'row', gap: 10, paddingVertical: 8, borderTopWidth: 1 },
  holdOrderBtn: { width: 70, height: 44, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 4, borderWidth: 1 },
  holdOrderText: { fontSize: 13 },
  checkoutBtn: { height: 44, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
  checkoutBtnText: { fontSize: 16 },
  modalRoot: { flex: 1 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingTop: 24, borderBottomWidth: 1 },
  modalTitle: { fontSize: 20 },
  modalContent: { padding: 20, gap: 16, paddingBottom: 40 },
  summaryBox: { padding: 16, borderWidth: 1, gap: 10 },
  summaryTitle: { fontSize: 16, marginBottom: 4 },
  summaryRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  summaryItem: { flex: 1, fontSize: 14, marginRight: 8 },
  summaryItemPrice: { fontSize: 14 },
  summaryMeta: { fontSize: 14 },
  divider: { height: 1, marginVertical: 4 },
  totalLabel: { fontSize: 16 },
  totalValue: { fontSize: 20 },
  discountRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  discountInput: { width: 60, height: 32, paddingHorizontal: 8, fontSize: 14, borderWidth: 1, textAlign: 'center' },
  payLabel: { fontSize: 16 },
  payMethods: { flexDirection: 'row', gap: 10 },
  payMethod: { flex: 1, alignItems: 'center', paddingVertical: 14, gap: 6, borderWidth: 1 },
  payMethodText: { fontSize: 13 },
  cashBox: { padding: 16, borderWidth: 1, gap: 10 },
  cashLabel: { fontSize: 15 },
  cashInput: { fontSize: 24, padding: 12, borderWidth: 1, textAlign: 'center' },
  changeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  changeLabel: { fontSize: 15 },
  changeValue: { fontSize: 20 },
  confirmBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 56, gap: 10 },
  confirmBtnText: { fontSize: 18, color: '#FFFFFF' },
  heldCard: { flexDirection: 'row', alignItems: 'center', padding: 16, borderWidth: 1, gap: 12, marginBottom: 10 },
  heldTitle: { fontSize: 15 },
  heldNote: { fontSize: 13 },
  resumeBtn: { paddingHorizontal: 14, paddingVertical: 8 },
  resumeText: { fontSize: 14, color: '#FFFFFF' },
});
