# POS Mobile App

A full-stack Point-of-Sale system for small businesses, with a React Native / Expo mobile frontend and an Express API backend backed by SQLite.

## Architecture

| Layer | Tech | Notes |
|-------|------|-------|
| Mobile | Expo / React Native (Expo Router) | Web preview via Expo web |
| API | Express 5 + pino logging | Bundled via esbuild |
| Database | SQLite via `better-sqlite3` + Drizzle ORM | File: `./pos.db` (relative to API server CWD) |
| Auth | JWT (`jsonwebtoken`) + PIN hashing (`node:crypto` scrypt) | 7-day tokens |

## Running locally

Two workflows run automatically:

- **POS Mobile App** — Expo dev server on port 18115
- **API Server** — Express on port 8080 (auto-builds before starting)

No external database needed — SQLite creates `pos.db` on first start.

## Environment variables / Secrets

| Variable | Required | Description |
|----------|----------|-------------|
| `SESSION_SECRET` | Yes | JWT signing secret. Set in Replit Secrets. |
| `SQLITE_PATH` | No | Override SQLite file path (default: `./pos.db`) |
| `EXPO_PUBLIC_DOMAIN` | Auto-set | Injected by mobile dev script from `$REPLIT_DEV_DOMAIN` |

## Auth flow

1. **Onboarding** (`POST /api/auth/setup`): Creates a store + admin user with a 4-digit PIN.
2. **Login** (`POST /api/auth/login`): Accepts `{ storeId, pin }`, returns JWT + user + store.
3. **Store picker** (`GET /api/auth/stores`): Public — lists active stores for the login screen.

## API routes

All routes under `/api/`:

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/healthz` | No | Health check |
| POST | `/auth/setup` | No | First-time store setup |
| POST | `/auth/login` | No | Login with PIN |
| GET | `/auth/stores` | No | List stores (store picker) |
| GET/PUT | `/stores/:id` | JWT | Get/update store |
| GET/POST/PUT/DELETE | `/products` | JWT | Product CRUD |
| GET/POST/PUT | `/customers` | JWT | Customer management |
| GET/POST | `/orders` | JWT | Order list & creation |
| GET/POST | `/expenses` | JWT | Expense tracking |
| GET/POST/PATCH | `/notifications` | JWT | Notifications |

## Database schema

Tables auto-created with `CREATE TABLE IF NOT EXISTS` on API startup — no migrations needed in development.

Tables: `stores`, `users`, `categories`, `products`, `customers`, `orders`, `order_items`, `expenses`, `notifications`.

## Monorepo structure

```
artifacts/
  api-server/    — Express API (TypeScript, esbuild)
  mobile/        — Expo React Native app
lib/
  db/            — Drizzle ORM schema + SQLite client (shared)
```

## User preferences

- SQLite over external PostgreSQL (no external DB dependency)
- PIN-based cashier auth (4-digit PIN per store)
- Real API data — no mock data in the app
