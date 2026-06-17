---
phase: 137-canonical-leader-attachment
plan: "03"
subsystem: query/hook/ui
tags: [army-lists, leader-attachment, canonical-validation, react-query, sqlite, play-03]
dependency_graph:
  requires: [137-02 — populated udb_leader_targets table + bundled JSON with 1901 pairs]
  provides: [getLeaderTargetsForList query, useLeaderTargets(listId) hook, canonical leader validation UI, permissive NULL fallback, component tests]
  affects: [src/db/queries/leaderTargets.ts, src/hooks/useLeaderTargets.ts, src/features/army-lists/LeaderAttachmentSheet.tsx, src/features/army-lists/ArmyListDetailPage.tsx, src/features/army-lists/ArmyListUnitTable.tsx, src/features/army-lists/ArmyListUnitRow.tsx, tests/army-lists/LeaderAttachmentSheet.test.tsx]
tech_stack:
  added: []
  patterns: [batch-list-level-query, staleTime-Infinity-gcTime-Infinity, null-permissive-sentinel, id-based-prop-chain, single-hook-call-at-sheet-level]
key_files:
  created:
    - src/db/queries/leaderTargets.ts
  modified:
    - src/hooks/useLeaderTargets.ts
    - src/features/army-lists/LeaderAttachmentSheet.tsx
    - src/features/army-lists/ArmyListDetailPage.tsx
    - src/features/army-lists/ArmyListUnitTable.tsx
    - src/features/army-lists/ArmyListUnitRow.tsx
    - tests/army-lists/LeaderAttachmentSheet.test.tsx
decisions:
  - "D-07: getLeaderTargetsForList called ONCE at sheet level via useLeaderTargets(list?.id ?? null); validTargetIds Set built at sheet level, never per-row (Pitfall 6 / hooks-in-loop prevented)"
  - "D-08: useLeaderTargets rewritten from factionId-keyed (5 min staleTime) to listId-keyed with staleTime: Infinity + gcTime: Infinity (FBK-10 alignment); CanonicalLeaderPairRow[] shape"
  - "D-09: null udb_unit_id produces null validTargetIds (PERMISSIVE sentinel = all units selectable + advisory); empty Set retained for canonical zero-targets meaning; Pitfall 5 regression covered by test"
  - "D-10 partial: SyncedLeaderTargetRow removed from army-list prop chain (LeaderAttachmentSheet, ArmyListDetailPage, ArmyListUnitTable, ArmyListUnitRow); bsdataExtended.ts not yet touched (rules-hub still consumes it — 137-04 scope)"
  - "isLeader indicator repointed from name-match .some() to canonical Set<number>.has(unit.id)"
metrics:
  duration: "25 minutes"
  completed: "2026-06-17T23:45:00Z"
  tasks: 3
  files: 7
---

# Phase 137 Plan 03: Query Module + Hook Rewrite + UI Repoint — Summary

**One-liner:** Canonical leader attachment wired end-to-end — `getLeaderTargetsForList` FK join replaces name-matching, `useLeaderTargets(listId)` with `staleTime: Infinity`, `LeaderAttachmentSheet` validates against id-based pairs with permissive NULL fallback, `isLeader` indicator repointed to canonical `Set<number>`.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | New leaderTargets query module (additive) | ec573876 | src/db/queries/leaderTargets.ts |
| 2 | Rewrite hook + repoint ALL call sites atomically | 18f72ccc | src/hooks/useLeaderTargets.ts, LeaderAttachmentSheet.tsx, ArmyListDetailPage.tsx, ArmyListUnitTable.tsx, ArmyListUnitRow.tsx |
| 3 | Component test — canonical path + NULL permissive fallback | bb231795 | tests/army-lists/LeaderAttachmentSheet.test.tsx |

## What Was Built

### `src/db/queries/leaderTargets.ts` (new)

Exports `CanonicalLeaderPairRow { leader_alu_id: number; target_alu_id: number }` and `getLeaderTargetsForList(listId: number)`. Joins `army_list_units → units → udb_leader_targets → units → army_list_units` using `$1` positional params only (T-137-06 mitigated). Units with NULL `udb_unit_id` produce no rows — handled as permissive fallback in the sheet.

### `src/hooks/useLeaderTargets.ts` (rewritten)

- Drops `getLeaderTargetsByFaction` / `SyncedLeaderTargetRow` imports from `bsdataExtended`
- Exports `LEADER_TARGETS_KEY(listId: number)` and `useLeaderTargets(listId: number | null)`
- Returns `useQuery<CanonicalLeaderPairRow[]>` with `enabled: listId != null`, `staleTime: Infinity`, `gcTime: Infinity` (FBK-10 alignment)

### `src/features/army-lists/LeaderAttachmentSheet.tsx` (repointed)

**Lines 44–70 replaced:** Removed faction-keyed name-match (`factionIdStr`, `leaderTargets`, `validTargetNames`, `validTargetUnits` name filter). Added:
- `const { data: leaderTargetPairs = [] } = useLeaderTargets(list?.id ?? null)` — single call at sheet level (D-07 / Pitfall 6)
- `leaderHasCanonicalData = unit?.udb_unit_id != null`
- `validTargetIds` memo: `null` when `!unit || !leaderHasCanonicalData` (PERMISSIVE sentinel, D-09 / Pitfall 5); otherwise `Set<number>` of `target_alu_id` filtered by `p.leader_alu_id === unit.id`
- `validTargetUnits` memo: full `units` when `validTargetIds === null` (permissive); filtered by Set otherwise
- Advisory paragraph renders when `!leaderHasCanonicalData`

