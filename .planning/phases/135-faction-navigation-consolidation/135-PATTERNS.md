# Phase 135: Faction & Navigation Consolidation - Pattern Map

**Mapped:** 2026-06-17
**Files analyzed:** 6 new/modified files
**Analogs found:** 6 / 6

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src-tauri/migrations/048_consolidate_factions.sql` | migration | batch / transform | `src-tauri/migrations/046_backfill_faction_udb_normalized.sql` + `039_collection_udb_link.sql` | role-match (same correlated-UPDATE shape; 048 adds FK re-point + DELETE) |
| `src-tauri/src/lib.rs` (Migration{} array) | config | N/A | Existing `Migration { version: 47, … }` entry (lines 284–289) | exact |
| `tests/data-layer/migration048.test.ts` | test | batch / transform | `tests/data-layer/migration033.test.ts` + `tests/data-layer/db-helpers.ts` | role-match (same node-environment, better-sqlite3, `createHobbyforgeDb` harness) |
| `src/app/router.tsx` | route config | request-response | Self — remove `factionsRoute` entry (lines 101–105, 235) and `FactionsPage` lazy import (line 26) | exact (delete-from-existing) |
| `src/components/common/AppSidebar.tsx` | config / nav | N/A | Self — remove two entries from `MANAGEMENT_NAV` (lines 57–62) | exact (delete-from-existing) |
| `src/app/settings/page.tsx` | component | request-response | Self — add `TabsTrigger` + `TabsContent` mirroring existing `data` / `about` tab entries (lines 17–43) | exact (extend-existing) |

---

## Pattern Assignments

### `src-tauri/migrations/048_consolidate_factions.sql` (migration, batch/transform)

**Primary analog:** `src-tauri/migrations/046_backfill_faction_udb_normalized.sql`
**Secondary analog:** `src-tauri/migrations/039_collection_udb_link.sql`

**Core correlated-UPDATE shape from analog 046** (full file, lines 16–41):
```sql
UPDATE factions
SET wahapedia_faction_id = (
  SELECT uf.id
  FROM udb_factions uf
  WHERE LOWER(REPLACE(REPLACE(REPLACE(uf.name, ' ', ''), '''', ''), ''', ''))
      = LOWER(REPLACE(REPLACE(REPLACE(factions.name, ' ', ''), '''', ''), ''', ''))
  LIMIT 1
)
WHERE wahapedia_faction_id IS NULL;

UPDATE units
SET udb_unit_id = (
  SELECT uu.id
  FROM udb_units uu
  WHERE LOWER(uu.name) = LOWER(units.name)
    AND uu.faction_id = (
      SELECT f.wahapedia_faction_id
      FROM factions f
      WHERE f.id = units.faction_id
    )
  LIMIT 1
)
WHERE udb_unit_id IS NULL;
```

**Key pattern to copy for 048:** Migration 048 uses the same correlated subquery shape but as a re-point UPDATE (duplicate → survivor) across five tables, then a DELETE. Do NOT include explicit `BEGIN`/`COMMIT` — the Tauri plugin-sql runner wraps the migration in its own transaction (documented in migration 033 comment). Do NOT use `PRAGMA foreign_keys = OFF` inside the file — it is silently ignored inside the runner's transaction (also documented in migration 033). The correct approach is strict re-point-before-delete ordering.

**SQL shape for 048** (re-point all five FK surfaces first, delete second, backfill last):

Step 1 — re-point `units.faction_id` (RESTRICT: must go first or DELETE is blocked):
```sql
UPDATE units
SET faction_id = (
  SELECT f_sur.id
  FROM   factions f_sur
  JOIN   factions f_dup ON f_dup.wahapedia_faction_id = f_sur.wahapedia_faction_id
                        AND f_sur.id < f_dup.id
  WHERE  f_dup.id = units.faction_id
  LIMIT 1
)
WHERE faction_id IN (
  SELECT f_dup.id
  FROM   factions f_dup
  JOIN   factions f_sur ON f_sur.wahapedia_faction_id = f_dup.wahapedia_faction_id
                        AND f_sur.id < f_dup.id
  WHERE  f_dup.wahapedia_faction_id IS NOT NULL
);
```

Steps 2–4 — same correlated subquery shape applied to `painting_recipes.faction_id`, `army_lists.faction_id`, `wishlist_items.faction_id`.

Step 5 — re-point `app_settings.default_faction_id` (TEXT value, no FK — CAST required):
```sql
UPDATE app_settings
SET    value      = (
         SELECT CAST(f_sur.id AS TEXT)
         FROM   factions f_sur
         JOIN   factions f_dup ON f_dup.wahapedia_faction_id = f_sur.wahapedia_faction_id
                               AND f_sur.id < f_dup.id
         WHERE  CAST(f_dup.id AS TEXT) = app_settings.value
         LIMIT 1
       ),
       updated_at = datetime('now')
WHERE  key = 'default_faction_id'
  AND  value IN (
         SELECT CAST(f_dup.id AS TEXT)
         FROM   factions f_dup
         JOIN   factions f_sur ON f_sur.wahapedia_faction_id = f_dup.wahapedia_faction_id
                               AND f_sur.id < f_dup.id
         WHERE  f_dup.wahapedia_faction_id IS NOT NULL
       );
```

Step 6 — DELETE now-orphaned duplicates (safe after all re-points):
```sql
DELETE FROM factions
WHERE id IN (
  SELECT f_dup.id
  FROM   factions f_dup
  JOIN   factions f_sur ON f_sur.wahapedia_faction_id = f_dup.wahapedia_faction_id
                        AND f_sur.id < f_dup.id
  WHERE  f_dup.wahapedia_faction_id IS NOT NULL
);
```

Step 7 — backfill still-NULL wahapedia_faction_id (copy verbatim from 046, lines 16–24):
```sql
UPDATE factions
SET wahapedia_faction_id = (
  SELECT uf.id
  FROM udb_factions uf
  WHERE LOWER(REPLACE(REPLACE(REPLACE(uf.name, ' ', ''), '''', ''), ''', ''))
      = LOWER(REPLACE(REPLACE(REPLACE(factions.name, ' ', ''), '''', ''), ''', ''))
  LIMIT 1
)
WHERE wahapedia_faction_id IS NULL;
```

**LF line endings required.** Leg 3 of `scripts/check-version.mjs` scans for CR bytes (0x0D) — the file must have Unix LF endings or the parity gate fails.

---

### `src-tauri/src/lib.rs` — Migration{} array entry (config)

**Analog:** Existing `version: 47` entry (lines 284–289 of `src-tauri/src/lib.rs`):
```rust
Migration {
    version: 47,
    description: "army_list_unit_wargear",
    sql: include_str!("../migrations/047_army_list_unit_wargear.sql"),
    kind: MigrationKind::Up,
},
```

**New entry to append immediately after:**
```rust
Migration {
    version: 48,
    description: "consolidate_factions",
    sql: include_str!("../migrations/048_consolidate_factions.sql"),
    kind: MigrationKind::Up,
},
```

The `version` integer, `description` slug, `include_str!` path, and `MigrationKind::Up` are mandatory. The description slug must match the filename suffix (after the `048_` prefix) and contain no spaces. This brings the `Migration{}` count from 47 → 48, satisfying the parity gate (Leg 2 of `check-version.mjs`: `fileCount === libRsCount`).

---

### `tests/data-layer/migration048.test.ts` (test, batch/transform)

**Primary analog:** `tests/data-layer/migration033.test.ts`
**Secondary analog:** `tests/data-layer/db-helpers.ts`

**File header + environment directive** (from `migration033.test.ts` lines 1, 12–18):
```typescript
// @vitest-environment node

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";
import { createHobbyforgeDb } from "./db-helpers";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
```

**`createHobbyforgeDb` pattern** (from `db-helpers.ts` lines 43–59) — runs ALL migrations including 048 on a fresh in-memory DB:
```typescript
export function createHobbyforgeDb(): Database.Database {
  const db = new Database(":memory:");
  db.pragma("foreign_keys = ON");
  for (const file of HOBBYFORGE_MIGRATIONS) {
    const sql = readFileSync(resolve(migrationsDir, file), "utf-8");
    db.exec(sql);
  }
  // verify FK is back ON
  const fkState = db.pragma("foreign_keys") as { foreign_keys: number }[];
  if (fkState[0]?.foreign_keys !== 1) {
    throw new Error("PRAGMA foreign_keys not ON after migration chain");
  }
  return db;
}
```

**Critical pattern for migration048.test.ts:** Because `createHobbyforgeDb()` runs ALL migrations including 048, the test cannot pre-seed duplicates into an already-migrated DB (048 would be a no-op on a clean DB). The correct test approach uses an **inline `createDbUpToMigration(47)` helper** that applies only migrations 001–047, seeds duplicates, then manually calls `db.exec(readFileSync(...048...))` to apply the migration under test. This pattern is referenced in `RESEARCH.md` Pattern 2 and is the only way to test 048's data transformation.

**Inline helper to copy** (from RESEARCH.md Pattern 2, lines 319–340):
```typescript
import { readFileSync, readdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const migrationsDir = resolve(repoRoot, "src-tauri/migrations");

function createDbUpToMigration(upToNum: number): Database.Database {
  const db = new Database(":memory:");
  db.pragma("foreign_keys = ON");
  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort((a, b) => Number.parseInt(a.slice(0, 3)) - Number.parseInt(b.slice(0, 3)))
    .filter((f) => Number.parseInt(f.slice(0, 3)) <= upToNum);
  for (const file of files) {
    db.exec(readFileSync(resolve(migrationsDir, file), "utf-8"));
  }
  return db;
}
```

**Assertion shape** (row-count invariants + no-NULL-introduced + default_faction_id re-pointed):
```typescript
// Record pre-migration counts
const preUnits = (db.prepare(`SELECT COUNT(*) as c FROM units`).get() as {c: number}).c;
const preRecipes = (db.prepare(`SELECT COUNT(*) as c FROM painting_recipes`).get() as {c: number}).c;
const preArmyLists = (db.prepare(`SELECT COUNT(*) as c FROM army_lists`).get() as {c: number}).c;
const preWishlist = (db.prepare(`SELECT COUNT(*) as c FROM wishlist_items`).get() as {c: number}).c;

// Apply migration 048
db.exec(readFileSync(resolve(migrationsDir, "048_consolidate_factions.sql"), "utf-8"));

// Assert row counts unchanged
expect((db.prepare(`SELECT COUNT(*) as c FROM units`).get() as {c: number}).c).toBe(preUnits);
expect((db.prepare(`SELECT COUNT(*) as c FROM painting_recipes`).get() as {c: number}).c).toBe(preRecipes);
expect((db.prepare(`SELECT COUNT(*) as c FROM army_lists`).get() as {c: number}).c).toBe(preArmyLists);
expect((db.prepare(`SELECT COUNT(*) as c FROM wishlist_items`).get() as {c: number}).c).toBe(preWishlist);

// Assert duplicate faction deleted, all dependents re-pointed to survivor
expect(db.prepare(`SELECT id FROM factions WHERE id = ?`).get(duplicateId)).toBeUndefined();
const units = db.prepare(`SELECT faction_id FROM units`).all() as {faction_id: number}[];
expect(units.every(u => u.faction_id === Number(survivorId))).toBe(true);

// Assert no NULL introduced on previously-linked painting_recipes/army_lists
const nullRecipes = (db.prepare(`SELECT COUNT(*) as c FROM painting_recipes WHERE faction_id IS NULL AND name = 'Blue Test'`).get() as {c: number}).c;
expect(nullRecipes).toBe(0);

// Assert default_faction_id re-pointed to survivor
const setting = db.prepare(`SELECT value FROM app_settings WHERE key = 'default_faction_id'`).get() as {value: string};
expect(setting.value).toBe(String(survivorId));

// Assert no duplicates remain
const dups = db.prepare(`SELECT wahapedia_faction_id, COUNT(*) as c FROM factions WHERE wahapedia_faction_id IS NOT NULL GROUP BY wahapedia_faction_id HAVING COUNT(*) > 1`).all();
expect(dups.length).toBe(0);
```

---

### `src/app/router.tsx` (route config — edit existing)

**Analog:** Self — the pattern being removed is `factionsRoute` (lines 101–105) which mirrors every other `createRoute` in the file.

**Lines to DELETE** (three discrete locations):

Line 26 — lazy import:
```typescript
const FactionsPage = lazy(() => import("./factions/page").then(m => ({ default: m.FactionsPage })));
```

Lines 101–105 — route definition:
```typescript
const factionsRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: "/factions",
  component: FactionsPage,
});
```

Line 235 in route tree (inside `layoutRoute.addChildren([...])`):
```typescript
factionsRoute,
```

**Lines to KEEP unchanged:**
- Line 35: `const DataHealthPage = lazy(...)` — kept
- Lines ~201–205: `dataHealthRoute` definition — kept
- Line ~250: `dataHealthRoute,` in route tree — kept

**Reference shape of a simple route being kept** (lines 146–149, for contrast):
```typescript
const spendingRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: "/spending",
  component: SpendingPage,
});
```

---

### `src/components/common/AppSidebar.tsx` (config/nav — edit existing)

**Analog:** Self — the `MANAGEMENT_NAV` array (lines 57–62).

**Current state** (lines 57–62):
```typescript
const MANAGEMENT_NAV = [
  { to: "/factions", label: "Factions", icon: Shield },
  { to: "/spending", label: "Spending", icon: Wallet },
  { to: "/wishlist", label: "Wishlist", icon: Heart },
  { to: "/data-health", label: "Data Health", icon: HeartPulse },
] as const;
```

**Target state** (remove lines for `/factions` and `/data-health`):
```typescript
const MANAGEMENT_NAV = [
  { to: "/spending", label: "Spending", icon: Wallet },
  { to: "/wishlist", label: "Wishlist", icon: Heart },
] as const;
```

**Import cleanup** (line 9 — remove `HeartPulse` only; keep `Shield`):
```typescript
// BEFORE (line 9):
HeartPulse,
// AFTER: delete this line entirely

// KEEP Shield — it is used at line 118:
<Shield className="mr-2 h-4 w-4" />
// in the Quick Add "Add Faction" DropdownMenuItem
```

**Rule:** `noUnusedLocals = true` in TypeScript config. Any removed import that is genuinely unused elsewhere will cause `pnpm build` to fail. `HeartPulse` appears only in the removed `MANAGEMENT_NAV` entry — safe to delete. `Shield` also appears in the Quick Add menu (line 118) — must be kept.

---

### `src/app/settings/page.tsx` (component — extend existing)

**Analog:** Self — the existing `TabsTrigger`/`TabsContent` entries for `data` and `about` (lines 17–43).

**Current `<TabsList>` and `<TabsContent>` blocks** (lines 17–43 — the pattern to copy):
```tsx
<Tabs defaultValue="preferences">
  <TabsList>
    <TabsTrigger value="preferences">Preferences</TabsTrigger>
    <TabsTrigger value="data">Data</TabsTrigger>
    <TabsTrigger value="about">About</TabsTrigger>
  </TabsList>
  <TabsContent value="preferences" className="mt-4">
    {/* ... */}
  </TabsContent>
  <TabsContent value="data" className="mt-4">
    <DataManagementTab />
  </TabsContent>
  <TabsContent value="about" className="mt-4">
    <AboutTab />
  </TabsContent>
</Tabs>
```

**Target state** — insert `factions` as the second tab (after `preferences`, before `data`):
```tsx
<Tabs defaultValue="preferences">
  <TabsList>
    <TabsTrigger value="preferences">Preferences</TabsTrigger>
    <TabsTrigger value="factions">Factions</TabsTrigger>  {/* NEW */}
    <TabsTrigger value="data">Data</TabsTrigger>
    <TabsTrigger value="about">About</TabsTrigger>
  </TabsList>
  <TabsContent value="preferences" className="mt-4">
    {/* unchanged */}
  </TabsContent>
  <TabsContent value="factions" className="mt-4">   {/* NEW */}
    <FactionsPage />                                  {/* NEW */}
  </TabsContent>                                      {/* NEW */}
  <TabsContent value="data" className="mt-4">
    <DataManagementTab />
  </TabsContent>
  <TabsContent value="about" className="mt-4">
    <AboutTab />
  </TabsContent>
</Tabs>
```

**New import to add** (at top of file, following the existing import block pattern):
```typescript
import { FactionsPage } from "@/features/factions/FactionsPage";
```

**`className="mt-4"` is mandatory** on `TabsContent` — this is the established spacing for all tabs in this file; omitting it creates visual inconsistency.

**`defaultValue="preferences"` is unchanged** — the Settings page opens on Preferences, not Factions.

---

## Shared Patterns

### Migration file naming and LF line endings
**Source:** `scripts/check-version.mjs` (Leg 3)
**Apply to:** `048_consolidate_factions.sql`

Migration files must use a three-digit numeric prefix (`048_`) with LF line endings. The check-version script scans for CR bytes (0x0D) and fails if found. On Windows, ensure the file is saved with LF endings (not CRLF). All existing migration files confirm this convention.

### No explicit `BEGIN`/`COMMIT` in migration `.sql` files
**Source:** `src-tauri/migrations/033_database_hardening.sql` comment + RESEARCH.md Pitfall 1
**Apply to:** `048_consolidate_factions.sql`

The Tauri plugin-sql runner wraps each migration in its own transaction. Adding `BEGIN`/`COMMIT` inside the `.sql` file risks a nested-transaction error. Migration 033 documents this limitation. Migrations 039 and 046 (the closest analogs) contain no explicit transaction control — copy that pattern.

### `CAST(id AS TEXT)` for app_settings comparisons
**Source:** RESEARCH.md Pitfall 3
**Apply to:** `048_consolidate_factions.sql` Step 5

`app_settings.value` is a TEXT column. The `default_faction_id` value is stored as a string integer (e.g., `"3"`). All comparisons against `factions.id` (INTEGER) must use `CAST(faction_id AS TEXT)` when comparing to `app_settings.value`, and `CAST(survivor_id AS TEXT)` when writing back. Failure to cast results in a silent no-op (SQLite type affinity mismatch).

### Parity gate compliance
**Source:** `tests/data-layer/db-helpers.ts` + `tests/data-layer/migration-parity.test.ts`
**Apply to:** `src-tauri/src/lib.rs` Migration{} array

`HOBBYFORGE_MIGRATION_COUNT` in `db-helpers.ts` is disk-derived via `readdirSync` — it auto-increments when `048_consolidate_factions.sql` is added to disk. No manual edit to `db-helpers.ts` is needed. The `migration-parity.test.ts` Leg D-06 asserts `Migration{}` count in `lib.rs` equals `HOBBYFORGE_MIGRATION_COUNT`. After adding the 048 `.sql` file on disk, the lib.rs count must also be bumped to 48 or the parity test fails.

---

## No Analog Found

All six files have an analog or are self-edits. No files fall into this category.

---

## Metadata

**Analog search scope:** `src-tauri/migrations/`, `src-tauri/src/`, `tests/data-layer/`, `src/app/`, `src/components/common/`
**Files read:** 12 source files
**Pattern extraction date:** 2026-06-17
