# Phase 127: Visual Consistency & PageHeader Unification - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-11
**Phase:** 127-Visual Consistency & PageHeader Unification
**Areas discussed:** Status dot token mapping, Section heading audit scope, Empty state icon-pill pattern, Spacing normalization approach
**Mode:** --auto (all decisions auto-selected)

---

## Status Dot Token Mapping (VIS-06)

| Option | Description | Selected |
|--------|-------------|----------|
| Tailwind utility classes | Replace hex with bg-green-500, bg-amber-500, bg-red-500 | ✓ |
| CSS custom properties | Define --status-complete, --status-wip, --status-todo tokens | |

**Auto-selected:** Tailwind utility classes (recommended default)
**Notes:** Standard status colors, only 2 components affected, no need for custom CSS variables

---

## Section Heading Audit Scope (VIS-03)

| Option | Description | Selected |
|--------|-------------|----------|
| Standardize inline | Match Dashboard's existing pattern across 4 pages | ✓ |
| Extract SectionHeading component | Create shared component for section headings | |

**Auto-selected:** Standardize inline to match Dashboard pattern (recommended default)
**Notes:** Only 4 pages to audit, pattern is a simple `<p>` with classes — component extraction would be overkill

---

## Empty State Icon-Pill Pattern (VIS-05)

| Option | Description | Selected |
|--------|-------------|----------|
| Match verbatim inline | Copy FactionsEmptyState pattern directly | ✓ |
| Extract shared EmptyStateIcon wrapper | Create reusable wrapper component | |

**Auto-selected:** Match verbatim inline (recommended default)
**Notes:** Phase 126 D-12 principle: prefer inline, extract at 3+ uses

---

## Spacing Normalization (VIS-04, VIS-09)

| Option | Description | Selected |
|--------|-------------|----------|
| Separate commits per requirement | One commit per VIS requirement for clean review | ✓ |
| Batch all spacing fixes | Single commit for VIS-04 + VIS-09 | |

**Auto-selected:** Separate commits per requirement (recommended default)
**Notes:** Each requirement independently verifiable, separate commits aid review

---

## Claude's Discretion

- Exact subtitle text for PageHeaders (Rules Hub, Unit Database, Factions)
- Additional button icon sizing inconsistencies beyond Dashboard
- Commit ordering within logical groups

## Deferred Ideas

None — discussion stayed within phase scope.
