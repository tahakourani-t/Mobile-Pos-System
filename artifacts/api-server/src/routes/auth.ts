import { Router } from "express";
import { db } from "@workspace/db";
import { storesTable, usersTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { signToken, genId, now, hashPin, verifyPin } from "../lib/auth.js";
import { sendVerificationEmail } from "../lib/email.js";
import { randomInt } from "node:crypto";

const router = Router();

/** Generate a 6-digit numeric OTP */
function genCode(): string {
  return String(randomInt(100000, 999999));
}

/**
 * POST /api/auth/setup
 * First-time store setup: creates store + admin user, then sends a verification email.
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

    // Verification code (30-minute expiry)
    const code       = genCode();
    const codeExpiry = new Date(Date.now() + 30 * 60 * 1000).toISOString();

    await db.insert(storesTable).values({
      id: storeId,
      name: storeName.trim(),
      phone: phone?.trim(),
      email: email?.trim(),
      address: address?.trim(),
      logoUrl: logoUri,
      currency: currency ?? "LBP",
      language: (language ?? "en") as "en" | "ar",
      isVerified: false,
      verificationCode: code,
      verificationCodeExpiry: codeExpiry,
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

    // Send verification email (best-effort — don't fail setup if SMTP is misconfigured)
    if (email?.trim()) {
      sendVerificationEmail({ to: email.trim(), storeName: storeName.trim(), code }).catch(
        (err) => console.error("[email] Failed to send verification email:", err),
      );
    }

    res.status(201).json({
      token,
      user: { ...user, pinHash: undefined },
      store: { ...store, verificationCode: undefined, verificationCodeExpiry: undefined },
      emailVerificationRequired: true,
    });
  } catch (err) {
    res.status(500).json({ error: "Setup failed", detail: String(err) });
  }
});

/**
 * POST /api/auth/verify-email
 * Verifies a store's email using the OTP sent at setup.
 * Body: { storeId, code }
 */
router.post("/verify-email", async (req, res) => {
  try {
    const { storeId, code } = req.body as { storeId: string; code: string };

    if (!storeId || !code) {
      res.status(400).json({ error: "storeId and code are required" });
      return;
    }

    const store = await db.select().from(storesTable).where(eq(storesTable.id, storeId)).get();
    if (!store) {
      res.status(404).json({ error: "Store not found" });
      return;
    }

    if (store.isVerified) {
      res.json({ message: "Store is already verified" });
      return;
    }

    if (!store.verificationCode || store.verificationCode !== code) {
      res.status(400).json({ error: "Invalid verification code" });
      return;
    }

    if (store.verificationCodeExpiry && new Date(store.verificationCodeExpiry) < new Date()) {
      res.status(400).json({ error: "Verification code has expired. Please request a new one." });
      return;
    }

    await db
      .update(storesTable)
      .set({ isVerified: true, verificationCode: null, verificationCodeExpiry: null, updatedAt: now() })
      .where(eq(storesTable.id, storeId));

    res.json({ message: "Email verified successfully. You can now log in." });
  } catch (err) {
    res.status(500).json({ error: "Verification failed", detail: String(err) });
  }
});

/**
 * POST /api/auth/resend-verification
 * Resends the verification email for a store.
 * Body: { storeId }
 */
router.post("/resend-verification", async (req, res) => {
  try {
    const { storeId } = req.body as { storeId: string };

    if (!storeId) {
      res.status(400).json({ error: "storeId is required" });
      return;
    }

    const store = await db.select().from(storesTable).where(eq(storesTable.id, storeId)).get();
    if (!store) {
      res.status(404).json({ error: "Store not found" });
      return;
    }

    if (store.isVerified) {
      res.json({ message: "Store is already verified" });
      return;
    }

    if (!store.email) {
      res.status(400).json({ error: "No email address on file for this store" });
      return;
    }

    const code       = genCode();
    const codeExpiry = new Date(Date.now() + 30 * 60 * 1000).toISOString();

    await db
      .update(storesTable)
      .set({ verificationCode: code, verificationCodeExpiry: codeExpiry, updatedAt: now() })
      .where(eq(storesTable.id, storeId));

    sendVerificationEmail({ to: store.email, storeName: store.name, code }).catch(
      (err) => console.error("[email] Failed to resend verification email:", err),
    );

    res.json({ message: "Verification email resent" });
  } catch (err) {
    res.status(500).json({ error: "Resend failed", detail: String(err) });
  }
});

/**
 * POST /api/auth/login
 * Login with email + PIN — finds the user across all stores automatically.
 * Returns 403 with { error, emailVerificationRequired, storeId } if the store is unverified.
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

    // Block login until email is verified (skip check for superadmin role)
    if (!store.isVerified && matchedUser.role !== "superadmin") {
      res.status(403).json({
        error: "Please verify your email before logging in. Check your inbox for the verification code.",
        emailVerificationRequired: true,
        storeId: store.id,
      });
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
