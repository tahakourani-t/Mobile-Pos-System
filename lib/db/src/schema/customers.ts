import { sqliteTable, text, real, integer } from "drizzle-orm/sqlite-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { storesTable } from "./stores";

export const customersTable = sqliteTable("customers", {
  id:             text("id").primaryKey(),
  storeId:        text("store_id").notNull().references(() => storesTable.id, { onDelete: "cascade" }),
  name:           text("name").notNull(),
  phone:          text("phone").notNull(),
  email:          text("email"),
  address:        text("address"),
  notes:          text("notes"),
  totalPurchases: real("total_purchases").notNull().default(0),
  totalOrders:    integer("total_orders").notNull().default(0),
  points:         integer("points").notNull().default(0),
  credit:         real("credit").notNull().default(0),
  lastVisit:      text("last_visit"),
  createdAt:      text("created_at").notNull(),
});

export const insertCustomerSchema = createInsertSchema(customersTable).omit({ createdAt: true });
export const selectCustomerSchema = createSelectSchema(customersTable);
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;
export type Customer = typeof customersTable.$inferSelect;
