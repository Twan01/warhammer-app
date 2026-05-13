# Stack Research

**Domain:** Foundation hardening — migration validation, data integrity testing, non-destructive CRUD, SQLite schema evolution in Tauri 2 + tauri-plugin-sql desktop app
**Researched:** 2026-05-13
**Confidence:** HIGH

---

## Executive Summary

The v0.2.11 hardening milestone requires **one new dev dependency** and zero new
production dependencies. All eight requirements (MIG-01/02, REC-01 through REC-05,
VER-01) are addressed through SQL rewrites, query-layer changes, and additive
migrations — except TST-01, which needs an in-memory SQLite engine that can execute
actual DDL in tests. That single gap is filled by `better-sqlite3` as a devDependency.

---

## Existing Stack (No Changes)

The core stack is already correct for this milestone.

| Layer | Technology | Status |
|-------|------------|--------|
| Desktop shell | Tauri 2 | Keep as-is |
| Frontend | React 19 + TypeScript 5 + Vite 6 | Keep as-is |
| Styling | Tailwind v4 + shadcn/ui new-york/zinc | Keep as-is |
| State | React Query 5 + Zustand 5 | Keep as-is |
| DB access | tauri-plugin-sql ^2.4.0 | Keep as-is |
| Forms | React Hook Form 7 + Zod 4 | Keep as-is |
| Test runner | Vitest 4 + React Testing Library 16 | Keep as-is |

---

## Recommended Stack Addition

### For TST-01: Data-Layer Tests (schema behavioral assertions)

The existing test suite already mocks `getDb()` to test SQL strings in isolation
(see `recipeSections.test.ts`, `migration004.test.ts`). TST-01 goes further: it
requires verifying that the actual DDL in migration files produces the correct
schema — `PRAGMA table_info()`, FK presence, NOT NULL constraints. That requires
an actual SQLite engine executing the SQL, which is impossible with the current
jsdom + `vi.mock` approach.

**Add: `better-sqlite3` as a devDependency**

```bash
pnpm add -D better-sqlite3 @types/better-sqlite3
```

| Property | Value |
|----------|-------|
| Package | `better-sqlite3` |
| Latest version | `12.10.0` (confirmed 2026-05-13 via `npm view`) |
| Add as | `devDependency` only — never imported in production code |
| Purpose | Execute migration SQL against an in-memory SQLite instance in Node.js-environment tests |
| API pattern | `new Database(':memory:')`, `db.exec(sql)`, `db.prepare(sql).all()`, `db.close()` — all synchronous |
| Matches existing test style | Synchronous API means no `async/await` in test setup, identical to how `readFileSync` + string assertions work today |

### Why `better-sqlite3` over `node:sqlite` (built-in)

Node.js v22.5.0+ ships a built-in `node:sqlite` module (`DatabaseSync`) with an
identical synchronous API and zero installation required. The project's Node runtime
is v24.13.0, so `node:sqlite` is available.

However, Vitest issue #7177 (filed and confirmed) documents that Vitest strips the
`node:` prefix from imports, producing `Failed to load url sqlite` errors. The issue
was closed with a PR (#7179) but the fix status specifically for Vitest 4.x (the
installed version) is unconfirmed. Using `better-sqlite3` eliminates that risk
entirely. The cost — one devDependency, a native module compilation — is low because
`better-sqlite3` ships 150+ prebuilt binaries and rarely needs to compile from source.

### Vitest pool configuration for native modules

