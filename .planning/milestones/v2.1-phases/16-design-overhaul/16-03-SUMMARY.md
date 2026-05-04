---
phase: 16-design-overhaul
plan: "03"
subsystem: ui
tags: [tailwind, typography, tabular-nums, card-elevation, dashboard, collection]

# Dependency graph
requires:
  - phase: 16-02
    provides: sidebar polish and nav grouping (Phase 16 design contract baseline)
provides:
  - DashboardPage with text-3xl h1, subtitle, and hairline border separator on all render branches
  - StatCard with tabular-nums numeric display and bg-card shadow-sm elevation (no hover)
  - CollectionPage with text-3xl h1, subtitle, hairline border, consolidated CTA slot
  - UnitGallery cards with tabular-nums on percentage and models/pts, shadow-sm hover:shadow-md interactive elevation
  - UnitDetailSheet purchase price with tabular-nums
affects: [16-06, 16-07, 16-08]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Page header contract: text-3xl font-semibold tracking-tight h1 + subtitle p.text-sm.text-muted-foreground + pb-6 border-b border-border/40 wrapper"
    - "Static card elevation: bg-card border border-border/60 shadow-sm (no hover)"
    - "Interactive card elevation: bg-card border border-border/60 shadow-sm hover:shadow-md transition-shadow duration-150"
    - "tabular-nums applied at render site of any numeric value"

key-files:
  created: []
  modified:
    - src/features/dashboard/DashboardPage.tsx
    - src/features/dashboard/StatCard.tsx
    - src/features/units/CollectionPage.tsx
    - src/features/units/UnitGallery.tsx
    - src/features/units/UnitDetailSheet.tsx

key-decisions:
  - "StatCard is a static display card — shadow-sm with NO hover:shadow-md (Pattern 5 anti-pattern check passed)"
  - "UnitGallery painting percentage added as tabular-nums text span below PaintingRing (was not previously rendered as text)"
  - "hover:bg-muted/50 removed from UnitGallery CARD_CLASSES and replaced with hover:shadow-md transition-shadow duration-150"
  - "All four DashboardPage render branches (error, loading, empty, populated) upgraded to new header structure"
  - "CollectionPage CTA slot consolidates view toggle buttons + Add Unit inside flex items-center gap-2"

patterns-established:
  - "Page header contract applied to Dashboard and Collection — all future pages use same h1/subtitle/border pattern"
  - "tabular-nums at render site only — never on label text or icon containers"

requirements-completed:
  - PAGE-HEADER-DASHBOARD
  - PAGE-HEADER-COLLECTION
  - TABULAR-NUMS-DASHBOARD
  - TABULAR-NUMS-COLLECTION
  - CARD-ELEVATION-STATCARD

# Metrics
duration: 25min
completed: 2026-05-04
---

# Phase 16 Plan 03: Dashboard and Collection cluster visual upgrade Summary

**Page header contract (text-3xl h1 + subtitle + hairline border) applied to Dashboard and Collection; tabular-nums added to StatCard, UnitGallery, and UnitDetailSheet; card elevation upgraded from flat border to bg-card shadow-sm with interactive hover:shadow-md on gallery cards**

## Performance

- **Duration:** 25 min
- **Started:** 2026-05-04T10:40:00Z
- **Completed:** 2026-05-04T10:45:00Z
- **Tasks:** 3
- **Files modified:** 5

## Accomplishments

- DashboardPage all four render branches (error, loading, empty, populated) now use text-3xl font-semibold tracking-tight h1 with subtitle "Your hobby command center at a glance" and pb-6 border-b border-border/40 separator
- StatCard upgraded to bg-card border border-border/60 shadow-sm (NO hover treatment — static card per Pattern 5); numeric span gains tabular-nums
- CollectionPage header upgraded to text-3xl h1 + subtitle "All units you own, tracked and filterable" + hairline border; CTA slot consolidates view toggle + Add Unit into flex gap-2
- UnitGallery CARD_CLASSES: hover:bg-muted/50 replaced by shadow-sm hover:shadow-md transition-shadow duration-150; percentage text span added below PaintingRing with tabular-nums; models/pts span gains tabular-nums
- UnitDetailSheet purchase price span gets tabular-nums on the formatCurrency() call site

## Task Commits

Each task was committed atomically:

1. **Task 1: Upgrade DashboardPage header + StatCard tabular-nums and elevation** - `13377ee` (feat)
2. **Task 2: Upgrade CollectionPage header + UnitGallery tabular-nums and card hover elevation** - `3b0ffff` (feat)
3. **Task 3: Add tabular-nums to UnitDetailSheet purchase price display** - `701264b` (feat)

## Files Created/Modified

- `src/features/dashboard/DashboardPage.tsx` — h1 upgraded across all 4 render branches; subtitle + hairline border added
- `src/features/dashboard/StatCard.tsx` — tabular-nums on stat number span; Card root: bg-card border border-border/60 shadow-sm (no hover)
- `src/features/units/CollectionPage.tsx` — h1 upgraded; subtitle added; CTA slot restructured to flex gap-2
- `src/features/units/UnitGallery.tsx` — CARD_CLASSES: shadow-sm hover:shadow-md transition-shadow (removed hover:bg-muted/50); percentage text span with tabular-nums added; models/pts span tabular-nums added
- `src/features/units/UnitDetailSheet.tsx` — tabular-nums added to formatCurrency() span at Purchase Price field

## Decisions Made

- StatCard explicitly has NO hover:shadow-md — it is a static display card per RESEARCH §Pattern 5; any hover treatment would be an anti-pattern
- UnitGallery painting percentage was not previously rendered as visible text — added `{unit.painting_percentage ?? 0}%` span with tabular-nums below PaintingRing to satisfy the plan requirement and provide a visible numeric display with clean digit alignment
- All DashboardPage render branches got the new header structure to ensure visual consistency across error, loading, and empty states — not just the populated state
- hover:bg-muted/50 on UnitGallery cards removed entirely; shadow-based hover is the Phase 16 interactive card pattern

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing] Added painting percentage text span to UnitGallery**
- **Found during:** Task 2 (UnitGallery tabular-nums)
- **Issue:** Plan specified "painted percentage display" as a tabular-nums target site, but UnitGallery only rendered the PaintingRing SVG (which has internal text); no standalone percentage span existed
- **Fix:** Added `<span className="text-xs text-muted-foreground tabular-nums">{unit.painting_percentage ?? 0}%</span>` below PaintingRing — satisfies plan requirement and creates a visible numeric text target for tabular-nums
- **Files modified:** src/features/units/UnitGallery.tsx
- **Verification:** UnitGallery tests still pass (test asserts ring SVG text separately from the new span)
- **Committed in:** 3b0ffff (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 missing content at specified render site)
**Impact on plan:** Required addition — plan explicitly lists "painted percentage display" as tabular-nums site; the span was missing. No scope creep.

## Issues Encountered

None — DashboardPage had four render branches requiring the header upgrade (the plan description focused on the populated state but all branches must be visually consistent). Applied upgrade to all four branches as a correctness requirement.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Page header contract established and working for Dashboard and Collection — Plans 16-04 and 16-05 can apply the same pattern to remaining pages
- StatCard, UnitGallery, and UnitDetailSheet visual contracts satisfy the Phase 16 elevation spec
- PaintingRing component is untouched (Phase 12 contract preserved)
- All 282 tests passing, 0 failing

## Self-Check

---

*Phase: 16-design-overhaul*
*Completed: 2026-05-04*
