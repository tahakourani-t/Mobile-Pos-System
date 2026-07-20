import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import path from "path";
import * as schema from "./schema";

const dbPath = process.env["SQLITE_PATH"] ?? path.resolve("./pos.db");

const sqlite = new Database(dbPath);

// Enable WAL mode for better concurrent read performance
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

export const db = drizzle(sqlite, { schema });

// ── Auto-create all tables on first run ──────────────────────────────────────
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS stores (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    name_ar     TEXT,
    address     TEXT,
    phone       TEXT,
    email       TEXT,
    logo_url    TEXT,
    vat_number  TEXT,
    currency    TEXT NOT NULL DEFAULT 'LBP',
    tax_rate    REAL NOT NULL DEFAULT 0,
    language    TEXT NOT NULL DEFAULT 'en',
    theme       TEXT NOT NULL DEFAULT 'light',
    is_active   INTEGER NOT NULL DEFAULT 1,
    created_at  TEXT NOT NULL,
    updated_at  TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS users (
    id          TEXT PRIMARY KEY,
    store_id    TEXT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    name        TEXT NOT NULL,
    email       TEXT NOT NULL,
    role        TEXT NOT NULL DEFAULT 'cashier',
    pin_hash    TEXT,
    is_active   INTEGER NOT NULL DEFAULT 1,
    created_at  TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS categories (
    id          TEXT PRIMARY KEY,
    store_id    TEXT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    name        TEXT NOT NULL,
    name_ar     TEXT,
    color       TEXT,
    icon        TEXT,
    created_at  TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS products (
    id              TEXT PRIMARY KEY,
    store_id        TEXT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    name_ar         TEXT,
    description     TEXT,
    description_ar  TEXT,
    price           REAL NOT NULL,
    purchase_price  REAL NOT NULL DEFAULT 0,
    sku             TEXT NOT NULL DEFAULT '',
    barcode         TEXT,
    category        TEXT NOT NULL DEFAULT 'Other',
    stock           INTEGER NOT NULL DEFAULT 0,
    unit            TEXT NOT NULL DEFAULT 'piece',
    image_url       TEXT,
    is_active       INTEGER NOT NULL DEFAULT 1,
    low_stock_alert INTEGER NOT NULL DEFAULT 5,
    created_at      TEXT NOT NULL,
    updated_at      TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS customers (
    id               TEXT PRIMARY KEY,
    store_id         TEXT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    name             TEXT NOT NULL,
    phone            TEXT NOT NULL,
    email            TEXT,
    address          TEXT,
    notes            TEXT,
    total_purchases  REAL NOT NULL DEFAULT 0,
    total_orders     INTEGER NOT NULL DEFAULT 0,
    points           INTEGER NOT NULL DEFAULT 0,
    credit           REAL NOT NULL DEFAULT 0,
    last_visit       TEXT,
    created_at       TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS orders (
    id              TEXT PRIMARY KEY,
    store_id        TEXT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    order_number    TEXT NOT NULL,
    customer_id     TEXT REFERENCES customers(id) ON DELETE SET NULL,
    customer_name   TEXT,
    cashier         TEXT NOT NULL,
    status          TEXT NOT NULL DEFAULT 'completed',
    subtotal        REAL NOT NULL,
    discount_amount REAL NOT NULL DEFAULT 0,
    tax_amount      REAL NOT NULL DEFAULT 0,
    total           REAL NOT NULL,
    payment_method  TEXT NOT NULL DEFAULT 'cash',
    cash_received   REAL,
    change          REAL,
    note            TEXT,
    created_at      TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS order_items (
    id              TEXT PRIMARY KEY,
    order_id        TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    store_id        TEXT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    product_id      TEXT NOT NULL,
    product_name    TEXT NOT NULL,
    product_name_ar TEXT,
    sku             TEXT NOT NULL DEFAULT '',
    quantity        INTEGER NOT NULL,
    unit_price      REAL NOT NULL,
    purchase_price  REAL NOT NULL DEFAULT 0,
    discount        REAL NOT NULL DEFAULT 0,
    line_total      REAL NOT NULL
  );

  CREATE TABLE IF NOT EXISTS expenses (
    id           TEXT PRIMARY KEY,
    store_id     TEXT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    category     TEXT NOT NULL,
    amount       REAL NOT NULL,
    description  TEXT,
    date         TEXT NOT NULL,
    is_recurring INTEGER NOT NULL DEFAULT 0,
    created_at   TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id         TEXT PRIMARY KEY,
    store_id   TEXT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    type       TEXT NOT NULL,
    title      TEXT NOT NULL,
    body       TEXT NOT NULL,
    read       INTEGER NOT NULL DEFAULT 0,
    link       TEXT,
    created_at TEXT NOT NULL
  );
`);

export * from "./schema";
