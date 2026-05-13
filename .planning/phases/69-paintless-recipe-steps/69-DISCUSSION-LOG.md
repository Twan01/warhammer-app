# Phase 69: Paintless Recipe Steps - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-13
**Phase:** 69-paintless-recipe-steps
**Areas discussed:** Schema Migration, Guard Removal & Save Path, Type Updates, Availability Exclusion Logic
**Mode:** --auto (all decisions auto-selected)

---

## Schema Migration

| Option | Description | Selected |
|--------|-------------|----------|
| Table-rebuild migration | CREATE new table with nullable paint_id, copy data, drop old, rename | ✓ |
| ALTER COLUMN (not possible) | SQLite does not support ALTER COLUMN — not viable | |

**User's choice:** [auto] Table-rebuild migration (only viable approach)
**Notes:** `paint_id` defined as `NOT NULL` in 001_core_schema.sql. SQLite requires full table rebuild to change nullability. Must preserve all columns from migrations 012, 013, 014, 018 and the FK from painting_sessions.

---

## Guard Removal & Save Path

| Option | Description | Selected |
|--------|-------------|----------|
| Remove guard, pass null | Remove `if (s.paint_id !== null)` at RecipeFormSheet.tsx:292, let null flow to INSERT | ✓ |
| Keep guard, add separate INSERT | Keep existing path for painted steps, add second INSERT for paintless | |

**User's choice:** [auto] Remove guard, pass null (simpler, single code path)
**Notes:** The addRecipePaint INSERT already binds paint_id as a parameter — once schema allows null, it works.

---

## Type Updates

| Option | Description | Selected |
|--------|-------------|----------|
| Update RecipeStep.paint_id to number or null | Match the nullable schema, align with DraftStep | ✓ |
| Keep as number, cast at boundary | Maintain non-null type, handle null at read/write boundaries | |

**User's choice:** [auto] Update type to `number | null` (consistent with schema and DraftStep)
**Notes:** DraftStep already uses `number | null`. Aligning RecipeStep removes the type mismatch.

---

## Availability Exclusion Logic

| Option | Description | Selected |
|--------|-------------|----------|
| Step counts include all, availability excludes paintless | COUNT(*) for totals, WHERE paint_id IS NOT NULL for availability | ✓ |
| Both counts exclude paintless | Only count painted steps everywhere | |

**User's choice:** [auto] Step counts include all steps (recommended — reflects recipe complexity)
**Notes:** Availability queries already have `WHERE rs.paint_id IS NOT NULL AND rs.paint_id != 0`. Step count query uses `COUNT(*)` with no filter. Both are already correct.

---

## Claude's Discretion

- Visual treatment of paintless steps in timeline (no-paint indicator vs. omitting swatch area)
- FK pragma handling during table-rebuild migration
- Index preservation on rebuilt table

## Deferred Ideas

None.
