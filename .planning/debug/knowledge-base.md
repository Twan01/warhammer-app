# GSD Debug Knowledge Base

Resolved debug sessions. Used by `gsd-debugger` to surface known-pattern hypotheses at the start of new investigations.

---

## necron-warriors-delete-error — Deleting a unit that is in an army list fails with "something went wrong"
- **Date:** 2026-06-14
- **Error patterns:** delete unit, something went wrong, FOREIGN KEY constraint failed, army_list_units, ON DELETE RESTRICT, Necron Warriors, deleteUnit
- **Root cause:** deleteUnit() ran a bare DELETE FROM units, but army_list_units.unit_id is ON DELETE RESTRICT (not CASCADE as the dialog comment assumed). With PRAGMA foreign_keys = ON, deleting a unit referenced by any army list is rejected with 'FOREIGN KEY constraint failed', caught and shown as a generic toast.
- **Fix:** In deleteUnit(), explicitly DELETE FROM army_list_units WHERE unit_id = $1 before DELETE FROM units. army_list_units is the only RESTRICT child of units; all other children CASCADE/SET NULL. Also corrected the misleading UnitDeleteDialog FK comment. No migration needed.
- **Files changed:** src/db/queries/units.ts, src/features/units/UnitDeleteDialog.tsx
---
