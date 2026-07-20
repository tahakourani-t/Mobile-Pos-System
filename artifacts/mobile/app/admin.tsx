/**
 * Admin Panel — superadmin only.
 *
 * Flow: superadmin logs in via the single /login screen → AuthGuard sends them
 * here → adminToken already stored in AsyncStorage → 2-tab panel shown directly.
 * No second PIN screen — there is only ONE login screen in the app.
 *
 * Tabs:
 *   1. Stores  — activate (1 month / 1 year) / block, live coloured duration counter
 *   2. Notify  — compose & send an email reminder to any store owner via SMTP
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, ActivityIndicator, Alert, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { useApp } from '@/contexts/AppContext';
import { SkeletonCard } from '@/components/Skeleton';
import * as api from '@/lib/api';

type AdminStore = api.ApiStore;
type Tab = 'stores' | 'notify';

// ── Plan helpers ──────────────────────────────────────────────────────────────

function planColor(store: AdminStore): string {
  if (!store.isActive) return '#EF4444';
  if (store.planExpiry) {
    return new Date(store.planExpiry).getTime() > Date.now() ? '#10B981' : '#F59E0B';
  }
  const d = Math.floor((Date.now() - new Date(store.createdAt).getTime()) / 86400000);
  return d < 14 ? '#3B82F6' : '#F59E0B';
}

function planLabel(store: AdminStore): string {
  if (!store.isActive) return 'Blocked';
  if (store.planExpiry) {
    const ms = new Date(store.planExpiry).getTime() - Date.now();
    if (ms <= 0) return 'Plan expired';
    const d = Math.ceil(ms / 86400000);
    const exp = new Date(store.planExpiry).toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
    return `${d} day${d === 1 ? '' : 's'} left · expires ${exp}`;
  }
  const d = Math.floor((Date.now() - new Date(store.createdAt).getTime()) / 86400000);
  const left = Math.max(0, 14 - d);
  return left > 0 ? `Trial · ${left} day${left === 1 ? '' : 's'} left` : 'Trial ended';
}

function isPaid(store: AdminStore): boolean {
  return !!(store.isActive && store.planExpiry && new Date(store.planExpiry).getTime() > Date.now());
}

// ═════════════════════════════════════════════════════════════════════════════
export default function AdminScreen() {
  const colors       = useColors();
  const router       = useRouter();
  const { logout }   = useApp();

  // ── auth
  const [token, setToken]           = useState<string | null>(null);
  const [tokenLoading, setTokenLoading] = useState(true);

  // ── data
  const [stores, setStores]         = useState<AdminStore[]>([]);
  const [dataLoading, setDataLoading] = useState(false);

  // ── tabs
  const [tab, setTab]               = useState<Tab>('stores');

  // ── per-store busy
  const [activating, setActivating] = useState<string | null>(null);

  // ── notify form
  const [notifyId, setNotifyId]     = useState('');
  const [subject, setSubject]       = useState('');
  const [message, setMessage]       = useState('');
  const [notifyBusy, setNotifyBusy] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  // ── Restore saved adminToken on mount
  useEffect(() => {
    (async () => {
      const saved = await AsyncStorage.getItem('admin_token');
      if (saved) {
        setToken(saved);
        await loadStores(saved);
      }
      setTokenLoading(false);
    })();
  }, []);

  const loadStores = useCallback(async (t: string) => {
    setDataLoading(true);
    try {
      const list = await api.admin.listStores(t);
      setStores(list);
      if (list.length > 0) setNotifyId(id => id || list[0].id);
    } catch {
      Alert.alert('Error', 'Could not load stores.');
    } finally {
      setDataLoading(false);
    }
  }, []);

  // ── Actions ───────────────────────────────────────────────────────────────
  const handleActivate = async (storeId: string, duration: '1month' | '1year') => {
    if (!token) return;
    setActivating(storeId);
    try {
      const updated = await api.admin.activate(storeId, duration, token);
      setStores(prev => prev.map(s => s.id === storeId ? updated : s));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Activation failed');
    } finally {
      setActivating(null);
    }
  };

  const handleBlock = (storeId: string, name: string) => {
    if (!token) return;
    Alert.alert('Block Store', `Block "${name}"? Users won't be able to log in.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Block', style: 'destructive',
        onPress: async () => {
          setActivating(storeId);
          try {
            const updated = await api.admin.deactivate(storeId, token);
            setStores(prev => prev.map(s => s.id === storeId ? updated : s));
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          } catch (e: any) {
            Alert.alert('Error', e.message ?? 'Failed');
          } finally {
            setActivating(null);
          }
        },
      },
    ]);
  };

  const handleSend = async () => {
    if (!token || !notifyId || !message.trim()) {
      Alert.alert('Missing info', 'Select a store and write a message.');
      return;
    }
    const store = stores.find(s => s.id === notifyId);
    if (!store?.email) {
      Alert.alert('No email', `"${store?.name}" has no email address.`);
      return;
    }
    setNotifyBusy(true);
    try {
      await api.admin.notify(notifyId, message.trim(), subject.trim(), token);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Sent ✓', `Email delivered to ${store.email}`);
      setMessage('');
      setSubject('');
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Send failed');
    } finally {
      setNotifyBusy(false);
    }
  };

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Sign out of your admin account?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out', style: 'destructive',
          onPress: logout,
        },
      ],
    );
  };

  // ── Loading — checking AsyncStorage ───────────────────────────────────────
  if (tokenLoading) {
    return (
      <View style={[s.root, { backgroundColor: colors.background }]}>
        <LinearGradient colors={['#1A56DB', '#0F3A9E']} style={s.header}>
          <View style={{ width: 22 }} />
          <View style={s.headerCenter}>
            <Text style={[s.headerTitle, { fontFamily: 'Inter_700Bold' }]}>Admin Panel</Text>
          </View>
          <View style={{ width: 22 }} />
        </LinearGradient>
        <View style={[s.tabBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          {(['stores', 'notify'] as Tab[]).map(t => (
            <View key={t} style={[s.tabItem, s.tabItemActive, { borderBottomColor: t === 'stores' ? colors.primary : 'transparent' }]}>
              <View style={{ width: 18, height: 18, backgroundColor: colors.border, borderRadius: 4 }} />
              <View style={{ width: 50, height: 12, backgroundColor: colors.border, borderRadius: 4 }} />
            </View>
          ))}
        </View>
        <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingTop: 20 }}>
          {[0, 1, 2, 3].map(i => <SkeletonCard key={i} />)}
        </ScrollView>
      </View>
    );
  }

  // ── No token — regular user navigated here manually; just send them back ──
  if (!token) {
    return (
      <View style={[s.root, s.center, { backgroundColor: colors.background }]}>
        <View style={[{ width: 80, height: 80, borderRadius: 40, backgroundColor: colors.muted, alignItems: 'center', justifyContent: 'center' }]}>
          <Ionicons name="lock-closed-outline" size={36} color={colors.mutedForeground} />
        </View>
        <Text style={[{ color: colors.foreground, fontFamily: 'Inter_700Bold', fontSize: 20, marginTop: 16, textAlign: 'center' }]}>
          Admin Access Only
        </Text>
        <Text style={[{ color: colors.mutedForeground, fontFamily: 'Inter_400Regular', fontSize: 14, textAlign: 'center', lineHeight: 22, marginTop: 6 }]}>
          This panel is restricted to admin accounts.{'\n'}Sign in with your admin credentials.
        </Text>
        <TouchableOpacity
          onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}
          style={[s.goLoginBtn, { backgroundColor: colors.muted, borderRadius: colors.radius }]}
        >
          <Ionicons name="arrow-back" size={16} color={colors.foreground} />
          <Text style={[{ color: colors.foreground, fontFamily: 'Inter_600SemiBold', fontSize: 15 }]}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Main 2-tab panel ──────────────────────────────────────────────────────
  const notifyStore = stores.find(s => s.id === notifyId);

  return (
    <View style={[s.root, { backgroundColor: colors.background }]}>

      {/* ── Header ── */}
      <LinearGradient colors={['#1A56DB', '#0F3A9E']} style={s.header}>
        {/* Sign out button — left side */}
        <TouchableOpacity
          onPress={handleSignOut}
          style={s.signOutBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          activeOpacity={0.8}
        >
          <Ionicons name="log-out-outline" size={18} color="rgba(255,255,255,0.9)" />
          <Text style={[s.signOutTxt, { fontFamily: 'Inter_600SemiBold' }]}>Sign Out</Text>
        </TouchableOpacity>

        <View style={s.headerCenter}>
          <Text style={[s.headerTitle, { fontFamily: 'Inter_700Bold' }]}>Admin Panel</Text>
          <Text style={[s.headerSub, { fontFamily: 'Inter_400Regular' }]}>
            {stores.length} store{stores.length !== 1 ? 's' : ''}
          </Text>
        </View>

        {/* Refresh — right side */}
        <TouchableOpacity
          onPress={() => token && loadStores(token)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          activeOpacity={0.8}
        >
          <Ionicons name="refresh-outline" size={22} color="rgba(255,255,255,0.85)" />
        </TouchableOpacity>
      </LinearGradient>

      {/* ── Tab bar ── */}
      <View style={[s.tabBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        {(['stores', 'notify'] as Tab[]).map(t => {
          const active = tab === t;
          const label  = t === 'stores' ? 'Stores' : 'Notifications';
          const icon   = t === 'stores' ? 'storefront-outline' : 'send-outline';
          return (
            <TouchableOpacity
              key={t}
              onPress={() => setTab(t)}
              style={[s.tabItem, active && [s.tabItemActive, { borderBottomColor: colors.primary }]]}
              activeOpacity={0.8}
            >
              <Ionicons name={icon as any} size={18} color={active ? colors.primary : colors.mutedForeground} />
              <Text style={[s.tabLabel, {
                color: active ? colors.primary : colors.mutedForeground,
                fontFamily: active ? 'Inter_700Bold' : 'Inter_500Medium',
              }]}>
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ══════════════ TAB 1 — STORES ══════════════ */}
      {tab === 'stores' && (
        dataLoading
          ? (
            <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingTop: 20 }}>
              {[0, 1, 2, 3].map(i => <SkeletonCard key={i} />)}
            </ScrollView>
          )
          : stores.length === 0
            ? (
              <View style={s.center}>
                <Ionicons name="storefront-outline" size={52} color={colors.mutedForeground} />
                <Text style={{ color: colors.mutedForeground, fontFamily: 'Inter_400Regular', marginTop: 10 }}>
                  No stores yet
                </Text>
              </View>
            )
            : (
              <ScrollView
                contentContainerStyle={[s.list, { paddingBottom: 60 }]}
                showsVerticalScrollIndicator={false}
              >
                {stores.map(store => {
                  const color  = planColor(store);
                  const label  = planLabel(store);
                  const paid   = isPaid(store);
                  const isBusy = activating === store.id;

                  return (
                    <View key={store.id} style={[s.card, {
                      backgroundColor: colors.card,
                      borderColor: colors.border,
                      borderRadius: colors.radius + 2,
                    }]}>

                      {/* Identity */}
                      <View style={s.cardHead}>
                        <View style={[s.avatar, { backgroundColor: colors.primary + '18', borderRadius: 12 }]}>
                          <Ionicons name="storefront-outline" size={22} color={colors.primary} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[s.storeName, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>
                            {store.name}
                          </Text>
                          <Text style={[s.storeEmail, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}
                            numberOfLines={1}>
                            {store.email ?? store.phone ?? 'No contact'}
                          </Text>
                        </View>
                        <View style={[s.badge, {
                          backgroundColor: store.isVerified ? '#10B98118' : '#F59E0B18',
                          borderRadius: 20,
                        }]}>
                          <Ionicons
                            name={store.isVerified ? 'checkmark-circle' : 'mail-unread-outline'}
                            size={13}
                            color={store.isVerified ? '#10B981' : '#F59E0B'}
                          />
                          <Text style={[s.badgeTxt, {
                            color: store.isVerified ? '#10B981' : '#F59E0B',
                            fontFamily: 'Inter_600SemiBold',
                          }]}>
                            {store.isVerified ? 'Verified' : 'Unverified'}
                          </Text>
                        </View>
                      </View>

                      {/* Duration counter */}
                      <View style={[s.counter, {
                        backgroundColor: color + '15',
                        borderLeftColor: color,
                        borderRadius: 10,
                      }]}>
                        <Ionicons name={paid ? 'ribbon-outline' : 'time-outline'} size={14} color={color} />
                        <Text style={[s.counterTxt, { color, fontFamily: 'Inter_600SemiBold' }]} numberOfLines={1}>
                          {label}
                        </Text>
                        {paid && (
                          <View style={[s.paidTag, { backgroundColor: '#10B981' }]}>
                            <Text style={[s.paidTxt, { fontFamily: 'Inter_700Bold' }]}>PAID</Text>
                          </View>
                        )}
                      </View>

                      {/* Action buttons */}
                      {isBusy
                        ? <ActivityIndicator color={colors.primary} style={{ marginVertical: 6 }} />
                        : (
                          <View style={s.btnRow}>
                            <TouchableOpacity
                              onPress={() => handleActivate(store.id, '1month')}
                              style={[s.btn, { backgroundColor: '#10B981', borderRadius: colors.radius }]}
                              activeOpacity={0.85}
                            >
                              <Ionicons name="calendar-outline" size={14} color="#fff" />
                              <Text style={[s.btnTxt, { fontFamily: 'Inter_700Bold' }]}>1 Month</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                              onPress={() => handleActivate(store.id, '1year')}
                              style={[s.btn, { backgroundColor: '#8B5CF6', borderRadius: colors.radius }]}
                              activeOpacity={0.85}
                            >
                              <Ionicons name="ribbon-outline" size={14} color="#fff" />
                              <Text style={[s.btnTxt, { fontFamily: 'Inter_700Bold' }]}>1 Year</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                              onPress={() => handleBlock(store.id, store.name)}
                              disabled={!store.isActive}
                              style={[s.btn, {
                                backgroundColor: '#EF4444',
                                borderRadius: colors.radius,
                                opacity: store.isActive ? 1 : 0.35,
                              }]}
                              activeOpacity={0.85}
                            >
                              <Ionicons name="ban-outline" size={14} color="#fff" />
                              <Text style={[s.btnTxt, { fontFamily: 'Inter_700Bold' }]}>Block</Text>
                            </TouchableOpacity>
                          </View>
                        )}
                    </View>
                  );
                })}
              </ScrollView>
            )
      )}

      {/* ══════════════ TAB 2 — NOTIFY ══════════════ */}
      {tab === 'notify' && (
        <ScrollView
          contentContainerStyle={[s.list, { paddingBottom: 60 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={[s.sectionTitle, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>
            Send Email Reminder
          </Text>
          <Text style={[s.sectionSub, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
            Send a notification or reminder directly to a store owner's email via SMTP.
          </Text>

          {/* Store picker */}
          <Text style={[s.fieldLabel, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>Store</Text>
          <TouchableOpacity
            onPress={() => setPickerOpen(p => !p)}
            style={[s.picker, { borderColor: colors.border, backgroundColor: colors.muted, borderRadius: colors.radius }]}
            activeOpacity={0.8}
          >
            <Ionicons name="storefront-outline" size={18} color={colors.mutedForeground} />
            <View style={{ flex: 1 }}>
              <Text style={[s.pickerName, {
                color: notifyStore ? colors.foreground : colors.mutedForeground,
                fontFamily: 'Inter_600SemiBold',
              }]}>
                {notifyStore?.name ?? 'Choose a store…'}
              </Text>
              {notifyStore && (
                <Text style={[s.pickerEmail, {
                  color: notifyStore.email ? colors.mutedForeground : '#F59E0B',
                  fontFamily: 'Inter_400Regular',
                }]}>
                  {notifyStore.email ?? 'No email on file'}
                </Text>
              )}
            </View>
            <Ionicons name={pickerOpen ? 'chevron-up' : 'chevron-down'} size={16} color={colors.mutedForeground} />
          </TouchableOpacity>

          {pickerOpen && (
            <View style={[s.dropdown, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
              {stores.map(store => (
                <TouchableOpacity
                  key={store.id}
                  onPress={() => { setNotifyId(store.id); setPickerOpen(false); }}
                  style={[s.dropRow, {
                    backgroundColor: store.id === notifyId ? colors.primary + '12' : 'transparent',
                    borderRadius: colors.radius - 2,
                  }]}
                  activeOpacity={0.75}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[s.pickerName, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>
                      {store.name}
                    </Text>
                    <Text style={[s.pickerEmail, {
                      color: store.email ? colors.mutedForeground : '#F59E0B',
                      fontFamily: 'Inter_400Regular',
                    }]}>
                      {store.email ?? 'No email on file'}
                    </Text>
                  </View>
                  {store.id === notifyId && (
                    <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Selected store plan status */}
          {notifyStore && (
            <View style={[s.counter, {
              backgroundColor: planColor(notifyStore) + '15',
              borderLeftColor: planColor(notifyStore),
              borderRadius: 10,
              marginTop: 2,
            }]}>
              <Ionicons name="time-outline" size={13} color={planColor(notifyStore)} />
              <Text style={[s.counterTxt, { color: planColor(notifyStore), fontFamily: 'Inter_600SemiBold' }]}
                numberOfLines={1}>
                {planLabel(notifyStore)}
              </Text>
            </View>
          )}

          {/* Subject */}
          <Text style={[s.fieldLabel, { color: colors.foreground, fontFamily: 'Inter_600SemiBold', marginTop: 14 }]}>
            Subject{' '}
            <Text style={{ color: colors.mutedForeground, fontWeight: '400' }}>(optional)</Text>
          </Text>
          <View style={[s.inputRow, { borderColor: colors.border, backgroundColor: colors.muted, borderRadius: colors.radius }]}>
            <Ionicons name="text-outline" size={16} color={colors.mutedForeground} />
            <TextInput
              style={[s.input, { color: colors.foreground, fontFamily: 'Inter_400Regular' }]}
              value={subject}
              onChangeText={setSubject}
              placeholder="e.g. Your subscription expires soon"
              placeholderTextColor={colors.mutedForeground}
            />
          </View>

          {/* Message */}
          <Text style={[s.fieldLabel, { color: colors.foreground, fontFamily: 'Inter_600SemiBold', marginTop: 14 }]}>
            Message
          </Text>
          <View style={[s.msgBox, { borderColor: colors.border, backgroundColor: colors.muted, borderRadius: colors.radius }]}>
            <TextInput
              style={[s.msg, { color: colors.foreground, fontFamily: 'Inter_400Regular' }]}
              value={message}
              onChangeText={setMessage}
              placeholder="Write your notification or reminder here…"
              placeholderTextColor={colors.mutedForeground}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
            />
          </View>

          {/* Quick templates */}
          <Text style={[s.tmplLabel, { color: colors.mutedForeground, fontFamily: 'Inter_500Medium' }]}>
            Quick templates:
          </Text>
          <View style={s.tmplRow}>
            {[
              { label: 'Expiry soon',  text: 'Your subscription is expiring soon. Please renew to keep your POS system running without interruption.' },
              { label: 'Payment due',  text: 'Your payment is due. Please contact us to renew your subscription.' },
              { label: 'Plan expired', text: 'Your subscription has expired and your account is now restricted. Please renew immediately to restore access.' },
            ].map(t => (
              <TouchableOpacity
                key={t.label}
                onPress={() => setMessage(t.text)}
                style={[s.tmpl, { backgroundColor: colors.muted, borderColor: colors.border, borderRadius: colors.radius }]}
                activeOpacity={0.75}
              >
                <Text style={[s.tmplTxt, { color: colors.foreground, fontFamily: 'Inter_500Medium' }]}>{t.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Send */}
          <TouchableOpacity
            onPress={handleSend}
            disabled={notifyBusy || !message.trim()}
            style={[s.sendBtn, {
              backgroundColor: notifyBusy || !message.trim() ? colors.muted : '#3B82F6',
              borderRadius: colors.radius,
            }]}
            activeOpacity={0.85}
          >
            {notifyBusy
              ? <ActivityIndicator color="#fff" />
              : (
                <>
                  <Ionicons name="send" size={18} color="#fff" />
                  <Text style={[s.sendTxt, { fontFamily: 'Inter_700Bold' }]}>
                    {notifyStore?.email ? `Send to ${notifyStore.email}` : 'Send Notification'}
                  </Text>
                </>
              )}
          </TouchableOpacity>
        </ScrollView>
      )}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root:    { flex: 1 },
  center:  { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
  list:    { padding: 16, gap: 14 },

  goLoginBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 28, paddingVertical: 14, marginTop: 16 },

  // header
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingTop: Platform.OS === 'web' ? 24 : 52,
    paddingBottom: 16, paddingHorizontal: 20, gap: 12,
  },
  signOutBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20,
  },
  signOutTxt:   { fontSize: 13, color: '#fff' },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle:  { fontSize: 20, color: '#fff' },
  headerSub:    { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 2 },

  // tab bar
  tabBar:       { flexDirection: 'row', borderBottomWidth: 1 },
  tabItem:      {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 7, paddingVertical: 14, borderBottomWidth: 2, borderBottomColor: 'transparent',
  },
  tabItemActive:{ borderBottomWidth: 2 },
  tabLabel:     { fontSize: 14 },

  // store cards
  card: {
    borderWidth: 1, padding: 16, gap: 12,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  cardHead:   { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar:     { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  storeName:  { fontSize: 15 },
  storeEmail: { fontSize: 12, marginTop: 2 },
  badge:      { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4 },
  badgeTxt:   { fontSize: 11 },
  counter: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    padding: 10, borderLeftWidth: 3,
  },
  counterTxt: { fontSize: 13, flex: 1 },
  paidTag:    { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 4 },
  paidTxt:    { color: '#fff', fontSize: 10 },
  btnRow:     { flexDirection: 'row', gap: 8 },
  btn:        { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 10 },
  btnTxt:     { fontSize: 13, color: '#fff' },

  // notify form
  sectionTitle: { fontSize: 20, marginBottom: 2 },
  sectionSub:   { fontSize: 13, marginBottom: 12, lineHeight: 20 },
  fieldLabel:   { fontSize: 13, marginBottom: 4 },
  picker: {
    flexDirection: 'row', alignItems: 'center', borderWidth: 1.5,
    paddingHorizontal: 14, paddingVertical: 12, gap: 10,
  },
  pickerName:   { fontSize: 14 },
  pickerEmail:  { fontSize: 12, marginTop: 1 },
  dropdown: {
    borderWidth: 1, padding: 6, gap: 2, marginTop: -4,
    shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 }, elevation: 6,
  },
  dropRow:  { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 10 },
  inputRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, paddingHorizontal: 14, height: 50, gap: 10 },
  input:    { flex: 1, fontSize: 15 },
  msgBox:   { borderWidth: 1.5, paddingHorizontal: 14, paddingVertical: 10 },
  msg:      { fontSize: 14, minHeight: 120, lineHeight: 22 },
  tmplLabel:{ fontSize: 12, marginTop: 8 },
  tmplRow:  { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tmpl:     { borderWidth: 1, paddingHorizontal: 12, paddingVertical: 7 },
  tmplTxt:  { fontSize: 12 },
  sendBtn:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 52, marginTop: 8 },
  sendTxt:  { fontSize: 15, color: '#fff' },
});
