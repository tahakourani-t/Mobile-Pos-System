import React, { useState, useMemo } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Modal, TextInput, Alert, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { useData } from '@/contexts/DataContext';
import AppHeader from '@/components/AppHeader';
import SearchBar from '@/components/SearchBar';
import Badge from '@/components/Badge';
import type { Product } from '@/types';

export default function InventoryScreen() {
  const colors = useColors();
  const { products, updateProduct } = useData();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'low' | 'out'>('all');
  const [adjustModal, setAdjustModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [adjustQty, setAdjustQty] = useState('');
  const [adjustType, setAdjustType] = useState<'add' | 'subtract' | 'set'>('add');

  const filtered = useMemo(() => {
    return products.filter(p => {
      const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase());
      if (filter === 'low') return matchSearch && p.stock > 0 && p.stock <= p.lowStockAlert;
      if (filter === 'out') return matchSearch && p.stock === 0;
      return matchSearch;
    });
  }, [products, search, filter]);

  const lowCount = products.filter(p => p.stock > 0 && p.stock <= p.lowStockAlert).length;
  const outCount = products.filter(p => p.stock === 0).length;

  const openAdjust = (p: Product) => {
    setSelectedProduct(p);
    setAdjustQty('');
    setAdjustType('add');
    setAdjustModal(true);
  };

  const handleAdjust = async () => {
    if (!selectedProduct) return;
    const qty = parseInt(adjustQty) || 0;
    if (qty <= 0 && adjustType !== 'set') { Alert.alert('Invalid', 'Enter a valid quantity.'); return; }
    let newStock = selectedProduct.stock;
    if (adjustType === 'add') newStock += qty;
    else if (adjustType === 'subtract') newStock = Math.max(0, newStock - qty);
    else newStock = parseInt(adjustQty) || 0;
    await updateProduct(selectedProduct.id, { stock: newStock });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setAdjustModal(false);
  };

  const renderItem = ({ item }: { item: Product }) => {
    const isLow = item.stock > 0 && item.stock <= item.lowStockAlert;
    const isOut = item.stock === 0;
    const pct = Math.min(100, item.lowStockAlert > 0 ? (item.stock / (item.lowStockAlert * 3)) * 100 : 100);
    const barColor = isOut ? colors.destructive : isLow ? colors.warning : colors.success;

    return (
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
        <View style={styles.cardTop}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.prodName, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]} numberOfLines={1}>{item.name}</Text>
            <Text style={[styles.sku, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>{item.sku} · {item.category}</Text>
          </View>
          <View style={styles.cardRight}>
            <Badge label={isOut ? 'Out' : isLow ? 'Low' : 'OK'} variant={isOut ? 'danger' : isLow ? 'warning' : 'success'} size="sm" />
            <TouchableOpacity onPress={() => openAdjust(item)} style={[styles.adjustBtn, { backgroundColor: colors.primary + '15', borderRadius: 8 }]}>
              <Ionicons name="create-outline" size={18} color={colors.primary} />
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.stockRow}>
          <View style={[styles.bar, { backgroundColor: colors.muted, borderRadius: 4 }]}>
            <View style={[styles.barFill, { width: `${pct}%` as any, backgroundColor: barColor, borderRadius: 4 }]} />
          </View>
          <Text style={[styles.stockNum, { color: barColor, fontFamily: 'Inter_700Bold' }]}>{item.stock} {item.unit}</Text>
        </View>
        <Text style={[styles.alertHint, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>Alert at {item.lowStockAlert} · Purchase: {item.purchasePrice.toFixed(2)}</Text>
      </View>
    );
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <AppHeader
        title="Inventory"
        subtitle={`${products.length} products`}
        rightActions={
          <View style={styles.alertsRow}>
            {lowCount > 0 && <View style={[styles.alertDot, { backgroundColor: colors.warning }]}><Text style={[styles.alertDotText, { fontFamily: 'Inter_700Bold' }]}>{lowCount}</Text></View>}
            {outCount > 0 && <View style={[styles.alertDot, { backgroundColor: colors.destructive }]}><Text style={[styles.alertDotText, { fontFamily: 'Inter_700Bold' }]}>{outCount}</Text></View>}
          </View>
        }
      />
      <View style={styles.filters}>
        <View style={styles.searchWrap}><SearchBar value={search} onChangeText={setSearch} placeholder="Search products…" /></View>
        <View style={styles.filterRow}>
          {(['all', 'low', 'out'] as const).map(f => (
            <TouchableOpacity
              key={f}
              onPress={() => setFilter(f)}
              style={[styles.filterChip, { backgroundColor: filter === f ? colors.primary : colors.muted, borderRadius: 100, borderColor: filter === f ? colors.primary : colors.border, borderWidth: 1 }]}
            >
              <Text style={[styles.filterLabel, { color: filter === f ? '#FFFFFF' : colors.foreground, fontFamily: 'Inter_500Medium' }]}>
                {f === 'all' ? `All (${products.length})` : f === 'low' ? `Low (${lowCount})` : `Out (${outCount})`}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={p => p.id}
        renderItem={renderItem}
        contentContainerStyle={[styles.list, { paddingBottom: Platform.OS === 'web' ? 34 : 100 }]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="layers-outline" size={48} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>No products match filter</Text>
          </View>
        }
      />

      <Modal visible={adjustModal} animationType="fade" transparent>
        <View style={styles.overlay}>
          <View style={[styles.dialog, { backgroundColor: colors.card, borderRadius: colors.radius + 4 }]}>
            <Text style={[styles.dialogTitle, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>Adjust Stock</Text>
            {selectedProduct && <Text style={[styles.dialogSub, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>{selectedProduct.name} · Current: {selectedProduct.stock}</Text>}
            <View style={styles.typeRow}>
              {(['add', 'subtract', 'set'] as const).map(t => (
                <TouchableOpacity key={t} onPress={() => setAdjustType(t)} style={[styles.typeBtn, { backgroundColor: adjustType === t ? colors.primary : colors.muted, borderRadius: 8 }]}>
                  <Text style={[styles.typeLabel, { color: adjustType === t ? '#FFFFFF' : colors.foreground, fontFamily: 'Inter_500Medium' }]}>{t.charAt(0).toUpperCase() + t.slice(1)}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              style={[styles.qtyInput, { color: colors.foreground, borderColor: colors.border, borderRadius: 10, backgroundColor: colors.muted, fontFamily: 'Inter_600SemiBold' }]}
              value={adjustQty}
              onChangeText={setAdjustQty}
              keyboardType="number-pad"
              placeholder="Quantity"
              placeholderTextColor={colors.mutedForeground}
              autoFocus
            />
            <View style={styles.dialogBtns}>
              <TouchableOpacity onPress={() => setAdjustModal(false)} style={[styles.dialogBtn, { backgroundColor: colors.muted, borderRadius: 10 }]}>
                <Text style={[styles.dialogBtnText, { color: colors.foreground, fontFamily: 'Inter_500Medium' }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleAdjust} style={[styles.dialogBtn, { backgroundColor: colors.primary, borderRadius: 10 }]}>
                <Text style={[styles.dialogBtnText, { color: '#FFFFFF', fontFamily: 'Inter_600SemiBold' }]}>Apply</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  filters: { padding: 12, gap: 10 },
  searchWrap: {},
  filterRow: { flexDirection: 'row', gap: 8 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 7 },
  filterLabel: { fontSize: 13 },
  list: { padding: 12, gap: 10 },
  card: { padding: 14, borderWidth: 1, gap: 10 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  prodName: { fontSize: 15 },
  sku: { fontSize: 12, marginTop: 2 },
  cardRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  adjustBtn: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  stockRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  bar: { flex: 1, height: 6, overflow: 'hidden' },
  barFill: { height: '100%' },
  stockNum: { fontSize: 14, minWidth: 60, textAlign: 'right' },
  alertHint: { fontSize: 11 },
  alertsRow: { flexDirection: 'row', gap: 6 },
  alertDot: { width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  alertDotText: { fontSize: 10, color: '#FFFFFF' },
  empty: { alignItems: 'center', paddingVertical: 60, gap: 10 },
  emptyText: { fontSize: 15 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', padding: 32 },
  dialog: { width: '100%', padding: 24, gap: 16 },
  dialogTitle: { fontSize: 20 },
  dialogSub: { fontSize: 14 },
  typeRow: { flexDirection: 'row', gap: 8 },
  typeBtn: { flex: 1, paddingVertical: 10, alignItems: 'center' },
  typeLabel: { fontSize: 14 },
  qtyInput: { fontSize: 24, padding: 14, borderWidth: 1, textAlign: 'center' },
  dialogBtns: { flexDirection: 'row', gap: 10 },
  dialogBtn: { flex: 1, paddingVertical: 14, alignItems: 'center' },
  dialogBtnText: { fontSize: 16 },
});
