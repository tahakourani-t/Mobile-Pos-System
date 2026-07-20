import { sqliteTable, text } from "drizzle-orm/sqlite-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { storesTable } from "./stores";

export const categoriesTable = sqliteTable("categories", {
  id:        text("id").primaryKey(),
  storeId:   text("store_id").notNull().references(() => storesTable.id, { onDelete: "cascade" }),
  name:      text("name").notNull(),
  nameAr:    text("name_ar"),
  color:     text("color"),
  icon:      text("icon"),
  createdAt: text("created_at").notNull(),
});

export const insertCategorySchema = createInsertSchema(categoriesTable).omit({ createdAt: true });
export const selectCategorySchema = createSelectSchema(categoriesTable);
export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type Category = typeof categoriesTable.$inferSelect;
