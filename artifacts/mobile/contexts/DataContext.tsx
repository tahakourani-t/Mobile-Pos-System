import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { Product, Order, Customer, Expense } from '@/types';
import * as api from '@/lib/api';
import { useApp } from './AppContext';

// ── Type adapters: API → local types ────────────────────────────────────────

function toProduct(p: api.ApiProduct): Product {
  return {
    id: p.id, name: p.name, nameAr: p.nameAr,
    description: p.description, price: p.price, purchasePrice: p.purchasePrice,
    sku: p.sku, barcode: p.barcode, category: p.category,
    stock: p.stock, unit: p.unit, image: p.imageUrl,
    isActive: p.isActive, lowStockAlert: p.lowStockAlert,
    createdAt: p.createdAt,
  };
}

function toOrder(o: api.ApiOrder): Order {
  return {
    id: o.id, orderNumber: o.orderNumber,
    items: o.items.map(i => ({
      product: {
        id: i.productId, name: i.productName, nameAr: i.productNameAr,
        price: i.unitPrice, purchasePrice: i.purchasePrice,
        sku: i.sku, category: '', stock: 0, unit: 'piece',
        isActive: true, lowStockAlert: 5, createdAt: o.createdAt,
      },
      quantity: i.quantity,
      discount: i.discount,
    })),
    subtotal: o.subtotal, discountAmount: o.discountAmount,
    taxAmount: o.taxAmount, total: o.total,
    paymentMethod: o.paymentMethod as Order['paymentMethod'],
    cashReceived: o.cashReceived, change: o.change,
    customerId: o.customerId, customerName: o.customerName,
    status: o.status as Order['status'],
    createdAt: o.createdAt, cashier: o.cashier, note: o.note,
  };
}

function toCustomer(c: api.ApiCustomer): Customer {
  return {
    id: c.id, name: c.name, phone: c.phone, email: c.email,
    address: c.address, totalPurchases: c.totalPurchases,
    totalOrders: c.totalOrders, lastVisit: c.lastVisit,
    points: c.points, credit: c.credit, notes: c.notes,
    createdAt: c.createdAt,
  };
}

function toExpense(e: api.ApiExpense): Expense {
  return {
    id: e.id, category: e.category, amount: e.amount,
    description: e.description ?? '', date: e.date, isRecurring: e.isRecurring,
  };
}

// ── Context ──────────────────────────────────────────────────────────────────

