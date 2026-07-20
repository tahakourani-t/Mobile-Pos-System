import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = 'auth_token';

function getBase(): string {
  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  if (domain) return `https://${domain}`;
  return 'http://localhost:8080';
}

// ── Token management ─────────────────────────────────────────────────────────

let _token: string | null = null;

export async function loadToken(): Promise<string | null> {
  _token = await AsyncStorage.getItem(TOKEN_KEY);
  return _token;
}

export async function saveToken(token: string): Promise<void> {
  _token = token;
  await AsyncStorage.setItem(TOKEN_KEY, token);
}

export async function clearToken(): Promise<void> {
  _token = null;
  await AsyncStorage.removeItem(TOKEN_KEY);
}

// ── Core fetch ───────────────────────────────────────────────────────────────

async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  overrideToken?: string,
): Promise<T> {
  const url = `${getBase()}${path}`;
  const token = overrideToken ?? _token ?? (await loadToken());

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> ?? {}),
  };

  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(url, { ...options, headers });

  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try { const j = await res.json(); msg = j.error ?? j.message ?? msg; } catch {}
    throw new Error(msg);
  }

  if (res.status === 204) return undefined as unknown as T;
  return res.json() as Promise<T>;
}

// ── Auth ─────────────────────────────────────────────────────────────────────

export interface AuthResult {
  token: string;
  user: ApiUser;
  store: ApiStore;
}

export interface ApiUser {
  id: string;
  storeId: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
}

export interface ApiStore {
  id: string;
  name: string;
  nameAr?: string;
  address?: string;
  phone?: string;
  email?: string;
  logoUrl?: string;
  vatNumber?: string;
  currency: string;
  taxRate: number;
  language: string;
  theme: string;
  isActive: boolean;
  isVerified: boolean;
  planExpiry?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface StoreProfile {
  id: string;
  name: string;
  logoUrl?: string;
  createdAt: string;
}

export interface LoginError {
  error: string;
  emailVerificationRequired?: boolean;
  storeId?: string;
}

export const auth = {
  listStores: () => apiFetch<StoreProfile[]>('/api/auth/stores'),

  setup: (body: {
    storeName: string; phone: string; email?: string;
    address?: string; currency?: string; logoUri?: string; language?: string; pin: string;
  }) => apiFetch<AuthResult & { emailVerificationRequired?: boolean }>('/api/auth/setup', { method: 'POST', body: JSON.stringify(body) }),

  /**
   * Login with email + PIN.
   * On success → resolves to AuthResult.
   * On unverified store → rejects with a LoginError (check e.emailVerificationRequired).
   */
  login: async (email: string, pin: string): Promise<AuthResult> => {
    const url = `${getBase()}/api/auth/login`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, pin }),
    });
    const json = await res.json() as AuthResult & LoginError;
    if (!res.ok) {
      const err = new Error(json.error ?? `HTTP ${res.status}`) as Error & LoginError;
      err.emailVerificationRequired = json.emailVerificationRequired;
      err.storeId = json.storeId;
      throw err;
    }
    return json;
  },

  verifyEmail: (storeId: string, code: string) =>
    apiFetch<{ message: string }>('/api/auth/verify-email', {
      method: 'POST', body: JSON.stringify({ storeId, code }),
    }),

  resendVerification: (storeId: string) =>
    apiFetch<{ message: string }>('/api/auth/resend-verification', {
      method: 'POST', body: JSON.stringify({ storeId }),
    }),
};

// ── Admin ─────────────────────────────────────────────────────────────────────

export interface AdminAuthResult {
  token: string;
  role: string;
}

export const admin = {
  login: (email: string, pin: string) =>
    apiFetch<AdminAuthResult>('/api/admin/auth', { method: 'POST', body: JSON.stringify({ email, pin }) }),

  listStores: (adminToken: string) =>
    apiFetch<ApiStore[]>('/api/admin/stores', {}, adminToken),

  activate: (storeId: string, duration: '1month' | '1year', adminToken: string) =>
    apiFetch<ApiStore>(`/api/admin/stores/${storeId}/activate`, {
      method: 'POST', body: JSON.stringify({ duration }),
    }, adminToken),

  deactivate: (storeId: string, adminToken: string) =>
    apiFetch<ApiStore>(`/api/admin/stores/${storeId}/deactivate`, {
      method: 'POST', body: JSON.stringify({}),
    }, adminToken),

  notify: (storeId: string, message: string, subject: string, adminToken: string) =>
    apiFetch<{ ok: boolean; message: string }>('/api/admin/notify', {
      method: 'POST', body: JSON.stringify({ storeId, message, subject }),
    }, adminToken),
};

// ── Stores ────────────────────────────────────────────────────────────────────

