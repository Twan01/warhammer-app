---
phase: 133-honest-data-provenance
plan: "01"
subsystem: army-lists/game-day/warnings-lib
tags: [refactor, dead-code-removal, type-cleanup, HON-02]
dependency_graph:
  requires: []
  provides: [freshness-param-removed-from-warnings-layer]
  affects: [src/lib/computeUnitWarnings.ts, src/features/army-lists/ArmyListSummaryBar.tsx, src/features/army-lists/ArmyListDetailPage.tsx, src/features/game-day/GameDayPage.tsx, src/features/game-day/GameDayReadinessPanel.tsx]
tech_stack:
  added: []
  patterns: [signature-removal, dead-param-excision, TDD-refactor]
key_files:
  created: []
  modified:
    - src/lib/computeUnitWarnings.ts
    - src/features/army-lists/ArmyListSummaryBar.tsx
    - src/features/army-lists/ArmyListDetailPage.tsx
    - src/features/game-day/GameDayPage.tsx
    - src/features/game-day/GameDayReadinessPanel.tsx
    - tests/lib/computeUnitWarnings.test.ts
    - tests/army-lists/ArmyListSummaryBar.test.tsx
    - tests/game-day/GameDayReadinessPanel.test.tsx
    - tests/army-list/computeListHealthStats.test.ts
    - tests/army-list/enhancementSummaryBar.test.tsx
decisions:
  - "Kept useUdbMeta in ArmyListDetailPage because it is also used for the rulesSynced prop on DetachmentPicker (line 673) — only removed the freshness useMemo and prop, not the hook itself"
  - "Updated tests/army-list/computeListHealthStats.test.ts (ENH-03 test file) and tests/army-list/enhancementSummaryBar.test.tsx — both had the old 4-arg computeListHealthStats call pattern and were not in the original plan's files_modified list; updated as Rule 3 auto-fix to keep build green"
metrics:
  duration: "9 minutes"
  completed: "2026-06-17T07:17:00Z"
  tasks_completed: 2
  files_modified: 10
---

# Phase 133 Plan 01: Remove freshness from warnings layer and callers Summary

Removed the `freshness: SyncFreshness` parameter from `WarningContext`, `computeListHealthStats`, and all four signature-consuming components, satisfying the warnings-layer half of HON-02. `pnpm build` and all 2749 tests green.

## Tasks Completed

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Remove freshness from warnings layer and update its unit test | 6ebd0306 | src/lib/computeUnitWarnings.ts, tests/lib/computeUnitWarnings.test.ts, tests/army-list/computeListHealthStats.test.ts |
| 2 | Drop freshness prop from 4 signature-consuming components and update their tests | f536419f | 5 src files + 3 test files |

## What Was Built

- **`computeUnitWarnings.ts`** — Removed `import type { SyncFreshness }`, removed `freshness: SyncFreshness` field from `WarningContext` interface, removed `freshness: SyncFreshness` parameter from `computeListHealthStats` signature (3rd positional param, between `pointsLimit` and `enhancementTotal`), updated context construction from `{ totalPoints, pointsLimit, freshness }` to `{ totalPoints, pointsLimit }`.
- **`ArmyListSummaryBar.tsx`** — Removed `SyncFreshness` import, `freshness` prop from interface and destructuring, updated both `useMemo` dep arrays for `computeListHealthStats` and `computeListWarnings` calls.
- **`ArmyListDetailPage.tsx`** — Removed `getSyncFreshness` import and freshness `useMemo`; kept `useUdbMeta` hook (still needed for `rulesSynced={udbMeta != null}` on `DetachmentPicker` at line 673); removed `freshness={freshness}` prop from `ArmyListSummaryBar`.
- **`GameDayPage.tsx`** — Removed `useUdbMeta` and `getSyncFreshness` imports, removed hook call and freshness variable, removed `freshness` prop from `GameDayReadinessPanel`.
- **`GameDayReadinessPanel.tsx`** — Removed `SyncFreshness` import, `freshness` from props interface and destructuring, updated `computeListHealthStats` call and `useMemo` dep array.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Found two additional test files with the old signature**
- **Found during:** Task 2 — pnpm build revealed additional callers
- **Issue:** `tests/army-list/computeListHealthStats.test.ts` (ENH-03 tests) and `tests/army-list/enhancementSummaryBar.test.tsx` used `computeListHealthStats(units, limit, "fresh", enhancementTotal)` and `freshness="fresh"` prop on `ArmyListSummaryBar` respectively — both caused TS2554/TS2322 errors
- **Fix:** Dropped the `"fresh"` argument from all 5 call sites in `computeListHealthStats.test.ts`; removed `freshness="fresh"` prop from `enhancementSummaryBar.test.tsx`
- **Files modified:** tests/army-list/computeListHealthStats.test.ts, tests/army-list/enhancementSummaryBar.test.tsx
- **Commit:** 6ebd0306 (test file), f536419f (enhancement test)

**2. [Rule 3 - Pitfall 5] ArmyListDetailPage.tsx retains useUdbMeta**
- **Found during:** Task 2 pre-execution verification
- **Issue:** Research verified udbMeta is used ONLY for freshness (A1), but live file read revealed line 673 `rulesSynced={udbMeta != null}` — `udbMeta` has a second use
- **Fix:** Kept `useUdbMeta` hook and its import; only removed the `getSyncFreshness` import and the freshness `useMemo`
- **Files modified:** src/features/army-lists/ArmyListDetailPage.tsx
- **Note:** This is a discrepancy from the RESEARCH.md which stated A1 as "VERIFIED: confirmed only used for getSyncFreshness at line 180" — the live file had additional use. The plan action text already included the safety guard: "Do NOT remove useUdbMeta if a fresh read shows any other udbMeta usage."

## Verification Results

- `grep -n "freshness" src/lib/computeUnitWarnings.ts` — no matches
- `grep -n "SyncFreshness" src/lib/computeUnitWarnings.ts tests/lib/computeUnitWarnings.test.ts` — no matches
- `grep -rn "SyncFreshness|getSyncFreshness|\.freshness|freshness=" src/features/army-lists/ArmyListSummaryBar.tsx src/features/army-lists/ArmyListDetailPage.tsx src/features/game-day/GameDayPage.tsx src/features/game-day/GameDayReadinessPanel.tsx` — no matches
- `grep -rn "SyncFreshness" tests/army-lists/ArmyListSummaryBar.test.tsx tests/game-day/GameDayReadinessPanel.test.tsx` — no matches
- `pnpm build` — exits 0 (TypeScript strict mode, no dangling imports)
- `pnpm test -- tests/lib/computeUnitWarnings.test.ts tests/army-lists/ArmyListSummaryBar.test.tsx tests/game-day/GameDayReadinessPanel.test.tsx` — 2749 tests pass
- `src/lib/backupFreshness.ts` — unchanged (git diff confirms no modifications)

## Known Stubs

None — this is a pure removal plan; no UI stubs or placeholder data introduced.

## Threat Flags

None — this plan removes dead code and tightens pure-function signatures. No new network endpoints, auth paths, file access patterns, or schema changes were introduced.

## Self-Check: PASSED

- src/lib/computeUnitWarnings.ts: modified (confirmed)
- src/features/army-lists/ArmyListSummaryBar.tsx: modified (confirmed)
- src/features/army-lists/ArmyListDetailPage.tsx: modified (confirmed)
- src/features/game-day/GameDayPage.tsx: modified (confirmed)
- src/features/game-day/GameDayReadinessPanel.tsx: modified (confirmed)
- Commit 6ebd0306: exists (Task 1)
- Commit f536419f: exists (Task 2)
