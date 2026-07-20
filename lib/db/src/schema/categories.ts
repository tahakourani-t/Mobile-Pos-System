import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { storesTable } from "./stores";

export const categoriesTable = pgTable("categories", {
  id:        uuid("id").primaryKey().defaultRandom(),
  storeId:   uuid("store_id").notNull().references(() => storesTable.id, { onDelete: "cascade" }),
  name:      text("name").notNull(),
  nameAr:    text("name_ar"),
  color:     text("color"),   // hex color for category chip
  icon:      text("icon"),    // Ionicons name
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertCategorySchema = createInsertSchema(categoriesTable).omit({ id: true, createdAt: true });
export const selectCategorySchema = createSelectSchema(categoriesTable);
export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type Category = typeof categoriesTable.$inferSelect;
