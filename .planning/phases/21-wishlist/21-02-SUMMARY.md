---
phase: 21-wishlist
plan: "02"
subsystem: ui
tags: [react, tanstack-router, react-hook-form, zod, shadcn, wishlist]

requires:
  - phase: 21-wishlist-01
    provides: WishlistItem types, useWishlistItems hooks, wishlistItemSchema, DB queries

provides:
  - WishlistPage with sibling-portal Sheet/Dialog architecture at /wishlist
  - WishlistItemRow with group-hover edit/delete actions
  - WishlistItemSheet create/edit form with pence/pounds conversion
  - WishlistItemDeleteDialog confirmation using Dialog (not AlertDialog)
  - WishlistEmptyState icon-pill empty state
  - /wishlist route registered in TanStack Router
  - Wishlist entry in MANAGEMENT_NAV sidebar group with Heart icon
  - 8 activated component integration tests covering WISH-01..04

affects: [22-dashboard, future-wishlist-enhancements]

tech-stack:
  added: []
  patterns:
    - Sibling-portal architecture: Sheet + Dialog as siblings at page root (never nested)
    - group-hover visibility pattern for row actions (invisible group-hover:visible)
    - buildDefaultValues() function to avoid zod .default() with react-hook-form
    - useEffect form.reset belt-and-braces when item prop changes (Pitfall 3)
    - Math.round(pounds * 100) for pence storage; display as (pence / 100).toFixed(2) (Pitfall 4)

key-files:
  created:
    - src/features/wishlist/WishlistPage.tsx
    - src/features/wishlist/WishlistItemRow.tsx
    - src/features/wishlist/WishlistItemSheet.tsx
    - src/features/wishlist/WishlistItemDeleteDialog.tsx
    - src/features/wishlist/WishlistEmptyState.tsx
    - src/app/wishlist/page.tsx
  modified:
    - src/app/router.tsx
    - src/components/common/AppSidebar.tsx
    - tests/wishlist/WishlistPage.test.tsx

key-decisions:
  - "Dialog (not AlertDialog) used for delete confirmation — AlertDialog not installed per Phase 18 decision"
  - "Wishlist page uses sibling-portal pattern (Sheet + Dialog never nested in row components)"
  - "Total estimated cost summary bar displays item count and formatCurrency(totalPence)"
  - "Heart icon used for Wishlist sidebar entry — domain-appropriate for desired items"

patterns-established:
  - "buildDefaultValues(item) — separate function, no zod .default() to avoid zodResolver breakage"
  - "group-hover:visible on action buttons with e.stopPropagation() to prevent row-level interactions"

requirements-completed:
  - WISH-01
  - WISH-02
  - WISH-03
  - WISH-04

duration: 8min
completed: "2026-05-05"
---

# Phase 21 Plan 02: Wishlist UI Layer Summary

**Full Wishlist page at /wishlist with Heart icon sidebar entry, row list with group-hover actions, Sheet form with pence/pounds conversion, delete Dialog, empty state, and 8 activated component tests**

## Performance

- **Duration:** 8 min
- **Started:** 2026-05-05T16:46:24Z
- **Completed:** 2026-05-05T16:55:09Z
- **Tasks:** 3 of 3
- **Files modified:** 9

## Accomplishments

- 5 Wishlist feature components created following BattleLogPage blueprint (Page, Row, Sheet, DeleteDialog, EmptyState)
- /wishlist route wired into TanStack Router and Wishlist added to MANAGEMENT_NAV sidebar group
- 8 component integration tests activated (WISH-01..04 coverage) — all 597 tests green

## Task Commits

Each task was committed atomically:

1. **Task 1: Create Wishlist feature components** - `e93026a` (feat)
2. **Task 2: Wire route and sidebar entry** - `afbc2bf` (feat)
3. **Task 3: Activate Wave 0 component test stubs** - `a8bfdfa` (test)

**Plan metadata:** (docs commit — see below)

## Files Created/Modified

- `src/features/wishlist/WishlistPage.tsx` — Page root with sibling-portal architecture; totalPence useMemo; formatCurrency summary bar
- `src/features/wishlist/WishlistItemRow.tsx` — 2-line row with group-hover:visible Edit/Delete buttons and e.stopPropagation
- `src/features/wishlist/WishlistItemSheet.tsx` — Create/edit Sheet; buildDefaultValues; useEffect reset; Math.round pence conversion
- `src/features/wishlist/WishlistItemDeleteDialog.tsx` — Dialog (not AlertDialog) with variant=destructive; useDeleteWishlistItem
- `src/features/wishlist/WishlistEmptyState.tsx` — Icon-pill empty state with Heart icon and "Your wishlist is empty" text
- `src/app/wishlist/page.tsx` — Barrel re-export for router
- `src/app/router.tsx` — Added wishlistRoute at /wishlist between spendingRoute and battleLogRoute
- `src/components/common/AppSidebar.tsx` — Added Heart icon import and Wishlist entry to MANAGEMENT_NAV
- `tests/wishlist/WishlistPage.test.tsx` — 8 activated tests (all it.skip stubs replaced with live implementations)

## Decisions Made

- Used Dialog (not AlertDialog) for delete confirmation — AlertDialog is not installed, per Phase 18 architectural decision
- Wishlist entry placed in MANAGEMENT_NAV sidebar group per CONTEXT.md locked decision
- Test mock strategy: hook-level mocking (useWishlistItems, useFactions) rather than DB query-level — simpler and sufficient for component tests

## Deviations from Plan

None — plan executed exactly as written. The one test fix (getByText → getAllByText for £45.00) was expected behavior per Pitfall 6 noted in the plan itself.

## Issues Encountered

One test assertion needed `getAllByText` instead of `getByText` for the £45.00 currency value, as it appears in both the row and the summary bar. This is the documented Pitfall 6 (shadcn Select / duplicate text patterns). Fixed in the same commit.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- All 4 WISH requirements (WISH-01..04) satisfied and verified by tests
- Wishlist page accessible at /wishlist via sidebar MANAGEMENT_NAV group
- Full wishlist feature (DB + hooks + UI) complete and production-build verified
- Dashboard wishlist widget (future) can consume useWishlistItems hook — invalidation already wired to dashboard-stats

---
*Phase: 21-wishlist*
*Completed: 2026-05-05*
