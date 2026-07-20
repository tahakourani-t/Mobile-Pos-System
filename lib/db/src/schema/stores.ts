import { pgTable, text, numeric, integer, boolean, timestamp, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const storesTable = pgTable("stores", {
  id:         uuid("id").primaryKey().defaultRandom(),
  name:       text("name").notNull(),
  nameAr:     text("name_ar"),
  address:    text("address"),
  phone:      text("phone"),
  email:      text("email"),
  logoUrl:    text("logo_url"),
  vatNumber:  text("vat_number"),
  currency:   text("currency").notNull().default("LBP"),
  taxRate:    numeric("tax_rate", { precision: 5, scale: 2 }).notNull().default("0"),
  language:   text("language").notNull().default("en"),   // 'en' | 'ar'
  theme:      text("theme").notNull().default("light"),   // 'light' | 'dark' | 'blue' | 'system'
  isActive:   boolean("is_active").notNull().default(true),
  createdAt:  timestamp("created_at").notNull().defaultNow(),
  updatedAt:  timestamp("updated_at").notNull().defaultNow(),
});

export const insertStoreSchema = createInsertSchema(storesTable).omit({ id: true, createdAt: true, updatedAt: true });
export const selectStoreSchema = createSelectSchema(storesTable);
export type InsertStore = z.infer<typeof insertStoreSchema>;
export type Store = typeof storesTable.$inferSelect;
