import jwt from "jsonwebtoken";
import { scryptSync, randomBytes, timingSafeEqual } from "node:crypto";

const JWT_SECRET = process.env["SESSION_SECRET"] ?? "pos-dev-secret-change-in-production";
const JWT_EXPIRES = "7d";

export interface JwtPayload {
  userId: string;
  storeId: string;
  role: string;
  name: string;
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, JWT_SECRET) as JwtPayload;
}

export function now(): string {
  return new Date().toISOString();
}

export function genId(): string {
  return crypto.randomUUID();
}

/** Hash a PIN using scrypt (Node.js built-in) */
export function hashPin(pin: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(pin, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

/** Verify a PIN against a stored hash */
export function verifyPin(pin: string, stored: string): boolean {
  try {
    const [salt, hash] = stored.split(":");
    if (!salt || !hash) return false;
    const hashBuf = Buffer.from(hash, "hex");
    const derived = scryptSync(pin, salt, 64);
    return timingSafeEqual(derived, hashBuf);
  } catch {
    return false;
  }
}
