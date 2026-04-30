---
phase: 02-data-layer-entity-crud
plan: "01"
subsystem: database
tags: [sqlite, tauri-plugin-sql, rust, migrations, schema]

requires:
  - phase: 01-app-shell
    provides: "tauri-plugin-sql 2.4.0 installed, get_migrations() wired in lib.rs with empty vec![], getDb() singleton + FK pragma in src/db/client.ts"

provides:
  - "001_core_schema.sql: all 10 v1 tables with FK constraints (RESTRICT/CASCADE/SET NULL)"
  - "get_migrations() returns Migration{version:1} pointing at 001_core_schema.sql via include_str!()"
  - "README.md with SEED-06 personal-use disclaimer"

affects: [02-02-seeds, 02-03-factions-crud, 02-04-units-paints-crud, all-later-phases]

tech-stack:
  added: []
  patterns:
    - "SQL migrations embedded at compile time via include_str!() macro in lib.rs get_migrations()"
    - "CREATE TABLE IF NOT EXISTS for idempotent schema declarations"
    - "SQLite FK constraints: RESTRICT for parent-must-have-children, CASCADE for child cleanup, SET NULL for optional references"

key-files:
  created:
    - src-tauri/migrations/001_core_schema.sql
    - README.md
  modified:
    - src-tauri/src/lib.rs

key-decisions:
  - "10 tables all in one migration file (001_core_schema.sql) — no splits per entity group"
  - "model_instances table explicitly absent (DATA-04) — confirmed via grep returning 0"
  - "units.faction_id uses ON DELETE RESTRICT — cannot delete a faction that has units assigned"
  - "recipe_paints.paint_id uses ON DELETE RESTRICT (PAINT-02) — cannot delete a paint in use by any recipe step"
  - "recipe_paints.recipe_id uses ON DELETE CASCADE — deleting a recipe auto-removes its paint links"
  - "painting_recipes.faction_id and .unit_id use ON DELETE SET NULL — recipes survive faction/unit deletion"
  - "battle_logs.army_list_id, mvp_unit_id, underperforming_unit_id use ON DELETE SET NULL — logs survive list/unit deletion"
  - "status_painting column stores TEXT (enum) not INTEGER — values match PAINTING_STATUS_ORDER order"
  - "README personal-use disclaimer added with explicit 'personal use' lowercase and 'Games Workshop' company name"

patterns-established:
  - "Migration registration: Migration{version, description, sql: include_str!(), kind: MigrationKind::Up} in get_migrations()"
  - "SQL file location: src-tauri/migrations/NNN_name.sql, referenced from lib.rs via include_str!(\"../migrations/NNN_name.sql\")"
  - "Migration versions strictly sequential starting at 1; plan 02-02 will add versions 2 and 3 for seeds"

requirements-completed: [DATA-03, DATA-04, DATA-05, SEED-06]

duration: 4min
completed: 2026-04-30
---

# Phase 2 Plan 01: Core Schema Migration Summary

**SQLite schema with all 10 v1 tables embedded at compile time via include_str!() in Rust, with correct RESTRICT/CASCADE FK constraints and README personal-use disclaimer**

## Performance

- **Duration:** 4 min
- **Started:** 2026-04-30T13:14:26Z
- **Completed:** 2026-04-30T13:18:09Z
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments

- Created `src-tauri/migrations/001_core_schema.sql` with all 10 required tables and no forbidden ones (DATA-03, DATA-04)
- Wired migration into `src-tauri/src/lib.rs` `get_migrations()` via `include_str!()` macro (DATA-05)
- Created `README.md` with SEED-06 personal-use disclaimer referencing Games Workshop, no redistribution, and local storage path

## Task Commits

Each task was committed atomically:

1. **Task 1: Create 001_core_schema.sql** - `40a9034` (feat)
2. **Task 2: Wire into lib.rs get_migrations()** - `ca8b804` (feat)
3. **Task 3: Add SEED-06 disclaimer to README.md** - `c8152d9` (feat)

