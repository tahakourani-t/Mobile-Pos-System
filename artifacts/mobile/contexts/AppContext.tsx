import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { User, NotificationItem, StoreSettings } from '@/types';
import { MOCK_USER, MOCK_NOTIFICATIONS } from '@/constants/mockData';

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

  useEffect(() => {
    (async () => {
      const [authVal, notifVal, settingsVal] = await Promise.all([
        AsyncStorage.getItem('is_authenticated'),
        AsyncStorage.getItem('notifications'),
        AsyncStorage.getItem('store_settings'),
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
        setStoreSettings({ ...defaultSettings, ...JSON.parse(settingsVal) });
      }
    })();
  }, []);

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
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <AppContext.Provider value={{ isAuthenticated, user, login, logout, notifications, unreadCount, markRead, markAllRead, addNotification, storeSettings, updateStoreSettings }}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);
