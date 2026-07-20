import { pgTable, text, numeric, boolean, timestamp, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { storesTable } from "./stores";

export const expensesTable = pgTable("expenses", {
  id:          uuid("id").primaryKey().defaultRandom(),
  storeId:     uuid("store_id").notNull().references(() => storesTable.id, { onDelete: "cascade" }),
  category:    text("category").notNull(),
  amount:      numeric("amount", { precision: 14, scale: 2 }).notNull(),
  description: text("description"),
  date:        timestamp("date").notNull().defaultNow(),
  isRecurring: boolean("is_recurring").notNull().default(false),
  createdAt:   timestamp("created_at").notNull().defaultNow(),
});

export const insertExpenseSchema = createInsertSchema(expensesTable).omit({ id: true, createdAt: true });
export const selectExpenseSchema = createSelectSchema(expensesTable);
export type InsertExpense = z.infer<typeof insertExpenseSchema>;
export type Expense = typeof expensesTable.$inferSelect;
