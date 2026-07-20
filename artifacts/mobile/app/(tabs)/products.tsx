import React, { useState, useMemo } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Modal, TextInput, ScrollView, Alert, Switch, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { useData } from '@/contexts/DataContext';
import { useTranslation } from '@/hooks/useTranslation';
import SearchBar from '@/components/SearchBar';
import Badge from '@/components/Badge';
import type { Product } from '@/types';
import { PRODUCT_CATEGORIES } from '@/constants/mockData';

const BLANK = {
  name: '', nameAr: '', price: '', purchasePrice: '', sku: '',
  category: 'Groceries', stock: '', unit: 'pcs', lowStockAlert: '5', isActive: true,
};

export default function ProductsScreen() {
  const colors = useColors();
  const { products, addProduct, updateProduct, deleteProduct } = useData();
  const { t, lang } = useTranslation();

  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('All');
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(BLANK);

  const filtered = useMemo(() => {
    return products.filter(p => {
      const matchCat = filterCat === 'All' || p.category === filterCat;
      const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [products, search, filterCat]);

  const openAdd = () => { setForm(BLANK); setEditingId(null); setModalVisible(true); };

  const openEdit = (p: Product) => {
    setForm({
      name: p.name, nameAr: p.nameAr ?? '', price: String(p.price), purchasePrice: String(p.purchasePrice),
      sku: p.sku, category: p.category, stock: String(p.stock), unit: p.unit,
      lowStockAlert: String(p.lowStockAlert), isActive: p.isActive,
    });
    setEditingId(p.id);
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { Alert.alert(t('validation'), `${t('productName')} ${t('required')}.`); return; }
    if (!form.price || isNaN(Number(form.price))) { Alert.alert(t('validation'), `${t('price')} ${t('required')}.`); return; }
    const data = {
      name: form.name.trim(), nameAr: form.nameAr.trim() || undefined,
      price: parseFloat(form.price) || 0, purchasePrice: parseFloat(form.purchasePrice) || 0,
      sku: form.sku.trim(), category: form.category, stock: parseInt(form.stock) || 0,
      unit: form.unit, lowStockAlert: parseInt(form.lowStockAlert) || 5,
      isActive: form.isActive,
    };
    if (editingId) {
      await updateProduct(editingId, data);
    } else {
      await addProduct(data);
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setModalVisible(false);
  };

  const handleDelete = (p: Product) => {
    Alert.alert(t('deleteProduct'), t('deleteConfirm'), [
      { text: t('cancel'), style: 'cancel' },
      { text: t('delete'), style: 'destructive', onPress: async () => { await deleteProduct(p.id); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); } },
    ]);
  };

  const renderProduct = ({ item }: { item: Product }) => {
    const isLow = item.stock > 0 && item.stock <= item.lowStockAlert;
    const isOut = item.stock === 0;
    return (
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
        <View style={styles.cardMain}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.prodName, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>
              {lang === 'ar' && item.nameAr ? item.nameAr : item.name}
            </Text>
            <Text style={[styles.prodSku, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>{item.sku} · {item.category}</Text>
          </View>
          <View style={styles.cardRight}>
            <Text style={[styles.prodPrice, { color: colors.primary, fontFamily: 'Inter_700Bold' }]}>{item.price.toFixed(2)}</Text>
            <Badge label={isOut ? t('outOfStockShort') : isLow ? t('lowStock') : 'OK'} variant={isOut ? 'danger' : isLow ? 'warning' : 'success'} size="sm" />
          </View>
        </View>
        <View style={[styles.cardFooter, { borderTopColor: colors.border }]}>
          <Text style={[styles.stockText, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
            {t('stock')}: <Text style={{ color: isOut ? colors.destructive : isLow ? colors.warning : colors.success, fontFamily: 'Inter_600SemiBold' }}>{item.stock} {item.unit}</Text>
          </Text>
          <View style={styles.actions}>
            <TouchableOpacity onPress={() => openEdit(item)} style={[styles.iconBtn, { backgroundColor: colors.primary + '15', borderRadius: 8 }]}>
              <Ionicons name="create-outline" size={18} color={colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleDelete(item)} style={[styles.iconBtn, { backgroundColor: colors.destructive + '15', borderRadius: 8 }]}>
              <Ionicons name="trash-outline" size={18} color={colors.destructive} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <View style={styles.headerRow}>
          <View>
            <Text style={[styles.title, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>{t('products')}</Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>{products.length} total</Text>
          </View>
          <TouchableOpacity onPress={openAdd} style={[styles.addBtn, { backgroundColor: colors.primary, borderRadius: 10 }]}>
            <Ionicons name="add" size={22} color="#FFFFFF" />
            <Text style={[styles.addBtnText, { fontFamily: 'Inter_600SemiBold' }]}>{t('add')}</Text>
          </TouchableOpacity>
        </View>
        <SearchBar value={search} onChangeText={setSearch} placeholder={t('searchProductsPlaceholder')} />
      </View>

      {/* Category filter */}
      <View style={[styles.catBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catScroll}>
          {PRODUCT_CATEGORIES.map(cat => (
            <TouchableOpacity key={cat} onPress={() => setFilterCat(cat)} style={[styles.catChip, { backgroundColor: filterCat === cat ? colors.primary : colors.muted, borderRadius: 100, borderColor: filterCat === cat ? colors.primary : colors.border, borderWidth: 1 }]}>
              <Text style={[styles.catLabel, { color: filterCat === cat ? '#FFFFFF' : colors.foreground, fontFamily: 'Inter_500Medium' }]}>{cat}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={p => p.id}
        renderItem={renderProduct}
        contentContainerStyle={[styles.list, { paddingBottom: Platform.OS === 'web' ? 34 : 100 }]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="cube-outline" size={48} color={colors.mutedForeground} />
            <Text style={[{ color: colors.mutedForeground, fontFamily: 'Inter_400Regular', fontSize: 15 }]}>{t('noProductsFound')}</Text>
          </View>
        }
      />

      {/* Add / Edit Modal */}
      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.modalRoot, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border, backgroundColor: colors.card }]}>
            <TouchableOpacity onPress={() => setModalVisible(false)}><Ionicons name="close" size={24} color={colors.foreground} /></TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>{editingId ? t('editProduct') : t('addProduct')}</Text>
            <TouchableOpacity onPress={handleSave} style={[styles.saveBtn, { backgroundColor: colors.primary, borderRadius: 8 }]}>
              <Text style={[styles.saveBtnText, { fontFamily: 'Inter_600SemiBold' }]}>{t('save')}</Text>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.formContent}>
            {[
              { label: t('productName') + ' *', key: 'name' },
              { label: t('productNameAr'), key: 'nameAr' },
              { label: t('price') + ' *', key: 'price', num: true },
              { label: t('purchasePrice'), key: 'purchasePrice', num: true },
              { label: t('sku'), key: 'sku' },
              { label: t('stock'), key: 'stock', num: true },
              { label: t('unit'), key: 'unit' },
              { label: t('lowStockAlert'), key: 'lowStockAlert', num: true },
            ].map(f => (
              <View key={f.key} style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>{f.label}</Text>
                <TextInput
                  style={[styles.fieldInput, { color: colors.foreground, borderColor: colors.border, borderRadius: colors.radius - 4, backgroundColor: colors.muted, fontFamily: 'Inter_400Regular' }]}
                  value={(form as any)[f.key]}
                  onChangeText={v => setForm(p => ({ ...p, [f.key]: v }))}
                  keyboardType={f.num ? 'decimal-pad' : 'default'}
                  placeholderTextColor={colors.mutedForeground}
                />
              </View>
            ))}
            {/* Category picker */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>{t('category')}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {PRODUCT_CATEGORIES.map(cat => (
                    <TouchableOpacity key={cat} onPress={() => setForm(p => ({ ...p, category: cat }))} style={[styles.catChip, { backgroundColor: form.category === cat ? colors.primary : colors.muted, borderRadius: 100, borderColor: form.category === cat ? colors.primary : colors.border, borderWidth: 1 }]}>
                      <Text style={[styles.catLabel, { color: form.category === cat ? '#FFFFFF' : colors.foreground, fontFamily: 'Inter_500Medium' }]}>{cat}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>
            <View style={styles.switchRow}>
              <Text style={[styles.switchLabel, { color: colors.foreground, fontFamily: 'Inter_500Medium' }]}>{t('active')}</Text>
              <Switch value={form.isActive} onValueChange={v => setForm(p => ({ ...p, isActive: v }))} trackColor={{ true: colors.primary }} />
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { padding: 16, paddingTop: Platform.OS === 'web' ? 80 : 60, borderBottomWidth: 1, gap: 10 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  title: { fontSize: 24 },
  subtitle: { fontSize: 14, marginTop: 2 },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 10 },
  addBtnText: { fontSize: 15, color: '#FFFFFF' },
  catBar: { paddingVertical: 8, borderBottomWidth: 1 },
  catScroll: { paddingHorizontal: 12, gap: 8 },
  catChip: { paddingHorizontal: 14, paddingVertical: 7 },
  catLabel: { fontSize: 13 },
  list: { padding: 12, gap: 10 },
  card: { borderWidth: 1, overflow: 'hidden' },
  cardMain: { flexDirection: 'row', padding: 14, gap: 12 },
  prodName: { fontSize: 15 },
  prodSku: { fontSize: 12, marginTop: 2 },
  cardRight: { alignItems: 'flex-end', gap: 6 },
  prodPrice: { fontSize: 17 },
  cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 10, borderTopWidth: 1 },
  stockText: { fontSize: 13 },
  actions: { flexDirection: 'row', gap: 8 },
  iconBtn: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  empty: { alignItems: 'center', paddingVertical: 60, gap: 10 },
  modalRoot: { flex: 1 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingTop: 24, borderBottomWidth: 1 },
  modalTitle: { fontSize: 18 },
  saveBtn: { paddingHorizontal: 14, paddingVertical: 8 },
  saveBtnText: { fontSize: 15, color: '#FFFFFF' },
  formContent: { padding: 20, gap: 4, paddingBottom: 40 },
  fieldGroup: { marginBottom: 14 },
  fieldLabel: { fontSize: 13, marginBottom: 6 },
  fieldInput: { borderWidth: 1, paddingHorizontal: 12, paddingVertical: 12, fontSize: 15 },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  switchLabel: { fontSize: 15 },
});
