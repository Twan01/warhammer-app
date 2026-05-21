# Phase 92: Leader Attachment - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-21
**Phase:** 92-leader-attachment
**Areas discussed:** Attachment UX, Visual grouping, Validation constraints, Ghost unit handling
**Mode:** `--auto` (all decisions auto-selected)

---

## Attachment UX

| Option | Description | Selected |
|--------|-------------|----------|
| LeaderAttachmentSheet via link button on character rows | Sibling portal Sheet opened from a Link2 icon on leader unit rows — follows EnhancementPickerSheet pattern | ✓ |
| Inline dropdown on the unit row | Select target directly from a dropdown without opening a sheet | |
| Context menu action | Right-click or overflow menu to attach leader | |

**Auto-selected:** LeaderAttachmentSheet via link button on character rows (recommended default — follows EnhancementPickerSheet sibling portal pattern)

---

## Visual Grouping

| Option | Description | Selected |
|--------|-------------|----------|
| Indent leader under target with left border accent | Leader row renders indented below target with subtle left border; target gets "Leader: [name]" badge | ✓ |
| Merged composite row | Leader and target combined into a single expanded row | |
| Side-by-side cards | Leader and target shown as adjacent cards in a pair | |

**Auto-selected:** Indent leader under target with left border accent (recommended default — clearest visual hierarchy without merging rows)

---

## Validation Constraints

| Option | Description | Selected |
|--------|-------------|----------|
| Preventive UI — filter to valid targets only | Only show valid targets in the sheet; disable already-attached targets with tooltip | ✓ |
| Post-assignment validation with error toast | Allow any selection, validate after and show error | |

**Auto-selected:** Preventive UI — filter to valid targets only (recommended default — matches enhancement validation pattern)

---

## Ghost Unit Handling

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, via name-based lookup | Ghost units participate using ghost_unit_name for synced_leader_targets matching | ✓ |
| No, require owned units only | Only collection-backed units can be leaders or targets | |

**Auto-selected:** Yes, via name-based lookup (recommended default — ghost units already resolve by name throughout the app)

---

## Claude's Discretion

- LeaderAttachmentSheet internal layout, spacing, and list presentation
- Whether to precompute "is_leader" in the army list query or resolve client-side
- Exact indent depth and border styling for visual grouping
- Icon choice and button placement within ArmyListUnitRow
- Whether "Leader: [name]" badge on target row is clickable or static

## Deferred Ideas

- Leader attachment persistence across list versions/snapshots — Phase 95
- Leader attachment in export format (showing grouped pairs) — Phase 94
- Leader attachment validation in Game Day mode — future milestone
