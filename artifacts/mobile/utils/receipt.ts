import type { Order, StoreSettings } from '@/types';
import type { Lang } from '@/constants/translations';

export function buildReceiptHTML(order: Order, settings: StoreSettings, lang: Lang): string {
  const isRTL = lang === 'ar';
  const dir = isRTL ? 'rtl' : 'ltr';

  const labels = {
    receipt:    lang === 'ar' ? 'فاتورة'             : 'RECEIPT',
    orderNo:    lang === 'ar' ? 'رقم الطلب'          : 'Order No.',
    date:       lang === 'ar' ? 'التاريخ'            : 'Date',
    cashier:    lang === 'ar' ? 'الكاشير'            : 'Cashier',
    qty:        lang === 'ar' ? 'الكمية'             : 'Qty',
    item:       lang === 'ar' ? 'الصنف'              : 'Item',
    price:      lang === 'ar' ? 'السعر'              : 'Price',
    subtotal:   lang === 'ar' ? 'المجموع الفرعي'     : 'Subtotal',
    discount:   lang === 'ar' ? 'الخصم'              : 'Discount',
    tax:        lang === 'ar' ? 'الضريبة'            : 'Tax',
    total:      lang === 'ar' ? 'الإجمالي'           : 'Total',
    cash:       lang === 'ar' ? 'نقداً'              : 'Cash',
    change:     lang === 'ar' ? 'الباقي'             : 'Change',
    thankYou:   lang === 'ar' ? 'شكراً لك على شرائك!' : 'Thank you for your purchase!',
    vat:        lang === 'ar' ? 'الرقم الضريبي'      : 'VAT No.',
  };

  const dateStr = new Date(order.createdAt).toLocaleString(lang === 'ar' ? 'ar-SA' : 'en-US');

  const itemRows = order.items.map(i => `
    <tr>
      <td style="padding:4px 2px; font-size:13px;">${i.quantity}</td>
      <td style="padding:4px 2px; font-size:13px; max-width:140px;">${lang === 'ar' && i.product.nameAr ? i.product.nameAr : i.product.name}</td>
      <td style="padding:4px 2px; font-size:13px; text-align:${isRTL ? 'left' : 'right'};">${(i.product.price * i.quantity).toFixed(2)}</td>
    </tr>
  `).join('');

  return `<!DOCTYPE html>
<html dir="${dir}" lang="${lang}">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family: ${lang === 'ar' ? "'Tahoma','Arial Arabic',Arial" : "Courier New, monospace"}; font-size:14px; direction:${dir}; padding:12px; max-width:300px; margin:0 auto; }
    .center { text-align:center; }
    .store-name { font-size:18px; font-weight:bold; margin-bottom:2px; }
    .divider { border:none; border-top:1px dashed #333; margin:8px 0; }
    .divider-solid { border:none; border-top:2px solid #000; margin:8px 0; }
    table { width:100%; border-collapse:collapse; }
    .meta { font-size:12px; color:#555; }
    .total-row td { font-weight:bold; font-size:15px; padding:4px 2px; }
    .thank-you { font-size:13px; margin-top:8px; font-weight:bold; }
    .footer { font-size:11px; color:#777; margin-top:4px; }
  </style>
</head>
<body>
  <div class="center">
    <div class="store-name">${settings.name}</div>
    <div class="meta">${settings.address}</div>
    <div class="meta">${settings.phone}</div>
    ${settings.vatNumber ? `<div class="meta">${labels.vat}: ${settings.vatNumber}</div>` : ''}
  </div>

  <hr class="divider-solid"/>

  <div style="font-size:20px; font-weight:bold; text-align:center; letter-spacing:2px; margin-bottom:6px;">${labels.receipt}</div>

  <table>
    <tr><td class="meta">${labels.orderNo}</td><td style="text-align:${isRTL ? 'left' : 'right'}; font-size:13px;">${order.orderNumber}</td></tr>
    <tr><td class="meta">${labels.date}</td><td style="text-align:${isRTL ? 'left' : 'right'}; font-size:12px;">${dateStr}</td></tr>
    <tr><td class="meta">${labels.cashier}</td><td style="text-align:${isRTL ? 'left' : 'right'}; font-size:13px;">${order.cashier}</td></tr>
  </table>

  <hr class="divider"/>

  <table>
    <thead>
      <tr style="border-bottom:1px solid #ccc;">
        <th style="text-align:${isRTL ? 'right' : 'left'}; padding:4px 2px; font-size:12px; width:28px;">${labels.qty}</th>
        <th style="text-align:${isRTL ? 'right' : 'left'}; padding:4px 2px; font-size:12px;">${labels.item}</th>
        <th style="text-align:${isRTL ? 'left' : 'right'}; padding:4px 2px; font-size:12px;">${settings.currency}</th>
      </tr>
    </thead>
    <tbody>${itemRows}</tbody>
  </table>

  <hr class="divider"/>

  <table>
    <tr><td class="meta">${labels.subtotal}</td><td style="text-align:${isRTL ? 'left' : 'right'};">${order.subtotal.toFixed(2)}</td></tr>
    ${order.discountAmount > 0 ? `<tr><td class="meta">${labels.discount}</td><td style="text-align:${isRTL ? 'left' : 'right'}; color:#c00;">-${order.discountAmount.toFixed(2)}</td></tr>` : ''}
    <tr><td class="meta">${labels.tax}</td><td style="text-align:${isRTL ? 'left' : 'right'};">${order.taxAmount.toFixed(2)}</td></tr>
  </table>

  <hr class="divider-solid"/>

  <table>
    <tr class="total-row">
      <td>${labels.total}</td>
      <td style="text-align:${isRTL ? 'left' : 'right'};">${settings.currency} ${order.total.toFixed(2)}</td>
    </tr>
    ${order.cashReceived !== undefined ? `<tr><td class="meta">${labels.cash}</td><td style="text-align:${isRTL ? 'left' : 'right'}; font-size:13px;">${order.cashReceived.toFixed(2)}</td></tr>` : ''}
    ${order.change !== undefined && order.change > 0 ? `<tr><td class="meta">${labels.change}</td><td style="text-align:${isRTL ? 'left' : 'right'}; font-size:13px; color:#080;">${order.change.toFixed(2)}</td></tr>` : ''}
  </table>

  <hr class="divider"/>

  <div class="center thank-you">${labels.thankYou}</div>
  <div class="center footer">${settings.name} · ${new Date().getFullYear()}</div>
</body>
</html>`;
}
