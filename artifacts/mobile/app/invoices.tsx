import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Platform, RefreshControl, Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as Print from 'expo-print';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { useApp } from '@/contexts/AppContext';
import * as api from '@/lib/api';
type Order = api.ApiOrder;

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-GB', {
    hour: '2-digit', minute: '2-digit',
  });
}

function formatCurrency(amount: number, currency = 'USD'): string {
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: 2 }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

function paymentIcon(method: string): string {
  if (method === 'card') return 'card-outline';
  if (method === 'split') return 'git-branch-outline';
  return 'cash-outline';
}

export default function InvoicesScreen() {
  const colors = useColors();
  const router = useRouter();
  const { storeSettings } = useApp();

  const [orders, setOrders]       = useState<Order[]>([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [printing, setPrinting]   = useState<string | null>(null);
  const [preview, setPreview]     = useState<Order | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const list = await api.orders.list();
      // Sort newest first
      setOrders([...list].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    } catch {}
    if (isRefresh) setRefreshing(false); else setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const buildReceiptHtml = (order: Order): string => {
    const currency = storeSettings.currency ?? 'USD';
    const fmt = (n: number) => `${n.toFixed(2)} ${currency}`;
    const dateStr = new Date(order.createdAt).toLocaleString();
    const itemRows = (order.items ?? []).map(i => `
      <tr>
        <td style="padding:4px 2px;font-size:13px;">${i.quantity}</td>
        <td style="padding:4px 2px;font-size:13px;max-width:160px;">${i.productName}</td>
        <td style="padding:4px 2px;font-size:13px;text-align:right;">${fmt(i.lineTotal)}</td>
      </tr>`).join('');
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"/>
      <style>body{font-family:monospace;width:300px;margin:0 auto;padding:16px;}
        h2{text-align:center;margin:0;font-size:16px;}
        p{text-align:center;margin:4px 0;font-size:12px;color:#555;}
        table{width:100%;border-collapse:collapse;margin:10px 0;}
        hr{border:none;border-top:1px dashed #ccc;margin:10px 0;}
        .total{font-weight:bold;font-size:15px;text-align:right;}
      </style></head><body>
      <h2>${storeSettings.name || 'Receipt'}</h2>
      ${storeSettings.address ? `<p>${storeSettings.address}</p>` : ''}
      ${storeSettings.phone ? `<p>Tel: ${storeSettings.phone}</p>` : ''}
      <hr/>
      <p style="font-size:11px;">Order #${order.orderNumber}</p>
      <p style="font-size:11px;">${dateStr}</p>
      <p style="font-size:11px;">Cashier: ${order.cashier}</p>
      ${order.customerName ? `<p style="font-size:11px;">Customer: ${order.customerName}</p>` : ''}
      <hr/>
      <table><thead><tr>
        <th style="text-align:left;font-size:12px;">Qty</th>
        <th style="text-align:left;font-size:12px;">Item</th>
        <th style="text-align:right;font-size:12px;">Total</th>
      </tr></thead><tbody>${itemRows}</tbody></table>
      <hr/>
      <p style="text-align:right;font-size:12px;">Subtotal: ${fmt(order.subtotal)}</p>
      ${order.discountAmount > 0 ? `<p style="text-align:right;font-size:12px;">Discount: -${fmt(order.discountAmount)}</p>` : ''}
      ${order.taxAmount > 0 ? `<p style="text-align:right;font-size:12px;">Tax: ${fmt(order.taxAmount)}</p>` : ''}
      <p class="total">TOTAL: ${fmt(order.total)}</p>
      ${order.cashReceived ? `<p style="text-align:right;font-size:12px;">Cash: ${fmt(order.cashReceived)}</p>` : ''}
      ${order.change ? `<p style="text-align:right;font-size:12px;">Change: ${fmt(order.change)}</p>` : ''}
      <hr/>
      <p>Payment: ${order.paymentMethod}</p>
      ${order.note ? `<p>Note: ${order.note}</p>` : ''}
      <hr/><p style="font-size:11px;">Thank you for your purchase!</p>
    </body></html>`;
  };

  const handlePrint = async (order: Order) => {
    setPrinting(order.id);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await Print.printAsync({ html: buildReceiptHtml(order) });
    } catch (e) {
      console.warn('Print failed', e);
    } finally {
      setPrinting(null);
    }
  };

  // Group orders by date
  const grouped = orders.reduce<Record<string, Order[]>>((acc, o) => {
    const d = formatDate(o.createdAt);
    if (!acc[d]) acc[d] = [];
    acc[d].push(o);
    return acc;
  }, {});

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Header */}
      <LinearGradient colors={['#1A56DB', '#0F3A9E']} style={styles.hero}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={[styles.heroIcon, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
          <Ionicons name="receipt" size={36} color="#FFFFFF" />
        </View>
        <Text style={[styles.heroTitle, { fontFamily: 'Inter_700Bold' }]}>Invoices</Text>
        <Text style={[styles.heroSub, { fontFamily: 'Inter_400Regular' }]}>
          {orders.length} invoice{orders.length !== 1 ? 's' : ''} total
        </Text>
      </LinearGradient>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
            Loading invoices…
          </Text>
        </View>
      ) : orders.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="receipt-outline" size={64} color={colors.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>No invoices yet</Text>
          <Text style={[styles.emptyHint, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
            Completed orders will appear here as invoices.
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.primary} />}
        >
          {Object.entries(grouped).map(([date, dayOrders]) => (
            <View key={date}>
              {/* Date header */}
              <View style={styles.dateHeader}>
                <View style={[styles.dateLine, { backgroundColor: colors.border }]} />
                <View style={[styles.dateBadge, { backgroundColor: colors.muted, borderRadius: 20 }]}>
                  <Ionicons name="calendar-outline" size={12} color={colors.mutedForeground} />
                  <Text style={[styles.dateText, { color: colors.mutedForeground, fontFamily: 'Inter_600SemiBold' }]}>{date}</Text>
                </View>
                <View style={[styles.dateLine, { backgroundColor: colors.border }]} />
              </View>

              {dayOrders.map(order => (
                <TouchableOpacity
                  key={order.id}
                  onPress={() => setPreview(order)}
                  activeOpacity={0.85}
                  style={[styles.invoiceCard, {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    borderRadius: colors.radius + 2,
                  }]}
                >
                  {/* Invoice top row */}
                  <View style={styles.cardTop}>
                    <View style={[styles.invoiceIcon, { backgroundColor: colors.primary + '15', borderRadius: 10 }]}>
                      <Ionicons name="document-text-outline" size={20} color={colors.primary} />
                    </View>
                    <View style={styles.cardMeta}>
                      <Text style={[styles.orderNum, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>
                        #{order.orderNumber}
                      </Text>
                      <Text style={[styles.orderTime, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
                        {formatTime(order.createdAt)} · {order.cashier}
                      </Text>
                    </View>
                    <Text style={[styles.orderTotal, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>
                      {formatCurrency(order.total, storeSettings.currency)}
                    </Text>
                  </View>

                  {/* Divider */}
                  <View style={[styles.divider, { backgroundColor: colors.border }]} />

                  {/* Details row */}
                  <View style={styles.cardBottom}>
                    <View style={styles.metaChip}>
                      <Ionicons name={paymentIcon(order.paymentMethod) as any} size={13} color={colors.mutedForeground} />
                      <Text style={[styles.metaChipText, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
                        {order.paymentMethod.charAt(0).toUpperCase() + order.paymentMethod.slice(1)}
                      </Text>
                    </View>

                    {order.customerName ? (
                      <View style={styles.metaChip}>
                        <Ionicons name="person-outline" size={13} color={colors.mutedForeground} />
                        <Text style={[styles.metaChipText, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]} numberOfLines={1}>
                          {order.customerName}
                        </Text>
                      </View>
                    ) : null}

                    <View style={styles.metaChip}>
                      <Ionicons name="cube-outline" size={13} color={colors.mutedForeground} />
                      <Text style={[styles.metaChipText, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
                        {(order.items ?? []).length} item{(order.items ?? []).length !== 1 ? 's' : ''}
                      </Text>
                    </View>

                    <TouchableOpacity
                      onPress={() => handlePrint(order)}
                      disabled={printing === order.id}
                      style={[styles.printBtn, { backgroundColor: colors.primary + '15', borderRadius: 8 }]}
                    >
                      {printing === order.id
                        ? <ActivityIndicator size="small" color={colors.primary} />
                        : <Ionicons name="print-outline" size={16} color={colors.primary} />}
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          ))}
          <View style={{ height: 32 }} />
        </ScrollView>
      )}

      {/* Invoice preview modal */}
      <Modal visible={!!preview} transparent animationType="slide" onRequestClose={() => setPreview(null)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.card, borderRadius: colors.radius + 8 }]}>
            {preview && (
              <>
                <View style={styles.modalHeader}>
                  <View>
                    <Text style={[styles.modalTitle, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>
                      Invoice #{preview.orderNumber}
                    </Text>
                    <Text style={[styles.modalDate, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
                      {formatDate(preview.createdAt)} · {formatTime(preview.createdAt)}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => setPreview(null)}>
                    <Ionicons name="close-circle" size={28} color={colors.mutedForeground} />
                  </TouchableOpacity>
                </View>

                <View style={[styles.divider, { backgroundColor: colors.border, marginVertical: 12 }]} />

                {/* Store & cashier */}
                <View style={styles.previewRow}>
                  <Text style={[styles.previewLabel, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>Store</Text>
                  <Text style={[styles.previewValue, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>{storeSettings.name}</Text>
                </View>
                <View style={styles.previewRow}>
                  <Text style={[styles.previewLabel, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>Cashier</Text>
                  <Text style={[styles.previewValue, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>{preview.cashier}</Text>
                </View>
                {preview.customerName && (
                  <View style={styles.previewRow}>
                    <Text style={[styles.previewLabel, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>Customer</Text>
                    <Text style={[styles.previewValue, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>{preview.customerName}</Text>
                  </View>
                )}

                <View style={[styles.divider, { backgroundColor: colors.border, marginVertical: 12 }]} />

                {/* Items */}
                <ScrollView style={{ maxHeight: 180 }} showsVerticalScrollIndicator={false}>
                  {(preview.items ?? []).map((item, i) => (
                    <View key={i} style={styles.itemRow}>
                      <Text style={[styles.itemName, { color: colors.foreground, fontFamily: 'Inter_400Regular' }]} numberOfLines={1}>
                        {item.productName}
                      </Text>
                      <Text style={[styles.itemQty, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>×{item.quantity}</Text>
                      <Text style={[styles.itemTotal, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>
                        {formatCurrency(item.lineTotal, storeSettings.currency)}
                      </Text>
                    </View>
                  ))}
                </ScrollView>

                <View style={[styles.divider, { backgroundColor: colors.border, marginVertical: 12 }]} />

                {/* Totals */}
                <View style={styles.previewRow}>
                  <Text style={[styles.previewLabel, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>Subtotal</Text>
                  <Text style={[styles.previewValue, { color: colors.foreground, fontFamily: 'Inter_400Regular' }]}>{formatCurrency(preview.subtotal, storeSettings.currency)}</Text>
                </View>
                {preview.discountAmount > 0 && (
                  <View style={styles.previewRow}>
                    <Text style={[styles.previewLabel, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>Discount</Text>
                    <Text style={[styles.previewValue, { color: '#EF4444', fontFamily: 'Inter_400Regular' }]}>−{formatCurrency(preview.discountAmount, storeSettings.currency)}</Text>
                  </View>
                )}
                {preview.taxAmount > 0 && (
                  <View style={styles.previewRow}>
                    <Text style={[styles.previewLabel, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>Tax</Text>
                    <Text style={[styles.previewValue, { color: colors.foreground, fontFamily: 'Inter_400Regular' }]}>{formatCurrency(preview.taxAmount, storeSettings.currency)}</Text>
                  </View>
                )}
                <View style={[styles.previewRow, styles.totalRow]}>
                  <Text style={[styles.totalLabel, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>Total</Text>
                  <Text style={[styles.totalAmount, { color: colors.primary, fontFamily: 'Inter_700Bold' }]}>{formatCurrency(preview.total, storeSettings.currency)}</Text>
                </View>

                <TouchableOpacity
                  onPress={() => { setPreview(null); handlePrint(preview); }}
                  style={[styles.printFullBtn, { backgroundColor: colors.primary, borderRadius: colors.radius }]}
                  activeOpacity={0.85}
                >
                  <Ionicons name="print-outline" size={18} color="#FFFFFF" />
                  <Text style={[styles.printFullText, { fontFamily: 'Inter_700Bold' }]}>Print Receipt</Text>
                </TouchableOpacity>
              </>
            )}
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
    paddingBottom: 36,
    paddingHorizontal: 24,
    alignItems: 'center',
    gap: 8,
  },
  backBtn: { position: 'absolute', top: Platform.OS === 'web' ? 24 : 52, left: 20 },
  heroIcon: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  heroTitle: { fontSize: 24, color: '#FFFFFF' },
  heroSub: { fontSize: 14, color: 'rgba(255,255,255,0.75)' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingVertical: 80 },
  loadingText: { fontSize: 14, marginTop: 8 },
  emptyTitle: { fontSize: 18 },
  emptyHint: { fontSize: 14, textAlign: 'center', paddingHorizontal: 40 },
  scrollContent: { padding: 16, gap: 10, paddingTop: 20 },
  dateHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 6 },
  dateLine: { flex: 1, height: 1 },
  dateBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 4 },
  dateText: { fontSize: 11 },
  invoiceCard: {
    borderWidth: 1, padding: 14, gap: 10,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 }, elevation: 2,
    marginBottom: 4,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  invoiceIcon: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
  cardMeta: { flex: 1 },
  orderNum: { fontSize: 15 },
  orderTime: { fontSize: 12, marginTop: 2 },
  orderTotal: { fontSize: 16 },
  divider: { height: 1 },
  cardBottom: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  metaChip: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaChipText: { fontSize: 12 },
  printBtn: { marginLeft: 'auto', width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  // Modal
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end', alignItems: 'center',
  },
  modalCard: {
    width: '100%', padding: 24,
    shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 20,
    shadowOffset: { width: 0, height: -4 }, elevation: 20,
    maxHeight: '90%',
  },
  modalHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  modalTitle: { fontSize: 20 },
  modalDate: { fontSize: 13, marginTop: 2 },
  previewRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  previewLabel: { fontSize: 13 },
  previewValue: { fontSize: 13 },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  itemName: { flex: 1, fontSize: 13 },
  itemQty: { fontSize: 12, minWidth: 24, textAlign: 'center' },
  itemTotal: { fontSize: 13 },
  totalRow: { marginTop: 4, paddingTop: 8, borderTopWidth: 0 },
  totalLabel: { fontSize: 16 },
  totalAmount: { fontSize: 18 },
  printFullBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, height: 50, marginTop: 16,
  },
  printFullText: { fontSize: 16, color: '#FFFFFF' },
});
