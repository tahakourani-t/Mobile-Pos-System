import { sqliteTable, text, real, integer } from "drizzle-orm/sqlite-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { storesTable } from "./stores";

export const expensesTable = sqliteTable("expenses", {
  id:          text("id").primaryKey(),
  storeId:     text("store_id").notNull().references(() => storesTable.id, { onDelete: "cascade" }),
  category:    text("category").notNull(),
  amount:      real("amount").notNull(),
  description: text("description"),
  date:        text("date").notNull(),
  isRecurring: integer("is_recurring", { mode: "boolean" }).notNull().default(false),
  createdAt:   text("created_at").notNull(),
});

export const insertExpenseSchema = createInsertSchema(expensesTable).omit({ createdAt: true });
export const selectExpenseSchema = createSelectSchema(expensesTable);
export type InsertExpense = z.infer<typeof insertExpenseSchema>;
export type Expense = typeof expensesTable.$inferSelect;
