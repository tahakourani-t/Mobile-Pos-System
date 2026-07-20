import React, { useState, useMemo } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Modal, TextInput, ScrollView, Alert, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { useData } from '@/contexts/DataContext';
import { useTranslation } from '@/hooks/useTranslation';
import AppHeader from '@/components/AppHeader';
import SearchBar from '@/components/SearchBar';
import type { Customer } from '@/types';

const BLANK: Omit<Customer, 'id' | 'createdAt' | 'totalPurchases' | 'totalOrders' | 'points' | 'credit'> = {
  name: '', phone: '', email: '', address: '', notes: '',
};

export default function CustomersScreen() {
  const colors = useColors();
  const { customers, addCustomer } = useData();
  const { t, isRTL } = useTranslation();
  const [search, setSearch] = useState('');
  const [detailModal, setDetailModal] = useState(false);
  const [addModal, setAddModal] = useState(false);
  const [selected, setSelected] = useState<Customer | null>(null);
  const [form, setForm] = useState(BLANK);

  const filtered = useMemo(() => {
    if (!search) return customers;
    return customers.filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search));
  }, [customers, search]);

  const topCustomers = useMemo(() => [...customers].sort((a, b) => b.totalPurchases - a.totalPurchases).slice(0, 3), [customers]);

  const openDetail = (c: Customer) => { setSelected(c); setDetailModal(true); };

  const handleSave = async () => {
    if (!form.name.trim()) { Alert.alert(t('validation'), t('nameRequired')); return; }
    if (!form.phone.trim()) { Alert.alert(t('validation'), t('phoneRequired')); return; }
    await addCustomer(form);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setAddModal(false);
    setForm(BLANK);
  };

  const renderCustomer = ({ item }: { item: Customer }) => (
    <TouchableOpacity onPress={() => openDetail(item)} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]} activeOpacity={0.75}>
      <View style={[styles.avatar, { backgroundColor: colors.primary + '20' }]}>
        <Text style={[styles.avatarText, { color: colors.primary, fontFamily: 'Inter_700Bold' }]}>
          {item.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
        </Text>
      </View>
      <View style={styles.info}>
        <Text style={[styles.name, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>{item.name}</Text>
        <Text style={[styles.phone, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>{item.phone}</Text>
      </View>
      <View style={styles.right}>
        <Text style={[styles.total, { color: colors.primary, fontFamily: 'Inter_700Bold' }]}>{item.totalPurchases.toFixed(0)}</Text>
        <Text style={[styles.ordersCount, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>{item.totalOrders} {t('orders').toLowerCase()}</Text>
      </View>
    </TouchableOpacity>
  );

  const formFields = [
    { label: t('fullName'),    key: 'name',    kbType: 'default' as const },
    { label: t('phone'),       key: 'phone',   kbType: 'phone-pad' as const },
    { label: t('email'),       key: 'email',   kbType: 'email-address' as const },
    { label: t('address'),     key: 'address', kbType: 'default' as const },
    { label: t('notes'),       key: 'notes',   kbType: 'default' as const },
  ];

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <AppHeader
        title={t('customers')}
        subtitle={`${customers.length} total`}
        rightActions={
          <TouchableOpacity onPress={() => { setForm(BLANK); setAddModal(true); }} style={[styles.addBtn, { backgroundColor: colors.primary, borderRadius: 8 }]}>
            <Ionicons name="add" size={22} color="#FFFFFF" />
          </TouchableOpacity>
        }
      />
      <View style={styles.searchWrap}><SearchBar value={search} onChangeText={setSearch} placeholder={t('searchCustomers')} /></View>

      {!search && (
        <View style={styles.topSection}>
          <Text style={[styles.topTitle, { color: colors.mutedForeground, fontFamily: 'Inter_500Medium' }]}>{t('topCustomers')}</Text>
          <View style={styles.topRow}>
            {topCustomers.map((c, i) => (
              <TouchableOpacity key={c.id} onPress={() => openDetail(c)} style={[styles.topCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
                <Text style={[styles.topRank, { color: colors.primary, fontFamily: 'Inter_700Bold' }]}>#{i + 1}</Text>
                <View style={[styles.topAvatar, { backgroundColor: colors.primary + '15' }]}>
                  <Text style={[styles.topAvatarText, { color: colors.primary, fontFamily: 'Inter_700Bold' }]}>
                    {c.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                  </Text>
                </View>
                <Text style={[styles.topName, { color: colors.foreground, fontFamily: 'Inter_500Medium' }]} numberOfLines={1}>{c.name.split(' ')[0]}</Text>
                <Text style={[styles.topTotal, { color: colors.primary, fontFamily: 'Inter_600SemiBold' }]}>{c.totalPurchases.toFixed(0)}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      <FlatList
        data={filtered}
        keyExtractor={c => c.id}
        renderItem={renderCustomer}
        contentContainerStyle={[styles.list, { paddingBottom: Platform.OS === 'web' ? 34 : 100 }]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="people-outline" size={48} color={colors.mutedForeground} />
            <Text style={[{ color: colors.mutedForeground, fontFamily: 'Inter_400Regular', fontSize: 15 }]}>{t('noCustomers')}</Text>
          </View>
        }
      />

      {/* Detail */}
      <Modal visible={detailModal} animationType="slide" presentationStyle="pageSheet">
        {selected && (
          <View style={[styles.modalRoot, { backgroundColor: colors.background }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border, backgroundColor: colors.card }]}>
              <TouchableOpacity onPress={() => setDetailModal(false)}><Ionicons name="close" size={24} color={colors.foreground} /></TouchableOpacity>
              <Text style={[styles.modalTitle, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>{t('customerDetails')}</Text>
              <View style={{ width: 24 }} />
            </View>
            <ScrollView contentContainerStyle={styles.detailContent}>
              <View style={[styles.detailHero, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
                <View style={[styles.heroAvatar, { backgroundColor: colors.primary + '20' }]}>
                  <Text style={[styles.heroAvatarText, { color: colors.primary, fontFamily: 'Inter_700Bold' }]}>
                    {selected.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                  </Text>
                </View>
                <Text style={[styles.heroName, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>{selected.name}</Text>
                <Text style={[styles.heroPhone, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>{selected.phone}</Text>
              </View>
              <View style={styles.statsRow}>
                {[
                  { label: t('totalSpent'), value: selected.totalPurchases.toFixed(0), icon: 'cash-outline' as const, color: colors.primary },
                  { label: t('orders'),     value: String(selected.totalOrders),        icon: 'receipt-outline' as const, color: colors.success },
                  { label: t('points'),     value: String(selected.points),             icon: 'star-outline' as const, color: colors.warning },
                ].map(s => (
                  <View key={s.label} style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius - 2 }]}>
                    <Ionicons name={s.icon} size={18} color={s.color} />
                    <Text style={[styles.statValue, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>{s.value}</Text>
                    <Text style={[styles.statLabel, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>{s.label}</Text>
                  </View>
                ))}
              </View>
              {selected.email && <View style={[styles.infoRow, { borderBottomColor: colors.border }]}><Ionicons name="mail-outline" size={18} color={colors.mutedForeground} /><Text style={[styles.infoText, { color: colors.foreground, fontFamily: 'Inter_400Regular' }]}>{selected.email}</Text></View>}
              {selected.address && <View style={[styles.infoRow, { borderBottomColor: colors.border }]}><Ionicons name="location-outline" size={18} color={colors.mutedForeground} /><Text style={[styles.infoText, { color: colors.foreground, fontFamily: 'Inter_400Regular' }]}>{selected.address}</Text></View>}
              {selected.notes && <View style={[styles.infoRow, { borderBottomColor: colors.border }]}><Ionicons name="document-text-outline" size={18} color={colors.mutedForeground} /><Text style={[styles.infoText, { color: colors.foreground, fontFamily: 'Inter_400Regular' }]}>{selected.notes}</Text></View>}
              {selected.credit > 0 && (
                <View style={[styles.creditBox, { backgroundColor: colors.warning + '15', borderColor: colors.warning + '40', borderRadius: colors.radius }]}>
                  <Ionicons name="wallet-outline" size={20} color={colors.warning} />
                  <Text style={[styles.creditText, { color: colors.warning, fontFamily: 'Inter_600SemiBold' }]}>{t('storeCredit')}: {selected.credit.toFixed(2)}</Text>
                </View>
              )}
            </ScrollView>
          </View>
        )}
      </Modal>

      {/* Add */}
      <Modal visible={addModal} animationType="slide" presentationStyle="formSheet">
        <View style={[styles.modalRoot, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border, backgroundColor: colors.card, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <TouchableOpacity onPress={() => setAddModal(false)}><Ionicons name="close" size={24} color={colors.foreground} /></TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>{t('addCustomer')}</Text>
            <TouchableOpacity onPress={handleSave} style={[styles.saveBtn, { backgroundColor: colors.primary, borderRadius: 8 }]}>
              <Text style={[styles.saveBtnText, { fontFamily: 'Inter_600SemiBold' }]}>{t('save')}</Text>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.formContent}>
            {formFields.map(f => (
              <View key={f.key} style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular', textAlign: isRTL ? 'right' : 'left' }]}>{f.label}</Text>
                <TextInput
                  style={[styles.fieldInput, { color: colors.foreground, borderColor: colors.border, borderRadius: colors.radius - 4, backgroundColor: colors.muted, fontFamily: 'Inter_400Regular', textAlign: isRTL ? 'right' : 'left' }]}
                  value={(form as any)[f.key]}
                  onChangeText={v => setForm(prev => ({ ...prev, [f.key]: v }))}
                  keyboardType={f.kbType}
                  placeholderTextColor={colors.mutedForeground}
                />
              </View>
            ))}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  searchWrap: { padding: 12 },
  topSection: { paddingHorizontal: 12, paddingBottom: 12, gap: 8 },
  topTitle: { fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.8 },
  topRow: { flexDirection: 'row', gap: 10 },
  topCard: { flex: 1, padding: 12, borderWidth: 1, alignItems: 'center', gap: 6 },
  topRank: { fontSize: 13 },
  topAvatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  topAvatarText: { fontSize: 14 },
  topName: { fontSize: 13 },
  topTotal: { fontSize: 15 },
  list: { padding: 12, gap: 8 },
  card: { flexDirection: 'row', alignItems: 'center', padding: 14, borderWidth: 1, gap: 12 },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 16 },
  info: { flex: 1 },
  name: { fontSize: 15 },
  phone: { fontSize: 13, marginTop: 2 },
  right: { alignItems: 'flex-end', gap: 2 },
  total: { fontSize: 16 },
  ordersCount: { fontSize: 12 },
  addBtn: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  empty: { alignItems: 'center', paddingVertical: 60, gap: 10 },
  modalRoot: { flex: 1 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingTop: 24, borderBottomWidth: 1 },
  modalTitle: { fontSize: 18 },
  saveBtn: { paddingHorizontal: 14, paddingVertical: 8 },
  saveBtnText: { fontSize: 15, color: '#FFFFFF' },
  detailContent: { padding: 16, gap: 14, paddingBottom: 40 },
  detailHero: { alignItems: 'center', padding: 24, borderWidth: 1, gap: 8 },
  heroAvatar: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  heroAvatarText: { fontSize: 26 },
  heroName: { fontSize: 20 },
  heroPhone: { fontSize: 15 },
  statsRow: { flexDirection: 'row', gap: 10 },
  statCard: { flex: 1, padding: 14, borderWidth: 1, alignItems: 'center', gap: 6 },
  statValue: { fontSize: 18 },
  statLabel: { fontSize: 11 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1 },
  infoText: { flex: 1, fontSize: 15 },
  creditBox: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderWidth: 1 },
  creditText: { fontSize: 15 },
  formContent: { padding: 20, gap: 4, paddingBottom: 40 },
  fieldGroup: { marginBottom: 14 },
  fieldLabel: { fontSize: 13, marginBottom: 6 },
  fieldInput: { borderWidth: 1, paddingHorizontal: 12, paddingVertical: 12, fontSize: 15 },
});