`better-sqlite3` is a native (C++) module. Vitest's default `threads` pool runs tests
in worker threads, and some native modules segfault under that model (documented in
Vitest's own guidance alongside Prisma, bcrypt, canvas). The safe configuration is
`pool: 'forks'`, which runs each test file in an isolated child process.

**Option A (preferred) — per-file docblock, no global config change:**

```typescript
// @vitest-environment node

import Database from 'better-sqlite3';
// ... test body
```

The `@vitest-environment node` docblock overrides the global `jsdom` environment
for that file only. This is Vitest's documented approach for mixed-environment
projects. Use this first — it does not affect the existing 90+ jsdom test files.

**Option B (fallback) — if segfaults occur with Option A:**

Add to `vitest.config.ts`:
```typescript
pool: 'forks',
```

Option B changes the pool globally and slows down all tests slightly (child process
IPC overhead vs worker threads). Use only if Option A produces native module crashes
in CI or local runs.

---

## Supporting Libraries

### No New Libraries Required for Any Other Requirement

| Requirement | Approach | Libraries |
|-------------|----------|-----------|
| MIG-01: Register migrations 018–021 in lib.rs | Content-shape test via `readFileSync` on `lib.rs` — same as `migration004.test.ts` | None |
| MIG-02: Clean DB validation | Schema behavioral test via `better-sqlite3` — apply all migration SQL sequentially to `:memory:`, assert tables exist | `better-sqlite3` (new) |
| REC-01: Paintless steps | `WHERE paint_id IS NOT NULL` in availability queries; `NULL` as valid `paint_id` in `addRecipePaint` | None |
| REC-02: Non-destructive edits | `INSERT OR REPLACE` or `UPDATE ... WHERE id = $1` per item, then `DELETE` only removed IDs | None |
| REC-03: Section metadata clearing | Replace `COALESCE($n, field)` with direct `field = $n` for nullable metadata columns | None |
| REC-04: Stable section_id FK on sessions | New `ALTER TABLE painting_sessions ADD COLUMN recipe_section_id INTEGER REFERENCES recipe_sections(id) ON DELETE SET NULL` — additive migration | None |
| REC-05: Section-aware step ordering | Add `ORDER BY rs.order_index ASC, rp.order_index ASC` to recipe-level step queries | None |
| VER-01: Version hygiene | Edit `package.json` + `src-tauri/tauri.conf.json` to match | None |

---

## What NOT to Add

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `node:sqlite` built-in | Vitest issue #7177: `node:` prefix is stripped, causing `Failed to load url sqlite`. Fix is in a PR but version applicability in Vitest 4 is unconfirmed. | `better-sqlite3` |
| `@sqlite.org/sqlite-wasm` | Requires COOP/COEP headers in Vite config, ships a WASM binary, has known Node-only limitation (in-memory databases only). Higher setup risk than `better-sqlite3`. | `better-sqlite3` |
| `sql.js` | Older Emscripten WASM port, needs `Buffer` shims in tests, weaker TypeScript support. | `better-sqlite3` |
| Drizzle ORM | PROJECT.md Key Decisions: "Drizzle is a v3 escape hatch only if raw typed queries become unmanageable." At 26 typed query files, they remain manageable. | Existing `$1, $2` parameterized queries |
| Knex / any query builder | No ORM benefit for single-user local app. Query builder adds an abstraction layer between the test assertions and the actual SQL strings being validated. | Existing query functions |
| Playwright / Cypress | E2E-level tool aimed at browser automation. No Tauri window is needed to test migration SQL or query parameter shapes. | `better-sqlite3` + Vitest Node env |
| `vitest-sqlite` or similar wrapper | No standard wrapper library exists; writing one adds complexity. `better-sqlite3` directly is more transparent and aligns with the existing test philosophy. | `better-sqlite3` directly |

---

## Schema Test Pattern

The recommended test structure for TST-01 behavioral tests mirrors the existing
content-shape pattern but adds DDL execution:

```typescript
// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Database from 'better-sqlite3';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

// Migration files to apply in order for this test suite
const MIGRATIONS = [
  '001_core_schema.sql',
  '012_recipe_steps.sql',
  '018_recipe_sections.sql',
  '020_workflow_metadata.sql',
];

let db: Database.Database;

beforeAll(() => {
  db = new Database(':memory:');
  for (const file of MIGRATIONS) {
    const sql = readFileSync(
      resolve(repoRoot, 'src-tauri/migrations', file), 'utf-8'
    );
    db.exec(sql);
  }
});

afterAll(() => db.close());

describe('recipe_sections schema — TST-01', () => {
  it('recipe_sections table exists with expected columns', () => {
    const cols = db.prepare("PRAGMA table_info('recipe_sections')").all() as any[];
    const names = cols.map(c => c.name);
    expect(names).toContain('id');
    expect(names).toContain('recipe_id');
    expect(names).toContain('section_type');
    expect(names).toContain('technique');
    expect(names).toContain('execution_mode');
    expect(names).toContain('applies_to');
  });

  it('recipe_steps has section_id FK column', () => {
    const cols = db.prepare("PRAGMA table_info('recipe_steps')").all() as any[];
    const col = cols.find((c: any) => c.name === 'section_id');
    expect(col).toBeDefined();
    expect(col.type).toBe('INTEGER');
  });
});
```

This pattern is additive — it sits alongside the existing content-shape tests in the
`tests/foundation/` directory. Content-shape tests (string assertions against `.sql`
and `lib.rs`) run in jsdom and remain unchanged; behavioral DDL tests carry the
`// @vitest-environment node` docblock.

---

## Installation

```bash
# Single new dev dependency for TST-01 schema behavioral tests
pnpm add -D better-sqlite3 @types/better-sqlite3
```

No production dependency changes. No Rust/Cargo changes. No Tauri plugin changes.

---

## Version Compatibility

| Package | Version | Compatible With | Notes |
|---------|---------|-----------------|-------|
| `better-sqlite3` | ^12.10.0 | Node.js v22+ | Prebuilt binaries for most platforms; v12 drops Node 16/18 support |
| `@types/better-sqlite3` | follows package | TypeScript 5 | No known issues |
| Vitest 4.x | ^4.1.5 (existing) | `better-sqlite3` with `// @vitest-environment node` | Use `pool: 'forks'` if segfaults appear with native module |

---

## Alternatives Considered

| Category | Recommended | Alternative | When Alternative Is Better |
|----------|-------------|-------------|---------------------------|
| In-memory SQLite for tests | `better-sqlite3` | `node:sqlite` (built-in) | When Vitest issue #7177 is confirmed fixed for Vitest 4.x and `node:` protocol handling is stable |
| Pool for native modules | `@vitest-environment node` per-file | `pool: 'forks'` globally | `pool: 'forks'` is better if multiple native module test files are added and per-file overhead accumulates |
| SQL content testing | `readFileSync` + string assertions | Execute SQL and inspect schema | Use `better-sqlite3` when the question is "does the DDL actually produce the right schema?", not just "does the file contain the right strings?" |

---

## Sources

- [better-sqlite3 GitHub](https://github.com/WiseLibs/better-sqlite3) — API reference for `Database(':memory:')`, `db.exec()`, `db.prepare().all()`, ESM import syntax (HIGH confidence)
- [better-sqlite3 npm](https://www.npmjs.com/package/better-sqlite3) — Latest version v12.10.0 confirmed via `npm view better-sqlite3 version` (HIGH confidence)
- [better-sqlite3 API docs](https://github.com/WiseLibs/better-sqlite3/blob/master/docs/api.md) — Synchronous API, in-memory database via `':memory:'`, `db.exec()` accepts multi-statement SQL (HIGH confidence)
- [Vitest: Test Environment guide](https://vitest.dev/guide/environment) — `@vitest-environment node` per-file docblock override of global jsdom environment (HIGH confidence)
- [Vitest: Common Errors](https://vitest.dev/guide/common-errors) — `pool: 'forks'` recommendation for native modules (Prisma, bcrypt, canvas) (HIGH confidence)
- [Vitest issue #7177](https://github.com/vitest-dev/vitest/issues/7177) — `node:sqlite` import stripping bug; closed with PR #7179 but Vitest 4 applicability unconfirmed (MEDIUM confidence)
- [Node.js SQLite docs](https://nodejs.org/api/sqlite.html) — Built-in `node:sqlite` module, `DatabaseSync`, `:memory:` support, stability level 1.2 Release Candidate in Node 26 (HIGH confidence)
- Existing codebase — `tests/foundation/migration004.test.ts`, `tests/hobby-journal/migration014.test.ts` — file-content test pattern confirmed; `vi.mock('@/db/client')` pattern confirmed in `recipeSections.test.ts` (HIGH confidence — direct inspection)

---
*Stack research for: v0.2.11 Foundation Hardening — migration registration, recipe data integrity, non-destructive CRUD, schema evolution*
*Researched: 2026-05-13*
