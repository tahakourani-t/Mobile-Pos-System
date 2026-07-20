import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { I18nManager, View, ActivityIndicator } from 'react-native';
import type { User, NotificationItem, StoreSettings, StoreProfile } from '@/types';
import { MOCK_USER, MOCK_NOTIFICATIONS } from '@/constants/mockData';

const TRIAL_DAYS = 14;

// ─── Per-store AsyncStorage key helpers ─────────────────────────────────────
const key = {
  profiles:     () => 'store_profiles',
  activeStore:  () => 'active_store_id',
  pin:          (id: string) => `store_pin_${id}`,
  settings:     (id: string) => `store_settings_${id}`,
  trial:        (id: string) => `store_trial_${id}`,
  notifications:(id: string) => `store_notifications_${id}`,
};

// ─── Types ───────────────────────────────────────────────────────────────────
interface AppContextType {
  // Auth
  isAuthenticated: boolean;
  activeStoreId: string | null;
  user: User | null;
  login: (storeId: string, pin: string) => Promise<boolean>;
  logout: () => Promise<void>;

  // Store profiles (for the store-picker on login screen)
  storeProfiles: StoreProfile[];
  addStoreProfile: (profile: StoreProfile, pin: string, settings: StoreSettings) => Promise<void>;

  // Notifications
  notifications: NotificationItem[];
  unreadCount: number;
  markRead: (id: string) => void;
  markAllRead: () => void;
  addNotification: (n: Omit<NotificationItem, 'id' | 'createdAt'>) => void;

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
  const [user, setUser]                       = useState<User | null>(null);
  const [storeProfiles, setStoreProfiles]     = useState<StoreProfile[]>([]);
  const [notifications, setNotifications]     = useState<NotificationItem[]>([]);
  const [storeSettings, setStoreSettings]     = useState<StoreSettings>(defaultSettings);
  const [trialStart, setTrialStart]           = useState<string | null>(null);

