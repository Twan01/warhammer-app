---
slug: necron-warriors-delete-error
status: resolved
trigger: Deleting a Necron Warriors unit from the collection shows "something went wrong" error
created: 2026-06-14
updated: 2026-06-14
---

# Debug: Necron Warriors unit delete shows "something went wrong"

## Symptoms
- Expected: the unit is deleted from the collection, no error
- Actual: a "something went wrong" error toast appears; delete fails
- Error message: generic "something went wrong" (no specifics surfaced to user)
- Scope: deleting ANY Necron Warriors unit fails (both/all copies, not just the duplicate)
- Generality: unknown whether other unit types are affected
- Timeline: unknown — user unsure whether it ever worked

## Notes / Distinction from prior sessions
- This is DISTINCT from `collection-delete-freeze` (resolved) and `collection-unit-delete-freeze`
  (awaiting_human_verify), which were UI-FREEZE symptoms (Radix dialog cleanup / handleCloseDelete
  race). This session is an ERROR TOAST on delete — likely a thrown error at the DB/query layer
  (e.g. FK violation from a child row referencing the unit, or a query error), caught and shown
  as a toast.

## Current Focus

reasoning_checkpoint:
  hypothesis: "deleteUnit() runs a bare DELETE FROM units. The army_list_units.unit_id FK is ON DELETE RESTRICT (not CASCADE). When a unit (e.g. Necron Warriors) is referenced by an army_list_units row, SQLite rejects the DELETE with 'FOREIGN KEY constraint failed', which UnitDeleteDialog.handleConfirm catches and shows as 'Something went wrong.'"
  confirming_evidence:
    - "001_core_schema.sql:119 — army_list_units.unit_id INTEGER NOT NULL REFERENCES units(id) ON DELETE RESTRICT"
    - "031_army_list_v3.sql:24 — recreated army_list_units keeps unit_id ... REFERENCES units(id) ON DELETE RESTRICT"
    - "deleteUnit (units.ts:147-151) runs only 'DELETE FROM units WHERE id=$1' with no prior army_list_units cleanup"
    - "UnitDeleteDialog.tsx:35-36 comment INCORRECTLY claims 'DB cascade handles army_list_units cleanup automatically (ON DELETE CASCADE)' — the schema is RESTRICT, so the cascade it relies on does not exist"
    - "No code path deletes army_list_units rows by unit_id before deleting the unit; getArmyListsByUnitId is read-only"
    - "client.ts runs PRAGMA foreign_keys = ON, so RESTRICT is enforced"
  falsification_test: "If a Necron Warriors unit that is NOT in any army list also failed to delete, FK-RESTRICT would be ruled out. Symptom says membership matches: units in lists fail."
  fix_rationale: "Delete army_list_units rows referencing the unit inside deleteUnit() before deleting the unit (single transaction effect via sequential execute). This matches the documented intended behavior ('Deleting it will also remove it from those lists') and works on existing DBs without a migration. All other unit FKs are already ON DELETE CASCADE so they clean up automatically; army_list_units RESTRICT is the only blocker."
  blind_spots: "Have not run the live app to print the exact error string. The fix relies on army_list_units being the ONLY RESTRICT FK to units — confirmed via grep (only two definitions, both army_list_units)."

## Evidence

- timestamp: 2026-06-14
  checked: "FK references to units table across all migrations (grep 'REFERENCES units')"
  found: "Only army_list_units.unit_id uses ON DELETE RESTRICT (001_core_schema.sql:119 and 031_army_list_v3.sql:24). All other children (painting_sessions, unit_point_tiers, unit_loadouts, unit_overrides, unit_strategy_notes, unit_recipe_assignments, unit_rules_mapping) use ON DELETE CASCADE; battle_logs/painting_projects use ON DELETE SET NULL."
  implication: "army_list_units RESTRICT is the only constraint that can block a unit DELETE. A unit in an army list cannot be deleted by the current bare DELETE."

- timestamp: 2026-06-14
  checked: "deleteUnit query (src/db/queries/units.ts:147-151) and useDeleteUnit hook"
  found: "deleteUnit runs only 'DELETE FROM units WHERE id=$1'. No army_list_units cleanup. Hook comment line 95 even notes 'FK errors (unit in army_list_units) reject — handled by component try/catch with toast'."
  implication: "The error path is known and intended to surface as a toast, but the toast is generic 'something went wrong' — and there is no cleanup to actually allow the delete."

- timestamp: 2026-06-14
  checked: "UnitDeleteDialog.tsx handleConfirm and its FK comment"
  found: "Lines 35-36 claim 'DB cascade handles army_list_units cleanup automatically (ON DELETE CASCADE in 001_core_schema.sql)'. This is FALSE — schema is RESTRICT. handleConfirm calls deleteUnit.mutateAsync then catches any error into toast.error('Something went wrong.'). The 'Delete Anyway' button therefore always fails for units in lists."
  implication: "Root cause confirmed: the component relies on a non-existent CASCADE. Fix = explicitly remove army_list_units rows for the unit before deleting it."

## Eliminated

## Resolution

root_cause: "deleteUnit() runs a bare 'DELETE FROM units' but army_list_units.unit_id is ON DELETE RESTRICT (not CASCADE as the UnitDeleteDialog comment wrongly assumes). With PRAGMA foreign_keys = ON, deleting a unit that is in any army list (e.g. Necron Warriors) is rejected with 'FOREIGN KEY constraint failed', caught by handleConfirm and shown as the generic 'Something went wrong.' toast."
fix: "In deleteUnit() (src/db/queries/units.ts), explicitly DELETE the referencing army_list_units rows (DELETE FROM army_list_units WHERE unit_id = $1) BEFORE the DELETE FROM units, using the existing $1 parameterized style. army_list_units is the only ON DELETE RESTRICT child of units; all other children (painting_sessions, unit_point_tiers, unit_loadouts, unit_overrides, unit_strategy_notes, unit_recipe_assignments, unit_rules_mapping) are ON DELETE CASCADE and clean up automatically, and enhancements on the removed army_list_units rows also CASCADE. No migration required — works on existing DBs. Also corrected the misleading comment in src/features/units/UnitDeleteDialog.tsx (lines 35-37) that wrongly claimed ON DELETE CASCADE; it now states the FK is ON DELETE RESTRICT and that deleteUnit() removes the rows explicitly."
verification: "pnpm test — full suite green: 2699 passed, 6 skipped, 38 todo (302 files), including tests/army-list/UnitDeleteDialog.test.tsx (normal + warning states) and tests/foundation/useUnits.test.ts. pnpm build — TypeScript check passed and Vite build succeeded (built in 1m 19s, no type errors). The fix is minimal and targeted: it deletes only the blocking RESTRICT rows before the unit, matching the dialog's documented promise ('Deleting it will also remove it from those lists'). Awaiting user confirmation that deleting a Necron Warriors unit in the live app now succeeds without the error toast."
files_changed:
  - "src/db/queries/units.ts (deleteUnit: delete army_list_units rows by unit_id before deleting the unit)"
  - "src/features/units/UnitDeleteDialog.tsx (corrected FK comment: ON DELETE RESTRICT, not CASCADE)"
