import { Router } from "express";
import { db } from "@workspace/db";
import { storesTable, usersTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { signToken, genId, now, hashPin, verifyPin } from "../lib/auth.js";

const router = Router();

/**
 * POST /api/auth/setup
 * First-time store setup: creates store + admin user.
 */
router.post("/setup", async (req, res) => {
  try {
    const { storeName, phone, email, address, currency, logoUri, language, pin } = req.body as {
      storeName: string; phone: string; email?: string; address?: string;
      currency?: string; logoUri?: string; language?: string; pin: string;
    };

    if (!storeName || !pin || pin.length !== 4) {
      res.status(400).json({ error: "storeName and a 4-digit pin are required" });
      return;
    }

    const storeId   = genId();
    const userId    = genId();
    const ts        = now();
    const pinHashed = hashPin(pin);

    await db.insert(storesTable).values({
      id: storeId,
      name: storeName.trim(),
      phone: phone?.trim(),
      email: email?.trim(),
      address: address?.trim(),
      logoUrl: logoUri,
      currency: currency ?? "LBP",
      language: (language ?? "en") as "en" | "ar",
      createdAt: ts,
      updatedAt: ts,
    });

    await db.insert(usersTable).values({
      id: userId,
      storeId,
      name: storeName.trim(),
      email: email?.trim() ?? "",
      role: "admin",
      pinHash: pinHashed,
      createdAt: ts,
    });

    const store = await db.select().from(storesTable).where(eq(storesTable.id, storeId)).get();
    const user  = await db.select().from(usersTable).where(eq(usersTable.id, userId)).get();

    const token = signToken({ userId, storeId, role: "admin", name: storeName.trim() });
    res.status(201).json({ token, user: { ...user, pinHash: undefined }, store });
  } catch (err) {
    res.status(500).json({ error: "Setup failed", detail: String(err) });
  }
});

/**
 * POST /api/auth/login
 * Login with email + PIN — finds the user across all stores automatically.
 */
router.post("/login", async (req, res) => {
  try {
    const { email, pin } = req.body as { email: string; pin: string };

    if (!email || !pin) {
      res.status(400).json({ error: "email and pin are required" });
      return;
    }

    // Find user by email (case-insensitive)
    const users = await db
      .select()
      .from(usersTable)
      .where(and(eq(usersTable.isActive, true)));

    // Find the user with matching email + PIN
    let matchedUser = null;
    for (const u of users) {
      if (u.email.toLowerCase() === email.toLowerCase() && u.pinHash && verifyPin(pin, u.pinHash)) {
        matchedUser = u;
        break;
      }
    }

    if (!matchedUser) {
      res.status(401).json({ error: "Incorrect email or PIN" });
      return;
    }

    const store = await db.select().from(storesTable).where(eq(storesTable.id, matchedUser.storeId)).get();
    if (!store) { res.status(404).json({ error: "Store not found" }); return; }

    if (!store.isActive) {
      res.status(403).json({ error: "This store has been deactivated. Contact admin." });
      return;
    }

    const token = signToken({
      userId: matchedUser.id,
      storeId: matchedUser.storeId,
      role: matchedUser.role,
      name: matchedUser.name,
    });

    res.json({ token, user: { ...matchedUser, pinHash: undefined }, store });
  } catch (err) {
    res.status(500).json({ error: "Login failed", detail: String(err) });
  }
});

/**
 * GET /api/auth/stores
 * Returns store profiles (id + name + logoUrl) — public, for the store picker.
 */
router.get("/stores", async (_req, res) => {
  try {
    const stores = await db
      .select({ id: storesTable.id, name: storesTable.name, logoUrl: storesTable.logoUrl, createdAt: storesTable.createdAt })
      .from(storesTable)
      .where(eq(storesTable.isActive, true));
    res.json(stores);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

export default router;
