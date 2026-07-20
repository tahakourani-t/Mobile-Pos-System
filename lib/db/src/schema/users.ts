import { pgTable, text, boolean, timestamp, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { storesTable } from "./stores";

export const usersTable = pgTable("users", {
  id:         uuid("id").primaryKey().defaultRandom(),
  storeId:    uuid("store_id").notNull().references(() => storesTable.id, { onDelete: "cascade" }),
  name:       text("name").notNull(),
  email:      text("email").notNull(),
  role:       text("role").notNull().default("cashier"),  // 'admin' | 'manager' | 'cashier'
  pinHash:    text("pin_hash"),                           // bcrypt of the 4-digit PIN
  isActive:   boolean("is_active").notNull().default(true),
  createdAt:  timestamp("created_at").notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({ id: true, createdAt: true });
export const selectUserSchema = createSelectSchema(usersTable);
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
