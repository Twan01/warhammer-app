# Phase 135: Faction & Navigation Consolidation - Research

**Researched:** 2026-06-17
**Domain:** SQLite data migration (map-not-delete dedup), React routing cleanup, Settings tab extension
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** "Consolidate" = align + dedup the integer-PK `factions` table toward canonical `udb_factions`. Every collection faction must end with a non-NULL `wahapedia_faction_id`; where multiple rows share the same canonical id, merge by re-pointing FK dependents then deleting the orphaned duplicate.
- **D-02:** Keep the integer-PK `factions` table and all `faction_id` FK columns unchanged in type. No INTEGER → TEXT migration.
- **D-03:** Map-not-delete safety contract — re-point every dependent FK first, delete the duplicate row only after all dependents are re-pointed.
- **D-04:** Unmapped factions (`wahapedia_faction_id IS NULL`) are mapped if a canonical match exists; otherwise left intact. No collection faction with dependents is ever destroyed.
- **D-05:** Zero-data-loss proof via a better-sqlite3 data-layer test seeding duplicates across all five FK surfaces + `default_faction_id`, running migration 048, asserting unchanged row counts and no introduced NULLs.
- **D-06:** Cold-boot theming check — `default_faction_id` must still resolve after consolidation.
- **D-07:** New home for faction list/edit/delete/theme = Settings, as a dedicated "Factions" section (new tab recommended, or card within existing tabs).
- **D-08:** Reuse `FactionSheet`, `FactionDeleteDialog`, `FactionCard`/`FactionRow`, `FactionsEmptyState` verbatim — rehoming, not a rebuild. Delete `/factions` route, `factionsRoute`, `FactionsPage` wrapper; keep sidebar Quick Add "Add Faction" intact.
- **D-09:** Minimal HON-07 demotion: remove `Data Health` from `MANAGEMENT_NAV` in `AppSidebar.tsx`; keep the `/data-health` route (the Settings → Data "Open Data Health" card already satisfies the requirement).
- **D-10:** Migration 048 trips the Phase-130 parity gate: `lib.rs` `Migration{}` count must increment from 47 → 48; `pnpm check:version` three-leg gate must pass; file must have LF line endings.

### Claude's Discretion
- Exact placement of Factions section within Settings (new tab vs. card within Preferences or Data).
- Survivor-selection rule when two duplicates are both mapped (e.g., lowest `id`, or the one with most dependents).
- SQL shape of the re-point (correlated UPDATEs vs. a temp mapping table).
- Whether to use `PRAGMA foreign_keys = OFF` inside the migration vs. relying on strict re-point-then-delete ordering.
- Empty-state copy for the Settings Factions section.

### Deferred Ideas (OUT OF SCOPE)
- Migrating `faction_id` FKs from INTEGER → canonical TEXT ids.
- Folding Data Health UI inline into Settings → Data.
- WeaponTable dedup / ArmyListDetailPage decomposition (Phase 136).
- `udb_leader_targets` migration (Phase 137).
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| HON-05 | User factions consolidated into canonical UDB faction model via map-not-delete migration preserving all FK references with zero data loss | FK surface enumeration, SQL migration pattern, data-layer test pattern |
| HON-06 | Standalone `/factions` sidebar page removed; faction management remains reachable from its new home with no loss of capability | Settings page structure, FactionsPage component inventory, router.tsx edit points |
| HON-07 | Data Health moved out of main sidebar into Settings → Data | AppSidebar.tsx MANAGEMENT_NAV edit, DataManagementTab existing "Open Data Health" card |
</phase_requirements>

---

## Summary

Phase 135 has three tightly scoped deliverables: a data-only migration (048) that consolidates duplicate collection factions, a route/sidebar cleanup (remove `/factions` and the Data Health sidebar entry), and the rehoming of faction CRUD into Settings.

The data migration is the risk centre. The `factions` table has five FK surfaces with three different ON DELETE semantics: `units.faction_id RESTRICT` (deletion blocked until re-pointed), `painting_recipes.faction_id SET NULL` and `army_lists.faction_id SET NULL` (silent link loss if deleted first), and `wishlist_items.faction_id CASCADE` (silent row deletion). The fifth surface is `app_settings.default_faction_id`, a plain TEXT value with no FK, requiring a manual `UPDATE` inside the migration. The correct order is always: re-point all five surfaces for a given duplicate, then delete the now-zero-dependency row.

The `painting_sessions` table confirmed via migrations 005/014/023 to have NO `faction_id` column. Its only faction-adjacent links are `recipe_id` (SET NULL) and `unit_id` (CASCADE). The HON-05 requirement text uses "painting_sessions" loosely; the actual in-scope SET NULL surface is `painting_recipes.faction_id`.

HON-06 is a mechanical rehoming: `FactionsPage` content (already in `src/features/factions/FactionsPage.tsx`) moves to a new Settings tab, the thin `src/app/factions/page.tsx` wrapper and `factionsRoute` are deleted from `router.tsx`, and two items are removed from `MANAGEMENT_NAV` in `AppSidebar.tsx`. HON-07 is even simpler: one array entry removed from `MANAGEMENT_NAV`; the Settings → Data "Open Data Health" card already exists at line ~162–183 of `DataManagementTab.tsx`.

**Primary recommendation:** Migration 048 uses `PRAGMA foreign_keys = OFF` + single transaction + re-point UPDATEs + dedup DELETEs + `PRAGMA foreign_keys = ON` (mirroring the `import_unit_database_inner` pattern). This is simpler and safer than orchestrating strict re-point-then-delete ordering with FK enforcement live, especially since the Tauri plugin-sql migration runner wraps each migration in a transaction and FK enforcement is managed at the connection level.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Faction dedup / FK re-point | Database (SQL migration) | — | Pure data operation; must run at the DB layer before any UI loads |
| Zero-data-loss proof | Test layer (better-sqlite3) | — | Verified by seeding + running migration 048 in an isolated in-memory DB |
| Cold-boot theming after dedup | Frontend (ActiveFactionContext) | Database | Context reads `default_faction_id` from `app_settings`; migration must re-point the value |
| Faction CRUD UI (new home) | Frontend/Settings | React Query | FactionsPage content rehomed as a new Settings tab; hooks unchanged |
| Route/sidebar cleanup | Frontend (router.tsx, AppSidebar.tsx) | — | File edits only; no DB or hook changes |
| Parity gate compliance | Build tooling (check-version.mjs) | lib.rs | lib.rs Migration{} count must match disk file count |

