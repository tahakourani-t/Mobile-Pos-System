import React, { useState, useMemo } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Modal, TextInput, ScrollView, Alert, Switch, Platform, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { useColors } from '@/hooks/useColors';
import { useData } from '@/contexts/DataContext';
import { useApp } from '@/contexts/AppContext';
import { useTranslation } from '@/hooks/useTranslation';
import SearchBar from '@/components/SearchBar';
import Badge from '@/components/Badge';
import { SkeletonRow } from '@/components/Skeleton';
import type { Product } from '@/types';
import { PRODUCT_CATEGORIES } from '@/constants/mockData';

const BLANK = {
  name: '', nameAr: '', price: '', purchasePrice: '', sku: '',
  category: 'Food', stock: '', unit: 'piece', lowStockAlert: '5', isActive: true, image: '',
};

export default function ProductsScreen() {
  const colors = useColors();
  const { products, addProduct, updateProduct, deleteProduct, isLoading } = useData();
  const { storeSettings } = useApp();
  const { t, lang, isRTL } = useTranslation();

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
      lowStockAlert: String(p.lowStockAlert), isActive: p.isActive, image: p.image ?? '',
    });
    setEditingId(p.id);
    setModalVisible(true);
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert(t('error'), 'Allow access to pick a product image.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      setForm(p => ({ ...p, image: result.assets[0].uri }));
    }
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
      image: form.image || undefined,
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

  // RTL-aware text direction props
  const inputTextStyle = isRTL ? { textAlign: 'right' as const, writingDirection: 'rtl' as const } : {};

  const renderProduct = ({ item }: { item: Product }) => {
    const isLow = item.stock > 0 && item.stock <= item.lowStockAlert;
    const isOut = item.stock === 0;
    return (
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
        <View style={styles.cardMain}>
          {/* Product image thumbnail */}
          <View style={[styles.cardThumb, { backgroundColor: colors.muted, borderRadius: 8 }]}>
            {item.image ? (
              <Image source={{ uri: item.image }} style={styles.thumbImg} resizeMode="cover" />
            ) : (
              <Ionicons name="cube-outline" size={22} color={colors.mutedForeground} />
            )}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.prodName, { color: colors.foreground, fontFamily: 'Inter_600SemiBold', textAlign: isRTL ? 'right' : 'left' }]}>
              {lang === 'ar' && item.nameAr ? item.nameAr : item.name}
            </Text>
            <Text style={[styles.prodSku, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>{item.sku} · {item.category}</Text>
          </View>
          <View style={styles.cardRight}>
            <Text style={[styles.prodPrice, { color: colors.primary, fontFamily: 'Inter_700Bold' }]}>
              {storeSettings.currency} {item.price.toLocaleString()}
            </Text>
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
        <View style={[styles.headerRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
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

      {isLoading && products.length === 0 ? (
        <ScrollView contentContainerStyle={[styles.list, { paddingBottom: Platform.OS === 'web' ? 34 : 100 }]}>
          {[0,1,2,3,4,5].map(i => <SkeletonRow key={i} />)}
        </ScrollView>
      ) : null}
      <FlatList
        data={isLoading && products.length === 0 ? [] : filtered}
        keyExtractor={p => p.id}
        renderItem={renderProduct}
        contentContainerStyle={[styles.list, { paddingBottom: Platform.OS === 'web' ? 34 : 100 }]}
        showsVerticalScrollIndicator={false}
        style={isLoading && products.length === 0 ? { display: 'none' } : undefined}
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
          <View style={[styles.modalHeader, { borderBottomColor: colors.border, backgroundColor: colors.card, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <TouchableOpacity onPress={() => setModalVisible(false)}><Ionicons name="close" size={24} color={colors.foreground} /></TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>{editingId ? t('editProduct') : t('addProduct')}</Text>
            <TouchableOpacity onPress={handleSave} style={[styles.saveBtn, { backgroundColor: colors.primary, borderRadius: 8 }]}>
              <Text style={[styles.saveBtnText, { fontFamily: 'Inter_600SemiBold' }]}>{t('save')}</Text>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={[styles.formContent, { direction: isRTL ? 'rtl' : 'ltr' }]}>

            {/* Product Image Picker */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular', textAlign: isRTL ? 'right' : 'left' }]}>
                {t('productImage')}
              </Text>
              <TouchableOpacity onPress={pickImage} activeOpacity={0.8} style={[styles.imagePicker, { backgroundColor: colors.muted, borderColor: colors.border, borderRadius: colors.radius }]}>
                {form.image ? (
                  <View style={styles.imagePreviewWrap}>
                    <Image source={{ uri: form.image }} style={styles.imagePreview} resizeMode="cover" />
                    <View style={[styles.imageEditBadge, { backgroundColor: colors.primary }]}>
                      <Ionicons name="pencil" size={12} color="#FFFFFF" />
                    </View>
                  </View>
                ) : (
                  <View style={styles.imagePlaceholder}>
                    <Ionicons name="camera-outline" size={28} color={colors.mutedForeground} />
                    <Text style={[styles.imagePlaceholderText, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
                      {t('addImage')}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>

            {/* Text fields */}
            {[
              { label: t('productName') + ' *', key: 'name', num: false, hint: '' },
              { label: t('productNameAr'),       key: 'nameAr', num: false, hint: '', forceRTL: true },
              { label: `${t('price')} * (${storeSettings.currency})`, key: 'price', num: true, hint: '' },
              { label: `${t('purchasePrice')} (${storeSettings.currency})`, key: 'purchasePrice', num: true, hint: '' },
              { label: t('sku'),          key: 'sku', num: false, hint: '' },
              { label: t('stock'),        key: 'stock', num: true, hint: '' },
              { label: t('unit'),         key: 'unit', num: false, hint: '' },
              { label: t('lowStockAlert'), key: 'lowStockAlert', num: true, hint: '' },
            ].map(f => (
              <View key={f.key} style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular', textAlign: isRTL ? 'right' : 'left' }]}>{f.label}</Text>
                <TextInput
                  style={[
                    styles.fieldInput,
                    {
                      color: colors.foreground,
                      borderColor: colors.border,
                      borderRadius: colors.radius - 4,
                      backgroundColor: colors.muted,
                      fontFamily: 'Inter_400Regular',
                      // Force RTL for Arabic name field, follow lang for others
                      textAlign: (f.forceRTL || isRTL) ? 'right' : 'left',
                    },
                  ]}
                  value={(form as any)[f.key]}
                  onChangeText={v => setForm(p => ({ ...p, [f.key]: v }))}
                  keyboardType={f.num ? 'decimal-pad' : 'default'}
                  placeholderTextColor={colors.mutedForeground}
                  // Arabic name field: always RTL keyboard
                  {...(f.forceRTL ? { textContentType: 'none' } : {})}
                />
              </View>
            ))}

            {/* Category picker */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular', textAlign: isRTL ? 'right' : 'left' }]}>{t('category')}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {PRODUCT_CATEGORIES.filter(c => c !== 'All').map(cat => (
                    <TouchableOpacity key={cat} onPress={() => setForm(p => ({ ...p, category: cat }))} style={[styles.catChip, { backgroundColor: form.category === cat ? colors.primary : colors.muted, borderRadius: 100, borderColor: form.category === cat ? colors.primary : colors.border, borderWidth: 1 }]}>
                      <Text style={[styles.catLabel, { color: form.category === cat ? '#FFFFFF' : colors.foreground, fontFamily: 'Inter_500Medium' }]}>{cat}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>

            <View style={[styles.switchRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
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
  headerRow: { alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
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
  cardMain: { flexDirection: 'row', padding: 14, gap: 12, alignItems: 'center' },
  cardThumb: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  thumbImg: { width: '100%', height: '100%' },
  prodName: { fontSize: 15 },
  prodSku: { fontSize: 12, marginTop: 2 },
  cardRight: { alignItems: 'flex-end', gap: 6 },
  prodPrice: { fontSize: 15 },
  cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 10, borderTopWidth: 1 },
  stockText: { fontSize: 13 },
  actions: { flexDirection: 'row', gap: 8 },
  iconBtn: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  empty: { alignItems: 'center', paddingVertical: 60, gap: 10 },
  modalRoot: { flex: 1 },
  modalHeader: { alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingTop: 24, borderBottomWidth: 1 },
  modalTitle: { fontSize: 18 },
  saveBtn: { paddingHorizontal: 14, paddingVertical: 8 },
  saveBtnText: { fontSize: 15, color: '#FFFFFF' },
  formContent: { padding: 20, gap: 4, paddingBottom: 40 },
  fieldGroup: { marginBottom: 14 },
  fieldLabel: { fontSize: 13, marginBottom: 6 },
  fieldInput: { borderWidth: 1, paddingHorizontal: 12, paddingVertical: 12, fontSize: 15 },
  switchRow: { alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  switchLabel: { fontSize: 15 },
  // Image picker
  imagePicker: { borderWidth: 1, borderStyle: 'dashed', overflow: 'hidden' },
  imagePreviewWrap: { position: 'relative' },
  imagePreview: { width: '100%', height: 140 },
  imageEditBadge: { position: 'absolute', bottom: 8, right: 8, width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  imagePlaceholder: { alignItems: 'center', justifyContent: 'center', height: 100, gap: 8 },
  imagePlaceholderText: { fontSize: 14 },
});
