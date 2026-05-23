# Phase 96: Database Hardening - Research

**Researched:** 2026-05-22
**Domain:** SQLite schema hardening (indexes, CHECK constraints, WAL mode)
**Confidence:** HIGH

## Summary

Phase 96 hardens the main hobbyforge.db with three categories of changes: (1) WAL journal mode and busy_timeout PRAGMAs on the main database client to match the rules-client.ts pattern, (2) explicit indexes on all FK columns and temporal columns, and (3) CHECK constraints on columns that must enforce data range validity at the schema level.

The codebase has 32 existing migrations across hobbyforge.db. A comprehensive scan of all migrations reveals **27 FK columns** across 18 tables, of which only **1 already has an explicit index** (army_list_snapshots.list_id from migration 032). The remaining 26 FK columns need indexes. Two temporal columns (painting_sessions.session_date, battle_logs.battle_date) need DESC indexes. For CHECK constraints, 6 tables contain columns requiring range validation, and 4 of those tables will need the rename-create-copy-drop pattern since SQLite cannot add CHECK constraints via ALTER TABLE.

**Primary recommendation:** Use a single migration file (033_database_hardening.sql) for all index creations (simple `CREATE INDEX IF NOT EXISTS` statements), and a second migration file (034_check_constraints.sql) for table recreations that add CHECK constraints. Splitting these reduces blast radius -- if the CHECK migration has issues, the indexes are already applied.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Add `PRAGMA journal_mode = WAL` and `PRAGMA busy_timeout = 10000` to `src/db/client.ts` getDb() -- matching rules-client.ts exactly
- **D-02:** Create indexes on all FK columns that lack them, using `CREATE INDEX IF NOT EXISTS`
- **D-03:** Also index FK columns from later migrations not enumerated in requirements
- **D-04:** Create DESC indexes on painting_sessions.session_date and battle_logs.battle_date
- **D-05:** Add CHECK constraints for points >= 0, quantity >= 0, painting_percentage BETWEEN 0 AND 100
- **D-06:** Adding CHECK constraints requires rename-create-copy-drop pattern
- **D-07:** Verify existing data compliance before writing CHECK constraints; include data cleanup if needed
- **D-08:** Use a single new migration file (033_database_hardening.sql) for all changes
- **D-09:** All index statements use `CREATE INDEX IF NOT EXISTS`

### Claude's Discretion
- Index naming convention
- Whether to add additional non-FK indexes beyond requirements
- Exact set of columns receiving CHECK constraints beyond the explicitly named ones

### Deferred Ideas (OUT OF SCOPE)
None
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| ERR-05 | Main database uses WAL journal mode and busy_timeout (matching rules-client.ts) | WAL + busy_timeout pattern fully documented from rules-client.ts reference; exact 2-line PRAGMA addition to client.ts |
| DBH-01 | All foreign key columns have database indexes | Complete FK column audit identifies 26 unindexed FK columns across 18 tables |
| DBH-02 | Temporal query columns have indexes (session_date DESC, battle_date DESC) | Two columns identified; DESC index syntax verified for SQLite |
| DBH-03 | Data integrity CHECK constraints prevent invalid values | 6 tables with columns needing CHECKs identified; 4 require table recreation; data compliance analysis complete |
</phase_requirements>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| WAL mode + busy_timeout | Database / Storage | -- | Connection-time PRAGMAs on SQLite singleton |
| FK column indexes | Database / Storage | -- | Schema-level DDL in migration files |
| Temporal indexes | Database / Storage | -- | Schema-level DDL in migration files |
| CHECK constraints | Database / Storage | -- | Schema-level DDL requiring table recreation |
| Migration registration | API / Backend (Rust) | -- | lib.rs must register new migration(s) |

## Standard Stack

No new packages. This phase modifies only:
- `src/db/client.ts` (2 PRAGMA lines)
- `src-tauri/migrations/033_*.sql` (new migration file)
- `src-tauri/src/lib.rs` (migration registration)

## Architecture Patterns

### System Architecture Diagram

```
App Startup
    |
    v
lib.rs: preflight_migration_repair()
    |
    v
tauri_plugin_sql: run migrations 001-033 in order
    |  (033 = new database hardening migration)
    v
client.ts: getDb()
    |  PRAGMA foreign_keys = ON
    |  PRAGMA journal_mode = WAL    <-- NEW
    |  PRAGMA busy_timeout = 10000  <-- NEW
    v
Query modules (src/db/queries/*.ts)
    |  All queries now benefit from FK indexes
    v
SQLite (hobbyforge.db)
    CHECK constraints enforce data integrity
    Indexes accelerate FK joins and temporal sorts
```

