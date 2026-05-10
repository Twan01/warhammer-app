---
phase: 52-schema-data-layer-foundation
plan: "01"
subsystem: data-layer
tags: [migration, types, army-lists, rules-favorites, rules-notes, detachment]
dependency_graph:
  requires: []
  provides:
    - migration-019-schema
    - RulesFavorite-type
    - RulesNote-type
    - ArmyList-detachment-columns
    - clearArmyListDetachment-query
    - useClearArmyListDetachment-hook
  affects:
    - src/features/army-lists/ArmyListSheet.tsx
    - src/db/queries/armyLists.ts
    - src/hooks/useArmyLists.ts
tech_stack:
  added: []
  patterns:
    - COALESCE-partial-update with separate clear function for nullable columns
    - RULE_TYPES const array for SQLite CHECK constraint parity in TypeScript
    - Denormalized detachment_name survives rules.db re-sync
key_files:
  created:
    - src-tauri/migrations/019_rules_favorites_notes.sql
    - src/types/rulesFavorite.ts
    - src/types/rulesNote.ts
  modified:
    - src/types/armyList.ts
    - src/db/queries/armyLists.ts
    - src/hooks/useArmyLists.ts
    - src/features/army-lists/ArmyListSheet.tsx
    - tests/army-list/ArmyListsPage.test.tsx
    - tests/foundation/armyListQueries.test.ts
decisions:
  - clearArmyListDetachment is separate from updateArmyList because COALESCE($7, detachment_id) cannot pass NULL through; a dedicated UPDATE with SET detachment_id = NULL is required for explicit clearing
  - detachment_name is denormalized onto army_lists so user data survives rules.db full wipe on re-sync
  - RULE_TYPES const array mirrors the SQL CHECK constraint to enforce the union type at the TypeScript level
metrics:
  duration_seconds: 160
  tasks_completed: 2
  files_created: 3
  files_modified: 7
  completed_date: "2026-05-10"
---

# Phase 52 Plan 01: Schema + Data Layer Foundation Summary

**One-liner:** SQLite migration 019 with detachment linkage on army_lists and new rules_favorites/rules_notes tables, plus full TypeScript type coverage and extended army list query/hook layer.

## What Was Built

Migration 019 adds two nullable TEXT columns (`detachment_id`, `detachment_name`) to the existing `army_lists` table and creates two new tables in `hobbyforge.db` — `rules_favorites` and `rules_notes` — both with composite `UNIQUE(rule_id, rule_type)` constraints and a `CHECK` constraint enforcing `rule_type IN ('stratagem', 'detachment_ability', 'shared_ability')`. All user data lives in `hobbyforge.db`, not `rules.db`, ensuring it survives rules re-syncs.

On the TypeScript side: `RulesFavorite` and `RulesNote` interfaces were created with matching `RULE_TYPES` const array; the `ArmyList` interface was extended with `detachment_id: string | null` and `detachment_name: string | null`. The `createArmyList` and `updateArmyList` query functions were updated to include the new columns, and a new `clearArmyListDetachment` function was added for explicit NULL-clearing. The `useClearArmyListDetachment` hook was exported from `useArmyLists.ts` with full cache invalidation symmetry.

## Tasks Completed

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Migration 019 + TypeScript types | 9ca8d8e | 019_rules_favorites_notes.sql, rulesFavorite.ts, rulesNote.ts, armyList.ts |
| 2 | Extend army list queries with detachment columns | 220df60 | armyLists.ts, useArmyLists.ts |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed TypeScript compilation errors caused by new required fields on CreateArmyListInput**
- **Found during:** Task 1 (post-build verification)
- **Issue:** Adding `detachment_id` and `detachment_name` to `ArmyList` propagated into `CreateArmyListInput` via `Omit`, making them required fields. Three call sites omitted the new fields: `ArmyListSheet.tsx` line 109, `ArmyListsPage.test.tsx` fixture, and `armyListQueries.test.ts` createArmyList call + SQL assertion.
- **Fix:** Added `detachment_id: null, detachment_name: null` to the ArmyListSheet payload; added both null fields to the test fixture; updated the test to pass the new fields and assert the updated INSERT column list.
- **Files modified:** `src/features/army-lists/ArmyListSheet.tsx`, `tests/army-list/ArmyListsPage.test.tsx`, `tests/foundation/armyListQueries.test.ts`
- **Commit:** 9ca8d8e

## Decisions Made

1. `clearArmyListDetachment` is a separate function from `updateArmyList` because `COALESCE($7, detachment_id)` cannot pass `NULL` through. When user deselects a detachment, only an explicit `SET detachment_id = NULL` achieves the desired result.

2. `detachment_name` is stored as a denormalized copy on `army_lists` so the link survives `rules.db` full deletion during re-sync. The column is updated alongside `detachment_id` whenever a detachment is selected.

3. `RULE_TYPES` const array in TypeScript mirrors the SQL `CHECK` constraint exactly, providing compile-time enforcement of the same `rule_type` values enforced at the database level.

## Self-Check: PASSED
