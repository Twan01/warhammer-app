---
phase: 14-spending-tracker
plan: 02
subsystem: ui
tags: [react-hook-form, zod, tanstack-query, formatCurrency, pence, forms]

# Dependency graph
requires:
  - phase: 14-01
    provides: "purchase_price_pence integer type on Unit/Paint, formatCurrency utility, DB queries accepting pence"
provides:
  - "UnitSheet form field for purchase_price_pence — step=1, UI-SPEC placeholder + helper text (SPEND-01)"
  - "PaintSheet form field for purchase_price_pence — step=1, UI-SPEC placeholder + helper text (SPEND-02)"
  - "UnitDetailSheet read-only formatted currency display via formatCurrency()"
  - "All 6 mutation hooks invalidate ['spending-stats'] query key (Pitfall 2 closed)"
  - "10 Wave-0 schema test stubs flipped to passing assertions (5 unitSchema + 5 paintSchema)"
affects:
  - "14-03-spending-page — relies on ['spending-stats'] invalidation contract"
  - "14-04-smoke-test — end-to-end save/load round-trip validation"

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "step={1} integer-pence input pattern for all pence-accepting form fields"
    - "formatCurrency() as sole display-layer formatting call site (no inline division)"
    - "Literal ['spending-stats'] invalidation alongside ['dashboard-stats'] in unit mutation hooks"

key-files:
  created:
    - "tests/spending/unitSchema.test.ts (5 real assertions replacing stubs)"
    - "tests/spending/paintSchema.test.ts (5 real assertions replacing stubs)"
  modified:
    - "src/features/units/UnitSheet.tsx — purchase_price_pence FormField: step={1}, placeholder, helper text"
    - "src/features/units/UnitDetailSheet.tsx — import formatCurrency + replace inline math"
    - "src/features/paints/PaintSheet.tsx — append purchase_price_pence FormField before SheetFooter"
    - "src/hooks/useUnits.ts — 3 mutation hooks + ['spending-stats'] invalidation"
    - "src/hooks/usePaints.ts — 3 mutation hooks + ['spending-stats'] invalidation"

key-decisions:
  - "UnitSheet purchase_price_pence was already plumbed in buildDefaultValues/onSubmit by Plan 14-01; only the FormField UI needed updating (step, placeholder, helper text)"
  - "PaintSheet purchase_price_pence was already plumbed in DEFAULT_VALUES/buildDefaultValues/onSubmit by Plan 14-01; only the FormField UI was missing"
  - "UnitDetailSheet had a manual inline pence-to-pounds calculation (/ 100).toFixed(2) — replaced with formatCurrency() per CONTEXT.md single division-by-100 rule"
  - "['spending-stats'] literal used in useUnits.ts and usePaints.ts (not a constant import) — mirrors existing ['dashboard-stats'] literal pattern; SPENDING_STATS_KEY constant arrives in Plan 14-03"

patterns-established:
  - "Integer pence inputs always use step={1} min={0} with 'e.g. NNNN for £N.NN' placeholder pattern"
  - "Helper text 'Enter amount in pence (100 = £1.00)' in a <p className='text-xs text-muted-foreground'> below FormControl"
  - "All unit/paint mutation hooks invalidate both domain-specific keys AND ['spending-stats'] in onSuccess"

requirements-completed:
  - SPEND-01
  - SPEND-02

# Metrics
duration: 15min
completed: 2026-05-04
---

# Phase 14 Plan 02: Form Layer Integration Summary

**purchase_price_pence wired into UnitSheet + PaintSheet form fields with integer-pence UI-SPEC inputs, UnitDetailSheet displays formatCurrency(), and all 6 mutation hooks invalidate ['spending-stats'] (Pitfall 2)**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-05-04T07:16:00Z
- **Completed:** 2026-05-04T07:19:54Z
- **Tasks:** 3
- **Files modified:** 7

## Accomplishments

