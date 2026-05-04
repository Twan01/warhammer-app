---
phase: 15-warhammer-40k-datasheet-and-rules-integration
plan: "05"
subsystem: ui
tags: [react, tanstack-query, radix-ui, collapsible, wahapedia, datasheet, playbook]

# Dependency graph
requires:
  - phase: 15-warhammer-40k-datasheet-and-rules-integration
    provides: "Plans 15-01..04 — DB schema, query module, hooks, DatasheetPicker, DatasheetImportDialog, useRulesSync"

provides:
  - "PlaybookTab fully integrated with Wahapedia datasheet sections: sync banner, import controls, Datasheet Abilities collapsible (Core/Faction/Unit), Sources list, multi-profile note"
  - "DS-11 Personal Ability Notes textarea label rename (previously 'Abilities')"
  - "DS-04 auto-picker trigger on first mount when no link + all 6 stats null + syncMeta exists"
  - "DS-06/08 conflict-routing chain: PlaybookTab → UnitDetailSheet → CollectionPage sibling DatasheetImportDialog"
  - "resolveWahapediaFactionIdByName + useWahapediaFactionId for cross-DB faction-name → wahapedia-id lookup"
  - "4 new test describe blocks (DS-09/10/11/12) extending existing Phase 9 PlaybookTab.test.tsx"

affects:
  - "15-06 manual smoke-test plan verifies the visual result of this plan"
  - "Phase 16 design overhaul will touch PlaybookTab styling"

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "onDatasheetConflict callback chain: PlaybookTab → UnitDetailSheet → CollectionPage (same pattern as JOUR-05 onPhotoClick)"
    - "pendingImportResolution prop chain: CollectionPage → UnitDetailSheet → PlaybookTab (inverse of conflict chain)"
    - "coerceStatToNumber: strip non-digits from Wahapedia TEXT stat values (e.g. '6\"', '3+') to INTEGER for unit_strategy_notes"
    - "Dynamic import() for getFullDatasheet inside handlePickerSelect to avoid top-level dependency cycle"

key-files:
  created: []
  modified:
    - src/db/queries/datasheets.ts
    - src/hooks/useDatasheet.ts
    - src/features/units/PlaybookTab.tsx
    - src/features/units/UnitDetailSheet.tsx
    - src/features/units/CollectionPage.tsx
    - tests/collection/PlaybookTab.test.tsx

key-decisions:
  - "DatasheetPicker mounted inside PlaybookTab (not CollectionPage) — no portal nesting issue since picker and conflict dialog are mutually exclusive user flows"
  - "DatasheetImportDialog must be at CollectionPage level (sibling portal) — it can open immediately after picker closes, so nesting in Sheet would break Radix portals"
  - "coerceStatToNumber helper defined inline in PlaybookTab — not extracted to separate file (too small, tightly coupled)"
  - "DS-11 label change from 'Abilities' to 'Personal Ability Notes' required updating 4 existing Phase 9 tests that used /Abilities/ regex (which does not match 'Personal Ability Notes' since 'Ability' != 'Abilities')"

patterns-established:
  - "Three-level prop forwarding: CollectionPage owns state, UnitDetailSheet forwards, PlaybookTab consumes/raises"

requirements-completed: [DS-02, DS-03, DS-05, DS-06, DS-07, DS-08, DS-09, DS-10, DS-11, DS-12]

# Metrics
duration: 40min
completed: 2026-05-04
---

# Phase 15 Plan 05: PlaybookTab Datasheet Integration Summary

**PlaybookTab restructured with Wahapedia integration: sync banner, collapsible Datasheet Abilities (Core/Faction/Unit), Sources list, multi-profile note, conflict-routing chain through UnitDetailSheet to CollectionPage sibling dialog**

## Performance

- **Duration:** ~40 min
- **Started:** 2026-05-04T09:05:00Z
- **Completed:** 2026-05-04T09:45:00Z
- **Tasks:** 4 (Tasks 1, 2, 3, 4)
- **Files modified:** 6

## Accomplishments

- Extended `datasheets.ts` + `useDatasheet.ts` with `resolveWahapediaFactionIdByName` + `useWahapediaFactionId` (DS-04 cross-DB faction-name lookup cached with staleTime Infinity)
- Restructured PlaybookTab JSX from 2-section layout to 8-section layout per UI-SPEC: Stats (with sync banner + import controls) → Datasheet Abilities collapsible → Sources list → Personal Ability Notes → Keywords → 8 strategy fields → Save
- Wired 3-level conflict-routing prop chain (PlaybookTab → UnitDetailSheet → CollectionPage) with DatasheetImportDialog mounted as sibling portal
- Extended PlaybookTab.test.tsx with 6 new tests (DS-09 collapsible, DS-09 hidden when empty, DS-10 sources, DS-11 label rename, DS-12 multi-profile shows, DS-12 multi-profile hidden); all 20 tests pass

## Task Commits

