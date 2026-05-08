---
phase: 43-extended-rules-read-layer
plan: "01"
subsystem: rules-data-layer
tags: [typescript, react-query, sqlite, tdd, rules-db]
dependency_graph:
  requires: []
  provides:
    - RwStratagem interface
    - RwDetachment interface
    - RwDetachmentAbility interface
    - getStratagemsByFaction query function
    - getDetachmentsByFaction query function
    - getDetachmentAbilitiesByDetachment query function
    - getSharedAbilitiesByFaction query function
    - useStratagemsByFaction hook
    - useDetachmentsByFaction hook
    - useDetachmentAbilitiesByDetachment hook
    - useSharedAbilitiesByFaction hook
    - STRATAGEMS_BY_FACTION_KEY
    - DETACHMENTS_BY_FACTION_KEY
    - DETACHMENT_ABILITIES_KEY
    - SHARED_ABILITIES_BY_FACTION_KEY
  affects:
    - src/types/datasheet.ts
    - src/db/queries/rulesExtended.ts
    - src/hooks/useRulesExtended.ts
tech_stack:
  added: []
  patterns:
    - TDD red-green cycle
    - React Query with staleTime: Infinity and enabled guards
    - rules.db read-only queries via getRulesDb()
key_files:
  created:
    - src/db/queries/rulesExtended.ts
    - src/hooks/useRulesExtended.ts
    - tests/datasheet/rulesExtendedQueries.test.ts
    - tests/datasheet/useRulesExtended.test.tsx
  modified:
    - src/types/datasheet.ts
decisions:
  - Reuse existing RwAbility interface for getSharedAbilitiesByFaction return type — rw_abilities schema is already modeled
  - staleTime: Infinity matches useDatasheet pattern — rules content is static until explicit re-sync
  - SELECT * used for extended tables (stratagems, detachments, detachment_abilities) because all columns are needed by future PlaybookTab UI
metrics:
  duration_seconds: 678
  completed_date: "2026-05-08"
  tasks_completed: 2
  tasks_total: 2
  files_created: 4
  files_modified: 1
requirements_completed: [SCHEMA-05]
---

# Phase 43 Plan 01: Extended Rules Read Layer Summary

TypeScript data layer for extended rules tables: 3 new interfaces, 1 query module (4 functions), 1 hook module (4 hooks + 4 key constants), and 2 test files covering all 12 exported symbols.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add type definitions and create query module with tests | 91eafc6 | src/types/datasheet.ts, src/db/queries/rulesExtended.ts, tests/datasheet/rulesExtendedQueries.test.ts |
| 2 | Create React Query hooks module with tests | 097b7cd | src/hooks/useRulesExtended.ts, tests/datasheet/useRulesExtended.test.tsx |

## What Was Built

**3 new TypeScript interfaces** added to `src/types/datasheet.ts` after the existing `RwAbility`:
- `RwStratagem` — maps `rw_stratagems` rows (11 fields: id, faction_id, name, type, cp_cost, legend, turn, phase, detachment, detachment_id, description)
- `RwDetachment` — maps `rw_detachments` rows (5 fields: id, faction_id, name, legend, type)
- `RwDetachmentAbility` — maps `rw_detachment_abilities` rows (7 fields: id, faction_id, name, legend, description, detachment, detachment_id)

**4 query functions** in `src/db/queries/rulesExtended.ts`:
- `getStratagemsByFaction(factionId)` — `SELECT * FROM rw_stratagems WHERE faction_id = $1 ORDER BY name`
- `getDetachmentsByFaction(factionId)` — `SELECT * FROM rw_detachments WHERE faction_id = $1 ORDER BY name`
- `getDetachmentAbilitiesByDetachment(detachmentId)` — `SELECT * FROM rw_detachment_abilities WHERE detachment_id = $1 ORDER BY name`
- `getSharedAbilitiesByFaction(factionId)` — `SELECT * FROM rw_abilities WHERE faction_id = $1 ORDER BY name` (returns `RwAbility[]`)

**4 React Query hooks + 4 key constants** in `src/hooks/useRulesExtended.ts`:
- All hooks use `staleTime: Infinity` and `enabled: id !== undefined` guards
- All hooks return empty array `[]` when id is undefined (no idle fetchStatus issues)
- 4 exported key constants: `STRATAGEMS_BY_FACTION_KEY`, `DETACHMENTS_BY_FACTION_KEY`, `DETACHMENT_ABILITIES_KEY`, `SHARED_ABILITIES_BY_FACTION_KEY`

## Test Results

- `tests/datasheet/rulesExtendedQueries.test.ts`: 4 tests, all passing
- `tests/datasheet/useRulesExtended.test.tsx`: 8 tests, all passing
- Full test suite: 123 files passed, 0 failures
- `pnpm build`: succeeded with no type errors

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check

Files created:
- src/db/queries/rulesExtended.ts: FOUND
- src/hooks/useRulesExtended.ts: FOUND
- tests/datasheet/rulesExtendedQueries.test.ts: FOUND
- tests/datasheet/useRulesExtended.test.tsx: FOUND

Commits exist:
- 91eafc6: feat(43-01): add extended rules type definitions and query module — FOUND
- 097b7cd: feat(43-01): add React Query hooks for extended rules data — FOUND

## Self-Check: PASSED
