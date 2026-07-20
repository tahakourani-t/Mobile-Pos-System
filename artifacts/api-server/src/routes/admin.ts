import { Router } from "express";
import { db } from "@workspace/db";
import { storesTable, usersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { signToken, verifyToken, verifyPin, now } from "../lib/auth.js";
import { sendMail } from "../lib/email.js";

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

/**
 * POST /api/admin/auth
 * Verify admin credentials against the DB (superadmin role).
 */
router.post("/auth", async (req, res) => {
  const { email, pin } = req.body as { email: string; pin: string };
  if (!email || !pin) { res.status(400).json({ error: "email and pin are required" }); return; }

  try {
    // Look up users with superadmin role matching this email
    const allUsers = await db.select().from(usersTable);
    const adminUser = allUsers.find(
      u => u.email.toLowerCase() === email.toLowerCase() && u.role === "superadmin" && u.isActive,
    );

    if (!adminUser || !adminUser.pinHash || !verifyPin(pin, adminUser.pinHash)) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    const token = signToken({
      userId: adminUser.id,
      storeId: adminUser.storeId,
      role: "superadmin",
      name: adminUser.name,
    });
    res.json({ token, role: "superadmin" });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
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

/**
 * POST /api/admin/notify
 * Send an email notification to a store's email address.
 * Body: { storeId, message, subject? }
 */
router.post("/notify", requireAdmin, async (req, res) => {
  try {
    const { storeId, message, subject } = req.body as {
      storeId: string; message: string; subject?: string;
    };
    if (!storeId || !message) {
      res.status(400).json({ error: "storeId and message are required" });
      return;
    }

    const store = await db.select().from(storesTable).where(eq(storesTable.id, storeId)).get();
    if (!store) { res.status(404).json({ error: "Store not found" }); return; }
    if (!store.email) { res.status(400).json({ error: "This store has no email address" }); return; }

    const emailSubject = subject?.trim() || "Important notification from Saylora";
    const fromName = process.env["SMTP_FROM_NAME"] ?? "Saylora Admin";

    await sendMail({
      to: store.email,
      subject: emailSubject,
      html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/></head>
<body style="font-family:sans-serif;background:#f5f5f5;margin:0;padding:0;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0;">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0"
             style="background:#fff;border-radius:12px;padding:40px;box-shadow:0 2px 8px rgba(0,0,0,.08);">
        <tr><td align="center" style="padding-bottom:24px;">
          <h1 style="margin:0;font-size:22px;color:#1A56DB;">${fromName}</h1>
          <p style="margin:4px 0 0;color:#888;font-size:13px;">Store Notification</p>
        </td></tr>
        <tr><td style="color:#222;font-size:16px;line-height:1.7;padding-bottom:24px;">
          Dear <strong>${store.name}</strong>,<br/><br/>
          ${message.replace(/\n/g, "<br/>")}
        </td></tr>
        <tr><td style="color:#aaa;font-size:12px;border-top:1px solid #eee;padding-top:16px;">
          © ${new Date().getFullYear()} ${fromName}. This message was sent by your platform administrator.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
    });

    res.json({ ok: true, message: `Notification sent to ${store.email}` });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

export default router;