### Pattern 1: WAL Mode Addition (ERR-05)

**What:** Add two PRAGMA lines to `src/db/client.ts` getDb() after the existing `foreign_keys = ON` line.

**Reference implementation** (`src/db/rules-client.ts` lines 21-23):
```typescript
// Source: src/db/rules-client.ts (verified in codebase)
await db.execute("PRAGMA foreign_keys = ON");
await db.execute("PRAGMA journal_mode = WAL");
await db.execute("PRAGMA busy_timeout = 10000");
```

**Exact change to `src/db/client.ts`:** Add two lines after line 26:
```typescript
await db.execute("PRAGMA journal_mode = WAL");
await db.execute("PRAGMA busy_timeout = 10000");
```

### Pattern 2: FK Index Creation (DBH-01)

**What:** `CREATE INDEX IF NOT EXISTS` for every FK column lacking an index.

**Naming convention:** `idx_{table}_{column}` -- consistent with the existing `idx_army_list_snapshots_list_id` from migration 032. [VERIFIED: codebase grep]

**Example:**
```sql
-- Source: SQLite documentation pattern
CREATE INDEX IF NOT EXISTS idx_units_faction_id ON units(faction_id);
```

### Pattern 3: Temporal DESC Index (DBH-02)

**What:** DESC indexes for "most recent first" sort queries.

```sql
-- Source: SQLite documentation
CREATE INDEX IF NOT EXISTS idx_painting_sessions_session_date ON painting_sessions(session_date DESC);
CREATE INDEX IF NOT EXISTS idx_battle_logs_battle_date ON battle_logs(battle_date DESC);
```

### Pattern 4: Rename-Create-Copy-Drop for CHECK Constraints (DBH-03)

**What:** SQLite cannot add CHECK constraints to existing tables via ALTER TABLE. Must use the 4-step pattern proven in migration 031.

**Reference implementation** (migration 031_army_list_v3.sql):
```sql
-- Source: src-tauri/migrations/031_army_list_v3.sql (verified in codebase)
-- Step 1: Rename old table
ALTER TABLE army_list_units RENAME TO army_list_units_old;
-- Step 2: Create new table with CHECK constraints
CREATE TABLE army_list_units ( ... CHECK (...) );
-- Step 3: Copy data
INSERT INTO army_list_units (...) SELECT ... FROM army_list_units_old;
-- Step 4: Drop old table
DROP TABLE army_list_units_old;
```

**Critical:** Must wrap with `PRAGMA foreign_keys = OFF` / `ON` around table recreations, as done in migrations 022 and 028. [VERIFIED: codebase]

### Anti-Patterns to Avoid
- **ALTER TABLE ADD CHECK:** Not supported in SQLite -- will silently fail or error
- **Forgetting PRAGMA foreign_keys = OFF:** Table recreation breaks FK references from other tables if FKs are enforced during the rename-drop cycle
- **Indexes on already-indexed columns:** PK columns are auto-indexed; UNIQUE columns get implicit indexes. Don't double-index unit_overrides.unit_id (UNIQUE) or unit_rules_mapping.unit_id (UNIQUE)

## Complete FK Column Audit

### FK Columns Needing Indexes (26 total)

