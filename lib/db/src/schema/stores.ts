import { sqliteTable, text, real, integer } from "drizzle-orm/sqlite-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const storesTable = sqliteTable("stores", {
  id:         text("id").primaryKey(),
  name:       text("name").notNull(),
  nameAr:     text("name_ar"),
  address:    text("address"),
  phone:      text("phone"),
  email:      text("email"),
  logoUrl:    text("logo_url"),
  vatNumber:  text("vat_number"),
  currency:   text("currency").notNull().default("LBP"),
  taxRate:    real("tax_rate").notNull().default(0),
  language:   text("language").notNull().default("en"),
  theme:      text("theme").notNull().default("light"),
  isActive:   integer("is_active", { mode: "boolean" }).notNull().default(true),
  planExpiry: text("plan_expiry"),
  createdAt:  text("created_at").notNull(),
  updatedAt:  text("updated_at").notNull(),
});

export const insertStoreSchema = createInsertSchema(storesTable).omit({ createdAt: true, updatedAt: true });
export const selectStoreSchema = createSelectSchema(storesTable);
export type InsertStore = z.infer<typeof insertStoreSchema>;
export type Store = typeof storesTable.$inferSelect;
