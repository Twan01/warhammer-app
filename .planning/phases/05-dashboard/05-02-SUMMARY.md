---
phase: 05-dashboard
plan: 02
subsystem: ui
tags: [react, shadcn, tanstack-query, tanstack-router, zustand, vitest, testing-library]

requires:
  - phase: 05-00
    provides: computeStats, relativeTime, statusAbbr — pure logic foundation
  - phase: 05-01
    provides: useDashboardStats hook wired to getDashboardStats + computeStats
  - phase: 03-04
    provides: UnitDetailSheet, UnitSheet, UnitDeleteDialog, collectionFilters store

provides:
  - StatCard atomic component (shared 7x in DashboardPage)
  - DashboardListRow atomic component (Active Projects + Recently Updated rows)
  - FactionSummaryCard atomic component with border-l-4 color accent + filter click-through
  - DashboardEmptyState atomic component
  - DashboardPage assembled container page (loading/error/empty/populated branches)
  - Route /  now serves real DashboardPage (PlaceholderPage removed)
  - DashboardPage.test.tsx stubs filled (3 tests covering DASH-01..08)

affects: [05-03-visual-verify, any future plan touching src/features/dashboard/]

tech-stack:
  added: []
  patterns:
    - "Dashboard atomic components: StatCard (value+label), DashboardListRow (click + faction badge + STATUS_ABBR + optional relativeTime), FactionSummaryCard (border-l-4 color), DashboardEmptyState"
    - "FactionSummaryCard click-through: useCollectionFilters.setState({ factions:[id], search:'', statuses:[], categories:[], activeOnly:false }) + navigate(/collection)"
    - "DashboardPage sibling Sheet/Dialog pattern: UnitDetailSheet + UnitSheet + UnitDeleteDialog mounted as siblings (Pitfall 4), each keyed by entity?.id for fresh remount (POLISH-04)"
    - "Test: vi.mock('@/db/queries/dashboard') + renderWithProviders (QueryClient + minimal TanStack Router) pattern for component integration tests"

key-files:
  created:
    - src/features/dashboard/StatCard.tsx
    - src/features/dashboard/DashboardListRow.tsx
    - src/features/dashboard/FactionSummaryCard.tsx
    - src/features/dashboard/DashboardEmptyState.tsx
    - src/features/dashboard/DashboardPage.tsx
  modified:
    - src/app/dashboard/page.tsx (PlaceholderPage replaced with DashboardPage delegation)
    - tests/dashboard/DashboardPage.test.tsx (Wave-0 stubs replaced with 3 real tests)

key-decisions:
  - "DashboardListRow test assertion used getAllByText for faction names — 'Tau' appears in both FactionSummaryCard and DashboardListRow Badge, causing getByText to throw on multiple matches"
  - "DashboardPage empty state: sibling Sheet/Dialog components still mounted (open=false) for forward-compat; no functional impact"

patterns-established:
  - "Route page delegation: src/app/X/page.tsx imports from @/features/X/XPage and delegates — matches collection/page.tsx pattern"
  - "Dashboard test isolation: vi.mock(@/db/queries/dashboard) + createMemoryHistory router wrapper avoids SQLite dependency in component tests"

requirements-completed:
  - DASH-01
  - DASH-02
  - DASH-03
  - DASH-04
  - DASH-05
  - DASH-06
  - DASH-07
  - DASH-08

duration: 6min
completed: 2026-05-01
---

# Phase 05 Plan 02: Dashboard UI Components + Page Assembly Summary

**Five Dashboard components (StatCard, DashboardListRow, FactionSummaryCard, DashboardEmptyState, DashboardPage) assembled with full loading/error/empty/populated states; route `/` now serves real data via useDashboardStats; 3 integration tests cover all DASH-01..08 requirements**

## Performance

- **Duration:** ~6 min
- **Started:** 2026-05-01T09:05:59Z
- **Completed:** 2026-05-01T09:11:20Z
- **Tasks:** 3
- **Files modified:** 7

## Accomplishments

- 4 atomic UI components built: StatCard, DashboardListRow, FactionSummaryCard, DashboardEmptyState — each self-contained and individually testable
- DashboardPage assembled with 4 layout sections (top stats, progress, faction cards, lists) plus full loading skeleton, error message, and DASH-08 empty state branches
- Route `/` now serves real DashboardPage; PlaceholderPage removed from src/app/dashboard/page.tsx
- Wave-0 test stubs in DashboardPage.test.tsx replaced with 3 real integration tests (113 total suite passes, 0 skips in dashboard directory)
- Production build green: 2032 modules, dist/index.html generated, 830 kB bundle