---

## Standard Stack

No new packages are required for this phase. All work uses existing infrastructure.

### Core (already installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| better-sqlite3 | existing | Data-layer test harness | Already used in `tests/data-layer/`; synchronous SQLite for deterministic test execution |
| Vitest | existing | Test runner | Project standard |
| TanStack Router | existing | Route registration | Phase uses `createRoute` pattern already in `router.tsx` |
| shadcn/ui Tabs | existing | Settings tab extension | SettingsPage already uses `<Tabs>` from `@/components/ui/tabs` |

### Package Legitimacy Audit

No new packages are installed in this phase.

---

## Architecture Patterns

### System Architecture Diagram

```
Migration 048 (single transaction)
  PRAGMA foreign_keys = OFF
  → For each duplicate faction (same wahapedia_faction_id, keep lowest id as survivor):
      UPDATE units.faction_id         duplicate → survivor
      UPDATE painting_recipes.faction_id  duplicate → survivor
      UPDATE army_lists.faction_id    duplicate → survivor
      UPDATE wishlist_items.faction_id    duplicate → survivor
      UPDATE app_settings SET value=survivor WHERE key='default_faction_id' AND value=duplicate
      DELETE FROM factions WHERE id = duplicate
  PRAGMA foreign_keys = ON
  → For each still-NULL wahapedia_faction_id faction:
      UPDATE factions SET wahapedia_faction_id = (normalized match) WHERE wahapedia_faction_id IS NULL

ActiveFactionContext (cold boot)
  app_settings.default_faction_id (TEXT, no FK)
      → parse as integer → lookup in factions table → color_theme → --faction-accent CSS var
  localStorage 'active-faction-id' (fallback/override)
      → if stored id no longer in factions, falls back to DEFAULT_HEX (#71717a zinc-500)

Settings Page (after HON-06)
  <Tabs>
    preferences | factions (NEW) | data | about
  <TabsContent value="factions">
    <FactionsPage/> content (rehomed)
```

### Recommended Project Structure

```
src/
  app/
    factions/            ← DELETE: page.tsx (thin wrapper, retire entirely)
    router.tsx           ← EDIT: remove FactionsPage import + factionsRoute + tree entry
    settings/
      page.tsx           ← EDIT: add "factions" TabsTrigger + TabsContent
  features/
    factions/            ← NO CHANGE: all components reused verbatim
      FactionsPage.tsx
      FactionSheet.tsx
      FactionDeleteDialog.tsx
      FactionRow.tsx (FactionCard)
      FactionsEmptyState.tsx
      factionSchema.ts
  components/
    common/
      AppSidebar.tsx     ← EDIT: remove Factions + Data Health from MANAGEMENT_NAV

src-tauri/
  migrations/
    048_consolidate_factions.sql   ← NEW

tests/
  data-layer/
    migration048.test.ts           ← NEW
```

### Pattern 1: FK-Safe Dedup Migration (migration 048)

**What:** Merge duplicate faction rows by re-pointing their dependents, then deleting the now-orphaned duplicates. Works inside a single transaction with FK enforcement disabled.

**When to use:** Any time duplicate rows in a table with heterogeneous ON DELETE semantics (RESTRICT + SET NULL + CASCADE) must be consolidated — doing it with FK ON requires strictly correct ordering; doing it with FK OFF is simpler and equivalent when wrapped in a transaction.

**Critical note from migration 033 comments:** `PRAGMA foreign_keys = ON` cannot be changed inside a transaction when `tauri-plugin-sql` is running migrations (it wraps each migration in a transaction and the pragma change inside a transaction is silently ignored in some SQLite versions). The migration 033 comment explicitly states this limitation. However, reviewing the Rust code in `lib.rs`, the `import_unit_database_inner` function issues `PRAGMA foreign_keys = OFF` on the connection *before* starting the transaction, then restores it *after* the commit — this works because the PRAGMA is set at the connection level outside the transaction.

**For a `.sql` migration file**, the Tauri plugin-sql runner wraps migrations in a transaction. `PRAGMA foreign_keys` is a connection-level setting that, in SQLite, is allowed to be set inside a transaction but has no effect until the statement executes. The practical approach for migration 048 is to structure the re-points to happen before deletes (the strict ordering approach), which makes FK enforcement live or off irrelevant — no DELETE targets a row that still has dependents.

