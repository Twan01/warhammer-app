# Phase 94: List Export - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-21
**Phase:** 94-list-export
**Areas discussed:** Text Format Design, Export Entry Point UX, Print Layout, JSON Schema, PDF Generation Strategy
**Mode:** --auto (all decisions auto-selected)

---

## Export Entry Point UX

| Option | Description | Selected |
|--------|-------------|----------|
| DropdownMenu button in header | Single "Export" button with 4 format options in dropdown | [auto] |
| Separate buttons per format | Individual buttons for each export type | |
| Context menu on list | Right-click/long-press menu with export options | |

**Auto-selected:** DropdownMenu button in ArmyListDetailSheet header (recommended default)
**Rationale:** Cleaner than 4 separate buttons, follows established UI patterns, single entry point for all export actions.

---

## Text Format Design

| Option | Description | Selected |
|--------|-------------|----------|
| Tournament-style compact | Army header + unit list with points + enhancements + totals | [auto] |
| Detailed with all metadata | Include model counts, tactical roles, wargear, notes | |
| Minimal list only | Just unit names and points, no structure | |

**Auto-selected:** Tournament-style compact (recommended default)
**Rationale:** Matches community expectations for Discord/forum sharing. Includes leader grouping and ghost unit markers without excessive detail.

---

## Print Layout

| Option | Description | Selected |
|--------|-------------|----------|
| CSS @media print in Dialog | PrintPreviewDialog with print button, CSS hides app shell | [auto] |
| Dedicated print route | Separate /print/:listId route with print-optimized layout | |
| Direct window.print() | No preview, just print current view with print styles | |

**Auto-selected:** CSS @media print in Dialog (recommended default)
**Rationale:** Dialog gives preview before printing, CSS approach keeps it lightweight, sibling portal pattern is established.

---

## JSON Schema

| Option | Description | Selected |
|--------|-------------|----------|
| Structured with full metadata | Versioned format with list metadata + units + enhancements arrays | [auto] |
| Flat denormalized | Single array with all data per unit row | |
| Minimal points-only | Just names and points, no relationships | |

**Auto-selected:** Structured with full metadata (recommended default)
**Rationale:** Machine-readable, includes format version for future import compatibility, preserves all relationships (leader attachment, enhancements).

---

## PDF Generation Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| jsPDF text-based | Text/table layout via jsPDF API, lazy-loaded | [auto] |
| html2pdf wrapper | Render HTML then convert to PDF | |
| Server-side generation | Generate PDF in Rust backend | |

**Auto-selected:** jsPDF text-based (recommended default)
**Rationale:** Lightweight, no DOM manipulation, lazy-loaded to avoid startup impact. Simple table layout matches tournament list printout aesthetic.

---

## Claude's Discretion

- PrintPreviewDialog internal layout, spacing, typography
- jsPDF font sizes, margins, table column widths
- Icon choices for export dropdown items
- Unit grouping strategy in exports (by role vs insertion order)
- Whether to include unit notes in JSON export
- PDF watermark/footer presence

## Deferred Ideas

- JSON import (load previously exported list) — future milestone
- BattleScribe .rosz import — ADV-02
- Export to image (screenshot-style) — future milestone
- Batch export (multiple lists) — future milestone
- Custom text format templates — future milestone
