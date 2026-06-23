---
phase: 141-schema-foundation-progress-identity-lock
plan: "01"
subsystem: data-layer
tags: [migration, schema, technique-library, sqlite, tests]
dependency_graph:
  requires: []
  provides: [technique-library-schema, option-a-materialisation-decision]
  affects: [recipe_sections, recipe_steps, hobbyforge.db]
tech_stack:
  added: []
  patterns: [append-only-migration, paired-lib-rs-edit, better-sqlite3-schema-tests]
key_files:
  created:
    - src-tauri/migrations/051_technique_library_foundation.sql
    - (schema-shape tests extended, not created)
  modified:
    - src-tauri/src/lib.rs
    - .planning/PROJECT.md
    - tests/data-layer/schema-shape.test.ts
decisions:
  - "Option A materialisation: technique steps as recipe_steps rows with technique_step_id FK — unit_recipe_step_progress unchanged"
  - "Single migration 051 for entire foundation (D-07): six CREATE TABLEs + two ALTER ADD COLUMNs"
  - "Colour slots declared before steps in migration order (FND-01 constraint)"
metrics:
  duration_minutes: 15
  completed_date: "2026-06-20"
  tasks_completed: 2
  tasks_total: 2
  files_changed: 4
requirements: [FND-01, FND-02]
---

# Phase 141 Plan 01: Schema Foundation & Progress-Identity Lock — Summary

**One-liner:** Six technique tables + nullable ALTER FK columns for Option A materialisation in migration 051, paired lib.rs registration, and schema-shape tests — all in a single LF-only migration.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Write migration 051 + register in lib.rs (paired edit) | b639c701 | src-tauri/migrations/051_technique_library_foundation.sql, src-tauri/src/lib.rs |
| 2 | Record Option A decision in PROJECT.md + extend schema-shape test | 004df0b7 | .planning/PROJECT.md, tests/data-layer/schema-shape.test.ts |

## What Was Built

### Migration 051 (`src-tauri/migrations/051_technique_library_foundation.sql`)

Six new tables in creation order (parents before children, slots before steps per FND-01):

1. `techniques` — root table (id, name, effect, difficulty, notes, created_at, updated_at)
2. `technique_sections` — FK techniques(id) ON DELETE CASCADE
3. `technique_colour_slots` — FK techniques(id) ON DELETE CASCADE (declared BEFORE steps)
4. `technique_steps` — FK technique_sections(id) ON DELETE CASCADE; FK technique_colour_slots(id) ON DELETE SET NULL
5. `recipe_technique_instances` — FK painting_recipes(id) ON DELETE CASCADE; FK techniques(id) ON DELETE CASCADE; detached 0|1
6. `recipe_technique_slot_maps` — FK recipe_technique_instances(id) ON DELETE CASCADE; FK technique_colour_slots(id) ON DELETE CASCADE; paint_id nullable (unfilled); UNIQUE(instance_id, slot_id) orphan prevention

Two nullable ALTER ADD COLUMN for Option A materialisation:
- `recipe_sections.technique_instance_id INTEGER REFERENCES recipe_technique_instances(id) ON DELETE SET NULL`
- `recipe_steps.technique_step_id INTEGER REFERENCES technique_steps(id) ON DELETE SET NULL`

Migration header comment encodes the Option A decision per FND-02.

### lib.rs paired edit

`Migration { version: 51, description: "technique_library_foundation", ... }` appended to `get_migrations()` after version 50 block. Count: 51 `Migration {` structs.

### PROJECT.md Key Decisions

New row added: "Technique steps materialised as recipe_steps rows with technique_step_id FK (Option A, not read-time JOIN / Option B)" with full rationale and `Pending — Phase 141` outcome marker.

### Schema-shape tests (5 new `it()` blocks)

- Six technique tables exist after migration 051
- `recipe_sections.technique_instance_id` exists and is nullable
- `recipe_steps.technique_step_id` exists and is nullable
- `UNIQUE(instance_id, slot_id)` constraint verified via sqlite_master CREATE SQL
- `technique_sections.technique_id` FK: ON DELETE CASCADE confirmed
- `recipe_steps.technique_step_id` FK: ON DELETE SET NULL confirmed

## Verification Results

- `pnpm check:version`: **OK** — 51 .sql files === 51 Migration{} entries, no CR bytes
- `pnpm test -- tests/data-layer/schema-shape.test.ts tests/data-layer/migration-parity.test.ts`: **15 passed, 2 todo** (todos are pre-existing: rules.db removed in Phase 107)
- Full test suite (background): exit code 0

## Deviations from Plan

None — plan executed exactly as written. The DDL from RESEARCH.md §3 was used verbatim; no column additions or removals were made.

## Known Stubs

None. This plan is pure schema + docs + tests — no production UI or query modules.

## Threat Surface Scan

No new network endpoints, auth paths, or trust boundaries introduced. Threat mitigations from the plan's threat model were all applied:

- T-141-01: UNIQUE(instance_id, slot_id) + CASCADE baked into migration 051; schema-shape test asserts constraint
- T-141-02: LF-only migration file; pnpm check:version leg 3 passes (0 CR bytes)
- T-141-03: Mandatory paired edit completed; check:version leg 2 + migration-parity test catch drift

## Self-Check: PASSED

- [x] `src-tauri/migrations/051_technique_library_foundation.sql` exists
- [x] `src-tauri/src/lib.rs` contains `version: 51`
- [x] `.planning/PROJECT.md` contains `technique_step_id` and `Option A` in Key Decisions
- [x] `tests/data-layer/schema-shape.test.ts` references all six technique table names
- [x] git log shows commits b639c701 and 004df0b7
- [x] pnpm check:version exits 0
- [x] schema-shape + migration-parity tests: 15 passed, 2 todo, 0 failed
