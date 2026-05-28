# Phase 102: Smart Context Pre-Filling - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-28
**Phase:** 102-Smart Context Pre-Filling
**Areas discussed:** Faction pre-fill source, ApplyRecipeDialog grouping, Pre-fill editability UX, Entry point routing
**Mode:** --auto (all decisions auto-selected)

---

## Faction Pre-Fill Source

| Option | Description | Selected |
|--------|-------------|----------|
| Unit's faction_id from entry point | Use the specific unit's faction when opening from unit context | ✓ |
| FactionContext (global sidebar) | Use the globally active faction from sidebar selection | |

**Auto-selected:** Unit's faction_id from entry point (recommended default)
**Notes:** FactionContext is for theming/navigation, not data pre-fill. The unit's own faction is the correct context when creating a recipe for that unit.

---

## ApplyRecipeDialog Grouping

| Option | Description | Selected |
|--------|-------------|----------|
| Two-group: Suggested + Other | Show matching-faction recipes first, then all others | ✓ |
| Flat list with faction sort | Sort by faction match but no visual groups | |
| Faction filter toggle | Add a toggle to show only matching faction | |

**Auto-selected:** Two-group layout (recommended default)
**Notes:** CommandGroup in cmdk natively supports this. Both groups remain selectable — no recipes are hidden.

---

## Pre-Fill Editability UX

| Option | Description | Selected |
|--------|-------------|----------|
| Standard pre-populated fields | No special visual treatment, just set default values | ✓ |
| Auto-fill badge/highlight | Visual indicator showing which fields were auto-filled | |

**Auto-selected:** Standard pre-populated fields (recommended default)
**Notes:** Populated dropdowns are naturally understood as changeable. Extra UI treatment would add complexity without value.

---

## Entry Point Routing

| Option | Description | Selected |
|--------|-------------|----------|
| Unit-context only | Only UnitDetailSheet carries faction/unit context | ✓ |
| All entry points | QuickAdd and Recipes toolbar also try to use FactionContext | |

**Auto-selected:** Unit-context only (recommended default)
**Notes:** QuickAdd is intentionally context-free. Forcing faction pre-fill from FactionContext would be surprising in that flow.

---

## Claude's Discretion

- Prop threading approach (how to pass faction_id through component hierarchy)
- Memoization strategy for suggested/other grouping
- Test strategy for pre-fill behavior

## Deferred Ideas

None — discussion stayed within phase scope.