**Example (SQL shape):**
```sql
-- 048_consolidate_factions.sql
-- Data-only consolidation: merge collection factions that share a canonical
-- wahapedia_faction_id into a single survivor row (lowest id wins).
-- Safety contract: re-point every FK surface BEFORE deleting the duplicate.

BEGIN;

-- Step 1: Identify survivors and duplicates.
-- A duplicate is any faction whose wahapedia_faction_id is shared by a
-- lower-id faction (the survivor).
-- We materialize the mapping as a temp table for clarity.
CREATE TEMP TABLE IF NOT EXISTS _faction_merge_map (
  duplicate_id INTEGER NOT NULL,
  survivor_id  INTEGER NOT NULL
);

INSERT INTO _faction_merge_map (duplicate_id, survivor_id)
SELECT f_dup.id AS duplicate_id,
       f_sur.id AS survivor_id
FROM   factions f_dup
JOIN   factions f_sur
  ON   f_sur.wahapedia_faction_id = f_dup.wahapedia_faction_id
 AND   f_sur.id < f_dup.id                -- survivor = lowest id
WHERE  f_dup.wahapedia_faction_id IS NOT NULL;

-- Step 2: Re-point units (RESTRICT — must happen before DELETE or DELETE is blocked)
UPDATE units
SET    faction_id = (SELECT survivor_id FROM _faction_merge_map WHERE duplicate_id = faction_id)
WHERE  faction_id IN (SELECT duplicate_id FROM _faction_merge_map);

-- Step 3: Re-point painting_recipes (SET NULL — but we preserve the link)
UPDATE painting_recipes
SET    faction_id = (SELECT survivor_id FROM _faction_merge_map WHERE duplicate_id = faction_id)
WHERE  faction_id IN (SELECT duplicate_id FROM _faction_merge_map);

-- Step 4: Re-point army_lists (SET NULL — preserve link)
UPDATE army_lists
SET    faction_id = (SELECT survivor_id FROM _faction_merge_map WHERE duplicate_id = faction_id)
WHERE  faction_id IN (SELECT duplicate_id FROM _faction_merge_map);

-- Step 5: Re-point wishlist_items (CASCADE — must happen before DELETE or items are lost)
UPDATE wishlist_items
SET    faction_id = (SELECT survivor_id FROM _faction_merge_map WHERE duplicate_id = faction_id)
WHERE  faction_id IN (SELECT duplicate_id FROM _faction_merge_map);

-- Step 6: Re-point default_faction_id in app_settings (no FK — plain UPDATE)
UPDATE app_settings
SET    value      = (SELECT CAST(survivor_id AS TEXT) FROM _faction_merge_map WHERE CAST(duplicate_id AS TEXT) = value),
       updated_at = datetime('now')
WHERE  key = 'default_faction_id'
  AND  value IN (SELECT CAST(duplicate_id AS TEXT) FROM _faction_merge_map);

-- Step 7: Delete the now-zero-dependency duplicate rows
DELETE FROM factions
WHERE  id IN (SELECT duplicate_id FROM _faction_merge_map);

-- Step 8: Backfill still-NULL wahapedia_faction_id using normalized name matching
-- (same algorithm as migration 046)
UPDATE factions
SET wahapedia_faction_id = (
  SELECT uf.id
  FROM udb_factions uf
  WHERE LOWER(REPLACE(REPLACE(REPLACE(uf.name, ' ', ''), '''', ''), ''', ''))
      = LOWER(REPLACE(REPLACE(REPLACE(factions.name, ' ', ''), '''', ''), ''', ''))
  LIMIT 1
)
WHERE wahapedia_faction_id IS NULL;

DROP TABLE IF EXISTS _faction_merge_map;

COMMIT;
```

**Note on TEMP TABLE inside a Tauri plugin-sql migration:** The Tauri plugin-sql runner wraps each migration file in a transaction. Creating a `TEMP TABLE` inside a transaction is valid SQLite. However, if the runner's transaction wrapping conflicts with explicit `BEGIN`/`COMMIT` statements in the .sql file, the migration may fail or double-wrap. Verify whether the plugin runner auto-wraps or not. **Safer alternative:** Use a CTEs / subquery approach instead of `CREATE TEMP TABLE` to avoid any transaction nesting concern:

```sql
-- Alternative shape using correlated subqueries (no explicit transaction or temp table needed)
-- The plugin-sql runner handles the transaction.

-- Re-point units
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
);

-- (repeat for painting_recipes, army_lists, wishlist_items, app_settings)

-- Delete duplicates after all re-points
DELETE FROM factions
WHERE id IN (
  SELECT f_dup.id
  FROM   factions f_dup
  JOIN   factions f_sur ON f_sur.wahapedia_faction_id = f_dup.wahapedia_faction_id
                        AND f_sur.id < f_dup.id
  WHERE  f_dup.wahapedia_faction_id IS NOT NULL
);
```

This avoids `BEGIN`/`COMMIT` nesting and `CREATE TEMP TABLE` entirely; the plugin-sql transaction wrapping handles atomicity.

### Pattern 2: Data-Layer Test (migration048.test.ts)

**What:** Mirrors the `migration033.test.ts` pattern — creates a fresh in-memory DB via `createHobbyforgeDb()` (which runs all migrations including 048), seeds data, and asserts post-migration invariants.

**When to use:** Any time a migration performs data transformation that must be proven non-destructive.

**Example:**
```typescript
// @vitest-environment node
import { describe, it, expect } from "vitest";
import Database from "better-sqlite3";
import { createHobbyforgeDb } from "./db-helpers";

describe("migration 048 — faction consolidation (HON-05)", () => {
  it("merges duplicate factions, zero data loss across all 5 FK surfaces", () => {
    // 1. Create DB with all migrations applied up to and including 048
    const db = createHobbyforgeDb();

    // 2. Seed: Insert a canonical udb_factions entry
    db.prepare(`INSERT INTO udb_factions (id, name, updated_at) VALUES ('SM', 'Space Marines', datetime('now'))`).run();

    // 3. Seed: Two collection faction rows pointing to the same canonical faction
    //    (simulate the "duplicate" scenario migration 048 must consolidate)
    //    Since migration 048 already ran, we need to test the shape *after* the migration.
    //    The correct test pattern: seed the pre-migration state BEFORE running 048 manually.

    // NOTE: Because createHobbyforgeDb() runs ALL migrations, testing migration 048
    // specifically requires a two-step approach:
    //   a) Create a DB with only migrations 001-047 applied (pre-048 state)
    //   b) Seed duplicates
    //   c) Apply migration 048 manually with db.exec()
    //   d) Assert post-state invariants
    // See the Implementation Notes section for the concrete helper pattern.
    db.close();
  });
});
```

**Concrete pre-048-only seeding pattern:**
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

// Test body
const db = createDbUpToMigration(47); // migrations 001–047 applied
db.pragma("foreign_keys = ON");

// Seed udb_factions entry
db.prepare(`INSERT OR IGNORE INTO udb_factions (id, name, updated_at) VALUES ('SM', 'Space Marines', datetime('now'))`).run();

// Seed survivor faction (id=10, maps to SM)
const survivorId = db.prepare(
  `INSERT INTO factions (name, game_system, color_theme, wahapedia_faction_id) VALUES ('Space Marines', 'Warhammer 40K', '#1B4FA8', 'SM')`
).run().lastInsertRowid;

// Seed duplicate faction (id=11, also maps to SM)
const duplicateId = db.prepare(
  `INSERT INTO factions (name, game_system, color_theme, wahapedia_faction_id) VALUES ('SM Duplicate', 'Warhammer 40K', '#2255BB', 'SM')`
).run().lastInsertRowid;

