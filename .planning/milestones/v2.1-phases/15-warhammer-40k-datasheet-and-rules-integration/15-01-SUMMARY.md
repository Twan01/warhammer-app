---
phase: 15-warhammer-40k-datasheet-and-rules-integration
plan: "01"
subsystem: database, infra
tags: [tauri, sqlite, rust, migration, typescript, shadcn, radix-ui, wahapedia]

# Dependency graph
requires:
  - phase: 15-00
    provides: Wave 0 test stubs (migration.test.ts with it.skip blocks), phase context and research

provides:
  - tauri-plugin-http installed and registered (Cargo.toml + package.json + lib.rs)
  - rules.db schema migration (rules_001_schema.sql) with all 7 rw_* tables
  - hobbyforge.db migration 007 (007_datasheet_link.sql) adding datasheet_id column
  - Dual-DB migration chaining in lib.rs (hobbyforge.db v7 + rules.db v1)
  - Both databases preloaded in tauri.conf.json
  - HTTP capability scoped to https://wahapedia.ru/* only
  - src/types/datasheet.ts with 12 exports (11 interfaces + 1 type alias)
  - src/components/ui/collapsible.tsx shadcn component
  - 3 migration tests passing (previously skipped)

affects: [15-02, 15-03, 15-04, 15-05]

# Tech tracking
tech-stack:
  added:
    - tauri-plugin-http v2.5.9 (Rust + @tauri-apps/plugin-http JS bindings)
    - shadcn Collapsible component (backed by radix-ui unified package)
  patterns:
    - Dual-DB migration chaining via add_migrations() per connection string (version sequences are independent per tauri-plugin-sql)
    - rw_ prefix convention for rules.db tables to avoid naming collision with hobbyforge.db
    - TEXT type for all Wahapedia IDs (zero-padded 9-digit strings, not integers)
    - 0|1 INTEGER discipline for SQLite booleans (is_faction_keyword)
    - Cross-DB FK not supported in SQLite — datasheet_id link enforced at application level only
    - HTTP capability: string "http:default" PLUS scoped object with allow URL list (both required)

key-files:
  created:
    - src-tauri/migrations/rules_001_schema.sql
    - src-tauri/migrations/007_datasheet_link.sql
    - src/types/datasheet.ts
    - src/components/ui/collapsible.tsx
  modified:
    - src-tauri/Cargo.toml
    - src-tauri/Cargo.lock
    - src-tauri/src/lib.rs
    - src-tauri/capabilities/default.json
    - src-tauri/tauri.conf.json
    - package.json
    - pnpm-lock.yaml
    - tests/datasheet/migration.test.ts

key-decisions:
  - "rules.db uses independent migration versioning from hobbyforge.db — version 1 for rules.db is valid even though hobbyforge.db is at version 7"
  - "No REFERENCES clause in 007_datasheet_link.sql — SQLite cannot enforce FK constraints across database files (cross-DB FK is not supported)"
  - "tauri_plugin_http::init() placed BEFORE SQL plugin in builder chain (inserted by pnpm tauri add http at top of chain, before setup block)"
  - "shadcn collapsible uses unified radix-ui package (not @radix-ui/react-collapsible) — this is the new shadcn registry format as of 2025"

patterns-established:
  - "Dual-DB pattern: add_migrations() can be chained for multiple connection strings; version sequences do not conflict"
  - "rw_ prefix: rules.db tables always prefixed rw_ (rules wahapedia) for namespace safety"
  - "Content-shape tests: SQL migration files are tested via readFileSync assertions in jsdom environment (no IPC needed)"

requirements-completed: [DS-01, DS-06, DS-09]

# Metrics
duration: 7min
completed: 2026-05-04
---

# Phase 15 Plan 01: Infrastructure Foundation Summary

**Tauri dual-DB infrastructure with HTTP plugin, wahapedia.ru capability scope, 7-table rules.db schema, migration 007, and 12-export TypeScript type contracts unblocking Plans 15-02..05**

## Performance

- **Duration:** ~7 min
- **Started:** 2026-05-04T08:34:53Z
- **Completed:** 2026-05-04T08:41:35Z
- **Tasks:** 3
- **Files modified:** 11