| # | Table | Column | Defined In | Has Index? | Needs Index? |
|---|-------|--------|-----------|------------|-------------|
| 1 | units | faction_id | 001 | NO | YES |
| 2 | painting_recipes | faction_id | 001 | NO | YES |
| 3 | painting_recipes | unit_id | 001 | NO | YES |
| 4 | recipe_steps | recipe_id | 001/022 | NO | YES |
| 5 | recipe_steps | paint_id | 001/022 | NO | YES |
| 6 | recipe_steps | alt_paint_id | 013/022 | NO | YES |
| 7 | recipe_steps | section_id | 018/022 | NO | YES |
| 8 | army_lists | faction_id | 001 | NO | YES |
| 9 | army_list_units | list_id | 031 | NO | YES |
| 10 | army_list_units | unit_id | 031 | NO | YES |
| 11 | army_list_units | leader_attached_to_id | 031 | NO | YES |
| 12 | unit_strategy_notes | unit_id | 001 | NO | YES |
| 13 | battle_logs | army_list_id | 001 | NO | YES |
| 14 | battle_logs | mvp_unit_id | 001 | NO | YES |
| 15 | battle_logs | underperforming_unit_id | 001 | NO | YES |
| 16 | image_assets | (entity_type, entity_id) | 001 | NO | YES (composite) |
| 17 | painting_sessions | unit_id | 005 | NO | YES |
| 18 | painting_sessions | recipe_id | 014 | NO | YES |
| 19 | painting_sessions | recipe_step_id | 014 | NO | YES |
| 20 | painting_sessions | recipe_section_id | 023 | NO | YES |
| 21 | wishlist_items | faction_id | 009 | NO | YES |
| 22 | unit_point_tiers | unit_id | 011 | NO | YES |
| 23 | unit_loadouts | unit_id | 011 | NO | YES |
| 24 | unit_loadout_wargear | loadout_id | 011 | NO | YES |
| 25 | recipe_sections | recipe_id | 018 | NO | YES |
| 26 | unit_recipe_assignments | unit_id | 021 | NO | YES |
| 27 | unit_recipe_assignments | recipe_id | 021 | NO | YES |
| 28 | unit_recipe_step_progress | assignment_id | 028 | NO | YES |
| 29 | unit_recipe_step_progress | recipe_step_id | 028 | NO | YES |
| 30 | army_list_enhancements | list_id | 031 | NO | YES |
| 31 | army_list_enhancements | army_list_unit_id | 031 | NO | YES |
| 32 | army_list_snapshots | list_id | 032 | YES (idx_army_list_snapshots_list_id) | NO -- already indexed |

### FK Columns With Implicit Indexes (skip -- UNIQUE constraint creates index)

| Table | Column | Why Skip |
|-------|--------|----------|
| unit_overrides | unit_id | UNIQUE constraint in 017 |
| unit_rules_mapping | unit_id | UNIQUE constraint in 026 |

**Net: 31 new indexes needed** (26 single-column FK + 1 composite for image_assets + 2 temporal + 2 already covered by UNIQUE = skip)

