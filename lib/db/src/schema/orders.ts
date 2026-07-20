import { sqliteTable, text, real, integer } from "drizzle-orm/sqlite-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { storesTable } from "./stores";
import { customersTable } from "./customers";

export const ordersTable = sqliteTable("orders", {
  id:             text("id").primaryKey(),
  storeId:        text("store_id").notNull().references(() => storesTable.id, { onDelete: "cascade" }),
  orderNumber:    text("order_number").notNull(),
  customerId:     text("customer_id").references(() => customersTable.id, { onDelete: "set null" }),
  customerName:   text("customer_name"),
  cashier:        text("cashier").notNull(),
  status:         text("status").notNull().default("completed"),
  subtotal:       real("subtotal").notNull(),
  discountAmount: real("discount_amount").notNull().default(0),
  taxAmount:      real("tax_amount").notNull().default(0),
  total:          real("total").notNull(),
  paymentMethod:  text("payment_method").notNull().default("cash"),
  cashReceived:   real("cash_received"),
  change:         real("change"),
  note:           text("note"),
  createdAt:      text("created_at").notNull(),
});

/** Line items stored as separate rows for reporting */
export const orderItemsTable = sqliteTable("order_items", {
  id:            text("id").primaryKey(),
  orderId:       text("order_id").notNull().references(() => ordersTable.id, { onDelete: "cascade" }),
  storeId:       text("store_id").notNull().references(() => storesTable.id, { onDelete: "cascade" }),
  productId:     text("product_id").notNull(),
  productName:   text("product_name").notNull(),
  productNameAr: text("product_name_ar"),
  sku:           text("sku").notNull().default(""),
  quantity:      integer("quantity").notNull(),
  unitPrice:     real("unit_price").notNull(),
  purchasePrice: real("purchase_price").notNull().default(0),
  discount:      real("discount").notNull().default(0),
  lineTotal:     real("line_total").notNull(),
});

export const insertOrderSchema     = createInsertSchema(ordersTable).omit({ createdAt: true });
export const insertOrderItemSchema = createInsertSchema(orderItemsTable);
export const selectOrderSchema     = createSelectSchema(ordersTable);
export type InsertOrder     = z.infer<typeof insertOrderSchema>;
export type InsertOrderItem = z.infer<typeof insertOrderItemSchema>;
export type Order     = typeof ordersTable.$inferSelect;
export type OrderItem = typeof orderItemsTable.$inferSelect;
