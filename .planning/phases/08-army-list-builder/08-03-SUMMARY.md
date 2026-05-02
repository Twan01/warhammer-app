---
phase: 08-army-list-builder
plan: "03"
subsystem: ui
tags: [react, shadcn, army-lists, sheet, card, tanstack-query]

# Dependency graph
requires:
  - phase: 08-army-list-builder plan 01
    provides: ArmyListSheet, ArmyListDeleteDialog, armyListSchema (modal/dialog leaves)
  - phase: 08-army-list-builder plan 02
    provides: ArmyListSummaryBar, ArmyListUnitRow, UnitPickerDialog (unit-display leaves)
provides:
  - ArmyListDetailSheet — composite detail sheet (summary + unit table + list notes + footer)
  - ArmyListCard — card grid item for ArmyListsPage responsive grid
affects:
  - 08-army-list-builder plan 04 (ArmyListsPage wire-up — renders ArmyListCard grid + ArmyListDetailSheet)
  - 08-army-list-builder plan 05 (smoke test)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Sibling-portal architecture — UnitPickerDialog is NOT nested inside ArmyListDetailSheet (Pitfall 1)
    - Pitfall 5 (list-level notes) — pass empty string not null to useUpdateArmyList to clear notes
    - Pitfall 6 (key prop) — key={list?.id ?? 'none-detail'} on SheetContent forces fresh mount when switching lists
    - Consistent canonical painting status — status_painting === "Completed" in both ArmyListSummaryBar and ArmyListCard

key-files:
  created:
    - src/features/army-lists/ArmyListDetailSheet.tsx
    - src/features/army-lists/ArmyListCard.tsx
  modified: []

key-decisions:
  - "ArmyListDetailSheet does NOT own UnitPickerDialog state — onAddUnit prop delegates to parent page (sibling portal)"
  - "ArmyListCard duplicates stat logic from ArmyListSummaryBar intentionally — card must show totals before detail sheet is opened"
  - "Unused TableCell import removed from ArmyListDetailSheet — TableCell is used internally by ArmyListUnitRow"

patterns-established:
  - "Sibling-portal: Detail sheet and UnitPickerDialog are siblings at page root, not nested"
  - "Pitfall 5 discipline: notes: notesDraft ?? '' for COALESCE-aware list notes save"
  - "Pitfall 6 discipline: key={entity?.id ?? 'none-*'} on SheetContent for fresh-mount on entity switch"

requirements-completed: [ARMY-02, ARMY-03, ARMY-04]

# Metrics
duration: 8min
completed: 2026-05-02
---

# Phase 8 Plan 03: Army List Composite Components Summary

**ArmyListDetailSheet (summary bar + unit table + list notes + footer) and ArmyListCard (points/battle-ready card grid item) built as composites of plan 01/02 leaves**

## Performance

- **Duration:** 8 min
- **Started:** 2026-05-02T08:17:35Z
- **Completed:** 2026-05-02T08:25:47Z
- **Tasks:** 2
- **Files modified:** 2 created

## Accomplishments

- ARMY-02 fully wired: per-row useRemoveUnitFromList; Add Unit delegates to parent via onAddUnit prop
- ARMY-03 summary band rendered at top of every detail sheet via ArmyListSummaryBar
- ARMY-04 list-level notes save with Pitfall 5 empty-string discipline (notes: notesDraft ?? "")
- ArmyListCard previews same totals using consistent "Completed" canonical comparison
- Sibling portal architecture preserved — UnitPickerDialog NOT nested inside ArmyListDetailSheet

## Task Commits

Each task was committed atomically:

1. **Task 1: Create ArmyListDetailSheet.tsx** - `a9d1da7` (feat)
2. **Task 2: Create ArmyListCard.tsx** - `694e837` (feat)

## Files Created/Modified

- `src/features/army-lists/ArmyListDetailSheet.tsx` — Composite detail sheet composing ArmyListSummaryBar + ArmyListUnitRow rows, useRemoveUnitFromList per row, useUpdateArmyList for list notes, Sheet key prop for remount
- `src/features/army-lists/ArmyListCard.tsx` — Keyboard-accessible card grid item with SAME stat logic as ArmyListSummaryBar (status_painting === "Completed", sum effective_points)

## Decisions Made

- Unused `TableCell` import removed from ArmyListDetailSheet — TableCell is used internally by ArmyListUnitRow, not directly in ArmyListDetailSheet
- ArmyListCard stat logic duplicated from ArmyListSummaryBar intentionally (card must preview totals before detail sheet is opened; plan notes this is a future refactor candidate)
- Faction color_theme guard added in ArmyListDetailSheet: `faction.color_theme ? { backgroundColor: ... } : undefined` (defensive — Faction.color_theme typed as string, not null, but UnitDetailSheet twin shows it can be empty)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Removed unused TableCell import**
- **Found during:** Task 1 (ArmyListDetailSheet — tsc verification)
- **Issue:** Plan's code snippet imported `TableCell` from `@/components/ui/table` but the component never uses TableCell directly (ArmyListUnitRow renders its own cells)
- **Fix:** Removed `TableCell` from the named imports; kept Table, TableHeader, TableRow, TableHead, TableBody
- **Files modified:** src/features/army-lists/ArmyListDetailSheet.tsx
- **Verification:** `pnpm tsc --noEmit` exits 0 after fix
- **Committed in:** a9d1da7 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 — unused import causing TS6133 error)
**Impact on plan:** Minimal fix for TypeScript strict unused-variable check. No scope creep. All must_haves and acceptance criteria met.

## Issues Encountered

None beyond the unused import auto-fix above.

## Architecture Confirmation

- ArmyListDetailSheet does NOT render `<UnitPickerDialog` (Pitfall 1 preserved — verified by grep)
- ArmyListCard and ArmyListSummaryBar both use `status_painting === "Completed"` (consistent canonical value)
- src/features/army-lists/ now contains 8 files: armyListSchema.ts + 7 components (ArmyListSheet, ArmyListDeleteDialog, ArmyListSummaryBar, ArmyListUnitRow, UnitPickerDialog, ArmyListDetailSheet, ArmyListCard)

## Next Phase Readiness

- Plan 04 can render `<ArmyListCard>` per list and `<ArmyListDetailSheet>` as sibling portal alongside `<UnitPickerDialog>`, `<ArmyListSheet>`, `<ArmyListDeleteDialog>` — all 4 siblings at page root
- All ARMY-02, ARMY-03, ARMY-04 requirements fulfilled by this plan
- `pnpm tsc --noEmit` exits 0 and 173 tests pass

---
*Phase: 08-army-list-builder*
*Completed: 2026-05-02*
