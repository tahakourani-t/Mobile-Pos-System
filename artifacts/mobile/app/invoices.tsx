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
import { useTranslation } from '@/hooks/useTranslation';
import * as api from '@/lib/api';
type Order = api.ApiOrder;

// ── Date / currency helpers (locale-aware) ────────────────────────────────────

function formatDate(iso: string, lang: string): string {
  const locale = lang === 'ar' ? 'ar-SA' : 'en-GB';
  return new Date(iso).toLocaleDateString(locale, {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

function formatTime(iso: string, lang: string): string {
  const locale = lang === 'ar' ? 'ar-SA' : 'en-GB';
  return new Date(iso).toLocaleTimeString(locale, {
    hour: '2-digit', minute: '2-digit',
  });
}

function formatDateTime(iso: string, lang: string): string {
  const locale = lang === 'ar' ? 'ar-SA' : 'en-GB';
  return new Date(iso).toLocaleString(locale);
}

function formatCurrency(amount: number, currency = 'USD'): string {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency', currency, minimumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

function paymentIcon(method: string) {
  if (method === 'card')  return 'card-outline';
  if (method === 'split') return 'git-branch-outline';
  return 'cash-outline';
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function InvoicesScreen() {
  const colors = useColors();
  const router = useRouter();
  const { storeSettings } = useApp();
  const { t, lang, isRTL } = useTranslation();

  const [orders, setOrders]         = useState<Order[]>([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [printing, setPrinting]     = useState<string | null>(null);
  const [preview, setPreview]       = useState<Order | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const list = await api.orders.list();
      setOrders([...list].sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ));
    } catch {}
    if (isRefresh) setRefreshing(false); else setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Receipt HTML (bilingual, RTL-aware) ──────────────────────────────────
  const buildReceiptHtml = (order: Order): string => {
    const currency = storeSettings.currency ?? 'USD';
    const fmt      = (n: number) => `${n.toFixed(2)} ${currency}`;
    const dir      = lang === 'ar' ? 'rtl' : 'ltr';
    const dateStr  = formatDateTime(order.createdAt, lang);

    // Labels
    const lbl = {
      tel:       lang === 'ar' ? 'هاتف' : 'Tel',
      orderNo:   lang === 'ar' ? 'رقم الطلب' : 'Order #',
      cashier:   lang === 'ar' ? 'الكاشير' : 'Cashier',
      customer:  lang === 'ar' ? 'العميل' : 'Customer',
      qty:       lang === 'ar' ? 'الكمية' : 'Qty',
      item:      lang === 'ar' ? 'المنتج' : 'Item',
      total:     lang === 'ar' ? 'الإجمالي' : 'Total',
      subtotal:  lang === 'ar' ? 'المجموع الفرعي' : 'Subtotal',
      discount:  lang === 'ar' ? 'خصم' : 'Discount',
      tax:       lang === 'ar' ? 'ضريبة' : 'Tax',
      grandTotal:lang === 'ar' ? 'الإجمالي الكلي' : 'TOTAL',
      cash:      lang === 'ar' ? 'نقداً' : 'Cash',
      change:    lang === 'ar' ? 'الباقي' : 'Change',
      payment:   lang === 'ar' ? 'طريقة الدفع' : 'Payment',
      note:      lang === 'ar' ? 'ملاحظة' : 'Note',
      thanks:    lang === 'ar' ? 'شكراً لك على شرائك!' : 'Thank you for your purchase!',
    };

    const itemRows = (order.items ?? []).map(i => `
      <tr>
        <td style="padding:4px 2px;font-size:13px;">${i.quantity}</td>
        <td style="padding:4px 2px;font-size:13px;max-width:160px;">${i.productName}</td>
        <td style="padding:4px 2px;font-size:13px;text-align:${dir === 'rtl' ? 'left' : 'right'};">${fmt(i.lineTotal)}</td>
      </tr>`).join('');

    return `<!DOCTYPE html><html dir="${dir}"><head><meta charset="UTF-8"/>
      <style>
        body{font-family:${lang === 'ar' ? "'Tahoma','Arial'" : 'monospace'};width:300px;margin:0 auto;padding:16px;direction:${dir};}
        h2{text-align:center;margin:0;font-size:16px;}
        p{text-align:center;margin:4px 0;font-size:12px;color:#555;}
        table{width:100%;border-collapse:collapse;margin:10px 0;}
        th{text-align:${dir === 'rtl' ? 'right' : 'left'};font-size:12px;}
        hr{border:none;border-top:1px dashed #ccc;margin:10px 0;}
        .row{display:flex;justify-content:space-between;font-size:12px;margin:3px 0;}
        .total{font-weight:bold;font-size:15px;}
      </style></head><body>
      <h2>${storeSettings.name || (lang === 'ar' ? 'فاتورة' : 'Receipt')}</h2>
      ${storeSettings.address ? `<p>${storeSettings.address}</p>` : ''}
      ${storeSettings.phone   ? `<p>${lbl.tel}: ${storeSettings.phone}</p>` : ''}
      <hr/>
      <p style="font-size:11px;">${lbl.orderNo}${order.orderNumber}</p>
      <p style="font-size:11px;">${dateStr}</p>
      <p style="font-size:11px;">${lbl.cashier}: ${order.cashier}</p>
      ${order.customerName ? `<p style="font-size:11px;">${lbl.customer}: ${order.customerName}</p>` : ''}
      <hr/>
      <table><thead><tr>
        <th>${lbl.qty}</th>
        <th>${lbl.item}</th>
        <th style="text-align:${dir === 'rtl' ? 'left' : 'right'};">${lbl.total}</th>
      </tr></thead><tbody>${itemRows}</tbody></table>
      <hr/>
      <div class="row"><span>${lbl.subtotal}</span><span>${fmt(order.subtotal)}</span></div>
      ${order.discountAmount > 0 ? `<div class="row"><span>${lbl.discount}</span><span>-${fmt(order.discountAmount)}</span></div>` : ''}
      ${order.taxAmount > 0      ? `<div class="row"><span>${lbl.tax}</span><span>${fmt(order.taxAmount)}</span></div>` : ''}
      <div class="row total"><span>${lbl.grandTotal}</span><span>${fmt(order.total)}</span></div>
      ${order.cashReceived ? `<div class="row"><span>${lbl.cash}</span><span>${fmt(order.cashReceived)}</span></div>` : ''}
      ${order.change       ? `<div class="row"><span>${lbl.change}</span><span>${fmt(order.change)}</span></div>` : ''}
      <hr/>
      <p>${lbl.payment}: ${order.paymentMethod}</p>
      ${order.note ? `<p>${lbl.note}: ${order.note}</p>` : ''}
      <hr/><p style="font-size:11px;">${lbl.thanks}</p>
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

  // Group by date
  const grouped = orders.reduce<Record<string, Order[]>>((acc, o) => {
    const d = formatDate(o.createdAt, lang);
    if (!acc[d]) acc[d] = [];
    acc[d].push(o);
    return acc;
  }, {});

  // Payment method label
  const paymentLabel = (method: string) => {
    if (method === 'cash')  return t('cash');
    if (method === 'card')  return t('card');
    if (method === 'split') return t('split');
    return method.charAt(0).toUpperCase() + method.slice(1);
  };

  // Invoice count subtitle
  const invoiceCountLabel = orders.length === 1
    ? t('invoiceTotalOne')
    : t('invoiceTotalMany', { count: orders.length });

  // Items count label
  const itemsLabel = (n: number) =>
    n === 1 ? t('itemsLabel', { count: n }) : t('itemsLabelPlural', { count: n });

  const rowDir = isRTL ? 'row-reverse' : 'row';

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>

      {/* ── Header ── */}
      <LinearGradient colors={['#1A56DB', '#0F3A9E']} style={styles.hero}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.backBtn, isRTL ? styles.backBtnRTL : styles.backBtnLTR]}
        >
          <Ionicons name={isRTL ? 'arrow-forward' : 'arrow-back'} size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={[styles.heroIcon, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
          <Ionicons name="receipt" size={36} color="#FFFFFF" />
        </View>
        <Text style={[styles.heroTitle, { fontFamily: 'Inter_700Bold' }]}>
          {t('invoices')}
        </Text>
        <Text style={[styles.heroSub, { fontFamily: 'Inter_400Regular' }]}>
          {loading ? '' : invoiceCountLabel}
        </Text>
      </LinearGradient>

      {/* ── States ── */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
            {t('loadingInvoices')}
          </Text>
        </View>

      ) : orders.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="receipt-outline" size={64} color={colors.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>
            {t('noInvoicesYet')}
          </Text>
          <Text style={[styles.emptyHint, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular', textAlign: 'center' }]}>
            {t('noInvoicesHint')}
          </Text>
        </View>

      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.primary} />
          }
        >
          {Object.entries(grouped).map(([date, dayOrders]) => (
            <View key={date}>
              {/* Date separator */}
              <View style={[styles.dateHeader, { flexDirection: rowDir }]}>
                <View style={[styles.dateLine, { backgroundColor: colors.border }]} />
                <View style={[styles.dateBadge, { backgroundColor: colors.muted, borderRadius: 20, flexDirection: rowDir }]}>
                  <Ionicons name="calendar-outline" size={12} color={colors.mutedForeground} />
                  <Text style={[styles.dateText, { color: colors.mutedForeground, fontFamily: 'Inter_600SemiBold' }]}>
                    {date}
                  </Text>
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
                  {/* Top row */}
                  <View style={[styles.cardTop, { flexDirection: rowDir }]}>
                    <View style={[styles.invoiceIcon, { backgroundColor: colors.primary + '15', borderRadius: 10 }]}>
                      <Ionicons name="document-text-outline" size={20} color={colors.primary} />
                    </View>
                    <View style={[styles.cardMeta, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
                      <Text style={[styles.orderNum, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>
                        #{order.orderNumber}
                      </Text>
                      <Text style={[styles.orderTime, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
                        {formatTime(order.createdAt, lang)} · {order.cashier}
                      </Text>
                    </View>
                    <Text style={[styles.orderTotal, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>
                      {formatCurrency(order.total, storeSettings.currency)}
                    </Text>
                  </View>

                  <View style={[styles.divider, { backgroundColor: colors.border }]} />

                  {/* Bottom row */}
                  <View style={[styles.cardBottom, { flexDirection: rowDir }]}>
                    <View style={[styles.metaChip, { flexDirection: rowDir }]}>
                      <Ionicons name={paymentIcon(order.paymentMethod) as any} size={13} color={colors.mutedForeground} />
                      <Text style={[styles.metaChipText, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
                        {paymentLabel(order.paymentMethod)}
                      </Text>
                    </View>

                    {order.customerName ? (
                      <View style={[styles.metaChip, { flexDirection: rowDir }]}>
                        <Ionicons name="person-outline" size={13} color={colors.mutedForeground} />
                        <Text style={[styles.metaChipText, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]} numberOfLines={1}>
                          {order.customerName}
                        </Text>
                      </View>
                    ) : null}

                    <View style={[styles.metaChip, { flexDirection: rowDir }]}>
                      <Ionicons name="cube-outline" size={13} color={colors.mutedForeground} />
                      <Text style={[styles.metaChipText, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
                        {itemsLabel((order.items ?? []).length)}
                      </Text>
                    </View>

                    <TouchableOpacity
                      onPress={() => handlePrint(order)}
                      disabled={printing === order.id}
                      style={[
                        styles.printBtn,
                        { backgroundColor: colors.primary + '15', borderRadius: 8 },
                        isRTL ? { marginRight: 'auto' } : { marginLeft: 'auto' },
                      ]}
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

      {/* ── Invoice preview modal ── */}
      <Modal visible={!!preview} transparent animationType="slide" onRequestClose={() => setPreview(null)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, {
            backgroundColor: colors.card,
            borderRadius: colors.radius + 8,
          }]}>
            {preview && (
              <>
                {/* Modal header */}
                <View style={[styles.modalHeader, { flexDirection: rowDir }]}>
                  <View style={{ alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                    <Text style={[styles.modalTitle, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>
                      {t('invoiceNo')}{preview.orderNumber}
                    </Text>
                    <Text style={[styles.modalDate, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
                      {formatDate(preview.createdAt, lang)} · {formatTime(preview.createdAt, lang)}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => setPreview(null)}>
                    <Ionicons name="close-circle" size={28} color={colors.mutedForeground} />
                  </TouchableOpacity>
                </View>

                <View style={[styles.divider, { backgroundColor: colors.border, marginVertical: 12 }]} />

                {/* Store / cashier / customer */}
                <PreviewRow label={t('store')}    value={storeSettings.name} isRTL={isRTL} colors={colors} />
                <PreviewRow label={t('cashierLabel')} value={preview.cashier} isRTL={isRTL} colors={colors} />
                {preview.customerName && (
                  <PreviewRow label={t('customerLabel')} value={preview.customerName} isRTL={isRTL} colors={colors} />
                )}

                <View style={[styles.divider, { backgroundColor: colors.border, marginVertical: 12 }]} />

                {/* Items */}
                <ScrollView style={{ maxHeight: 180 }} showsVerticalScrollIndicator={false}>
                  {(preview.items ?? []).map((item, i) => (
                    <View key={i} style={[styles.itemRow, { flexDirection: rowDir }]}>
                      <Text style={[styles.itemName, { color: colors.foreground, fontFamily: 'Inter_400Regular', textAlign: isRTL ? 'right' : 'left' }]} numberOfLines={1}>
                        {item.productName}
                      </Text>
                      <Text style={[styles.itemQty, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
                        ×{item.quantity}
                      </Text>
                      <Text style={[styles.itemTotal, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>
                        {formatCurrency(item.lineTotal, storeSettings.currency)}
                      </Text>
                    </View>
                  ))}
                </ScrollView>

                <View style={[styles.divider, { backgroundColor: colors.border, marginVertical: 12 }]} />

                {/* Totals */}
                <PreviewRow label={t('subtotal')} value={formatCurrency(preview.subtotal, storeSettings.currency)} isRTL={isRTL} colors={colors} />
                {preview.discountAmount > 0 && (
                  <PreviewRow label={t('discount')} value={`−${formatCurrency(preview.discountAmount, storeSettings.currency)}`} valueColor="#EF4444" isRTL={isRTL} colors={colors} />
                )}
                {preview.taxAmount > 0 && (
                  <PreviewRow label={t('tax')} value={formatCurrency(preview.taxAmount, storeSettings.currency)} isRTL={isRTL} colors={colors} />
                )}
                <View style={[styles.previewRow, styles.totalRow, { flexDirection: rowDir }]}>
                  <Text style={[styles.totalLabel, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>
                    {t('total')}
                  </Text>
                  <Text style={[styles.totalAmount, { color: colors.primary, fontFamily: 'Inter_700Bold' }]}>
                    {formatCurrency(preview.total, storeSettings.currency)}
                  </Text>
                </View>

                {/* Print button */}
                <TouchableOpacity
                  onPress={() => { setPreview(null); handlePrint(preview); }}
                  style={[styles.printFullBtn, { backgroundColor: colors.primary, borderRadius: colors.radius }]}
                  activeOpacity={0.85}
                >
                  <Ionicons name="print-outline" size={18} color="#FFFFFF" />
                  <Text style={[styles.printFullText, { fontFamily: 'Inter_700Bold' }]}>
                    {t('printReceipt')}
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ── Small helper for modal rows ───────────────────────────────────────────────

function PreviewRow({
  label, value, valueColor, isRTL, colors,
}: {
  label: string; value: string;
  valueColor?: string; isRTL: boolean;
  colors: ReturnType<typeof import('@/hooks/useColors').useColors>;
}) {
  return (
    <View style={[styles.previewRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
      <Text style={[styles.previewLabel, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
        {label}
      </Text>
      <Text style={[styles.previewValue, { color: valueColor ?? colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>
        {value}
      </Text>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },
  hero: {
    paddingTop: Platform.OS === 'web' ? 80 : 80,
    paddingBottom: 36,
    paddingHorizontal: 24,
    alignItems: 'center',
    gap: 8,
  },
  backBtn:    { position: 'absolute', top: Platform.OS === 'web' ? 24 : 52 },
  backBtnLTR: { left: 20 },
  backBtnRTL: { right: 20 },
  heroIcon:   { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  heroTitle:  { fontSize: 24, color: '#FFFFFF' },
  heroSub:    { fontSize: 14, color: 'rgba(255,255,255,0.75)' },

  centered:    { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingVertical: 80 },
  loadingText: { fontSize: 14, marginTop: 8 },
  emptyTitle:  { fontSize: 18 },
  emptyHint:   { fontSize: 14, paddingHorizontal: 40, lineHeight: 22 },

  scrollContent: { padding: 16, gap: 10, paddingTop: 20 },

  dateHeader: { alignItems: 'center', gap: 10, marginVertical: 6 },
  dateLine:   { flex: 1, height: 1 },
  dateBadge:  { alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 4 },
  dateText:   { fontSize: 11 },

  invoiceCard: {
    borderWidth: 1, padding: 14, gap: 10,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 }, elevation: 2, marginBottom: 4,
  },
  cardTop:       { alignItems: 'center', gap: 12 },
  invoiceIcon:   { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
  cardMeta:      { flex: 1 },
  orderNum:      { fontSize: 15 },
  orderTime:     { fontSize: 12, marginTop: 2 },
  orderTotal:    { fontSize: 16 },
  divider:       { height: 1 },
  cardBottom:    { alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  metaChip:      { alignItems: 'center', gap: 4 },
  metaChipText:  { fontSize: 12 },
  printBtn:      { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },

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
  modalHeader:  { alignItems: 'flex-start', justifyContent: 'space-between' },
  modalTitle:   { fontSize: 20 },
  modalDate:    { fontSize: 13, marginTop: 2 },
  previewRow:   { justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  previewLabel: { fontSize: 13 },
  previewValue: { fontSize: 13 },
  itemRow:      { alignItems: 'center', gap: 6, marginBottom: 6 },
  itemName:     { flex: 1, fontSize: 13 },
  itemQty:      { fontSize: 12, minWidth: 24, textAlign: 'center' },
  itemTotal:    { fontSize: 13 },
  totalRow:     { marginTop: 4, paddingTop: 8 },
  totalLabel:   { fontSize: 16 },
  totalAmount:  { fontSize: 18 },
  printFullBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, height: 50, marginTop: 16,
  },
  printFullText: { fontSize: 16, color: '#FFFFFF' },
});