// Seed one unit under survivor, one under duplicate
const unitUnderSurvivor = db.prepare(`INSERT INTO units (faction_id, name, status_painting) VALUES (?, 'Tactical Squad', 'Not Started')`).run(survivorId).lastInsertRowid;
const unitUnderDuplicate = db.prepare(`INSERT INTO units (faction_id, name, status_painting) VALUES (?, 'Intercessors', 'Not Started')`).run(duplicateId).lastInsertRowid;

// Seed recipe under duplicate's faction_id
db.prepare(`INSERT INTO painting_recipes (name, faction_id) VALUES ('Blue Test', ?)`).run(duplicateId);

// Seed army_list under duplicate's faction_id
db.prepare(`INSERT INTO army_lists (name, faction_id) VALUES ('Test List', ?)`).run(duplicateId);

// Seed wishlist_item under duplicate (CASCADE risk!)
db.prepare(`INSERT INTO wishlist_items (name, faction_id, estimated_cost_pence) VALUES ('Land Raider', ?, 5000)`).run(duplicateId);

// Seed default_faction_id pointing at the duplicate
db.prepare(`INSERT INTO app_settings (key, value, updated_at) VALUES ('default_faction_id', ?, datetime('now'))`).run(String(duplicateId));

// --- Record pre-migration counts ---
const preUnits = (db.prepare(`SELECT COUNT(*) as c FROM units`).get() as {c: number}).c;
const preRecipes = (db.prepare(`SELECT COUNT(*) as c FROM painting_recipes`).get() as {c: number}).c;
const preArmyLists = (db.prepare(`SELECT COUNT(*) as c FROM army_lists`).get() as {c: number}).c;
const preWishlist = (db.prepare(`SELECT COUNT(*) as c FROM wishlist_items`).get() as {c: number}).c;

// Apply migration 048
db.exec(readFileSync(resolve(migrationsDir, "048_consolidate_factions.sql"), "utf-8"));

// --- Assertions ---
// All dependent row counts unchanged
expect((db.prepare(`SELECT COUNT(*) as c FROM units`).get() as {c: number}).c).toBe(preUnits);
expect((db.prepare(`SELECT COUNT(*) as c FROM painting_recipes`).get() as {c: number}).c).toBe(preRecipes);
expect((db.prepare(`SELECT COUNT(*) as c FROM army_lists`).get() as {c: number}).c).toBe(preArmyLists);
expect((db.prepare(`SELECT COUNT(*) as c FROM wishlist_items`).get() as {c: number}).c).toBe(preWishlist);

// Duplicate faction is gone
expect(db.prepare(`SELECT id FROM factions WHERE id = ?`).get(duplicateId)).toBeUndefined();

// All dependents now point at survivor
const units = db.prepare(`SELECT faction_id FROM units`).all() as {faction_id: number}[];
expect(units.every(u => u.faction_id === Number(survivorId))).toBe(true);

const recipes = db.prepare(`SELECT faction_id FROM painting_recipes WHERE faction_id IS NOT NULL`).all() as {faction_id: number}[];
expect(recipes.every(r => r.faction_id === Number(survivorId))).toBe(true);

const lists = db.prepare(`SELECT faction_id FROM army_lists WHERE faction_id IS NOT NULL`).all() as {faction_id: number}[];
expect(lists.every(l => l.faction_id === Number(survivorId))).toBe(true);

const wishlist = db.prepare(`SELECT faction_id FROM wishlist_items`).all() as {faction_id: number}[];
expect(wishlist.every(w => w.faction_id === Number(survivorId))).toBe(true);

// default_faction_id re-pointed to survivor
const setting = db.prepare(`SELECT value FROM app_settings WHERE key = 'default_faction_id'`).get() as {value: string};
expect(setting.value).toBe(String(survivorId));

db.close();
```

### Pattern 3: Settings Tab Extension (HON-06)

**What:** Add a "Factions" tab to the existing three-tab Settings page.

**When to use:** Adding a new management section to Settings that doesn't fit inside Preferences or Data.

**Example (settings/page.tsx edit):**
```tsx
// Add import
import { FactionsPage } from "@/features/factions/FactionsPage";
// (or inline the FactionsPage content if the PageHeader is unwanted in a tab context)

// Add TabsTrigger
<TabsTrigger value="factions">Factions</TabsTrigger>

// Add TabsContent
<TabsContent value="factions" className="mt-4">
  <FactionsPage />
