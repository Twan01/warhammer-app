---
phase: 120-ui-wiring
plan: 01
subsystem: database
tags: [react-query, sqlite, typescript, game-data, stratagems, enhancements, detachments]

# Dependency graph
requires:
  - phase: 119-stratagems-enhancements-import
    provides: udb_stratagems and udb_enhancements tables (migration 043)
  - phase: 118-detachments-import
    provides: udb_detachments and udb_detachment_abilities tables (migration 042)
provides:
  - UdbStratagem, UdbEnhancement, UdbDetachment, UdbDetachmentAbility TypeScript interfaces
  - Six parameterized query functions targeting hobbyforge.db (udbGameData.ts)
  - Seven React Query hooks with staleTime Infinity (useGameData.ts)
  - StratagemCard and GameDayStratagemCard accept UdbStratagem with numeric cp_cost, turn badges, HTML descriptions
  - DetachmentCard wired to real useDetachmentAbilitiesByDetachment hook (stub removed)
  - applyStratagemFilters updated to UdbStratagem[] with String(cp_cost) coercion
affects: [120-ui-wiring, rules-hub, game-day, army-lists, playbook-tab]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "staleTime: Infinity for all static rules reference data hooks"
    - "Universal stratagem inclusion via OR (faction_id IS NULL AND detachment_id IS NULL) in SQL"
    - "dangerouslySetInnerHTML for Wahapedia HTML description fields across all card components"
    - "String(s.cp_cost) coercion in filter comparison (cp_cost is number in UdbStratagem, filter UI produces strings)"

key-files:
  created:
    - src/types/gameData.ts
    - src/db/queries/udbGameData.ts
    - src/hooks/useGameData.ts
  modified:
    - src/features/rules-hub/applyRulesHubFilters.ts
    - src/features/rules-hub/StratagemCard.tsx
    - src/features/game-day/GameDayStratagemCard.tsx
    - src/features/rules-hub/DetachmentCard.tsx
    - tests/rules-hub/applyRulesHubFilters.test.ts
    - tests/rules-hub/DetachmentCard.test.tsx
    - tests/rules-hub/StratagemCard.test.tsx

key-decisions:
  - "getStratagemsByDetachment includes universal stratagems (faction_id IS NULL AND detachment_id IS NULL) per D-02/D-04 — same logic for getStratagemsByFaction"
  - "cp_cost is stored as INTEGER in SQLite and typed as number in UdbStratagem — filter UI uses string comparison so String(cp_cost) coercion is required"
  - "useDetachmentAbilitiesByDetachment has no enabled guard (always enabled) because DetachmentCard always has a valid detachment.id"
  - "useDetachmentAbilities has enabled: !!factionId guard for PlaybookTab where faction may not be selected"
  - "Test fixtures migrated from RwStratagem to UdbStratagem; legend field replaced by type field in search test"

patterns-established:
  - "Game data hooks follow identical pattern to useUnitDatabase.ts: key factories, disabled fallback keys, staleTime Infinity"
  - "Card components use dangerouslySetInnerHTML for description rendering — data from controlled Wahapedia CSV import, not user input (T-120-01 accepted)"

requirements-completed: [STR-03, STR-04, ENH-02, ENH-03, DET-03, DET-04]

# Metrics
duration: 20min
completed: 2026-06-08
---

# Phase 120 Plan 01: Data Layer + Card Component Migration Summary

**TypeScript types, SQLite query functions, and React Query hooks for game data entities wired with updated StratagemCard/DetachmentCard/GameDayStratagemCard consuming UdbStratagem/UdbDetachment types with HTML rendering and turn badges**

## Performance

- **Duration:** ~20 min
- **Started:** 2026-06-08T18:20:00Z
- **Completed:** 2026-06-08T18:40:00Z
- **Tasks:** 2
- **Files modified:** 10 (3 new, 7 updated)

## Accomplishments

- Created complete data layer: `src/types/gameData.ts` (5 interfaces), `src/db/queries/udbGameData.ts` (6 query functions), `src/hooks/useGameData.ts` (7 React Query hooks)
- Removed DetachmentCard inline stub and wired it to the real `useDetachmentAbilitiesByDetachment` hook from useGameData
- Updated all four component/filter files to consume `UdbStratagem`/`UdbDetachment` types with correct numeric `cp_cost`, `dangerouslySetInnerHTML` descriptions, and turn badges