  // ── Hydrate on mount ──────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      const [profilesRaw, activeIdRaw] = await Promise.all([
        AsyncStorage.getItem(key.profiles()),
        AsyncStorage.getItem(key.activeStore()),
      ]);

      const profiles: StoreProfile[] = profilesRaw ? JSON.parse(profilesRaw) : [];
      setStoreProfiles(profiles);

      // Restore the last active store's settings
      const savedId = activeIdRaw ?? profiles[0]?.storeId ?? null;
      if (savedId) {
        await _loadStoreData(savedId, profiles);
      }

      setHydrated(true);
    })();
  }, []);

  const _loadStoreData = async (storeId: string, profiles?: StoreProfile[]) => {
    const [settingsRaw, notifRaw, trialRaw] = await Promise.all([
      AsyncStorage.getItem(key.settings(storeId)),
      AsyncStorage.getItem(key.notifications(storeId)),
      AsyncStorage.getItem(key.trial(storeId)),
    ]);

    const settings = settingsRaw ? { ...defaultSettings, ...JSON.parse(settingsRaw) } : defaultSettings;
    setStoreSettings(settings);
    applyRTL(settings.language);

    if (notifRaw) {
      setNotifications(JSON.parse(notifRaw));
    } else {
      setNotifications(MOCK_NOTIFICATIONS);
    }

    setTrialStart(trialRaw);
    setActiveStoreId(storeId);
  };

  const applyRTL = (lang: 'en' | 'ar') => {
    const want = lang === 'ar';
    if (I18nManager.isRTL !== want) I18nManager.forceRTL(want);
  };

  // ── Auth ─────────────────────────────────────────────────────────────────
  const login = async (storeId: string, pin: string): Promise<boolean> => {
    const storedPin = await AsyncStorage.getItem(key.pin(storeId)) ?? '1234';
    if (pin !== storedPin) return false;

    await _loadStoreData(storeId);
    await AsyncStorage.setItem(key.activeStore(), storeId);
    setIsAuthenticated(true);
    setUser(MOCK_USER);
    return true;
  };

  const logout = async () => {
    setIsAuthenticated(false);
    setUser(null);
  };

  // ── Onboarding / store creation ───────────────────────────────────────────
  const completeOnboarding = async (storeId: string, pin: string, settings: Partial<StoreSettings>) => {
    const mergedSettings: StoreSettings = { ...defaultSettings, ...settings };
    const profile: StoreProfile = {
      storeId,
      name: mergedSettings.name || 'My Store',
      logoUri: (mergedSettings as any).logoUri,
      createdAt: new Date().toISOString(),
    };

    // Save profile to profiles list
    const profilesRaw = await AsyncStorage.getItem(key.profiles());
    const existing: StoreProfile[] = profilesRaw ? JSON.parse(profilesRaw) : [];
    const updated = [...existing.filter(p => p.storeId !== storeId), profile];

    const trialNow = new Date().toISOString();

    await Promise.all([
      AsyncStorage.setItem(key.profiles(), JSON.stringify(updated)),
      AsyncStorage.setItem(key.pin(storeId), pin),
      AsyncStorage.setItem(key.settings(storeId), JSON.stringify(mergedSettings)),
      AsyncStorage.setItem(key.trial(storeId), trialNow),
      AsyncStorage.setItem(key.activeStore(), storeId),
    ]);

    setStoreProfiles(updated);
    setStoreSettings(mergedSettings);
    setTrialStart(trialNow);
    setActiveStoreId(storeId);
    applyRTL(mergedSettings.language);
    setIsAuthenticated(true);
    setUser(MOCK_USER);
  };

  const addStoreProfile = async (profile: StoreProfile, pin: string, settings: StoreSettings) => {
    const profilesRaw = await AsyncStorage.getItem(key.profiles());
    const existing: StoreProfile[] = profilesRaw ? JSON.parse(profilesRaw) : [];
    const updated = [...existing, profile];

    await Promise.all([
      AsyncStorage.setItem(key.profiles(), JSON.stringify(updated)),
      AsyncStorage.setItem(key.pin(profile.storeId), pin),
      AsyncStorage.setItem(key.settings(profile.storeId), JSON.stringify(settings)),
      AsyncStorage.setItem(key.trial(profile.storeId), new Date().toISOString()),
    ]);

    setStoreProfiles(updated);
  };

  // ── Settings ─────────────────────────────────────────────────────────────
  const updateStoreSettings = async (s: Partial<StoreSettings>) => {
    if (!activeStoreId) return;
    const updated = { ...storeSettings, ...s };
    setStoreSettings(updated);
    await AsyncStorage.setItem(key.settings(activeStoreId), JSON.stringify(updated));

    // Update the profile name if store name changed
    if (s.name) {
      const profilesRaw = await AsyncStorage.getItem(key.profiles());
      const profiles: StoreProfile[] = profilesRaw ? JSON.parse(profilesRaw) : [];
      const updatedProfiles = profiles.map(p =>
        p.storeId === activeStoreId ? { ...p, name: s.name! } : p
      );
      await AsyncStorage.setItem(key.profiles(), JSON.stringify(updatedProfiles));
      setStoreProfiles(updatedProfiles);
    }

    if (s.language) applyRTL(s.language);
  };

  // ── Notifications ────────────────────────────────────────────────────────
  const _saveNotifications = async (n: NotificationItem[]) => {
    setNotifications(n);
    if (activeStoreId) await AsyncStorage.setItem(key.notifications(activeStoreId), JSON.stringify(n));
  };

  const markRead = (id: string) => {
    const updated = notifications.map(n => n.id === id ? { ...n, read: true } : n);
    _saveNotifications(updated);
  };

  const markAllRead = () => {
    const updated = notifications.map(n => ({ ...n, read: true }));
    _saveNotifications(updated);
  };

  const addNotification = (n: Omit<NotificationItem, 'id' | 'createdAt'>) => {
    const newItem: NotificationItem = {
      ...n,
      id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
      createdAt: new Date().toISOString(),
    };
    _saveNotifications([newItem, ...notifications]);
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
      storeProfiles, addStoreProfile,
      notifications, unreadCount, markRead, markAllRead, addNotification,
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
