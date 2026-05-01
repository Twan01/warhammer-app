---
phase: 06-foundation
plan: 02
subsystem: database
tags: [typescript, types, strategyNote, armyList, paint, sqlite]

# Dependency graph
requires:
  - phase: 06-01
    provides: migration 004 SQL columns (move, toughness, save, wounds, leadership, objective_control, keywords, abilities) that StrategyNote maps to
provides:
  - StrategyNote and UpsertStrategyNoteInput types in src/types/strategyNote.ts
  - ArmyList, ArmyListUnit, ArmyListUnitRow, ArmyListWithUnits, CreateArmyListInput, UpdateArmyListInput, AddUnitToListInput, UpdateArmyListUnitInput types in src/types/armyList.ts
  - PaintWithRecipeCount interface in src/types/paint.ts
affects:
  - 06-03 (query functions import these types)
  - Phase 7 (Paint Inventory page uses PaintWithRecipeCount)
  - Phase 8 (Army List Builder uses full ArmyList type family)
  - Phase 9 (Unit Playbook uses StrategyNote + UpsertStrategyNoteInput)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Per-type file convention: one TypeScript file per entity under src/types/"
    - "ArmyListUnit intentionally omits updated_at — matches schema exactly (no field invented)"
    - "save stored as INTEGER (number | null), UI appends '+' suffix at display time"
    - "ArmyListUnitRow extends ArmyListUnit (not ArmyList) — join row adds unit fields + effective_points"
    - "UpdateArmyListUnitInput uses full-replacement (non-optional nullable) to allow NULL clearing"

key-files:
  created:
    - src/types/strategyNote.ts
    - src/types/armyList.ts
  modified:
    - src/types/paint.ts

key-decisions:
  - "save = number | null (INTEGER mapping); UI in Phase 9 PlaybookTab appends '+' at display time"
  - "ArmyListUnit has no updated_at field — army_list_units schema omits this column"
  - "PaintWithRecipeCount extends Paint via TypeScript extends — recipe_count is SQL-computed (LEFT JOIN COUNT), never computed in JS"
  - "UpdateArmyListUnitInput fields are non-optional and nullable for full-replacement UPDATE semantics"

patterns-established:
  - "Type-only files: no imports, pure interface/type exports — lightweight compile-time contracts"
  - "ArmyListUnitRow follows join-row pattern: extends base entity interface, adds computed + joined fields"

requirements-completed:
  - STRAT-06

# Metrics
duration: 3min
completed: 2026-05-01
---

# Phase 6 Plan 02: Type Definitions Summary

**Three TypeScript type files for v1.1 utility layer: 18-field StrategyNote (save=INTEGER), 8-type ArmyList family (no updated_at on ArmyListUnit), and PaintWithRecipeCount extending existing Paint**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-05-01T21:00:28Z
- **Completed:** 2026-05-01T21:02:51Z
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments

- Created `src/types/strategyNote.ts` with StrategyNote (18 fields, save=number|null) and UpsertStrategyNoteInput covering all 17 user-editable fields
- Created `src/types/armyList.ts` with the full 8-type family: ArmyList, ArmyListUnit (no updated_at), ArmyListUnitRow, ArmyListWithUnits, plus 4 input types
- Appended PaintWithRecipeCount to `src/types/paint.ts` while preserving all 5 existing exports

## Task Commits

Each task was committed atomically:

1. **Task 1: Create src/types/strategyNote.ts** - `cdaa82f` (feat)
2. **Task 2: Create src/types/armyList.ts** - `8f501ea` (feat)
3. **Task 3: Append PaintWithRecipeCount to paint.ts** - `4500d9a` (feat)

## Files Created/Modified

- `src/types/strategyNote.ts` - StrategyNote (18 fields mirroring unit_strategy_notes 001+004) and UpsertStrategyNoteInput
- `src/types/armyList.ts` - Full ArmyList type family: ArmyList, ArmyListUnit, ArmyListUnitRow, ArmyListWithUnits, CreateArmyListInput, UpdateArmyListInput, AddUnitToListInput, UpdateArmyListUnitInput
- `src/types/paint.ts` - Appended PaintWithRecipeCount extends Paint { recipe_count: number }

## Decisions Made

- save column typed as `number | null` (not `string | null`) to match INTEGER DB type; Phase 9 UI appends "+" at display time
- ArmyListUnit deliberately omits `updated_at` — the army_list_units schema has no such column; including it would cause runtime row mismatch
- UpdateArmyListUnitInput uses non-optional nullable fields (full-replacement pattern) so callers can clear points_override back to NULL
- recipe_count in PaintWithRecipeCount is SQL-computed (LEFT JOIN COUNT), never recalculated in JS

## Deviations from Plan

None - plan executed exactly as written.

Note: `pnpm tsc --noEmit` produced 3 pre-existing errors in `tests/foundation/migration004.test.ts` (node:fs / node:path / __dirname not in tsconfig types). These errors exist on the baseline branch before any changes in this plan and are out of scope.

## Issues Encountered

Pre-existing TypeScript errors in `tests/foundation/migration004.test.ts` related to Node.js globals (`node:fs`, `node:path`, `__dirname`) not declared in the test tsconfig types. Verified via `git stash` that these exist on baseline — not introduced by this plan. No action taken (out of scope per deviation scope boundary rule).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 6 Success Criterion 3 is now met: StrategyNote, UpsertStrategyNoteInput, ArmyList, ArmyListUnit, ArmyListWithUnits, PaintWithRecipeCount all exist as compile-time contracts
- Plan 06-03 (query functions) can now import all three type files without modification
- Phases 7, 8, 9 have their type contracts established ahead of implementation

---
*Phase: 06-foundation*
*Completed: 2026-05-01*