## Task Commits

1. **Task 1: Create types, query functions, and React Query hooks** - `f269687` (feat)
2. **Task 2: Migrate card components and filter function to UdbStratagem/UdbDetachment types** - `e5c2ef0` (feat)

## Files Created/Modified

- `src/types/gameData.ts` — UdbStratagem, UdbEnhancement, UdbDetachment, UdbDetachmentAbility, UdbDetachmentAbilityWithDetachment interfaces
- `src/db/queries/udbGameData.ts` — six parameterized query functions with $1/$2 positional params, universal stratagem inclusion logic
- `src/hooks/useGameData.ts` — seven React Query hooks with staleTime Infinity, enabled guards on nullable params
- `src/features/rules-hub/applyRulesHubFilters.ts` — switched to UdbStratagem[], String(s.cp_cost) coercion, type field for search
- `src/features/rules-hub/StratagemCard.tsx` — UdbStratagem prop, numeric cpLabel, turn badge, dangerouslySetInnerHTML
- `src/features/game-day/GameDayStratagemCard.tsx` — UdbStratagem prop, direct cp_cost (no parseInt), turn badge, dangerouslySetInnerHTML
- `src/features/rules-hub/DetachmentCard.tsx` — removed stub, wired real hook, UdbDetachment/UdbDetachmentAbility types, HTML descriptions
- `tests/rules-hub/applyRulesHubFilters.test.ts` — migrated fixtures from RwStratagem to UdbStratagem with numeric cp_cost
- `tests/rules-hub/DetachmentCard.test.tsx` — migrated to UdbDetachment, added vi.mock for useGameData
- `tests/rules-hub/StratagemCard.test.tsx` — migrated mock stratagem to UdbStratagem

## Decisions Made

- `getStratagemsByDetachment` and `getStratagemsByFaction` both include universal stratagems via `OR (faction_id IS NULL AND detachment_id IS NULL)` — required by D-02/D-04/D-07
- `String(s.cp_cost)` coercion in filter: SQLite returns `cp_cost` as an integer number in TypeScript, but the filter UI produces string values from select dropdowns
- `useDetachmentAbilitiesByDetachment` has no `enabled` guard — DetachmentCard always has a valid `detachment.id` passed to it
- `useDetachmentAbilities` (for PlaybookTab) uses `enabled: !!factionId` since faction selection is optional

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Migrated test fixtures in three test files to match updated types**
- **Found during:** Task 2 verification (TypeScript check)
- **Issue:** `tests/rules-hub/applyRulesHubFilters.test.ts`, `tests/rules-hub/DetachmentCard.test.tsx`, and `tests/rules-hub/StratagemCard.test.tsx` used `RwStratagem`/`RwDetachment` types with fields (`legend`, `detachment`, `cp_cost: string`) that no longer match the updated component interfaces
- **Fix:** Updated all three test files to use `UdbStratagem`/`UdbDetachment` with numeric `cp_cost`, removed `legend` fields, added `vi.mock("@/hooks/useGameData")` to DetachmentCard test
- **Files modified:** tests/rules-hub/applyRulesHubFilters.test.ts, tests/rules-hub/DetachmentCard.test.tsx, tests/rules-hub/StratagemCard.test.tsx
- **Verification:** Tests pass; TypeScript clean on modified files
- **Committed in:** e5c2ef0 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug — test fixtures out of sync with updated types)
**Impact on plan:** Necessary correctness fix. No scope creep.

## Issues Encountered

- Remaining TypeScript errors in `RulesHubPage.tsx`, `StrategemsTab.tsx`, and `DetachmentRulesSection.tsx` are expected transient errors from these page-level consumers still using `RwStratagem`/`RwDetachment` — will be resolved in Plan 02

## Known Stubs

None — DetachmentCard stub was removed and replaced with the real hook in this plan.

## Next Phase Readiness

- Data layer complete: Plan 02 can wire `RulesHubPage`, `StrategemsTab`, `DetachmentRulesSection`, and `LoadoutBuilderSheet` to use the new hooks
- The 4 remaining TypeScript errors in page-level files are the exact scope for Plan 02
- `useDetachmentAbilities` (for PlaybookTab) and `useDetachmentsByFaction` (for DetachmentPicker) are ready for consumption

---
*Phase: 120-ui-wiring*
*Completed: 2026-06-08*
