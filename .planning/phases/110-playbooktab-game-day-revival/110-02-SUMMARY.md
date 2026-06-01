---
phase: 110-playbooktab-game-day-revival
plan: "02"
subsystem: units / game-day / army-lists
tags: [weapon-table, game-day, opg-keys, playbook-tab, army-list-summary]
dependency_graph:
  requires: []
  provides: [shared-weapon-table, game-day-weapons-section, stable-opg-keys, canonical-stat-fallback, canonical-role-distribution]
  affects: [PlaybookDatasheet, UnitAbilityCard, PlaybookTab, ArmyListSummaryBar]
tech_stack:
  added: []
  patterns: [shared-component-extraction, canonical-data-fallback, stable-composite-keys]
key_files:
  created:
    - src/features/units/WeaponTable.tsx
  modified:
    - src/features/units/PlaybookDatasheet.tsx
    - src/features/game-day/UnitAbilityCard.tsx
    - src/features/units/PlaybookTab.tsx
    - src/features/army-lists/ArmyListSummaryBar.tsx
    - tests/collection/PlaybookTab.test.tsx
    - tests/lib/computeUnitWarnings.test.ts
decisions:
  - WeaponTable extracted as named export — enables reuse across PlaybookDatasheet and UnitAbilityCard without prop drilling
  - OPG key uses unit_id:ability_name (single colon, name only) — stable across re-imports since AUTOINCREMENT IDs reassign
  - statValue fallback fires only when local === null AND hasDatasheetLink — preserves user-entered values (D-02)
  - Role distribution computed from udb_role (canonical) not tactical_role (user-assigned) — informational only, not a warning
metrics:
  duration: ~25 minutes
  completed: "2026-06-01"
  tasks_total: 3
  tasks_completed: 3
  files_modified: 7
---

# Phase 110 Plan 02: WeaponTable Extract, Game Day Weapons, OPG Key Fix & Role Distribution Summary

Extracted WeaponTable as a shared component, added collapsible weapon profiles to Game Day cards, fixed OPG key format for stable localStorage state across DB re-imports, added canonical stat fallback to PlaybookTab, and added role distribution summary to the army list summary bar.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Extract WeaponTable and update PlaybookDatasheet import | 7a36522 | WeaponTable.tsx (new), PlaybookDatasheet.tsx, computeUnitWarnings.test.ts |
| 2 | Game Day weapons section, OPG key fix, PlaybookTab audit | 3a4295a, ddb4846 | UnitAbilityCard.tsx, PlaybookTab.tsx, PlaybookTab.test.tsx |
| 3 | Role distribution summary in ArmyListSummaryBar | 27b86cd | ArmyListSummaryBar.tsx |

## What Was Built

**Task 1 — Shared WeaponTable component:**
`src/features/units/WeaponTable.tsx` exports a named `WeaponTable` function accepting `{ weapons: UdbWeapon[]; statLabel: "BS" | "WS" }`. `PlaybookDatasheet.tsx` now imports it instead of defining it locally. `UdbWeapon` import removed from `PlaybookDatasheet.tsx` since it moved to `WeaponTable.tsx`.

**Task 2 — Game Day weapons section and fixes:**
- `UnitAbilityCard.tsx`: imports `WeaponTable`; adds a `<Collapsible defaultOpen={false}>` weapons section between OPG abilities and regular abilities; uses `h-3 w-3` ChevronDown (smaller than outer card trigger) for visual hierarchy
- OPG key changed from `${unit.unit_id}::${ability.id ?? ability.name}` to `${unit.unit_id}:${ability.name}` — single colon, name only, stable across re-imports
- `hasWeapons` computed and included in empty-state guard
- `PlaybookTab.tsx`: `statValue()` now falls back to `importedStatValue(key)` when local is `null` and `hasDatasheetLink` is true — canonical stats shown automatically for linked units

**Task 3 — Canonical role distribution:**
`ArmyListSummaryBar.tsx`: `canonicalRoleCounts` useMemo counts `udb_role` values from all units. Renders as `text-xs text-muted-foreground` line: "Roles: 2 Battleline, 1 Character, ..." sorted by count descending. Only renders when `canonicalRoleCounts.size > 0`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed pre-existing TS errors in computeUnitWarnings.test.ts**
- **Found during:** Task 1 build verification
- **Issue:** Battleline test cases passed `{ udb_role, unit_id }` objects but `computeListWarnings` signature added `udb_unit_id` and `udb_keywords` to the Pick in phase 110-01, leaving 7 tests with TS2345 errors
- **Fix:** Added `udb_unit_id: null, udb_keywords: null` to all affected simple test unit objects
- **Files modified:** tests/lib/computeUnitWarnings.test.ts
- **Commit:** 7a36522

**2. [Rule 1 - Bug] Fixed PlaybookTab.test.tsx G-5 test after statValue fallback**
- **Found during:** Task 2 test verification
- **Issue:** G-5 test used `getByText("3+")` which failed after statValue fallback made canonical Sv stat visible alongside the weapon skill (both display as "3+")
- **Fix:** Changed to `getAllByText("3+").length >= 1` with explanatory comment
- **Files modified:** tests/collection/PlaybookTab.test.tsx
- **Commit:** ddb4846

## Pre-existing Test Failures (Out of Scope)

12 test files were already failing before this plan's changes. These are deferred to `deferred-items.md`:
- Encoding issues: `SpendingPage.test.tsx`, `WishlistPage.test.tsx`, `StepFocalView.test.tsx`, `sectionedTimeline.test.tsx`, `recipeStepRow.test.tsx`, `useJournalSessions.test.tsx`
- TDD RED (intentional): `udbCollectionLink.test.ts` (labeled "Plan 02 Task 1 — RED until then")
- Pre-existing logic: `armyListQueries.test.ts`, `LeaderAttachmentSheet.test.tsx`, `GoalsPage.test.tsx`, `completeStepWithSession.test.ts`, `recentActivityQuery.test.ts`

## Known Stubs

None — all data sources are wired to canonical SQLite queries.

## Self-Check: PASSED

- WeaponTable.tsx exists at `src/features/units/WeaponTable.tsx`
- PlaybookDatasheet.tsx imports from `@/features/units/WeaponTable`
- UnitAbilityCard.tsx contains `defaultOpen={false}` and `unit_id}:${ability.name}`
- PlaybookTab.tsx statValue falls back to importedStatValue
- ArmyListSummaryBar.tsx contains `canonicalRoleCounts` useMemo
- All 4 task commits exist: 7a36522, 3a4295a, 27b86cd, ddb4846
- `pnpm build` passes with no TypeScript errors
