import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Product, Order, Customer, Expense } from '@/types';
import { MOCK_PRODUCTS, MOCK_ORDERS, MOCK_CUSTOMERS, MOCK_EXPENSES, generateId } from '@/constants/mockData';

interface DataContextType {
  products: Product[];
  orders: Order[];
  customers: Customer[];
  expenses: Expense[];
  isLoading: boolean;
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
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [prodVal, ordVal, custVal, expVal] = await Promise.all([
        AsyncStorage.getItem('products'),
        AsyncStorage.getItem('orders'),
        AsyncStorage.getItem('customers'),
        AsyncStorage.getItem('expenses'),
      ]);
      setProducts(prodVal ? JSON.parse(prodVal) : MOCK_PRODUCTS);
      setOrders(ordVal ? JSON.parse(ordVal) : MOCK_ORDERS);
      setCustomers(custVal ? JSON.parse(custVal) : MOCK_CUSTOMERS);
      setExpenses(expVal ? JSON.parse(expVal) : MOCK_EXPENSES);

      if (!prodVal) await AsyncStorage.setItem('products', JSON.stringify(MOCK_PRODUCTS));
      if (!ordVal) await AsyncStorage.setItem('orders', JSON.stringify(MOCK_ORDERS));
      if (!custVal) await AsyncStorage.setItem('customers', JSON.stringify(MOCK_CUSTOMERS));
      if (!expVal) await AsyncStorage.setItem('expenses', JSON.stringify(MOCK_EXPENSES));

      setIsLoading(false);
    })();
  }, []);

  const saveProducts = async (p: Product[]) => { setProducts(p); await AsyncStorage.setItem('products', JSON.stringify(p)); };
  const saveOrders = async (o: Order[]) => { setOrders(o); await AsyncStorage.setItem('orders', JSON.stringify(o)); };
  const saveCustomers = async (c: Customer[]) => { setCustomers(c); await AsyncStorage.setItem('customers', JSON.stringify(c)); };
  const saveExpenses = async (e: Expense[]) => { setExpenses(e); await AsyncStorage.setItem('expenses', JSON.stringify(e)); };

  const addProduct = async (p: Omit<Product, 'id' | 'createdAt'>): Promise<Product> => {
    const newP: Product = { ...p, id: generateId(), createdAt: new Date().toISOString() };
    await saveProducts([...products, newP]);
    return newP;
  };

  const updateProduct = async (id: string, p: Partial<Product>) => {
    await saveProducts(products.map(x => x.id === id ? { ...x, ...p } : x));
  };

  const deleteProduct = async (id: string) => {
    await saveProducts(products.filter(x => x.id !== id));
  };

  const addOrder = async (o: Omit<Order, 'id' | 'createdAt' | 'orderNumber'>): Promise<Order> => {
    const num = (orders.length + 1).toString().padStart(4, '0');
    const newO: Order = { ...o, id: generateId(), orderNumber: `#${num}`, createdAt: new Date().toISOString() };
    const updated = [newO, ...orders];
    await saveOrders(updated);
    return newO;
  };

  const addCustomer = async (c: Omit<Customer, 'id' | 'createdAt' | 'totalPurchases' | 'totalOrders' | 'points' | 'credit'>): Promise<Customer> => {
    const newC: Customer = { ...c, id: generateId(), totalPurchases: 0, totalOrders: 0, points: 0, credit: 0, createdAt: new Date().toISOString() };
    await saveCustomers([...customers, newC]);
    return newC;
  };

  const updateCustomer = async (id: string, c: Partial<Customer>) => {
    await saveCustomers(customers.map(x => x.id === id ? { ...x, ...c } : x));
  };

  const addExpense = async (e: Omit<Expense, 'id'>) => {
    await saveExpenses([...expenses, { ...e, id: generateId() }]);
  };

  const today = new Date().toDateString();
  const todayOrders = orders.filter(o => o.status === 'completed' && new Date(o.createdAt).toDateString() === today);
  const todaySales = todayOrders.reduce((s, o) => s + o.total, 0);
  const todayProfit = todayOrders.reduce((s, o) => s + o.items.reduce((p, i) => p + (i.product.price - i.product.purchasePrice) * i.quantity, 0), 0);

  return (
    <DataContext.Provider value={{ products, orders, customers, expenses, isLoading, addProduct, updateProduct, deleteProduct, addOrder, addCustomer, updateCustomer, addExpense, todaySales, todayOrders: todayOrders.length, todayProfit }}>
      {children}
    </DataContext.Provider>
  );
}

export const useData = () => useContext(DataContext);
