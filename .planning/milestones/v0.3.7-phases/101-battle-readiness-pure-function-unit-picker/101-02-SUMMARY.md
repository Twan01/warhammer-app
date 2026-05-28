---
phase: 101
plan: 02
status: complete
---

# Plan 101-02 Summary: UnitPickerDialog Upgrade

## What changed

### Task 1: Budget context props
- **ArmyListDetailPage.tsx**: Added `remaining` and `pointsLimit` props to UnitPickerDialog invocation
- `remaining = list.points_limit != null ? list.points_limit - totalPoints : null`

### Task 2: UnitPickerDialog readiness + budget features
- **UnitPickerDialog.tsx**: Full rewrite with new features:
  - Switched from `useUnits()` to `useUnitsEnriched()` for `effective_points` access
  - Added `remaining` and `pointsLimit` optional props
  - Budget header bar: shows `{remaining} pts remaining` with destructive color when <= 0
  - Fits budget toggle: `Checkbox` default OFF, filters units exceeding remaining budget
  - Per-row points display: `{effective_points} pts` with dimming for over-budget units
  - Battle Ready badge: emerald `Badge` when all 4 readiness checks pass
  - Readiness dots: 4 colored dots with Tooltip showing individual status breakdown
  - Painting dot uses `PAINTING_STATUS_TIER` + `TIER_DOT_CLASS` mapping
  - Assembly/basing/varnish dots: emerald (done) or muted (not done)
  - Empty state for budget filter: "No units fit the remaining budget."

### Supporting change
- **status-badge.tsx**: Exported `TIER_DOT_CLASS` (was internal-only)

## Verification
- `pnpm build` passes (tsc + vite, 0 errors)
- All 16 readiness tests pass
- No new test failures introduced

## Requirements covered
- BRP-02: Readiness indicators per unit row
- BRP-03: Budget-aware affordability filter
