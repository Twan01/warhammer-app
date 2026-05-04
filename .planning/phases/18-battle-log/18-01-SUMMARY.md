---
phase: 18-battle-log
plan: "01"
subsystem: data-layer
tags: [battle-log, typescript, tanstack-query, zod, sql, tdd]
dependency_graph:
  requires: [18-00]
  provides: [battle-log-data-layer, battle-log-types, battle-log-queries, battle-log-hooks, battle-log-schema]
  affects: [18-02, 18-03]
tech_stack:
  added: []
  patterns: [query-module, hook-module, pure-aggregation, full-replacement-update, zod-schema]
key_files:
  created:
    - src/types/battleLog.ts
    - src/db/queries/battleLogs.ts
    - src/features/battle-log/computeBattleLogSummary.ts
    - src/hooks/useBattleLogs.ts
    - src/features/battle-log/battleLogSchema.ts
  modified:
    - tests/battle-log/battleLogQueries.test.ts
    - tests/battle-log/computeBattleLogSummary.test.ts
decisions:
  - "Full-replacement UPDATE in updateBattleLog (NOT COALESCE) for army_list_id, mvp_unit_id, underperforming_unit_id — enables users to clear nullable FKs back to NULL (Pitfall 5)"
  - "Cache keys: ['battle-logs'] for index and ['battle-logs', 'summary'] for aggregated summary — matches useArmyLists convention"
  - "All mutations invalidate ['dashboard-stats'] for forward-compat with future dashboard win/loss totals"
  - "battleLogSchema deliberately avoids zod .default() — matches armyListSchema pattern; form defaultValues handle defaults to avoid react-hook-form Resolver type inference breakage"
metrics:
  duration: "8 minutes"
  completed: "2026-05-04"
  tasks_completed: 2
  files_created: 5
  files_modified: 2
  tests_added: 14
  tests_passing: 14
---

# Phase 18 Plan 01: Battle Log Data Layer Summary

**One-liner:** Battle log data layer: TypeScript types + SQL query module (full-replacement UPDATE, Pitfall 5) + pure aggregation + TanStack Query hooks + Zod form schema — 14/14 tests GREEN.

## What Was Built

Wave 1 of Phase 18 delivers the complete data layer for the Battle Log feature. Five source files provide the contract surface that Plan 02 (UI) consumes directly. Two Wave-0 test files were flipped from stubs to active.

### Files Created

| File | Purpose | Key Exports |
|------|---------|-------------|
| `src/types/battleLog.ts` | TypeScript interfaces mirroring battle_logs schema | `BattleLog`, `BattleLogResult`, `BATTLE_LOG_RESULTS`, `CreateBattleLogInput`, `UpdateBattleLogInput` |
| `src/db/queries/battleLogs.ts` | All SQL CRUD for battle_logs | `getBattleLogs`, `getBattleLogSummary`, `createBattleLog`, `updateBattleLog`, `deleteBattleLog` |
| `src/features/battle-log/computeBattleLogSummary.ts` | Pure aggregation: GROUP BY rows → stats | `computeBattleLogSummary`, `BattleLogSummary` |
| `src/hooks/useBattleLogs.ts` | TanStack Query hooks wrapping query module | `BATTLE_LOGS_KEY`, `BATTLE_LOG_SUMMARY_KEY`, `useBattleLogs`, `useBattleLogSummary`, `useCreateBattleLog`, `useUpdateBattleLog`, `useDeleteBattleLog` |
| `src/features/battle-log/battleLogSchema.ts` | Zod validation schema for create/edit Sheet | `battleLogSchema`, `BattleLogFormValues`, `BATTLE_LOG_RESULTS` (re-export) |

### Files Modified (Wave-0 stubs flipped to active)

| File | Change |
|------|--------|
| `tests/battle-log/battleLogQueries.test.ts` | 8 `it.skip` stubs → 8 active tests; `as unknown as` cast fix for TS2352 |
| `tests/battle-log/computeBattleLogSummary.test.ts` | 6 `it.skip` stubs → 6 active tests |

## Public API Surface

### Cache Keys
```typescript
BATTLE_LOGS_KEY = ["battle-logs"] as const
BATTLE_LOG_SUMMARY_KEY = ["battle-logs", "summary"] as const
```

### SQL Contracts
- `getBattleLogs()` — `SELECT * FROM battle_logs ORDER BY battle_date DESC, created_at DESC`
- `getBattleLogSummary()` — `SELECT result, COUNT(*) AS count FROM battle_logs GROUP BY result`
- `createBattleLog(input)` — INSERT 14 columns ($1..$14), returns `lastInsertId`
- `updateBattleLog(input)` — Full-replacement UPDATE, no COALESCE (Pitfall 5)
- `deleteBattleLog(id)` — `DELETE FROM battle_logs WHERE id = $1`

### Zod Schema Required Fields
- `battle_date` — `string`, min 1, regex `/^\d{4}-\d{2}-\d{2}$/`
- `opponent_faction` — `string`, min 1, max 120
- `mission` — `string`, min 1, max 120
- `result` — `z.enum(["Win", "Loss", "Draw"])`

## Test Results

```
Test Files  2 passed (2)
     Tests  14 passed (14)
  Start at  13:59:04
  Duration  1.73s
```

Full suite: 329 passed | 2 skipped | 0 failed.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed TS2352 type cast in battleLogQueries.test.ts**
- **Found during:** Task 1 verification (`pnpm tsc --noEmit`)
- **Issue:** Wave-0 stub test at line 95 used `input as Parameters<typeof createBattleLog>[0]` which TypeScript rejected (TS2352: types don't sufficiently overlap) because `notes: undefined` is not assignable to `string | null`
- **Fix:** Changed to `input as unknown as Parameters<typeof createBattleLog>[0]` — two-step cast via `unknown` is the correct TypeScript pattern for "I know this is intentionally bad-shaped for testing"
- **Files modified:** `tests/battle-log/battleLogQueries.test.ts` line 95
- **Commit:** 302988b

## Key Decisions

1. **Full-replacement UPDATE (Pitfall 5):** `updateBattleLog` uses explicit `SET army_list_id = $2, mvp_unit_id = $11, underperforming_unit_id = $12` — NOT `COALESCE()`. This allows the user to clear all three nullable FK columns back to NULL from the edit form. Verified by test: "does NOT use COALESCE".

2. **Cache key convention:** `["battle-logs"]` for the main list (matches `["army-lists"]`, `["units"]` etc.). Summary uses `["battle-logs", "summary"]` as a child key — consistent with how `ARMY_LIST_UNITS_KEY(id)` extends `ARMY_LISTS_KEY`.

3. **Dashboard-stats invalidation:** All three mutations (create, update, delete) also invalidate `["dashboard-stats"]` as forward-compat wiring — matches `useArmyLists`, `useUnits`, `useSpendingStats`.

4. **No zod .default():** `battleLogSchema` avoids `.default()` on any field — same decision as `armyListSchema`. React-hook-form's `zodResolver` type inference breaks with zod v4 `.default()`. Form defaultValues in the Sheet component handle initial values instead.

## Self-Check: PASSED

All 5 source files exist on disk. All 3 task commits confirmed in git history:
- `6c57de6` feat(18-01): create types, query module, computeBattleLogSummary + activate 14 tests
- `42ae725` test(18-01): flip Wave-0 stubs to active — 14 battle-log tests now passing
- `302988b` feat(18-01): add useBattleLogs hooks + battleLogSchema (zod) + fix TS cast in test
