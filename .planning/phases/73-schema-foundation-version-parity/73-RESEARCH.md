# Phase 73: Schema Foundation + Version Parity - Research

**Researched:** 2026-05-14
**Domain:** SQLite migrations (Tauri plugin-sql) + Node.js scripting
**Confidence:** HIGH

## Summary

Phase 73 is a purely foundational phase: two SQL migration files, their Rust registration in lib.rs, and a standalone Node script for version parity checking. No UI, no query layer, no hooks. The scope is narrow and every pattern is already well-established in the codebase across 25 prior migrations.

The existing codebase confirms: migration 025 is the latest (tactical_role), so 026 and 027 are the correct next numbers. The version parity script is trivially implementable with Node built-ins (fs, path, process). The current version divergence (package.json=0.2.11, tauri.conf.json=0.2.12) confirms the need for this tooling and both files need bumping to 0.2.13 as part of this phase.

**Primary recommendation:** Follow the exact migration patterns from 024/025 for file naming, SQL syntax, and lib.rs registration. The version parity script should be a zero-dependency ESM file.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** unit_rules_mapping schema: unit_id (FK CASCADE), rules_datasheet_id (TEXT), match_status (TEXT DEFAULT 'auto'), source (TEXT), created_at/updated_at with datetime defaults
- **D-02:** UNIQUE constraint on unit_id -- one mapping per unit
- **D-03:** ON DELETE CASCADE on unit_id; no FK to rules.db (cross-DB TEXT copy pattern)
- **D-04:** battle_logs ALTER TABLE: forgotten_rules (TEXT/JSON array), mvp_notes (TEXT), underperformer_notes (TEXT), promoted_to_reminder (INTEGER NOT NULL DEFAULT 0)
- **D-05:** JSON array for forgotten_rules -- no junction table
- **D-06:** Existing mvp_unit_id and underperforming_unit_id FKs kept as-is
- **D-07:** Script at scripts/check-version.mjs registered as "check:version" in package.json
- **D-08:** Script reads package.json + src-tauri/tauri.conf.json, compares versions, exits 0/1
- **D-09:** No build-time integration -- manual pnpm check:version only

### Claude's Discretion
- Migration file naming (026_*.sql, 027_*.sql naming convention)
- Column ordering and DEFAULT expressions following existing conventions
- Script error message formatting

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DI-05 | package.json and tauri.conf.json versions match, enforced by a `pnpm check:version` script | D-07/D-08/D-09 define the script; version parity pattern documented below; current divergence (0.2.11 vs 0.2.12) confirmed |
</phase_requirements>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| unit_rules_mapping table | Database / Storage | -- | Pure schema DDL; no application logic in this phase |
| battle_logs after-action columns | Database / Storage | -- | ALTER TABLE only; query/UI in Phase 78 |
| Version parity check | Build Tooling (Node CLI) | -- | Standalone script, no runtime impact |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| tauri-plugin-sql | (bundled with Tauri 2) | Migration runner | Already manages all 25 existing migrations; auto-runs on app launch [VERIFIED: lib.rs] |
| Node.js built-ins (fs, path, process) | (system) | Version parity script | Zero dependencies; ESM import of JSON files [VERIFIED: project uses type: module] |

### Supporting
No additional libraries needed for this phase.

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Node script | Shell script (.ps1/.sh) | Node works cross-platform, already in the dev toolchain; shell scripts need platform-specific versions |
| Manual ALTER TABLE | Migration tool (knex, prisma) | Project uses raw SQL via tauri-plugin-sql; no ORM layer exists or is wanted |

## Architecture Patterns

### Migration Registration Pattern

Each migration in this project follows a strict pattern [VERIFIED: lib.rs lines 5-157]:

```
src-tauri/migrations/NNN_snake_case.sql    (SQL file)
src-tauri/src/lib.rs get_migrations()      (Rust registration)
```

The Rust registration entry has this exact shape:
```rust
Migration {
    version: N,           // sequential integer, next is 26
    description: "snake_case_name",
    sql: include_str!("../migrations/NNN_snake_case.sql"),
    kind: MigrationKind::Up,
},
```

Migrations are added to the `get_migrations()` vec (for hobbyforge.db), which is passed to `tauri_plugin_sql::Builder::default().add_migrations("sqlite:hobbyforge.db", get_migrations())`. They run automatically at app launch in version order.

### SQL Convention Pattern

From existing migrations [VERIFIED: 001_core_schema.sql, 024_points_import_history.sql, 025_tactical_role.sql]:

