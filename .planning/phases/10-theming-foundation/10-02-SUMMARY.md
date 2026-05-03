---
phase: 10-theming-foundation
plan: "02"
subsystem: ui
tags: [tailwind, faction-accent, theming, components, vitest, testing-library]

# Dependency graph
requires:
  - phase: 10-01
    provides: --faction-accent CSS token + bg-faction-accent Tailwind utility

provides:
  - button.tsx default variant uses bg-faction-accent (shifts with active faction)
  - NavItem active link uses bg-faction-accent/text-white instead of bg-accent
  - FactionSummaryCard accepts optional isActive/onActivate props; shows ring + Active badge
  - 5 real FactionSummaryCard tests replacing Wave 0 stubs
  - 3 real NavItem tests replacing Wave 0 stubs

affects: [10-03, 11-dashboard-command-center, DashboardPage wiring]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "ESM-compatible vi.mock pattern — factory function returning object, no require()"
    - "Optional props with defaults pattern — isActive?=false, onActivate?=()=>{} keeps callers backward-compatible"
    - "Toggle click pattern — active card calls onActivate+return; inactive calls onActivate+navigate"

key-files:
  created:
    - tests/theming/FactionSummaryCard.test.tsx
    - tests/theming/NavItem.test.tsx
  modified:
    - src/components/ui/button.tsx
    - src/components/common/NavItem.tsx
    - src/features/dashboard/FactionSummaryCard.tsx

key-decisions:
  - "FactionSummaryCard isActive/onActivate props are optional with defaults so DashboardPage compiles before Plan 10-03 wires them"
  - "NavItem uses bg-faction-accent via CSS cascade only — no useActiveFaction context import needed in NavItem"
  - "FactionStat mock in tests uses complete Faction type (icon_path, created_at, updated_at) — plan mock was missing fields; auto-corrected"

patterns-established:
  - "ESM vi.mock: vi.mock('@tanstack/react-router', () => ({ useNavigate: () => mockNavigate })) — no require()"
  - "Theming call sites: all accent color references use bg-faction-accent utility, never hardcoded hex"

requirements-completed: [THEME-01, THEME-03, UI-03]

# Metrics
duration: 15min
completed: 2026-05-02
---

# Phase 10 Plan 02: Call Site Updates — Button, NavItem, FactionSummaryCard Summary

**Three call sites migrated to bg-faction-accent utility and Wave 0 stubs replaced with 8 real component tests covering active state, click behavior, and keyboard navigation**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-05-02T10:48:00Z
- **Completed:** 2026-05-02T10:54:00Z
- **Tasks:** 4
- **Files modified:** 5

## Accomplishments
- button.tsx default variant now uses bg-faction-accent/text-white (faction color shifts primary buttons)
- NavItem active link class changed from bg-accent/text-accent-foreground to bg-faction-accent/text-white
- FactionSummaryCard rewritten with optional isActive/onActivate props, ring-2 ring-faction-accent, and Active badge
- 8 real tests replacing Wave 0 it.skip stubs (5 FactionSummaryCard, 3 NavItem); full suite at 201 passing

## Task Commits

Each task was committed atomically:

1. **Task 1: Update button.tsx default variant to bg-faction-accent** - `621fa85` (feat)
2. **Task 2: Update NavItem active state to bg-faction-accent** - `ad4bbdf` (feat)
3. **Task 3: Update FactionSummaryCard with optional isActive prop, ring, Active badge** - `39cf334` (feat)
4. **Task 4: Replace FactionSummaryCard and NavItem Wave 0 stubs with real tests** - `d5a405f` (test)

## Files Created/Modified
- `src/components/ui/button.tsx` - Default variant: bg-primary -> bg-faction-accent/text-white
- `src/components/common/NavItem.tsx` - Active class: bg-accent/text-accent-foreground -> bg-faction-accent/text-white
- `src/features/dashboard/FactionSummaryCard.tsx` - Added isActive/onActivate optional props, ring, Active badge, toggle click
- `tests/theming/FactionSummaryCard.test.tsx` - 5 real tests (was it.skip stubs)
- `tests/theming/NavItem.test.tsx` - 3 real tests (was it.skip stubs)

## Decisions Made
- FactionSummaryCard isActive/onActivate props are optional with defaults so DashboardPage compiles before Plan 10-03 wires them
- NavItem uses bg-faction-accent via CSS cascade only — no useActiveFaction context import needed in NavItem itself
- FactionStat mock in tests uses complete Faction type with icon_path, created_at, updated_at (plan mock was missing fields)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Complete Faction type in test mock**
- **Found during:** Task 4 (Replace Wave 0 stubs with real tests)
- **Issue:** Plan's FactionStat mock only included id/name/color_theme/game_system/description, but Faction type requires icon_path, created_at, updated_at — TypeScript would have rejected incomplete mock
- **Fix:** Added icon_path: null, created_at/updated_at timestamps to mockStat.faction in FactionSummaryCard.test.tsx
- **Files modified:** tests/theming/FactionSummaryCard.test.tsx
- **Verification:** pnpm tsc --noEmit exits 0; 5 tests pass
- **Committed in:** d5a405f (Task 4 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - type completeness)
**Impact on plan:** Necessary for TypeScript correctness. No scope creep.

## Issues Encountered
None — implementation was straightforward. Plan's provided code matched the actual file structures exactly.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All three call sites consume bg-faction-accent utility correctly
- FactionSummaryCard isActive/onActivate props ready for DashboardPage wiring in Plan 10-03
- AppSidebar Wave 0 stubs (3 tests) remain skipped — addressed in Plan 10-03
- Plan 10-03 can wire ActiveFactionContext into DashboardPage and AppSidebar without any prop interface changes

---
*Phase: 10-theming-foundation*
*Completed: 2026-05-02*
