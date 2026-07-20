import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { I18nManager, View, ActivityIndicator } from 'react-native';
import type { User, NotificationItem, StoreSettings } from '@/types';
import { MOCK_USER, MOCK_NOTIFICATIONS } from '@/constants/mockData';

const TRIAL_DAYS = 14;
const TRIAL_KEY = 'trial_start_date';
const ONBOARDING_KEY = 'onboarding_complete';

interface AppContextType {
  isAuthenticated: boolean;
  user: User | null;
  login: (pin: string) => Promise<boolean>;
  logout: () => Promise<void>;
  notifications: NotificationItem[];
  unreadCount: number;
  markRead: (id: string) => void;
  markAllRead: () => void;
  addNotification: (n: Omit<NotificationItem, 'id' | 'createdAt'>) => void;
  storeSettings: StoreSettings;
  updateStoreSettings: (s: Partial<StoreSettings>) => Promise<void>;
  // Onboarding
  isOnboardingComplete: boolean;
  completeOnboarding: () => Promise<void>;
  // Trial
  trialDaysLeft: number;
  trialExpired: boolean;
  trialStartDate: string | null;
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
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [storeSettings, setStoreSettings] = useState<StoreSettings>(defaultSettings);
  const [trialStartDate, setTrialStartDate] = useState<string | null>(null);
  const [isOnboardingComplete, setIsOnboardingComplete] = useState<boolean>(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    (async () => {
      const [authVal, notifVal, settingsVal, trialVal, onboardVal] = await Promise.all([
        AsyncStorage.getItem('is_authenticated'),
        AsyncStorage.getItem('notifications'),
        AsyncStorage.getItem('store_settings'),
        AsyncStorage.getItem(TRIAL_KEY),
        AsyncStorage.getItem(ONBOARDING_KEY),
      ]);

      if (authVal === 'true') {
        setIsAuthenticated(true);
        setUser(MOCK_USER);
      }

      if (notifVal) {
        setNotifications(JSON.parse(notifVal));
      } else {
        setNotifications(MOCK_NOTIFICATIONS);
        await AsyncStorage.setItem('notifications', JSON.stringify(MOCK_NOTIFICATIONS));
      }

      if (settingsVal) {
        const s = { ...defaultSettings, ...JSON.parse(settingsVal) };
        setStoreSettings(s);
        applyRTL(s.language);
      }

      if (trialVal) {
        setTrialStartDate(trialVal);
      }

      setIsOnboardingComplete(onboardVal === 'true');
      setHydrated(true);
    })();
  }, []);

  const applyRTL = (lang: 'en' | 'ar') => {
    const shouldBeRTL = lang === 'ar';
    if (I18nManager.isRTL !== shouldBeRTL) {
      I18nManager.forceRTL(shouldBeRTL);
    }
  };

  const login = async (pin: string): Promise<boolean> => {
    const storedPin = await AsyncStorage.getItem('user_pin') ?? '1234';
    if (pin === storedPin) {
      await AsyncStorage.setItem('is_authenticated', 'true');
      setIsAuthenticated(true);
      setUser(MOCK_USER);
      return true;
    }
    return false;
  };

  const logout = async () => {
    await AsyncStorage.removeItem('is_authenticated');
    setIsAuthenticated(false);
    setUser(null);
  };

  const completeOnboarding = async () => {
    const now = new Date().toISOString();
    await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
    await AsyncStorage.setItem(TRIAL_KEY, now);
    setIsOnboardingComplete(true);
    setTrialStartDate(now);
    await AsyncStorage.setItem('is_authenticated', 'true');
    setIsAuthenticated(true);
    setUser(MOCK_USER);
  };

  const markRead = (id: string) => {
    setNotifications(prev => {
      const updated = prev.map(n => n.id === id ? { ...n, read: true } : n);
      AsyncStorage.setItem('notifications', JSON.stringify(updated));
      return updated;
    });
  };

  const markAllRead = () => {
    setNotifications(prev => {
      const updated = prev.map(n => ({ ...n, read: true }));
      AsyncStorage.setItem('notifications', JSON.stringify(updated));
      return updated;
    });
  };

  const addNotification = (n: Omit<NotificationItem, 'id' | 'createdAt'>) => {
    const newItem: NotificationItem = {
      ...n,
      id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
      createdAt: new Date().toISOString(),
    };
    setNotifications(prev => {
      const updated = [newItem, ...prev];
      AsyncStorage.setItem('notifications', JSON.stringify(updated));
      return updated;
    });
  };

  const updateStoreSettings = async (s: Partial<StoreSettings>) => {
    const updated = { ...storeSettings, ...s };
    setStoreSettings(updated);
    await AsyncStorage.setItem('store_settings', JSON.stringify(updated));
    if (s.language) applyRTL(s.language);
  };

  const trialDaysLeft = trialStartDate
    ? Math.max(0, TRIAL_DAYS - Math.floor((Date.now() - new Date(trialStartDate).getTime()) / 86400000))
    : TRIAL_DAYS;
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
      isAuthenticated, user, login, logout,
      notifications, unreadCount, markRead, markAllRead, addNotification,
      storeSettings, updateStoreSettings,
      isOnboardingComplete, completeOnboarding,
      trialDaysLeft, trialExpired, trialStartDate,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);
