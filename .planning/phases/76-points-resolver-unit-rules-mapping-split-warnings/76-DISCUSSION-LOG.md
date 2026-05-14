# Phase 76: Points Resolver + Unit Rules Mapping + Split Warnings - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-14
**Phase:** 76-Points Resolver + Unit Rules Mapping + Split Warnings
**Areas discussed:** Points resolver scope, Source labeling, Unit-rules mapping UI, Warning split, COALESCE divergence
**Mode:** --auto (all decisions auto-selected)

---

## Points Resolver Function Scope

| Option | Description | Selected |
|--------|-------------|----------|
| Keep COALESCE in SQL, resolver wraps with source metadata | SQL handles fallback, JS determines source label | ✓ |
| Replace COALESCE with JS-only resolver | Fetch all sources separately, join in JS | |
| Hybrid: SQL fallback + redundant JS fallback | Double computation for safety | |

**Auto-selected:** Keep COALESCE in SQL, resolver wraps with source metadata (recommended default)
**Notes:** COALESCE chain is battle-tested in 2 army list queries. Replacing it with JS would be slower and more error-prone. Resolver adds source labeling on top.

---

## Points Source Labeling

| Option | Description | Selected |
|--------|-------------|----------|
| SQL returns individual columns, JS determines source | Add synced_points/override_points SELECT columns | ✓ |
| SQL CASE expression returns source directly | Source label computed in SQL | |
| Separate query for source detection | Additional lightweight query | |

**Auto-selected:** SQL returns individual columns, JS determines source (recommended default)
**Notes:** getArmyListWithUnits already returns unit_points and points_override. Adding sup.points and uo.points as separate columns is minimal SQL change. JS comparison is straightforward.

---

## Unit-Rules Mapping UI Pattern

| Option | Description | Selected |
|--------|-------------|----------|
| Inline indicator + Sheet for confirm/override | Badge on row, Sheet for actions | ✓ |
| Separate dedicated mapping page | Full page for all mappings at once | |
| Dialog popup per unit | Modal dialog for each unit | |

**Auto-selected:** Inline indicator + Sheet for confirm/override (recommended default)
**Notes:** Consistent with existing patterns: StatusBadge on rows, Sheet for CRUD. Matches UnitSheet, RecipeSheet interaction model.

---

## Warning Split Implementation

| Option | Description | Selected |
|--------|-------------|----------|
| Extract into separate computeListWarnings() | New function for list-level, refactor existing for unit-level | ✓ |
| Refactor computeUnitWarnings to return tagged warnings | Add level: "list" | "unit" tag to each warning | |
| Keep current structure, filter at display layer | No logic change, UI filters by type | |

**Auto-selected:** Extract into separate computeListWarnings() (recommended default)
**Notes:** Current code already has a Pitfall 4 comment acknowledging the mixed concern. Clean separation is better than tagged filtering.

---

## COALESCE Site-3 Resolution

| Option | Description | Selected |
|--------|-------------|----------|
| Align to 4-level COALESCE chain | Add synced_unit_points + unit_overrides JOINs | ✓ |
| Keep 2-level, document as intentional | Dashboard shows base points only | |
| Use resolver function in dashboard too | JS-level resolution for dashboard | |

**Auto-selected:** Align to 4-level COALESCE chain (recommended default)
**Notes:** Dashboard currently shows different point values than army lists — confusing for users. 4-level (not 5-level) because army_list_units.points_override is per-list, not per-faction.

---

## Claude's Discretion

- Source chip styling and badge variants
- Sheet layout for rules mapping confirmation
- Ambiguity detection query specifics
- Error handling for missing rules.db data
- Whether to show batch "confirm all" action

## Deferred Ideas

None — discussion stayed within phase scope
