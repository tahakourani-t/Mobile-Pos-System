---
name: better-sqlite3 native build
description: How to get better-sqlite3 compiled on Replit (pnpm workspace)
---

## Rule
`better-sqlite3` requires a native build step. Two things must happen:
1. Add `better-sqlite3` to `onlyBuiltDependencies` in `pnpm-workspace.yaml`
2. Run `pnpm install --force` to trigger the build (regular `pnpm install` skips already-installed packages even if build scripts were previously ignored)

**Why:** pnpm sandboxes build scripts by default. The first install ignores `better-sqlite3`'s build scripts. Adding it to `onlyBuiltDependencies` allows the scripts, but only `--force` re-runs install for already-present packages.

**How to apply:** Any time `better-sqlite3` is added to a workspace package, run `pnpm install --force` once to compile the native addon.

Also: `better-sqlite3` must be a **direct** dependency of any package that imports it at runtime (not just transitive). esbuild externalizes it, so Node.js must find it in a `node_modules` directory on the runtime resolution path.
