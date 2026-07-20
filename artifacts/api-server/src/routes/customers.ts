import { Router } from "express";
import { db } from "@workspace/db";
import { customersTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth.js";
import { genId, now } from "../lib/auth.js";

const router = Router();
router.use(requireAuth);

router.get("/", async (req, res) => {
  try {
    const rows = await db.select().from(customersTable)
      .where(eq(customersTable.storeId, req.user!.storeId));
    res.json(rows);
  } catch (err) { res.status(500).json({ error: String(err) }); }
});

router.post("/", async (req, res) => {
  try {
    const id = genId();
    const ts = now();
    const { name, phone, email, address, notes } = req.body;
    await db.insert(customersTable).values({
      id, storeId: req.user!.storeId,
      name, phone, email, address, notes,
      totalPurchases: 0, totalOrders: 0, points: 0, credit: 0,
      createdAt: ts,
    });
    const row = await db.select().from(customersTable).where(eq(customersTable.id, id)).get();
    res.status(201).json(row);
  } catch (err) { res.status(500).json({ error: String(err) }); }
});

router.put("/:id", async (req, res) => {
  try {
    const existing = await db.select().from(customersTable)
      .where(and(eq(customersTable.id, req.params.id!), eq(customersTable.storeId, req.user!.storeId))).get();
    if (!existing) { res.status(404).json({ error: "Not found" }); return; }

    const { name, phone, email, address, notes, totalPurchases, totalOrders, points, credit, lastVisit } = req.body;
    await db.update(customersTable).set({
      name, phone, email, address, notes,
      totalPurchases: totalPurchases !== undefined ? Number(totalPurchases) : existing.totalPurchases,
      totalOrders:    totalOrders    !== undefined ? Number(totalOrders)    : existing.totalOrders,
      points:         points         !== undefined ? Number(points)         : existing.points,
      credit:         credit         !== undefined ? Number(credit)         : existing.credit,
      lastVisit,
    }).where(eq(customersTable.id, req.params.id!));
    const row = await db.select().from(customersTable).where(eq(customersTable.id, req.params.id!)).get();
    res.json(row);
  } catch (err) { res.status(500).json({ error: String(err) }); }
});

export default router;
