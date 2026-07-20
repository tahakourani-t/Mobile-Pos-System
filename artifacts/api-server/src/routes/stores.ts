import { Router } from "express";
import { db } from "@workspace/db";
import { storesTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth.js";
import { now } from "../lib/auth.js";

const router = Router();
router.use(requireAuth);

router.get("/:id", async (req, res) => {
  try {
    const store = await db.select().from(storesTable).where(eq(storesTable.id, req.params.id!)).get();
    if (!store) { res.status(404).json({ error: "Not found" }); return; }
    if (store.id !== req.user!.storeId) { res.status(403).json({ error: "Forbidden" }); return; }
    res.json(store);
  } catch (err) { res.status(500).json({ error: String(err) }); }
});

router.put("/:id", async (req, res) => {
  try {
    if (req.params.id !== req.user!.storeId) { res.status(403).json({ error: "Forbidden" }); return; }
    const { name, address, phone, email, vatNumber, currency, taxRate, language, theme, logoUrl } = req.body;
    await db.update(storesTable)
      .set({ name, address, phone, email, vatNumber, currency, taxRate, language, theme, logoUrl, updatedAt: now() })
      .where(eq(storesTable.id, req.params.id!));
    const store = await db.select().from(storesTable).where(eq(storesTable.id, req.params.id!)).get();
    res.json(store);
  } catch (err) { res.status(500).json({ error: String(err) }); }
});

export default router;
