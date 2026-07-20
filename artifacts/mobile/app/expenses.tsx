import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Modal, TextInput, ScrollView, Alert, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { useData } from '@/contexts/DataContext';
import { useApp } from '@/contexts/AppContext';
import { useTranslation } from '@/hooks/useTranslation';
import AppHeader from '@/components/AppHeader';
import type { Expense } from '@/types';

const CATEGORIES = ['Rent', 'Utilities', 'Supplies', 'Salaries', 'Marketing', 'Maintenance', 'Transport', 'Other'];
const CAT_COLORS: Record<string, string> = { Rent: '#EF4444', Utilities: '#F59E0B', Supplies: '#3B82F6', Salaries: '#10B981', Marketing: '#8B5CF6', Maintenance: '#EC4899', Transport: '#F97316', Other: '#64748B' };

export default function ExpensesScreen() {
  const colors = useColors();
  const { expenses, addExpense } = useData();
  const { storeSettings } = useApp();
  const { t, isRTL } = useTranslation();
  const [addModal, setAddModal] = useState(false);
  const [form, setForm] = useState({ category: 'Rent', amount: '', description: '', isRecurring: false });

  const total = expenses.reduce((s, e) => s + e.amount, 0);

  const handleSave = async () => {
    if (!form.amount || parseFloat(form.amount) <= 0) { Alert.alert(t('validation'), t('invalidAmount')); return; }
    await addExpense({ category: form.category, amount: parseFloat(form.amount), description: form.description, date: new Date().toISOString(), isRecurring: form.isRecurring });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setAddModal(false);
    setForm({ category: 'Rent', amount: '', description: '', isRecurring: false });
  };

  const renderExpense = ({ item }: { item: Expense }) => (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
      <View style={[styles.catDot, { backgroundColor: (CAT_COLORS[item.category] ?? colors.primary) + '20', borderRadius: 10 }]}>
        <Ionicons name="wallet-outline" size={18} color={CAT_COLORS[item.category] ?? colors.primary} />
      </View>
      <View style={styles.info}>
        <Text style={[styles.desc, { color: colors.foreground, fontFamily: 'Inter_500Medium' }]}>{item.description || item.category}</Text>
        <View style={styles.metaRow}>
          <Text style={[styles.cat, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>{item.category}</Text>
          {item.isRecurring && <Text style={[styles.recurringLabel, { color: colors.primary, fontFamily: 'Inter_400Regular' }]}>· {t('recurring')}</Text>}
        </View>
      </View>
      <Text style={[styles.amount, { color: colors.destructive, fontFamily: 'Inter_700Bold' }]}>{item.amount.toFixed(2)}</Text>
    </View>
  );

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <AppHeader
        title={t('expenses')}
        rightActions={
          <TouchableOpacity onPress={() => setAddModal(true)} style={[styles.addBtn, { backgroundColor: colors.primary, borderRadius: 8 }]}>
            <Ionicons name="add" size={22} color="#FFFFFF" />
          </TouchableOpacity>
        }
      />
      <View style={[styles.totalBox, { backgroundColor: colors.destructive + '10', borderColor: colors.destructive + '30', margin: 12, borderRadius: colors.radius, borderWidth: 1 }]}>
        <Text style={[styles.totalLabel, { color: colors.destructive, fontFamily: 'Inter_400Regular' }]}>{t('totalExpenses')}</Text>
        <Text style={[styles.totalVal, { color: colors.destructive, fontFamily: 'Inter_700Bold' }]}>{storeSettings.currency} {total.toFixed(2)}</Text>
      </View>

      <FlatList
        data={expenses}
        keyExtractor={e => e.id}
        renderItem={renderExpense}
        contentContainerStyle={[styles.list, { paddingBottom: Platform.OS === 'web' ? 34 : 100 }]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="wallet-outline" size={48} color={colors.mutedForeground} />
            <Text style={[{ color: colors.mutedForeground, fontFamily: 'Inter_400Regular', fontSize: 15 }]}>{t('noExpenses')}</Text>
          </View>
        }
      />

      <Modal visible={addModal} animationType="slide" presentationStyle="formSheet">
        <View style={[styles.modalRoot, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border, backgroundColor: colors.card, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <TouchableOpacity onPress={() => setAddModal(false)}><Ionicons name="close" size={24} color={colors.foreground} /></TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>{t('addExpense')}</Text>
            <TouchableOpacity onPress={handleSave} style={[styles.saveBtn, { backgroundColor: colors.primary, borderRadius: 8 }]}>
              <Text style={[{ color: '#FFFFFF', fontFamily: 'Inter_600SemiBold', fontSize: 15 }]}>{t('save')}</Text>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.formContent}>
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular', textAlign: isRTL ? 'right' : 'left' }]}>{t('category')}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {CATEGORIES.map(cat => (
                  <TouchableOpacity key={cat} onPress={() => setForm(p => ({ ...p, category: cat }))} style={[styles.catChip, { backgroundColor: form.category === cat ? colors.primary : colors.muted, borderRadius: 100, borderColor: form.category === cat ? colors.primary : colors.border, borderWidth: 1 }]}>
                    <Text style={[{ color: form.category === cat ? '#FFFFFF' : colors.foreground, fontFamily: 'Inter_500Medium', fontSize: 13 }]}>{cat}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular', textAlign: isRTL ? 'right' : 'left' }]}>{t('amount')}</Text>
            <TextInput style={[styles.fieldInput, { color: colors.foreground, borderColor: colors.border, borderRadius: colors.radius - 4, backgroundColor: colors.muted, fontFamily: 'Inter_400Regular', marginBottom: 16, textAlign: isRTL ? 'right' : 'left' }]} value={form.amount} onChangeText={v => setForm(p => ({ ...p, amount: v }))} keyboardType="decimal-pad" placeholder="0.00" placeholderTextColor={colors.mutedForeground} />
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular', textAlign: isRTL ? 'right' : 'left' }]}>{t('description')}</Text>
            <TextInput style={[styles.fieldInput, { color: colors.foreground, borderColor: colors.border, borderRadius: colors.radius - 4, backgroundColor: colors.muted, fontFamily: 'Inter_400Regular', marginBottom: 16, textAlign: isRTL ? 'right' : 'left' }]} value={form.description} onChangeText={v => setForm(p => ({ ...p, description: v }))} placeholder={t('optional')} placeholderTextColor={colors.mutedForeground} />
            <View style={[styles.recurringRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Text style={[styles.recurringText, { color: colors.foreground, fontFamily: 'Inter_500Medium' }]}>{t('recurringExpense')}</Text>
              <TouchableOpacity onPress={() => setForm(p => ({ ...p, isRecurring: !p.isRecurring }))} style={[styles.toggle, { backgroundColor: form.isRecurring ? colors.primary : colors.muted, borderRadius: 100 }]}>
                <View style={[styles.toggleThumb, { backgroundColor: '#FFFFFF', transform: [{ translateX: form.isRecurring ? 18 : 2 }] }]} />
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  totalBox: { padding: 16, alignItems: 'center' },
  totalLabel: { fontSize: 13 },
  totalVal: { fontSize: 28 },
  list: { padding: 12, gap: 8 },
  card: { flexDirection: 'row', alignItems: 'center', padding: 14, borderWidth: 1, gap: 12 },
  catDot: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1 },
  desc: { fontSize: 15 },
  metaRow: { flexDirection: 'row', gap: 4, marginTop: 2 },
  cat: { fontSize: 13 },
  recurringLabel: { fontSize: 13 },
  amount: { fontSize: 17 },
  addBtn: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  empty: { alignItems: 'center', paddingVertical: 60, gap: 10 },
  modalRoot: { flex: 1 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingTop: 24, borderBottomWidth: 1 },
  modalTitle: { fontSize: 18 },
  saveBtn: { paddingHorizontal: 14, paddingVertical: 8 },
  formContent: { padding: 20, paddingBottom: 40 },
  fieldLabel: { fontSize: 13, marginBottom: 6 },
  fieldInput: { borderWidth: 1, paddingHorizontal: 12, paddingVertical: 12, fontSize: 15 },
  catChip: { paddingHorizontal: 14, paddingVertical: 7 },
  recurringRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  recurringText: { fontSize: 15 },
  toggle: { width: 44, height: 26, justifyContent: 'center' },
  toggleThumb: { width: 22, height: 22, borderRadius: 11, position: 'absolute' },
});
