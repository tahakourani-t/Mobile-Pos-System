import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { I18nManager, View, ActivityIndicator } from 'react-native';
import type { NotificationItem, StoreSettings } from '@/types';
import * as api from '@/lib/api';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface AppUser {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'cashier' | 'manager';
  storeId: string;
}

export interface StoreProfile {
  storeId: string;
  name: string;
  logoUri?: string;
  createdAt: string;
}

interface AppContextType {
  // Auth
  isAuthenticated: boolean;
  activeStoreId: string | null;
  user: AppUser | null;
  login: (storeId: string, pin: string) => Promise<boolean>;
  logout: () => Promise<void>;

  // Store profiles (for the store-picker on login screen)
  storeProfiles: StoreProfile[];
  refreshStoreProfiles: () => Promise<void>;

  // Notifications
  notifications: NotificationItem[];
  unreadCount: number;
  markRead: (id: string) => void;
  markAllRead: () => void;
  addNotification: (n: Omit<NotificationItem, 'id' | 'createdAt'>) => void;
  refreshNotifications: () => Promise<void>;

  // Settings (for the active store)
  storeSettings: StoreSettings;
  updateStoreSettings: (s: Partial<StoreSettings>) => Promise<void>;

  // Onboarding
  isOnboardingComplete: boolean;
  completeOnboarding: (storeId: string, pin: string, settings: Partial<StoreSettings>) => Promise<void>;

  // Trial
  trialDaysLeft: number;
  trialExpired: boolean;

  // Ready flag
  hydrated: boolean;
}

const TRIAL_DAYS = 14;

const defaultSettings: StoreSettings = {
  name: '',
  address: '',
  phone: '',
  email: '',
  vatNumber: '',
  currency: 'LBP',
  taxRate: 0,
  language: 'en',
  theme: 'light',
};

