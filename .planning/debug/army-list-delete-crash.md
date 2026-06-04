---
status: resolved
trigger: "Tried to delete an army list, got 'something went wrong' error, then app crashed"
created: 2026-05-22
updated: 2026-05-22
---

## Symptoms

- **Expected:** Confirmation dialog appears, army list deletes, returns to list page
- **Actual:** "Something went wrong" error, then app crashes
- **Error message:** "something went wrong" (generic toast/error)
- **Timeline:** Unknown if it ever worked
- **Reproduction:** Attempted delete on an army list, unsure if specific to one list

## Current Focus

- hypothesis: resolved
- test: null
- expecting: null
- next_action: none
- reasoning_checkpoint: null

## Evidence

- timestamp: 2026-05-22 — Static analysis of full delete chain
  - ArmyListDeleteDialog.tsx: catch block swallows error without console.error (same anti-pattern as faction-creation-fails)
  - deleteArmyList SQL: relied on CASCADE alone, but army_list_units has self-referencing FK (leader_attached_to_id REFERENCES army_list_units(id) ON DELETE SET NULL) that can cause constraint errors during cascaded deletes depending on row deletion order
  - Migration 032 (army_list_snapshots) was NOT registered in lib.rs get_migrations(), causing the table to not be created on fresh installs
  - db-helpers.ts test helper also missing migration 032 in HOBBYFORGE_MIGRATIONS array

## Eliminated

## Resolution

- root_cause: Two compounding issues — (1) deleteArmyList relied solely on CASCADE but the self-referencing FK on army_list_units.leader_attached_to_id can cause FK constraint errors when SQLite deletes rows in an order where a referenced row is deleted before the SET NULL fires on the referencing row. (2) The catch block in ArmyListDeleteDialog swallowed errors without console.error logging, making the actual SQL error invisible. Additionally, migration 032 (army_list_snapshots) was missing from lib.rs registration.
- fix: (1) Changed deleteArmyList to explicitly delete children in dependency order: enhancements, snapshots, clear leader_attached_to_id self-refs, units, then the list itself. (2) Added console.error logging to ArmyListDeleteDialog catch block. (3) Registered migration 032 in lib.rs and db-helpers.ts.
- verification: TypeScript compiles clean, all army list query tests pass (12/12), migration parity tests pass (4/4)
- files_changed: src/db/queries/armyLists.ts, src/features/army-lists/ArmyListDeleteDialog.tsx, src-tauri/src/lib.rs, tests/foundation/armyListQueries.test.ts, tests/data-layer/db-helpers.ts