export const stores = {
  get: (id: string) => apiFetch<ApiStore>(`/api/stores/${id}`),
  update: (id: string, body: Partial<ApiStore>) =>
    apiFetch<ApiStore>(`/api/stores/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
};

// ── Products ──────────────────────────────────────────────────────────────────

export interface ApiProduct {
  id: string; storeId: string; name: string; nameAr?: string;
  description?: string; price: number; purchasePrice: number;
  sku: string; barcode?: string; category: string; stock: number;
  unit: string; imageUrl?: string; isActive: boolean; lowStockAlert: number;
  createdAt: string; updatedAt: string;
}

export const products = {
  list: () => apiFetch<ApiProduct[]>('/api/products'),
  create: (body: Omit<ApiProduct, 'id' | 'storeId' | 'createdAt' | 'updatedAt'>) =>
    apiFetch<ApiProduct>('/api/products', { method: 'POST', body: JSON.stringify(body) }),
  update: (id: string, body: Partial<ApiProduct>) =>
    apiFetch<ApiProduct>(`/api/products/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  delete: (id: string) =>
    apiFetch<void>(`/api/products/${id}`, { method: 'DELETE' }),
};

// ── Customers ─────────────────────────────────────────────────────────────────

export interface ApiCustomer {
  id: string; storeId: string; name: string; phone: string;
  email?: string; address?: string; notes?: string;
  totalPurchases: number; totalOrders: number; points: number; credit: number;
  lastVisit?: string; createdAt: string;
}

export const customers = {
  list: () => apiFetch<ApiCustomer[]>('/api/customers'),
  create: (body: Pick<ApiCustomer, 'name' | 'phone'> & Partial<ApiCustomer>) =>
    apiFetch<ApiCustomer>('/api/customers', { method: 'POST', body: JSON.stringify(body) }),
  update: (id: string, body: Partial<ApiCustomer>) =>
    apiFetch<ApiCustomer>(`/api/customers/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
};

// ── Orders ────────────────────────────────────────────────────────────────────

export interface ApiOrderItem {
  id: string; orderId: string; storeId: string;
  productId: string; productName: string; productNameAr?: string;
  sku: string; quantity: number; unitPrice: number;
  purchasePrice: number; discount: number; lineTotal: number;
}

export interface ApiOrder {
  id: string; storeId: string; orderNumber: string;
  customerId?: string; customerName?: string; cashier: string;
  status: string; subtotal: number; discountAmount: number;
  taxAmount: number; total: number; paymentMethod: string;
  cashReceived?: number; change?: number; note?: string;
  createdAt: string; items: ApiOrderItem[];
}

export interface CreateOrderPayload {
  items: Array<{
    productId: string; productName: string; productNameAr?: string;
    sku?: string; quantity: number; unitPrice: number;
    purchasePrice?: number; discount?: number; lineTotal: number;
  }>;
  subtotal: number; discountAmount: number; taxAmount: number; total: number;
  paymentMethod: string; cashReceived?: number; change?: number;
  customerId?: string; customerName?: string; status?: string; note?: string;
}

export const orders = {
  list: () => apiFetch<ApiOrder[]>('/api/orders'),
  create: (body: CreateOrderPayload) =>
    apiFetch<ApiOrder>('/api/orders', { method: 'POST', body: JSON.stringify(body) }),
};

// ── Expenses ──────────────────────────────────────────────────────────────────

export interface ApiExpense {
  id: string; storeId: string; category: string; amount: number;
  description?: string; date: string; isRecurring: boolean; createdAt: string;
}

export const expenses = {
  list: () => apiFetch<ApiExpense[]>('/api/expenses'),
  create: (body: Omit<ApiExpense, 'id' | 'storeId' | 'createdAt'>) =>
    apiFetch<ApiExpense>('/api/expenses', { method: 'POST', body: JSON.stringify(body) }),
};

// ── Notifications ─────────────────────────────────────────────────────────────

export interface ApiNotification {
  id: string; storeId: string; type: string; title: string;
  body: string; read: boolean; link?: string; createdAt: string;
}

export const notifications = {
  list: () => apiFetch<ApiNotification[]>('/api/notifications'),
  create: (body: Pick<ApiNotification, 'type' | 'title' | 'body'> & { link?: string }) =>
    apiFetch<ApiNotification>('/api/notifications', { method: 'POST', body: JSON.stringify(body) }),
  markRead: (id: string) =>
    apiFetch<{ ok: boolean }>(`/api/notifications/${id}/read`, { method: 'PATCH' }),
  markAllRead: () =>
    apiFetch<{ ok: boolean }>('/api/notifications/read-all', { method: 'PATCH' }),
};
