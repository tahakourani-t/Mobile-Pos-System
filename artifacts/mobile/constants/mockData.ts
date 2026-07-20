import type { Product, Order, Customer, NotificationItem, Expense, User, WeeklySalesPoint } from '@/types';

export const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2, 5);

export const MOCK_USER: User = {
  id: 'user_01',
  name: 'Ahmed Khalil',
  email: 'admin@store.com',
  role: 'admin',
  pin: '1234',
};

export const PRODUCT_CATEGORIES = ['All', 'Beverages', 'Food', 'Electronics', 'Clothing', 'Pharmacy', 'Other'];

const now = new Date();

export const MOCK_PRODUCTS: Product[] = [
  { id: 'p01', name: 'Mineral Water 500ml', nameAr: 'ماء معدني 500 مل', price: 2500, purchasePrice: 1200, sku: 'BEV001', barcode: '6281012345678', category: 'Beverages', stock: 150, unit: 'piece', isActive: true, lowStockAlert: 20, createdAt: '2024-01-01' },
  { id: 'p02', name: 'Orange Juice 1L', nameAr: 'عصير برتقال 1 ليتر', price: 5000, purchasePrice: 2800, sku: 'BEV002', barcode: '6281012345679', category: 'Beverages', stock: 80, unit: 'piece', isActive: true, lowStockAlert: 15, createdAt: '2024-01-01' },
  { id: 'p03', name: 'Whole Milk 1L', nameAr: 'حليب كامل 1 ليتر', price: 3500, purchasePrice: 2000, sku: 'FOD001', barcode: '6281012345680', category: 'Food', stock: 60, unit: 'piece', isActive: true, lowStockAlert: 10, createdAt: '2024-01-01' },
  { id: 'p04', name: 'Wheat Bread', nameAr: 'خبز قمح', price: 4000, purchasePrice: 2200, sku: 'FOD002', barcode: '6281012345681', category: 'Food', stock: 35, unit: 'piece', isActive: true, lowStockAlert: 10, createdAt: '2024-01-01' },
  { id: 'p05', name: 'Dark Chocolate Bar', nameAr: 'شوكولاتة داكنة', price: 8000, purchasePrice: 4500, sku: 'FOD003', barcode: '6281012345682', category: 'Food', stock: 12, unit: 'piece', isActive: true, lowStockAlert: 15, createdAt: '2024-01-01' },
  { id: 'p06', name: 'USB-C Cable 1m', nameAr: 'كابل USB-C متر', price: 25000, purchasePrice: 12000, sku: 'ELC001', barcode: '6281012345683', category: 'Electronics', stock: 45, unit: 'piece', isActive: true, lowStockAlert: 5, createdAt: '2024-01-01' },
  { id: 'p07', name: 'Screen Protector', nameAr: 'واقي شاشة', price: 15000, purchasePrice: 5000, sku: 'ELC002', barcode: '6281012345684', category: 'Electronics', stock: 30, unit: 'piece', isActive: true, lowStockAlert: 5, createdAt: '2024-01-01' },
  { id: 'p08', name: 'Paracetamol 500mg', nameAr: 'باراسيتامول 500 ملغ', price: 6000, purchasePrice: 3000, sku: 'PHA001', barcode: '6281012345685', category: 'Pharmacy', stock: 8, unit: 'box', isActive: true, lowStockAlert: 10, createdAt: '2024-01-01' },
  { id: 'p09', name: 'Energy Drink 250ml', nameAr: 'مشروب طاقة 250 مل', price: 7000, purchasePrice: 3500, sku: 'BEV003', barcode: '6281012345686', category: 'Beverages', stock: 100, unit: 'can', isActive: true, lowStockAlert: 20, createdAt: '2024-01-01' },
  { id: 'p10', name: 'Cotton T-Shirt M', nameAr: 'تي شيرت قطن مقاس M', price: 35000, purchasePrice: 18000, sku: 'CLT001', barcode: '6281012345687', category: 'Clothing', stock: 25, unit: 'piece', isActive: true, lowStockAlert: 5, createdAt: '2024-01-01' },
  { id: 'p11', name: 'Green Tea 25 bags', nameAr: 'شاي أخضر 25 كيس', price: 12000, purchasePrice: 6000, sku: 'BEV004', barcode: '6281012345688', category: 'Beverages', stock: 55, unit: 'box', isActive: true, lowStockAlert: 10, createdAt: '2024-01-01' },
  { id: 'p12', name: 'Vitamin C 1000mg', nameAr: 'فيتامين سي 1000 ملغ', price: 22000, purchasePrice: 12000, sku: 'PHA002', barcode: '6281012345689', category: 'Pharmacy', stock: 3, unit: 'bottle', isActive: true, lowStockAlert: 5, createdAt: '2024-01-01' },
];

