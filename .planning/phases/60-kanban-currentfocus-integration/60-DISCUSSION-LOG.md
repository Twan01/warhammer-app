# Phase 60: Kanban & CurrentFocus Integration - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-12
**Phase:** 60-kanban-currentfocus-integration
**Areas discussed:** Workflow Position Logic, Display Format, Data Fetching Strategy, Graceful Degradation
**Mode:** --auto (all decisions auto-selected)

---

## Workflow Position Logic

| Option | Description | Selected |
|--------|-------------|----------|
| Last session step derives position | Find section containing last logged step, compute indices | [auto] |
| Explicit completion tracking | Track section/step completion state separately | |
| Session count heuristic | Count sessions per section to estimate progress | |

**Auto-selected:** Last session step derives position (recommended default — matches success criterion PROJ-03: "derived implicitly from last logged session step")
**Notes:** Pure function `computeWorkflowPosition` takes last step ID, sections, and steps. Returns position object or null.

---

## Display Format

| Option | Description | Selected |
|--------|-------------|----------|
| Compact inline | "SectionName: StepName — step N/M" | [auto] |
| Badge-based | Section type badge + step progress bar | |
| Separate lines | Section on one line, step on another | |

**Auto-selected:** Compact inline (recommended default — matches success criterion PROJ-02 example: "Armour: Layer Highlight — step 4/12")
**Notes:** KanbanCard uses abbreviated format; CurrentFocusCard uses full format with technique.

---

## Data Fetching Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Page-level batch with Map | One query per data type, build Map, prop-drill | [auto] |
| Per-card hooks | Each card fetches its own workflow data | |
| Context provider | WorkflowPositionProvider wraps page | |

**Auto-selected:** Page-level batch with Map (recommended default — matches established useKanbanEnrichment and useLatestUnitPhotos patterns, prevents N+1)
**Notes:** New `useWorkflowPositions(unitIds)` hook follows identical architecture.

---

## Graceful Degradation

| Option | Description | Selected |
|--------|-------------|----------|
| Preserve existing fallbacks | Workflow context additive, never removes current display | [auto] |
| Replace hints with workflow | Workflow replaces getNextActionHint entirely | |
| Progressive enhancement | Show workflow when partial data available | |

**Auto-selected:** Preserve existing fallbacks (recommended default — matches success criterion PROJ-05: "degrade gracefully... showing existing fallback hints")
**Notes:** Four degradation tiers: no recipe → status hint; recipe no sessions → recipe name; sessions no sections → step only; full → section + step.

---

## Claude's Discretion

- Internal data structures for Map value type
- File location for `computeWorkflowPosition` utility
- Exact Tailwind classes for workflow display
- Whether to show section progress alongside step progress
- Query optimization decisions

## Deferred Ideas

None — discussion stayed within phase scope.