- CREATE TABLE uses `IF NOT EXISTS`
- ALTER TABLE does NOT use `IF NOT EXISTS` (SQLite does not support it for ALTER TABLE)
- `TEXT NOT NULL DEFAULT (datetime('now'))` for timestamps
- `INTEGER NOT NULL DEFAULT 0` for booleans (0|1)
- FKs: `REFERENCES table(id) ON DELETE CASCADE` or `ON DELETE SET NULL`
- UNIQUE constraints inline or as separate constraint
- Cross-DB references: plain TEXT columns (no FK), same pattern as weapon_name, detachment_name [VERIFIED: D-03, migration 024]

### Recommended File Structure
```
src-tauri/
  migrations/
    026_unit_rules_mapping.sql     # NEW: unit-to-rules mapping table
    027_battle_log_after_action.sql # NEW: battle_log game day columns
  src/
    lib.rs                         # MODIFIED: add migration entries 26 + 27

scripts/
  check-version.mjs               # NEW: version parity checker

package.json                       # MODIFIED: add check:version script, bump to 0.2.13
src-tauri/tauri.conf.json          # MODIFIED: bump to 0.2.13
```

### Anti-Patterns to Avoid
- **Editing existing migration files:** Never modify files 001-025. Tauri plugin-sql tracks applied migrations by version number; editing a previously-run migration has no effect (or worse, causes checksum mismatches in future versions). [VERIFIED: CLAUDE.md "never edit existing migration files"]
- **Using IF NOT EXISTS with ALTER TABLE:** SQLite does not support this syntax. ALTER TABLE will fail if the column already exists, but since migrations run once by version tracking, this is not a concern.
- **Adding FK to rules.db:** SQLite does not support cross-database foreign keys. The project uses TEXT copy columns for cross-DB references. [VERIFIED: D-03, migration 024 pattern]

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Migration ordering | Custom migration runner | tauri-plugin-sql migration system | Already handles versioning, ordering, and idempotency for 25 migrations [VERIFIED: lib.rs] |
| JSON file reading in Node | Custom parser | `import` with assert or `fs.readFileSync` + `JSON.parse` | Standard Node patterns; ESM can import JSON with import assertions |

## Common Pitfalls

### Pitfall 1: ALTER TABLE column already exists
**What goes wrong:** If a migration is run manually during development and then re-run by the plugin, ALTER TABLE fails because the column already exists.
**Why it happens:** Developer testing outside the migration system.
**How to avoid:** Always test with a fresh database or let the migration runner handle it. The plugin tracks applied versions and skips already-applied ones. [VERIFIED: tauri-plugin-sql behavior]
**Warning signs:** "duplicate column name" SQLite error on app launch.

### Pitfall 2: Version numbers in lib.rs must be sequential
**What goes wrong:** Skipping a version number or using a duplicate causes the migration runner to skip or error.
**Why it happens:** Copy-paste error when adding migration entries.
**How to avoid:** Current max version is 25. Next entries must be exactly 26 and 27. [VERIFIED: lib.rs shows versions 1-25]
**Warning signs:** Migration not appearing in database after app launch.

### Pitfall 3: ESM JSON import compatibility
**What goes wrong:** `import pkg from './package.json'` fails without proper handling in Node ESM.
**Why it happens:** Node ESM requires either import assertions (`with { type: 'json' }`) or `fs.readFileSync` + `JSON.parse`.
**How to avoid:** Use `fs.readFileSync` + `JSON.parse` -- it works in all Node versions and avoids the experimental import assertions flag. [ASSUMED]
**Warning signs:** `ERR_IMPORT_ASSERTION_TYPE_MISSING` error.

### Pitfall 4: Forgetting to bump BOTH version files
**What goes wrong:** The version parity script catches a mismatch but the developer forgets to update one file.
**Why it happens:** Exactly the scenario this phase addresses -- versions are currently diverged (0.2.11 vs 0.2.12).
**How to avoid:** Bump both files to 0.2.13 in the same commit. [VERIFIED: package.json=0.2.11, tauri.conf.json=0.2.12]
**Warning signs:** `pnpm check:version` exits non-zero.

## Code Examples

### Migration 026: unit_rules_mapping table
```sql
-- Source: D-01, D-02, D-03 from CONTEXT.md + migration 024 pattern
CREATE TABLE IF NOT EXISTS unit_rules_mapping (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    unit_id             INTEGER NOT NULL UNIQUE REFERENCES units(id) ON DELETE CASCADE,
    rules_datasheet_id  TEXT,
    match_status        TEXT    NOT NULL DEFAULT 'auto',
    source              TEXT,
    created_at          TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at          TEXT    NOT NULL DEFAULT (datetime('now'))
);
```

