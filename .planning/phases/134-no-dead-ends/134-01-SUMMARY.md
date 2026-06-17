---
phase: 134-no-dead-ends
plan: "01"
subsystem: rules-hub
tags: [hon-03, stub-removal, rules-hub, shared-abilities, tdd]
dependency_graph:
  requires: []
  provides: [HON-03-shared-abilities-live]
  affects: [rules-hub]
tech_stack:
  added: []
  patterns: [stub-to-real-hook-swap, toRwAbility-adapter, two-state-empty-message]
key_files:
  created:
    - tests/rules-hub/RulesHubSharedAbilities.test.tsx
  modified:
    - src/features/rules-hub/RulesHubPage.tsx
    - tests/navigation/rulesUnitCrossLinks.test.tsx
decisions:
  - "Removed useSharedAbilitiesByFaction stub; replaced with useDetachmentAbilities(selectedFactionId ?? null) — the existing hook backed by getDetachmentAbilitiesByFaction"
  - "toRwAbility adapter maps UdbDetachmentAbilityWithDetachment to RwAbility shape by setting legend = detachment_name"
  - "Two-state empty message: searchText truthy -> search-filtered message; empty -> no-data message"
metrics:
  duration: "~20 minutes"
  completed: "2026-06-17"
  tasks_completed: 2
  files_changed: 3
---

# Phase 134 Plan 01: HON-03 — Shared Abilities Tab De-stubbing Summary

**One-liner:** Replaced the always-empty `useSharedAbilitiesByFaction` stub in `RulesHubPage.tsx` with the existing `useDetachmentAbilities` hook plus a `toRwAbility` adapter, adding honest two-state empty messages; strict TS build green.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Wave 0 — RulesHubSharedAbilities test stub (RED) | 5adb2ed4 | tests/rules-hub/RulesHubSharedAbilities.test.tsx |
| 2 | Swap stub for useDetachmentAbilities + adapter + empty states (GREEN) | 4ec33ffa | src/features/rules-hub/RulesHubPage.tsx, tests/navigation/rulesUnitCrossLinks.test.tsx, tests/rules-hub/RulesHubSharedAbilities.test.tsx |

## What Was Built

**HON-03 stub removal:**

- Deleted the local `useSharedAbilitiesByFaction` function that always returned `[]` with a comment "shared abilities are out of Phase 120 scope — stub retained"
- Added `useDetachmentAbilities` to the `@/hooks/useGameData` import
- Added type imports: `UdbDetachmentAbilityWithDetachment` from `@/types/gameData` and `RwAbility` from `@/types/datasheet`
- Added `toRwAbility(a: UdbDetachmentAbilityWithDetachment): RwAbility` adapter at module scope, mapping `legend: a.detachment_name`
- Replaced stub call with `useDetachmentAbilities(selectedFactionId ?? null)` capturing `rawAbilities` and `sharedAbilitiesLoading`
- Added `const sharedAbilities = rawAbilities.map(toRwAbility)` — feeding the existing `filteredAbilities` useMemo unchanged
- Updated the Shared Abilities empty state from a single string to the two-state form: `searchText` truthy → "No shared abilities match your search." / else → "No shared abilities for this faction in the canonical database."
- Loading skeleton was already in place and unchanged (3× `Skeleton h-[80px] w-full rounded-lg`)
- Favorites/notes wiring (`a.id + ':shared_ability'`) unchanged

**Test infrastructure:**

- Created `tests/rules-hub/RulesHubSharedAbilities.test.tsx` with 3 HON-03 test cases covering real data render, no-data empty state, and search-filtered empty state
- Fixed `tests/navigation/rulesUnitCrossLinks.test.tsx` mock for `@/hooks/useGameData` to include `useDetachmentAbilities` (Rule 1: auto-fix caused by our hook import change)

## Verification Results

- `pnpm test -- tests/rules-hub/RulesHubSharedAbilities.test.tsx` — 3/3 HON-03 tests GREEN
- `pnpm test -- tests/rules-hub tests/navigation/rulesUnitCrossLinks.test.tsx` — 300 passed, 6 skipped, 0 failed
- `pnpm build` — TypeScript strict check + Vite build exit 0; no unused stub/import/branch remains (HON-02-style proof)
- Grep for `useSharedAbilitiesByFaction` in `src/` returns no matches

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed missing useDetachmentAbilities in rulesUnitCrossLinks.test.tsx mock**
- **Found during:** Task 2 verification
- **Issue:** `tests/navigation/rulesUnitCrossLinks.test.tsx` mocked `@/hooks/useGameData` with only `useStratagemsByFaction` and `useDetachmentsByFaction`. After our change to import `useDetachmentAbilities` in `RulesHubPage.tsx`, this test started failing with "No useDetachmentAbilities export defined on the @/hooks/useGameData mock"
- **Fix:** Added `useDetachmentAbilities: vi.fn(() => ({ data: [], isLoading: false }))` to the mock
- **Files modified:** tests/navigation/rulesUnitCrossLinks.test.tsx
- **Commit:** 4ec33ffa

## Known Stubs

None — this plan's purpose was to remove the stub. No new stubs introduced.

## Threat Surface Scan

No new network endpoints, auth paths, or schema changes introduced. This plan is a read-only display change using an existing faction-scoped query (`getDetachmentAbilitiesByFaction`) that already uses `$1` parameterization. No new threat surface.

## Self-Check: PASSED

- [x] `tests/rules-hub/RulesHubSharedAbilities.test.tsx` exists: FOUND
- [x] `src/features/rules-hub/RulesHubPage.tsx` modified: FOUND (contains `useDetachmentAbilities`)
- [x] Commit 5adb2ed4 exists: FOUND (test(134-01): add failing HON-03 tests)
- [x] Commit 4ec33ffa exists: FOUND (feat(134-01): wire Shared Abilities tab)
- [x] `useSharedAbilitiesByFaction` not in src/: CONFIRMED (grep returns no matches)
- [x] `pnpm build` green: CONFIRMED (exit 0)
