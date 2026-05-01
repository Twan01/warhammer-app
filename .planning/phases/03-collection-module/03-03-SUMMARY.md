---
phase: 03-collection-module
plan: "03"
subsystem: ui
tags: [react, tanstack-query, shadcn, vitest, testing-library, cmdk, optimistic-update]

requires:
  - phase: 03-01
    provides: StatusPopover component with optimistic mutation + rollback contract
  - phase: 03-00
    provides: Test stub (StatusPopover.test.ts) and vitest globals configuration

provides:
  - UnitDetailSheet: read-only right-side Sheet for viewing a unit's complete data
  - StatusPopover.test.tsx: 4 automated tests covering optimistic update + rollback contract (COLL-10)

affects: [03-04, 04-painting-module]

tech-stack:
  added: ["@testing-library/user-event 14.6.1"]
  patterns:
    - "key={unit?.id} on SheetContent forces fresh mount when switching units (POLISH-04)"
    - "vi.mock('@/db/queries/units') isolates tests from SQLite at the query layer"
    - "QueryClient.setQueryData seeds cache for optimistic update testing"
    - "ResizeObserver + scrollIntoView polyfills in setup.ts for cmdk in jsdom"

key-files:
  created:
    - src/features/units/UnitDetailSheet.tsx
    - tests/collection/StatusPopover.test.tsx
  modified:
    - tests/setup.ts
    - package.json

key-decisions:
  - "UnitDetailSheet is purely presentational — parent owns selectedUnitId state and dialog open state (Pitfall 4: avoid nested Sheet/Dialog)"
  - "StatusPopover reused AS-IS in detail Sheet body — same component as UnitTable cell, zero duplication"
  - "Field label uses font-semibold (not font-medium) per UI-SPEC typography rule"
  - "ResizeObserver and scrollIntoView polyfills added globally to tests/setup.ts since cmdk requires both in jsdom environments — applies to all future tests rendering Command"

patterns-established:
  - "Pattern: cmdk in jsdom requires ResizeObserver + scrollIntoView polyfills — add in setup.ts globally"
  - "Pattern: test optimistic mutations by seeding QueryClient cache, calling mutation, checking cache before promise resolves"
  - "Pattern: test rollback by mockRejectedValue + vi.waitFor polling the cache"

requirements-completed: [COLL-09, COLL-10, POLISH-04]

duration: 4min
completed: "2026-05-01"
---

# Phase 03 Plan 03: UnitDetailSheet + StatusPopover Tests Summary

**Read-only unit detail Sheet (COLL-09) with inline StatusPopover + 4 passing automated tests locking the optimistic-update/rollback contract (COLL-10)**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-05-01T07:34:19Z
- **Completed:** 2026-05-01T07:37:54Z
- **Tasks:** 2
- **Files modified:** 4 (2 created, 2 modified)

## Accomplishments

- Built UnitDetailSheet: right-side Sheet displaying all 17 unit fields with faction-colored header badge, inline StatusPopover, and Edit/Delete footer callbacks
- Automated COLL-10: 4 tests (click-to-open, optimistic cache update, rollback on rejection, Sonner toast) all passing
- Added `@testing-library/user-event` and fixed two jsdom polyfill gaps needed by cmdk

## Task Commits

Each task was committed atomically:

1. **Task 1: Build UnitDetailSheet** - `ddcaf4e` (feat)
2. **Task 2: StatusPopover tests (COLL-10)** - `65896ba` (feat)

## Files Created/Modified

- `src/features/units/UnitDetailSheet.tsx` — Read-only Sheet with props: open, unit, onClose, onEdit, onDelete; reuses StatusPopover; key={unit?.id} for POLISH-04
- `tests/collection/StatusPopover.test.tsx` — 4 tests: opens-on-click, optimistic-update, rollback-on-error, error-toast; replaces .ts stub
- `tests/setup.ts` — Added ResizeObserver and scrollIntoView polyfills (required by cmdk in jsdom)
- `package.json` — Added @testing-library/user-event 14.6.1 as devDependency

## UnitDetailSheet Props Surface

```tsx
interface UnitDetailSheetProps {
  open: boolean;
  unit: Unit | null;
  onClose: () => void;
  onEdit: (unit: Unit) => void;
  onDelete: (unit: Unit) => void;
}
```

