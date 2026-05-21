# Phase 94: List Export - Context

**Gathered:** 2026-05-21
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase delivers four export formats for army lists: clipboard text copy, print-friendly layout, JSON file export, and PDF generation via jsPDF. All formats include the full army list state — owned units, ghost/planned units, enhancements, leader attachment groupings, warlord designation, and point totals. The data layer is already complete (Phase 89); this phase is pure UI + formatting + file I/O. New dependencies: `@tauri-apps/plugin-clipboard-manager` (clipboard), `jsPDF` (PDF, lazy-loaded).

</domain>

<decisions>
## Implementation Decisions

### Export Entry Point UX
- **D-01:** A single "Export" DropdownMenu button in the ArmyListDetailSheet header area (near the summary bar). The dropdown contains 4 items: "Copy to Clipboard", "Print", "Save as JSON", "Save as PDF". This avoids cluttering the header with 4 separate buttons.
- **D-02:** The export button is always visible (not gated by unit count or list state). Exporting an empty list produces a valid but minimal output in each format.

### Text Format (Clipboard — EXP-01)
- **D-03:** Clipboard text uses a tournament-style compact format. Structure:
  ```
  [Army List Name] — [Points Used]/[Points Limit]
  Faction: [Faction Name]
  Detachment: [Detachment Name]

  == Units ==
  [Unit Name] — [Points]pts [Warlord badge if applicable]
    > Led by: [Leader Name] — [Leader Points]pts  (if attached)
  [Ghost Unit Name] [Planned] — [Points]pts

  == Enhancements ==
  [Enhancement Name] on [Unit Name] — [Points]pts

  Total: [Total Points]pts / [Points Limit]pts
  ```
- **D-04:** Leader-attached pairs are shown grouped: the target unit first, then the leader indented below with "> Led by:" prefix. This matches the visual grouping from Phase 92.
- **D-05:** Ghost/planned units are marked with `[Planned]` after the unit name so recipients (Discord/forum) know the unit is not yet owned.
- **D-06:** Clipboard copy uses `@tauri-apps/plugin-clipboard-manager` writeText API. A toast confirms "List copied to clipboard" on success.

### Print Layout (EXP-02)
- **D-07:** Print uses a dedicated PrintPreviewDialog (Dialog component, sibling portal at ArmyListsPage level). The dialog renders the army list in a clean, ink-friendly layout and has a "Print" button that calls `window.print()`.
- **D-08:** Print layout uses CSS `@media print` styles to hide the dialog chrome and app shell, showing only the list content. The layout is styled for black-and-white printing — no color dependencies, clear section separators.
- **D-09:** Print content matches the text format structure (army header, units grouped by role or insertion order, enhancements section, totals) but with better visual formatting (table layout for units, bold headers, horizontal rules).

### JSON Export (EXP-03)
- **D-10:** JSON export produces a structured, machine-readable file with full metadata:
  ```json
  {
    "format": "hobbyforge-army-list",
    "version": "1.0",
    "exported_at": "ISO-8601",
    "list": {
      "name": "...",
      "faction": "...",
      "detachment": "...",
      "points_limit": 2000,
      "total_points": 1850,
      "enhancement_points": 45
    },
    "units": [
      {
        "name": "...",
        "points": 150,
        "is_warlord": false,
        "is_ghost": false,
        "selected_model_count": 5,
        "leader_attached_to": "Target Unit Name" | null,
        "enhancement": "Enhancement Name" | null
      }
    ],
    "enhancements": [
      {
        "name": "...",
        "points": 15,
        "assigned_to": "Unit Name"
      }
    ]
  }
  ```
- **D-11:** JSON file save uses Tauri's `@tauri-apps/plugin-dialog` save dialog with a `.json` filter. Default filename: `[list-name]-[date].json` (slugified).

