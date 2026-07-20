import { pgTable, text, boolean, timestamp, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { storesTable } from "./stores";

export const notificationsTable = pgTable("notifications", {
  id:        uuid("id").primaryKey().defaultRandom(),
  storeId:   uuid("store_id").notNull().references(() => storesTable.id, { onDelete: "cascade" }),
  type:      text("type").notNull(),   // 'new_order' | 'low_stock' | 'employee_activity' | 'new_customer' | 'system' | 'daily_summary'
  title:     text("title").notNull(),
  body:      text("body").notNull(),
  read:      boolean("read").notNull().default(false),
  link:      text("link"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertNotificationSchema = createInsertSchema(notificationsTable).omit({ id: true, createdAt: true });
export const selectNotificationSchema = createSelectSchema(notificationsTable);
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notificationsTable.$inferSelect;
