/**
 * Admin Panel — superadmin only
 *
 * Entry paths:
 *  A) Superadmin logs in via /login → AuthGuard redirects here → adminToken already
 *     stored in AsyncStorage → PIN screen is skipped automatically.
 *  B) Regular admin navigates here manually (More → Admin) → PIN screen shown.
 *
 * Two tabs after authentication:
 *   1. Stores  — activate (1-month / 1-year) / block, live duration counter
 *   2. Notify  — compose + send an email reminder to any store owner via SMTP
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
import * as api from '@/lib/api';

type AdminStore = api.ApiStore;
type Tab = 'stores' | 'notify';

// ── Plan helpers ──────────────────────────────────────────────────────────────

function planColor(store: AdminStore): string {
  if (!store.isActive) return '#EF4444';
  if (store.planExpiry) {
    return new Date(store.planExpiry).getTime() > Date.now() ? '#10B981' : '#F59E0B';
  }
  const days = Math.floor((Date.now() - new Date(store.createdAt).getTime()) / 86400000);
  return days < 14 ? '#3B82F6' : '#F59E0B';
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
  const days = Math.floor((Date.now() - new Date(store.createdAt).getTime()) / 86400000);
  const left = Math.max(0, 14 - days);
  return left > 0 ? `Trial · ${left} day${left === 1 ? '' : 's'} left` : 'Trial ended';
}

function isPaid(store: AdminStore): boolean {
  return !!(store.isActive && store.planExpiry && new Date(store.planExpiry).getTime() > Date.now());
}

// ── PIN pad ───────────────────────────────────────────────────────────────────
const PIN_LEN = 4;
const PAD = ['1','2','3','4','5','6','7','8','9','','0','⌫'];

// ═════════════════════════════════════════════════════════════════════════════
export default function AdminScreen() {
  const colors   = useColors();
  const router   = useRouter();
  const { user, logout } = useApp();

  // ── auth state
  const [token, setToken]         = useState<string | null>(null);
  const [tokenLoading, setTokenLoading] = useState(true); // checking AsyncStorage
  const [loginEmail, setLoginEmail] = useState('');
  const [pin, setPin]             = useState('');
  const [loginErr, setLoginErr]   = useState('');
  const [loginBusy, setLoginBusy] = useState(false);

  // ── data
  const [stores, setStores]       = useState<AdminStore[]>([]);
  const [dataLoading, setDataLoading] = useState(false);

  // ── tab
  const [tab, setTab]             = useState<Tab>('stores');

  // ── per-store busy flag
  const [activating, setActivating] = useState<string | null>(null);

  // ── notification form
  const [notifyId, setNotifyId]   = useState('');
  const [subject, setSubject]     = useState('');
  const [message, setMessage]     = useState('');
  const [notifyBusy, setNotifyBusy] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  // ── On mount: try to restore a saved adminToken (set when superadmin logs in)
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

  // ── Load stores
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

  // ── PIN key press (manual login path)
  const handleKey = async (key: string) => {
    if (key === '⌫') { setPin(p => p.slice(0, -1)); setLoginErr(''); return; }
    if (key === '' || pin.length >= PIN_LEN) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const next = pin + key;
    setPin(next);
    setLoginErr('');
    if (next.length === PIN_LEN) {
      setLoginBusy(true);
      await new Promise(r => setTimeout(r, 250));
      try {
        const res = await api.admin.login(loginEmail.trim(), next);
        await AsyncStorage.setItem('admin_token', res.token);
        setToken(res.token);
        await loadStores(res.token);
      } catch (e: any) {
        setLoginErr(e.message ?? 'Invalid credentials');
        setPin('');
      } finally {
        setLoginBusy(false);
      }
    }
  };

  // ── Activate
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

  // ── Deactivate / block
  const handleBlock = (storeId: string, name: string) => {
    if (!token) return;
    Alert.alert(
      'Block Store',
      `Block "${name}"? Users won't be able to log in.`,
      [
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
      ],
    );
  };

  // ── Send notification email
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

  // ── Handle back: superadmin logs out; regular admin just goes back
  const handleBack = () => {
    if (user?.role === 'superadmin') {
      Alert.alert('Sign out', 'Sign out of the admin panel?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign out', style: 'destructive', onPress: logout },
      ]);
    } else {
      router.back();
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  //  LOADING (checking AsyncStorage for saved token)
  // ─────────────────────────────────────────────────────────────────────────
  if (tokenLoading) {
    return (
      <View style={[s.root, s.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  PIN LOGIN (only shown when no stored token — i.e. regular admin access)
  // ─────────────────────────────────────────────────────────────────────────
  if (!token) {
    return (
      <View style={[s.root, { backgroundColor: colors.background }]}>
        <LinearGradient colors={['#1A56DB', '#0F3A9E']} style={s.hero}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
          <View style={[s.heroIcon, { backgroundColor: 'rgba(255,255,255,0.18)' }]}>
            <Ionicons name="shield-checkmark" size={38} color="#fff" />
          </View>
          <Text style={[s.heroTitle, { fontFamily: 'Inter_700Bold' }]}>Admin Panel</Text>
          <Text style={[s.heroSub, { fontFamily: 'Inter_400Regular' }]}>Enter your email and PIN</Text>
        </LinearGradient>

        <ScrollView contentContainerStyle={s.loginBody} keyboardShouldPersistTaps="handled">
          <Text style={[s.label, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>Email</Text>
          <View style={[s.inputRow, { borderColor: colors.border, backgroundColor: colors.muted, borderRadius: colors.radius }]}>
            <Ionicons name="mail-outline" size={18} color={colors.mutedForeground} />
            <TextInput
              style={[s.input, { color: colors.foreground, fontFamily: 'Inter_400Regular' }]}
              value={loginEmail}
              onChangeText={v => { setLoginEmail(v); setLoginErr(''); }}
              placeholder="admin@example.com"
              placeholderTextColor={colors.mutedForeground}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <Text style={[s.label, { color: colors.foreground, fontFamily: 'Inter_600SemiBold', marginTop: 14 }]}>PIN</Text>
          <View style={s.dots}>
            {Array.from({ length: PIN_LEN }).map((_, i) => (
              <View key={i} style={[s.dot, {
                backgroundColor: i < pin.length ? colors.primary : colors.border,
                transform: [{ scale: i < pin.length ? 1.2 : 1 }],
              }]} />
            ))}
          </View>

          {loginErr ? (
            <Text style={[s.errTxt, { color: colors.destructive, fontFamily: 'Inter_400Regular' }]}>{loginErr}</Text>
          ) : null}

          {loginBusy
            ? <ActivityIndicator color={colors.primary} style={{ marginTop: 20 }} />
            : (
              <View style={s.pad}>
                {PAD.map((k, i) => (
                  <TouchableOpacity
                    key={i}
                    style={[s.key, {
                      backgroundColor: k === '⌫' ? colors.muted : k === '' ? 'transparent' : colors.background,
                      borderColor: k === '' || k === '⌫' ? 'transparent' : colors.border,
                      borderRadius: colors.radius + 2,
                      elevation: k === '' || k === '⌫' ? 0 : 2,
                      shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 3,
                      shadowOffset: { width: 0, height: 1 },
                    }]}
                    onPress={() => handleKey(k)}
                    disabled={k === ''}
                    activeOpacity={k === '' ? 1 : 0.7}
                  >
                    {k === '⌫'
                      ? <Ionicons name="backspace-outline" size={20} color={colors.foreground} />
                      : k !== ''
                        ? <Text style={[s.keyTxt, { color: colors.foreground, fontFamily: 'Inter_500Medium' }]}>{k}</Text>
                        : null}
                  </TouchableOpacity>
                ))}
              </View>
            )}
        </ScrollView>
      </View>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  MAIN PANEL — 2 tabs
  // ─────────────────────────────────────────────────────────────────────────
  const notifyStore = stores.find(s => s.id === notifyId);

  return (
    <View style={[s.root, { backgroundColor: colors.background }]}>

      {/* Header */}
      <LinearGradient colors={['#1A56DB', '#0F3A9E']} style={s.header}>
        <TouchableOpacity onPress={handleBack} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons
            name={user?.role === 'superadmin' ? 'log-out-outline' : 'arrow-back'}
            size={22} color="#fff"
          />
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={[s.headerTitle, { fontFamily: 'Inter_700Bold' }]}>Admin Panel</Text>
          <Text style={[s.headerSub, { fontFamily: 'Inter_400Regular' }]}>
            {stores.length} store{stores.length !== 1 ? 's' : ''}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => token && loadStores(token)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="refresh-outline" size={22} color="rgba(255,255,255,0.85)" />
        </TouchableOpacity>
      </LinearGradient>

      {/* Tab bar */}
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
              <Ionicons name={icon as any} size={18}
                color={active ? colors.primary : colors.mutedForeground} />
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

      {/* ══════ TAB 1: STORES ══════ */}
      {tab === 'stores' && (
        dataLoading
          ? <View style={s.center}><ActivityIndicator size="large" color={colors.primary} /></View>
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
                      {/* Store identity */}
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
                        {/* Verified badge */}
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
                        <Ionicons
                          name={paid ? 'ribbon-outline' : 'time-outline'}
                          size={14} color={color}
                        />
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

      {/* ══════ TAB 2: NOTIFY ══════ */}
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
          <Text style={[s.label, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>Store</Text>
          <TouchableOpacity
            onPress={() => setPickerOpen(p => !p)}
            style={[s.picker, {
              borderColor: colors.border,
              backgroundColor: colors.muted,
              borderRadius: colors.radius,
            }]}
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

          {/* Inline dropdown */}
          {pickerOpen && (
            <View style={[s.dropdown, {
              backgroundColor: colors.card,
              borderColor: colors.border,
              borderRadius: colors.radius,
            }]}>
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
          <Text style={[s.label, { color: colors.foreground, fontFamily: 'Inter_600SemiBold', marginTop: 14 }]}>
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
          <Text style={[s.label, { color: colors.foreground, fontFamily: 'Inter_600SemiBold', marginTop: 14 }]}>
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
              { label: 'Expiry soon',   text: 'Your subscription is expiring soon. Please renew to keep your POS system running without interruption.' },
              { label: 'Payment due',   text: 'Your payment is due. Please contact us to renew your subscription.' },
              { label: 'Plan expired',  text: 'Your subscription has expired and your account is now restricted. Please renew immediately to restore access.' },
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
  root:  { flex: 1 },
  center:{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  list:  { padding: 16, gap: 14 },

  // hero (PIN screen)
  hero: {
    paddingTop: Platform.OS === 'web' ? 80 : 80,
    paddingBottom: 32, paddingHorizontal: 24,
    alignItems: 'center', gap: 10,
  },
  backBtn:   { position: 'absolute', top: Platform.OS === 'web' ? 24 : 52, left: 20, zIndex: 1 },
  heroIcon:  { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  heroTitle: { fontSize: 24, color: '#fff' },
  heroSub:   { fontSize: 14, color: 'rgba(255,255,255,0.75)' },
  loginBody: { padding: 24, gap: 6 },

  // header (main panel)
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingTop: Platform.OS === 'web' ? 24 : 52,
    paddingBottom: 16, paddingHorizontal: 20, gap: 12,
  },
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

  // PIN screen inputs
  label:   { fontSize: 13, marginBottom: 4 },
  inputRow:{ flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, paddingHorizontal: 14, height: 50, gap: 10 },
  input:   { flex: 1, fontSize: 15 },
  dots:    { flexDirection: 'row', gap: 20, justifyContent: 'center', marginVertical: 14 },
  dot:     { width: 16, height: 16, borderRadius: 8 },
  errTxt:  { fontSize: 13, textAlign: 'center', marginTop: 4 },
  pad:     { flexDirection: 'row', flexWrap: 'wrap', gap: 10, maxWidth: 280, alignSelf: 'center', justifyContent: 'center', marginTop: 8 },
  key:     { width: 78, height: 56, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  keyTxt:  { fontSize: 22 },

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
  sectionTitle:{ fontSize: 20, marginBottom: 2 },
  sectionSub:  { fontSize: 13, marginBottom: 12, lineHeight: 20 },
  picker: {
    flexDirection: 'row', alignItems: 'center', borderWidth: 1.5,
    paddingHorizontal: 14, paddingVertical: 12, gap: 10,
  },
  pickerName:  { fontSize: 14 },
  pickerEmail: { fontSize: 12, marginTop: 1 },
  dropdown: {
    borderWidth: 1, padding: 6, gap: 2, marginTop: -4,
    shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 }, elevation: 6,
  },
  dropRow:  { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 10 },
  msgBox:   { borderWidth: 1.5, paddingHorizontal: 14, paddingVertical: 10 },
  msg:      { fontSize: 14, minHeight: 120, lineHeight: 22 },
  tmplLabel:{ fontSize: 12, marginTop: 8 },
  tmplRow:  { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tmpl:     { borderWidth: 1, paddingHorizontal: 12, paddingVertical: 7 },
  tmplTxt:  { fontSize: 12 },
  sendBtn:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 52, marginTop: 8 },
  sendTxt:  { fontSize: 15, color: '#fff' },
});
