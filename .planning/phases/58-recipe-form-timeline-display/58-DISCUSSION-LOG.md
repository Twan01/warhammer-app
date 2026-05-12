# Phase 58: Recipe Form & Timeline Display - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-12
**Phase:** 58-Recipe Form & Timeline Display
**Areas discussed:** Workflow collapsible layout, Progressive disclosure trigger, Timeline badge design, applies_to field control
**Mode:** --auto (all decisions auto-selected)

---

## Workflow Collapsible Layout

| Option | Description | Selected |
|--------|-------------|----------|
| 2×2 grid of compact selects | section_type + technique row 1, execution_mode + applies_to row 2 | ✓ |
| Vertical stack (full-width) | Four full-width selects stacked vertically | |
| Inline row | All four fields in a single horizontal row | |

**Auto-selected:** 2×2 grid of compact selects (recommended default)
**Notes:** RecipeSectionCard has constrained width. Four full-width selects too tall; single row too cramped. 2×2 balances density and usability.

---

## Progressive Disclosure Trigger

| Option | Description | Selected |
|--------|-------------|----------|
| Hide when single section AND no metadata | Collapsible only appears when multi-section OR any metadata field is set | ✓ |
| Always show collapsible | Workflow collapsible visible on every section card regardless | |
| Hide when no metadata (ignore section count) | Only check metadata presence, not section count | |

**Auto-selected:** Hide when single section AND no metadata (recommended default)
**Notes:** Matches success criterion 2 exactly. Once user starts using workflow features (multi-section or sets any field), the UI progressively reveals itself.

---

## Timeline Badge Design

| Option | Description | Selected |
|--------|-------------|----------|
| Dot-separated inline string | "Section Name . Surface . Technique . Mode" with section_type as Badge | ✓ |
| All separate badges | Each metadata field as its own Badge component | |
| Compact metadata row below section header | Second line under section name for metadata | |

**Auto-selected:** Dot-separated inline string (recommended default)
**Notes:** Success criterion 4 gives explicit format example "Armor Blue . Armor . Drybrush . Sequential" — dot-separated inline text. Section_type gets a distinct Badge since it's categorical.

---

## applies_to Field Control

| Option | Description | Selected |
|--------|-------------|----------|
| Simple text input | Free-text input per WF-04 specification | ✓ |
| Combobox with suggestions | Text input with autocomplete from previously used values | |

**Auto-selected:** Simple text input (recommended default)
**Notes:** WF-04 defines applies_to as free-text. Model areas vary wildly ("shoulder pads", "cloak", "base rim") — no useful predefined list.

---

## Claude's Discretion

- Exact Collapsible trigger/content markup and Tailwind classes for the 2×2 grid
- Badge color variants for section_type values (or all using outline variant)
- Whether to capitalize technique/execution_mode display values or show as-is
- Exact dot separator styling (literal " . " text or styled spans)

## Deferred Ideas

None — discussion stayed within phase scope.