**Plan metadata:** (docs commit — created below)

## Files Created/Modified

- `src-tauri/migrations/001_core_schema.sql` - All 10 v1 tables with FK constraints; no model_instances; no seed data; no PRAGMA foreign_keys (that stays in client.ts)
- `src-tauri/src/lib.rs` - get_migrations() now returns Migration{version:1, description:"core_schema", sql: include_str!(), kind: Up}; all other content unchanged
- `README.md` - Created from scratch: HobbyForge title, project description, Personal Use Disclaimer section satisfying SEED-06

## Schema FK Relationships

| Table | Column | References | On Delete |
|-------|--------|------------|-----------|
| units | faction_id | factions(id) | RESTRICT |
| painting_recipes | faction_id | factions(id) | SET NULL |
| painting_recipes | unit_id | units(id) | SET NULL |
| recipe_paints | recipe_id | painting_recipes(id) | CASCADE |
| recipe_paints | paint_id | paints(id) | RESTRICT |
| army_lists | faction_id | factions(id) | SET NULL |
| army_list_units | list_id | army_lists(id) | CASCADE |
| army_list_units | unit_id | units(id) | RESTRICT |
| unit_strategy_notes | unit_id | units(id) | CASCADE |
| battle_logs | army_list_id | army_lists(id) | SET NULL |
| battle_logs | mvp_unit_id | units(id) | SET NULL |
| battle_logs | underperforming_unit_id | units(id) | SET NULL |
| image_assets | — | (polymorphic, no FK) | — |

**DATA-04 confirmed:** `grep -c "model_instances" src-tauri/migrations/001_core_schema.sql` returns 0.

## Decisions Made

- Kept column alignment for most columns but used unaligned format for `status_painting` to match the exact acceptance criteria string `status_painting TEXT NOT NULL DEFAULT 'Not Started'`
- README was created from scratch (did not exist); followed plan's "create with minimal header" path
- Added explicit "personal use only" phrase inline to satisfy case-sensitive `grep "personal use"` acceptance check (heading is "Personal Use" with capital letters, so body text needed the lowercase form)

## Deviations from Plan

None - plan executed exactly as written. One minor formatting adjustment was made on the `status_painting` column to satisfy the acceptance criteria exact-string grep (removing alignment spaces to produce `status_painting TEXT NOT NULL DEFAULT 'Not Started'`). This is not a semantic deviation — the SQL behavior is identical.

## Issues Encountered

- `status_painting` column was initially written with alignment padding (`status_painting        TEXT    NOT NULL DEFAULT 'Not Started'`) which failed the acceptance criteria grep for the exact string. Fixed by removing alignment spaces on that column only. No semantic impact.

## Runtime Verification

App-runtime verification (pnpm tauri dev + sqlite_master query) is deferred to manual smoke per the 02-VALIDATION.md documented approach. MSVC Build Tools blocker remains in STATE.md — compilation and runtime test require the user's environment.

The idempotency guarantee comes from tauri-plugin-sql's `_sqlx_migrations` runner: once version 1 is recorded, it never re-runs. This is architectural behavior of the plugin, not something we can verify without a running app.

## User Setup Required

None — no new environment variables or external services. MSVC Build Tools requirement is a pre-existing environment blocker (documented in STATE.md since Phase 1).

## Next Phase Readiness

- Plan 02-02 can now add `002_seed_factions.sql` (version 2) and `003_seed_data.sql` (version 3) to `get_migrations()` in lib.rs
- All 10 tables exist in the schema; TypeScript types and query modules (DATA-06, DATA-07) can be authored against these column definitions
- TanStack Query hooks (DATA-08, DATA-09) and CRUD UI pages (FACT-01 through FACT-05, UNIT-01 through UNIT-06, PAINT-01, PAINT-02) depend on this schema being locked

---
*Phase: 02-data-layer-entity-crud*
*Completed: 2026-04-30*
