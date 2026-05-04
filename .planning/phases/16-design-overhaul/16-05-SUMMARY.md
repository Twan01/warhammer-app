---
phase: 16-design-overhaul
plan: 05
subsystem: ui
tags: [tailwind, react, army-lists, spending, tabular-nums, page-headers, empty-state, lucide-react]

# Dependency graph
requires:
  - phase: 16-01
    provides: "Sidebar polish, NavItem active state, font + spacing tokens"
  - phase: 14-spending-tracker
    provides: "useSpendingStats hook, SPENDING_STATS_KEY, formatCurrency single-division contract"
provides:
  - "Army Lists page: text-3xl header + subtitle + pb-6 border-b hairline"
  - "ArmyListCard: bg-card elevation + hover:shadow-md transition + tabular-nums on points and battle-ready %"
  - "SpendingPage: h1 inside max-w-3xl wrapper + subtitle + Breakdown h2 downgraded to text-base + tabular-nums on all formatCurrency sites + Receipt icon empty state"
affects:
  - "16-07 (ArmyListsEmptyState — separate component, not touched here)"
  - "16-08 (UAT visual check of army lists + spending pages)"

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Phase 16 page header contract applied: text-3xl font-semibold tracking-tight + subtitle + pb-6 border-b border-border/40"
    - "Interactive card hover pattern: bg-card border border-border/60 shadow-sm hover:shadow-md transition-shadow duration-150"
    - "Empty state icon-in-container: rounded-xl bg-muted/40 p-4 wrapping lucide icon"
    - "tabular-nums on every numeric/currency render site"

key-files:
  created: []
  modified:
    - "src/features/army-lists/ArmyListsPage.tsx"
    - "src/features/army-lists/ArmyListCard.tsx"
    - "src/features/spending/SpendingPage.tsx"

key-decisions:
  - "SpendingPage header inserted INSIDE max-w-3xl mx-auto p-8 wrapper (Pitfall 1) — border-b spans only the narrow content column"
  - "Spending page empty state triggered when totalPence === 0 && factionBreakdown.length === 0 && paintsPence === 0 — no CTA (spend logged from unit/paint detail sheets)"
  - "Breakdown h2 downgraded from text-xl (20px) to text-base (16px) per Phase 16 size scale (only 14/16/28px allowed)"
  - "Task 1 changes (ArmyListsPage + ArmyListCard) were already committed in 1de6da6 from a prior session — confirmed correct, no re-work needed"

patterns-established:
  - "SpendingPage isEmpty guard: check all three spend totals (totalPence, factionBreakdown.length, paintsPence) before rendering hero card"

requirements-completed:
  - PAGE-HEADER-ARMY-LISTS
  - PAGE-HEADER-SPENDING
  - TABULAR-NUMS-ARMY-LISTS
  - TABULAR-NUMS-SPENDING
  - CARD-ELEVATION-ARMY-LIST-CARD

# Metrics
duration: 15min
completed: 2026-05-04
---

# Phase 16 Plan 05: Army Lists + Spending cluster headers, elevation, tabular-nums, and empty state Summary

**Army Lists and Spending pages upgraded with Phase 16 typography headers, ArmyListCard shadow-based hover elevation replacing muted-bg hover, tabular-nums on all numeric displays, and Spending empty state with Receipt icon-in-container pattern**

## Performance

- **Duration:** 15 min
- **Started:** 2026-05-04T10:50:00Z
- **Completed:** 2026-05-04T11:05:00Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- ArmyListsPage: h1 upgraded from `text-xl font-semibold` to `text-3xl font-semibold tracking-tight` with subtitle "Points-tracked lists for the tabletop" and `pb-6 border-b border-border/40` wrapper
- ArmyListCard: `hover:bg-muted/50 transition-colors` replaced by `bg-card border border-border/60 shadow-sm hover:shadow-md transition-shadow duration-150`; `tabular-nums` added to totalPoints and battleReadyPct spans
- SpendingPage: h1 "Spending" inserted as first child inside max-w-3xl wrapper (Pitfall 1 compliant); Breakdown h2 downgraded from `text-xl` to `text-base`; `tabular-nums` on hero total + faction breakdown cells + paints row; Receipt icon empty state added with verbatim UI-SPEC copy

