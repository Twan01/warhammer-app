---
phase: 47-v0.2.6-gap-closure
plan: "02"
subsystem: sync-ui
tags: [react, typescript, tauri, sqlite, ovrd-06, tech-debt]
dependency_graph:
  requires:
    - 47-01 (ExtendedSnapshotData, computeSyncDiff with extended param, enriched SNAPSHOT_TABLES)
  provides:
    - Extended snapshot extraction in useRulesSync (models/keywords/abilities before+after)
    - computeSyncDiff called with ExtendedSnapshotData third argument
    - PlaybookTab Modified section in diff collapsible with per-field changes
    - Toast extended with modified datasheet count
    - armyLists.ts JSDoc corrected to 3-level COALESCE chain
    - All 8 Phase 43-46 SUMMARYs have standardized requirements_completed frontmatter
  affects:
    - src/hooks/useRulesSync.ts
    - src/features/units/PlaybookTab.tsx
    - src/db/queries/armyLists.ts
    - tests/datasheet/rulesSnapshot.test.ts
    - .planning/phases/43-46 (8 SUMMARY files)
tech_stack:
  added: []
  patterns:
    - Promise.all for parallel post-sync DB reads (models, keywords, abilities)
    - ExtendedSnapshotData options object pattern for computeSyncDiff third param
    - Slice-then-ellipsis truncation (d.changes.slice(0, 5) + "...and N more")
key_files:
  created: []
  modified:
    - src/hooks/useRulesSync.ts
    - src/features/units/PlaybookTab.tsx
    - src/db/queries/armyLists.ts
    - tests/datasheet/rulesSnapshot.test.ts
    - .planning/phases/43-extended-rules-read-layer/43-01-SUMMARY.md
    - .planning/phases/43-extended-rules-read-layer/43-02-SUMMARY.md
    - .planning/phases/44-sync-pipeline-hardening/44-01-SUMMARY.md
    - .planning/phases/44-sync-pipeline-hardening/44-02-SUMMARY.md
    - .planning/phases/45-sync-metadata-import-tracking/45-01-SUMMARY.md
    - .planning/phases/45-sync-metadata-import-tracking/45-02-SUMMARY.md
    - .planning/phases/46-manual-overrides-version-comparison/46-01-SUMMARY.md
    - .planning/phases/46-manual-overrides-version-comparison/46-02-SUMMARY.md
decisions:
  - "Promise.all used to query current post-sync models/keywords/abilities in parallel — same ORDER BY clauses as SNAPSHOT_TABLES for deterministic comparison"
  - "Extended snapshot variables declared before snapshot capture try/catch — defaults to null on first sync"
  - "Modified section positioned between Renamed and Added in diff collapsible — severity order: removed > renamed > modified > added"
  - "rulesSnapshot.test.ts COUNT assertion updated from 4 to 1 — Phase 47 Plan 01 changed models/keywords/abilities to store full JSON, leaving only wargear as COUNT-only"
metrics:
  duration_minutes: 15
  completed_date: "2026-05-08"
  tasks_completed: 2
  files_modified: 12
requirements_completed: [OVRD-06]
---

# Phase 47 Plan 02: OVRD-06 UI Layer and Tech Debt Cleanup Summary

**One-liner:** Per-field stat/keyword/ability changes wired end-to-end from useRulesSync snapshot extraction through ExtendedSnapshotData into PlaybookTab diff collapsible and toast, plus 8 SUMMARY frontmatter standardizations and JSDoc fix.

## Tasks Completed

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Wire extended snapshot data into useRulesSync | 563a695 | src/hooks/useRulesSync.ts |
| 2 | Add Modified section to PlaybookTab; fix tech debt | 5572331 | PlaybookTab.tsx, armyLists.ts, 8 SUMMARYs, rulesSnapshot.test.ts |

## What Was Built

### Task 1: Extended Snapshot Wiring in useRulesSync

**Import addition:** `ExtendedSnapshotData` added to the existing import from `@/lib/computeSyncDiff`.

**Pre-sync snapshot extraction (lines ~144-156):** Three new variables declared (`preSyncModelsData`, `preSyncKeywordsData`, `preSyncAbilitiesData`) alongside the existing `preSyncSnapshotData`. All four are extracted from `getLatestSnapshot()` using `.find()` by `table_name`. Defaults to null on first sync (no snapshot yet).

**Post-sync diff computation (lines ~182-222):** Extended the existing diff block to also query the current post-sync state of `rw_datasheet_models`, `rw_datasheet_keywords`, and `rw_datasheet_abilities` using `Promise.all`. The ORDER BY clauses match `SNAPSHOT_TABLES` exactly for deterministic comparison. An `ExtendedSnapshotData` object is constructed with before/after for each table and passed as the third argument to `computeSyncDiff`.

### Task 2: PlaybookTab UI + Tech Debt

**Modified section in diff collapsible:** Added after the Renamed section and before the Added section. Shows per-datasheet change list with per-field entries using:
- Arrow notation `field: oldValue → newValue` for stat changes
- `+field` for added keywords/abilities (oldValue empty)
- `-field` for removed keywords/abilities (newValue empty)
- Truncation at 5 changes per datasheet with "...and N more" label

**Toast extended:** `if (data.diff.modified.length > 0) diffParts.push(...)` added after renamed push.

**armyLists.ts JSDoc fixed:** Both JSDoc comments updated from the old 2-level `COALESCE(alu.points_override, u.points, 0)` to the current 3-level `COALESCE(alu.points_override, uo.points, u.points, 0)` — documentation-only, no SQL changes.

**8 SUMMARY frontmatter standardized:** All Phase 43-46 SUMMARY files now have `requirements_completed:` field with correct requirement IDs. Two files had the wrong field name (44-01 had `requirements:`, 46-02 had `requirements-completed:`); both renamed.

## Verification

- `pnpm build` exits 0
- `pnpm test` exits 0 — 1030 tests pass, 6 skipped, 12 todo
- `Modified (` confirmed in PlaybookTab.tsx line 770
- `COALESCE(alu.points_override, uo.points, u.points, 0)` confirmed in armyLists.ts lines 20 and 159
- All 8 SUMMARY files contain `requirements_completed:` field

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Updated rulesSnapshot.test.ts COUNT assertion from 4 to 1**
- **Found during:** Task 2 — running full test suite revealed 1 pre-existing failure
- **Issue:** Test `META-06: uses COUNT(*) for composite-PK tables` asserted `countCalls.toHaveLength(4)` (models + abilities + keywords + wargear). Phase 47 Plan 01 changed models/abilities/keywords to store full JSON (not COUNT-only) — only wargear remains COUNT-only.
- **Fix:** Updated count assertion to `toHaveLength(1)` and updated test description/comment to reflect Phase 47 schema
- **Files modified:** `tests/datasheet/rulesSnapshot.test.ts`
- **Commit:** 5572331

## Self-Check: PASSED

Files verified to exist:
- `src/hooks/useRulesSync.ts` — FOUND (ExtendedSnapshotData import + extended snapshot extraction)
- `src/features/units/PlaybookTab.tsx` — FOUND (Modified section at line 770)
- `src/db/queries/armyLists.ts` — FOUND (3-level COALESCE in JSDoc)
- All 8 SUMMARY files — FOUND (requirements_completed field confirmed)

Commits verified:
- 563a695 — feat(47-02): wire extended snapshot data into useRulesSync — FOUND
- 5572331 — feat(47-02): add Modified section to PlaybookTab diff UI; fix tech debt — FOUND
