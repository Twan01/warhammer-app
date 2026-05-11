---
phase: 52-schema-data-layer-foundation
plan: "03"
subsystem: database
tags: [react-query, sqlite, rules, favorites, notes, optimistic-updates]

# Dependency graph
requires:
  - phase: 52-01
    provides: "RulesFavorite, RulesNote types; rules_favorites and rules_notes migration tables in hobbyforge.db"

provides:
  - "getDetachmentById(id) and getStratagemsByDetachment(id) query functions in rulesExtended.ts"
  - "rulesFavorites.ts query module (getRulesFavorites, getRulesFavoritesByType, upsertRulesFavorite, deleteRulesFavorite)"
  - "rulesNotes.ts query module (getRulesNotes, getRulesNoteByKey, upsertRulesNote)"
  - "useRulesExtended.ts extended with DETACHMENT_BY_ID_KEY, STRATAGEMS_BY_DETACHMENT_KEY, useDetachmentById, useStratagemsByDetachment"
  - "useRulesFavorites.ts with optimistic upsert + delete mutations and rollback"
  - "useRulesNotes.ts with upsert mutation"
  - "useRulesSync.ts onSuccess wired to invalidate detachment-by-id and stratagems-by-detachment (not favorites/notes)"

affects:
  - 53-rules-data-hub-ui
  - 54-army-lists-2
  - 55-game-day
  - 56-finish

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Optimistic mutation pattern: onMutate cancel+snapshot, onError rollback, onSettled invalidate"
    - "INSERT OR REPLACE with COALESCE subquery preserves created_at on upsert"
    - "staleTime: Infinity for all rules.db hooks — invalidation only on explicit sync"
    - "Hobbyforge.db hooks (favorites/notes) are NOT invalidated by rules sync — rules.db is wiped on sync but hobbyforge.db survives"

key-files:
  created:
    - src/db/queries/rulesFavorites.ts
    - src/db/queries/rulesNotes.ts
    - src/hooks/useRulesFavorites.ts
    - src/hooks/useRulesNotes.ts
  modified:
    - src/db/queries/rulesExtended.ts
    - src/hooks/useRulesExtended.ts
    - src/hooks/useRulesSync.ts
    - tests/datasheet/useRulesSync.test.ts

key-decisions:
  - "useRulesFavorites optimistic updates use placeholder id=-1; onSettled refetch brings real data"
  - "useRulesSync.ts invalidates detachment-by-id and stratagems-by-detachment but NOT rules-favorites or rules-notes (hobbyforge.db survives wipe)"

patterns-established:
  - "COALESCE on INSERT OR REPLACE: preserves created_at when replacing existing row by composite UNIQUE key"
  - "Optimistic mutation context type must be typed explicitly in TContext generic of useMutation for TypeScript strict mode"

requirements-completed: []

# Metrics
duration: 7min
completed: 2026-05-10
---

# Phase 52 Plan 03: Query Modules + Hooks for Favorites, Notes, and Detachment Queries Summary

**React Query data layer for rules_favorites and rules_notes (hobbyforge.db) with optimistic mutations, plus getDetachmentById/getStratagemsByDetachment (rules.db) with staleTime: Infinity and sync invalidation wiring**

## Performance

- **Duration:** ~7 min
- **Started:** 2026-05-10T18:12:04Z
- **Completed:** 2026-05-10T18:18:40Z
- **Tasks:** 2
- **Files modified:** 8 (4 created, 4 modified)

## Accomplishments
- Created rulesFavorites.ts and rulesNotes.ts query modules with INSERT OR REPLACE + COALESCE upsert pattern
- Created useRulesFavorites.ts with full optimistic update and rollback for both upsert and delete mutations
- Extended rulesExtended.ts and useRulesExtended.ts with getDetachmentById, getStratagemsByDetachment, and corresponding hooks
- Wired useRulesSync.ts onSuccess to invalidate the two new rules.db keys (detachment-by-id, stratagems-by-detachment) while correctly omitting favorites/notes (hobbyforge.db survives sync)

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend rulesExtended.ts queries + create rulesFavorites.ts and rulesNotes.ts** - `4587d60` (feat)
2. **Task 2: Create hooks + wire sync invalidation** - `d6022c6` (feat)

## Files Created/Modified
- `src/db/queries/rulesExtended.ts` - Added getDetachmentById and getStratagemsByDetachment
- `src/db/queries/rulesFavorites.ts` - New: getRulesFavorites, getRulesFavoritesByType, upsertRulesFavorite, deleteRulesFavorite
- `src/db/queries/rulesNotes.ts` - New: getRulesNotes, getRulesNoteByKey, upsertRulesNote
- `src/hooks/useRulesExtended.ts` - Added DETACHMENT_BY_ID_KEY, STRATAGEMS_BY_DETACHMENT_KEY, useDetachmentById, useStratagemsByDetachment
- `src/hooks/useRulesFavorites.ts` - New: RULES_FAVORITES_KEY, useRulesFavorites, useUpsertRulesFavorite (optimistic), useDeleteRulesFavorite (optimistic)
- `src/hooks/useRulesNotes.ts` - New: RULES_NOTES_KEY, useRulesNotes, useUpsertRulesNote
- `src/hooks/useRulesSync.ts` - Added detachment-by-id and stratagems-by-detachment to onSuccess invalidation
- `tests/datasheet/useRulesSync.test.ts` - Updated SYNC-05 test from 8 to 10 expected invalidation calls

## Decisions Made
- useRulesFavorites optimistic updates use placeholder id=-1 for new entries; onSettled refetch brings real server data
- The TContext generic must be typed explicitly in useMutation calls to satisfy TypeScript strict mode when context is used in onError

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Updated useRulesSync SYNC-05 test to match 10 invalidation calls**
- **Found during:** Task 2 (verification run after wiring sync invalidation)
- **Issue:** Existing test expected exactly 8 invalidateQueries calls; adding 2 Phase 52 calls caused it to fail with "expected 8, got 10"
- **Fix:** Updated test description and count to 10, added assertions for detachment-by-id and stratagems-by-detachment
- **Files modified:** tests/datasheet/useRulesSync.test.ts
- **Verification:** pnpm test passes (1112 tests, 134 files)
- **Committed in:** d6022c6 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - test count mismatch)
**Impact on plan:** Necessary correction — the test was validating prior behavior that this plan intentionally extends.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Complete data access layer for phases 53-56: all hooks are exported and ready to import
- Downstream UI phases (53-56) can call useRulesFavorites, useRulesNotes, useDetachmentById, useStratagemsByDetachment directly
- No DB migration needed — tables were created in plan 52-01

---
*Phase: 52-schema-data-layer-foundation*
*Completed: 2026-05-10*
