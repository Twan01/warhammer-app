---
phase: 25-design-foundation
plan: 02
subsystem: ui
tags: [react-components, typescript, design-system, page-headers]

# Dependency graph
requires:
  - phase: 25-01
    provides: "PageHeader component at src/components/common/PageHeader.tsx"
provides:
  - "All 9 main pages render their title via shared PageHeader component"
  - "DSFD-02 satisfied: canonical header applied to every main page"
  - "FactionsPage upgraded from text-xl (20px) to text-3xl (28px) design-system alignment"
affects:
  - "26-dashboard-redesign (Dashboard actions slot reserved for Phase 26 DASH-02)"
  - "28-collection-projects (CollectionPage and FactionsPage headers already canonical)"

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "PageHeader wire-in pattern: add import + replace inline div block + pass actions as ReactNode prop"
    - "Fragment wrapper for 3+ sibling action elements (CollectionPage view toggles + Add Unit)"
    - "Direct element for single action (all other pages)"
    - "SpendingPage: PageHeader stays inside max-w-3xl wrapper (Phase 16 Pitfall 1 preserved)"

key-files:
  created: []
  modified:
    - src/features/units/CollectionPage.tsx
    - src/features/painting-projects/PaintingProjectsPage.tsx
    - src/features/paints/PaintsPage.tsx
    - src/features/recipes/RecipesPage.tsx
    - src/features/army-lists/ArmyListsPage.tsx
    - src/features/battle-log/BattleLogPage.tsx
    - src/features/spending/SpendingPage.tsx
    - src/features/dashboard/DashboardPage.tsx
    - src/features/factions/FactionsPage.tsx

key-decisions:
  - "Dashboard actions slot left empty in Phase 25 — Phase 26 (DASH-02) will populate with Quick Add + Log Session buttons"
  - "FactionsPage title upgraded from text-xl (20px) to text-3xl (28px) — intentional alignment to design system"
  - "SpendingPage PageHeader kept inside max-w-3xl wrapper per Phase 16 Pitfall 1 — border-b spans narrow column only"
  - "CollectionPage uses fragment wrapper for actions (3 siblings: table toggle, gallery toggle, Add Unit)"

patterns-established:
  - "PageHeader wire-in: import + replace inline div + pass existing actions as ReactNode (no layout change outside header)"
  - "Dashboard multi-branch pattern: same PageHeader call (no actions) duplicated across error/loading/empty/populated returns"

requirements-completed: [DSFD-02]

# Metrics
duration: 45min
completed: 2026-05-04
---

# Phase 25 Plan 02: PageHeader Wire-in to All 9 Pages Summary

**All 9 main pages now render their header via the shared PageHeader component — inline header divs eliminated from every page file, FactionsPage upgraded from 20px to 28px**

## Performance

- **Duration:** ~45 min
- **Started:** 2026-05-04
- **Completed:** 2026-05-04
- **Tasks:** 4 (3 auto + 1 human-verify checkpoint)
- **Files modified:** 9

## Accomplishments

- All 9 main pages render their title through `<PageHeader />` — no inline `text-3xl font-semibold tracking-tight` h1 strings remain in any page file
- DashboardPage: PageHeader applied to all 4 render branches (error, loading, empty/no-units, populated)
- FactionsPage: only outlier page upgraded from legacy `text-xl` (20px) to design-system `text-3xl` (28px) — visual consistency achieved
- Human smoke test passed: user confirmed all 9 pages display correct title, subtitle, separator, and action slots
- DSFD-01 (tokens), DSFD-02 (PageHeader applied), DSFD-03 (StatCard enriched), DSFD-04 (StatusBadge built) all satisfied at the artifact level across Plans 01 and 02

## Task Commits

Each task was committed atomically:

1. **Task 1: Wire PageHeader into 7 canonical pages** - `c0aa3a5` (feat)
2. **Task 2: Wire PageHeader into DashboardPage all 4 branches** - `61a6706` (feat)
3. **Task 3: Upgrade FactionsPage from text-xl to canonical PageHeader** - `6581fec` (feat)
4. **Task 4: Visual smoke test** - checkpoint approved by user (no code changes)

**Checkpoint docs:** `4017df6` (docs: checkpoint state during execution)

## Files Created/Modified

- `src/features/units/CollectionPage.tsx` — PageHeader with fragment-wrapped actions (view toggles + Add Unit)
- `src/features/painting-projects/PaintingProjectsPage.tsx` — PageHeader with AddProjectPicker action
- `src/features/paints/PaintsPage.tsx` — PageHeader with Add Paint action
- `src/features/recipes/RecipesPage.tsx` — PageHeader with Add Recipe action
- `src/features/army-lists/ArmyListsPage.tsx` — PageHeader with New List action
- `src/features/battle-log/BattleLogPage.tsx` — PageHeader with Log Game action (single element, no fragment)
- `src/features/spending/SpendingPage.tsx` — PageHeader inside max-w-3xl wrapper, no actions
- `src/features/dashboard/DashboardPage.tsx` — PageHeader in all 4 render branches, no actions (reserved for Phase 26)
- `src/features/factions/FactionsPage.tsx` — PageHeader upgraded from text-xl, Add Faction action, no subtitle

## Decisions Made

- Dashboard actions slot left empty: Phase 25 ships the header without actions; Phase 26 DASH-02 will add Quick Add + Log Session buttons
- FactionsPage title size change is intentional: upgrading from text-xl (20px) to text-3xl (28px) aligns Factions with all other pages per UI-SPEC §Typography Display contract
- SpendingPage: PageHeader kept inside max-w-3xl wrapper per Phase 16 Pitfall 1 — border-b spans only the narrow content column, not the full window
- StatusBadge built in Plan 01 but not yet applied — Phase 28 COLL-02 wires it into UnitTable rows and UnitGallery cards

## Deviations from Plan

None — plan executed exactly as written. All 9 pages updated per specification, no unplanned files modified, no auto-fixes required.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required.

## Human Verify Checkpoint

**Task 4 result: Approved**

User navigated all 9 main pages in `pnpm tauri dev` and confirmed correct rendering:
- All titles display at 28px (text-3xl) with thin border-bottom separator
- Subtitles render as small muted text where specified
- All action buttons and view-mode toggles continue to work
- Dashboard header present across loading, empty, and populated states
- Factions title visibly larger than before (28px vs prior 20px), layout intact
- Spending border-b spans only the narrow max-w-3xl content column

## Next Phase Readiness

- Phase 25 Design Foundation is now complete (Plans 01 and 02 both done)
- Phase 26 Dashboard Redesign: Wave 0 stubs already in place (26-00 complete)
- Dashboard actions slot is reserved and empty — ready for Phase 26 DASH-02 to populate
- StatusBadge at `src/components/ui/status-badge.tsx` ready for Phase 28 COLL-02 wire-in
- All 9 pages canonical — Phase 28 collection/project work builds on a consistent header foundation

---
*Phase: 25-design-foundation*
*Completed: 2026-05-04*

## Self-Check: PASSED

Files confirmed modified (from git log):
- c0aa3a5 — Task 1: 7 canonical pages
- 61a6706 — Task 2: DashboardPage 4 branches
- 6581fec — Task 3: FactionsPage upgrade
