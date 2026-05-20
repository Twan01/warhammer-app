# Phase 90: Loadout Builder - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-20
**Phase:** 90-Loadout Builder
**Areas discussed:** Loadout panel UX, Tier selection persistence, Wargear display, Ghost unit loadout support
**Mode:** --auto (all decisions auto-resolved)

---

## Loadout Panel UX

| Option | Description | Selected |
|--------|-------------|----------|
| Dedicated Sheet | LoadoutBuilderSheet opened from unit row via trigger button, sibling portal pattern | ✓ |
| Inline expansion | Expand a section within ArmyListUnitRow for tier + wargear | |
| Modal dialog | Full-screen dialog overlay | |

**Auto-selected:** Dedicated Sheet (recommended default — matches roadmap specification, keeps row clean)
**Notes:** The roadmap explicitly says "LoadoutBuilderSheet at page level". Existing inline tier selector (Phase 24) becomes a compact trigger. Follows the same sibling portal pattern as UnitPickerDialog.

---

## Tier Selection Persistence

| Option | Description | Selected |
|--------|-------------|----------|
| Per-list (selected_model_count) | Write to army_list_units.selected_model_count, each list has independent tier | ✓ |
| Collection-wide (units.points) | Write to units.points like Phase 24, affects all lists | |

**Auto-selected:** Per-list via selected_model_count (recommended default — Phase 89 added this column for exactly this purpose)
**Notes:** The old Phase 24 behavior wrote to units.points which changed the unit across ALL lists. Phase 89's selected_model_count is per-army_list_unit row, so different lists can have different tiers for the same unit. The COALESCE chain already resolves tier.points from this join.

---

## Wargear Display

| Option | Description | Selected |
|--------|-------------|----------|
| Grouped read-only list | Options grouped by group_name, badges for default/exclusive | ✓ |
| Flat list | All options in a single flat list | |
| Collapsible groups | Grouped but collapsed by default | |

**Auto-selected:** Grouped read-only list (recommended default — wargear is free in 10th ed, informational display)
**Notes:** synced_loadout_options already has group_name, is_default, is_exclusive. Grouped display matches how players think about loadouts (ranged weapons vs melee weapons vs other equipment).

---

## Ghost Unit Loadout Support

| Option | Description | Selected |
|--------|-------------|----------|
| Full support | Ghost units can use LoadoutBuilder, tier lookup via ghost_unit_name | ✓ |
| Skip ghost units | Disable loadout config for ghost/planned units | |

**Auto-selected:** Full support (recommended default — COALESCE chain already handles ghost units via name-based join)
**Notes:** Ghost units are "planned" units not in the collection. They still have valid datasheets with tiers and wargear options. The existing query already uses COALESCE(u.name, alu.ghost_unit_name) for all tier/synced joins.

---

## Claude's Discretion

- Sheet layout, spacing, responsive behavior
- Query hook naming and cache key design
- Hook file organization (new file vs extend existing)
- Icon choice for Configure trigger
- Delta preview interaction pattern adaptation

## Deferred Ideas

- Wargear selection persistence (future if rules change)
- Enhancement assignment UI (Phase 91)
- Leader attachment pairing (Phase 92)
- Ghost unit creation flow (Phase 93)