## Accomplishments

- Installed tauri-plugin-http v2.5.9 (Rust + JS) and registered in lib.rs builder chain; scoped HTTP capability to https://wahapedia.ru/* only
- Created rules_001_schema.sql with all 7 rw_* tables (rw_factions, rw_datasheets, rw_datasheet_models, rw_datasheet_abilities, rw_datasheet_keywords, rw_sources, rw_sync_meta) and chained as independent rules.db migration v1
- Added migration 007 (datasheet_link) to hobbyforge.db, preloaded both DBs in tauri.conf.json, created 12-export datasheet.ts types file, installed shadcn Collapsible, flipped 3 migration test stubs to passing (282 + 16 skipped total suite)

## Task Commits

Each task was committed atomically:

1. **Task 1: Install tauri-plugin-http + shadcn collapsible** - `9eae22a` (feat)
2. **Task 2: SQL migrations + lib.rs + tauri.conf.json + capabilities** - `474eeec` (feat)
3. **Task 3: datasheet.ts types + flip migration.test.ts** - `54fb89a` (feat)

## Files Created/Modified

Tauri infra (5 files):
- `src-tauri/migrations/rules_001_schema.sql` - 7 rw_* tables for rules.db (new)
- `src-tauri/migrations/007_datasheet_link.sql` - ALTER TABLE unit_strategy_notes ADD COLUMN datasheet_id TEXT (new)
- `src-tauri/src/lib.rs` - Version 7 migration + get_rules_migrations() + dual add_migrations chain + http plugin
- `src-tauri/capabilities/default.json` - http:default string + scoped allow object for wahapedia.ru
- `src-tauri/tauri.conf.json` - Both DBs in plugins.sql.preload array

JS deps (3 files):
- `src-tauri/Cargo.toml` - tauri-plugin-http = "2"
- `package.json` - @tauri-apps/plugin-http ^2
- `pnpm-lock.yaml` - lockfile entry for @tauri-apps/plugin-http

Types (1 file):
- `src/types/datasheet.ts` - 12 exports: RwFaction, RwDatasheet, RwDatasheetModel, RwDatasheetAbility, RwDatasheetKeyword, RwSource, RulesSyncMeta, DatasheetSummary, FullDatasheet, DatasheetConflict, DatasheetImportPayload, DatasheetImportResolution

Shadcn (1 file):
- `src/components/ui/collapsible.tsx` - Collapsible, CollapsibleTrigger, CollapsibleContent exports

Test (1 file):
- `tests/datasheet/migration.test.ts` - Flipped 3 it.skip to 3 passing it blocks with readFileSync assertions

## Decisions Made

- Plugin chain order: `pnpm tauri add http` inserted tauri_plugin_http::init() at the TOP of the builder chain (before setup block), not after dialog. This satisfies the plan requirement (http before sql) and Cargo built successfully.
- shadcn collapsible imports from unified `radix-ui` package (not `@radix-ui/react-collapsible`) — new shadcn registry format as of 2025; acceptance criteria verified via component existence and exports.
- Cargo.lock committed alongside Cargo.toml to capture the exact dependency resolution.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None. `pnpm tauri add http` succeeded on Windows (the plan noted it "may fail on Windows" but it worked fine). shadcn CLI auto-responded without prompting for overwrite. Cargo build completed in ~82 seconds on first attempt.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 15-02 (pure utilities: CSV parser + stripHtml) can proceed immediately — no infrastructure dependencies remain
- Plan 15-03 (rules-client + queries + hooks) can proceed — rules.db schema and TypeScript types are defined
- Plan 15-04 (sync hook + DatasheetPicker + DatasheetImportDialog) can proceed — DatasheetConflict + DatasheetImportPayload types are established
- Plan 15-05 (PlaybookTab integration) can proceed — datasheet_id column exists in unit_strategy_notes
- 16 test stubs still skipped across the other 6 stub files (csvParse 3 + stripHtml 3 + datasheetQueries 4 + useDatasheet 2 + DatasheetPicker 2 + DatasheetImportDialog 2) — to be flipped by Plans 15-02..05

---
*Phase: 15-warhammer-40k-datasheet-and-rules-integration*
*Completed: 2026-05-04*