## Task Commits

1. **Task 1: Four atomic Dashboard components** - `56e3491` (feat)
2. **Task 2: DashboardPage assembly + DashboardPage.test.tsx stubs** - `e84afdc` (feat)
3. **Task 3: Replace dashboard route placeholder** - `b8b2f4f` (feat)

## Files Created/Modified

- `src/features/dashboard/StatCard.tsx` — Card with text-3xl value + text-sm label; 7x use in DashboardPage
- `src/features/dashboard/DashboardListRow.tsx` — Clickable row with faction Badge (inline bg color), STATUS_ABBR, optional formatRelativeTime; min-h-[44px]
- `src/features/dashboard/FactionSummaryCard.tsx` — border-l-4 color accent, useCollectionFilters.setState + navigate(/collection) on click
- `src/features/dashboard/DashboardEmptyState.tsx` — PackageSearch h-12 w-12 + copywriting contract copy + Go to Collection CTA
- `src/features/dashboard/DashboardPage.tsx` — Full page container: loading skeletons, error text, empty/populated branches; UnitDetailSheet+UnitSheet+UnitDeleteDialog siblings
- `src/app/dashboard/page.tsx` — Replaced PlaceholderPage delegation with DashboardPage import
- `tests/dashboard/DashboardPage.test.tsx` — 3 integration tests (DASH-01..06 sections, DASH-08 empty, error state)

## Decisions Made

- DashboardListRow test assertion needed `getAllByText` for faction names because "Tau" renders in both FactionSummaryCard and DashboardListRow Badge simultaneously — `getByText` throws on multiple matches; using `getAllByText(...).length >= 1` is the correct assertion.
- Empty-state branch still mounts sibling Sheet/Dialog components with `open={false}` for structural parity with populated branch; no visual/functional difference.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Test assertion used getByText for faction names causing multiple-match error**
- **Found during:** Task 2 (DashboardPage.test.tsx execution)
- **Issue:** "Tau" appears in both FactionSummaryCard name span AND in DashboardListRow faction Badge — `getByText("Tau")` threw `Found multiple elements`
- **Fix:** Changed to `getAllByText("Tau").length >= 1` and same for "Ultra"
- **Files modified:** tests/dashboard/DashboardPage.test.tsx
- **Verification:** All 3 DashboardPage tests pass; 113 total tests green
- **Committed in:** e84afdc (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - bug in test assertion)
**Impact on plan:** Necessary for correct test behavior. No scope creep.

## Issues Encountered

None — aside from the test assertion fix above.

## Build Output

```
vite v6.4.2 building for production...
2032 modules transformed.
dist/index.html            0.53 kB | gzip: 0.33 kB
dist/assets/index-*.css   69.04 kB | gzip: 11.76 kB
dist/assets/index-*.js   830.43 kB | gzip: 248.56 kB
built in 6.98s
```

Chunk size warning (830 kB) is pre-existing from prior phases — not introduced by this plan.

## Wiring Summary

```
useDashboardStats()
  └── getDashboardStats() (SQLite: units + factions)
  └── computeStats(units, factions) → ComputedDashboardStats
        ↓
  DashboardPage
    ├── StatCard ×7 (DASH-01, DASH-03, DASH-04)
    ├── FactionSummaryCard ×N (DASH-02)
    ├── DashboardListRow ×5 active (DASH-05)
    ├── DashboardListRow ×5 recent (DASH-06, showTime=true)
    ├── DashboardEmptyState (DASH-08, when !stats.hasUnits)
    └── UnitDetailSheet + UnitSheet + UnitDeleteDialog (siblings, POLISH-04)
```

## Note on Human Verify

Visual sign-off deferred to plan 05-03 (this plan is `autonomous: true`). Plan 05-03 owns the checkpoint for visual confirmation that the Dashboard renders correctly in the running app.

## Next Phase Readiness

- All DASH-01..08 requirements delivered at code level
- Dashboard is reachable at `/` in any subsequent `pnpm tauri dev` session
- Phase 5 plan 03 (visual verify) is the final step before phase completion

---
*Phase: 05-dashboard*
*Completed: 2026-05-01*
