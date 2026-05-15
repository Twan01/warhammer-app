# Phase 75: Transactional Recipe Graph Save - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-14
**Phase:** 75-Transactional Recipe Graph Save
**Areas discussed:** Transaction Boundary, Error Handling & Rollback, Create vs Edit Path, Mutation Hook Architecture
**Mode:** --auto (all decisions auto-selected)

---

## Transaction Boundary

| Option | Description | Selected |
|--------|-------------|----------|
| New query-layer function | `saveRecipeGraph()` in `src/db/queries/recipes.ts` wraps the entire diff in BEGIN/COMMIT | ✓ |
| Component-level transaction | Wrap onSubmit's existing calls in BEGIN/COMMIT inline | |

**User's choice:** [auto] New query-layer function (recommended default)
**Notes:** Follows established pattern from `duplicateRecipe()` and `reorderRecipeSections()`. Keeps transaction logic in the query layer, not the UI component.

---

## Error Handling & Rollback

| Option | Description | Selected |
|--------|-------------|----------|
| Toast + form stays open | Catch at component level, toast notification, form retains data for retry | ✓ |
| Toast + form closes | Catch and close form, user must reopen | |

**User's choice:** [auto] Toast + form stays open (recommended default)
**Notes:** Existing behavior already catches errors and shows toasts. Rollback means no data corruption, so keeping form open is safe and user-friendly.

---

## Create vs Edit Path

| Option | Description | Selected |
|--------|-------------|----------|
| Both paths transactional | Single `saveRecipeGraph()` handles create and edit | ✓ |
| Edit path only | Only wrap the edit/diff path in a transaction | |

**User's choice:** [auto] Both paths transactional (recommended default)
**Notes:** Create path also inserts recipe + sections + steps sequentially. Both should be atomic for consistency.

---

## Mutation Hook Architecture

| Option | Description | Selected |
|--------|-------------|----------|
| Single save function for form | Form calls `saveRecipeGraph()` directly; individual hooks stay for other callers | ✓ |
| Replace all hooks | Consolidate all section/step mutations into one hook | |

**User's choice:** [auto] Single save function for form (recommended default)
**Notes:** Individual CRUD hooks remain for section reorder, drag-drop, and other non-form operations. Only the form save path changes.

---

## Claude's Discretion

- Function signature details and parameter naming
- Internal SQL statement ordering within the transaction
- Whether to extract shared SQL between create and edit paths
- React Query invalidation key list

## Deferred Ideas

None — discussion stayed within phase scope
