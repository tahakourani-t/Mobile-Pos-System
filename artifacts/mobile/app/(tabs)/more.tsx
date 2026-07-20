import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useColors } from '@/hooks/useColors';
import { useApp } from '@/contexts/AppContext';
import { useData } from '@/contexts/DataContext';

interface MenuItem {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  route: string;
  color: string;
  badge?: string;
}

export default function MoreScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, unreadCount, logout } = useApp();
  const { products } = useData();

  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const lowStockCount = products.filter(p => p.stock > 0 && p.stock <= p.lowStockAlert).length;
  const outOfStock = products.filter(p => p.stock === 0).length;

  const menuSections: { title: string; items: MenuItem[] }[] = [
    {
      title: 'Store',
      items: [
        { label: 'Inventory', icon: 'layers-outline', route: '/inventory', color: '#F59E0B', badge: lowStockCount + outOfStock > 0 ? String(lowStockCount + outOfStock) : undefined },
        { label: 'Customers', icon: 'people-outline', route: '/customers', color: '#3B82F6' },
        { label: 'Reports', icon: 'bar-chart-outline', route: '/reports', color: '#10B981' },
        { label: 'Expenses', icon: 'wallet-outline', route: '/expenses', color: '#EF4444' },
      ],
    },
    {
      title: 'Management',
      items: [
        { label: 'Notifications', icon: 'notifications-outline', route: '/notifications', color: '#8B5CF6', badge: unreadCount > 0 ? String(unreadCount) : undefined },
        { label: 'Settings', icon: 'settings-outline', route: '/settings', color: '#64748B' },
      ],
    },
  ];

  return (
    <ScrollView style={[styles.root, { backgroundColor: colors.background }]} contentContainerStyle={{ paddingBottom: Platform.OS === 'web' ? 34 : 100 }} showsVerticalScrollIndicator={false}>
      {/* Profile header */}
      <LinearGradient colors={['#1A56DB', '#0F3A9E']} style={[styles.profileHeader, { paddingTop: topPad + 16 }]}>
        <View style={[styles.avatar, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
          <Text style={[styles.avatarText, { fontFamily: 'Inter_700Bold' }]}>
            {user?.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.userName, { fontFamily: 'Inter_700Bold' }]}>{user?.name}</Text>
          <Text style={[styles.userRole, { fontFamily: 'Inter_400Regular' }]}>{user?.role?.charAt(0).toUpperCase()}{user?.role?.slice(1)} · {user?.email}</Text>
        </View>
        <TouchableOpacity onPress={() => router.push('/settings')} style={styles.settingsBtn}>
          <Ionicons name="settings-outline" size={22} color="rgba(255,255,255,0.8)" />
        </TouchableOpacity>
      </LinearGradient>

      <View style={styles.content}>
        {menuSections.map(section => (
          <View key={section.title}>
            <Text style={[styles.sectionTitle, { color: colors.mutedForeground, fontFamily: 'Inter_500Medium' }]}>{section.title}</Text>
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
              {section.items.map((item, idx) => (
                <TouchableOpacity
                  key={item.label}
                  onPress={() => router.push(item.route as any)}
                  style={[styles.menuItem, idx < section.items.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }]}
                  activeOpacity={0.7}
                >
                  <View style={[styles.menuIcon, { backgroundColor: item.color + '18', borderRadius: 10 }]}>
                    <Ionicons name={item.icon} size={20} color={item.color} />
                  </View>
                  <Text style={[styles.menuLabel, { color: colors.foreground, fontFamily: 'Inter_500Medium' }]}>{item.label}</Text>
                  {item.badge ? (
                    <View style={[styles.itemBadge, { backgroundColor: colors.destructive }]}>
                      <Text style={[styles.itemBadgeText, { fontFamily: 'Inter_700Bold' }]}>{item.badge}</Text>
                    </View>
                  ) : null}
                  <Ionicons name="chevron-forward" size={18} color={colors.mutedForeground} style={styles.chevron} />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        {/* Logout */}
        <TouchableOpacity
          onPress={() => logout()}
          style={[styles.logoutBtn, { backgroundColor: colors.destructive + '15', borderColor: colors.destructive + '40', borderRadius: colors.radius }]}
          activeOpacity={0.75}
        >
          <Ionicons name="log-out-outline" size={20} color={colors.destructive} />
          <Text style={[styles.logoutText, { color: colors.destructive, fontFamily: 'Inter_600SemiBold' }]}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  profileHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 24, gap: 14 },
  avatar: { width: 54, height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 20, color: '#FFFFFF' },
  userName: { fontSize: 18, color: '#FFFFFF' },
  userRole: { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  settingsBtn: { padding: 4 },
  content: { padding: 16, gap: 16 },
  sectionTitle: { fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8, marginLeft: 4 },
  card: { borderWidth: 1, overflow: 'hidden' },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 14 },
  menuIcon: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  menuLabel: { flex: 1, fontSize: 16 },
  itemBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  itemBadgeText: { fontSize: 11, color: '#FFFFFF' },
  chevron: { marginLeft: 4 },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 16, borderWidth: 1 },
  logoutText: { fontSize: 16 },
});