</TabsContent>
```

**Note:** `FactionsPage` renders a `<PageHeader title="Factions" ...>` and a full-page layout with `p-6`. Inside a settings tab, this may produce excessive padding. The executor can either pass the content components directly (reusing `FactionCard`, `FactionSheet`, etc. with a simpler wrapper) or wrap `FactionsPage` as-is and accept the padding. D-08 says "reuse verbatim" — both are compliant.

### Anti-Patterns to Avoid

- **Deleting a faction before re-pointing its dependents.** Even with `painting_recipes` / `army_lists` (SET NULL) and `army_lists`, a premature DELETE would silently NULL those FK columns rather than preserving them. The RESTRICT on `units` would block the DELETE entirely anyway, but the order of operations matters for the SET NULL and CASCADE tables.
- **Modifying existing migration files.** Migration files are never edited after shipping (CLAUDE.md). Migration 048 is a new file; files 039 and 046 must not be touched.
- **Placing explicit `BEGIN`/`COMMIT` in the migration .sql file** if the Tauri plugin-sql runner already wraps migrations in a transaction — this would cause a nested transaction error. Review the runner's behavior; if it wraps, use the subquery approach without explicit transaction control.
- **Using `PRAGMA foreign_keys = OFF` inside the migration .sql** — the migration 033 comment explicitly documents that `PRAGMA foreign_keys` changes inside a transaction are not reliably applied by the plugin-sql runner. The subquery approach (re-point before delete, FK enforcement live) is the correct pattern for a `.sql` migration file.
- **Removing `src/features/factions/` directory.** These components are being rehomed to Settings. Only the `src/app/factions/page.tsx` wrapper is deleted.
- **Removing `dataHealthRoute` from router.tsx.** D-09 is sidebar-entry removal only; the route is kept.

---

## FK Surface Enumeration (HON-05 — Definitive)

### Confirmed FK surfaces on `factions.id`

| Table | Column | ON DELETE | Risk if deleted before re-point | Migration step |
|-------|--------|-----------|----------------------------------|----------------|
| `units` | `faction_id` | **RESTRICT** | DELETE is blocked entirely by SQLite FK enforcement | Step 2: UPDATE first |
| `painting_recipes` | `faction_id` | **SET NULL** | Faction link silently cleared — data loss | Step 3: UPDATE first |
| `army_lists` | `faction_id` | **SET NULL** | Faction link silently cleared — data loss | Step 4: UPDATE first |
| `wishlist_items` | `faction_id` | **CASCADE** | Wishlist items silently deleted — data loss | Step 5: UPDATE first |
| `app_settings` key `default_faction_id` | `value` (TEXT) | **No FK** | Cold-boot theming fails or resolves wrong faction | Step 6: UPDATE manually |

**Source:** `src-tauri/migrations/001_core_schema.sql` (units L22, painting_recipes L69, army_lists L105), `src-tauri/migrations/009_wishlist.sql` (L5), `src-tauri/migrations/044_app_settings.sql` (no FK defined). [VERIFIED: direct file inspection]

### Confirmed NOT a FK surface on `factions.id`

| Table | Reason |
|-------|--------|
| `painting_sessions` | Schema: `unit_id NOT NULL REFERENCES units(id) ON DELETE CASCADE` — no `faction_id` column. Confirmed in migrations 005, 014, 023. [VERIFIED: direct file inspection] |
| `udb_factions` | Uses TEXT PK, entirely separate table — no FK back to integer `factions` |
| `batch_logs_*`, `synced_point_tiers`, `bsdata_extended` | These tables have `faction_id TEXT` columns referencing Wahapedia TEXT keys, NOT the integer `factions.id` PK — no FK constraint defined [VERIFIED: migrations 024, 029, 030] |

**Clarification on "painting_sessions" in HON-05 requirement text:** The REQUIREMENTS.md HON-05 text says "painting_sessions" but migration inspection confirms `painting_sessions` has no `faction_id` column. The actual SET NULL surface is `painting_recipes.faction_id`. The CONTEXT.md `<specifics>` section flags this exact ambiguity: treat `painting_recipes` as the in-scope surface. [VERIFIED: direct file inspection]

### Views and Triggers referencing factions

None found. No `CREATE VIEW` or `CREATE TRIGGER` statements reference the `factions` table in any migration. [VERIFIED: grep across all 47 migration files]

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Faction CRUD UI in new home | New form components | Reuse `FactionSheet`, `FactionCard`, `FactionDeleteDialog`, `FactionsEmptyState` from `src/features/factions/` | D-08 mandates verbatim reuse; all state logic is already correct |
| FK-aware faction delete | Custom delete logic | Existing `useDeleteFaction` hook (`src/hooks/useFactions.ts`) catches FK errors and invalidates all affected caches | Already handles RESTRICT error → toast; cache invalidation for recipes/army-lists/wishlist |
| Settings tab navigation | Custom router | Existing `<Tabs>` component from shadcn/ui (`src/components/ui/tabs`) — already wired in `settings/page.tsx` | Pattern is already established in the file |
| Pre-migration DB state for tests | Custom test runner | `createDbUpToMigration(47)` pattern (inline helper) using `better-sqlite3` + `readdirSync` | Mirrors the `createHobbyforgeDb()` pattern from `db-helpers.ts` |

---

## Migration Parity Gate Mechanics (D-10)

**Current state (pre-048):**
- 47 `.sql` files on disk
- 47 `Migration{}` entries in `lib.rs` (`get_migrations()` function, lines 7–291)
- `pnpm check:version` Leg 2 asserts `fileCount === libRsCount` — currently 47 === 47

**Required changes for migration 048:**

1. **Create `src-tauri/migrations/048_consolidate_factions.sql`** — disk count becomes 48
2. **Add one `Migration{}` entry in `lib.rs`** — `version: 48, description: "consolidate_factions", sql: include_str!("../migrations/048_consolidate_factions.sql"), kind: MigrationKind::Up`
3. **LF line endings** — migration 048 must have no CR bytes (0x0D), or Leg 3 of `check-version.mjs` fails
4. **No `package.json`/`tauri.conf.json` version bump required** (D-10 explicitly excludes this)

**What auto-updates (no manual edit needed):**
- `HOBBYFORGE_MIGRATION_COUNT` in `db-helpers.ts` — derived from `readdirSync` on disk; picks up 048 automatically
- `migration-parity.test.ts` Leg D-04 — calls `createHobbyforgeDb()` which runs all disk migrations including 048
- `migration-parity.test.ts` Leg D-06 — compares lib.rs `Migration{}` count to `HOBBYFORGE_MIGRATION_COUNT` — passes after step 2 above

**Source:** `scripts/check-version.mjs` (full file read), `tests/data-layer/migration-parity.test.ts`, `tests/data-layer/db-helpers.ts`. [VERIFIED: direct file inspection]

---

## Router and Sidebar Edit Points

### router.tsx (src/app/router.tsx)

**Remove:**
- Line 26: `const FactionsPage = lazy(() => import("./factions/page").then(m => ({ default: m.FactionsPage })));`
- Lines 101–105: `const factionsRoute = createRoute({ getParentRoute: () => layoutRoute, path: "/factions", component: FactionsPage });`
- Line 234: `factionsRoute,` entry in `routeTree`

**Keep:**
- Line 35: `const DataHealthPage = lazy(...)` — unchanged
- Lines 201–205: `const dataHealthRoute = createRoute(...)` — unchanged
- Line 250 area: `dataHealthRoute,` in `routeTree` — unchanged

[VERIFIED: direct file inspection, `src/app/router.tsx`]

### AppSidebar.tsx (src/components/common/AppSidebar.tsx)

**Remove from `MANAGEMENT_NAV` (lines 57–62):**
```typescript
{ to: "/factions", label: "Factions", icon: Shield },
{ to: "/data-health", label: "Data Health", icon: HeartPulse },
```

**Result:** `MANAGEMENT_NAV` will contain only `Spending` and `Wishlist`.

**Imports to clean up:** `Shield` and `HeartPulse` from lucide-react can be removed if unused elsewhere in the file. Review `Shield` — it is also used in the Quick Add "Add Faction" DropdownMenuItem (line ~119). `HeartPulse` appears only in `MANAGEMENT_NAV`. Remove only `HeartPulse`.

**Keep:** The Quick Add "Add Faction" DropdownMenuItem (lines ~117–120) — this is the standalone create path that must remain functional per D-08.

[VERIFIED: direct file inspection, `src/components/common/AppSidebar.tsx`]

---

## Cold-Boot Theming Preservation (D-06)

**Trace of `ActiveFactionContext` cold-boot path** (`src/context/ActiveFactionContext.tsx`):

1. `useState` initializer reads `localStorage['active-faction-id']` → parsed as integer `activeFactionId`
2. `bootAttempted` useEffect: if `activeFactionId` is null and `settings` is loaded, reads `settings['default_faction_id']` → parsed as integer → sets `activeFactionId`
3. `activeFaction` = `factions.find(f => f.id === activeFactionId)` — if id no longer exists in the factions list, returns `null`
4. `activeFactionHex` = `activeFaction?.color_theme ?? DEFAULT_HEX` — degrades gracefully to `#71717a`
5. `--faction-accent` CSS var = `activeFactionHex`

