# Phase 93: Datasheet Browser + Ghost Units - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-21
**Phase:** 93-datasheet-browser-ghost-units
**Areas discussed:** Datasheet Browser UX, Ghost Unit Visual Treatment, Browse-to-Add Flow, Ghost Unit Isolation
**Mode:** --auto (all decisions auto-selected)

---

## Datasheet Browser UX

| Option | Description | Selected |
|--------|-------------|----------|
| Dialog (Command palette) | Matches UnitPickerDialog pattern — modal browse-and-select with search | ✓ |
| Sheet (side panel) | Matches LoadoutBuilderSheet pattern — persistent panel alongside list | |
| Inline expansion | Expand a section within ArmyListDetailSheet | |

**User's choice:** [auto] Dialog (recommended default)
**Notes:** UnitPickerDialog is the direct analog — both are "pick an item from a searchable list" flows. Dialog + Command palette is the established pattern for this interaction.

---

## Ghost Unit Visual Treatment

| Option | Description | Selected |
|--------|-------------|----------|
| Badge + muted styling | "Planned" badge on row, muted text color | ✓ |
| Separate section | Ghost units in a distinct "Planned Units" section below owned units | |
| Icon indicator only | Small ghost/dashed icon, no text change | |

**User's choice:** [auto] Badge + muted styling (recommended default)
**Notes:** Consistent with LoadoutBuilderSheet D-11 which already shows a "Planned" badge for ghost units. Muted styling gives an at-a-glance signal without requiring separate sections.

---

## Browse-to-Add Flow

| Option | Description | Selected |
|--------|-------------|----------|
| Multi-add (dialog stays open) | Matches UnitPickerDialog pattern — add multiple datasheets without re-opening | ✓ |
| Single-add (dialog closes) | Each selection closes the dialog, user must re-open for next | |

**User's choice:** [auto] Multi-add (recommended default)
**Notes:** Matches UnitPickerDialog's stay-open behavior for consistent UX across add flows.

---

## Ghost Unit Isolation

| Option | Description | Selected |
|--------|-------------|----------|
| No additional filtering needed | Phase 89 D-07 already handles isolation — queries read from units table directly | ✓ |
| Add explicit WHERE filters | Add unit_id IS NOT NULL filters to collection/dashboard queries | |

**User's choice:** [auto] No additional filtering needed (recommended default)
**Notes:** Ghost units only exist as army_list_units rows with null unit_id. Collection, Dashboard, and Kanban all query the units table directly — ghost units never enter those result sets by design.

---

## Claude's Discretion

- DatasheetBrowserDialog internal layout and role grouping presentation
- Icon choice for "Browse Datasheets" trigger
- Whether to visually separate owned and ghost units in insertion order or add a separator
- Whether to show additional datasheet info (keywords, model count) in the browser
- Hook file organization for datasheet browser query
- Duplicate detection behavior (grey out vs allow re-add)

## Deferred Ideas

- Ghost-to-owned conversion (linking ghost to collection unit when purchased) — future milestone
- Datasheet detail preview from browser (stats/abilities before adding) — future milestone
- List export with ghost units — Phase 94
- Snapshot versioning with ghost units — Phase 95
