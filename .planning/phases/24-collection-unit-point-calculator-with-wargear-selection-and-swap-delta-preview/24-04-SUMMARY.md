---
phase: 24-collection-unit-point-calculator-with-wargear-selection-and-swap-delta-preview
plan: "04"
subsystem: army-lists + units
tags: [delta-preview, point-tiers, tier-selector, read-only-field, army-list-unit-row]
dependency_graph:
  requires: [24-02, 24-03]
  provides: [DELTA-01, TIER-01, TIER-02, COALESCE-01]
  affects: [ArmyListUnitRow, UnitSheet, useUnitPointTiers, useUnitLoadouts, computeDelta]
tech_stack:
  added: []
  patterns:
    - pendingTierId local state for non-destructive delta preview
    - useUpdateUnit (not useUpdateArmyListUnit) for tier confirmation writes
    - disabled Input with helper text for managed-by-tiers UX
key_files:
  created: []
  modified:
    - src/features/army-lists/ArmyListUnitRow.tsx
    - src/features/units/UnitSheet.tsx
decisions:
  - Tier confirmation uses useUpdateUnit (writes to units.points) not useUpdateArmyListUnit — preserves COALESCE chain without touching army_list_units.points_override
  - Delta badge cleared by setPendingTierId(null) inside onSuccess callback (Pitfall 5 pattern)
  - Points Input disabled via HTML disabled attribute (not readOnly) so React Hook Form ignores the field on submit — no form handler changes needed
  - colSpan on expanded notes row kept at 5 — no new columns added, tier selector placed inside existing points TableCell
metrics:
  duration: "4 minutes"
  completed_date: "2026-05-05"
  tasks_completed: 3
  files_modified: 2
---

# Phase 24 Plan 04: Delta Preview Badge and UnitSheet Read-Only Points Summary

**One-liner:** Tier selector + colored +N/-N delta badge in ArmyListUnitRow with useUpdateUnit confirmation, and disabled points Input in UnitSheet when point tiers exist.

## What Was Built

### Task 1: Tier Selector and Delta Badge in ArmyListUnitRow (fce7504)

Enhanced `ArmyListUnitRow` with three Phase 24 additions:

**Tier selector** — when `hasTiers` is true, a shadcn Select dropdown appears below the points override Input. Each option shows "N models = Xpts". Selecting a tier sets `pendingTierId` local state.

**Delta badge** — `computeDelta(candidatePoints, unit.effective_points)` drives a colored Badge: positive delta = `text-destructive` (red), negative delta = `text-green-600` (green). The badge only renders when `delta !== 0`.

**Confirm button** — calls `useUpdateUnit().mutate({ id: unit.unit_id, points: tier.points })` to write the chosen tier's points to `units.points`. On success, `setPendingTierId(null)` clears pending state (Pitfall 5), the badge disappears, and a toast confirms the update.

**Active loadout name** — `loadouts?.find(l => l.is_active === 1)` renders the loadout name as subtle muted text below the unit name.

**Pitfall 2 preservation** — `handlePointsBlur` and `handleNotesSave` are unchanged; both continue passing `notes: unit.notes` and `points_override: unit.points_override` respectively to `useUpdateArmyListUnit`.

### Task 2: Read-Only Points Field in UnitSheet (f9220d1)

Added `useUnitPointTiers(unit?.id)` to `UnitSheet`. When `hasTiers` is true:
- Points Input gains `disabled={hasTiers}` and `className="cursor-not-allowed opacity-60"`
- Helper text renders: "Managed by point tiers (N tier/tiers defined)"

Since the field is HTML `disabled`, React Hook Form treats it as not dirty and excludes it from submit payloads — no changes to the `onSubmit` handler were needed.

### Task 3: Smoke Test Pre-Flight (auto-approved)

- `pnpm build` exits 0 (2784 modules transformed, no TypeScript errors)
- `pnpm test` exits 0: 644 passed, 2 skipped (pre-existing skips unrelated to Phase 24)
- All 4 Phase 24 `computeDelta` tests pass
- Auto-approved checkpoint per active auto chain flag

## Deviations from Plan

None — plan executed exactly as written. The colSpan on the expanded notes TableRow was kept at 5 (not increased) because the tier selector was placed inside the existing points TableCell, not in a new column.

## Self-Check: PASSED

| Item | Status |
|---|---|
| src/features/army-lists/ArmyListUnitRow.tsx | FOUND |
| src/features/units/UnitSheet.tsx | FOUND |
| commit fce7504 (Task 1) | FOUND |
| commit f9220d1 (Task 2) | FOUND |