JSX updated: removed `factionIdStr` guards, replaced with `leaderHasCanonicalData` and `validTargetIds` checks. Empty state message updated. `currentTarget` (lines 72–76) and `existingLeader` id-check (lines 136–142) unchanged.

### `src/features/army-lists/ArmyListDetailPage.tsx` (repointed)

- Line 88: `useLeaderTargets(factionIdStr)` → `useLeaderTargets(list?.id != null ? list.id : null)`
- Added `leaderAluIds` useMemo: `new Set(leaderTargetPairs ?? []).map(p => p.leader_alu_id))`
- Line 360: `leaderTargets={leaderTargets ?? []}` → `leaderAluIds={leaderAluIds}`

### `src/features/army-lists/ArmyListUnitTable.tsx` (repointed)

- Removed `SyncedLeaderTargetRow` import from `bsdataExtended`
- `SortableUnitRow` prop: `leaderTargets: SyncedLeaderTargetRow[]` → `leaderAluIds: Set<number>`
- `ArmyListUnitTableProps`: same rename with JSDoc
- Internal pass-through to `ArmyListUnitRow` updated

### `src/features/army-lists/ArmyListUnitRow.tsx` (repointed)

- Removed `SyncedLeaderTargetRow` import from `bsdataExtended`
- Prop `leaderTargets?: SyncedLeaderTargetRow[]` → `leaderAluIds?: Set<number>`
- `isLeader = leaderTargets.some(lt => lt.leader_name.toLowerCase() === unit.unit_name.toLowerCase())` → `isLeader = leaderAluIds?.has(unit.id) ?? false`

### `tests/army-lists/LeaderAttachmentSheet.test.tsx` (rewritten)

- Mock changed: `useLeaderTargets` now returns controlled `CanonicalLeaderPairRow[]` via `mockLeaderPairs` module-level variable
- `makeUnit` updated: `udb_unit_id: "SM_CAPTAIN"` as default (canonical; tests that need NULL override it)
- **Test 1 (canonical path):** paired target renders; unpaired unit excluded; no advisory
- **Test 2 (NULL permissive fallback — D-09 regression guard):** `udb_unit_id: null` → ALL units shown + advisory present
- Additional: attach/detach mutate call assertions, disabled tooltip, empty state (canonical zero-targets), title render, source `toast.success` verification
- All 2829 tests pass

## Verification Results

- `pnpm build` green after Task 1 (additive — no consumers) and after Task 2 (hook rewrite + all call sites moved atomically)
- `pnpm test -- tests/army-lists/LeaderAttachmentSheet.test.tsx` green (all tests pass, 0 failures)
- Full `pnpm test` green: 2829 passed, 0 failed

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing critical functionality] Added `gcTime: Infinity` alongside `staleTime: Infinity`**
- **Found during:** Task 3 (FBK-10 gate failure)
- **Issue:** A project-level test (`FBK-10-gcTimeAlignment`) enforces that every `staleTime: Infinity` in the codebase has a matching `gcTime: Infinity` in the same `useQuery` block. The initial hook rewrite omitted `gcTime`.
- **Fix:** Added `gcTime: Infinity` to `useLeaderTargets` in the same commit as the test fix (Task 3 commit).
- **Files modified:** `src/hooks/useLeaderTargets.ts`
- **Commit:** bb231795

**2. [Rule 1 - Bug] Corrected test assertions for permissive path button count**
- **Found during:** Task 3 (test run)
- **Issue:** Tests expected 2 and 3 Attach Leader buttons respectively in the permissive path, but the permissive path shows ALL units including the leader itself — correct counts are 3 and 4.
- **Fix:** Updated `expect(attachButtons.length).toBe(N)` to match actual correct behavior (all units, including leader, shown in permissive mode).
- **Files modified:** `tests/army-lists/LeaderAttachmentSheet.test.tsx`
- **Commit:** bb231795

## Known Stubs

None. The query module, hook, sheet, and isLeader indicator are all fully wired. The canonical path requires `udb_leader_targets` to be populated at runtime (via Plan 02 pipeline + app-startup import). The permissive NULL fallback keeps ghost/manual units functional regardless.

## Threat Flags

None. The only SQL input is `listId` (internal numeric value, bound via `$1`). No new network endpoints or auth paths introduced. T-137-06 mitigated (parameterized). T-137-07 accepted (permissive widening is deliberate). T-137-08 mitigated (single hook call at sheet level).

## Self-Check: PASSED

- `src/db/queries/leaderTargets.ts` exists and contains `getLeaderTargetsForList` — confirmed
- `src/hooks/useLeaderTargets.ts` contains `staleTime: Infinity` and `gcTime: Infinity` — confirmed
- `src/features/army-lists/LeaderAttachmentSheet.tsx` contains `validTargetIds` and advisory text — confirmed
- `src/features/army-lists/ArmyListDetailPage.tsx` contains `leaderAluIds` — confirmed
- `src/features/army-lists/ArmyListUnitRow.tsx` contains `leaderAluIds?.has(unit.id)` — confirmed
- `tests/army-lists/LeaderAttachmentSheet.test.tsx` contains canonical path + NULL fallback tests — confirmed
- Commit ec573876 exists in git log — confirmed
- Commit 18f72ccc exists in git log — confirmed
- Commit bb231795 exists in git log — confirmed
