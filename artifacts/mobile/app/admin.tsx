import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, Modal, ActivityIndicator, Alert, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import * as api from '@/lib/api';

type AdminStore = api.ApiStore;

const PIN_LENGTH = 4;
const PAD = ['1','2','3','4','5','6','7','8','9','','0','⌫'];

// ── Helpers ───────────────────────────────────────────────────────────────────

function getPlanStatus(store: AdminStore): { label: string; color: string } {
  if (!store.isActive) return { label: 'Deactivated', color: '#EF4444' };
  if (store.planExpiry) {
    const left = new Date(store.planExpiry).getTime() - Date.now();
    if (left > 0) return { label: 'Active', color: '#10B981' };
    return { label: 'Plan Expired', color: '#F59E0B' };
  }
  // On trial
  const created = new Date(store.createdAt).getTime();
  const daysSince = Math.floor((Date.now() - created) / 86400000);
  if (daysSince < 14) return { label: `Trial (${14 - daysSince}d left)`, color: '#3B82F6' };
  return { label: 'Trial Expired', color: '#F59E0B' };
}

function getDaysLeft(store: AdminStore): string {
  if (!store.isActive) return 'Blocked';
  if (store.planExpiry) {
    const ms = new Date(store.planExpiry).getTime() - Date.now();
    if (ms <= 0) return 'Expired';
    const days = Math.ceil(ms / 86400000);
    const expDate = new Date(store.planExpiry).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    return `${days} day${days === 1 ? '' : 's'} left · Expires ${expDate}`;
  }
  const created = new Date(store.createdAt).getTime();
  const daysSince = Math.floor((Date.now() - created) / 86400000);
  const left = Math.max(0, 14 - daysSince);
  return left > 0 ? `${left} trial day${left === 1 ? '' : 's'} left` : 'Trial ended';
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function AdminScreen() {
  const colors = useColors();
  const router = useRouter();

  const [adminToken, setAdminToken]   = useState<string | null>(null);
  const [stores, setStores]           = useState<AdminStore[]>([]);
  const [loadingStores, setLoadingStores] = useState(false);

  // Login state
  const [loginEmail, setLoginEmail]   = useState('');
  const [pin, setPin]                 = useState('');
  const [loginError, setLoginError]   = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  // Activation modal
  const [activating, setActivating]   = useState<string | null>(null); // storeId
  const [actionLoading, setActionLoading] = useState(false);

  // ── Admin login ────────────────────────────────────────────────────────────
  const handleKey = async (key: string) => {
    if (key === '⌫') { setPin(p => p.slice(0, -1)); setLoginError(''); return; }
    if (key === '') return;
    if (pin.length >= PIN_LENGTH) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newPin = pin + key;
    setPin(newPin);
    setLoginError('');

    if (newPin.length === PIN_LENGTH) {
      setLoginLoading(true);
      await new Promise(r => setTimeout(r, 300));
      try {
        const result = await api.admin.login(loginEmail.trim(), newPin);
        setAdminToken(result.token);
        await loadStores(result.token);
      } catch (e: any) {
        setLoginError(e.message ?? 'Invalid credentials');
        setPin('');
      } finally {
        setLoginLoading(false);
      }
    }
  };

  const loadStores = async (token: string) => {
    setLoadingStores(true);
    try {
      const list = await api.admin.listStores(token);
      setStores(list);
    } catch {
      Alert.alert('Error', 'Could not load stores.');
    } finally {
      setLoadingStores(false);
    }
  };

  const handleActivate = async (storeId: string, duration: '1month' | '1year') => {
    if (!adminToken) return;
    setActionLoading(true);
    try {
      const updated = await api.admin.activate(storeId, duration, adminToken);
      setStores(prev => prev.map(s => s.id === storeId ? updated : s));
      setActivating(null);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Activation failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeactivate = async (storeId: string, storeName: string) => {
    if (!adminToken) return;
    Alert.alert(
      'Deactivate Store',
      `Block "${storeName}"? Users won't be able to login until reactivated.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Deactivate',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(true);
            try {
              const updated = await api.admin.deactivate(storeId, adminToken);
              setStores(prev => prev.map(s => s.id === storeId ? updated : s));
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } catch (e: any) {
              Alert.alert('Error', e.message ?? 'Failed');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ],
    );
  };

  // ── Login screen ───────────────────────────────────────────────────────────
  if (!adminToken) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <LinearGradient colors={['#1A56DB', '#0F3A9E']} style={styles.hero}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={[styles.heroIcon, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
            <Ionicons name="shield-checkmark" size={40} color="#FFFFFF" />
          </View>
          <Text style={[styles.heroTitle, { fontFamily: 'Inter_700Bold' }]}>Admin Panel</Text>
          <Text style={[styles.heroSub, { fontFamily: 'Inter_400Regular' }]}>Manage stores &amp; subscriptions</Text>
        </LinearGradient>

        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={[styles.loginCard, { backgroundColor: colors.card, borderRadius: colors.radius + 4 }]}>
            <Text style={[styles.loginLabel, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>Admin Email</Text>
            <View style={[styles.inputWrap, { borderColor: colors.border, backgroundColor: colors.muted, borderRadius: colors.radius }]}>
              <Ionicons name="mail-outline" size={18} color={colors.mutedForeground} />
              <TextInput
                style={[styles.emailInput, { color: colors.foreground, fontFamily: 'Inter_400Regular' }]}
                value={loginEmail}
                onChangeText={v => { setLoginEmail(v); setLoginError(''); }}
                placeholder="admin@example.com"
                placeholderTextColor={colors.mutedForeground}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <Text style={[styles.loginLabel, { color: colors.foreground, fontFamily: 'Inter_600SemiBold', marginTop: 8 }]}>PIN</Text>
            <View style={styles.dotsRow}>
              {Array.from({ length: PIN_LENGTH }).map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.dot,
                    {
                      backgroundColor: i < pin.length ? colors.primary : colors.border,
                      transform: [{ scale: i < pin.length ? 1.15 : 1 }],
                    },
                  ]}
                />
              ))}
            </View>

            {loginError ? (
              <Text style={[styles.errorText, { color: colors.destructive, fontFamily: 'Inter_400Regular' }]}>{loginError}</Text>
            ) : null}

            {loginLoading ? (
              <ActivityIndicator color={colors.primary} style={{ marginTop: 16 }} />
            ) : (
              <View style={styles.pad}>
                {PAD.map((k, i) => (
                  <TouchableOpacity
                    key={i}
                    style={[
                      styles.padKey,
                      {
                        backgroundColor: k === '⌫' ? colors.muted : k === '' ? 'transparent' : colors.background,
                        borderColor: k === '' || k === '⌫' ? 'transparent' : colors.border,
                        borderRadius: colors.radius + 2,
                        shadowColor: k === '' || k === '⌫' ? 'transparent' : '#000',
                        shadowOpacity: 0.05, shadowRadius: 3,
                        shadowOffset: { width: 0, height: 1 }, elevation: k === '' || k === '⌫' ? 0 : 2,
                      },
                    ]}
                    onPress={() => handleKey(k)}
                    disabled={loginLoading || k === ''}
                    activeOpacity={k === '' ? 1 : 0.7}
                  >
                    {k === '⌫' ? (
                      <Ionicons name="backspace-outline" size={20} color={colors.foreground} />
                    ) : k !== '' ? (
                      <Text style={[styles.padKeyText, { color: colors.foreground, fontFamily: 'Inter_500Medium' }]}>{k}</Text>
                    ) : null}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </ScrollView>
      </View>
    );
  }

  // ── Store management ────────────────────────────────────────────────────────
  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <LinearGradient colors={['#1A56DB', '#0F3A9E']} style={[styles.hero, { paddingBottom: 24 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.heroRow}>
          <View style={[styles.heroIcon, { backgroundColor: 'rgba(255,255,255,0.15)', width: 48, height: 48 }]}>
            <Ionicons name="shield-checkmark" size={26} color="#FFFFFF" />
          </View>
          <View>
            <Text style={[styles.heroTitle, { fontFamily: 'Inter_700Bold', fontSize: 20, textAlign: 'left' }]}>Admin Panel</Text>
            <Text style={[styles.heroSub, { fontFamily: 'Inter_400Regular', fontSize: 13 }]}>{stores.length} store{stores.length !== 1 ? 's' : ''} registered</Text>
          </View>
        </View>
      </LinearGradient>

      {loadingStores ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={[styles.scrollContent, { paddingTop: 16 }]} showsVerticalScrollIndicator={false}>
          {stores.length === 0 ? (
            <View style={styles.centered}>
              <Ionicons name="storefront-outline" size={48} color={colors.mutedForeground} />
              <Text style={[{ color: colors.mutedForeground, fontFamily: 'Inter_400Regular', marginTop: 8 }]}>No stores yet</Text>
            </View>
          ) : (
            stores.map(store => {
              const status = getPlanStatus(store);
              const daysLeft = getDaysLeft(store);
              return (
                <View key={store.id} style={[styles.storeCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius + 2 }]}>
                  {/* Store header */}
                  <View style={styles.storeHeader}>
                    <View style={[styles.storeAvatar, { backgroundColor: colors.primary + '18', borderRadius: 12 }]}>
                      <Ionicons name="storefront-outline" size={22} color={colors.primary} />
                    </View>
                    <View style={styles.storeInfo}>
                      <Text style={[styles.storeName, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>{store.name}</Text>
                      <Text style={[styles.storeEmail, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]} numberOfLines={1}>{store.email || store.phone || 'No contact'}</Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: status.color + '18', borderRadius: 20 }]}>
                      <View style={[styles.statusDot, { backgroundColor: status.color }]} />
                      <Text style={[styles.statusText, { color: status.color, fontFamily: 'Inter_600SemiBold' }]}>{status.label}</Text>
                    </View>
                  </View>

                  {/* Duration counter */}
                  <View style={[styles.durationRow, { backgroundColor: colors.muted, borderRadius: 10 }]}>
                    <Ionicons name="time-outline" size={15} color={colors.mutedForeground} />
                    <Text style={[styles.durationText, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>{daysLeft}</Text>
                  </View>

                  {/* Actions */}
                  <View style={styles.actionsRow}>
                    <TouchableOpacity
                      onPress={() => setActivating(store.id)}
                      style={[styles.activateBtn, { backgroundColor: '#10B981', borderRadius: colors.radius }]}
                      disabled={actionLoading}
                    >
                      <Ionicons name="checkmark-circle-outline" size={16} color="#FFFFFF" />
                      <Text style={[styles.actionBtnText, { fontFamily: 'Inter_600SemiBold' }]}>Activate</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => handleDeactivate(store.id, store.name)}
                      style={[styles.deactivateBtn, { borderColor: '#EF4444', borderRadius: colors.radius }]}
                      disabled={actionLoading || !store.isActive}
                    >
                      <Ionicons name="ban-outline" size={16} color={store.isActive ? '#EF4444' : colors.mutedForeground} />
                      <Text style={[styles.actionBtnText, { color: store.isActive ? '#EF4444' : colors.mutedForeground, fontFamily: 'Inter_600SemiBold' }]}>
                        Deactivate
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}

          {/* Refresh */}
          <TouchableOpacity
            onPress={() => loadStores(adminToken)}
            style={[styles.refreshBtn, { borderColor: colors.border, borderRadius: colors.radius }]}
          >
            <Ionicons name="refresh-outline" size={18} color={colors.primary} />
            <Text style={[styles.refreshText, { color: colors.primary, fontFamily: 'Inter_500Medium' }]}>Refresh</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* ── Activation modal ── */}
      <Modal visible={!!activating} transparent animationType="slide" onRequestClose={() => setActivating(null)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.card, borderRadius: colors.radius + 8 }]}>
            <Text style={[styles.modalTitle, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>
              Activate Store
            </Text>
            <Text style={[styles.modalSub, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
              Choose the subscription duration
            </Text>

            {actionLoading ? (
              <ActivityIndicator color={colors.primary} style={{ marginVertical: 24 }} />
            ) : (
              <View style={styles.durationBtns}>
                <TouchableOpacity
                  onPress={() => activating && handleActivate(activating, '1month')}
                  style={[styles.durationBtn, { backgroundColor: colors.primary, borderRadius: colors.radius }]}
                >
                  <Ionicons name="calendar-outline" size={22} color="#FFFFFF" />
                  <Text style={[styles.durationBtnTitle, { fontFamily: 'Inter_700Bold' }]}>1 Month</Text>
                  <Text style={[styles.durationBtnSub, { fontFamily: 'Inter_400Regular' }]}>30 days access</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => activating && handleActivate(activating, '1year')}
                  style={[styles.durationBtn, { backgroundColor: '#8B5CF6', borderRadius: colors.radius }]}
                >
                  <Ionicons name="ribbon-outline" size={22} color="#FFFFFF" />
                  <Text style={[styles.durationBtnTitle, { fontFamily: 'Inter_700Bold' }]}>1 Year</Text>
                  <Text style={[styles.durationBtnSub, { fontFamily: 'Inter_400Regular' }]}>365 days access</Text>
                </TouchableOpacity>
              </View>
            )}

            <TouchableOpacity onPress={() => setActivating(null)} style={styles.cancelBtn}>
              <Text style={[styles.cancelText, { color: colors.mutedForeground, fontFamily: 'Inter_500Medium' }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  hero: {
    paddingTop: Platform.OS === 'web' ? 80 : 80,
    paddingBottom: 32,
    paddingHorizontal: 24,
    alignItems: 'center',
    gap: 10,
  },
  backBtn: { position: 'absolute', top: Platform.OS === 'web' ? 24 : 52, left: 20 },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  heroIcon: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  heroTitle: { fontSize: 22, color: '#FFFFFF', textAlign: 'center' },
  heroSub: { fontSize: 14, color: 'rgba(255,255,255,0.75)', textAlign: 'center' },
  scroll: { flex: 1, marginTop: -20 },
  scrollContent: { padding: 20, gap: 14, paddingBottom: 40 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60, gap: 12 },
  loginCard: {
    padding: 24,
    shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 }, elevation: 4,
    gap: 10,
  },
  loginLabel: { fontSize: 14 },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, paddingHorizontal: 14, height: 48, gap: 10,
  },
  emailInput: { flex: 1, fontSize: 15 },
  dotsRow: { flexDirection: 'row', gap: 20, justifyContent: 'center', marginVertical: 8 },
  dot: { width: 16, height: 16, borderRadius: 8 },
  errorText: { fontSize: 13, textAlign: 'center' },
  pad: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 10,
    maxWidth: 300, alignSelf: 'center', justifyContent: 'center', marginTop: 4,
  },
  padKey: { width: 80, height: 56, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  padKeyText: { fontSize: 22 },
  storeCard: {
    borderWidth: 1, padding: 16, gap: 12,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  storeHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  storeAvatar: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  storeInfo: { flex: 1 },
  storeName: { fontSize: 15 },
  storeEmail: { fontSize: 12, marginTop: 2 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 4 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 11 },
  durationRow: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10 },
  durationText: { fontSize: 13, flex: 1 },
  actionsRow: { flexDirection: 'row', gap: 10 },
  activateBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 10,
  },
  deactivateBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 10, borderWidth: 1.5,
  },
  actionBtnText: { fontSize: 14, color: '#FFFFFF' },
  refreshBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, borderWidth: 1, paddingVertical: 12,
  },
  refreshText: { fontSize: 14 },
  // Modal
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center', justifyContent: 'flex-end',
  },
  modalCard: {
    width: '100%', padding: 28, gap: 8,
    shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 20,
    shadowOffset: { width: 0, height: -4 }, elevation: 20,
  },
  modalTitle: { fontSize: 22, textAlign: 'center' },
  modalSub: { fontSize: 14, textAlign: 'center', marginBottom: 8 },
  durationBtns: { flexDirection: 'row', gap: 12, marginVertical: 8 },
  durationBtn: {
    flex: 1, padding: 20, alignItems: 'center', gap: 6,
  },
  durationBtnTitle: { fontSize: 18, color: '#FFFFFF' },
  durationBtnSub: { fontSize: 12, color: 'rgba(255,255,255,0.8)' },
  cancelBtn: { paddingVertical: 12, alignItems: 'center' },
  cancelText: { fontSize: 15 },
});
