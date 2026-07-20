import { Router } from "express";
import { db } from "@workspace/db";
import { productsTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth.js";
import { genId, now } from "../lib/auth.js";

const router = Router();
router.use(requireAuth);

router.get("/", async (req, res) => {
  try {
    const rows = await db.select().from(productsTable)
      .where(eq(productsTable.storeId, req.user!.storeId));
    res.json(rows);
  } catch (err) { res.status(500).json({ error: String(err) }); }
});

router.post("/", async (req, res) => {
  try {
    const ts = now();
    const id = genId();
    const { name, nameAr, description, price, purchasePrice, sku, barcode, category, stock, unit, imageUrl, isActive, lowStockAlert } = req.body;
    await db.insert(productsTable).values({
      id, storeId: req.user!.storeId,
      name, nameAr, description,
      price: Number(price),
      purchasePrice: Number(purchasePrice ?? 0),
      sku: sku ?? "", barcode, category: category ?? "Other",
      stock: Number(stock ?? 0), unit: unit ?? "piece",
      imageUrl, isActive: isActive !== false, lowStockAlert: Number(lowStockAlert ?? 5),
      createdAt: ts, updatedAt: ts,
    });
    const row = await db.select().from(productsTable).where(eq(productsTable.id, id)).get();
    res.status(201).json(row);
  } catch (err) { res.status(500).json({ error: String(err) }); }
});

router.put("/:id", async (req, res) => {
  try {
    const existing = await db.select().from(productsTable)
      .where(and(eq(productsTable.id, req.params.id!), eq(productsTable.storeId, req.user!.storeId))).get();
    if (!existing) { res.status(404).json({ error: "Not found" }); return; }

    const { name, nameAr, description, price, purchasePrice, sku, barcode, category, stock, unit, imageUrl, isActive, lowStockAlert } = req.body;
    await db.update(productsTable).set({
      name, nameAr, description,
      price: price !== undefined ? Number(price) : existing.price,
      purchasePrice: purchasePrice !== undefined ? Number(purchasePrice) : existing.purchasePrice,
      sku, barcode, category, stock: stock !== undefined ? Number(stock) : existing.stock,
      unit, imageUrl, isActive, lowStockAlert: lowStockAlert !== undefined ? Number(lowStockAlert) : existing.lowStockAlert,
      updatedAt: now(),
    }).where(eq(productsTable.id, req.params.id!));
    const row = await db.select().from(productsTable).where(eq(productsTable.id, req.params.id!)).get();
    res.json(row);
  } catch (err) { res.status(500).json({ error: String(err) }); }
});

router.delete("/:id", async (req, res) => {
  try {
    const existing = await db.select().from(productsTable)
      .where(and(eq(productsTable.id, req.params.id!), eq(productsTable.storeId, req.user!.storeId))).get();
    if (!existing) { res.status(404).json({ error: "Not found" }); return; }
    await db.delete(productsTable).where(eq(productsTable.id, req.params.id!));
    res.status(204).end();
  } catch (err) { res.status(500).json({ error: String(err) }); }
});

export default router;