### PDF Export (EXP-04)
- **D-12:** PDF uses jsPDF (lazy-loaded via dynamic import so it doesn't impact startup bundle size). The PDF content mirrors the print layout structure — army header, unit table, enhancements, totals.
- **D-13:** PDF generation is text-based (jsPDF text/autoTable), not HTML-to-PDF. This keeps the dependency lightweight and avoids DOM manipulation complexity. Simple table layout with headers, rows, and section breaks.
- **D-14:** PDF file save uses Tauri's `@tauri-apps/plugin-dialog` save dialog with a `.pdf` filter. Default filename: `[list-name]-[date].pdf`.

### Shared Formatting Logic
- **D-15:** A shared `formatArmyListForExport(list, units, enhancements)` utility function produces the structured data that all 4 formats consume. This avoids duplicating the grouping/sorting logic (leader pairs, warlord badge, ghost marking) across formats.
- **D-16:** Leader attachment grouping in export follows the same client-side reordering logic from Phase 92 (D-07) — target unit first, attached leader immediately after.

### Claude's Discretion
- PrintPreviewDialog internal layout, spacing, typography choices
- jsPDF font sizes, margins, table column widths
- Whether to include a "HobbyForge" watermark/footer in PDF output
- Whether the export dropdown uses icons next to each format option
- Whether to add a "Share" label or "Export" label on the trigger button
- Unit grouping in exports: by role vs by insertion order (whichever reads better)
- Whether JSON includes `notes` field per unit (if populated)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase 89 Context (Data Layer Foundation)
- `.planning/phases/89-schema-data-layer/89-CONTEXT.md` — D-04 (ghost unit schema), D-05 (nullable unit_id), D-08 (COALESCE chain)

### Phase 92 Context (Leader Attachment Grouping)
- `.planning/phases/92-leader-attachment/92-CONTEXT.md` — D-05 to D-07 (visual grouping logic, client-side reordering of leader pairs)

### Phase 93 Context (Ghost Unit Export Mandate)
- `.planning/phases/93-datasheet-browser-ghost-units/93-CONTEXT.md` — D-13 (ghost units must appear in exports)

### Army List Data Layer
- `src/db/queries/armyLists.ts` — `getArmyListWithUnits` returns all fields needed for export (unit_name, effective_points, is_warlord, leader_attached_to_id, ghost_unit_name)
- `src/hooks/useArmyLists.ts` — `useArmyListWithUnits` hook for fetching list + units
- `src/hooks/useArmyLists.ts` — `useEnhancementsByList` hook for fetching enhancements
- `src/types/armyList.ts` — `ArmyListUnitRow`, `ArmyListEnhancement` types

### UI Components to Extend
- `src/features/army-lists/ArmyListDetailSheet.tsx` — Add Export dropdown button to header/summary area
- `src/features/army-lists/ArmyListsPage.tsx` — Host PrintPreviewDialog as sibling portal
- `src/features/army-lists/ArmyListSummaryBar.tsx` — Reference for points/enhancement data structure

### Tauri Plugins (File I/O)
- `@tauri-apps/plugin-dialog` — Save file dialog for JSON and PDF export (already in project dependencies)
- `@tauri-apps/plugin-clipboard-manager` — Clipboard write API (NEW — must be added)
- `@tauri-apps/plugin-fs` — File write for JSON/PDF (already in project dependencies)

### Requirements
- `.planning/REQUIREMENTS.md` — EXP-01, EXP-02, EXP-03, EXP-04
- `.planning/ROADMAP.md` — Phase 94 success criteria (4 items)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `ArmyListDetailSheet`: Has access to all data needed for export — list metadata, units with full COALESCE-resolved points, enhancements. The export button goes here.
- `ArmyListSummaryBar`: Computes totalPoints, enhancementTotal, ownershipPct — export can reuse these calculations.
- `useArmyListWithUnits` + `useEnhancementsByList`: Hooks that provide the complete dataset for any export format.
- `@tauri-apps/plugin-dialog` save dialog: Already used elsewhere in the app (backup export) — same pattern for JSON/PDF file saves.
- `DatasheetBrowserDialog` / `UnitPickerDialog`: Dialog patterns at sibling portal level — same architecture for PrintPreviewDialog.

### Established Patterns
- Sibling portal: All dialogs managed at ArmyListsPage level with state hoisted to parent
- Toast notifications: `sonner` toast for success/error feedback (clipboard copy, file save)
- Tauri file dialog: `save()` from `@tauri-apps/plugin-dialog` with file type filters
- Lazy loading: Dynamic `import()` for heavy dependencies (established pattern in the app)

### Integration Points
- `ArmyListDetailSheet` header: Add DropdownMenu trigger for export actions
- `ArmyListsPage`: Add PrintPreviewDialog state + sibling portal
- New utility: `src/lib/exportArmyList.ts` — shared formatting logic consumed by all 4 formats
- New dependency: `jsPDF` (devDependency or dependency, lazy-loaded)
- New dependency: `@tauri-apps/plugin-clipboard-manager` + Tauri plugin registration in `src-tauri/`

</code_context>

<specifics>
## Specific Ideas

- The clipboard text format should be immediately pasteable into Discord or a forum post and look clean without any rendering — plain text, no markdown.
- PDF should be simple and functional — a clean list document, not a fancy designed PDF. Think tournament list printout.
- JSON export includes a `format` and `version` field for potential future import compatibility (Phase 95 snapshots or cross-app sharing).
- The Print layout should use CSS @media print to hide everything except the list content — no browser print preview clutter from the app shell.

</specifics>

<deferred>
## Deferred Ideas

- JSON import (load a previously exported list) — future milestone
- BattleScribe .rosz import — ADV-02 in REQUIREMENTS.md
- Export to image (screenshot-style) — future milestone
- Batch export (multiple lists at once) — future milestone
- Custom text format templates — future milestone

None from this discussion — all scope creep avoided.

</deferred>

---

*Phase: 94-List Export*
*Context gathered: 2026-05-21*