export const MOCK_ORDERS: Order[] = [
  {
    id: 'ord001', orderNumber: '#0001',
    items: [{ product: MOCK_PRODUCTS[0], quantity: 3, discount: 0 }, { product: MOCK_PRODUCTS[1], quantity: 1, discount: 0 }],
    subtotal: 12500, discountAmount: 0, taxAmount: 0, total: 12500,
    paymentMethod: 'cash', cashReceived: 15000, change: 2500,
    status: 'completed', createdAt: new Date(now.getTime() - 30 * 60000).toISOString(), cashier: 'Ahmed',
  },
  {
    id: 'ord002', orderNumber: '#0002',
    items: [{ product: MOCK_PRODUCTS[5], quantity: 1, discount: 0 }, { product: MOCK_PRODUCTS[6], quantity: 2, discount: 0 }],
    subtotal: 55000, discountAmount: 5000, taxAmount: 0, total: 50000,
    paymentMethod: 'card',
    status: 'completed', createdAt: new Date(now.getTime() - 90 * 60000).toISOString(), cashier: 'Ahmed',
  },
  {
    id: 'ord003', orderNumber: '#0003',
    items: [{ product: MOCK_PRODUCTS[2], quantity: 2, discount: 0 }, { product: MOCK_PRODUCTS[3], quantity: 1, discount: 0 }],
    subtotal: 11000, discountAmount: 0, taxAmount: 0, total: 11000,
    paymentMethod: 'cash', cashReceived: 15000, change: 4000,
    status: 'completed', createdAt: new Date(now.getTime() - 150 * 60000).toISOString(), cashier: 'Sara',
  },
  {
    id: 'ord004', orderNumber: '#0004',
    items: [{ product: MOCK_PRODUCTS[9], quantity: 2, discount: 0 }],
    subtotal: 70000, discountAmount: 0, taxAmount: 0, total: 70000,
    paymentMethod: 'card',
    status: 'completed', createdAt: new Date(now.getTime() - 210 * 60000).toISOString(), cashier: 'Ahmed',
  },
  {
    id: 'ord005', orderNumber: '#0005',
    items: [{ product: MOCK_PRODUCTS[8], quantity: 4, discount: 0 }, { product: MOCK_PRODUCTS[10], quantity: 2, discount: 0 }],
    subtotal: 52000, discountAmount: 2000, taxAmount: 0, total: 50000,
    paymentMethod: 'cash', cashReceived: 50000, change: 0,
    status: 'completed', createdAt: new Date(now.getTime() - 270 * 60000).toISOString(), cashier: 'Sara',
  },
];

export const MOCK_CUSTOMERS: Customer[] = [
  { id: 'c01', name: 'Mohammed Khalil', phone: '+96170123456', email: 'mo@example.com', totalPurchases: 485000, totalOrders: 12, lastVisit: new Date(now.getTime() - 86400000).toISOString(), points: 48, credit: 0, createdAt: '2024-01-05' },
  { id: 'c02', name: 'Sara Ahmed', phone: '+96171234567', email: 'sara@example.com', totalPurchases: 1250000, totalOrders: 28, lastVisit: new Date(now.getTime() - 172800000).toISOString(), points: 125, credit: 50000, createdAt: '2024-01-10' },
  { id: 'c03', name: 'Khalid Hassan', phone: '+96176345678', totalPurchases: 320000, totalOrders: 8, points: 32, credit: 0, createdAt: '2024-02-01' },
  { id: 'c04', name: 'Fatima Khoury', phone: '+96178456789', email: 'fatima@example.com', totalPurchases: 875000, totalOrders: 19, lastVisit: new Date(now.getTime() - 259200000).toISOString(), points: 87, credit: 25000, createdAt: '2024-02-15' },
  { id: 'c05', name: 'Omar Nasser', phone: '+96179567890', totalPurchases: 160000, totalOrders: 5, points: 16, credit: 0, notes: 'Prefers morning visits', createdAt: '2024-03-01' },
];

export const MOCK_NOTIFICATIONS: NotificationItem[] = [
  { id: 'n01', type: 'low_stock', title: 'Low Stock Alert', body: 'Vitamin C 1000mg — only 3 units left', read: false, createdAt: new Date(now.getTime() - 10 * 60000).toISOString(), link: '/inventory' },
  { id: 'n02', type: 'new_order', title: 'New Order #0003', body: 'Order completed — LBP 11,000', read: false, createdAt: new Date(now.getTime() - 30 * 60000).toISOString() },
  { id: 'n03', type: 'low_stock', title: 'Low Stock Alert', body: 'Dark Chocolate Bar — only 12 units left', read: true, createdAt: new Date(now.getTime() - 60 * 60000).toISOString(), link: '/inventory' },
  { id: 'n04', type: 'new_customer', title: 'New Customer Registered', body: 'Khalid Hassan joined your store', read: true, createdAt: new Date(now.getTime() - 180 * 60000).toISOString() },
  { id: 'n05', type: 'daily_summary', title: 'Daily Summary', body: 'Yesterday\'s sales: LBP 193,500 · Orders: 5', read: true, createdAt: new Date(now.getTime() - 720 * 60000).toISOString() },
];

export const MOCK_EXPENSES: Expense[] = [
  { id: 'e01', category: 'Rent', amount: 5000000, description: 'Monthly store rent', date: new Date(now.getFullYear(), now.getMonth(), 1).toISOString(), isRecurring: true },
  { id: 'e02', category: 'Utilities', amount: 350000, description: 'Electricity & water', date: new Date(now.getFullYear(), now.getMonth(), 5).toISOString(), isRecurring: true },
  { id: 'e03', category: 'Supplies', amount: 150000, description: 'Office supplies', date: new Date(now.getTime() - 172800000).toISOString(), isRecurring: false },
];

export const WEEKLY_SALES: WeeklySalesPoint[] = [
  { day: 'Mon', sales: 98000 },
  { day: 'Tue', sales: 134000 },
  { day: 'Wed', sales: 82000 },
  { day: 'Thu', sales: 156000 },
  { day: 'Fri', sales: 210000 },
  { day: 'Sat', sales: 187000 },
  { day: 'Sun', sales: 145000 },
];