const AppContext = createContext<AppContextType>({} as AppContextType);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [hydrated, setHydrated]               = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeStoreId, setActiveStoreId]     = useState<string | null>(null);
  const [user, setUser]                       = useState<AppUser | null>(null);
  const [storeProfiles, setStoreProfiles]     = useState<StoreProfile[]>([]);
  const [notifications, setNotifications]     = useState<NotificationItem[]>([]);
  const [storeSettings, setStoreSettings]     = useState<StoreSettings>(defaultSettings);
  const [trialStart, setTrialStart]           = useState<string | null>(null);

  // ── Hydrate on mount ──────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        await api.loadToken();
        await refreshStoreProfiles();
        // Restore previous session
        const savedStoreId = await AsyncStorage.getItem('active_store_id');
        const savedUser    = await AsyncStorage.getItem('current_user');
        const savedToken   = await AsyncStorage.getItem('auth_token');
        if (savedToken && savedStoreId && savedUser) {
          const u = JSON.parse(savedUser) as AppUser;
          setUser(u);
          setActiveStoreId(savedStoreId);
          setIsAuthenticated(true);
          await _loadStoreSettings(savedStoreId);
          await _loadNotifications(savedStoreId);
        }
      } catch {}
      setHydrated(true);
    })();
  }, []);

  const refreshStoreProfiles = async () => {
    try {
      const list = await api.auth.listStores();
      setStoreProfiles(list.map(s => ({
        storeId: s.id,
        name: s.name,
        logoUri: s.logoUrl,
        createdAt: s.createdAt,
      })));
    } catch {
      // Server not reachable — fall back to empty list
      setStoreProfiles([]);
    }
  };

  const _loadStoreSettings = async (storeId: string) => {
    try {
      const store = await api.stores.get(storeId);
      const settings: StoreSettings = {
        name:      store.name ?? '',
        address:   store.address ?? '',
        phone:     store.phone ?? '',
        email:     store.email ?? '',
        vatNumber: store.vatNumber ?? '',
        currency:  store.currency ?? 'LBP',
        taxRate:   store.taxRate ?? 0,
        language:  (store.language ?? 'en') as 'en' | 'ar',
        theme:     (store.theme ?? 'light') as StoreSettings['theme'],
        logoUri:   store.logoUrl,
      };
      setStoreSettings(settings);
      applyRTL(settings.language);

      // Store trial info in AsyncStorage (local only, not on server)
      const trialRaw = await AsyncStorage.getItem(`store_trial_${storeId}`);
      setTrialStart(trialRaw ?? store.createdAt);
    } catch {}
  };

  const _loadNotifications = async (storeId: string) => {
    try {
      const list = await api.notifications.list();
      setNotifications(list.map(n => ({
        id: n.id, type: n.type as NotificationItem['type'],
        title: n.title, body: n.body,
        read: n.read, link: n.link, createdAt: n.createdAt,
      })));
    } catch {}
  };

  const applyRTL = (lang: 'en' | 'ar') => {
    const want = lang === 'ar';
    if (I18nManager.isRTL !== want) I18nManager.forceRTL(want);
  };

  // ── Auth ─────────────────────────────────────────────────────────────────
  const login = async (storeId: string, pin: string): Promise<boolean> => {
    try {
      const result = await api.auth.login(storeId, pin);
      await api.saveToken(result.token);
      const u: AppUser = {
        id: result.user.id, name: result.user.name,
        email: result.user.email, role: result.user.role as AppUser['role'],
        storeId: result.user.storeId,
      };
      setUser(u);
      setActiveStoreId(storeId);
      setIsAuthenticated(true);
      await AsyncStorage.setItem('active_store_id', storeId);
      await AsyncStorage.setItem('current_user', JSON.stringify(u));

      // Set trial start if not set
      const trialRaw = await AsyncStorage.getItem(`store_trial_${storeId}`);
      if (!trialRaw) {
        await AsyncStorage.setItem(`store_trial_${storeId}`, result.store.createdAt);
      }
      setTrialStart(trialRaw ?? result.store.createdAt);

      await _loadStoreSettings(storeId);
      await _loadNotifications(storeId);
      return true;
    } catch {
      return false;
    }
  };

  const logout = async () => {
    await api.clearToken();
    await AsyncStorage.multiRemove(['active_store_id', 'current_user']);
    setIsAuthenticated(false);
    setUser(null);
    setNotifications([]);
  };

  // ── Onboarding / store creation ───────────────────────────────────────────
  const completeOnboarding = async (_storeId: string, pin: string, settings: Partial<StoreSettings>) => {
    const result = await api.auth.setup({
      storeName: settings.name ?? 'My Store',
      phone:     settings.phone ?? '',
      email:     settings.email,
      address:   settings.address,
      currency:  settings.currency ?? 'LBP',
      logoUri:   (settings as any).logoUri,
      language:  settings.language,
      pin,
    });
    await api.saveToken(result.token);

    const u: AppUser = {
      id: result.user.id, name: result.user.name,
      email: result.user.email, role: result.user.role as AppUser['role'],
      storeId: result.user.storeId,
    };
    setUser(u);
    setActiveStoreId(result.store.id);
    setIsAuthenticated(true);

    await AsyncStorage.setItem('active_store_id', result.store.id);
    await AsyncStorage.setItem('current_user', JSON.stringify(u));
    await AsyncStorage.setItem(`store_trial_${result.store.id}`, result.store.createdAt);
    setTrialStart(result.store.createdAt);

    const s: StoreSettings = {
      name: result.store.name, address: result.store.address ?? '',
      phone: result.store.phone ?? '', email: result.store.email ?? '',
      vatNumber: result.store.vatNumber ?? '', currency: result.store.currency,
      taxRate: result.store.taxRate, language: result.store.language as 'en' | 'ar',
      theme: result.store.theme as StoreSettings['theme'], logoUri: result.store.logoUrl,
    };
    setStoreSettings(s);
    applyRTL(s.language);

    await refreshStoreProfiles();
  };

  // ── Settings ─────────────────────────────────────────────────────────────
  const updateStoreSettings = async (s: Partial<StoreSettings>) => {
    if (!activeStoreId) return;
    const updated = { ...storeSettings, ...s };
    setStoreSettings(updated);
    await api.stores.update(activeStoreId, {
      name: updated.name, address: updated.address, phone: updated.phone,
      email: updated.email, vatNumber: updated.vatNumber, currency: updated.currency,
      taxRate: updated.taxRate, language: updated.language, theme: updated.theme,
      logoUrl: (updated as any).logoUri,
    });
    if (s.language) applyRTL(s.language);
    // Refresh store profile list (name may have changed)
    await refreshStoreProfiles();
  };

  // ── Notifications ────────────────────────────────────────────────────────
  const refreshNotifications = async () => {
    if (!activeStoreId) return;
    await _loadNotifications(activeStoreId);
  };

  const markRead = async (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    try { await api.notifications.markRead(id); } catch {}
  };

  const markAllRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    try { await api.notifications.markAllRead(); } catch {}
  };

  const addNotification = async (n: Omit<NotificationItem, 'id' | 'createdAt'>) => {
    try {
      const created = await api.notifications.create({
        type: n.type, title: n.title, body: n.body, link: n.link,
      });
      const item: NotificationItem = {
        id: created.id, type: created.type as NotificationItem['type'],
        title: created.title, body: created.body,
        read: created.read, link: created.link, createdAt: created.createdAt,
      };
      setNotifications(prev => [item, ...prev]);
    } catch {
      // Optimistic local-only fallback
      const local: NotificationItem = {
        ...n,
        id: Date.now().toString(36),
        createdAt: new Date().toISOString(),
      };
      setNotifications(prev => [local, ...prev]);
    }
  };

  // ── Trial ─────────────────────────────────────────────────────────────────
  const trialDaysLeft = trialStart
    ? Math.max(0, TRIAL_DAYS - Math.floor((Date.now() - new Date(trialStart).getTime()) / 86400000))
    : TRIAL_DAYS;
  const isOnboardingComplete = storeProfiles.length > 0;
  const trialExpired = isOnboardingComplete && trialDaysLeft === 0;
  const unreadCount = notifications.filter(n => !n.read).length;

  if (!hydrated) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0F3A9E' }}>
        <ActivityIndicator size="large" color="#FFFFFF" />
      </View>
    );
  }

  return (
    <AppContext.Provider value={{
      isAuthenticated, activeStoreId, user, login, logout,
      storeProfiles, refreshStoreProfiles,
      notifications, unreadCount, markRead, markAllRead, addNotification, refreshNotifications,
      storeSettings, updateStoreSettings,
      isOnboardingComplete, completeOnboarding,
      trialDaysLeft, trialExpired,
      hydrated,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);
