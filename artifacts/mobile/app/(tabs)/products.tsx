import React, { useState, useMemo } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Modal, TextInput, ScrollView, Alert, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { useData } from '@/contexts/DataContext';
import SearchBar from '@/components/SearchBar';
import Badge from '@/components/Badge';
import type { Product } from '@/types';
import { PRODUCT_CATEGORIES, generateId } from '@/constants/mockData';

const BLANK_PRODUCT: Omit<Product, 'id' | 'createdAt'> = {
  name: '', nameAr: '', description: '', price: 0, purchasePrice: 0, sku: '',
  barcode: '', category: 'Food', stock: 0, unit: 'piece', isActive: true, lowStockAlert: 5,
};

export default function ProductsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { products, addProduct, updateProduct, deleteProduct } = useData();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [modalVisible, setModalVisible] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [form, setForm] = useState<Omit<Product, 'id' | 'createdAt'>>(BLANK_PRODUCT);

  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  const filtered = useMemo(() => {
    return products.filter(p => {
      const matchCat = category === 'All' || p.category === category;
      const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [products, category, search]);

  const openAdd = () => {
    setEditProduct(null);
    setForm({ ...BLANK_PRODUCT, sku: `SKU-${generateId().slice(0, 6).toUpperCase()}` });
    setModalVisible(true);
  };

  const openEdit = (p: Product) => {
    setEditProduct(p);
    const { id, createdAt, ...rest } = p;
    setForm(rest);
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { Alert.alert('Validation', 'Product name is required.'); return; }
    if (form.price <= 0) { Alert.alert('Validation', 'Price must be greater than 0.'); return; }
    try {
      if (editProduct) {
        await updateProduct(editProduct.id, form);
      } else {
        await addProduct(form);
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setModalVisible(false);
    } catch {
      Alert.alert('Error', 'Failed to save product.');
    }
  };

  const handleDelete = (p: Product) => {
    Alert.alert('Delete Product', `Delete "${p.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await deleteProduct(p.id); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); } },
    ]);
  };

  const renderProduct = ({ item }: { item: Product }) => {
    const isLow = item.stock > 0 && item.stock <= item.lowStockAlert;
    const isOut = item.stock === 0;
    return (
      <TouchableOpacity onPress={() => openEdit(item)} style={[styles.row, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]} activeOpacity={0.75}>
        <View style={[styles.catDot, { backgroundColor: '#3B82F6' }]} />
        <View style={styles.info}>
          <Text style={[styles.productName, { color: colors.foreground, fontFamily: 'Inter_500Medium' }]} numberOfLines={1}>{item.name}</Text>
          <Text style={[styles.sku, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>{item.sku} · {item.category}</Text>
        </View>
        <View style={styles.right}>
          <Text style={[styles.price, { color: colors.primary, fontFamily: 'Inter_700Bold' }]}>{item.price.toFixed(2)}</Text>
          <Badge label={isOut ? 'Out' : isLow ? `Low ${item.stock}` : `${item.stock}`} variant={isOut ? 'danger' : isLow ? 'warning' : 'success'} size="sm" />
        </View>
        <TouchableOpacity onPress={() => handleDelete(item)} style={styles.deleteBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="trash-outline" size={18} color={colors.destructive} />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border, paddingTop: topPad + 12 }]}>
        <Text style={[styles.title, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>Products</Text>
        <Text style={[styles.count, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>{filtered.length} items</Text>
        <TouchableOpacity onPress={openAdd} style={[styles.addBtn, { backgroundColor: colors.primary, borderRadius: colors.radius }]}>
          <Ionicons name="add" size={20} color="#FFFFFF" />
          <Text style={[styles.addBtnText, { fontFamily: 'Inter_600SemiBold' }]}>Add</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.searchBar, { paddingHorizontal: 12, paddingTop: 10 }]}>
        <SearchBar value={search} onChangeText={setSearch} placeholder="Search name or SKU…" />
      </View>

      {/* Category filter */}
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

      <FlatList
        data={filtered}
        keyExtractor={p => p.id}
        renderItem={renderProduct}
        contentContainerStyle={[styles.list, { paddingBottom: Platform.OS === 'web' ? 34 : 100 }]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="cube-outline" size={48} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>No products found</Text>
          </View>
        }
      />

      {/* Add/Edit Modal */}
      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.modalRoot, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border, backgroundColor: colors.card }]}>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Ionicons name="close" size={24} color={colors.foreground} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>{editProduct ? 'Edit Product' : 'Add Product'}</Text>
            <TouchableOpacity onPress={handleSave} style={[styles.saveBtn, { backgroundColor: colors.primary, borderRadius: 8 }]}>
              <Text style={[styles.saveBtnText, { fontFamily: 'Inter_600SemiBold' }]}>Save</Text>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.formContent} showsVerticalScrollIndicator={false}>
            {[
              { label: 'Product Name *', key: 'name', keyboard: 'default' as const },
              { label: 'Arabic Name', key: 'nameAr', keyboard: 'default' as const },
              { label: 'SKU', key: 'sku', keyboard: 'default' as const },
              { label: 'Barcode', key: 'barcode', keyboard: 'default' as const },
              { label: 'Description', key: 'description', keyboard: 'default' as const },
            ].map(f => (
              <View key={f.key} style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>{f.label}</Text>
                <TextInput
                  style={[styles.fieldInput, { color: colors.foreground, borderColor: colors.border, borderRadius: colors.radius - 4, backgroundColor: colors.muted, fontFamily: 'Inter_400Regular' }]}
                  value={String((form as any)[f.key] ?? '')}
                  onChangeText={v => setForm(prev => ({ ...prev, [f.key]: v }))}
                  keyboardType={f.keyboard}
                  placeholderTextColor={colors.mutedForeground}
                />
              </View>
            ))}
            <View style={styles.row2}>
              {[{ label: 'Selling Price *', key: 'price' }, { label: 'Purchase Price', key: 'purchasePrice' }].map(f => (
                <View key={f.key} style={[styles.fieldGroup, { flex: 1 }]}>
                  <Text style={[styles.fieldLabel, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>{f.label}</Text>
                  <TextInput
                    style={[styles.fieldInput, { color: colors.foreground, borderColor: colors.border, borderRadius: colors.radius - 4, backgroundColor: colors.muted, fontFamily: 'Inter_400Regular' }]}
                    value={String((form as any)[f.key] ?? '')}
                    onChangeText={v => setForm(prev => ({ ...prev, [f.key]: parseFloat(v) || 0 }))}
                    keyboardType="decimal-pad"
                    placeholderTextColor={colors.mutedForeground}
                  />
                </View>
              ))}
            </View>
            <View style={styles.row2}>
              {[{ label: 'Stock Qty', key: 'stock' }, { label: 'Low Stock Alert', key: 'lowStockAlert' }].map(f => (
                <View key={f.key} style={[styles.fieldGroup, { flex: 1 }]}>
                  <Text style={[styles.fieldLabel, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>{f.label}</Text>
                  <TextInput
                    style={[styles.fieldInput, { color: colors.foreground, borderColor: colors.border, borderRadius: colors.radius - 4, backgroundColor: colors.muted, fontFamily: 'Inter_400Regular' }]}
                    value={String((form as any)[f.key] ?? '')}
                    onChangeText={v => setForm(prev => ({ ...prev, [f.key]: parseInt(v) || 0 }))}
                    keyboardType="number-pad"
                    placeholderTextColor={colors.mutedForeground}
                  />
                </View>
              ))}
            </View>
            {/* Category picker */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>Category</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {PRODUCT_CATEGORIES.filter(c => c !== 'All').map(cat => (
                    <TouchableOpacity
                      key={cat}
                      onPress={() => setForm(prev => ({ ...prev, category: cat }))}
                      style={[styles.catChipSm, { backgroundColor: form.category === cat ? colors.primary : colors.muted, borderRadius: 100, borderColor: form.category === cat ? colors.primary : colors.border, borderWidth: 1 }]}
                    >
                      <Text style={[{ color: form.category === cat ? '#FFFFFF' : colors.foreground, fontFamily: 'Inter_500Medium', fontSize: 13 }]}>{cat}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, gap: 8 },
  title: { fontSize: 22, flex: 1 },
  count: { fontSize: 14 },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 9 },
  addBtnText: { fontSize: 15, color: '#FFFFFF' },
  searchBar: { paddingBottom: 8 },
  catScroll: { paddingHorizontal: 12, paddingBottom: 8, gap: 8 },
  catChip: { paddingHorizontal: 14, paddingVertical: 7 },
  catLabel: { fontSize: 13 },
  list: { padding: 12, gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', padding: 14, borderWidth: 1, gap: 12 },
  catDot: { width: 6, height: 6, borderRadius: 3 },
  info: { flex: 1 },
  productName: { fontSize: 15 },
  sku: { fontSize: 12, marginTop: 2 },
  right: { alignItems: 'flex-end', gap: 5 },
  price: { fontSize: 16 },
  deleteBtn: { padding: 4 },
  empty: { alignItems: 'center', paddingVertical: 60, gap: 10 },
  emptyText: { fontSize: 15 },
  modalRoot: { flex: 1 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingTop: 24, borderBottomWidth: 1 },
  modalTitle: { fontSize: 18 },
  saveBtn: { paddingHorizontal: 16, paddingVertical: 8 },
  saveBtnText: { fontSize: 15, color: '#FFFFFF' },
  formContent: { padding: 20, gap: 4, paddingBottom: 40 },
  fieldGroup: { marginBottom: 14 },
  fieldLabel: { fontSize: 13, marginBottom: 6 },
  fieldInput: { borderWidth: 1, paddingHorizontal: 12, paddingVertical: 12, fontSize: 15 },
  row2: { flexDirection: 'row', gap: 12 },
  catChipSm: { paddingHorizontal: 12, paddingVertical: 6 },
});