- SPEND-01 closed: UnitSheet has `purchase_price_pence` integer-pence field with step={1}, "e.g. 1250 for £12.50" placeholder, and "Enter amount in pence (100 = £1.00)" helper text
- SPEND-02 closed: PaintSheet has `purchase_price_pence` integer-pence field with step={1}, "e.g. 350 for £3.50" placeholder, and helper text
- UnitDetailSheet Purchase Price row now uses `formatCurrency(unit.purchase_price_pence)` — single division-by-100 site respected
- Pitfall 2 closed: 6 mutation hooks (3 unit + 3 paint) each invalidate `['spending-stats']` alongside their existing invalidations
- 10 Wave-0 test stubs flipped to real assertions — 264 passing, 13 skipped (Plan 14-03 stubs only)

## Task Commits

Each task was committed atomically:

1. **Task 1: Update UnitSheet form field + flip unitSchema test stubs** - `7b69473` (feat)
2. **Task 2: Add PaintSheet FormField + fix UnitDetailSheet + flip paintSchema tests** - `190ad95` (feat)
3. **Task 3: Add spending-stats cache invalidation to all 6 mutation hooks** - `7437641` (feat)

## Files Created/Modified

- `src/features/units/UnitSheet.tsx` — purchase_price_pence FormField updated: step={1}, placeholder "e.g. 1250 for £12.50", helper text added
- `src/features/units/UnitDetailSheet.tsx` — import formatCurrency; Purchase Price row replaced inline math with formatCurrency(unit.purchase_price_pence)
- `src/features/paints/PaintSheet.tsx` — new purchase_price_pence FormField appended before SheetFooter with step={1}, placeholder "e.g. 350 for £3.50", helper text
- `src/hooks/useUnits.ts` — useCreateUnit/useUpdateUnit/useDeleteUnit each invalidate ['spending-stats']
- `src/hooks/usePaints.ts` — useCreatePaint/useUpdatePaint/useDeletePaint each invalidate ['spending-stats']
- `tests/spending/unitSchema.test.ts` — 5 stubs replaced with real assertions (integer, null, negative, decimal, legacy field)
- `tests/spending/paintSchema.test.ts` — 5 stubs replaced with real assertions (integer, null, omitted, negative, decimal)

## Decisions Made

- Plan 14-01 had already plumbed `purchase_price_pence` into `buildDefaultValues` and `onSubmit` for both UnitSheet and PaintSheet — only the FormField UI elements were pending
- `UnitDetailSheet` had an inline `(unit.purchase_price_pence / 100).toFixed(2)` calculation — replaced with `formatCurrency()` per the single division-by-100 constraint
- Used literal `["spending-stats"]` string (not a constant) in hooks, mirroring the existing `["dashboard-stats"]` literal pattern; the `SPENDING_STATS_KEY` constant will be created in Plan 14-03

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] UnitDetailSheet had inline pence division instead of formatCurrency()**
- **Found during:** Task 2 (UnitDetailSheet read-only display)
- **Issue:** The detail sheet was computing `(unit.purchase_price_pence / 100).toFixed(2)` instead of calling `formatCurrency()`. The CONTEXT.md decision requires formatCurrency to be the only division-by-100 site. The display also lacked the £ symbol prefix and proper locale formatting.
- **Fix:** Added `import { formatCurrency } from "@/lib/formatCurrency"` and replaced the inline expression with `formatCurrency(unit.purchase_price_pence)` which handles null ("—") and locale formatting correctly.
- **Files modified:** `src/features/units/UnitDetailSheet.tsx`
- **Verification:** tsc clean; test suite green
- **Committed in:** `190ad95` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - bug: inline math bypassing the formatCurrency contract)
**Impact on plan:** Essential for correctness — the CONTEXT.md constraint specifies formatCurrency as the only pence-to-pounds conversion site. No scope creep.

## Issues Encountered

None — all tasks executed as specified.

## Next Phase Readiness

- SPEND-01 and SPEND-02 are closed — unit and paint purchase price entry is complete
- Pitfall 2 cache invalidation contract is installed — SpendingPage (Plan 14-03) query will auto-refresh
- Plan 14-03 (SpendingPage) can now proceed — the `['spending-stats']` query key contract is ready
- Plan 14-04 (manual smoke-test) will validate the end-to-end save/load round-trip for both unit and paint prices

---
*Phase: 14-spending-tracker*
*Completed: 2026-05-04*
