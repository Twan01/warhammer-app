---
phase: 09-unit-playbook
plan: 02
subsystem: ui
tags: [react, shadcn, tabs, radix-ui, unit-detail-sheet, tauri]

# Dependency graph
requires:
  - phase: 09-01
    provides: PlaybookTab component with unitId prop
provides:
  - UnitDetailSheet with Details + Playbook tabs (STRAT-01 closed)
  - Tabs integration using shadcn Tabs/TabsList/TabsTrigger/TabsContent
affects: [09-03, collection-page]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "shadcn Tabs wrapping SheetContent scrollable body — SheetHeader/SheetFooter outside Tabs"
    - "TabsContent value='details' preserves existing Field rows byte-identical"
    - "TabsContent value='playbook' mounts PlaybookTab with unitId prop"
    - "key={unit?.id} on SheetContent resets PlaybookTab state on unit switch for free"

key-files:
  created: []
  modified:
    - src/features/units/UnitDetailSheet.tsx
    - tests/collection/PlaybookTab.test.tsx
    - tests/foundation/migration004.test.ts
    - tsconfig.json

key-decisions:
  - "SheetHeader (unit name, faction badge) and SheetFooter (Edit/Delete buttons) stay outside Tabs so they persist across tab switches"
  - "Tabs wrapper uses className='px-4' to bring TabsList inboard from SheetContent edges, matching 16px padding pattern of Details body"
  - "TabsList uses className='mt-2' for breathing room below SheetHeader"
  - "No overflow-hidden added to Tabs/TabsContent — SheetContent overflow-y-auto retained for correct scrolling"
  - "Added 'node' to tsconfig types array to resolve node:fs/node:path TS errors in migration004 test (pre-existing, not caused by this plan)"

patterns-established:
  - "Tabs wrapping pattern: SheetHeader > Tabs(TabsList + TabsContent*N) > SheetFooter"

requirements-completed: [STRAT-01]

# Metrics
duration: 8min
completed: 2026-05-02
---

# Phase 9 Plan 02: UnitDetailSheet Tabs Integration Summary

**shadcn Tabs wrapper added to UnitDetailSheet with Details + Playbook triggers, mounting PlaybookTab in second tab while preserving all existing Field rows, SheetHeader, and SheetFooter byte-identical**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-05-02T07:57:00Z
- **Completed:** 2026-05-02T08:02:33Z
- **Tasks:** 1
- **Files modified:** 4

## Accomplishments

- Wrapped UnitDetailSheet scrollable body in `<Tabs defaultValue="details" className="px-4">` with Details and Playbook triggers
- Preserved all existing Details content (Category, Painting Status/Progress, Assembly/Basing/Varnished, Active Project toggle, Points/Model/Owned Count, Purchase info, Linked Recipes, Notes) byte-identical inside `<TabsContent value="details">`
- Mounted `<PlaybookTab unitId={unit.id} />` in `<TabsContent value="playbook">` — closes STRAT-01
- SheetHeader (unit name + faction Badge) and SheetFooter (Delete Unit + Edit Unit) remain outside Tabs
- Fixed 3 pre-existing TypeScript errors blocking `pnpm tsc --noEmit` from exiting 0
- All 173 tests pass (0 regressions)

## Task Commits

1. **Task 1: Wrap UnitDetailSheet body in Tabs with Details + Playbook triggers** - `5e6f900` (feat)

## Files Created/Modified

- `src/features/units/UnitDetailSheet.tsx` — Added Tabs/TabsList/TabsTrigger/TabsContent + PlaybookTab imports; wrapped Details body in TabsContent; added Playbook TabsContent mounting PlaybookTab
- `tests/collection/PlaybookTab.test.tsx` — Removed unused `within` import (pre-existing noUnusedLocals violation)
- `tests/foundation/migration004.test.ts` — Replaced `__dirname` with `import.meta.url` + `fileURLToPath` for ESM compatibility; added `node:url` import
- `tsconfig.json` — Added `"node"` to `types` array so `node:fs`/`node:path`/`node:url` resolve in tests

## Decisions Made

- SheetHeader and SheetFooter placed outside the Tabs wrapper so unit name, faction badge, Edit Unit, and Delete Unit remain visible regardless of active tab — matches plan spec exactly
- Tabs uses `className="px-4"` to match the 16px inset pattern of the existing Details div; TabsList uses `className="mt-2"` for visual breathing room below SheetHeader
- No `overflow-hidden` or `h-full` added to Tabs/TabsContent — would break SheetContent scroll (Pitfall 5 from RESEARCH.md)
- `key={unit?.id ?? "none"}` on SheetContent preserved — forces fresh PlaybookTab mount on unit switch, resetting PlaybookTab state for free

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Removed unused `within` import in PlaybookTab.test.tsx**
- **Found during:** Task 1 verification (`pnpm tsc --noEmit`)
- **Issue:** `within` was imported but never used; tsconfig `noUnusedLocals: true` caused TS error 6133
- **Fix:** Removed `within` from the `@testing-library/react` import line
- **Files modified:** tests/collection/PlaybookTab.test.tsx
- **Verification:** `pnpm tsc --noEmit` exits 0
- **Committed in:** 5e6f900

**2. [Rule 1 - Bug] Fixed `__dirname` + `node:fs`/`node:path` TS errors in migration004.test.ts**
- **Found during:** Task 1 verification (`pnpm tsc --noEmit`)
- **Issue:** Test used CJS `__dirname` (not available in ESM) and `node:*` imports not recognized by tsconfig (no `@types/node` in types array)
- **Fix:** Replaced `__dirname` with `dirname(fileURLToPath(import.meta.url))`; added `node:url` import; added `"node"` to tsconfig `types` array
- **Files modified:** tests/foundation/migration004.test.ts, tsconfig.json
- **Verification:** `pnpm tsc --noEmit` exits 0; all 173 tests still pass
- **Committed in:** 5e6f900

---

**Total deviations:** 2 auto-fixed (2 pre-existing Rule 1 bugs blocking tsc clean exit)
**Impact on plan:** Both fixes necessary for the plan's `pnpm tsc --noEmit exits 0` acceptance criterion. No scope creep — all issues were pre-existing in Plan 09-01 output.

## Issues Encountered

None during planned work. Two pre-existing TypeScript errors from Plan 09-01 artifacts resolved as Rule 1 auto-fixes.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- STRAT-01 closed: PlaybookTab is now accessible from the Collection page via the Playbook tab in UnitDetailSheet
- Plan 09-03 (live Tauri smoke test checkpoint) is the next step — manual verification of the full sheet UX in the running app
- No blockers

---
*Phase: 09-unit-playbook*
*Completed: 2026-05-02*
