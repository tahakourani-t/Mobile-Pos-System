---
name: bcryptjs Metro crash
description: bcryptjs@3.x breaks Metro bundler via temp directory watchers
---

## Rule
Do NOT use `bcryptjs@3.x` in any workspace package — it creates temporary directories during installation that Metro's file watcher tries to watch, causing the Expo dev server to crash with `ENOENT: no such file or directory, watch .../bcryptjs_tmp_NNN/bin`.

**Why:** Metro watches all of `node_modules` recursively. bcryptjs@3.x creates/removes temp build directories during postinstall; those paths end up in Metro's watch list before they're cleaned up.

**How to apply:** For PIN/password hashing on the API server, use Node.js built-in `crypto.scryptSync` (available since Node.js 10). This requires no external package and is safe for 4-digit PINs.

```typescript
import { scryptSync, randomBytes, timingSafeEqual } from "node:crypto";
function hashPin(pin: string): string {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(pin, salt, 64).toString("hex")}`;
}
function verifyPin(pin: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  return timingSafeEqual(Buffer.from(hash, "hex"), scryptSync(pin, salt, 64));
}
```