Wait -- let me recount. The table above lists 31 rows needing YES, minus army_list_snapshots (already indexed) = 30 FK indexes. Plus 2 temporal indexes = 32 total new `CREATE INDEX` statements. But image_assets is not an FK (it's a polymorphic pattern with no REFERENCES clause), so it's technically a discretionary performance index, not an FK index. I'll include it as recommended.

### Temporal Columns Needing DESC Indexes (2 total)

| Table | Column | Query Pattern |
|-------|--------|--------------|
| painting_sessions | session_date | ORDER BY session_date DESC (journal, dashboard) |
| battle_logs | battle_date | ORDER BY battle_date DESC (battle log list) |

## CHECK Constraint Analysis

### Columns Requiring CHECK Constraints

| # | Table | Column | Current Type | Proposed CHECK | Table Recreation Needed? |
|---|-------|--------|-------------|---------------|------------------------|
| 1 | units | points | INTEGER NULL | `points >= 0` | YES |
| 2 | units | painting_percentage | INTEGER NOT NULL DEFAULT 0 | `painting_percentage BETWEEN 0 AND 100` | YES |
| 3 | units | model_count | INTEGER NULL | `model_count >= 0` | YES |
| 4 | units | owned_count | INTEGER NULL | `owned_count >= 0` | YES |
| 5 | units | purchase_price_pence | INTEGER NULL | `purchase_price_pence >= 0` | YES |
| 6 | paints | quantity | INTEGER NULL | `quantity >= 0` | YES (separate table) |
| 7 | paints | purchase_price_pence | INTEGER NULL | `purchase_price_pence >= 0` | YES |
| 8 | army_list_units | points_override | INTEGER NULL | `points_override >= 0` | NO -- table was recreated in 031, can add CHECK |
| 9 | unit_point_tiers | points | INTEGER NOT NULL | `points >= 0` | YES |
| 10 | unit_point_tiers | model_count | INTEGER NOT NULL | `model_count > 0` | YES |
| 11 | painting_sessions | duration_minutes | INTEGER NOT NULL | `duration_minutes > 0` | YES |
| 12 | army_list_enhancements | enhancement_points | INTEGER NOT NULL DEFAULT 0 | `enhancement_points >= 0` | NO -- can recreate, created in 031 |
| 13 | synced_unit_points | points | INTEGER NOT NULL DEFAULT 0 | `points >= 0` | Discretionary (synced data) |
| 14 | synced_enhancements | points | INTEGER NOT NULL | `points >= 0` | Discretionary (synced data) |

**Core tables needing recreation for CHECK constraints (D-05 scope):**

1. **units** -- 5 CHECK columns (points, painting_percentage, model_count, owned_count, purchase_price_pence). This is the largest and most complex table (22+ columns after all ALTER TABLEs). Many other tables have FKs pointing to units.id.
2. **paints** -- 2 CHECK columns (quantity, purchase_price_pence). Referenced by recipe_steps.paint_id and recipe_steps.alt_paint_id.
3. **unit_point_tiers** -- 2 CHECK columns (points, model_count)
4. **painting_sessions** -- 1 CHECK column (duration_minutes). Has 5 FK columns pointing outward.

**Tables that can add CHECK via recreation but are simpler:**
5. **army_list_units** -- Already recreated in 031; could add points_override >= 0 CHECK. But recreating AGAIN means another rename-create-copy-drop cycle.
6. **army_list_enhancements** -- Created in 031; same consideration.

### Recommendation on CHECK Scope

The requirements explicitly name: `points >= 0`, `quantity >= 0`, `painting_percentage BETWEEN 0 AND 100`. I recommend limiting table recreations to the **minimum set** that covers these three constraints:

- **units** table recreation: `points >= 0`, `painting_percentage BETWEEN 0 AND 100` (also add model_count >= 0, owned_count >= 0, purchase_price_pence >= 0 since we're already recreating)
- **paints** table recreation: `quantity >= 0` (also add purchase_price_pence >= 0)

This covers the requirements with only 2 table recreations (the highest-risk operation). unit_point_tiers and painting_sessions CHECKs are discretionary additions.

### Data Compliance Risk Assessment

All CHECK constraints use `>= 0` or `BETWEEN 0 AND 100` patterns. These are at risk of failing only if existing data has:
- Negative points/quantities (very unlikely -- UI uses number inputs with no negative option)
- painting_percentage outside 0-100 (unlikely -- UI slider constrained to 0-100)

**Mitigation:** Include a data cleanup pass BEFORE table recreation:
```sql
-- Clamp any invalid data before recreating tables
UPDATE units SET points = 0 WHERE points < 0;
UPDATE units SET painting_percentage = 0 WHERE painting_percentage < 0;
UPDATE units SET painting_percentage = 100 WHERE painting_percentage > 100;
UPDATE units SET model_count = 0 WHERE model_count IS NOT NULL AND model_count < 0;
UPDATE units SET owned_count = 0 WHERE owned_count IS NOT NULL AND owned_count < 0;
UPDATE paints SET quantity = 0 WHERE quantity IS NOT NULL AND quantity < 0;
```

## Migration File Strategy

### Decision D-08 says single file, but research recommends two

D-08 specifies a single migration 033. However, index creation is idempotent and low-risk, while table recreation is high-risk and non-idempotent. If the planner prefers to follow D-08 exactly, all statements can go in 033. The planner should decide.

### Option A: Single Migration (per D-08)
- `033_database_hardening.sql`: All indexes + all table recreations
- Pro: Simpler, single version bump
- Con: If table recreation fails mid-way, indexes may or may not have been applied (depends on SQLite transaction behavior within tauri-plugin-sql migration runner)

### Option B: Two Migrations (researcher recommendation)
- `033_database_hardening_indexes.sql`: All `CREATE INDEX IF NOT EXISTS` statements (idempotent, safe)
- `034_database_hardening_checks.sql`: All table recreation + CHECK constraints
- Pro: If 034 fails, 033's indexes are already applied and provide value
- Con: Two migration registrations in lib.rs

### Migration Registration in lib.rs

Each new migration file requires a `Migration` struct entry in `get_migrations()` in `src-tauri/src/lib.rs`. Current highest version is 32. New migration(s) would be version 33 (and optionally 34). [VERIFIED: codebase scan of lib.rs]

```rust
// Source: pattern from src-tauri/src/lib.rs (verified)
Migration {
    version: 33,
    description: "database_hardening",
    sql: include_str!("../migrations/033_database_hardening.sql"),
    kind: MigrationKind::Up,
},
```

## Complete Index SQL (30 FK + 1 composite + 2 temporal = 33 statements)

```sql
-- FK indexes on units referencing factions
CREATE INDEX IF NOT EXISTS idx_units_faction_id ON units(faction_id);

-- FK indexes on painting_recipes
CREATE INDEX IF NOT EXISTS idx_painting_recipes_faction_id ON painting_recipes(faction_id);
CREATE INDEX IF NOT EXISTS idx_painting_recipes_unit_id ON painting_recipes(unit_id);

-- FK indexes on recipe_steps (rebuilt in 022)
CREATE INDEX IF NOT EXISTS idx_recipe_steps_recipe_id ON recipe_steps(recipe_id);
CREATE INDEX IF NOT EXISTS idx_recipe_steps_paint_id ON recipe_steps(paint_id);
CREATE INDEX IF NOT EXISTS idx_recipe_steps_alt_paint_id ON recipe_steps(alt_paint_id);
CREATE INDEX IF NOT EXISTS idx_recipe_steps_section_id ON recipe_steps(section_id);

-- FK indexes on army_lists
CREATE INDEX IF NOT EXISTS idx_army_lists_faction_id ON army_lists(faction_id);

-- FK indexes on army_list_units (rebuilt in 031)
CREATE INDEX IF NOT EXISTS idx_army_list_units_list_id ON army_list_units(list_id);
CREATE INDEX IF NOT EXISTS idx_army_list_units_unit_id ON army_list_units(unit_id);
CREATE INDEX IF NOT EXISTS idx_army_list_units_leader_attached_to_id ON army_list_units(leader_attached_to_id);

-- FK indexes on unit_strategy_notes
CREATE INDEX IF NOT EXISTS idx_unit_strategy_notes_unit_id ON unit_strategy_notes(unit_id);

-- FK indexes on battle_logs
CREATE INDEX IF NOT EXISTS idx_battle_logs_army_list_id ON battle_logs(army_list_id);
CREATE INDEX IF NOT EXISTS idx_battle_logs_mvp_unit_id ON battle_logs(mvp_unit_id);
CREATE INDEX IF NOT EXISTS idx_battle_logs_underperforming_unit_id ON battle_logs(underperforming_unit_id);

-- Composite index on image_assets (polymorphic lookup pattern)
CREATE INDEX IF NOT EXISTS idx_image_assets_entity ON image_assets(entity_type, entity_id);

-- FK indexes on painting_sessions
CREATE INDEX IF NOT EXISTS idx_painting_sessions_unit_id ON painting_sessions(unit_id);
CREATE INDEX IF NOT EXISTS idx_painting_sessions_recipe_id ON painting_sessions(recipe_id);
CREATE INDEX IF NOT EXISTS idx_painting_sessions_recipe_step_id ON painting_sessions(recipe_step_id);
CREATE INDEX IF NOT EXISTS idx_painting_sessions_recipe_section_id ON painting_sessions(recipe_section_id);

-- FK indexes on wishlist_items
CREATE INDEX IF NOT EXISTS idx_wishlist_items_faction_id ON wishlist_items(faction_id);

-- FK indexes on unit_point_tiers
CREATE INDEX IF NOT EXISTS idx_unit_point_tiers_unit_id ON unit_point_tiers(unit_id);

-- FK indexes on unit_loadouts
CREATE INDEX IF NOT EXISTS idx_unit_loadouts_unit_id ON unit_loadouts(unit_id);

-- FK indexes on unit_loadout_wargear
CREATE INDEX IF NOT EXISTS idx_unit_loadout_wargear_loadout_id ON unit_loadout_wargear(loadout_id);

-- FK indexes on recipe_sections
CREATE INDEX IF NOT EXISTS idx_recipe_sections_recipe_id ON recipe_sections(recipe_id);

-- FK indexes on unit_recipe_assignments
CREATE INDEX IF NOT EXISTS idx_unit_recipe_assignments_unit_id ON unit_recipe_assignments(unit_id);
CREATE INDEX IF NOT EXISTS idx_unit_recipe_assignments_recipe_id ON unit_recipe_assignments(recipe_id);

-- FK indexes on unit_recipe_step_progress (rebuilt in 028)
CREATE INDEX IF NOT EXISTS idx_unit_recipe_step_progress_assignment_id ON unit_recipe_step_progress(assignment_id);
CREATE INDEX IF NOT EXISTS idx_unit_recipe_step_progress_recipe_step_id ON unit_recipe_step_progress(recipe_step_id);

-- FK indexes on army_list_enhancements (created in 031)
CREATE INDEX IF NOT EXISTS idx_army_list_enhancements_list_id ON army_list_enhancements(list_id);
CREATE INDEX IF NOT EXISTS idx_army_list_enhancements_army_list_unit_id ON army_list_enhancements(army_list_unit_id);

-- Temporal DESC indexes (DBH-02)
CREATE INDEX IF NOT EXISTS idx_painting_sessions_session_date ON painting_sessions(session_date DESC);
CREATE INDEX IF NOT EXISTS idx_battle_logs_battle_date ON battle_logs(battle_date DESC);
```

## Units Table Recreation (Full Column Inventory)

The `units` table is the most complex, having been modified by migrations 001, 006, 007 (indirectly via unit_strategy_notes), and 008. Here is the complete column list after all migrations:

```sql
-- Source: compiled from migrations 001 + 006 + 008 (verified in codebase)
CREATE TABLE units (
    id                     INTEGER PRIMARY KEY AUTOINCREMENT,
    faction_id             INTEGER NOT NULL REFERENCES factions(id) ON DELETE RESTRICT,
    name                   TEXT    NOT NULL,
    category               TEXT,
    unit_type              TEXT,
    model_count            INTEGER CHECK (model_count IS NULL OR model_count >= 0),
    owned_count            INTEGER CHECK (owned_count IS NULL OR owned_count >= 0),
    points                 INTEGER CHECK (points IS NULL OR points >= 0),
    status_assembly        INTEGER NOT NULL DEFAULT 0,
    status_painting        TEXT NOT NULL DEFAULT 'Not Started',
    painting_percentage    INTEGER NOT NULL DEFAULT 0 CHECK (painting_percentage BETWEEN 0 AND 100),
    status_basing          INTEGER NOT NULL DEFAULT 0,
    status_varnished       INTEGER NOT NULL DEFAULT 0,
    is_active_project      INTEGER NOT NULL DEFAULT 0,
    priority               INTEGER,
    target_completion_date TEXT,
    purchase_date          TEXT,
    purchase_price         REAL,
    storage_location       TEXT,
    main_image_path        TEXT,
    notes                  TEXT,
    created_at             TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at             TEXT NOT NULL DEFAULT (datetime('now')),
    -- Added in 006_spend_pence.sql
    purchase_price_pence   INTEGER CHECK (purchase_price_pence IS NULL OR purchase_price_pence >= 0),
    -- Added in 008_enrichment.sql
    lore_notes             TEXT,
    undercoat              TEXT
);
```

**Warning:** The `units` table is referenced by FK from: army_list_units, unit_strategy_notes, painting_recipes, painting_sessions, unit_overrides, unit_point_tiers, unit_loadouts, unit_recipe_assignments, unit_rules_mapping, battle_logs (3 columns), image_assets (polymorphic). Recreation with `PRAGMA foreign_keys = OFF` is mandatory.

## Paints Table Recreation (Full Column Inventory)

```sql
-- Source: compiled from migrations 001 + 006 + 008 (verified in codebase)
CREATE TABLE paints (
    id                   INTEGER PRIMARY KEY AUTOINCREMENT,
    brand                TEXT    NOT NULL,
    name                 TEXT    NOT NULL,
    paint_type           TEXT    NOT NULL,
    color_family         TEXT,
    hex_color            TEXT,
    owned                INTEGER NOT NULL DEFAULT 0,
    quantity             INTEGER CHECK (quantity IS NULL OR quantity >= 0),
    running_low          INTEGER NOT NULL DEFAULT 0,
    wishlist             INTEGER NOT NULL DEFAULT 0,
    notes                TEXT,
    created_at           TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at           TEXT    NOT NULL DEFAULT (datetime('now')),
    -- Added in 006_spend_pence.sql
    purchase_price_pence INTEGER CHECK (purchase_price_pence IS NULL OR purchase_price_pence >= 0),
    -- Added in 008_enrichment.sql
    purchase_date        TEXT
);
```

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| FK index identification | Manual table-by-table review | Scan all REFERENCES clauses in migrations (done above) | Easy to miss ALTER TABLE additions |
| CHECK constraint addition | ALTER TABLE ADD CHECK | Rename-create-copy-drop pattern (migration 031 reference) | SQLite does not support ALTER TABLE ADD CHECK |
| WAL mode activation | Custom connection wrapper | PRAGMA statements in existing singleton | Already proven in rules-client.ts |

## Common Pitfalls

### Pitfall 1: Forgetting PRAGMA foreign_keys = OFF During Table Recreation
**What goes wrong:** SQLite enforces FK constraints during the DROP TABLE step, causing the migration to fail because other tables reference the table being dropped.
**Why it happens:** The renamed table still has FK references pointing at it until the new table takes over.
**How to avoid:** Wrap table recreation blocks with `PRAGMA foreign_keys = OFF` at the start and `PRAGMA foreign_keys = ON` at the end. Proven in migrations 022 and 028.
**Warning signs:** "FOREIGN KEY constraint failed" error during migration.

### Pitfall 2: Losing Autoincrement Sequence After Table Recreation
**What goes wrong:** If you don't copy rows with their original `id` values, new inserts may reuse old IDs, breaking FK references in other tables.
**Why it happens:** AUTOINCREMENT in SQLite tracks the max-ever-used ID in sqlite_sequence. If you copy data preserving IDs, the sequence is updated correctly.
**How to avoid:** Always `INSERT INTO new_table (id, ...) SELECT id, ... FROM old_table` -- explicitly include the `id` column. The sqlite_sequence row updates automatically.

### Pitfall 3: NULL Columns and CHECK Constraints
**What goes wrong:** `CHECK (points >= 0)` rejects NULL values in SQLite.
**Why it happens:** SQLite CHECK constraints evaluate to NULL for NULL inputs, which is treated as "not false" and passes. Actually, this is NOT a pitfall -- SQLite's CHECK treats NULL as passing. But it's worth verifying.
**How to avoid:** For nullable columns, use `CHECK (column IS NULL OR column >= 0)` to be explicit about intent. This makes the constraint self-documenting even though SQLite would pass NULL anyway.
**Warning signs:** None -- SQLite handles this correctly, but explicit `IS NULL OR` is clearer.

### Pitfall 4: Migration Order and Index Creation on Recreated Tables
**What goes wrong:** If you create an index on a table, then rename-create-copy-drop that same table, the index is lost (it was on the old table that was dropped).
**Why it happens:** SQLite indexes are tied to the specific table object, not the table name.
**How to avoid:** Create indexes AFTER all table recreations, not before. Or re-create the indexes after the table recreation block.

### Pitfall 5: Existing hobby_goals Table Already Has CHECK Constraints
**What goes wrong:** Attempting to add CHECK constraints to hobby_goals when it already has them from migration 010.
**How to avoid:** hobby_goals already has `CHECK (target_count > 0)` and `CHECK (timeframe IN ('month', 'quarter'))`. Do not touch this table. [VERIFIED: migration 010]

## Code Examples

### client.ts Change (ERR-05)
```typescript
// Source: src/db/rules-client.ts pattern (verified in codebase)
export async function getDb(): Promise<Database> {
  if (!_dbPromise) {
    _dbPromise = (async () => {
      const db = await Database.load("sqlite:hobbyforge.db");
      await db.execute("PRAGMA foreign_keys = ON");
      await db.execute("PRAGMA journal_mode = WAL");
      await db.execute("PRAGMA busy_timeout = 10000");
      return db;
    })().catch((err) => {
      _dbPromise = null;
      throw err;
    });
  }
  return _dbPromise;
}
```

### lib.rs Migration Registration
```rust
// Source: src-tauri/src/lib.rs pattern (verified in codebase)
Migration {
    version: 33,
    description: "database_hardening",
    sql: include_str!("../migrations/033_database_hardening.sql"),
    kind: MigrationKind::Up,
},
```

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4 + React Testing Library 16 |
| Config file | vitest.config.ts (exists) |
| Quick run command | `pnpm test` |
| Full suite command | `pnpm test` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ERR-05 | WAL + busy_timeout PRAGMAs set on main DB | unit | `pnpm test -- tests/database-hardening/walMode.test.ts -x` | Wave 0 |
| DBH-01 | FK columns have indexes | unit (query sqlite_master) | `pnpm test -- tests/database-hardening/fkIndexes.test.ts -x` | Wave 0 |
| DBH-02 | Temporal columns have DESC indexes | unit (query sqlite_master) | `pnpm test -- tests/database-hardening/temporalIndexes.test.ts -x` | Wave 0 |
| DBH-03 | CHECK constraints reject invalid data | unit (INSERT negative values, expect error) | `pnpm test -- tests/database-hardening/checkConstraints.test.ts -x` | Wave 0 |

### Sampling Rate
- **Per task commit:** `pnpm test`
- **Per wave merge:** `pnpm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/database-hardening/walMode.test.ts` -- verify PRAGMA journal_mode returns 'wal'
- [ ] `tests/database-hardening/fkIndexes.test.ts` -- verify sqlite_master contains expected indexes
- [ ] `tests/database-hardening/checkConstraints.test.ts` -- verify negative value INSERT throws

**Note:** Testing PRAGMAs and indexes in Vitest requires mocking the Tauri SQL plugin. The existing test patterns use `vi.mock` for React Query hooks. For migration-level tests, the project has precedent in `tests/foundation/migration004.test.ts` and `tests/hobby-journal/migration005.test.ts`. However, testing actual SQLite behavior (PRAGMA results, constraint enforcement) would require a real SQLite connection (e.g., better-sqlite3 in test). The planner should decide whether to test at the migration SQL level or at the integration level.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| No WAL on main DB | WAL mode (rules-client since Phase 15) | Phase 15 (2026-05-04) | Concurrent read safety during writes |
| No FK indexes | FK indexes standard practice | Always (SQLite docs) | SQLite does NOT auto-create indexes for FK columns [CITED: sqlite.org/foreignkeys.html] |

**Key SQLite fact:** Unlike some databases, SQLite does NOT automatically create indexes on foreign key columns. Only PRIMARY KEY and UNIQUE columns get automatic indexes. This is why all FK columns in this schema are missing indexes. [CITED: sqlite.org/foreignkeys.html section 6]

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Existing data has no negative points/quantities/percentages | CHECK Constraint Analysis | Migration would fail on table recreation; mitigated by data cleanup pass |
| A2 | image_assets composite index (entity_type, entity_id) improves polymorphic lookups | FK Column Audit | Low risk -- worst case is an unused index taking minimal space |
| A3 | PRAGMA journal_mode = WAL is persistent per-database (survives reconnection) | WAL Mode | Actually WAL is persistent in SQLite -- once set, it stays until explicitly changed. But the PRAGMA in client.ts ensures it on every connection regardless. Low risk. |

## Open Questions

1. **Single migration (D-08) vs two migrations (research recommendation)?**
   - D-08 says single file 033
   - Research recommends splitting indexes from CHECK constraints
   - Recommendation: Follow D-08 (single file) since the user locked this decision. Put indexes first, then table recreations, so indexes are already created before recreation potentially fails.

2. **How many tables to recreate for CHECK constraints?**
   - Minimum: units + paints (covers all 3 required constraints)
   - Extended: + unit_point_tiers + painting_sessions (additional safety)
   - Recommendation: Minimum scope (units + paints only) unless planner decides otherwise

## Project Constraints (from CLAUDE.md)

- Stack: Tauri 2 + React 19 + TypeScript 5 + Vite 6 + TailwindCSS 4 + SQLite
- Two SQLite databases: hobbyforge.db (main) and rules.db (Wahapedia rules)
- DB queries use `$1, $2` positional parameter syntax (Tauri plugin-sql requirement)
- FK enforcement via `PRAGMA foreign_keys = ON` on every connection
- Migrations run automatically at startup in filename order; never edit existing migration files
- No ESLint or Prettier -- strict TypeScript enforces quality
- Test framework: Vitest 4 + React Testing Library 16

## Sources

### Primary (HIGH confidence)
- `src/db/client.ts` -- current main DB singleton implementation
- `src/db/rules-client.ts` -- WAL + busy_timeout reference implementation
- `src-tauri/src/lib.rs` -- migration registration pattern (32 migrations currently)
- `src-tauri/migrations/001_core_schema.sql` through `032_army_list_snapshots.sql` -- all 32 migration files scanned for FK columns and existing indexes
- `src-tauri/migrations/031_army_list_v3.sql` -- rename-create-copy-drop pattern reference
- `src-tauri/migrations/022_paintless_steps.sql` -- PRAGMA foreign_keys OFF pattern reference

### Secondary (MEDIUM confidence)
- SQLite documentation on FK indexes and CHECK constraints [CITED: sqlite.org/foreignkeys.html]

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new packages, only SQL migrations and 2 lines of TypeScript
- Architecture: HIGH -- all patterns already proven in existing codebase (rules-client.ts, migration 031)
- Pitfalls: HIGH -- drawn from actual SQLite behavior and existing project migration patterns

**Research date:** 2026-05-22
**Valid until:** Indefinite (SQLite behavior is stable; project schema is the primary research subject)
