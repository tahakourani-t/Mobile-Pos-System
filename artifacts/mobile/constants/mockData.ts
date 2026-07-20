// Kept only for non-mock utilities still referenced across the app

export const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2, 5);

export const PRODUCT_CATEGORIES = ['All', 'Beverages', 'Food', 'Electronics', 'Clothing', 'Pharmacy', 'Other'];
