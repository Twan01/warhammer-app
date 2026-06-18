---
phase: 140-close-play-02-03-tail-repoint-rules-hub-datasheetpointstab-f
plan: "01"
subsystem: rules-hub
tags: [leader-targets, canonical-db, dead-code-removal, data-layer-test]
dependency_graph:
  requires: [phase-137-canonical-leader-attachment]
  provides: [canonical-faction-leader-targets-read, dead-reader-retirement]
  affects: [DatasheetPointsTab, useBsdataFaction, bsdataExtended]
tech_stack:
  added: []
  patterns:
    - faction-scoped double-join through udb_leader_targets + udb_units (D-02)
    - staleTime/gcTime Infinity canonical hook pattern
    - node-env data-layer test with createFullDb() + FK-OFF seed + FK-ON query
key_files:
  created:
    - tests/data-layer/leaderTargetsByFaction.test.ts
  modified:
    - src/db/queries/leaderTargets.ts
    - src/hooks/useLeaderTargets.ts
    - src/features/rules-hub/DatasheetPointsTab.tsx
    - src/db/queries/bsdataExtended.ts
    - src/hooks/useBsdataFaction.ts
    - tests/army-list/ArmyListsPage.test.tsx
decisions:
  - No DISTINCT in getLeaderTargetsByFactionCanonical: composite PK on (leader_unit_id, target_unit_id) plus 1:1 name joins in udb_units guarantee uniqueness (RESEARCH-verified)
  - Distinct key namespace "leader-targets-by-faction-canonical" vs retired "leader-targets-by-faction" to avoid React Query cache collision (Pitfall 3)
  - Comment references to dead symbol names cleaned (not just code references) for full grep-zero compliance
metrics:
  duration: "~18 minutes"
  completed: "2026-06-18"
  tasks_completed: 3
  files_changed: 7
---

# Phase 140 Plan 01: Close PLAY-02/03 Tail — Repoint Rules Hub DatasheetPointsTab Summary

Repointed the Rules Hub DatasheetPointsTab "Leader — Can attach to" section from the dead `synced_leader_targets` table (zero writers in the Wahapedia-only pipeline) to the canonical `udb_leader_targets` table via a new faction-scoped double-join query and hook, then retired the three dead reader symbols and their stale test mock.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Wave-0 data-layer test for faction-scoped canonical query | 64f18fe7 | tests/data-layer/leaderTargetsByFaction.test.ts (+168 lines) |
| 2 | Add canonical query + hook, repoint DatasheetPointsTab | 5b156231 | leaderTargets.ts, useLeaderTargets.ts, DatasheetPointsTab.tsx |
| 3 | Retire dead synced-table readers + clean stale test mock | 66dd29ff | bsdataExtended.ts, useBsdataFaction.ts, ArmyListsPage.test.tsx, leaderTargets.ts, useLeaderTargets.ts |

## Verification Results

- `grep -rn 'getLeaderTargetsByFaction\b|useLeaderTargetsByFaction\b|SyncedLeaderTargetRow|synced_leader_targets' src tests` — **zero matches**
- `pnpm build` — exit 0, strict TypeScript clean (noUnusedLocals catches orphaned imports)
- `pnpm test` — exit 0, **2893 tests passed** (316 test files, 6 skipped, 38 todo)
- Three new data-layer test cases all green: correct ordered pairs for FA, cross-faction exclusion, unknown-faction empty

## What Was Built

### New symbols

**`CanonicalLeaderTargetRow`** (`src/db/queries/leaderTargets.ts`) — interface with `leader_name: string`, `faction_id: string | null`, `target_name: string`. Shape is identical to the retired synced-table row type (D-04) so the JSX filter/badge body in DatasheetContent needed no changes.

**`getLeaderTargetsByFactionCanonical(factionId: string)`** (`src/db/queries/leaderTargets.ts`) — double-join SELECT through `udb_leader_targets → udb_units leader_u → udb_units target_u`, `WHERE leader_u.faction_id = $1`, `ORDER BY leader_name, target_name`. No DISTINCT (composite PK + 1:1 name joins). `$1` positional bind per Tauri plugin-sql requirement (T-140-01).