Parent (plan 03-04) passes a derived unit from `useUnits()` filtered by `selectedUnitId` state (RESEARCH.md Pitfall 6 pattern).

## Field Rendering Decisions

- **Separators:** Three visual groups — (Category/Status/Progress) | (Assembly/Basing/Varnished/ActiveProject) | (Points/ModelCount/OwnedCount/Priority/TargetDate) | (PurchaseDate/PurchasePrice/StorageLocation) | (Notes, conditional)
- **Boolean fields:** `BoolIndicator` component with Check/Minus lucide icons + Yes/No text
- **Active project:** Flame icon from lucide-react (matches plan spec)
- **Notes:** Conditional — Separator + Field only renders if `unit.notes` is truthy
- **Faction badge:** `style={{ backgroundColor: faction.color_theme }}` inline, matching UnitTable cell pattern (POLISH-05 reuse)

## StatusPopover Test Approach

- **Mock layer:** `vi.mock("@/db/queries/units")` intercepts at the SQL query level — `useUpdateUnit` mutation calls the stub instead of SQLite
- **Cache seeding:** `qc.setQueryData(UNITS_KEY, [unit])` pre-populates TanStack Query cache before render
- **Optimistic test:** `mockImplementation(() => new Promise(() => {}))` makes mutation hang; cache is checked immediately after selection before any resolution
- **Rollback test:** `mockRejectedValue(new Error(...))` + `vi.waitFor()` polls until `onError` handler restores the snapshot
- **Toast test:** `vi.spyOn(toast, "error")` asserts exact literal string match

## Open Items for Plan 03-04 (Page Assembly)

- Parent `CollectionPage` must maintain `selectedUnitId: number | null` state (Pitfall 6 — derive unit from `useUnits()`, don't fetch separately)
- `UnitDetailSheet` expects `open={selectedUnitId !== null}` and `unit={units.find(u => u.id === selectedUnitId) ?? null}`
- `onEdit` callback should set `editingUnit` state and open `UnitSheet`
- `onDelete` callback should set `deletingUnit` state and open `UnitDeleteDialog`
- Both `UnitSheet` and `UnitDeleteDialog` must be siblings of `UnitDetailSheet` in the JSX tree (Pitfall 4: no nested Sheet-in-Sheet)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added ResizeObserver polyfill to tests/setup.ts**
- **Found during:** Task 2 (running StatusPopover tests)
- **Issue:** cmdk (Command component) calls `new ResizeObserver()` in a layout effect; jsdom does not implement ResizeObserver, causing all 4 tests to throw "ReferenceError: ResizeObserver is not defined"
- **Fix:** Added `globalThis.ResizeObserver` stub class in `tests/setup.ts`
- **Files modified:** tests/setup.ts
- **Verification:** Tests advanced past the ResizeObserver error
- **Committed in:** 65896ba (Task 2 commit)

**2. [Rule 3 - Blocking] Added scrollIntoView polyfill to tests/setup.ts**
- **Found during:** Task 2 (running StatusPopover tests, second attempt)
- **Issue:** cmdk calls `element.scrollIntoView()` when the highlighted item changes; jsdom does not implement it, causing "TypeError: e.scrollIntoView is not a function"
- **Fix:** Added `Element.prototype.scrollIntoView = function() {}` in `tests/setup.ts`
- **Files modified:** tests/setup.ts
- **Verification:** All 4 tests pass after both polyfills
- **Committed in:** 65896ba (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (both Rule 3 — blocking jsdom polyfills)
**Impact on plan:** Both required for cmdk to render in jsdom. No scope creep. Polyfills are correct for any future test using Command-based components.

## Issues Encountered

None beyond the auto-fixed polyfill gaps above.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- `UnitDetailSheet` ready for import in `CollectionPage` (plan 03-04)
- StatusPopover test contract automated — any future regression in optimistic/rollback logic will fail tests
- Plan 03-04 must wire: `selectedUnitId` state → `UnitDetailSheet` open/unit props → Edit/Delete callbacks → `UnitSheet` + `UnitDeleteDialog`

---
*Phase: 03-collection-module*
*Completed: 2026-05-01*