1. **Task 1: resolveWahapediaFactionIdByName + useWahapediaFactionId** - `e7125eb` (feat)
2. **Task 2: PlaybookTab restructure** - `8dbfc70` (feat)
3. **Task 4: Test extensions (committed before Task 3 to unblock Task 2 verification)** - `1335d30` (test)
4. **Task 3: CollectionPage + UnitDetailSheet sibling portal wiring** - `bf70519` (feat)

## Files Created/Modified

- `src/db/queries/datasheets.ts` — Added `resolveWahapediaFactionIdByName` (case-insensitive rw_factions lookup)
- `src/hooks/useDatasheet.ts` — Added `WAHAPEDIA_FACTION_KEY` + `useWahapediaFactionId` hook; extended import block
- `src/features/units/PlaybookTab.tsx` — Full restructure: 3 new optional props, 6 new hooks, 4 helpers, new JSX layout, AbilityEntry sub-component
- `src/features/units/UnitDetailSheet.tsx` — 3 new optional props forwarded to PlaybookTab
- `src/features/units/CollectionPage.tsx` — DatasheetImportDialog sibling portal, conflictPayload + pendingResolution state
- `tests/collection/PlaybookTab.test.tsx` — 6 new vi.mock declarations + 4 new describe blocks (6 new tests) + 4 existing tests updated for DS-11 label rename

## Decisions Made

- **DatasheetPicker location:** Mounted inside PlaybookTab (not CollectionPage) — the picker uses its own Radix portal that detaches from the tab DOM tree, so there is no nesting issue. The conflict dialog MUST be at CollectionPage because it can open immediately after the picker closes.
- **DS-11 test update:** The plan assumed `/Abilities/` regex would still match "Personal Ability Notes" (because "Abilities" is a substring of "Datasheet Abilities"). However, "Abilities" is NOT a substring of "Personal Ability Notes" (it's "Ability" not "Abilities"). Four existing Phase 9 tests were updated to use `/Personal Ability Notes/` — this is a correct test maintenance fix, not a scope change.
- **coerceStatToNumber helper:** Defined inline in PlaybookTab — too small and tightly coupled to warrant its own file.
- **Dynamic import of getFullDatasheet:** Used `await import("@/db/queries/datasheets")` inside handlePickerSelect to keep the call deterministic and avoid any circular dependency concerns.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Existing Phase 9 tests used `/Abilities/` regex which no longer matches "Personal Ability Notes"**
- **Found during:** Task 2 verification
- **Issue:** The plan assumed `/Abilities/` (with plural 's') would match "Personal Ability Notes" via substring. "Personal Ability Notes" contains "Ability" not "Abilities" — the regex failed.
- **Fix:** Updated 4 occurrences of `getByLabelText(/Abilities/)` to `getByLabelText(/Personal Ability Notes/)` in the existing Phase 9 test describe blocks.
- **Files modified:** `tests/collection/PlaybookTab.test.tsx`
- **Verification:** All 20 tests pass after the update.
- **Committed in:** `1335d30` (test commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - Bug)
**Impact on plan:** Necessary correctness fix. No scope creep.

## Issues Encountered

- Pre-existing TypeScript errors in unrelated files (`FactionSheet.tsx`, `PaintSheet.tsx`, `UnitSheet.tsx`, and 8 test files) from Phase 17 schema migration (`lore_notes`, `undercoat`, `purchase_date` fields). These are out-of-scope and were present before this plan. The files modified in this plan are TypeScript-clean.
- Pre-existing test failures in `tests/lib/dates.test.ts`, `tests/army-list/ArmyListsPage.test.tsx`, `tests/painting/RecipeTable.test.tsx` — confirmed by running the test suite before and after this plan's changes.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 15-06 (manual smoke-test UAT) can now proceed — all 12 DS requirements have either automated test coverage or are covered by the smoke test plan
- All UI-SPEC §Layout Diagram sections are implemented in PlaybookTab
- Conflict routing chain is complete and ready for end-to-end testing

## Self-Check

Files exist:
- [x] `src/db/queries/datasheets.ts` — contains `resolveWahapediaFactionIdByName`
- [x] `src/hooks/useDatasheet.ts` — contains `useWahapediaFactionId`
- [x] `src/features/units/PlaybookTab.tsx` — contains `Datasheet Abilities`, `Personal Ability Notes`, `Sources`
- [x] `src/features/units/CollectionPage.tsx` — contains `DatasheetImportDialog`
- [x] `src/features/units/UnitDetailSheet.tsx` — contains `onDatasheetConflict?:`
- [x] `tests/collection/PlaybookTab.test.tsx` — contains all 4 new describe blocks

Commits exist:
- [x] `e7125eb` — feat(15-05): add resolveWahapediaFactionIdByName + useWahapediaFactionId
- [x] `8dbfc70` — feat(15-05): restructure PlaybookTab with datasheet integration sections
- [x] `1335d30` — test(15-05): extend PlaybookTab tests with DS-09/10/11/12 describe blocks
- [x] `bf70519` — feat(15-05): mount DatasheetImportDialog as sibling portal + route conflict payload

## Self-Check: PASSED

---
*Phase: 15-warhammer-40k-datasheet-and-rules-integration*
*Completed: 2026-05-04*
