import { pgTable, text, numeric, integer, timestamp, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { storesTable } from "./stores";

export const customersTable = pgTable("customers", {
  id:             uuid("id").primaryKey().defaultRandom(),
  storeId:        uuid("store_id").notNull().references(() => storesTable.id, { onDelete: "cascade" }),
  name:           text("name").notNull(),
  phone:          text("phone").notNull(),
  email:          text("email"),
  address:        text("address"),
  notes:          text("notes"),
  totalPurchases: numeric("total_purchases", { precision: 14, scale: 2 }).notNull().default("0"),
  totalOrders:    integer("total_orders").notNull().default(0),
  points:         integer("points").notNull().default(0),
  credit:         numeric("credit", { precision: 12, scale: 2 }).notNull().default("0"),
  lastVisit:      timestamp("last_visit"),
  createdAt:      timestamp("created_at").notNull().defaultNow(),
});

export const insertCustomerSchema = createInsertSchema(customersTable).omit({ id: true, createdAt: true });
export const selectCustomerSchema = createSelectSchema(customersTable);
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;
export type Customer = typeof customersTable.$inferSelect;
