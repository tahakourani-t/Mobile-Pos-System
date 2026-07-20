import { pgTable, text, numeric, integer, boolean, timestamp, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { storesTable } from "./stores";

export const productsTable = pgTable("products", {
  id:            uuid("id").primaryKey().defaultRandom(),
  storeId:       uuid("store_id").notNull().references(() => storesTable.id, { onDelete: "cascade" }),
  name:          text("name").notNull(),
  nameAr:        text("name_ar"),
  description:   text("description"),
  descriptionAr: text("description_ar"),
  price:         numeric("price", { precision: 12, scale: 2 }).notNull(),
  purchasePrice: numeric("purchase_price", { precision: 12, scale: 2 }).notNull().default("0"),
  sku:           text("sku").notNull().default(""),
  barcode:       text("barcode"),
  category:      text("category").notNull().default("Other"),
  stock:         integer("stock").notNull().default(0),
  unit:          text("unit").notNull().default("piece"),
  imageUrl:      text("image_url"),
  isActive:      boolean("is_active").notNull().default(true),
  lowStockAlert: integer("low_stock_alert").notNull().default(5),
  createdAt:     timestamp("created_at").notNull().defaultNow(),
  updatedAt:     timestamp("updated_at").notNull().defaultNow(),
});

export const insertProductSchema = createInsertSchema(productsTable).omit({ id: true, createdAt: true, updatedAt: true });
export const selectProductSchema = createSelectSchema(productsTable);
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof productsTable.$inferSelect;
