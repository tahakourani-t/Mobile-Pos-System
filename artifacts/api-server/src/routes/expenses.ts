import { Router } from "express";
import { db } from "@workspace/db";
import { expensesTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth.js";
import { genId, now } from "../lib/auth.js";

const router = Router();
router.use(requireAuth);

router.get("/", async (req, res) => {
  try {
    const rows = await db.select().from(expensesTable)
      .where(eq(expensesTable.storeId, req.user!.storeId));
    res.json(rows);
  } catch (err) { res.status(500).json({ error: String(err) }); }
});

router.post("/", async (req, res) => {
  try {
    const id = genId();
    const ts = now();
    const { category, amount, description, date, isRecurring } = req.body;
    await db.insert(expensesTable).values({
      id, storeId: req.user!.storeId,
      category, amount: Number(amount), description,
      date: date ?? ts, isRecurring: Boolean(isRecurring),
      createdAt: ts,
    });
    const row = await db.select().from(expensesTable).where(eq(expensesTable.id, id)).get();
    res.status(201).json(row);
  } catch (err) { res.status(500).json({ error: String(err) }); }
});

export default router;
