/**
 * Seed script — inserts the super-admin store + user if they don't already exist.
 * Run via: npx tsx src/scripts/seed-admin.ts
 * (The API server also calls this on startup via src/index.ts)
 */
import { db } from "@workspace/db";
import { storesTable, usersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { hashPin, genId, now } from "../lib/auth.js";

const ADMIN_EMAIL = "tahakourani5@gmail.com";
const ADMIN_PIN   = "2003";
const STORE_NAME  = "Saylora Admin";

export async function seedAdmin(): Promise<void> {
  // Check if admin user already exists
  const existing = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, ADMIN_EMAIL))
    .get();

  if (existing) {
    console.log("[seed] Admin user already exists — skipping.");
    return;
  }

  const storeId = genId();
  const userId  = genId();
  const ts      = now();

  await db.insert(storesTable).values({
    id:         storeId,
    name:       STORE_NAME,
    currency:   "USD",
    language:   "en",
    isVerified: true,   // pre-verified — no email check needed
    createdAt:  ts,
    updatedAt:  ts,
  });

  await db.insert(usersTable).values({
    id:       userId,
    storeId,
    name:     "Admin",
    email:    ADMIN_EMAIL,
    role:     "superadmin",
    pinHash:  hashPin(ADMIN_PIN),
    createdAt: ts,
  });

  console.log(`[seed] Admin created — email: ${ADMIN_EMAIL}`);
}
