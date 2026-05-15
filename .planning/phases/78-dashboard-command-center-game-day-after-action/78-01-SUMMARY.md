---
phase: 78
plan: 01
status: complete
commit: 8783dfe
---

# Plan 78-01 Summary — Battle Log Data Layer + useNextPaintingAction

## What was done

### Task 1: Extended BattleLog types, schema, queries, and hooks
- Added `forgotten_rules`, `mvp_notes`, `underperformer_notes`, `promoted_to_reminder` to `BattleLog` interface
- Extended `battleLogSchema` with `forgotten_rules`, `mvp_notes`, `underperformer_notes`
- Updated `createBattleLog` INSERT (14→17 params) and `updateBattleLog` SET clause (15→18 params)
- Added `getRecentForgottenRules(armyListId)` — queries last 3 battle logs, parses JSON, deduplicates
- Added `useForgottenRules` hook and `FORGOTTEN_RULES_KEY` to useBattleLogs.ts
- Fixed cascading type errors in BattleLogSheet.tsx and test files

### Task 2: Created useNextPaintingAction hook
- Added `FirstIncompleteStep` interface and `getMostRecentAssignmentWithIncompleteStep()` to recipeAssignments.ts
- Single SQL query with 5 JOINs, `WHERE p.id IS NULL`, `ORDER BY a.created_at DESC, rs.order_index ASC LIMIT 1`
- Created `useNextPaintingAction` hook composing step query + `useRecipePaints` + `usePaints` for paint availability
- Returns `NextPaintingAction` with `paints: PaintAvailability[]` (owned/missing/running-low per paint)

## Deviations
- Fixed pre-existing TS errors in `tests/data-health/versionInfoCard.test.tsx` (mock casts needed `as unknown as`)

## Verification
- `npx tsc --noEmit` exits 0
- All existing tests pass
