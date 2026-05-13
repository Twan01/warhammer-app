# Phase 70: Non-Destructive Recipe Save - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-13
**Phase:** 70-non-destructive-recipe-save
**Areas discussed:** DB ID tracking, Diff algorithm, Update queries, Order index handling, Section-to-step relationships, Atomicity, duplicateRecipe isolation
**Mode:** `--auto` (all areas auto-selected, recommended defaults chosen)

---

## DB ID Tracking in Form State

| Option | Description | Selected |
|--------|-------------|----------|
| Add `dbId: number \| null` to DraftStep and DraftSection | Carry DB row ID through form state; null = new, number = existing | ✓ |
| Use a separate Map<localId, dbId> | Keep types unchanged, maintain a side-channel mapping | |
| Match by content (name + order_index) | Heuristic matching without explicit ID tracking | |

**Auto-selected:** `dbId` field on draft types (recommended default — simplest, most explicit, matches STATE.md guidance about dbId tracking requirement)

---

## Diff Algorithm

| Option | Description | Selected |
|--------|-------------|----------|
| Set-difference on dbId | Present+in-draft=UPDATE, present+not-in-draft=DELETE, null=INSERT | ✓ |
| Deep equality comparison | Compare all fields to detect changes, only update truly different rows | |
| Timestamp-based | Track last-modified timestamps to detect stale items | |

**Auto-selected:** Set-difference on dbId (recommended default — straightforward, no false negatives, deterministic)

---

## Update Queries

| Option | Description | Selected |
|--------|-------------|----------|
| Add `updateRecipeStep` with full-row update | New function covering all 13 mutable columns, matching updateRecipeSection pattern | ✓ |
| Field-level UPDATE (only changed columns) | Build dynamic SQL based on which fields differ | |

**Auto-selected:** Full-row update (recommended default — simpler, matches existing patterns, negligible performance difference for small rows)

---

## Order Index Handling

| Option | Description | Selected |
|--------|-------------|----------|
| Always write order_index for all surviving items | Update even unchanged items to reflect current position | ✓ |
| Only update order_index for moved items | Detect which items changed position, skip unchanged | |

**Auto-selected:** Always write (recommended default — simpler, avoids stale indices, matches reorderRecipeSections pattern)

---

## Atomicity & Error Handling

| Option | Description | Selected |
|--------|-------------|----------|
| No transaction wrapper, match existing pattern | Individual operations, toast on failure, user retries | ✓ |
| Implement optimistic rollback | Track operations, reverse on failure | |

**Auto-selected:** No transaction wrapper (recommended default — consistent with codebase, Tauri plugin-sql JS bridge limitation)

---

## duplicateRecipe Isolation

| Option | Description | Selected |
|--------|-------------|----------|
| No changes needed | Duplicate creates fresh IDs by design, unaffected by non-destructive save | ✓ |
| Add guard to prevent accidental diff logic | Explicit bypass flag to ensure duplication path is never affected | |

**Auto-selected:** No changes (recommended default — duplication flow is independent by design)

---

## Claude's Discretion

- Whether to extract diff logic into pure utility functions or keep inline in onSubmit
- Whether to add updateRecipeStep alongside existing functions in recipePaints.ts or in a separate file
- Whether to batch or sequentially execute delete/update/insert operations
- Edge case handling for steps moved between sections when the source section is deleted
