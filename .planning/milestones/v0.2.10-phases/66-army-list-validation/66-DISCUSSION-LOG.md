# Phase 66: Army List Validation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-13
**Phase:** 66-Army List Validation
**Areas discussed:** Warning System Design, Tactical Role Tags Schema, Role Coverage Visualization, Health Summary Panel Layout
**Mode:** --auto (all decisions auto-selected)

---

## Warning System Design

### Surface pattern

| Option | Description | Selected |
|--------|-------------|----------|
| Both inline + consolidated | Inline icons per unit row + warning count in health panel | ✓ |
| Inline only | Per-unit icons, no aggregate view | |
| Banner only | Single consolidated warning banner at top | |

**Auto-selected:** Both — matches existing ArmyListSummaryBar pattern of showing per-unit details and aggregate stats
**Rationale:** Users need both the at-a-glance count and the ability to identify which specific units have issues

### Severity levels

| Option | Description | Selected |
|--------|-------------|----------|
| Two levels (hard/soft) | Hard = can't play as-is; Soft = informational | ✓ |
| Single level | All warnings equal weight | |
| Three levels (error/warn/info) | Granular severity tiers | |

**Auto-selected:** Two levels — keeps the UX simple while distinguishing actionable blockers from prep tasks

---

## Tactical Role Tags Schema

### Storage location

| Option | Description | Selected |
|--------|-------------|----------|
| On army_list_units (join) | Role varies by list context — same unit can have different roles per list | ✓ |
| On units (global) | Role is a permanent unit attribute | |

**Auto-selected:** Join table — consistent with points_override and notes pattern, allows context-dependent roles

### Tag design

| Option | Description | Selected |
|--------|-------------|----------|
| Fixed enum | Predefined set (7 roles), dropdown selection, enables aggregation | ✓ |
| User-defined | Free text tags, flexible but can't aggregate reliably | |

**Auto-selected:** Fixed enum — enables coverage analysis and visual indicators without fuzzy matching

---

## Role Coverage Visualization

### Display format

| Option | Description | Selected |
|--------|-------------|----------|
| Horizontal indicators | Label + unit count per role, compact scannable layout | ✓ |
| Bar chart | Formal chart component | |
| Tag cloud | Sized tags based on count | |

**Auto-selected:** Horizontal indicators — compact, consistent with dashboard card aesthetic

### Gap definition

| Option | Description | Selected |
|--------|-------------|----------|
| Binary (0 vs 1+) | Gap = zero units, Covered = any units; no minimums | ✓ |
| Threshold-based | Recommended minimums per role | |

**Auto-selected:** Binary — avoids opinionated meta decisions about composition; user decides what matters

---

## Health Summary Panel Layout

### Component approach

| Option | Description | Selected |
|--------|-------------|----------|
| Extend ArmyListSummaryBar | Add stats to existing component, keep everything consolidated | ✓ |
| Separate panel | New component alongside SummaryBar | |
| Replace SummaryBar | New component replacing the old one | |

**Auto-selected:** Extend — summary bar already shows points + readiness; adding more stats keeps health in one place

### Points exceeded display

| Option | Description | Selected |
|--------|-------------|----------|
| Color-coded X/Y format | Points turn red when exceeded, show total/limit | ✓ |
| Separate warning banner | Points total unchanged, banner warns about excess | |

**Auto-selected:** Color-coded — activates existing points_limit column with clear visual feedback

---

## Claude's Discretion

- Icon choices for warning indicators
- Visual treatment of role coverage indicators
- Warning count badge tooltip content
- Loading/skeleton states
- Stat ordering in health panel
- Tactical role dropdown placement (inline vs edit flow)

## Deferred Ideas

None — all discussion stayed within phase scope
