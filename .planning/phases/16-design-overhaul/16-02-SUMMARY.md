---
phase: 16-design-overhaul
plan: 02
subsystem: ui
tags: [sidebar, lucide-react, tailwind, nav-grouping, linear-density]

# Dependency graph
requires:
  - phase: 16-01
    provides: Geist Variable font foundation installed in globals.css
provides:
  - NavItem with gap-4 / py-2 / font-semibold active state (Linear nav density)
  - AppSidebar wordmark: Sword icon + HobbyForge text + border-b border-border/40 separator
  - AppSidebar three grouped nav sections: MANAGE_NAV / INVENTORY_NAV / TRACKING_NAV
  - Section labels (Manage, Inventory, Tracking) visible in expanded mode, hidden in collapsed
affects:
  - 16-08 (visual audit will validate sidebar appearance)
  - Any future plan touching AppSidebar or NavItem

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Nav grouping via separate const arrays (MANAGE_NAV / INVENTORY_NAV / TRACKING_NAV) — no single MAIN_NAV"
    - "Section labels wrapped in {!collapsed && (...)} — renders only in expanded state"
    - "Wordmark area with border-b border-border/40 hairline separator"

key-files:
  created: []
  modified:
    - src/components/common/NavItem.tsx
    - src/components/common/AppSidebar.tsx

key-decisions:
  - "Sword (singular) replaces Swords (plural) — different lucide-react icons, singular matches UI-SPEC §Sidebar Polish Contract"
  - "Factions belongs in MANAGE_NAV group per RESEARCH §Open Question 3"
  - "Section labels use !collapsed guard — no layout impact in collapsed mode, no icon column clutter"

patterns-established:
  - "NavItem className: gap-4 px-2 py-2 for Linear nav density (16px gap, 8px vertical pad)"
  - "Active NavItem: bg-faction-accent font-semibold text-white (Phase 10 utility + Phase 16 weight scale)"

requirements-completed: [SIDEBAR-POLISH]

# Metrics
duration: 12min
completed: 2026-05-04
---

# Phase 16 Plan 02: Sidebar Polish Summary

**AppSidebar upgraded with Sword wordmark, three grouped nav sections (Manage/Inventory/Tracking), and NavItem Linear-density spacing — all Phase 10 collapse mechanics untouched**

## Performance

- **Duration:** 12 min
- **Started:** 2026-05-04T10:35:00Z
- **Completed:** 2026-05-04T10:47:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- NavItem Link className updated: gap-2→gap-4, py-1.5→py-2, font-medium→font-semibold on active state
- AppSidebar imports Sword (singular) from lucide-react; Swords (plural) removed
- MAIN_NAV replaced with MANAGE_NAV (4 items), INVENTORY_NAV (2 items), TRACKING_NAV (2 items)
- Wordmark area: Sword icon (h-4 w-4 text-faction-accent) + HobbyForge text (text-base font-semibold tracking-tight) + border-b border-border/40 hairline separator
- Section labels render in expanded mode only via {!collapsed && (...)} guard

## Task Commits

Each task was committed atomically:

1. **Task 1: Update NavItem with Linear-density classes** - `2d74582` (feat)
2. **Task 2: Add wordmark + section grouping to AppSidebar** - `3e16090` (feat)

**Plan metadata:** (docs commit — see below)

## NavItem className: Before / After

**Before:**
```
flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm ... bg-faction-accent font-medium text-white
```

**After:**
```
flex w-full items-center gap-4 rounded-md px-2 py-2 text-sm ... bg-faction-accent font-semibold text-white
```

## Files Created/Modified
- `src/components/common/NavItem.tsx` - gap-2→gap-4, py-1.5→py-2, font-medium→font-semibold active state
- `src/components/common/AppSidebar.tsx` - Sword wordmark, three nav groups, section labels

## Test Verification

- **bg-faction-accent assertion still passes (Pitfall 5):** Yes — NavItem.test.tsx asserts `toContain("bg-faction-accent")`; class is preserved in the active branch. 3/3 tests pass.
- **Nav-label text queries still pass (Pitfall 6):** Yes — "Manage", "Inventory", "Tracking" are uppercase section labels distinct from nav labels. All 8 AppSidebar tests pass (both theming and app-shell suites).
- **Full vitest suite:** 279 passing, 0 failing (19 skipped — pre-existing stubs for Phase 15)
- **TypeScript:** npx tsc --noEmit exits 0 — Sword vs Swords import compiles cleanly

## Decisions Made
- Sword (singular, not Swords) per UI-SPEC §Sidebar Polish Contract — different Lucide icon
- Factions placed in MANAGE_NAV per RESEARCH §Open Question 3
- Section labels use {!collapsed && (...)} — no impact on collapse mechanics

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Sidebar polish complete; visual audit deferred to Plan 16-08 per plan spec
- Plan 16-03 is next (typography and spacing tokens)
- Phase 10 collapse mechanics remain untouched — data-collapsed, transition-[width], useSidebarCollapsed hook all verified passing

---
*Phase: 16-design-overhaul*
*Completed: 2026-05-04*
