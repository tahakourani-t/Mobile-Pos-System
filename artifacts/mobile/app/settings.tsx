import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, Alert, Platform, Linking, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { useApp } from '@/contexts/AppContext';
import { useTranslation } from '@/hooks/useTranslation';
import AppHeader from '@/components/AppHeader';

const WHATSAPP_NUMBER = '96171735478';

const CURRENCIES = [
  { code: 'LBP', name: 'Lebanese Pound',    symbol: 'ل.ل' },
  { code: 'USD', name: 'US Dollar',         symbol: '$' },
  { code: 'EUR', name: 'Euro',              symbol: '€' },
  { code: 'SAR', name: 'Saudi Riyal',       symbol: '﷼' },
  { code: 'AED', name: 'UAE Dirham',        symbol: 'د.إ' },
  { code: 'KWD', name: 'Kuwaiti Dinar',     symbol: 'د.ك' },
  { code: 'EGP', name: 'Egyptian Pound',    symbol: 'ج.م' },
  { code: 'JOD', name: 'Jordanian Dinar',   symbol: 'د.ا' },
];

export default function SettingsScreen() {
  const colors = useColors();
  const { storeSettings, updateStoreSettings, logout, trialDaysLeft, trialExpired } = useApp();
  const { t, isRTL } = useTranslation();
  const [editing, setEditing] = useState<string | null>(null);
  const [tempVal, setTempVal] = useState('');
  const [currencyModalVisible, setCurrencyModalVisible] = useState(false);

  const startEdit = (key: string, val: string) => { setEditing(key); setTempVal(val); };

  const saveEdit = async () => {
    if (!editing) return;
    await updateStoreSettings({ [editing]: editing === 'taxRate' ? parseFloat(tempVal) || 0 : tempVal });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setEditing(null);
  };

  const handleLogout = () => {
    Alert.alert(t('signOut'), t('signOutConfirm'), [
      { text: t('cancel'), style: 'cancel' },
      { text: t('signOut'), style: 'destructive', onPress: logout },
    ]);
  };

  const openWhatsApp = () => {
    const msg = encodeURIComponent('Hello, I would like to subscribe to POS Mobile for $15/month.');
    Linking.openURL(`https://wa.me/${WHATSAPP_NUMBER}?text=${msg}`);
  };

  const handleCurrencySelect = async (code: string) => {
    await updateStoreSettings({ currency: code });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setCurrencyModalVisible(false);
  };

  const businessFields = [
    { label: t('storeName'),    key: 'name',       value: storeSettings.name },
    { label: t('storeAddress'), key: 'address',    value: storeSettings.address },
    { label: t('storePhone'),   key: 'phone',      value: storeSettings.phone },
    { label: t('storeEmail'),   key: 'email',      value: storeSettings.email },
    { label: t('vatNumber'),    key: 'vatNumber',  value: storeSettings.vatNumber },
  ];

  const themeOptions: Array<{ key: 'light' | 'dark' | 'blue' | 'system'; icon: any; label: string }> = [
    { key: 'light',  icon: 'sunny-outline',           label: t('light') },
    { key: 'dark',   icon: 'moon-outline',            label: t('dark') },
    { key: 'blue',   icon: 'water-outline',           label: t('blue') },
    { key: 'system', icon: 'phone-portrait-outline',  label: t('systemDefault') },
  ];

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <AppHeader title={t('settings')} />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: Platform.OS === 'web' ? 34 : 100 }]} showsVerticalScrollIndicator={false}>

        {/* Trial status */}
        {!trialExpired ? (
          <View style={[styles.trialBox, { backgroundColor: trialDaysLeft <= 3 ? colors.destructive + '12' : colors.primary + '10', borderColor: trialDaysLeft <= 3 ? colors.destructive + '40' : colors.primary + '30', borderRadius: colors.radius, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <Ionicons name="time-outline" size={20} color={trialDaysLeft <= 3 ? colors.destructive : colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.trialTitle, { color: trialDaysLeft <= 3 ? colors.destructive : colors.primary, fontFamily: 'Inter_600SemiBold' }]}>
                {t('freeTrial')}
              </Text>
              <Text style={[styles.trialSub, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
                {trialDaysLeft <= 1 ? t('trialLastDay') : t('trialBanner', { days: trialDaysLeft })}
              </Text>
            </View>
            <TouchableOpacity onPress={openWhatsApp} style={[styles.subscribeBtn, { backgroundColor: '#25D366', borderRadius: 8 }]}>
              <Ionicons name="logo-whatsapp" size={16} color="#FFFFFF" />
              <Text style={[{ color: '#FFFFFF', fontFamily: 'Inter_600SemiBold', fontSize: 13 }]}>$15/mo</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity onPress={openWhatsApp} style={[styles.expiredBox, { backgroundColor: colors.destructive + '12', borderColor: colors.destructive + '40', borderRadius: colors.radius, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <Ionicons name="lock-closed-outline" size={20} color={colors.destructive} />
            <Text style={[{ color: colors.destructive, fontFamily: 'Inter_600SemiBold', fontSize: 14, flex: 1 }]}>{t('trialExpired')}</Text>
            <Text style={[{ color: '#FFFFFF', fontFamily: 'Inter_600SemiBold', fontSize: 13, backgroundColor: '#25D366', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 }]}>{t('whatsappSubscribe')}</Text>
          </TouchableOpacity>
        )}

        {/* Business Information */}
        <Text style={[styles.groupTitle, { color: colors.mutedForeground, fontFamily: 'Inter_500Medium', textAlign: isRTL ? 'right' : 'left' }]}>{t('businessInfo')}</Text>
        <View style={[styles.group, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
          {businessFields.map((f, idx) => (
            <View key={f.key}>
              {editing === f.key ? (
                <View style={[styles.editRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.fieldLabel, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>{f.label}</Text>
                    <TextInput
                      style={[styles.fieldInput, { color: colors.foreground, borderColor: colors.primary, borderRadius: 8, backgroundColor: colors.muted, fontFamily: 'Inter_400Regular', textAlign: isRTL ? 'right' : 'left' }]}
                      value={tempVal}
                      onChangeText={setTempVal}
                      autoFocus
                      onSubmitEditing={saveEdit}
                    />
                  </View>
                  <TouchableOpacity onPress={saveEdit} style={[styles.actionBtn, { backgroundColor: colors.primary, borderRadius: 8 }]}><Ionicons name="checkmark" size={20} color="#FFFFFF" /></TouchableOpacity>
                  <TouchableOpacity onPress={() => setEditing(null)} style={[styles.actionBtn, { backgroundColor: colors.muted, borderRadius: 8 }]}><Ionicons name="close" size={20} color={colors.foreground} /></TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity onPress={() => startEdit(f.key, f.value)} style={[styles.settingRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }, idx < businessFields.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.settingLabel, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular', textAlign: isRTL ? 'right' : 'left' }]}>{f.label}</Text>
                    <Text style={[styles.settingValue, { color: colors.foreground, fontFamily: 'Inter_500Medium', textAlign: isRTL ? 'right' : 'left' }]}>{f.value || '—'}</Text>
                  </View>
                  <Ionicons name="pencil-outline" size={16} color={colors.mutedForeground} />
                </TouchableOpacity>
              )}
            </View>
          ))}
        </View>

        {/* Financial */}
        <Text style={[styles.groupTitle, { color: colors.mutedForeground, fontFamily: 'Inter_500Medium', textAlign: isRTL ? 'right' : 'left' }]}>{t('financial')}</Text>
        <View style={[styles.group, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
          {/* Currency — opens picker modal */}
          <TouchableOpacity
            onPress={() => setCurrencyModalVisible(true)}
            style={[styles.settingRow, { flexDirection: isRTL ? 'row-reverse' : 'row', borderBottomWidth: 1, borderBottomColor: colors.border }]}
          >
            <View style={{ flex: 1 }}>
              <Text style={[styles.settingLabel, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular', textAlign: isRTL ? 'right' : 'left' }]}>{t('currency')}</Text>
              <Text style={[styles.settingValue, { color: colors.foreground, fontFamily: 'Inter_500Medium', textAlign: isRTL ? 'right' : 'left' }]}>
                {storeSettings.currency} — {CURRENCIES.find(c => c.code === storeSettings.currency)?.name ?? storeSettings.currency}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} />
          </TouchableOpacity>

          {/* Tax rate */}
          {editing === 'taxRate' ? (
            <View style={[styles.editRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.fieldLabel, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>{t('defaultTaxRate')}</Text>
                <TextInput style={[styles.fieldInput, { color: colors.foreground, borderColor: colors.primary, borderRadius: 8, backgroundColor: colors.muted, fontFamily: 'Inter_400Regular' }]} value={tempVal} onChangeText={setTempVal} keyboardType="decimal-pad" autoFocus />
              </View>
              <TouchableOpacity onPress={saveEdit} style={[styles.actionBtn, { backgroundColor: colors.primary, borderRadius: 8 }]}><Ionicons name="checkmark" size={20} color="#FFFFFF" /></TouchableOpacity>
              <TouchableOpacity onPress={() => setEditing(null)} style={[styles.actionBtn, { backgroundColor: colors.muted, borderRadius: 8 }]}><Ionicons name="close" size={20} color={colors.foreground} /></TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity onPress={() => startEdit('taxRate', String(storeSettings.taxRate))} style={[styles.settingRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.settingLabel, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular', textAlign: isRTL ? 'right' : 'left' }]}>{t('defaultTaxRate')}</Text>
                <Text style={[styles.settingValue, { color: colors.foreground, fontFamily: 'Inter_500Medium', textAlign: isRTL ? 'right' : 'left' }]}>{storeSettings.taxRate}%</Text>
              </View>
              <Ionicons name="pencil-outline" size={16} color={colors.mutedForeground} />
            </TouchableOpacity>
          )}
        </View>

        {/* Preferences */}
        <Text style={[styles.groupTitle, { color: colors.mutedForeground, fontFamily: 'Inter_500Medium', textAlign: isRTL ? 'right' : 'left' }]}>{t('preferences')}</Text>
        <View style={[styles.group, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
          {/* Language */}
          <View style={[styles.settingRow, { flexDirection: isRTL ? 'row-reverse' : 'row', borderBottomWidth: 1, borderBottomColor: colors.border }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.settingLabel, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular', textAlign: isRTL ? 'right' : 'left' }]}>{t('language')}</Text>
              <Text style={[styles.settingValue, { color: colors.foreground, fontFamily: 'Inter_500Medium', textAlign: isRTL ? 'right' : 'left' }]}>{storeSettings.language === 'en' ? 'English' : 'العربية'}</Text>
            </View>
            <View style={styles.langToggle}>
              {(['en', 'ar'] as const).map(lang => (
                <TouchableOpacity
                  key={lang}
                  onPress={() => updateStoreSettings({ language: lang })}
                  style={[styles.langBtn, { backgroundColor: storeSettings.language === lang ? colors.primary : colors.muted, borderRadius: 8 }]}
                >
                  <Text style={[styles.langBtnText, { color: storeSettings.language === lang ? '#FFFFFF' : colors.foreground, fontFamily: 'Inter_500Medium' }]}>
                    {lang === 'en' ? 'EN' : 'ع'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Theme — 4 options: light, dark, navy, system */}
          <View style={[styles.settingRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.settingLabel, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular', textAlign: isRTL ? 'right' : 'left' }]}>{t('theme')}</Text>
              <Text style={[styles.settingValue, { color: colors.foreground, fontFamily: 'Inter_500Medium', textAlign: isRTL ? 'right' : 'left' }]}>
                {themeOptions.find(o => o.key === storeSettings.theme)?.label ?? t('light')}
              </Text>
            </View>
            <View style={styles.themeToggle}>
              {themeOptions.map(opt => (
                <TouchableOpacity
                  key={opt.key}
                  onPress={() => {
                    updateStoreSettings({ theme: opt.key });
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                  style={[
                    styles.themeBtn,
                    {
                      backgroundColor: storeSettings.theme === opt.key ? colors.primary : colors.muted,
                      borderRadius: 8,
                      borderWidth: 1.5,
                      borderColor: storeSettings.theme === opt.key ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <Ionicons name={opt.icon} size={16} color={storeSettings.theme === opt.key ? '#FFFFFF' : colors.mutedForeground} />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* About */}
        <Text style={[styles.groupTitle, { color: colors.mutedForeground, fontFamily: 'Inter_500Medium', textAlign: isRTL ? 'right' : 'left' }]}>{t('about')}</Text>
        <View style={[styles.group, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
          {[{ label: t('version'), value: '1.0.0' }, { label: t('build'), value: '100' }].map((i, idx) => (
            <View key={i.label} style={[styles.settingRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }, idx === 0 && { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
              <Text style={[styles.settingLabel, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular', flex: 1, textAlign: isRTL ? 'right' : 'left' }]}>{i.label}</Text>
              <Text style={[styles.settingValue, { color: colors.foreground, fontFamily: 'Inter_500Medium' }]}>{i.value}</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity onPress={handleLogout} style={[styles.logoutBtn, { backgroundColor: colors.destructive + '15', borderColor: colors.destructive + '40', borderRadius: colors.radius }]}>
          <Ionicons name="log-out-outline" size={20} color={colors.destructive} />
          <Text style={[styles.logoutText, { color: colors.destructive, fontFamily: 'Inter_600SemiBold' }]}>{t('signOut')}</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* ── Currency Picker Modal ── */}
      <Modal visible={currencyModalVisible} animationType="slide" presentationStyle="formSheet">
        <View style={[styles.modalRoot, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border, backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>{t('selectCurrency')}</Text>
            <TouchableOpacity onPress={() => setCurrencyModalVisible(false)}>
              <Ionicons name="close" size={24} color={colors.foreground} />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
            {CURRENCIES.map((c, idx) => (
              <TouchableOpacity
                key={c.code}
                onPress={() => handleCurrencySelect(c.code)}
                style={[
                  styles.currencyRow,
                  {
                    borderBottomWidth: idx < CURRENCIES.length - 1 ? 1 : 0,
                    borderBottomColor: colors.border,
                    backgroundColor: storeSettings.currency === c.code ? colors.primary + '10' : 'transparent',
                    flexDirection: isRTL ? 'row-reverse' : 'row',
                  },
                ]}
              >
                <View style={[styles.currencySymbolBox, { backgroundColor: colors.muted, borderRadius: 10 }]}>
                  <Text style={[styles.currencySymbol, { color: colors.primary, fontFamily: 'Inter_700Bold' }]}>{c.symbol}</Text>
                </View>
                <View style={{ flex: 1, marginLeft: isRTL ? 0 : 12, marginRight: isRTL ? 12 : 0 }}>
                  <Text style={[styles.currencyCode, { color: colors.foreground, fontFamily: 'Inter_600SemiBold', textAlign: isRTL ? 'right' : 'left' }]}>{c.code}</Text>
                  <Text style={[styles.currencyName, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular', textAlign: isRTL ? 'right' : 'left' }]}>{c.name}</Text>
                </View>
                {storeSettings.currency === c.code && (
                  <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: 16, gap: 8 },
  trialBox: { alignItems: 'center', gap: 12, padding: 14, borderWidth: 1, marginBottom: 4 },
  trialTitle: { fontSize: 15 },
  trialSub: { fontSize: 12, marginTop: 2 },
  subscribeBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 8 },
  expiredBox: { alignItems: 'center', gap: 12, padding: 14, borderWidth: 1, marginBottom: 4 },
  groupTitle: { fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 8, marginLeft: 4 },
  group: { borderWidth: 1, overflow: 'hidden', marginBottom: 4 },
  settingRow: { alignItems: 'center', paddingHorizontal: 16, paddingVertical: 13, gap: 10 },
  settingLabel: { fontSize: 12, marginBottom: 2 },
  settingValue: { fontSize: 15 },
  editRow: { alignItems: 'flex-end', padding: 12, gap: 8 },
  fieldLabel: { fontSize: 12, marginBottom: 4 },
  fieldInput: { borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15 },
  actionBtn: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
  langToggle: { flexDirection: 'row', gap: 6 },
  langBtn: { width: 38, height: 34, alignItems: 'center', justifyContent: 'center' },
  langBtnText: { fontSize: 13 },
  themeToggle: { flexDirection: 'row', gap: 6 },
  themeBtn: { width: 36, height: 34, alignItems: 'center', justifyContent: 'center' },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 16, borderWidth: 1, marginTop: 8 },
  logoutText: { fontSize: 16 },
  // Currency modal
  modalRoot: { flex: 1 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingTop: 24, borderBottomWidth: 1 },
  modalTitle: { fontSize: 18 },
  currencyRow: { alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14 },
  currencySymbolBox: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  currencySymbol: { fontSize: 16 },
  currencyCode: { fontSize: 16 },
  currencyName: { fontSize: 13, marginTop: 1 },
});
