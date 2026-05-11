---
phase: 54-army-lists-2-0-detachment-selection
plan: "02"
subsystem: ui
tags: [react, rules-hub, army-lists, detachment, stratagems, favorites, reminders]

# Dependency graph
requires:
  - phase: 54-army-lists-2-0-detachment-selection
    provides: DetachmentPicker, StaleDataBanner, army_lists.detachment_id column, clearArmyListDetachment hook
  - phase: 53-rules-hub
    provides: StratagemCard component, useRulesExtended hooks, useRulesFavorites hook
provides:
  - DetachmentRulesSection: inline detachment ability + StratagemCard list filtered to selected detachment
  - RemindersSection: is_reminder=1 favorites with rule_type badges, hidden when empty
  - Full rules context wired into ArmyListDetailSheet
affects:
  - phase-55-army-list-export
  - phase-56-game-day

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Self-contained section components: RemindersSection owns its own hook call (no props)"
    - "Unconditional hook calls with internal enabled guards for Rules of Hooks compliance"
    - "StratagemCard direct reuse from rules-hub without modification"

key-files:
  created:
    - src/features/army-lists/DetachmentRulesSection.tsx
    - src/features/army-lists/RemindersSection.tsx
    - tests/army-list/DetachmentRulesSection.test.tsx
    - tests/army-list/RemindersSection.test.tsx
  modified:
    - src/features/army-lists/ArmyListDetailSheet.tsx

key-decisions:
  - "DetachmentRulesSection calls both hooks unconditionally — internal enabled guards satisfy Rules of Hooks (same pattern as DetachmentCard in 53-03)"
  - "RemindersSection is self-contained (no props) — fetches all favorites and filters to is_reminder=1 internally"
  - "Ability display is inline/expanded (not collapsible) — locked decision from CONTEXT.md"
  - "Separator added between rules sections and Units toolbar for visual separation"

patterns-established:
  - "Inline ability card pattern: rounded-lg border bg-card p-4 with font-medium name + muted description"
  - "RULE_TYPE_LABELS constant for human-readable badge labels (stratagem -> Stratagem, etc.)"

requirements-completed: [ARMY-02, ARMY-03, ARMY-05]

# Metrics
duration: 12min
completed: 2026-05-11
---

# Phase 54 Plan 02: DetachmentRulesSection and RemindersSection Summary

**Inline detachment ability + filtered StratagemCard list + is_reminder favorites wired into ArmyListDetailSheet, completing Phase 54 scope**

## Performance

- **Duration:** 12 min
- **Started:** 2026-05-11T08:52:00Z
- **Completed:** 2026-05-11T09:04:00Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- DetachmentRulesSection renders detachment ability inline (non-collapsible) and reuses StratagemCard from rules-hub
- RemindersSection shows is_reminder=1 favorites with rule_type badges; hidden entirely when no reminders exist
- ArmyListDetailSheet now shows full rules context: picker -> banner -> abilities -> stratagems -> reminders -> units
- 9 new tests covering empty states, loading skeletons, ability display, stratagem cards, and reminder filtering

## Task Commits

Each task was committed atomically:

1. **Task 1: Create DetachmentRulesSection and RemindersSection components with tests** - `2faf3cc` (feat)
2. **Task 2: Wire DetachmentRulesSection and RemindersSection into ArmyListDetailSheet** - `199109f` (feat)

**Plan metadata:** _(to be committed)_

## Files Created/Modified
- `src/features/army-lists/DetachmentRulesSection.tsx` - Detachment ability display + StratagemCard list with empty states and loading skeletons
- `src/features/army-lists/RemindersSection.tsx` - Self-contained reminders panel from is_reminder=1 favorites with rule_type badges
- `src/features/army-lists/ArmyListDetailSheet.tsx` - Added imports and JSX for both new sections + separator
- `tests/army-list/DetachmentRulesSection.test.tsx` - 5 tests: null state, abilities, stratagems, no-data state, loading
- `tests/army-list/RemindersSection.test.tsx` - 4 tests: empty renders null, header shown, badge labels, is_reminder=0 filtered out

## Decisions Made
- DetachmentRulesSection calls both hooks unconditionally — internal `enabled` guards satisfy Rules of Hooks (consistent with DetachmentCard pattern from 53-03)
- RemindersSection is self-contained with no props — it fetches all favorites and filters client-side (no extra query param needed)
- Ability display stays inline/expanded (not collapsible) — locked CONTEXT.md decision maintained

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 54 scope fully complete: ARMY-01 (DetachmentPicker), ARMY-02 (ability display), ARMY-03 (filtered stratagems), ARMY-05 (reminders)
- Phase 55 (Army List Export) can proceed — ArmyListDetailSheet now carries detachment_id context
- Phase 56 (Game Day) can proceed — RemindersSection pattern established for game-session use

---
*Phase: 54-army-lists-2-0-detachment-selection*
*Completed: 2026-05-11*
