---
phase: 134-no-dead-ends
plan: "02"
subsystem: units/datasheet
tags: [hon-04, dead-ends, faction-link, browse-all, tdd]
dependency_graph:
  requires: [134-01]
  provides: [CollectionFactionLinkDialog, DatasheetPicker-browse-all, PlaybookStats-no-disabled-gate]
  affects: [PlaybookTab, PlaybookStats, DatasheetPicker]
tech_stack:
  added: []
  patterns: [FactionLinkDialog-inverted-direction, useUdbSearch-browse-all, disabled-gate-removal]
key_files:
  created:
    - src/features/units/CollectionFactionLinkDialog.tsx
    - tests/units/PlaybookStatsLinkUnit.test.tsx
    - tests/units/CollectionFactionLinkDialog.test.tsx
    - tests/units/DatasheetPicker.test.tsx
  modified:
    - src/features/units/PlaybookStats.tsx
    - src/features/units/PlaybookTab.tsx
    - src/features/units/DatasheetPicker.tsx
    - tests/collection/PlaybookTab.test.tsx
decisions:
  - "UDB faction ids are STRING not Number — onConfirm(wahapediaFactionId: string) with no Number() conversion"
  - "isBrowseAll keyed on factionId === undefined; useUdbSearch reused (no new query)"
  - "wahapediaFactionId prop kept in PlaybookStats interface but aliased _wahapediaFactionId to satisfy noUnusedParameters"
  - "FACTIONS_KEY invalidation cascade relied upon — no manual extra invalidation added"
metrics:
  duration: "~30 minutes"
  completed: "2026-06-17"
  tasks_completed: 3
  files_changed: 8
---

# Phase 134 Plan 02: HON-04 Link Unit Dead End Removal Summary

**One-liner:** Removed the permanently-disabled "Link unit" button via a new CollectionFactionLinkDialog (Collection→UDB faction mapping, string ids) and a DatasheetPicker browse-all path using useUdbSearch FTS5 when factionId is undefined.

## What Was Built

### Task 1 — Wave 0 test stubs (RED)
Three test files encoding the post-implementation behavior before any implementation:
- `tests/units/PlaybookStatsLinkUnit.test.tsx` — asserts button NOT disabled with `wahapediaFactionId=null`; "Re-link unit" copy when linked
- `tests/units/CollectionFactionLinkDialog.test.tsx` — asserts `onConfirm` receives STRING id (not Number/NaN); confirm disabled until selection; "Cancel — browse all instead" button present
- `tests/units/DatasheetPicker.test.tsx` — asserts "Type at least 2 characters to search all datasheets." prompt in browse-all mode; `useUdbSearch` engaged when `factionId=undefined`

### Task 2 — New CollectionFactionLinkDialog + DatasheetPicker browse-all path (GREEN)
- **`CollectionFactionLinkDialog.tsx`** (~70 lines): mirrors `FactionLinkDialog` but Collection→UDB direction. Props: `udbFactions: UdbFaction[]`, `onConfirm: (wahapediaFactionId: string) => void`. `handleConfirm` guards on `selectedId` truthy and calls `onConfirm(selectedId)` — no `Number()` conversion. Cancel button copy: "Cancel — browse all instead".
- **`DatasheetPicker.tsx`** browse-all branch: `const isBrowseAll = factionId === undefined;` + dual hooks `useDatasheetsByFaction(factionId)` + `useUdbSearch(isBrowseAll ? search : "")`. Normalized into single `datasheets` array. Description conditional; empty state shows 2-char prompt when `isBrowseAll && search.trim().length < 2`.

### Task 3 — Remove disabled gate in PlaybookStats + wire PlaybookTab (GREEN)
- **`PlaybookStats.tsx`**: removed `disabled={!wahapediaFactionId}`; label now `hasDatasheetLink ? "Re-link unit" : "Link unit"`. Prop aliased to `_wahapediaFactionId` in destructuring to satisfy `noUnusedParameters` while keeping the interface stable.
- **`PlaybookTab.tsx`**: added `factionLinkOpen` state, `updateFaction = useUpdateFaction()`, `udbFactions = useWahapediaFactions()`. `handlePickerOpen()` routes: mapped faction → `setPickerOpen(true)`, unmapped → `setFactionLinkOpen(true)`. `handleFactionLinkConfirm(wahapediaFactionId)` persists via `updateFaction.mutateAsync({ id, wahapedia_faction_id })`, then opens picker + success toast. Cancel-path: `onOpenChange(false)` → `setPickerOpen(true)` → browse-all DatasheetPicker.
- **`tests/collection/PlaybookTab.test.tsx`** (existing): added `useUpdateFaction`, `useWahapediaFactions`, and `CollectionFactionLinkDialog` stubs to mocks.

