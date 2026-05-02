---
phase: 09-unit-playbook
plan: "01"
subsystem: ui
tags: [react, tanstack-query, vitest, rtl, sonner, shadcn, lucide-react]

requires:
  - phase: 09-00
    provides: Wave 0 test stubs (it.skip placeholders) and useStrategyNote/useUpsertStrategyNote hooks from Phase 6

provides:
  - "PlaybookTab.tsx: self-contained Playbook tab component (stats block + abilities + keywords + 8 strategy notes + Save)"
  - "PlaybookTab.test.tsx: 14 real tests covering STRAT-01..05 via mocked strategyNotes queries"

affects:
  - 09-02-UnitDetailSheet-tabs-integration
  - 09-03-manual-verification

tech-stack:
  added: []
  patterns:
    - "initialRef snapshot for dirty detection without React Hook Form"
    - "formatStatValue() display-only suffix logic (M=\", Sv/Ld/OC=+, T/W=raw)"
    - "Empty-string-vs-null round-trip coercion on save payload (field || null)"
    - "vi.mock(@/db/queries/strategyNotes) pattern mirrors StatusPopover.test.tsx"
    - "renderInsideTabs() Tabs harness proves STRAT-01 without full UnitDetailSheet"

key-files:
  created:
    - src/features/units/PlaybookTab.tsx
    - (rewrite) tests/collection/PlaybookTab.test.tsx
  modified: []

key-decisions:
  - "Raw <textarea> used instead of shadcn Textarea (which does not exist in this project)"
  - "Dirty detection uses useRef snapshot + useMemo, not React Hook Form or Zod"
  - "findByText() used in suffix test instead of findByRole() to handle async data load timing"
  - "STRAT-01 verified via Tabs harness directly; full UnitDetailSheet integration deferred to 09-02"

patterns-established:
  - "Stat cell format: flex-1 flex flex-col items-center min-h-[44px] with label above value"
  - "Strategy note textarea: rows=2 with TEXTAREA_CLASS from PaintSheet.tsx verbatim"
  - "Save button lives inside tab scroll area (not SheetFooter) — disabled={!isDirty || isLoading || upsert.isPending}"

requirements-completed:
  - STRAT-01
  - STRAT-02
  - STRAT-03
  - STRAT-04
  - STRAT-05

duration: 6min
completed: 2026-05-02
---

# Phase 9 Plan 01: PlaybookTab Component + Real Tests Summary

**PlaybookTab self-contained component (363 lines) with stat display/edit modes, Abilities textarea, Keywords input, 8 strategy note fields in fixed order, and inline Save with sonner toasts — backed by 14 passing RTL tests covering STRAT-01..05**

## Performance

- **Duration:** ~6 min
- **Started:** 2026-05-02T07:36:30Z
- **Completed:** 2026-05-02T07:42:07Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Created `src/features/units/PlaybookTab.tsx` (363 lines) — fully self-contained with no React Hook Form, no Zod, no shadcn Textarea
- Replaced all 14 `it.skip()` stubs in `tests/collection/PlaybookTab.test.tsx` with real assertions
- All 171 tests pass (22 test files) — no regression in foundation/collection/painting/dashboard suites
- TypeScript clean (only pre-existing migration004 unrelated errors)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create PlaybookTab component** - `3dd387a` (feat)
2. **Task 2: Replace test stubs with real bodies** - `33bf409` (feat)

**Plan metadata:** (final commit below)

## Files Created/Modified
- `src/features/units/PlaybookTab.tsx` - Self-contained Playbook tab component with stats block (display+edit), Abilities, Keywords, 8 strategy note textareas, dirty-state Save
- `tests/collection/PlaybookTab.test.tsx` - 14 real tests covering STRAT-01..05 via mocked @/db/queries/strategyNotes

## Decisions Made
- Raw `<textarea>` with PaintSheet.tsx className verbatim — no shadcn Textarea component exists in this project
- `initialRef` useRef snapshot pattern for dirty detection avoids React Hook Form dependency
- `findByText()` async wait used in the suffix display test to handle async TanStack Query data load timing (vs `getByText()` which was synchronously failing before data resolved)
- STRAT-01 (Playbook tab in UnitDetailSheet) covered via standalone Tabs harness — full UnitDetailSheet integration deferred to Plan 09-02

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed async timing in suffix display test**
- **Found during:** Task 2 (test execution)
- **Issue:** `screen.getByText('6"')` was called synchronously after `await screen.findByRole("button", { name: /Save Playbook/ })`. The Save button renders immediately (before TanStack Query resolves), so `getByText` was called before the mock data loaded into component state.
- **Fix:** Changed to `await screen.findByText('6"')` which waits for the element to appear in the DOM after the async hook resolves.
- **Files modified:** tests/collection/PlaybookTab.test.tsx
- **Verification:** Full test suite passes (171/171)
- **Committed in:** 33bf409 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - timing bug in test)
**Impact on plan:** Necessary for correctness. Test was wrong, not component. No scope creep.

## Issues Encountered
None beyond the test timing fix documented above.

## Next Phase Readiness
- `PlaybookTab` is ready to be mounted inside `UnitDetailSheet` tabs — Plan 09-02 wires it into the `<TabsContent value="playbook">` slot
- No blockers. Component API: `<PlaybookTab unitId={number} />`

---
*Phase: 09-unit-playbook*
*Completed: 2026-05-02*