**`LEADER_TARGETS_BY_FACTION_KEY`** + **`useLeaderTargetsByFactionCanonical`** (`src/hooks/useLeaderTargets.ts`) — React Query hook with `staleTime: Infinity`, `gcTime: Infinity`, `enabled: factionId !== undefined`. Key namespace `"leader-targets-by-faction-canonical"` distinguishes it from the retired `"leader-targets-by-faction"` (Pitfall 3 avoidance).

### Component repoint

**`DatasheetPointsTab.tsx`** — swapped import of `useLeaderTargetsByFaction` from `useBsdataFaction` to `useLeaderTargetsByFactionCanonical` from `useLeaderTargets`; swapped type import of `SyncedLeaderTargetRow` from `bsdataExtended` to `CanonicalLeaderTargetRow` from `leaderTargets`; replaced two prop-type annotations on `DatasheetDetail` and `DatasheetContent`; swapped the hook call on the `leaderTargets` data binding. Filter (`l.leader_name === unitName`) and badge JSX (`t.target_name`) left untouched.

### Dead symbol retirement

- **`bsdataExtended.ts`**: Removed `SyncedLeaderTargetRow` interface + `getLeaderTargetsByFaction` function (sole consumer of `synced_leader_targets`).
- **`useBsdataFaction.ts`**: Removed `getLeaderTargetsByFaction` import, `LEADER_TARGETS_KEY` factory, `useLeaderTargetsByFaction` hook. Updated module doc comment from "Three hooks" to "Two hooks". Preserved `useModelCountsByFaction`, `useLoadoutOptionsByFaction`, `MODEL_COUNTS_KEY`, `LOADOUT_OPTIONS_KEY`.
- **`ArmyListsPage.test.tsx`**: Removed `getLeaderTargetsByFaction: vi.fn().mockResolvedValue([])` from `@/db/queries/bsdataExtended` mock factory; kept `getEnhancementsByFaction`.

### Data-layer test

**`tests/data-layer/leaderTargetsByFaction.test.ts`** — `@vitest-environment node`, mirrors `leader-targets.test.ts` harness (`createFullDb()` in-memory DB + full 50-migration chain + PRAGMA FK=ON). Seeds 2 factions (FA/FB), 5 udb_units (LA, TA1, TA2, LB, TB1), 3 udb_leader_targets rows (LA→TA1, LA→TA2, LB→TB1) with FK-OFF pattern. SQL replicated inline with `?` (better-sqlite3) noting `$1` divergence from production. Three cases: correct ordered pairs, cross-faction exclusion, unknown-faction empty.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Cleaned dead symbol references in JSDoc comments**
- **Found during:** Task 3 acceptance criteria check (`grep -rn '...' src tests` returned comment hits)
- **Issue:** Comment lines in `leaderTargets.ts`, `useLeaderTargets.ts`, and `useBsdataFaction.ts` still mentioned the retired symbol names, causing the plan's grep-zero acceptance check to technically fail
- **Fix:** Updated three comment lines to remove or rephrase the dead symbol names (`SyncedLeaderTargetRow`, `useLeaderTargetsByFaction`, `getLeaderTargetsByFaction`, `synced_leader_targets`) while preserving the historical context and provenance information
- **Files modified:** src/db/queries/leaderTargets.ts, src/hooks/useLeaderTargets.ts, src/hooks/useBsdataFaction.ts
- **Commit:** 66dd29ff (included in Task 3 commit)

## Known Stubs

None — all stubs scanned. The DatasheetPointsTab leader section now reads real data from the canonical udb_leader_targets table. The "Leader — Can attach to" section will render actual target badges for factions with canonical leader pairs in the imported udb data, and show nothing (empty array guard `leaderTargets.length > 0`) for non-leader units or factions with no pairs.

## Threat Surface Scan

No new network endpoints, auth paths, file access patterns, or schema changes introduced. The new `getLeaderTargetsByFactionCanonical` query is a read-only SELECT on existing canonical tables with a parameterized `$1` bind (T-140-01 mitigated). No new threat surface beyond what was in the plan's threat model.

## Self-Check: PASSED

| Check | Result |
|-------|--------|
| tests/data-layer/leaderTargetsByFaction.test.ts exists | FOUND |
| src/db/queries/leaderTargets.ts exists | FOUND |
| src/hooks/useLeaderTargets.ts exists | FOUND |
| commit 64f18fe7 exists | FOUND |
| commit 5b156231 exists | FOUND |
| commit 66dd29ff exists | FOUND |
