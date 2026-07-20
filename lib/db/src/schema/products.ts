import { sqliteTable, text, real, integer } from "drizzle-orm/sqlite-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { storesTable } from "./stores";

export const productsTable = sqliteTable("products", {
  id:            text("id").primaryKey(),
  storeId:       text("store_id").notNull().references(() => storesTable.id, { onDelete: "cascade" }),
  name:          text("name").notNull(),
  nameAr:        text("name_ar"),
  description:   text("description"),
  descriptionAr: text("description_ar"),
  price:         real("price").notNull(),
  purchasePrice: real("purchase_price").notNull().default(0),
  sku:           text("sku").notNull().default(""),
  barcode:       text("barcode"),
  category:      text("category").notNull().default("Other"),
  stock:         integer("stock").notNull().default(0),
  unit:          text("unit").notNull().default("piece"),
  imageUrl:      text("image_url"),
  isActive:      integer("is_active", { mode: "boolean" }).notNull().default(true),
  lowStockAlert: integer("low_stock_alert").notNull().default(5),
  createdAt:     text("created_at").notNull(),
  updatedAt:     text("updated_at").notNull(),
});

export const insertProductSchema = createInsertSchema(productsTable).omit({ createdAt: true, updatedAt: true });
export const selectProductSchema = createSelectSchema(productsTable);
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof productsTable.$inferSelect;
