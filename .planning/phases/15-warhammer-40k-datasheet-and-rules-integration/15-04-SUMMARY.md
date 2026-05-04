---
phase: 15-warhammer-40k-datasheet-and-rules-integration
plan: "04"
subsystem: ui
tags: [react, tanstack-query, tauri, sqlite, wahapedia, dialog, mutation]

# Dependency graph
requires:
  - phase: 15-01
    provides: types/datasheet.ts (DatasheetConflict, DatasheetImportResolution, DatasheetSummary)
  - phase: 15-02
    provides: parseWahapediaCsv + stripHtml utilities
  - phase: 15-03
    provides: rules-client singleton + datasheets query module + useDatasheet hooks

provides:
  - useRulesSync mutation hook — fetches 7 Wahapedia CSVs in parallel, bulk-inserts 6 tables in single transaction, writes sync meta, invalidates query cache
  - RULES_SYNC_FILES constant — exported list of 7 CSV filenames
  - DatasheetPicker Dialog component — faction-pre-filtered searchable list with autoFocus input + empty state
  - DatasheetImportDialog Dialog component — per-row Keep/Use toggle conflict resolution with default 'use' choice
  - 4 stubs flipped (DatasheetPicker 2 + DatasheetImportDialog 2)
  - ALL 19 Wave 0 stubs now passing — Wave 0 fully closed

affects:
  - 15-05 (PlaybookTab integration — calls useRulesSync.mutate(), mounts DatasheetPicker + DatasheetImportDialog)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - useRulesSync single-transaction bulk insert pattern (BEGIN/DELETE/INSERT x6/COMMIT/ROLLBACK) for ~5000-8000 rows
    - INSERT OR IGNORE on (datasheet_id, line) composite keys to handle Wahapedia duplicate-PK quirks
    - Dialog component with onOpenChange close delegation to parent via onClose callback
    - useMemo client-side substring filter on faction-pre-filtered list (no virtualization needed at ~200 items)
    - useEffect choice state reset on conflicts prop change (different unit re-open pattern)

key-files:
  created:
    - src/hooks/useRulesSync.ts
    - src/features/units/DatasheetPicker.tsx
    - src/features/units/DatasheetImportDialog.tsx
  modified:
    - tests/datasheet/DatasheetPicker.test.tsx
    - tests/datasheet/DatasheetImportDialog.test.tsx

key-decisions:
  - "INSERT OR IGNORE on rw_datasheet_models and rw_datasheet_abilities to handle Wahapedia duplicate (datasheet_id, line) PKs — keeps first occurrence, avoids transaction crash"
  - "Promise.all(RULES_SYNC_FILES.map(fetchCsv)) — parallel fetch all 7 CSVs before opening transaction (no partial-write risk)"
  - "DatasheetImportResolution hardcoded default { M:'use', T:'use', ... } in handleConfirm — covers all 8 keys even when not all are in conflicts array"
  - "onClose callback pattern (not onSkip) for DatasheetPicker — consistent with DatasheetImportDialog + Dialog onOpenChange close path"

patterns-established:
  - "Mutation hook pipeline: parallel fetch → parse → BEGIN transaction → DELETE all → INSERT all → COMMIT → write meta → invalidate cache"
  - "Wave 0 stub flip: replace it.skip block with full test assertions and real component import"

requirements-completed:
  - DS-01
  - DS-04
  - DS-08

# Metrics
duration: 4min
completed: 2026-05-04
---

# Phase 15 Plan 04: useRulesSync + DatasheetPicker + DatasheetImportDialog Summary

**Wahapedia sync mutation hook (7-CSV parallel fetch → single 6-table transaction), faction-filtered DatasheetPicker Dialog, and Keep/Use conflict resolution DatasheetImportDialog — Wave 0 fully closed (19/19 stubs passing)**

## Performance

- **Duration:** 4 min
- **Started:** 2026-05-04T08:56:51Z
- **Completed:** 2026-05-04T09:00:32Z
- **Tasks:** 3
- **Files modified:** 5

## Accomplishments

- useRulesSync: fetches 7 Wahapedia CSVs in parallel via @tauri-apps/plugin-http, bulk-inserts ~5000-8000 rows across 6 rw_* tables in a single BEGIN/COMMIT transaction, writes sync meta, invalidates 3 query key namespaces
- DatasheetPicker: faction-pre-filtered Dialog with autoFocus search input, client-side useMemo substring filter, empty state copy, Skip footer — copywriting frozen per UI-SPEC
- DatasheetImportDialog: per-field Keep/Use toggle with default 'use' choice, resolution map reported via onConfirm, choices reset on conflicts prop change
- 4 stubs flipped (DatasheetPicker 2 + DatasheetImportDialog 2); full suite: 299 tests passing, 0 failures, 0 skips — ALL 19 Wave 0 stubs closed

## Task Commits

Each task was committed atomically:

1. **Task 1: Create useRulesSync.ts** - `56e1561` (feat)
2. **Task 2: Create DatasheetPicker.tsx + flip tests** - `041f79f` (feat)
3. **Task 3: Create DatasheetImportDialog.tsx + flip tests** - `b3bbabb` (feat)

**Plan metadata:** _(docs commit follows)_

## Files Created/Modified

- `src/hooks/useRulesSync.ts` - Mutation hook: parallel CSV fetch → parse → BEGIN/COMMIT transaction across 6 rw_* tables → upsertSyncMeta → invalidate cache
- `src/features/units/DatasheetPicker.tsx` - Faction-filtered searchable Dialog (DS-04); autoFocus Input, useMemo filter, empty state
- `src/features/units/DatasheetImportDialog.tsx` - Per-row Keep/Use conflict resolution Dialog (DS-08); default 'use', resolution map onConfirm
- `tests/datasheet/DatasheetPicker.test.tsx` - 2 it.skip → 2 passing tests (faction description, search filter + empty state)
- `tests/datasheet/DatasheetImportDialog.test.tsx` - 2 it.skip → 2 passing tests (row rendering, Keep flip + resolution map)

## Decisions Made

- INSERT OR IGNORE on rw_datasheet_models and rw_datasheet_abilities to handle Wahapedia duplicate (datasheet_id, line) PKs — keeps first occurrence, avoids transaction crash
- Promise.all for parallel CSV fetch before opening transaction — no partial-write risk since all data is ready before BEGIN
- DatasheetImportResolution hardcoded default in handleConfirm covers all 8 keys even when conflicts array is a subset
- onClose (not onSkip) on DatasheetPicker — consistent naming with DatasheetImportDialog and Dialog onOpenChange delegation pattern

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 15-05 can `import { useRulesSync } from "@/hooks/useRulesSync"` directly
- Plan 15-05 can `import { DatasheetPicker } from "@/features/units/DatasheetPicker"` directly
- Plan 15-05 can `import { DatasheetImportDialog } from "@/features/units/DatasheetImportDialog"` directly
- All 19 Wave 0 stubs are passing — no stub debt carried forward
- PlaybookTab + CollectionPage wiring (sibling portal pattern) ready to proceed

---
*Phase: 15-warhammer-40k-datasheet-and-rules-integration*
*Completed: 2026-05-04*
