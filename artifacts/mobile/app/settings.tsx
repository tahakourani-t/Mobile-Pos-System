import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, Alert, Platform, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { useApp } from '@/contexts/AppContext';
import { useTranslation } from '@/hooks/useTranslation';
import AppHeader from '@/components/AppHeader';

const WHATSAPP_NUMBER = '96171735478';

export default function SettingsScreen() {
  const colors = useColors();
  const { storeSettings, updateStoreSettings, logout, trialDaysLeft, trialExpired } = useApp();
  const { t } = useTranslation();
  const [editing, setEditing] = useState<string | null>(null);
  const [tempVal, setTempVal] = useState('');

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

  const businessFields = [
    { label: t('storeName'),    key: 'name',       value: storeSettings.name },
    { label: t('storeAddress'), key: 'address',    value: storeSettings.address },
    { label: t('storePhone'),   key: 'phone',      value: storeSettings.phone },
    { label: t('storeEmail'),   key: 'email',      value: storeSettings.email },
    { label: t('vatNumber'),    key: 'vatNumber',  value: storeSettings.vatNumber },
  ];

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <AppHeader title={t('settings')} />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: Platform.OS === 'web' ? 34 : 100 }]} showsVerticalScrollIndicator={false}>

        {/* Trial status */}
        {!trialExpired ? (
          <View style={[styles.trialBox, { backgroundColor: trialDaysLeft <= 3 ? colors.destructive + '12' : colors.primary + '10', borderColor: trialDaysLeft <= 3 ? colors.destructive + '40' : colors.primary + '30', borderRadius: colors.radius }]}>
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
          <TouchableOpacity onPress={openWhatsApp} style={[styles.expiredBox, { backgroundColor: colors.destructive + '12', borderColor: colors.destructive + '40', borderRadius: colors.radius }]}>
            <Ionicons name="lock-closed-outline" size={20} color={colors.destructive} />
            <Text style={[{ color: colors.destructive, fontFamily: 'Inter_600SemiBold', fontSize: 14, flex: 1 }]}>{t('trialExpired')}</Text>
            <Text style={[{ color: '#FFFFFF', fontFamily: 'Inter_600SemiBold', fontSize: 13, backgroundColor: '#25D366', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 }]}>{t('whatsappSubscribe')}</Text>
          </TouchableOpacity>
        )}

        {/* Business Information */}
        <Text style={[styles.groupTitle, { color: colors.mutedForeground, fontFamily: 'Inter_500Medium' }]}>{t('businessInfo')}</Text>
        <View style={[styles.group, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
          {businessFields.map((f, idx) => (
            <View key={f.key}>
              {editing === f.key ? (
                <View style={styles.editRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.fieldLabel, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>{f.label}</Text>
                    <TextInput style={[styles.fieldInput, { color: colors.foreground, borderColor: colors.primary, borderRadius: 8, backgroundColor: colors.muted, fontFamily: 'Inter_400Regular' }]} value={tempVal} onChangeText={setTempVal} autoFocus onSubmitEditing={saveEdit} />
                  </View>
                  <TouchableOpacity onPress={saveEdit} style={[styles.actionBtn, { backgroundColor: colors.primary, borderRadius: 8 }]}><Ionicons name="checkmark" size={20} color="#FFFFFF" /></TouchableOpacity>
                  <TouchableOpacity onPress={() => setEditing(null)} style={[styles.actionBtn, { backgroundColor: colors.muted, borderRadius: 8 }]}><Ionicons name="close" size={20} color={colors.foreground} /></TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity onPress={() => startEdit(f.key, f.value)} style={[styles.settingRow, idx < businessFields.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.settingLabel, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>{f.label}</Text>
                    <Text style={[styles.settingValue, { color: colors.foreground, fontFamily: 'Inter_500Medium' }]}>{f.value}</Text>
                  </View>
                  <Ionicons name="pencil-outline" size={16} color={colors.mutedForeground} />
                </TouchableOpacity>
              )}
            </View>
          ))}
        </View>

        {/* Financial */}
        <Text style={[styles.groupTitle, { color: colors.mutedForeground, fontFamily: 'Inter_500Medium' }]}>{t('financial')}</Text>
        <View style={[styles.group, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
          <TouchableOpacity onPress={() => startEdit('currency', storeSettings.currency)} style={[styles.settingRow, { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.settingLabel, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>{t('currency')}</Text>
              <Text style={[styles.settingValue, { color: colors.foreground, fontFamily: 'Inter_500Medium' }]}>{storeSettings.currency}</Text>
            </View>
            <Ionicons name="pencil-outline" size={16} color={colors.mutedForeground} />
          </TouchableOpacity>
          {editing === 'taxRate' ? (
            <View style={styles.editRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.fieldLabel, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>{t('defaultTaxRate')}</Text>
                <TextInput style={[styles.fieldInput, { color: colors.foreground, borderColor: colors.primary, borderRadius: 8, backgroundColor: colors.muted, fontFamily: 'Inter_400Regular' }]} value={tempVal} onChangeText={setTempVal} keyboardType="decimal-pad" autoFocus />
              </View>
              <TouchableOpacity onPress={saveEdit} style={[styles.actionBtn, { backgroundColor: colors.primary, borderRadius: 8 }]}><Ionicons name="checkmark" size={20} color="#FFFFFF" /></TouchableOpacity>
              <TouchableOpacity onPress={() => setEditing(null)} style={[styles.actionBtn, { backgroundColor: colors.muted, borderRadius: 8 }]}><Ionicons name="close" size={20} color={colors.foreground} /></TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity onPress={() => startEdit('taxRate', String(storeSettings.taxRate))} style={styles.settingRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.settingLabel, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>{t('defaultTaxRate')}</Text>
                <Text style={[styles.settingValue, { color: colors.foreground, fontFamily: 'Inter_500Medium' }]}>{storeSettings.taxRate}%</Text>
              </View>
              <Ionicons name="pencil-outline" size={16} color={colors.mutedForeground} />
            </TouchableOpacity>
          )}
        </View>

        {/* Preferences */}
        <Text style={[styles.groupTitle, { color: colors.mutedForeground, fontFamily: 'Inter_500Medium' }]}>{t('preferences')}</Text>
        <View style={[styles.group, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
          {/* Language */}
          <View style={[styles.settingRow, { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.settingLabel, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>{t('language')}</Text>
              <Text style={[styles.settingValue, { color: colors.foreground, fontFamily: 'Inter_500Medium' }]}>{storeSettings.language === 'en' ? 'English' : 'العربية'}</Text>
            </View>
            <View style={styles.langToggle}>
              {(['en', 'ar'] as const).map(lang => (
                <TouchableOpacity key={lang} onPress={() => updateStoreSettings({ language: lang })} style={[styles.langBtn, { backgroundColor: storeSettings.language === lang ? colors.primary : colors.muted, borderRadius: 8 }]}>
                  <Text style={[styles.langBtnText, { color: storeSettings.language === lang ? '#FFFFFF' : colors.foreground, fontFamily: 'Inter_500Medium' }]}>{lang === 'en' ? 'EN' : 'ع'}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          {/* Theme */}
          <View style={styles.settingRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.settingLabel, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>{t('theme')}</Text>
              <Text style={[styles.settingValue, { color: colors.foreground, fontFamily: 'Inter_500Medium' }]}>{storeSettings.theme === 'system' ? t('systemDefault') : storeSettings.theme === 'dark' ? t('dark') : t('light')}</Text>
            </View>
            <View style={styles.langToggle}>
              {(['light', 'dark', 'system'] as const).map(th => (
                <TouchableOpacity key={th} onPress={() => updateStoreSettings({ theme: th })} style={[styles.langBtn, { backgroundColor: storeSettings.theme === th ? colors.primary : colors.muted, borderRadius: 8 }]}>
                  <Ionicons name={th === 'light' ? 'sunny-outline' : th === 'dark' ? 'moon-outline' : 'phone-portrait-outline'} size={16} color={storeSettings.theme === th ? '#FFFFFF' : colors.foreground} />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* About */}
        <Text style={[styles.groupTitle, { color: colors.mutedForeground, fontFamily: 'Inter_500Medium' }]}>{t('about')}</Text>
        <View style={[styles.group, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
          {[{ label: t('version'), value: '1.0.0' }, { label: t('build'), value: '100' }].map((i, idx) => (
            <View key={i.label} style={[styles.settingRow, idx === 0 && { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
              <Text style={[styles.settingLabel, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular', flex: 1 }]}>{i.label}</Text>
              <Text style={[styles.settingValue, { color: colors.foreground, fontFamily: 'Inter_500Medium' }]}>{i.value}</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity onPress={handleLogout} style={[styles.logoutBtn, { backgroundColor: colors.destructive + '15', borderColor: colors.destructive + '40', borderRadius: colors.radius }]}>
          <Ionicons name="log-out-outline" size={20} color={colors.destructive} />
          <Text style={[styles.logoutText, { color: colors.destructive, fontFamily: 'Inter_600SemiBold' }]}>{t('signOut')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: 16, gap: 8 },
  trialBox: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderWidth: 1, marginBottom: 4 },
  trialTitle: { fontSize: 15 },
  trialSub: { fontSize: 12, marginTop: 2 },
  subscribeBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 8 },
  expiredBox: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderWidth: 1, marginBottom: 4 },
  groupTitle: { fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 8, marginLeft: 4 },
  group: { borderWidth: 1, overflow: 'hidden', marginBottom: 4 },
  settingRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 13, gap: 10 },
  settingLabel: { fontSize: 12, marginBottom: 2 },
  settingValue: { fontSize: 15 },
  editRow: { flexDirection: 'row', alignItems: 'flex-end', padding: 12, gap: 8 },
  fieldLabel: { fontSize: 12, marginBottom: 4 },
  fieldInput: { borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15 },
  actionBtn: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
  langToggle: { flexDirection: 'row', gap: 6 },
  langBtn: { width: 38, height: 34, alignItems: 'center', justifyContent: 'center' },
  langBtnText: { fontSize: 13 },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 16, borderWidth: 1, marginTop: 8 },
  logoutText: { fontSize: 16 },
});
