---
phase: 67-game-day-integration
reviewed: 2026-05-13T14:30:00Z
depth: standard
files_reviewed: 4
files_reviewed_list:
  - src/features/game-day/GameDayReadinessPanel.tsx
  - tests/game-day/GameDayReadinessPanel.test.tsx
  - src/features/game-day/GameDayPage.tsx
  - tests/game-day/GameDayPage.test.tsx
findings:
  critical: 1
  warning: 3
  info: 0
  total: 4
status: issues_found
---

# Phase 67: Code Review Report

**Reviewed:** 2026-05-13T14:30:00Z
**Depth:** standard
**Files Reviewed:** 4
**Status:** issues_found

## Summary

The GameDayReadinessPanel is a well-structured pure presentation component that surfaces Phase 66 validation data. The GameDayPage correctly wires hooks and passes props. However, the test suite for GameDayPage uses an invalid painting status value in its mock data, and the readiness panel renders a redundant "Points exceeded" warning on every unit rather than once at the list level. One computed value is inconsistently not memoized.

## Critical Issues

### CR-01: GameDayPage test mock uses invalid painting status value

**File:** `tests/game-day/GameDayPage.test.tsx:55`
**Issue:** The mock unit data sets `status_painting: "Painted"`, which is not a valid `PaintingStatus` value. The valid values are defined in `src/types/unit.ts` as `PAINTING_STATUS_ORDER` and the terminal status is `"Completed"`, not `"Painted"`. This means the test is operating on data that can never exist in production. Any assertion that depends on the unit being "battle-ready" is silently wrong -- the unit would appear in the "Not ready" gap list because `"Painted" !== "Completed"`. The test at line 132 (`expect(screen.getByText("80 / 2000 pts"))`) passes by coincidence (points rendering is unaffected by painting status), masking that the readiness panel would render differently than expected for a truly completed unit.

**Fix:**
```typescript
// line 55 of tests/game-day/GameDayPage.test.tsx
status_painting: "Completed",  // was "Painted" — not a valid PaintingStatus
```

## Warnings

### WR-01: "Points exceeded" warning duplicated on every unit in collapsible detail

**File:** `src/features/game-day/GameDayReadinessPanel.tsx:68-76`
**Issue:** When points are exceeded, `computeUnitWarnings` adds a "Points exceeded" hard warning to every single unit (it is a list-level condition checked per-unit via context). The `computeListHealthStats` function correctly deduplicates this for the aggregate count (line 107 of `computeUnitWarnings.ts` filters it out). However, the `unitsWithWarnings` array in the readiness panel does NOT deduplicate -- so when the collapsible is expanded, every unit row shows "Points exceeded", which is redundant and noisy. This is a UX bug: users see N identical "Points exceeded" warnings instead of one.

**Fix:** Either filter "Points exceeded" out of per-unit warnings in the collapsible display, or show it once as a list-level banner above the per-unit detail:
```tsx
const unitsWithWarnings = useMemo(
  () =>
    units
      .map((u) => ({
        unit: u,
        warnings: computeUnitWarnings(u, context),
      }))
      .map(({ unit, warnings }) => ({
        unit,
        warnings: {
          // Points exceeded is list-level; show it separately, not per unit
          hard: warnings.hard.filter((w) => w !== "Points exceeded"),
          soft: warnings.soft,
        },
      }))
      .filter(
        ({ warnings }) => warnings.hard.length + warnings.soft.length > 0,
      ),
  [units, context],
);
```

### WR-02: hasAnyRole computed on every render without useMemo

**File:** `src/features/game-day/GameDayReadinessPanel.tsx:104`
**Issue:** All other derived values in this component (`stats`, `context`, `unitsWithWarnings`, `notReadyUnits`, `roleCounts`) are wrapped in `useMemo`, but `hasAnyRole` is computed directly in the render body. While `Array.some` is cheap, this is an inconsistency that breaks the component's own memoization pattern. If `units` is a large array and the parent re-renders frequently, this is a gratuitous traversal.

**Fix:**
```tsx
const hasAnyRole = useMemo(
  () => units.some((u) => u.tactical_role !== null),
  [units],
);
```

### WR-03: Warning strings used as React keys can collide

**File:** `src/features/game-day/GameDayReadinessPanel.tsx:172,180`
**Issue:** Both hard and soft warning lists use the warning message string `w` as the React `key` prop (`key={w}`). If `computeUnitWarnings` ever returns duplicate strings for the same unit (e.g., two conditions producing the same message), React will emit a key-collision warning and may misrender. Currently the warning functions produce unique strings per unit, but this is a fragile coupling. Using the array index as part of the key is safer.

**Fix:**
```tsx
{warnings.hard.map((w, i) => (
  <span key={`hard-${i}`} className="...">
```

---

_Reviewed: 2026-05-13T14:30:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