## Interaction Flows Implemented

- **Path A (already mapped):** click "Link unit"/"Re-link unit" → `handlePickerOpen` → `setPickerOpen(true)` (existing)
- **Path B (unmapped, maps then links):** click "Link unit" → dialog opens → select canonical army → "Link & open datasheets" → `updateFaction.mutateAsync` → success toast → scoped DatasheetPicker opens
- **Path C (unmapped, skips mapping):** click "Link unit" → dialog opens → "Cancel — browse all instead" → browse-all DatasheetPicker opens with 2-char prompt

No path ends in a permanently-disabled button.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] UdbMeta fixture missing required fields in test**
- **Found during:** Task 2 — `pnpm build` TS check
- **Issue:** `PlaybookStatsLinkUnit.test.tsx` used `last_synced_at` which does not exist on `UdbMeta` interface; correct fields are `built_at`, `game_system`, `faction_count`
- **Fix:** Updated mock fixture to match the actual `UdbMeta` interface
- **Files modified:** `tests/units/PlaybookStatsLinkUnit.test.tsx`
- **Commit:** 20bfdbe9

**2. [Rule 1 - Bug] CollectionFactionLinkDialog test: unused `user` variable**
- **Found during:** Task 2 — `pnpm build` TS check
- **Issue:** `const user = userEvent.setup()` was declared but not used in the `isPending` test case
- **Fix:** Removed `const user` from that test (converted to synchronous)
- **Files modified:** `tests/units/CollectionFactionLinkDialog.test.tsx`
- **Commit:** 20bfdbe9

**3. [Rule 1 - Bug] wahapediaFactionId prop unused in PlaybookStats after gate removal**
- **Found during:** Task 3 — `pnpm build` TS strict `noUnusedParameters`
- **Issue:** Removing `disabled={!wahapediaFactionId}` left the destructured `wahapediaFactionId` unused
- **Fix:** Aliased to `_wahapediaFactionId` in destructuring — prop interface unchanged so callers unaffected
- **Files modified:** `src/features/units/PlaybookStats.tsx`
- **Commit:** a6771f94

**4. [Rule 1 - Bug] Existing PlaybookTab.test.tsx broke after PlaybookTab added new imports**
- **Found during:** Task 3 — test run
- **Issue:** `PlaybookTab.tsx` now imports `useUpdateFaction`, `useWahapediaFactions`, and `CollectionFactionLinkDialog` — none were mocked in the existing test
- **Fix:** Added three mock stubs to `tests/collection/PlaybookTab.test.tsx`
- **Files modified:** `tests/collection/PlaybookTab.test.tsx`
- **Commit:** a6771f94

## Known Stubs

None. All data paths are wired. The browse-all DatasheetPicker returns live results from `useUdbSearch` FTS5. The faction-link persists a real DB write via `updateFaction`.

## Threat Flags

No new network endpoints, auth paths, or trust boundaries introduced. The only write (`updateFaction` setting `wahapedia_faction_id`) uses the existing COALESCE-guarded parameterized query. Browse-all uses the existing `useUdbSearch` which sanitizes FTS5 input and gates at >=2 chars.

## Self-Check

### Files created/modified exist
- `src/features/units/CollectionFactionLinkDialog.tsx` — FOUND
- `src/features/units/PlaybookStats.tsx` — FOUND
- `src/features/units/PlaybookTab.tsx` — FOUND
- `src/features/units/DatasheetPicker.tsx` — FOUND
- `tests/units/PlaybookStatsLinkUnit.test.tsx` — FOUND
- `tests/units/CollectionFactionLinkDialog.test.tsx` — FOUND
- `tests/units/DatasheetPicker.test.tsx` — FOUND

### Commits exist
- b3148110 — test(134-02): Wave-0 HON-04 test stubs (RED) — FOUND
- 20bfdbe9 — feat(134-02): CollectionFactionLinkDialog + DatasheetPicker browse-all path — FOUND
- a6771f94 — feat(134-02): remove disabled gate + wire faction-link flow in PlaybookTab — FOUND

## Self-Check: PASSED
