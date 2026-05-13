# Phase 67: Game Day Integration - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-13
**Phase:** 67-Game Day Integration
**Areas discussed:** Warning placement, Data display approach, Per-unit warning visibility
**Mode:** --auto (all decisions auto-resolved)

---

## Warning Placement

| Option | Description | Selected |
|--------|-------------|----------|
| Pre-game summary section between header and tabs | At-a-glance health before gameplay, separate from in-game tabs | ✓ |
| New "Overview" tab alongside Stratagems/Units/Checklist | Dedicated tab for validation data | |
| Embedded in header area below CP tracker | Compact but may crowd the header | |

**Auto-selected:** Pre-game summary section between header and tabs (recommended default)
**Rationale:** CP tracker is in-game state; validation is pre-game concern. Separate section keeps concerns clear and is always visible without tab switch.

---

## Data Display Approach

| Option | Description | Selected |
|--------|-------------|----------|
| New GameDayReadinessPanel calling computeListHealthStats | Focused on actionable pre-game info, no list-management concerns | ✓ |
| Reuse ArmyListSummaryBar directly | Zero code but includes edit affordances and not-ready list style that doesn't fit Game Day | |
| Thin wrapper around ArmyListSummaryBar with hidden sections | Less code but awkward prop overrides | |

**Auto-selected:** New GameDayReadinessPanel (recommended default)
**Rationale:** ArmyListSummaryBar serves list-management context. Game Day needs a focused pre-game view. Same pure function, different presentation.

---

## Per-Unit Warning Visibility

| Option | Description | Selected |
|--------|-------------|----------|
| Aggregate summary with collapsible detail | Warning counts at top, expandable unit list for specifics | ✓ |
| Aggregate summary only (no per-unit breakdown) | Minimal but user can't see which specific units have issues | |
| Full per-unit warning list always visible | Comprehensive but may overwhelm the pre-game view | |

**Auto-selected:** Aggregate summary with collapsible detail (recommended default)
**Rationale:** Game Day is quick reference. Aggregate gives at-a-glance, collapsible detail lets user drill down when needed.

---

## Claude's Discretion

- Visual layout of readiness panel (stat row arrangement)
- Collapsible mechanism (shadcn Collapsible vs toggle)
- "All clear" positive state display
- Icon choices for warning indicators
- Role coverage pills layout (wrap vs scroll)

## Deferred Ideas

None — discussion stayed within phase scope
