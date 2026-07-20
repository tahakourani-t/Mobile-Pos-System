import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { I18nManager } from 'react-native';
import type { User, NotificationItem, StoreSettings } from '@/types';
import { MOCK_USER, MOCK_NOTIFICATIONS } from '@/constants/mockData';

const TRIAL_DAYS = 14;
const TRIAL_KEY = 'trial_start_date';

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
  // Trial
  trialDaysLeft: number;
  trialExpired: boolean;
  trialStartDate: string | null;
}

const defaultSettings: StoreSettings = {
  name: 'My Store',
  address: '123 Main Street, Dubai, UAE',
  phone: '+971 4 123 4567',
  email: 'store@example.com',
  vatNumber: 'AE100123456',
  currency: 'SAR',
  taxRate: 15,
  language: 'en',
  theme: 'system',
};

const AppContext = createContext<AppContextType>({} as AppContextType);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [storeSettings, setStoreSettings] = useState<StoreSettings>(defaultSettings);
  const [trialStartDate, setTrialStartDate] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const [authVal, notifVal, settingsVal, trialVal] = await Promise.all([
        AsyncStorage.getItem('is_authenticated'),
        AsyncStorage.getItem('notifications'),
        AsyncStorage.getItem('store_settings'),
        AsyncStorage.getItem(TRIAL_KEY),
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

      // Start trial on first launch
      if (trialVal) {
        setTrialStartDate(trialVal);
      } else {
        const now = new Date().toISOString();
        await AsyncStorage.setItem(TRIAL_KEY, now);
        setTrialStartDate(now);
      }
    })();
  }, []);

  const applyRTL = (lang: 'en' | 'ar') => {
    const shouldBeRTL = lang === 'ar';
    if (I18nManager.isRTL !== shouldBeRTL) {
      I18nManager.forceRTL(shouldBeRTL);
      // On native this would require a reload; on web it applies immediately
    }
  };

  const login = async (pin: string): Promise<boolean> => {
    const storedPin = await AsyncStorage.getItem('user_pin') ?? MOCK_USER.pin;
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

  // Trial calculation
  const trialDaysLeft = trialStartDate
    ? Math.max(0, TRIAL_DAYS - Math.floor((Date.now() - new Date(trialStartDate).getTime()) / 86400000))
    : TRIAL_DAYS;
  const trialExpired = trialDaysLeft === 0;

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <AppContext.Provider value={{
      isAuthenticated, user, login, logout,
      notifications, unreadCount, markRead, markAllRead, addNotification,
      storeSettings, updateStoreSettings,
      trialDaysLeft, trialExpired, trialStartDate,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);