interface DataContextType {
  products: Product[];
  orders: Order[];
  customers: Customer[];
  expenses: Expense[];
  isLoading: boolean;
  refresh: () => Promise<void>;
  addProduct: (p: Omit<Product, 'id' | 'createdAt'>) => Promise<Product>;
  updateProduct: (id: string, p: Partial<Product>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  addOrder: (o: Omit<Order, 'id' | 'createdAt' | 'orderNumber'>) => Promise<Order>;
  addCustomer: (c: Omit<Customer, 'id' | 'createdAt' | 'totalPurchases' | 'totalOrders' | 'points' | 'credit'>) => Promise<Customer>;
  updateCustomer: (id: string, c: Partial<Customer>) => Promise<void>;
  addExpense: (e: Omit<Expense, 'id'>) => Promise<void>;
  todaySales: number;
  todayOrders: number;
  todayProfit: number;
}

const DataContext = createContext<DataContextType>({} as DataContextType);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, activeStoreId } = useApp();
  const [products,  setProducts]  = useState<Product[]>([]);
  const [orders,    setOrders]    = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [expenses,  setExpenses]  = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!isAuthenticated) return;
    setIsLoading(true);
    try {
      const [prods, ords, custs, exps] = await Promise.all([
        api.products.list(),
        api.orders.list(),
        api.customers.list(),
        api.expenses.list(),
      ]);
      setProducts(prods.map(toProduct));
      setOrders(ords.map(toOrder));
      setCustomers(custs.map(toCustomer));
      setExpenses(exps.map(toExpense));
    } catch (err) {
      console.warn('DataContext refresh error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  // Load data whenever auth state changes
  useEffect(() => {
    if (isAuthenticated && activeStoreId) {
      refresh();
    } else {
      setProducts([]);
      setOrders([]);
      setCustomers([]);
      setExpenses([]);
    }
  }, [isAuthenticated, activeStoreId]);

  // ── Products ────────────────────────────────────────────────────────────
  const addProduct = async (p: Omit<Product, 'id' | 'createdAt'>): Promise<Product> => {
    const created = await api.products.create({
      name: p.name, nameAr: p.nameAr, description: p.description,
      price: p.price, purchasePrice: p.purchasePrice,
      sku: p.sku, barcode: p.barcode, category: p.category,
      stock: p.stock, unit: p.unit, imageUrl: p.image,
      isActive: p.isActive, lowStockAlert: p.lowStockAlert,
    });
    const prod = toProduct(created);
    setProducts(prev => [...prev, prod]);
    return prod;
  };

  const updateProduct = async (id: string, p: Partial<Product>) => {
    const updated = await api.products.update(id, {
      name: p.name, nameAr: p.nameAr, description: p.description,
      price: p.price, purchasePrice: p.purchasePrice,
      sku: p.sku, barcode: p.barcode, category: p.category,
      stock: p.stock, unit: p.unit, imageUrl: p.image,
      isActive: p.isActive, lowStockAlert: p.lowStockAlert,
    });
    const prod = toProduct(updated);
    setProducts(prev => prev.map(x => x.id === id ? prod : x));
  };

  const deleteProduct = async (id: string) => {
    await api.products.delete(id);
    setProducts(prev => prev.filter(x => x.id !== id));
  };

  // ── Orders ──────────────────────────────────────────────────────────────
  const addOrder = async (o: Omit<Order, 'id' | 'createdAt' | 'orderNumber'>): Promise<Order> => {
    const created = await api.orders.create({
      items: o.items.map(i => ({
        productId:    i.product.id,
        productName:  i.product.name,
        productNameAr: i.product.nameAr,
        sku:          i.product.sku,
        quantity:     i.quantity,
        unitPrice:    i.product.price,
        purchasePrice: i.product.purchasePrice,
        discount:     i.discount,
        lineTotal:    i.product.price * i.quantity - i.discount,
      })),
      subtotal: o.subtotal, discountAmount: o.discountAmount,
      taxAmount: o.taxAmount, total: o.total,
      paymentMethod: o.paymentMethod,
      cashReceived: o.cashReceived, change: o.change,
      customerId: o.customerId, customerName: o.customerName,
      status: o.status, note: o.note,
    });
    // After order, refresh products (stock updated server-side)
    api.products.list().then(p => setProducts(p.map(toProduct))).catch(() => {});
    // Update customer list if needed
    if (o.customerId) {
      api.customers.list().then(c => setCustomers(c.map(toCustomer))).catch(() => {});
    }
    const order = toOrder(created);
    setOrders(prev => [order, ...prev]);
    return order;
  };

  // ── Customers ───────────────────────────────────────────────────────────
  const addCustomer = async (c: Omit<Customer, 'id' | 'createdAt' | 'totalPurchases' | 'totalOrders' | 'points' | 'credit'>): Promise<Customer> => {
    const created = await api.customers.create({
      name: c.name, phone: c.phone, email: c.email,
      address: c.address, notes: c.notes,
    });
    const cust = toCustomer(created);
    setCustomers(prev => [...prev, cust]);
    return cust;
  };

  const updateCustomer = async (id: string, c: Partial<Customer>) => {
    const updated = await api.customers.update(id, {
      name: c.name, phone: c.phone, email: c.email,
      address: c.address, notes: c.notes,
      totalPurchases: c.totalPurchases, totalOrders: c.totalOrders,
      points: c.points, credit: c.credit, lastVisit: c.lastVisit,
    });
    setCustomers(prev => prev.map(x => x.id === id ? toCustomer(updated) : x));
  };

  // ── Expenses ─────────────────────────────────────────────────────────────
  const addExpense = async (e: Omit<Expense, 'id'>) => {
    const created = await api.expenses.create({
      category: e.category, amount: e.amount,
      description: e.description, date: e.date, isRecurring: e.isRecurring,
    });
    setExpenses(prev => [...prev, toExpense(created)]);
  };

  // ── Derived stats ────────────────────────────────────────────────────────
  const today          = new Date().toDateString();
  const todayOrdList   = orders.filter(o => o.status === 'completed' && new Date(o.createdAt).toDateString() === today);
  const todaySales     = todayOrdList.reduce((s, o) => s + o.total, 0);
  const todayOrders    = todayOrdList.length;
  const todayProfit    = todayOrdList.reduce((s, o) => s + o.items.reduce((p, i) => p + (i.product.price - i.product.purchasePrice) * i.quantity, 0), 0);

  return (
    <DataContext.Provider value={{
      products, orders, customers, expenses, isLoading, refresh,
      addProduct, updateProduct, deleteProduct,
      addOrder, addCustomer, updateCustomer, addExpense,
      todaySales, todayOrders, todayProfit,
    }}>
      {children}
    </DataContext.Provider>
  );
}

export const useData = () => useContext(DataContext);
