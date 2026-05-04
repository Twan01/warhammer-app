---
phase: 25-design-foundation
plan: 01
subsystem: ui
tags: [tailwind, css-variables, design-tokens, react-components, typescript]

# Dependency graph
requires: []
provides:
  - "globals.css: --forge-black, --panel-elevated, --panel-surface, --battle-gold CSS variables + Tailwind --color-* aliases"
  - "PageHeader component at src/components/common/PageHeader.tsx"
  - "StatusBadge component at src/components/ui/status-badge.tsx with PAINTING_STATUS_TIER"
  - "Extended StatCard with optional icon, trend, progress props (backward-compatible)"
affects:
  - "25-02 (PageHeader wire-in to all 9 pages)"
  - "26-dashboard-redesign (bg-panel-elevated, bg-battle-gold, enriched StatCard usage)"
  - "27-navigation-quick-add (bg-forge-black token)"
  - "28-collection-projects (StatusBadge applied in UnitTable/UnitGallery)"
  - "29-workshop-play (bg-panel-surface token)"

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Design token alias pattern: semantic names (--forge-black) aliasing existing tokens (hsl(var(--background))) in .dark block"
    - "Tailwind v4 @theme inline registration for custom utility tokens"
    - "Battle Gold: oklch(0.78 0.17 85) — defined in .dark, NOT applied until Phase 26+"
    - "StatusBadge tier co-location: visual tier logic lives in the component, not in types/"
    - "PAINTING_STATUS_TIER exported as Record<PaintingStatus, Tier> for downstream consumers"

key-files:
  created:
    - src/components/common/PageHeader.tsx
    - src/components/ui/status-badge.tsx
  modified:
    - src/styles/globals.css
    - src/features/dashboard/StatCard.tsx

key-decisions:
  - "PAINTING_STATUS_TIER co-located in status-badge.tsx (not types/unit.ts) — visual tier logic is a UI concern; callers only need PaintingStatus values"
  - "Battle Gold defined as oklch(0.78 0.17 85) but NOT applied to any element in Phase 25 — Phase 26+ owns application per UI-SPEC §Phase Boundary Constraints"
  - "progress !== undefined guard used in StatCard (not truthy check) — progress={0} is valid and must still render a 0%-wide bar"
  - "icon: Icon destructure rename in StatCard — JSX requires capitalized identifier to render a component element"

patterns-established:
  - "Phase 25 token pattern: .dark block alias + @theme inline --color-* registration = one Tailwind utility per new color"
  - "PageHeader outer className locked: 'flex items-center justify-between pb-6 border-b border-border/40' — Plan 25-02 uses this verbatim for all 9 page rewrites"

requirements-completed: [DSFD-01, DSFD-03, DSFD-04]

# Metrics
duration: 4min
completed: 2026-05-04
---

# Phase 25 Plan 01: Design Foundation Primitives Summary

**CSS design tokens (forge-black/panel-elevated/panel-surface/battle-gold), PageHeader component, 4-tier StatusBadge, and backward-compatible enriched StatCard — all v2.3 phase infrastructure in place**

## Performance

- **Duration:** 4 min
- **Started:** 2026-05-04T19:46:36Z
- **Completed:** 2026-05-04T19:50:39Z
- **Tasks:** 4
- **Files modified:** 4 (2 new, 2 modified)

## Accomplishments
- Four new CSS design tokens registered in `.dark` block and exposed as Tailwind utilities via `@theme inline` — `bg-forge-black`, `bg-panel-elevated`, `bg-panel-surface`, `bg-battle-gold`, `text-battle-gold` all resolve at runtime
- `PageHeader` component created with locked outer className; ready for Plan 25-02 page wire-in
- `StatusBadge` component with `PAINTING_STATUS_TIER` record covering all 11 PaintingStatus values; TypeScript exhaustiveness enforced at compile time
- `StatCard` extended with `icon`, `trend`, `progress` optional props; all 7 existing DashboardPage call sites remain backward-compatible

## Task Commits

Each task was committed atomically:

1. **Task 1: Add design tokens to globals.css** — `9aeaaec` (feat)
2. **Task 2: Create PageHeader common component** — `3cc03df` (feat)
3. **Task 3: Create StatusBadge ui component with 4-tier color map** — `e14b6dd` (feat)
4. **Task 4: Extend StatCard with optional icon, trend, progress props** — `fd08233` (feat)

## Files Created/Modified
- `src/styles/globals.css` — Added 4 tokens to `.dark` block + 4 `--color-*` aliases to `@theme inline`
- `src/components/common/PageHeader.tsx` — New: reusable PageHeader with title/subtitle/actions slots
- `src/components/ui/status-badge.tsx` — New: StatusBadge + PAINTING_STATUS_TIER (all 11 PaintingStatus values)
- `src/features/dashboard/StatCard.tsx` — Extended: added icon/trend/progress optional props, backward-compatible

## Decisions Made
- `PAINTING_STATUS_TIER` co-located in `status-badge.tsx` (not `types/unit.ts`) — visual tier logic is a UI concern; Phase 28 (COLL-02) imports from this location
- Battle Gold actual value: `oklch(0.78 0.17 85)` — confirmed. Defined in `.dark` block but NOT applied to any element in Phase 25; application is owned by Phase 26+
- `progress !== undefined` guard in StatCard ensures `progress={0}` renders a valid 0%-wide bar (not omitted by truthiness check)
- `icon: Icon` destructure rename required for JSX to render a component (capitalized identifier contract)

## Deviations from Plan
None — plan executed exactly as written. All 4 artifacts match their specified content verbatim.

## Issues Encountered
None. `pnpm build` passed on first attempt for every task. Pre-existing build warnings (ring CSS variable, chunk size) are unrelated to this plan.

## User Setup Required
None — no external service configuration required.

## Next Phase Readiness
- Plan 25-02 can start immediately: `PageHeader` exists at the exact import path with the locked outer className
- Phase 26 (Dashboard Redesign) can use `bg-panel-elevated`, `bg-forge-black`, `bg-battle-gold` utilities and the enriched `StatCard` with `icon`/`trend`/`progress`
- Phase 28 (COLL-02) can import `StatusBadge` from `@/components/ui/status-badge` and `PAINTING_STATUS_TIER` for the UnitTable and UnitGallery wiring

---
*Phase: 25-design-foundation*
*Completed: 2026-05-04*
