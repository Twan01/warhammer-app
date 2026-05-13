# Phase 64: Applied Recipe Integrations - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-13
**Phase:** 64-applied-recipe-integrations
**Areas discussed:** Log Session bridge, Progress source, Display density, Multiple assignments
**Mode:** --auto (all decisions auto-selected)

---

## Log Session → Step Completion Bridge

| Option | Description | Selected |
|--------|-------------|----------|
| Auto-mark + auto-create assignment | When logging a session with a step, auto-complete it in applied recipe; create assignment if missing | ✓ |
| Auto-mark only existing assignments | Only mark step completed if assignment already exists | |
| No auto-bridge | Keep log sessions and applied recipes independent | |

**User's choice:** [auto] Auto-mark + auto-create assignment (recommended default)
**Notes:** Maximizes integration value. Prevents "I logged it but it didn't count" confusion. Follows LogSessionSheet's existing partial-failure pattern for secondary actions.

---

## Kanban/CurrentFocus Progress Source

| Option | Description | Selected |
|--------|-------------|----------|
| Applied recipe when available, fallback to workflowPosition | Progressive enhancement — no breaking change for unassigned units | ✓ |
| Always show applied recipe (hide workflowPosition) | Requires assignment for any progress display | |
| Show both side by side | More information but more visual clutter | |

**User's choice:** [auto] Progressive enhancement with fallback (recommended default)
**Notes:** Units without assignments keep existing behavior. Applied recipe progress supersedes workflowPosition only when an assignment exists.

---

## Display Density on Cards

| Option | Description | Selected |
|--------|-------------|----------|
| Recipe name + completion fraction | "Ultramarine Blue 8/12 steps" — minimal layout change, reuses recipe name slot | ✓ |
| Separate progress bar for recipe | Adds a second progress bar below painting_percentage | |
| Badge overlay on recipe name | Compact but potentially hard to read | |

**User's choice:** [auto] Recipe name + completion fraction (recommended default)
**Notes:** Reuses existing recipeName prop slot. painting_percentage bar remains unchanged (separate concern).

---

## Multiple Assignments Handling

| Option | Description | Selected |
|--------|-------------|----------|
| Most recently updated + "+N more" | Matches existing CurrentFocusCard extraRecipeCount pattern | ✓ |
| Show all as a stacked list | More complete but heavier on card layout | |
| User-pinned primary assignment | Requires new UI for pinning — out of scope | |

**User's choice:** [auto] Most recently updated + "+N more" (recommended default)
**Notes:** Extends the existing recipeName + extraRecipeCount prop pattern in CurrentFocusCard.

---

## Claude's Discretion

- Batch vs. per-unit assignment fetching for Kanban (performance trade-off)
- Visual treatment of progress text (badge vs plain text vs inline)
- Whether to show small progress bar alongside text fraction
- Loading states for assignment data
- Cache invalidation strategy after auto-completion

## Deferred Ideas

None — discussion stayed within phase scope.