### Migration 027: battle_log after-action columns
```sql
-- Source: D-04, D-05, D-06 from CONTEXT.md + ALTER TABLE pattern from migration 025
ALTER TABLE battle_logs ADD COLUMN forgotten_rules TEXT;
ALTER TABLE battle_logs ADD COLUMN mvp_notes TEXT;
ALTER TABLE battle_logs ADD COLUMN underperformer_notes TEXT;
ALTER TABLE battle_logs ADD COLUMN promoted_to_reminder INTEGER NOT NULL DEFAULT 0;
```

### lib.rs registration (version 26)
```rust
// Source: existing pattern in lib.rs lines 5-157
Migration {
    version: 26,
    description: "unit_rules_mapping",
    sql: include_str!("../migrations/026_unit_rules_mapping.sql"),
    kind: MigrationKind::Up,
},
```

### Version parity script (scripts/check-version.mjs)
```javascript
// Source: D-07, D-08, D-09 from CONTEXT.md
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf-8'));
const tauri = JSON.parse(readFileSync(resolve(root, 'src-tauri', 'tauri.conf.json'), 'utf-8'));

if (pkg.version === tauri.version) {
  console.log(`Version parity OK: ${pkg.version}`);
  process.exit(0);
} else {
  console.error(`Version mismatch! package.json=${pkg.version}, tauri.conf.json=${tauri.version}`);
  process.exit(1);
}
```

### package.json script entry
```json
"check:version": "node scripts/check-version.mjs"
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual version tracking | tauri-plugin-sql migration runner | Tauri 2 stable | Migrations auto-run on launch, version-tracked |
| JSON import assertions in ESM | fs.readFileSync + JSON.parse | Node 18+ | More portable, no experimental flags needed |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Node ESM import assertions for JSON require experimental flag or `with { type: 'json' }` syntax | Pitfall 3 | LOW -- fs.readFileSync fallback works regardless |

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4 |
| Config file | vitest implicit via vite.config.ts |
| Quick run command | `pnpm test -- tests/schema/` |
| Full suite command | `pnpm test` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DI-05 | check:version exits 0 on match, 1 on mismatch | unit | `pnpm test -- tests/scripts/checkVersion.test.ts -x` | No -- Wave 0 |
| (migration 026) | unit_rules_mapping DDL is valid SQL | unit | `pnpm test -- tests/schema/migration026.test.ts -x` | No -- Wave 0 |
| (migration 027) | battle_log ALTER TABLE DDL is valid SQL | unit | `pnpm test -- tests/schema/migration027.test.ts -x` | No -- Wave 0 |

### Sampling Rate
- **Per task commit:** `pnpm test -- tests/schema/ tests/scripts/ -x`
- **Per wave merge:** `pnpm test`
- **Phase gate:** Full suite green before /gsd-verify-work

### Wave 0 Gaps
- [ ] `tests/scripts/checkVersion.test.ts` -- covers DI-05 (mock fs reads, verify exit behavior)
- [ ] `tests/schema/migration026.test.ts` -- validates SQL syntax of 026
- [ ] `tests/schema/migration027.test.ts` -- validates SQL syntax of 027

Note: Migration SQL testing is limited in jsdom -- these tests can validate the SQL string is well-formed but cannot run against a real SQLite instance without additional tooling. The primary validation for migrations is the app launch itself (tauri-plugin-sql runs them). The version parity script test is straightforward -- mock file reads and assert exit codes.

## Security Domain

This phase has no security surface. It creates database tables with no user-facing input paths and a read-only script that compares version strings from local files. No authentication, session, access control, input validation, or cryptography concerns apply.

## Sources

### Primary (HIGH confidence)
- `src-tauri/src/lib.rs` -- migration registration pattern, version numbering (1-25)
- `src-tauri/migrations/001_core_schema.sql` -- battle_logs table definition (lines 142-162)
- `src-tauri/migrations/024_points_import_history.sql` -- cross-DB reference pattern
- `src-tauri/migrations/025_tactical_role.sql` -- latest ALTER TABLE migration pattern
- `src/types/battleLog.ts` -- current BattleLog interface
- `package.json` -- current version 0.2.11, script definitions
- `src-tauri/tauri.conf.json` -- current version 0.2.12
- `73-CONTEXT.md` -- all locked decisions D-01 through D-09

### Secondary (MEDIUM confidence)
None needed -- all patterns verified from codebase.

### Tertiary (LOW confidence)
- A1: Node ESM JSON import behavior [ASSUMED from training knowledge]

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all patterns verified from 25 existing migrations in the codebase
- Architecture: HIGH -- direct copy of established registration pattern in lib.rs
- Pitfalls: HIGH -- all based on verified codebase patterns and known SQLite behavior

**Research date:** 2026-05-14
**Valid until:** 2026-06-14 (stable -- SQLite and Tauri migration patterns do not change frequently)
