import { pgTable, text, numeric, integer, timestamp, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { storesTable } from "./stores";
import { customersTable } from "./customers";

export const ordersTable = pgTable("orders", {
  id:            uuid("id").primaryKey().defaultRandom(),
  storeId:       uuid("store_id").notNull().references(() => storesTable.id, { onDelete: "cascade" }),
  orderNumber:   text("order_number").notNull(),
  customerId:    uuid("customer_id").references(() => customersTable.id, { onDelete: "set null" }),
  customerName:  text("customer_name"),
  cashier:       text("cashier").notNull(),
  status:        text("status").notNull().default("completed"),  // 'completed' | 'held' | 'refunded' | 'cancelled'
  subtotal:      numeric("subtotal",       { precision: 14, scale: 2 }).notNull(),
  discountAmount:numeric("discount_amount",{ precision: 14, scale: 2 }).notNull().default("0"),
  taxAmount:     numeric("tax_amount",     { precision: 14, scale: 2 }).notNull().default("0"),
  total:         numeric("total",          { precision: 14, scale: 2 }).notNull(),
  paymentMethod: text("payment_method").notNull().default("cash"), // 'cash' | 'card' | 'custom'
  cashReceived:  numeric("cash_received",  { precision: 14, scale: 2 }),
  change:        numeric("change",         { precision: 14, scale: 2 }),
  note:          text("note"),
  createdAt:     timestamp("created_at").notNull().defaultNow(),
});

/** Line items are stored as JSONB for simplicity and historical accuracy */
export const orderItemsTable = pgTable("order_items", {
  id:            uuid("id").primaryKey().defaultRandom(),
  orderId:       uuid("order_id").notNull().references(() => ordersTable.id, { onDelete: "cascade" }),
  storeId:       uuid("store_id").notNull().references(() => storesTable.id, { onDelete: "cascade" }),
  productId:     uuid("product_id").notNull(),   // no FK — product may be deleted
  productName:   text("product_name").notNull(),
  productNameAr: text("product_name_ar"),
  sku:           text("sku").notNull().default(""),
  quantity:      integer("quantity").notNull(),
  unitPrice:     numeric("unit_price",     { precision: 12, scale: 2 }).notNull(),
  purchasePrice: numeric("purchase_price", { precision: 12, scale: 2 }).notNull().default("0"),
  discount:      numeric("discount",       { precision: 12, scale: 2 }).notNull().default("0"),
  lineTotal:     numeric("line_total",     { precision: 14, scale: 2 }).notNull(),
});

export const insertOrderSchema     = createInsertSchema(ordersTable).omit({ id: true, createdAt: true });
export const insertOrderItemSchema = createInsertSchema(orderItemsTable).omit({ id: true });
export const selectOrderSchema     = createSelectSchema(ordersTable);
export type InsertOrder     = z.infer<typeof insertOrderSchema>;
export type InsertOrderItem = z.infer<typeof insertOrderItemSchema>;
export type Order     = typeof ordersTable.$inferSelect;
export type OrderItem = typeof orderItemsTable.$inferSelect;
