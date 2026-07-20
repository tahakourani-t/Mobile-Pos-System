import { Router } from "express";
import { db } from "@workspace/db";
import { notificationsTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth.js";
import { genId, now } from "../lib/auth.js";

const router = Router();
router.use(requireAuth);

router.get("/", async (req, res) => {
  try {
    const rows = await db.select().from(notificationsTable)
      .where(eq(notificationsTable.storeId, req.user!.storeId));
    res.json(rows);
  } catch (err) { res.status(500).json({ error: String(err) }); }
});

router.post("/", async (req, res) => {
  try {
    const id = genId();
    const ts = now();
    const { type, title, body, link } = req.body;
    await db.insert(notificationsTable).values({
      id, storeId: req.user!.storeId,
      type, title, body, read: false, link, createdAt: ts,
    });
    const row = await db.select().from(notificationsTable).where(eq(notificationsTable.id, id)).get();
    res.status(201).json(row);
  } catch (err) { res.status(500).json({ error: String(err) }); }
});

router.patch("/read-all", async (req, res) => {
  try {
    await db.update(notificationsTable).set({ read: true })
      .where(eq(notificationsTable.storeId, req.user!.storeId));
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: String(err) }); }
});

router.patch("/:id/read", async (req, res) => {
  try {
    const existing = await db.select().from(notificationsTable)
      .where(and(eq(notificationsTable.id, req.params.id!), eq(notificationsTable.storeId, req.user!.storeId))).get();
    if (!existing) { res.status(404).json({ error: "Not found" }); return; }
    await db.update(notificationsTable).set({ read: true })
      .where(eq(notificationsTable.id, req.params.id!));
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: String(err) }); }
});

export default router;
