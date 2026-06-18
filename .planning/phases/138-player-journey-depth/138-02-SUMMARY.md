---
phase: 138-player-journey-depth
plan: "02"
subsystem: unit-database
tags: [compare, ui, react-query, zustand, tdd, weapon-table, diff-highlight]
dependency_graph:
  requires:
    - getUdbUnitsByIds batch query (138-01)
    - useUdbUnitsByIds hook (138-01)
    - compareIds Zustand store + addToCompare/removeFromCompare/clearCompare (138-01)
    - /unit-database/compare route stub (138-01)
    - WeaponTable shared component (Phase 136 HON-08)
  provides:
    - UnitComparePage full implementation (replaces 138-01 stub)
    - UnitCompareColumn per-unit column with diff cells
    - UnitCompareActionBar sticky selection bar
    - UdbUnitRow add-to-compare toggle (cap-aware, tooltip'd)
  affects:
    - src/features/unit-database/UnitComparePage.tsx
    - src/features/unit-database/UnitCompareColumn.tsx
    - src/features/unit-database/UnitCompareActionBar.tsx
    - src/features/unit-database/UdbUnitRow.tsx
    - src/features/unit-database/DatabaseBrowserPage.tsx
    - tests/unit-database/UnitCompare.test.tsx
tech_stack:
  added: []
  patterns:
    - Page-level statDiffMap via useMemo passed as props (no per-column hooks)
    - Binary diff highlight bg-faction-accent/15 on differing cells
    - WeaponTable reused per column (HON-08 compliance)
    - Presence diff for weapons/abilities/keywords: Set-based per-column comparison
    - Zustand store selector pattern for UdbUnitRow nested read
    - TooltipProvider + Tooltip + TooltipTrigger asChild for icon-only button
key_files:
  created:
    - src/features/unit-database/UnitCompareColumn.tsx
    - src/features/unit-database/UnitCompareActionBar.tsx
    - tests/unit-database/UnitCompare.test.tsx
  modified:
    - src/features/unit-database/UnitComparePage.tsx (replaced stub with full impl)
    - src/features/unit-database/UdbUnitRow.tsx (added compare toggle)
    - src/features/unit-database/DatabaseBrowserPage.tsx (wired action bar)
    - tests/unit-database/UdbUnitRow.test.tsx (updated for compare toggle)
    - tests/navigation/rulesUnitCrossLinks.test.tsx (updated mock for compareIds)
decisions:
  - statDiffMap computed once at UnitComparePage level and passed to columns — no per-column hook calls (PITFALL #8)
  - Weapon presence diff per-weapon using Set union across allUnits — WeaponTable itself unstyled (diff wraps the row)
  - UnitCompareActionBar placed inside DatabaseBrowserPage container div at bottom (sticky bottom-0 on bar itself)
  - TooltipProvider scoped per-row to avoid wrapping the entire page
  - Existing UdbUnitRow test updated to use specific text click target (row now has 2 buttons)
  - rulesUnitCrossLinks mock updated to include compareIds Set (Rule 1 fix)
metrics:
  duration_seconds: 1080
  completed_date: "2026-06-18"
  tasks_completed: 4
  files_modified: 8
---

# Phase 138 Plan 02: Compare UI — Columns, Diff Highlight, and Action Bar Summary

Full PLAY-01 comparison UI: side-by-side columns with binary `bg-faction-accent/15` diff highlight, shared WeaponTable per column, sticky action bar on the browser page, and a cap-aware tooltip'd toggle on each unit row — all wired to 138-01's batch query and Zustand store.

## What Was Built

**Task 1 (TDD RED):** Created `tests/unit-database/UnitCompare.test.tsx` with 9 assertions: 2-column render by unit names, `bg-faction-accent/15` presence for differing stat cells, absence for identical stats, exact empty-state copy "Select units to compare", body text, "Browse Unit Database" CTA, and UdbUnitRow toggle aria-labels for add/remove/disabled states. Test failed RED as expected.

**Task 2 (GREEN — UnitCompareColumn):** Created `src/features/unit-database/UnitCompareColumn.tsx`. Five sections: Stats (3×2 grid from `models[0]`, diff cells via `statDiffMap` prop), Weapons (shared `WeaponTable` for ranged/melee, presence diff wraps weapon row), Abilities (flat list, presence diff per ability), Keywords (inline chips, presence diff), Points (tiers, presence diff). All diff data arrives via props — zero hook calls in the file. Build clean.

**Task 3 (GREEN — UnitComparePage + UnitCompareActionBar):** Replaced the 138-01 stub `UnitComparePage.tsx` with the full implementation: single `useUdbUnitsByIds` batched call, page-level `statDiffMap` via `useMemo`, three branches (loading skeleton / empty state < 2 ids / populated grid), CSS grid with `minmax(280px, 1fr)` column sizing, PageHeader "Compare Units" + ghost "Clear" button. Created `UnitCompareActionBar.tsx`: sticky bottom bar with count label, "Clear" outline button, "Compare (N)" default button disabled at < 2. Compare page tests turned GREEN.

**Task 4 (GREEN — UdbUnitRow toggle + DatabaseBrowserPage wiring):** Modified `UdbUnitRow.tsx` to import `GitCompare` from lucide-react, read `compareIds`/`addToCompare`/`removeFromCompare` from the Zustand store, render a ghost icon-only button with `e.stopPropagation()`, cap-aware disable, `text-faction-accent bg-faction-accent/10` when selected, and a `TooltipProvider`/`Tooltip`/`TooltipTrigger asChild`/`TooltipContent` wrapper (UI-SPEC FLAG). Added `UnitCompareActionBar` import and render to `DatabaseBrowserPage.tsx`. Fixed two pre-existing tests whose mocks were incomplete after the store extension.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] UdbUnitRow.test.tsx broke after toggle addition**
- **Found during:** Task 4
- **Issue:** The existing test `calls onOpen when clicked` used `screen.getByRole("button")` which now finds two button elements (the row div + the compare toggle).
- **Fix:** Changed the click target to `screen.getByText("Intercessors")` (the unit name span on the row). Added `useDatabaseBrowserFilters` mock and Tooltip mock to the test file.
- **Files modified:** `tests/unit-database/UdbUnitRow.test.tsx`
- **Commit:** 8667211b

**2. [Rule 1 - Bug] rulesUnitCrossLinks.test.tsx crashed on compareIds.size**
- **Found during:** Task 4 (running the full test suite after wiring the action bar)
- **Issue:** The `DatabaseBrowserPage` now renders `UnitCompareActionBar` which reads `compareIds.size` from the store. The existing mock returned a plain object without `compareIds`, causing `Cannot read properties of undefined (reading 'size')`.
- **Fix:** Extended the mock to include `compareIds: new Set<string>()`, `clearCompare`, `addToCompare`, `removeFromCompare`, and made the mock support the selector pattern.
- **Files modified:** `tests/navigation/rulesUnitCrossLinks.test.tsx`
- **Commit:** 8667211b

## TDD Gate Compliance

- RED gate: `test(138-02): add failing compare UI tests` — commit f29c0d8f
- GREEN gate (column): `feat(138-02): add UnitCompareColumn...` — commit 61b7128b
- GREEN gate (page + bar): `feat(138-02): add UnitComparePage + UnitCompareActionBar...` — commit 116c4530
- GREEN gate (row + wire): `feat(138-02): add UdbUnitRow compare toggle...` — commit 8667211b

All four RED/GREEN gates satisfied.

## Known Stubs

None — the 138-01 stub `UnitComparePage.tsx` has been fully replaced.

## Security

T-138-04 (DoS via unbounded compare set): mitigated. `compareDisabled = compareIds.size >= 3 && !isInCompare` enforces the cap at the affordance (UdbUnitRow toggle). The store also enforces it at the `addToCompare` action (138-01). Bounds the batch query to at most 3 ids.

## Threat Flags

None — plan is pure client-side read-only render. No new network endpoints, auth paths, or schema changes introduced.

## Self-Check: PASSED

- `src/features/unit-database/UnitCompareColumn.tsx` — exists, contains WeaponTable, contains `bg-faction-accent/15`, no hook calls
- `src/features/unit-database/UnitComparePage.tsx` — contains `useUdbUnitsByIds` (single call), "Select units to compare", "Compare Units"
- `src/features/unit-database/UnitCompareActionBar.tsx` — contains "Compare (", disabled at < 2
- `src/features/unit-database/UdbUnitRow.tsx` — contains GitCompare, compareDisabled, Tooltip
- `src/features/unit-database/DatabaseBrowserPage.tsx` — contains UnitCompareActionBar
- `tests/unit-database/UnitCompare.test.tsx` — exists, 9 tests, all GREEN
- `tests/unit-database/UdbUnitRow.test.tsx` — 5 tests, all GREEN
- Build: `pnpm build` clean (no TS errors)
- Commits: f29c0d8f, 61b7128b, 116c4530, 8667211b — all verified in git log
