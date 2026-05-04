---
phase: 25-design-foundation
plan: 02
subsystem: ui
tags: [react-components, typescript, design-system, page-headers]
status: checkpoint-pending

# Dependency graph
requires:
  - "25-01 (PageHeader component at src/components/common/PageHeader.tsx)"
provides:
  - "All 9 main pages render their title via shared PageHeader component"
  - "DSFD-02 satisfied: canonical header applied to every main page"
affects:
  - "26-dashboard-redesign (Dashboard actions slot reserved for Phase 26 DASH-02)"
  - "28-collection-projects (CollectionPage headers already canonical)"

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

# Metrics
duration: pending-checkpoint
completed: pending
---

# Phase 25 Plan 02: PageHeader Wire-in to All 9 Pages Summary

**All 9 main pages now render their header via the shared PageHeader component — inline header divs eliminated from every page file**

## Status

**CHECKPOINT PENDING** — Tasks 1–3 complete. Awaiting Task 4 human smoke test (visual verification in live Tauri app).

## Performance

- **Tasks 1–3:** Complete
- **Task 4:** Checkpoint — awaiting human verify

## Accomplishments

### Task 1: 7 Canonical Pages (commit c0aa3a5)
- CollectionPage, PaintingProjectsPage, PaintsPage, RecipesPage, ArmyListsPage, BattleLogPage, SpendingPage
- Each page: added `import { PageHeader } from "@/components/common/PageHeader"` and replaced inline header block
- All existing action buttons preserved in the `actions` prop slot
- SpendingPage: PageHeader placed inside `max-w-3xl` wrapper (Phase 16 Pitfall 1 behavior preserved)

### Task 2: DashboardPage all 4 branches (commit 61a6706)
- Error, loading, empty (no-units), and populated render branches all replaced
- No `actions` prop — Phase 25 ships the Dashboard header empty; Phase 26 DASH-02 owns Quick Add + Log Session
- All 4 branches retain their `flex flex-col gap-12 p-6` outer wrapper

### Task 3: FactionsPage legacy upgrade (commit 6581fec)
- Only page not already on Phase 16 pattern — was using `text-xl font-semibold` (20px)
- Upgraded to `PageHeader title="Factions"` — now 28px (text-3xl) matching every other page
- No subtitle (UI-SPEC Copywriting Contract for Factions has title only)
- Add Faction button preserved in actions slot

## Verification Completed (pre-checkpoint)

- `pnpm build` passed after each task (zero TypeScript errors)
- Grep: 9 × `import { PageHeader }` across the 9 modified page files — confirmed
- Grep: 0 × `text-3xl font-semibold tracking-tight` inside any `<h1>` in the 9 page files — confirmed
- Grep: 0 × `text-xl font-semibold` in FactionsPage — confirmed

## Pending: Task 4 Human Smoke Test

Manual verification required in `pnpm tauri dev`:

| Page | Title | Subtitle | Actions |
|------|-------|----------|---------|
| Dashboard | Dashboard | "Your hobby command center at a glance" | (empty) |
| Collection | Collection | "All units you own, tracked and filterable" | view toggles + Add Unit |
| Painting Projects | Painting Projects | "Active units being worked on right now" | AddProjectPicker |
| Paints | Paints | "Your paint collection, linked to recipes" | Add Paint |
| Recipes | Recipes | "Documented paint schemes for your models" | Add Recipe |
| Army Lists | Army Lists | "Points-tracked lists for the tabletop" | New List |
| Battle Log | Battle Log | "Every game you've played, win or lose." | Log Game |
| Spending | Spending | "Total hobby spend tracked to the penny" | (none) |
| Factions | Factions | (none) | Add Faction |

Special checks:
- Dashboard: header present in loading + empty + populated states
- Factions: title visibly larger than before (28px vs prior 20px) — layout intact
- Spending: border-b spans only narrow max-w-3xl column, not full window

## Deviations from Plan

None — plan executed exactly as written. All 9 pages updated per specification.

## Self-Check

Files exist:
- src/features/units/CollectionPage.tsx — FOUND (modified)
- src/features/painting-projects/PaintingProjectsPage.tsx — FOUND (modified)
- src/features/paints/PaintsPage.tsx — FOUND (modified)
- src/features/recipes/RecipesPage.tsx — FOUND (modified)
- src/features/army-lists/ArmyListsPage.tsx — FOUND (modified)
- src/features/battle-log/BattleLogPage.tsx — FOUND (modified)
- src/features/spending/SpendingPage.tsx — FOUND (modified)
- src/features/dashboard/DashboardPage.tsx — FOUND (modified)
- src/features/factions/FactionsPage.tsx — FOUND (modified)

Commits exist:
- c0aa3a5 — Task 1 (7 canonical pages)
- 61a6706 — Task 2 (DashboardPage)
- 6581fec — Task 3 (FactionsPage)

## Self-Check: PASSED

---
*Phase: 25-design-foundation*
*Checkpoint pending: Task 4 human smoke test*