## Task Commits

Each task was committed atomically:

1. **Task 1: Upgrade ArmyListsPage header + ArmyListCard elevation and tabular-nums** - `1de6da6` (feat — already in HEAD from prior session, confirmed correct)
2. **Task 2: Add SpendingPage header, tabular-nums, Breakdown h2 downgrade, empty state** - `342c84e` (feat)

## Files Created/Modified
- `src/features/army-lists/ArmyListsPage.tsx` - h1 upgraded to text-3xl + tracking-tight, subtitle added, wrapper gets pb-6 border-b border-border/40
- `src/features/army-lists/ArmyListCard.tsx` - Card elevation pattern (shadow-sm + hover:shadow-md transition-shadow), tabular-nums on totalPoints and battleReadyPct
- `src/features/spending/SpendingPage.tsx` - Page header h1 inside max-w-3xl, subtitle, isEmpty guard, Receipt empty state, Breakdown h2 to text-base, tabular-nums on 3 currency sites, Receipt lucide import

## SpendingPage Before/After

**Header:**
- Before: No h1 in page
- After: `<h1 className="text-3xl font-semibold tracking-tight">Spending</h1>` inside max-w-3xl wrapper as first child

**Breakdown h2:**
- Before: `<h2 className="text-xl font-semibold">Breakdown</h2>`
- After: `<h2 className="text-base font-semibold">Breakdown</h2>`

**tabular-nums applied at (line numbers post-edit):**
- Line 82: hero card `<span className="text-3xl font-semibold tabular-nums">`
- Line 100: faction breakdown `<TableCell className="tabular-nums">`
- Line 105: paints row `<TableCell className="tabular-nums">`

**Empty state:** Added isEmpty check; Receipt icon imported from lucide-react; "No spend logged yet" headline + "Add purchase prices to units and paints from their detail sheets to track your spend here." helper text; no CTA button.

## Decisions Made
- SpendingPage header inserted INSIDE max-w-3xl mx-auto p-8 wrapper (Pitfall 1) so the hairline border-b spans only the narrow content column, not the full window
- isEmpty condition checks all three spend sources to avoid false-positive empty state when some data exists
- Receipt icon chosen per UI-SPEC §Empty State Contract (Spending row)
- Task 1 changes were already committed in `1de6da6` — verified correct via git show; no re-work needed

## Deviations from Plan

None — plan executed exactly as written. Task 1 changes were pre-committed in a prior session but matched the plan spec exactly.

## Issues Encountered
None — TypeScript clean, all 295 tests passing (32 spending, remainder of suite unaffected).

## Verification Results

- `npx tsc --noEmit`: 0 errors
- `npx vitest run tests/spending/`: 32/32 passing
- `npx vitest run` (full suite): 295 passed, 4 skipped (Wave 0 stubs), 0 failing

Manual pattern checks all passed:
- ArmyListsPage: `text-3xl font-semibold tracking-tight` present, subtitle present, `pb-6 border-b border-border/40` present
- ArmyListCard: `hover:shadow-md` present, `border-border/60` present, `transition-shadow duration-150` present, `hover:bg-muted/50` ABSENT, `tabular-nums` present (2 spans)
- SpendingPage: h1 present, subtitle present, `pb-6 border-b border-border/40` present, 3x `tabular-nums`, `text-xl` on h2 ABSENT, empty state copy present, `Receipt` imported

## User Setup Required
None — no external service configuration required.

## Next Phase Readiness
- Phase 16-06 can proceed: Collection + Unit Gallery (or whichever remaining pages in the overhaul cluster)
- Phase 16-08 UAT can visually verify: Army Lists h1 + subtitle, ArmyListCard hover shadow lift, Spending h1 inside max-w-3xl, Breakdown h2 visually smaller, empty state Receipt icon

---
*Phase: 16-design-overhaul*
*Completed: 2026-05-04*
