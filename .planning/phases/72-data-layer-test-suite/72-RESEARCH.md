# Phase 72: Data-Layer Test Suite - Research

**Researched:** 2026-05-13
**Domain:** Vitest + better-sqlite3 data-layer testing
**Confidence:** HIGH

## Summary

Phase 72 introduces a new category of test to HobbyForge: data-layer tests that execute real SQL against an in-memory SQLite database via better-sqlite3. The existing test suite (85+ test files) operates exclusively with mocked database calls or string-matching on migration SQL. This phase bridges that gap by running the full 23-migration chain and verifying schema shape, FK behavior, and data persistence at the SQL level.

The technical approach is straightforward: better-sqlite3 provides a synchronous, native-binding SQLite driver that creates in-memory databases with `:memory:`. Each test file gets a fresh database, runs all migrations via `db.exec()`, then uses `db.prepare().run()/.get()/.all()` to INSERT/SELECT/DELETE and verify behavior. The `// @vitest-environment node` inline comment overrides the global jsdom environment per file, avoiding any DOM polyfill overhead.

**Primary recommendation:** Install better-sqlite3 + @types/better-sqlite3 as devDependencies, create a shared db-helpers.ts that reads migration files from disk and executes them in order, and use the `// @vitest-environment node` inline comment (not vitest.config.ts projects) to keep configuration changes minimal.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- D-01: Install better-sqlite3 as devDependency (chosen over node:sqlite due to Vitest 4.x bug #7177)
- D-02: Shared helper `tests/data-layer/db-helpers.ts` — creates in-memory DB, reads migration SQL files, executes sequentially, sets PRAGMA foreign_keys = ON
- D-03: Helper reads SQL files via readFileSync (same as existing migration tests)
- D-04: Test all 23 hobbyforge migrations execute without errors (fresh install parity)
- D-05: Test all 3 rules migrations execute without errors (separate DB)
- D-06: Verify migration count in lib.rs matches files on disk
- D-07: Paintless step round-trip test (paint_id = NULL persists)
- D-08: Non-destructive save round-trip (IDs preserved after UPDATE)
- D-09: Section deletion cascades to steps (ON DELETE CASCADE)
- D-10: ON DELETE SET NULL for session recipe_section_id
- D-11: Dual-write test (recipe_section_id + section_name store independently)
- D-12: Assert expected tables exist after full migration chain
- D-13: Assert specific columns from recent migrations exist (020, 022, 023)
- D-14: Use PRAGMA table_info() for column introspection
- D-15: File organization in tests/data-layer/ with 4 test files + db-helpers.ts

### Claude's Discretion
- Whether to add factory helpers (createTestRecipe, etc.) in db-helpers.ts vs inline INSERTs
- Whether schema-shape tests enumerate ALL tables or just recent ones
- Whether rules migration parity is a separate file or folded into migration-parity.test.ts
- Exact better-sqlite3 version to install

### Deferred Ideas (OUT OF SCOPE)
None
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| TST-01 | Data-layer tests cover migration parity, recipe persistence (paintless steps, non-destructive save round-trip), session section FK, and schema shape validation | All four test areas mapped to decisions D-04 through D-14; better-sqlite3 API verified; migration files inventoried (23 hobbyforge + 3 rules) |
</phase_requirements>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Migration execution | Database / Storage | -- | Tests verify SQL migrations produce correct schema |
| FK behavior (CASCADE, SET NULL) | Database / Storage | -- | SQLite FK enforcement is a DB-engine feature |
| Data round-trip (INSERT/SELECT) | Database / Storage | -- | Tests verify data integrity at storage level |
| Schema introspection | Database / Storage | -- | PRAGMA table_info is a SQLite-only capability |
| Test infrastructure | Build / Dev tooling | -- | Vitest + better-sqlite3 are dev-only concerns |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| better-sqlite3 | 12.10.0 | In-memory SQLite for tests | Synchronous API, native bindings, `:memory:` support, no Vitest import bug [VERIFIED: npm registry] |
| @types/better-sqlite3 | 7.6.13 | TypeScript types | Matches better-sqlite3 [VERIFIED: npm registry] |
| vitest | ^4.1.5 | Test runner | Already installed [VERIFIED: package.json] |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| node:fs | built-in | Read migration SQL files | readFileSync in db-helpers.ts |
| node:path | built-in | Resolve migration file paths | Path resolution to src-tauri/migrations/ |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| better-sqlite3 | node:sqlite (built-in) | Vitest 4.x strips the import (#7177) -- blocked [VERIFIED: CONTEXT.md decision] |
| better-sqlite3 | sql.js (wasm) | Slower, async API, unnecessary complexity for tests |

**Installation:**
```bash
pnpm add -D better-sqlite3 @types/better-sqlite3
```

**Version verification:**
- better-sqlite3: 12.10.0 (2026-05-13) [VERIFIED: npm registry]
- @types/better-sqlite3: 7.6.13 (2026-05-13) [VERIFIED: npm registry]
- Node.js: v24.13.0 (compatible with better-sqlite3 12.x which supports Node 14+) [VERIFIED: node --version]

## Architecture Patterns

### System Architecture Diagram

```
Test file (e.g. recipe-persistence.test.ts)
    |
    | imports
    v
db-helpers.ts
    |
    | 1. new Database(':memory:')
    | 2. db.pragma('foreign_keys = ON')
    | 3. readFileSync() each migration SQL
    | 4. db.exec(sql) in version order
    |
    v
better-sqlite3 in-memory DB
    |
    | db.prepare().run()  -- INSERT test data
    | db.prepare().get()  -- SELECT and verify
    | db.prepare().all()  -- Multi-row queries
    | db.pragma('table_info(X)')  -- Schema inspection
    |
    v
Assertions (expect)
```

### Recommended Project Structure
```
tests/
  data-layer/
    db-helpers.ts              # Shared: createTestDb(), factory helpers
    migration-parity.test.ts   # D-04, D-05, D-06
    recipe-persistence.test.ts # D-07, D-08, D-09
    session-section-fk.test.ts # D-10, D-11
    schema-shape.test.ts       # D-12, D-13, D-14
```

### Pattern 1: In-Memory Database with Migration Chain
**What:** Create a fresh in-memory SQLite database and run all migrations for each test file.
**When to use:** Every data-layer test file.
**Example:**
```typescript
// Source: better-sqlite3 docs (context7) + project migration pattern
import Database from "better-sqlite3";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

const HOBBYFORGE_MIGRATIONS = [
  "001_core_schema.sql",
  "002_seed_factions.sql",
  "003_seed_data.sql",
  // ... all 23 in order
  "023_session_section_fk.sql",
];

const RULES_MIGRATIONS = [
  "rules_001_schema.sql",
  "rules_002_wargear_abilities.sql",
  "rules_003_sync_meta_counts.sql",
];

export function createHobbyforgeDb(): Database.Database {
  const db = new Database(":memory:");
  db.pragma("foreign_keys = ON");
  for (const file of HOBBYFORGE_MIGRATIONS) {
    const sql = readFileSync(
      resolve(repoRoot, "src-tauri/migrations", file),
      "utf-8"
    );
    db.exec(sql);
  }
  return db;
}
```

### Pattern 2: Per-File Environment Override
**What:** Use inline comment to run data-layer tests in Node environment instead of jsdom.
**When to use:** Every file in tests/data-layer/.
**Example:**
```typescript
// @vitest-environment node
// Source: Vitest docs (context7) - per-file environment override

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import type Database from "better-sqlite3";
import { createHobbyforgeDb } from "./db-helpers";

let db: Database.Database;

beforeEach(() => {
  db = createHobbyforgeDb();
});

afterEach(() => {
  db.close();
});
```

### Pattern 3: PRAGMA table_info for Schema Introspection
**What:** Use SQLite's built-in PRAGMA to verify column existence, types, and nullability.
**When to use:** schema-shape tests (D-12, D-13, D-14).
**Example:**
```typescript
// Source: SQLite documentation + better-sqlite3 pragma() method
interface ColumnInfo {
  cid: number;
  name: string;
  type: string;
  notnull: number;  // 0 or 1
  dflt_value: string | null;
  pk: number;       // 0 or 1
}

// better-sqlite3 pragma() returns typed results
const columns = db.pragma("table_info(recipe_sections)") as ColumnInfo[];
const sectionType = columns.find((c) => c.name === "section_type");
expect(sectionType).toBeDefined();
expect(sectionType!.notnull).toBe(0); // nullable
```

### Pattern 4: Table Existence Check
**What:** Query sqlite_master to verify tables exist after migration.
**When to use:** D-12 table existence assertions.
**Example:**
```typescript
// Source: SQLite documentation
const tables = db
  .prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name")
  .all() as { name: string }[];
const tableNames = tables.map((t) => t.name);
expect(tableNames).toContain("painting_recipes");
expect(tableNames).toContain("recipe_sections");
```

### Anti-Patterns to Avoid
- **Sharing database instances across tests:** Each test (or test file) should get a fresh in-memory DB. better-sqlite3 in-memory DBs are cheap to create. Sharing state between tests creates ordering dependencies.
- **Using $1/$2 parameter syntax:** better-sqlite3 uses `?` positional or `@name`/`:name`/`$name` named parameters. The `$1, $2` syntax is Tauri plugin-sql specific and will NOT work with better-sqlite3. [VERIFIED: Context7 better-sqlite3 docs]
- **Forgetting PRAGMA foreign_keys = ON:** SQLite defaults to FK enforcement OFF. Production code sets it ON in client.ts. Tests MUST mirror this or FK tests will silently pass without actually enforcing constraints. [VERIFIED: src/db/client.ts]
- **Running setup.ts for data-layer tests:** The global setup file imports jest-dom and polyfills DOM APIs. Data-layer tests don't need this. The `// @vitest-environment node` comment avoids jsdom entirely, but if setupFiles still runs, it will try to import @testing-library/jest-dom which is harmless but unnecessary.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| SQLite in tests | Custom WASM wrapper | better-sqlite3 `:memory:` | Native performance, synchronous API, exact SQLite behavior match |
| Schema introspection | Manual SQL parsing | `PRAGMA table_info(table)` | SQLite built-in, returns structured column metadata |
| Table enumeration | Guessing table names | `sqlite_master` query | Authoritative system table |
| FK behavior testing | Mocking FK logic | Real SQLite FK enforcement | Only real DB catches subtle FK issues (CASCADE vs SET NULL ordering) |

## Common Pitfalls

### Pitfall 1: Migration 022 Disables FK Temporarily
**What goes wrong:** Migration 022 (paintless_steps) runs `PRAGMA foreign_keys = OFF` at the start and `PRAGMA foreign_keys = ON` at the end because it rebuilds recipe_steps via a temp table. If the migration chain is interrupted between these pragmas, subsequent FK tests will silently pass.
**Why it happens:** SQLite requires FK to be OFF during table rebuilds that involve DROP + RENAME.
**How to avoid:** Run the full migration chain atomically. After all migrations complete, explicitly verify `db.pragma("foreign_keys")` returns `[{ foreign_keys: 1 }]` before running FK-dependent tests.
**Warning signs:** FK violation tests passing when they should fail.

### Pitfall 2: better-sqlite3 Native Binding Compilation
**What goes wrong:** better-sqlite3 requires native compilation (node-gyp or prebuild). On Windows, this needs Visual Studio Build Tools or prebuild binaries.
**Why it happens:** better-sqlite3 is a native Node.js addon, not pure JS.
**How to avoid:** better-sqlite3 12.x ships prebuilt binaries for Windows/macOS/Linux on Node 14-24. `pnpm add -D better-sqlite3` should download prebuilt binary automatically. If it fails, install Windows Build Tools (`npm install --global windows-build-tools`) or check that node-gyp prerequisites are met.
**Warning signs:** `pnpm add` errors mentioning gyp, node-pre-gyp, or prebuild-install. [ASSUMED]

### Pitfall 3: Migration File Ordering
**What goes wrong:** Migrations must run in exact version order (1-23 for hobbyforge, 1-3 for rules). Running out of order causes FK reference errors (e.g., recipe_steps references painting_recipes which must exist first).
**Why it happens:** The helper hardcodes the migration list. If a new migration is added and the list is not updated, the test suite silently skips it.
**How to avoid:** D-06 addresses this -- test that the count of migrations in the helper matches lib.rs registration count. Additionally, read lib.rs to extract the authoritative migration list rather than hardcoding it, or at minimum hardcode and assert count parity.
**Warning signs:** Migration parity test (D-06) failing after a new migration is added.

### Pitfall 4: Seed Data Dependencies in Tests
**What goes wrong:** Migrations 002 and 003 seed faction data. Recipe persistence tests need a faction to create a unit, and a unit to create a recipe (depending on FK constraints). Tests that INSERT a recipe without first having the seed data or creating prerequisite rows will hit FK violations.
**Why it happens:** The full migration chain includes seed data, so createHobbyforgeDb() provides seeded factions. But tests that INSERT units still need to reference an existing faction_id.
**How to avoid:** Use factory helpers that know the seed data IDs, or INSERT test factions/units explicitly before testing recipe behavior. The seed migrations (002, 003) provide factions with known IDs.
**Warning signs:** `FOREIGN KEY constraint failed` errors in tests.

## Code Examples

### db-helpers.ts -- Full Helper
```typescript
// @vitest-environment node
// Source: better-sqlite3 Context7 docs + project convention

import Database from "better-sqlite3";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const migrationsDir = resolve(repoRoot, "src-tauri/migrations");

// Authoritative migration order — must match lib.rs get_migrations()
const HOBBYFORGE_MIGRATIONS = [
  "001_core_schema.sql",
  "002_seed_factions.sql",
  "003_seed_data.sql",
  "004_unit_playbook_stats.sql",
  "005_hobby_journal.sql",
  "006_spend_pence.sql",
  "007_datasheet_link.sql",
  "008_enrichment.sql",
  "009_wishlist.sql",
  "010_hobby_goals.sql",
  "011_point_tiers_loadouts.sql",
  "012_recipe_steps.sql",
  "013_step_photos_alt_paint.sql",
  "014_session_recipe_link.sql",
  "015_sync_errors.sql",
  "016_rules_snapshot.sql",
  "017_unit_overrides.sql",
  "018_recipe_sections.sql",
  "019_rules_favorites_notes.sql",
  "020_workflow_metadata.sql",
  "021_applied_recipe_assignments.sql",
  "022_paintless_steps.sql",
  "023_session_section_fk.sql",
] as const;

const RULES_MIGRATIONS = [
  "rules_001_schema.sql",
  "rules_002_wargear_abilities.sql",
  "rules_003_sync_meta_counts.sql",
] as const;

export function createHobbyforgeDb(): Database.Database {
  const db = new Database(":memory:");
  db.pragma("foreign_keys = ON");
  for (const file of HOBBYFORGE_MIGRATIONS) {
    const sql = readFileSync(resolve(migrationsDir, file), "utf-8");
    db.exec(sql);
  }
  // Migration 022 toggles FK off/on — verify it's back ON
  const fkState = db.pragma("foreign_keys") as { foreign_keys: number }[];
  if (fkState[0]?.foreign_keys !== 1) {
    throw new Error("PRAGMA foreign_keys not ON after migration chain");
  }
  return db;
}

export function createRulesDb(): Database.Database {
  const db = new Database(":memory:");
  for (const file of RULES_MIGRATIONS) {
    const sql = readFileSync(resolve(migrationsDir, file), "utf-8");
    db.exec(sql);
  }
  return db;
}

export const HOBBYFORGE_MIGRATION_COUNT = HOBBYFORGE_MIGRATIONS.length; // 23
export const RULES_MIGRATION_COUNT = RULES_MIGRATIONS.length; // 3
```

### Migration Parity Test Pattern
```typescript
// @vitest-environment node
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { createHobbyforgeDb, createRulesDb, HOBBYFORGE_MIGRATION_COUNT, RULES_MIGRATION_COUNT } from "./db-helpers";

describe("migration parity", () => {
  it("D-04: all 23 hobbyforge migrations execute without errors", () => {
    const db = createHobbyforgeDb(); // throws on SQL error
    db.close();
  });

  it("D-06: lib.rs migration count matches file count", () => {
    const libRs = readFileSync(
      resolve(repoRoot, "src-tauri/src/lib.rs"),
      "utf-8"
    );
    // Count Migration { entries in get_migrations()
    const matches = libRs.match(/Migration\s*\{/g);
    // Total = hobbyforge + rules
    expect(matches?.length).toBe(
      HOBBYFORGE_MIGRATION_COUNT + RULES_MIGRATION_COUNT
    );
  });
});
```

### FK Behavior Test Pattern
```typescript
// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import type Database from "better-sqlite3";
import { createHobbyforgeDb } from "./db-helpers";

let db: Database.Database;
beforeEach(() => { db = createHobbyforgeDb(); });
afterEach(() => { db.close(); });

describe("session section FK", () => {
  it("D-10: ON DELETE SET NULL — deleting section nullifies session FK", () => {
    // Create a recipe (seed factions exist from migration 002)
    const recipeId = db.prepare(
      "INSERT INTO painting_recipes (name) VALUES (?)"
    ).run("Test Recipe").lastInsertRowid;

    const sectionId = db.prepare(
      "INSERT INTO recipe_sections (recipe_id, name) VALUES (?, ?)"
    ).run(recipeId, "Base Coat").lastInsertRowid;

    const sessionId = db.prepare(
      "INSERT INTO painting_sessions (unit_id, recipe_id, recipe_section_id, start_time) VALUES (?, ?, ?, ?)"
    ).run(null, recipeId, sectionId, "2026-01-01T00:00:00").lastInsertRowid;

    // Delete the section
    db.prepare("DELETE FROM recipe_sections WHERE id = ?").run(sectionId);

    // Session should still exist with recipe_section_id = NULL
    const session = db.prepare(
      "SELECT recipe_section_id FROM painting_sessions WHERE id = ?"
    ).get(sessionId) as { recipe_section_id: number | null };

    expect(session).toBeDefined();
    expect(session.recipe_section_id).toBeNull();
  });
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| String-matching migration tests | SQL execution against in-memory SQLite | Phase 72 (new) | Catches runtime SQL errors, FK issues, schema mismatches |
| node:sqlite for test DBs | better-sqlite3 | Vitest 4.x era | Avoids import stripping bug #7177 |
| `environmentMatchGlobs` in vitest config | `// @vitest-environment node` inline comment or `projects` array | Vitest 4.x | Per-file override is simpler for small number of files |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | better-sqlite3 12.x ships prebuilt binaries for Windows + Node 24 | Pitfalls | Would need manual native compilation; install step may fail |
| A2 | painting_sessions allows null unit_id for test inserts | Code Examples | Test INSERTs may need a valid unit_id FK; would need to create test unit first |

## Open Questions

1. **Does painting_sessions.unit_id have a NOT NULL constraint?**
   - What we know: Migration 005 creates painting_sessions. Need to verify if unit_id is nullable.
   - What's unclear: The column constraint on unit_id.
   - Recommendation: The implementer should check migration 005 and 014 to determine if test sessions need a real unit_id or can use NULL. If NOT NULL, factory helpers should create a test unit under a seed faction.

2. **setupFiles behavior with `// @vitest-environment node`**
   - What we know: The global setupFiles (tests/setup.ts) imports jest-dom and polyfills DOM APIs.
   - What's unclear: Whether Vitest still runs setupFiles for files with `// @vitest-environment node`.
   - Recommendation: Vitest runs setupFiles regardless of environment. The DOM polyfills in setup.ts are harmless in Node environment (they check `typeof globalThis.ResizeObserver === "undefined"` etc.). No action needed unless import errors occur, in which case data-layer tests can be configured as a separate project in vitest.config.ts to skip setupFiles.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.5+ |
| Config file | vitest.config.ts (jsdom default; data-layer tests use inline `// @vitest-environment node`) |
| Quick run command | `pnpm test -- tests/data-layer/` |
| Full suite command | `pnpm test` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| TST-01a | Migration parity (23 hobbyforge) | integration | `pnpm test -- tests/data-layer/migration-parity.test.ts` | Wave 0 |
| TST-01b | Migration parity (3 rules) | integration | `pnpm test -- tests/data-layer/migration-parity.test.ts` | Wave 0 |
| TST-01c | Migration count matches lib.rs | integration | `pnpm test -- tests/data-layer/migration-parity.test.ts` | Wave 0 |
| TST-01d | Paintless step round-trip | integration | `pnpm test -- tests/data-layer/recipe-persistence.test.ts` | Wave 0 |
| TST-01e | Non-destructive save round-trip | integration | `pnpm test -- tests/data-layer/recipe-persistence.test.ts` | Wave 0 |
| TST-01f | Section delete cascades to steps | integration | `pnpm test -- tests/data-layer/recipe-persistence.test.ts` | Wave 0 |
| TST-01g | ON DELETE SET NULL for session FK | integration | `pnpm test -- tests/data-layer/session-section-fk.test.ts` | Wave 0 |
| TST-01h | Dual-write (section_id + section_name) | integration | `pnpm test -- tests/data-layer/session-section-fk.test.ts` | Wave 0 |
| TST-01i | Expected tables exist | integration | `pnpm test -- tests/data-layer/schema-shape.test.ts` | Wave 0 |
| TST-01j | Expected columns from recent migrations | integration | `pnpm test -- tests/data-layer/schema-shape.test.ts` | Wave 0 |

### Sampling Rate
- **Per task commit:** `pnpm test -- tests/data-layer/`
- **Per wave merge:** `pnpm test`
- **Phase gate:** Full suite green before /gsd-verify-work

### Wave 0 Gaps
- [ ] `tests/data-layer/db-helpers.ts` -- shared database creation helper
- [ ] `tests/data-layer/migration-parity.test.ts` -- D-04, D-05, D-06
- [ ] `tests/data-layer/recipe-persistence.test.ts` -- D-07, D-08, D-09
- [ ] `tests/data-layer/session-section-fk.test.ts` -- D-10, D-11
- [ ] `tests/data-layer/schema-shape.test.ts` -- D-12, D-13, D-14
- [ ] Package install: `pnpm add -D better-sqlite3 @types/better-sqlite3`

## Sources

### Primary (HIGH confidence)
- [Context7: /wiselibs/better-sqlite3] -- Database(), prepare(), run(), get(), all(), exec(), pragma() API
- [Context7: /vitest-dev/vitest] -- per-file `// @vitest-environment node` comment, projects config
- [npm registry: better-sqlite3@12.10.0] -- current version verified
- [npm registry: @types/better-sqlite3@7.6.13] -- current version verified
- [src-tauri/src/lib.rs] -- authoritative migration registration (23 hobbyforge + 3 rules)
- [src-tauri/migrations/*] -- all 26 SQL migration files on disk

### Secondary (MEDIUM confidence)
- [tests/datasheet/migration.test.ts] -- existing pattern for readFileSync + path resolution
- [vitest.config.ts] -- current test configuration (jsdom, verbose reporter)

### Tertiary (LOW confidence)
- [A1] better-sqlite3 prebuilt binary availability for Node 24 on Windows -- assumed based on general compatibility

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- better-sqlite3 is the only viable choice given the Vitest 4.x node:sqlite bug; version verified against npm registry
- Architecture: HIGH -- patterns are simple (in-memory DB + readFileSync + exec/prepare); all APIs verified via Context7
- Pitfalls: HIGH -- migration 022 FK toggle verified by reading the SQL file; parameter syntax difference confirmed via Context7

**Research date:** 2026-05-13
**Valid until:** 2026-06-13 (stable domain, no fast-moving dependencies)
