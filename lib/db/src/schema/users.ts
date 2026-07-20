import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { storesTable } from "./stores";

export const usersTable = sqliteTable("users", {
  id:        text("id").primaryKey(),
  storeId:   text("store_id").notNull().references(() => storesTable.id, { onDelete: "cascade" }),
  name:      text("name").notNull(),
  email:     text("email").notNull(),
  role:      text("role").notNull().default("cashier"),  // 'admin' | 'manager' | 'cashier'
  pinHash:   text("pin_hash"),
  isActive:  integer("is_active", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").notNull(),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({ createdAt: true });
export const selectUserSchema = createSelectSchema(usersTable);
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
