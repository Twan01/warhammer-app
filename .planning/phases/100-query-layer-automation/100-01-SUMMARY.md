---
phase: 100-query-layer-automation
plan: "01"
subsystem: db-schema, types, query-layer, recipes-ui
tags: [migration, types, units, override-flags, section-types]
dependency_graph:
  requires: []
  provides: [override-columns-schema, section-types-extended, unit-override-types, updateunit-override-params, assignment-checklist-override-wire]
  affects: [src/types/unit.ts, src/db/queries/units.ts, src/features/recipes/AssignmentChecklist.tsx]
tech_stack:
  added: []
  patterns: [coalesce-partial-update, sqlite-boolean-0-1, migration-alter-table-additive]
key_files:
  created:
    - src-tauri/migrations/037_override_flags.sql
  modified:
    - src/types/recipeSection.ts
    - src/types/unit.ts
    - src/db/queries/units.ts
    - src/features/units/UnitSheet.tsx
    - src/features/recipes/AssignmentChecklist.tsx
    - tests/* (27 test fixture files updated with override fields)
decisions:
  - Override fields default to 0 on new unit creation — UnitSheet.tsx explicitly passes 0 as 0|1 for all three fields
  - COALESCE pattern at $24/$25/$26 means callers that omit override fields leave them unchanged (null coalescse to existing value)
  - status_assembly_override: 1 is set unconditionally on any manual assembly toggle (both checked and unchecked) — the override persists to prevent auto-derive from overwriting future manual changes
metrics:
  duration: "~20 minutes"
  completed: "2026-05-28"
  tasks: 2
  files_created: 1
  files_modified: 32
---

# Phase 100 Plan 01: Schema Foundation Summary

Schema foundation for Phase 100 Query-Layer Automation: migration 037 adds three SQLite override guard columns, SECTION_TYPES extended to 10 values with assembly/basing/varnish, Unit interface extended with override fields, updateUnit() accepts params $24-$26 via COALESCE, and AssignmentChecklist sets status_assembly_override=1 on manual toggle.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Migration + Types Foundation | 68b37ee | 037_override_flags.sql, recipeSection.ts, unit.ts, UnitSheet.tsx, 27 test fixtures |
| 2 | Extend updateUnit() + Wire AssignmentChecklist | 37c5e2b | units.ts, AssignmentChecklist.tsx |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical Functionality] Unit interface new required fields broke downstream callers**
- **Found during:** Task 1 — first `pnpm build` after adding 3 required fields to `Unit`
- **Issue:** `CreateUnitInput` derives from `Unit` via `Omit`, so the 3 new `status_*_override` fields became required in `CreateUnitInput`. This broke `UnitSheet.tsx` (payload missing fields) and 27 test files (unit fixtures missing fields).
- **Fix:** Added `status_assembly_override: 0 as 0 | 1, status_basing_override: 0 as 0 | 1, status_varnished_override: 0 as 0 | 1` to `UnitSheet.tsx` payload (defaults 0 on create). Bulk-updated 27 test fixture files via PowerShell regex replace on the `undercoat: null,` pattern.
- **Files modified:** `src/features/units/UnitSheet.tsx`, 27 test files under `tests/`
- **Commit:** 68b37ee (included in Task 1 commit)

## Known Stubs

None — no placeholder data or hardcoded stubs introduced.

## Threat Surface Scan

No new network endpoints, auth paths, or file access patterns introduced. Migration 037 adds three INTEGER columns to an existing local SQLite table. All query params use positional $N syntax (no injection vector). No threat flags.

## Self-Check: PASSED

- `src-tauri/migrations/037_override_flags.sql` — EXISTS, contains 3 ALTER TABLE statements
- `src/types/recipeSection.ts` — SECTION_TYPES has 10 values including assembly, basing, varnish
- `src/types/unit.ts` — Unit interface includes status_assembly_override, status_basing_override, status_varnished_override
- `src/db/queries/units.ts` — updateUnit() SQL has COALESCE($24/$25/$26), params array has 26 entries
- `src/features/recipes/AssignmentChecklist.tsx` — handleToggleAssembly passes status_assembly_override: 1
- `pnpm build` — PASSES (TypeScript strict mode, no errors)
- Commits 68b37ee and 37c5e2b — EXIST in git log
