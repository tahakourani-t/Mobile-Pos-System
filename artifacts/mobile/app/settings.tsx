import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Switch, StyleSheet, Alert, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { useApp } from '@/contexts/AppContext';
import AppHeader from '@/components/AppHeader';

export default function SettingsScreen() {
  const colors = useColors();
  const { storeSettings, updateStoreSettings, logout } = useApp();
  const [editing, setEditing] = useState<string | null>(null);
  const [tempVal, setTempVal] = useState('');

  const startEdit = (key: string, val: string) => {
    setEditing(key);
    setTempVal(val);
  };

  const saveEdit = async () => {
    if (!editing) return;
    await updateStoreSettings({ [editing]: editing === 'taxRate' ? parseFloat(tempVal) || 0 : tempVal });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setEditing(null);
  };

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: logout },
    ]);
  };

  const businessFields = [
    { label: 'Store Name', key: 'name', value: storeSettings.name },
    { label: 'Address', key: 'address', value: storeSettings.address },
    { label: 'Phone', key: 'phone', value: storeSettings.phone },
    { label: 'Email', key: 'email', value: storeSettings.email },
    { label: 'VAT Number', key: 'vatNumber', value: storeSettings.vatNumber },
  ];

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <AppHeader title="Settings" />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: Platform.OS === 'web' ? 34 : 100 }]} showsVerticalScrollIndicator={false}>

        {/* Business Information */}
        <Text style={[styles.groupTitle, { color: colors.mutedForeground, fontFamily: 'Inter_500Medium' }]}>BUSINESS INFORMATION</Text>
        <View style={[styles.group, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
          {businessFields.map((f, idx) => (
            <View key={f.key}>
              {editing === f.key ? (
                <View style={styles.editRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.fieldLabel, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>{f.label}</Text>
                    <TextInput
                      style={[styles.fieldInput, { color: colors.foreground, borderColor: colors.primary, borderRadius: 8, backgroundColor: colors.muted, fontFamily: 'Inter_400Regular' }]}
                      value={tempVal}
                      onChangeText={setTempVal}
                      autoFocus
                      onSubmitEditing={saveEdit}
                    />
                  </View>
                  <TouchableOpacity onPress={saveEdit} style={[styles.saveBtn, { backgroundColor: colors.primary, borderRadius: 8 }]}>
                    <Ionicons name="checkmark" size={20} color="#FFFFFF" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setEditing(null)} style={[styles.cancelBtn, { backgroundColor: colors.muted, borderRadius: 8 }]}>
                    <Ionicons name="close" size={20} color={colors.foreground} />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  onPress={() => startEdit(f.key, f.value)}
                  style={[styles.settingRow, idx < businessFields.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }]}
                >
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

        {/* Financial Settings */}
        <Text style={[styles.groupTitle, { color: colors.mutedForeground, fontFamily: 'Inter_500Medium' }]}>FINANCIAL</Text>
        <View style={[styles.group, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
          <TouchableOpacity
            onPress={() => startEdit('currency', storeSettings.currency)}
            style={[styles.settingRow, { borderBottomWidth: 1, borderBottomColor: colors.border }]}
          >
            <View style={{ flex: 1 }}>
              <Text style={[styles.settingLabel, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>Currency</Text>
              <Text style={[styles.settingValue, { color: colors.foreground, fontFamily: 'Inter_500Medium' }]}>{storeSettings.currency}</Text>
            </View>
            <Ionicons name="pencil-outline" size={16} color={colors.mutedForeground} />
          </TouchableOpacity>
          {editing === 'taxRate' ? (
            <View style={styles.editRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.fieldLabel, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>Tax Rate (%)</Text>
                <TextInput
                  style={[styles.fieldInput, { color: colors.foreground, borderColor: colors.primary, borderRadius: 8, backgroundColor: colors.muted, fontFamily: 'Inter_400Regular' }]}
                  value={tempVal}
                  onChangeText={setTempVal}
                  keyboardType="decimal-pad"
                  autoFocus
                />
              </View>
              <TouchableOpacity onPress={saveEdit} style={[styles.saveBtn, { backgroundColor: colors.primary, borderRadius: 8 }]}><Ionicons name="checkmark" size={20} color="#FFFFFF" /></TouchableOpacity>
              <TouchableOpacity onPress={() => setEditing(null)} style={[styles.cancelBtn, { backgroundColor: colors.muted, borderRadius: 8 }]}><Ionicons name="close" size={20} color={colors.foreground} /></TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity onPress={() => startEdit('taxRate', String(storeSettings.taxRate))} style={styles.settingRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.settingLabel, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>Default Tax Rate</Text>
                <Text style={[styles.settingValue, { color: colors.foreground, fontFamily: 'Inter_500Medium' }]}>{storeSettings.taxRate}%</Text>
              </View>
              <Ionicons name="pencil-outline" size={16} color={colors.mutedForeground} />
            </TouchableOpacity>
          )}
        </View>

        {/* Preferences */}
        <Text style={[styles.groupTitle, { color: colors.mutedForeground, fontFamily: 'Inter_500Medium' }]}>PREFERENCES</Text>
        <View style={[styles.group, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
          <View style={[styles.settingRow, { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.settingLabel, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>Language</Text>
              <Text style={[styles.settingValue, { color: colors.foreground, fontFamily: 'Inter_500Medium' }]}>{storeSettings.language === 'en' ? 'English' : 'العربية'}</Text>
            </View>
            <View style={styles.langToggle}>
              <TouchableOpacity
                onPress={() => updateStoreSettings({ language: 'en' })}
                style={[styles.langBtn, { backgroundColor: storeSettings.language === 'en' ? colors.primary : colors.muted, borderRadius: 8 }]}
              >
                <Text style={[styles.langBtnText, { color: storeSettings.language === 'en' ? '#FFFFFF' : colors.foreground, fontFamily: 'Inter_500Medium' }]}>EN</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => updateStoreSettings({ language: 'ar' })}
                style={[styles.langBtn, { backgroundColor: storeSettings.language === 'ar' ? colors.primary : colors.muted, borderRadius: 8 }]}
              >
                <Text style={[styles.langBtnText, { color: storeSettings.language === 'ar' ? '#FFFFFF' : colors.foreground, fontFamily: 'Inter_500Medium' }]}>AR</Text>
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.settingRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.settingLabel, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>Theme</Text>
              <Text style={[styles.settingValue, { color: colors.foreground, fontFamily: 'Inter_500Medium' }]}>{storeSettings.theme === 'system' ? 'System Default' : storeSettings.theme === 'dark' ? 'Dark' : 'Light'}</Text>
            </View>
            <View style={styles.langToggle}>
              {(['light', 'dark', 'system'] as const).map(t => (
                <TouchableOpacity
                  key={t}
                  onPress={() => updateStoreSettings({ theme: t })}
                  style={[styles.langBtn, { backgroundColor: storeSettings.theme === t ? colors.primary : colors.muted, borderRadius: 8 }]}
                >
                  <Ionicons name={t === 'light' ? 'sunny-outline' : t === 'dark' ? 'moon-outline' : 'phone-portrait-outline'} size={16} color={storeSettings.theme === t ? '#FFFFFF' : colors.foreground} />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* App Info */}
        <Text style={[styles.groupTitle, { color: colors.mutedForeground, fontFamily: 'Inter_500Medium' }]}>ABOUT</Text>
        <View style={[styles.group, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
          {[{ label: 'Version', value: '1.0.0' }, { label: 'Build', value: '100' }].map((i, idx) => (
            <View key={i.label} style={[styles.settingRow, idx === 0 && { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
              <Text style={[styles.settingLabel, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular', flex: 1 }]}>{i.label}</Text>
              <Text style={[styles.settingValue, { color: colors.foreground, fontFamily: 'Inter_500Medium' }]}>{i.value}</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity
          onPress={handleLogout}
          style={[styles.logoutBtn, { backgroundColor: colors.destructive + '15', borderColor: colors.destructive + '40', borderRadius: colors.radius }]}
        >
          <Ionicons name="log-out-outline" size={20} color={colors.destructive} />
          <Text style={[styles.logoutText, { color: colors.destructive, fontFamily: 'Inter_600SemiBold' }]}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: 16, gap: 8 },
  groupTitle: { fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 8, marginLeft: 4 },
  group: { borderWidth: 1, overflow: 'hidden', marginBottom: 4 },
  settingRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 13, gap: 10 },
  settingLabel: { fontSize: 12, marginBottom: 2 },
  settingValue: { fontSize: 15 },
  editRow: { flexDirection: 'row', alignItems: 'flex-end', padding: 12, gap: 8 },
  fieldLabel: { fontSize: 12, marginBottom: 4 },
  fieldInput: { borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15 },
  saveBtn: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
  cancelBtn: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
  langToggle: { flexDirection: 'row', gap: 6 },
  langBtn: { width: 38, height: 34, alignItems: 'center', justifyContent: 'center' },
  langBtnText: { fontSize: 13 },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 16, borderWidth: 1, marginTop: 8 },
  logoutText: { fontSize: 16 },
});
