export interface StoreProfile {
  storeId: string;
  name: string;
  logoUri?: string;
  createdAt: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'cashier' | 'manager';
  pin: string;
}

export interface Product {
  id: string;
  name: string;
  nameAr?: string;
  description?: string;
  price: number;
  purchasePrice: number;
  sku: string;
  barcode?: string;
  category: string;
  stock: number;
  unit: string;
  image?: string;        // local URI or remote URL
  isActive: boolean;
  lowStockAlert: number;
  createdAt: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
  discount: number;
}

export interface Order {
  id: string;
  orderNumber: string;
  items: CartItem[];
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  total: number;
  paymentMethod: 'cash' | 'card' | 'custom';
  cashReceived?: number;
  change?: number;
  customerId?: string;
  customerName?: string;
  status: 'completed' | 'held' | 'refunded' | 'cancelled';
  createdAt: string;
  cashier: string;
  note?: string;
}

export interface HeldOrder {
  id: string;
  items: CartItem[];
  note?: string;
  createdAt: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  totalPurchases: number;
  totalOrders: number;
  lastVisit?: string;
  points: number;
  credit: number;
  notes?: string;
  createdAt: string;
}

export interface Supplier {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  outstandingBalance: number;
  createdAt: string;
}

export interface Expense {
  id: string;
  category: string;
  amount: number;
  description: string;
  date: string;
  isRecurring: boolean;
}

export interface NotificationItem {
  id: string;
  type: 'new_order' | 'low_stock' | 'employee_activity' | 'new_customer' | 'system' | 'subscription' | 'daily_summary';
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
  link?: string;
}

export interface StoreSettings {
  name: string;
  address: string;
  phone: string;
  email: string;
  vatNumber: string;
  currency: string;
  taxRate: number;
  language: 'en' | 'ar';
  theme: 'light' | 'dark' | 'blue' | 'system';
  logoUri?: string;
}

export interface WeeklySalesPoint {
  day: string;
  sales: number;
}