**Failure mode without migration fix:** If `default_faction_id` in `app_settings` still points to a now-deleted duplicate faction id, step 3 above returns `null`, step 4 returns `DEFAULT_HEX` (zinc-500), and the user's theming preference is silently lost. This is not a crash but is visible UX regression.

**Migration 048 fix:** Step 6 of the migration re-points `app_settings` `default_faction_id` from the duplicate id to the survivor id. After the migration, `ActiveFactionContext` resolves the survivor faction correctly.

**localStorage handling:** `localStorage['active-faction-id']` is NOT re-pointed by the migration (it's client-side storage, not accessible from SQL). However, `ActiveFactionContext` uses `factions.find(f => f.id === activeFactionId)` — if the stored id is a now-deleted duplicate, this returns null and the context falls back to `default_faction_id` (which is correctly re-pointed). Functionally safe without any additional change.

[VERIFIED: direct file inspection, `src/context/ActiveFactionContext.tsx`]

---

## Seed Factions Analysis (pre-migration 048 risk surface)

**Migration 002 seeds four factions with stable IDs 1–4:**
- id=1: 'Tau Empire' — wahapedia_faction_id='TAU' (set by migration 046 normalized match against "T'au Empire")
- id=2: 'Ultramarines' — wahapedia_faction_id='SM' (Space Marines; name match via 039)
- id=3: 'Necrons' — wahapedia_faction_id='NEC' (direct match via 039)
- id=4: 'Tyranids' — wahapedia_faction_id='TYR' (direct match via 039)

**Duplicate scenario:** A user who creates a faction named "Space Marines" after migration 039 would also get `wahapedia_faction_id='SM'`, creating a duplicate alongside id=2 (Ultramarines, mapped to SM). This is the scenario migration 048 must handle.

**NULL scenario:** A faction whose name doesn't normalize-match any `udb_factions` entry (e.g., a homebrew faction named "My Custom Warband") would have `wahapedia_faction_id IS NULL` after migrations 039+046. Migration 048 Step 8 attempts a normalized match and leaves it NULL if none is found — per D-04, it is kept intact.

**Operational risk:** At production runtime, the number of actual duplicates depends entirely on what the user created. In a fresh install, the 4 seed factions each have distinct `wahapedia_faction_id` values — no duplicates to merge. The migration is a no-op for clean installs and only acts on user-created duplicates.

[VERIFIED: direct file inspection, migrations 002, 039, 046]

---

## Common Pitfalls

### Pitfall 1: Explicit BEGIN/COMMIT in a Tauri plugin-sql migration file
**What goes wrong:** If the migration .sql file contains `BEGIN;` ... `COMMIT;`, and the plugin-sql runner also wraps the migration in a transaction, a nested transaction error occurs (SQLite does not support nested `BEGIN` calls; it silently ignores the inner `BEGIN` but the inner `COMMIT` triggers "cannot commit - no transaction is active" in some SQLite driver configurations).
**Why it happens:** The `tauri-plugin-sql` migrator uses `sqlx` under the hood, which may wrap each migration SQL string in an auto-transaction.
**How to avoid:** Do NOT include `BEGIN`/`COMMIT` in migration .sql files. Let the runner handle transaction wrapping. Use the correlated-subquery shape (no temp table, no explicit transaction).
**Warning signs:** Migration fails at startup with "no transaction is active" or "cannot start a transaction within a transaction".

### Pitfall 2: PRAGMA foreign_keys change inside a plugin-sql migration transaction
**What goes wrong:** `PRAGMA foreign_keys = OFF` inside the .sql file (inside the plugin's transaction) may be silently ignored or have no effect until after the transaction commits.
**Why it happens:** The migration 033 comment explicitly documents this: "this pragma cannot be turned OFF inside a transaction (tauri-plugin-sql wraps migrations in a transaction)".
**How to avoid:** The correlated-subquery approach (re-point before delete) does not require disabling FK enforcement — as long as all re-points happen before any delete, RESTRICT, SET NULL, and CASCADE all behave correctly.
**Warning signs:** Migration fails with "FOREIGN KEY constraint failed" on the DELETE step even after re-pointing (if re-point UPDATEs somehow silently no-oped due to FK enforcement on the UPDATE side — but UPDATEs setting a valid FK value do not fail with FK ON).

### Pitfall 3: app_settings default_faction_id is a TEXT value
**What goes wrong:** The migration compares faction ids (integers) against `app_settings.value` (TEXT). A numeric comparison `WHERE value = duplicate_id` will fail silently (SQLite type affinity may or may not coerce).
**Why it happens:** `app_settings` is a key/value TEXT store; `default_faction_id` is stored as a TEXT representation of the integer (e.g., `"3"`).
**How to avoid:** Use `CAST(duplicate_id AS TEXT)` in the comparison and set value to `CAST(survivor_id AS TEXT)`. Example: `WHERE key = 'default_faction_id' AND value = CAST(? AS TEXT)`.

### Pitfall 4: localStorage active-faction-id stale after migration
**What goes wrong:** After migration 048 deletes a duplicate faction, a user whose `localStorage['active-faction-id']` stored the duplicate's id would have a stale value. On next cold boot, `ActiveFactionContext` would try to find the faction, fail, fall to `default_faction_id` (which was re-pointed), and recover gracefully. However, if both `localStorage` and `default_faction_id` pointed at different duplicates that were both merged, the UX recovery path is different.
**Why it happens:** `localStorage` is outside the migration's reach.
**How to avoid:** The context already handles missing faction IDs gracefully (returns `DEFAULT_HEX`). The `default_faction_id` re-point in migration Step 6 ensures the boot path has a valid faction. No additional fix needed; document in test assertions that the localStorage stale case is accepted behavior.

### Pitfall 5: Shield icon still imported after removal from MANAGEMENT_NAV
**What goes wrong:** TypeScript's `noUnusedLocals` = true (CLAUDE.md). If `Shield` is removed from `MANAGEMENT_NAV` but remains imported, `pnpm build` fails.
**Why it happens:** `Shield` is also used in the Quick Add "Add Faction" menu (line ~119 of AppSidebar.tsx).
**How to avoid:** Keep the `Shield` import; only remove `HeartPulse`.

### Pitfall 6: FactionsPage PageHeader inside a Settings tab
**What goes wrong:** `FactionsPage` renders `<PageHeader title="Factions" subtitle="Manage your army factions" actions={...}>` with top-level padding. Inside a Settings `<TabsContent>`, this produces a visual double-header (Settings page header + FactionsPage inner header) and double padding.
**Why it happens:** `FactionsPage` was designed as a full-page component.
**How to avoid:** Either (a) inline `FactionsPage` content without the `PageHeader` wrapper (extract the card grid + CRUD state directly), or (b) accept the visual density as-is (D-08 says "reuse verbatim"). Decision is in Claude's Discretion.

---

## Runtime State Inventory

**This phase is a data migration + UI reorganization.** The Runtime State Inventory is relevant for the migration surface.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | `factions` table: up to N rows; `app_settings` key `default_faction_id`; FK-linked rows in `units`, `painting_recipes`, `army_lists`, `wishlist_items` | Migration 048 re-points + deduplicates in a single transaction |
| Live service config | None — no external services | None |
| OS-registered state | None | None |
| Secrets/env vars | None | None |
| Build artifacts | `lib.rs` `get_migrations()` array must be updated (1 new `Migration{}` entry) | Code edit to lib.rs |

**localStorage:** `active-faction-id` may reference a now-merged faction id. Context degrades gracefully; no migration needed, no action required.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4 + React Testing Library 16 (jsdom) + better-sqlite3 (node environment) |
| Config file | `vite.config.ts` (already configured) |
| Quick run command | `pnpm test -- tests/data-layer/migration048.test.ts` |
| Full suite command | `pnpm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| HON-05 | Duplicate faction rows merged; all FK dependents re-pointed; row counts unchanged | data-layer | `pnpm test -- tests/data-layer/migration048.test.ts` | ❌ Wave 0 |
| HON-05 | `default_faction_id` re-pointed after merge | data-layer | same | ❌ Wave 0 |
| HON-05 | Parity gate passes with 48 migrations | data-layer | `pnpm test -- tests/data-layer/migration-parity.test.ts` | ✅ (auto-picks up 048) |
| HON-05 | `pnpm check:version` three-leg gate green | build check | `node scripts/check-version.mjs` | ✅ (script exists) |
| HON-06 | `/factions` route removed (TypeScript clean build) | build | `pnpm build` | ✅ |
| HON-06 | Faction CRUD reachable via Settings > Factions tab | manual / component | Component render test or manual | manual |
| HON-06 | Quick Add "Add Faction" still works | manual | — | manual |
| HON-07 | Data Health sidebar entry absent | component | inspect `MANAGEMENT_NAV` (static assertion) | could be automated |
| HON-07 | `/data-health` route still accessible | manual / build | `pnpm build` + navigate | manual |
| HON-07 | Settings → Data → "Open Data Health" button present | existing behavior | already present, no test needed | existing |

### Validation Signals — HON-05 Zero Data Loss

**Row-count invariants (automated in migration048.test.ts):**
- `SELECT COUNT(*) FROM units` — unchanged before/after migration 048
- `SELECT COUNT(*) FROM painting_recipes` — unchanged
- `SELECT COUNT(*) FROM army_lists` — unchanged
- `SELECT COUNT(*) FROM wishlist_items` — unchanged (CASCADE prevents any drop)
- `SELECT COUNT(*) FROM factions WHERE wahapedia_faction_id IS NOT NULL` — unchanged or increased (backfill step)

**FK resolution checks (automated):**
- `SELECT COUNT(*) FROM units WHERE faction_id NOT IN (SELECT id FROM factions)` = 0
- `SELECT COUNT(*) FROM wishlist_items WHERE faction_id NOT IN (SELECT id FROM factions)` = 0
- No NULL introduced on previously-non-NULL painting_recipes/army_lists faction_id columns that had a value

**Cold-boot theming check (automated in migration048.test.ts):**
- `SELECT value FROM app_settings WHERE key = 'default_faction_id'` → returned id exists in `SELECT id FROM factions`

**Duplicate elimination check:**
- `SELECT wahapedia_faction_id, COUNT(*) FROM factions WHERE wahapedia_faction_id IS NOT NULL GROUP BY wahapedia_faction_id HAVING COUNT(*) > 1` = empty result set

### Sampling Rate
- **Per task commit:** `pnpm test -- tests/data-layer/migration048.test.ts`
- **Per wave merge:** `pnpm test`
- **Phase gate:** `pnpm build` green + `pnpm test` green + `node scripts/check-version.mjs` green

### Wave 0 Gaps
- [ ] `tests/data-layer/migration048.test.ts` — covers HON-05 (zero data loss across all 5 FK surfaces + default_faction_id)

*(The existing `migration-parity.test.ts` auto-picks up migration 048 from disk — no edit needed.)*

---

## Security Domain

This phase involves no authentication, session management, or external input. The migration operates on internal DB data only.

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | — |
| V3 Session Management | No | — |
| V4 Access Control | No | — |
| V5 Input Validation | Partial | Migration SQL uses hardcoded logic, no user input; `app_settings.value` re-point is an internal UPDATE, not user-supplied |
| V6 Cryptography | No | — |

**Relevant concern:** The migration modifies `app_settings`, which also holds other keys (locale, currency, army_readiness_target). The SQL must target only `key = 'default_faction_id'` to avoid corrupting other settings. The CTE/subquery pattern shown above is keyed on `key = 'default_faction_id'` explicitly.

---

## Sources

### Primary (HIGH confidence)
- `src-tauri/migrations/001_core_schema.sql` — FK surfaces: units RESTRICT, painting_recipes SET NULL, army_lists SET NULL
- `src-tauri/migrations/009_wishlist.sql` — wishlist_items CASCADE
- `src-tauri/migrations/044_app_settings.sql` — app_settings has no FK on default_faction_id
- `src-tauri/migrations/005_hobby_journal.sql`, `014_session_recipe_link.sql`, `023_session_section_fk.sql` — painting_sessions has no faction_id column (confirmed absence)
- `src-tauri/migrations/039_collection_udb_link.sql` — wahapedia_faction_id mapping pattern
- `src-tauri/migrations/046_backfill_faction_udb_normalized.sql` — normalized backfill (step 8 model)
- `src-tauri/migrations/033_database_hardening.sql` — critical note: PRAGMA foreign_keys cannot be toggled inside a transaction
- `src-tauri/src/lib.rs` — 47 Migration{} entries confirmed; FK-OFF pattern in `import_unit_database_inner`
- `scripts/check-version.mjs` — three-leg gate: version parity + migration count + CR-byte scan
- `tests/data-layer/db-helpers.ts` — disk-derived migration list, `createHobbyforgeDb()` pattern
- `tests/data-layer/migration-parity.test.ts` — D-06 assertion pattern
- `src/context/ActiveFactionContext.tsx` — full cold-boot theming trace
- `src/app/router.tsx` — factionsRoute at lines 101–105; dataHealthRoute at lines 201–205
- `src/components/common/AppSidebar.tsx` — MANAGEMENT_NAV at lines 57–62; Quick Add at lines 117–120
- `src/app/settings/page.tsx` — three-tab structure (preferences/data/about)
- `src/features/settings/DataManagementTab.tsx` — "Open Data Health" card at lines 162–183
- `src/features/factions/FactionsPage.tsx` — rehomeable component, full component inventory
- `src/db/queries/factions.ts` — `updateFaction` COALESCE partial-update pattern
- `src/hooks/useFactions.ts` — `useDeleteFaction` cascade invalidations

### Secondary (MEDIUM confidence)
- None needed — all critical information was verified directly from source files

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Tauri plugin-sql migration runner wraps each .sql migration in a transaction automatically | Migration pattern, Pitfall 1 | If it does NOT auto-wrap, a crash mid-migration could leave the DB in a partial state — add `BEGIN`/`COMMIT` to migration 048 if investigation reveals no auto-wrapping |
| A2 | `PRAGMA foreign_keys` change inside a plugin-sql migration transaction is silently ignored (documented in migration 033 but for the specific case of table recreation) | Migration pattern, Pitfall 2 | If the PRAGMA change does take effect mid-transaction, the FK-OFF approach would work but is unnecessary with the re-point-before-delete ordering |

**If this table is empty (almost):** All critical claims were verified by direct file inspection. Only the exact transaction-wrapping behavior of tauri-plugin-sql is [ASSUMED] — the correlated-subquery approach works correctly whether or not the PRAGMA assumption holds.

---

## Open Questions

1. **Does the Tauri plugin-sql migration runner auto-wrap each `.sql` file in a transaction, or does it execute the SQL string as-is?**
   - What we know: `lib.rs` shows `tauri_plugin_sql::Builder::default().add_migrations(...)` — the plugin uses `sqlx` under the hood
   - What's unclear: Whether `sqlx`'s migration executor wraps each migration in `BEGIN`/`COMMIT` automatically
   - Recommendation: Use the explicit-transaction approach in migration 048 IF investigation confirms no auto-wrapping; use the subquery approach (no `BEGIN`/`COMMIT`) if auto-wrapping is confirmed. The migration 033 note about PRAGMA inside a transaction suggests the runner DOES wrap, making the subquery approach correct.

2. **Should the Factions section in Settings be a new fourth tab, or integrated under Preferences or Data?**
   - What we know: Settings has three tabs (preferences/data/about); faction management is configuration but also operational (editing units per-faction view in FactionsPage)
   - What's unclear: Whether a fourth "Factions" tab is desirable UX, or a subsection of Preferences
   - Recommendation: New "Factions" tab — cleanest isolation; `DefaultFactionSetting` already in Preferences creates a clear separation of concerns (preference = which faction is default; management = CRUD). This is in Claude's Discretion per CONTEXT.md.

---

## Environment Availability

Step 2.6: SKIPPED (no external dependencies — phase is internal SQLite migration + UI reorganization only).

---

## Metadata

**Confidence breakdown:**
- FK surface enumeration: HIGH — verified by direct inspection of all relevant migration files
- Migration SQL pattern: HIGH — direct inspection of migration 033 note and lib.rs FK-OFF pattern
- Parity gate mechanics: HIGH — verified scripts/check-version.mjs and db-helpers.ts
- Validation architecture: HIGH — verified existing test patterns in tests/data-layer/
- HON-06/07 edit points: HIGH — verified exact line numbers in router.tsx and AppSidebar.tsx

**Research date:** 2026-06-17
**Valid until:** 2026-07-17 (stable codebase; no moving targets)
