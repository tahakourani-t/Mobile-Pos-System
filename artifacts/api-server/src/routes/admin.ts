import { Router } from "express";
import { db } from "@workspace/db";
import { storesTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { signToken, verifyToken, now } from "../lib/auth.js";

const ADMIN_EMAIL = process.env["ADMIN_EMAIL"] ?? "tahakourani5@gmail.com";
const ADMIN_PIN   = process.env["ADMIN_PIN"]   ?? "2006";

const router = Router();

function requireAdmin(req: any, res: any, next: any) {
  const auth = req.headers["authorization"];
  if (!auth?.startsWith("Bearer ")) { res.status(401).json({ error: "Unauthorized" }); return; }
  try {
    const payload = verifyToken(auth.slice(7)) as any;
    if (payload.role !== "superadmin") { res.status(403).json({ error: "Forbidden" }); return; }
    req.adminUser = payload;
    next();
  } catch { res.status(401).json({ error: "Invalid token" }); }
}

/** POST /api/admin/auth — verify admin email+PIN, return admin JWT */
router.post("/auth", (req, res) => {
  const { email, pin } = req.body as { email: string; pin: string };
  if (!email || !pin || email !== ADMIN_EMAIL || pin !== ADMIN_PIN) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }
  const token = signToken({ userId: "superadmin", storeId: "admin", role: "superadmin", name: "Admin" });
  res.json({ token, role: "superadmin" });
});

/** GET /api/admin/stores — list all stores with plan info */
router.get("/stores", requireAdmin, async (_req, res) => {
  try {
    const stores = await db.select().from(storesTable);
    res.json(stores);
  } catch (err) { res.status(500).json({ error: String(err) }); }
});

/** POST /api/admin/stores/:id/activate — set planExpiry to now + duration */
router.post("/stores/:id/activate", requireAdmin, async (req, res) => {
  try {
    const { duration } = req.body as { duration: "1month" | "1year" };
    const expiry = new Date();
    if (duration === "1year") {
      expiry.setFullYear(expiry.getFullYear() + 1);
    } else {
      expiry.setMonth(expiry.getMonth() + 1);
    }
    await db.update(storesTable)
      .set({ isActive: true, planExpiry: expiry.toISOString(), updatedAt: now() })
      .where(eq(storesTable.id, req.params.id!));
    const store = await db.select().from(storesTable).where(eq(storesTable.id, req.params.id!)).get();
    res.json(store);
  } catch (err) { res.status(500).json({ error: String(err) }); }
});

/** POST /api/admin/stores/:id/deactivate — block the store */
router.post("/stores/:id/deactivate", requireAdmin, async (req, res) => {
  try {
    await db.update(storesTable)
      .set({ isActive: false, planExpiry: null, updatedAt: now() })
      .where(eq(storesTable.id, req.params.id!));
    const store = await db.select().from(storesTable).where(eq(storesTable.id, req.params.id!)).get();
    res.json(store);
  } catch (err) { res.status(500).json({ error: String(err) }); }
});

export default router;
