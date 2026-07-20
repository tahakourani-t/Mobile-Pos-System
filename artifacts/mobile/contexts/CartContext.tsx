import React, { createContext, useContext, useState } from 'react';
import * as Haptics from 'expo-haptics';
import type { CartItem, Product, Customer, HeldOrder } from '@/types';
import { generateId } from '@/constants/mockData';

interface CartContextType {
  items: CartItem[];
  addItem: (product: Product, qty?: number) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, qty: number) => void;
  discountPercent: number;
  setDiscountPercent: (d: number) => void;
  taxRate: number;
  setTaxRate: (t: number) => void;
  selectedCustomer: Customer | null;
  setSelectedCustomer: (c: Customer | null) => void;
  heldOrders: HeldOrder[];
  holdOrder: (note?: string) => void;
  resumeOrder: (id: string) => void;
  deleteHeldOrder: (id: string) => void;
  clearCart: () => void;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  total: number;
  itemCount: number;
}

const CartContext = createContext<CartContextType>({} as CartContextType);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [discountPercent, setDiscountPercent] = useState(0);
  const [taxRate, setTaxRate] = useState(15);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [heldOrders, setHeldOrders] = useState<HeldOrder[]>([]);

  const addItem = (product: Product, qty = 1) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setItems(prev => {
      const existing = prev.find(i => i.product.id === product.id);
      if (existing) {
        return prev.map(i => i.product.id === product.id ? { ...i, quantity: i.quantity + qty } : i);
      }
      return [...prev, { product, quantity: qty, discount: 0 }];
    });
  };

  const removeItem = (productId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setItems(prev => prev.filter(i => i.product.id !== productId));
  };

  const updateQuantity = (productId: string, qty: number) => {
    if (qty <= 0) { removeItem(productId); return; }
    setItems(prev => prev.map(i => i.product.id === productId ? { ...i, quantity: qty } : i));
  };

  const clearCart = () => {
    setItems([]);
    setDiscountPercent(0);
    setSelectedCustomer(null);
  };

  const holdOrder = (note?: string) => {
    if (items.length === 0) return;
    const held: HeldOrder = { id: generateId(), items: [...items], note, createdAt: new Date().toISOString() };
    setHeldOrders(prev => [held, ...prev]);
    clearCart();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const resumeOrder = (id: string) => {
    const order = heldOrders.find(h => h.id === id);
    if (!order) return;
    setItems(order.items);
    setHeldOrders(prev => prev.filter(h => h.id !== id));
  };

  const deleteHeldOrder = (id: string) => {
    setHeldOrders(prev => prev.filter(h => h.id !== id));
  };

  const subtotal = items.reduce((s, i) => s + i.product.price * i.quantity, 0);
  const discountAmount = subtotal * (discountPercent / 100);
  const taxableAmount = subtotal - discountAmount;
  const taxAmount = taxableAmount * (taxRate / 100);
  const total = taxableAmount + taxAmount;
  const itemCount = items.reduce((s, i) => s + i.quantity, 0);

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, updateQuantity, discountPercent, setDiscountPercent, taxRate, setTaxRate, selectedCustomer, setSelectedCustomer, heldOrders, holdOrder, resumeOrder, deleteHeldOrder, clearCart, subtotal, discountAmount, taxAmount, total, itemCount }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);
