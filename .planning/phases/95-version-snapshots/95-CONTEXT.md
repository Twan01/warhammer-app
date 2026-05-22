# Phase 95: Version Snapshots - Context

**Gathered:** 2026-05-22
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase delivers version snapshot functionality for army lists: save the current list state as a named snapshot, view snapshot history with timestamps and point totals, compare two snapshots side-by-side to see unit additions/removals and points delta, and restore a list to a previously saved snapshot. The data layer (army_list_units, army_list_enhancements) is already complete from Phase 89. This phase adds a new snapshots table, query/hook layer, and UI components for snapshot management.

</domain>

<decisions>
## Implementation Decisions

### Snapshot Storage Model
- **D-01:** Snapshots use a new `army_list_snapshots` table with columns: `id INTEGER PRIMARY KEY`, `list_id INTEGER NOT NULL FK → army_lists(id) ON DELETE CASCADE`, `label TEXT NOT NULL`, `snapshot_data TEXT NOT NULL` (JSON blob), `total_points INTEGER NOT NULL`, `created_at TEXT NOT NULL DEFAULT datetime('now')`. The JSON blob captures the full list state at a point in time. This is simpler than normalized snapshot tables that would duplicate the army_list_units/enhancements schema. Snapshot data is immutable after creation — no updates needed.
- **D-02:** The `snapshot_data` JSON structure reuses the same shape as the Phase 94 JSON export format (`hobbyforge-army-list` v1.0 schema) for consistency. The shared `formatArmyListForExport` utility produces the structured data that gets serialized into the blob. This avoids duplicating grouping/sorting logic.
- **D-03:** `total_points` is stored as a denormalized INTEGER column (not just inside the JSON) so the snapshot history list can display point totals without parsing every blob.

### Snapshot Content Scope
- **D-04:** Each snapshot captures the complete list state: list metadata (name, faction, detachment, points_limit), all units with effective_points/warlord/ghost/model_count/leader_attachment, all enhancements with points, and computed totals. This is the same data that the JSON export includes — a snapshot is effectively a timestamped internal export.
- **D-05:** Snapshots capture points as they were at snapshot time. They do NOT auto-update when rules data changes. This is intentional — snapshots represent historical state.

### Comparison UX
- **D-06:** Side-by-side comparison uses a `SnapshotCompareDialog` (Dialog component, sibling portal at ArmyListsPage level). Two-column layout showing units from each snapshot with color-coded diffs: added units highlighted, removed units highlighted, and a points delta summary at the top.
- **D-07:** Comparison works by matching units by name (display name). Units present in snapshot A but not B are "removed"; units in B but not A are "added". Units in both are shown normally. Points delta is computed as `total_B - total_A`.
- **D-08:** The user selects two snapshots from the history list to compare. The compare action is available when at least 2 snapshots exist.

### Restore Behavior
- **D-09:** Restoring a snapshot destructively replaces the current list state. All current `army_list_units` and `army_list_enhancements` rows for the list are deleted, then re-created from the snapshot data. This runs in a single SQL transaction.
- **D-10:** Before restore, the app auto-creates a snapshot of the current state labeled "Auto-save before restore" as a safety net. This follows the established safety backup pattern from Phase 82 (Backup 2.0).
- **D-11:** Restore requires a confirmation dialog: "This will replace your current list with the snapshot '[label]'. A safety snapshot of your current list will be saved first. Continue?"
- **D-12:** Restore maps snapshot unit data back to real unit_id where possible (by matching unit_name to units.name within the same faction). Units that no longer exist in the collection are restored as ghost/planned units. This handles the case where a user deleted a unit from their collection after snapshotting.

### Snapshot Entry Points
- **D-13:** A "Snapshots" button in the ArmyListDetailSheet header area (near the Export dropdown) opens a `SnapshotHistorySheet` (Sheet component, sibling portal at ArmyListsPage level).
- **D-14:** The SnapshotHistorySheet shows: a "Save Snapshot" action at the top (text input for label), then a chronological list of saved snapshots with label, timestamp, total points, and action buttons (Compare, Restore, Delete).
- **D-15:** "Save Snapshot" defaults the label to a timestamp-based name (e.g., "Snapshot - May 22, 2026") that the user can edit before saving.

### Claude's Discretion
- SnapshotHistorySheet layout, spacing, and visual styling
- Whether snapshot list uses cards or a simple table layout
- Whether to show a "snapshot count" badge on the Snapshots button
- Compare dialog internal layout (side-by-side columns vs unified diff list)
- Whether to limit max snapshots per list (e.g., 20) or allow unlimited
- Whether delete requires confirmation or is immediate with undo toast
- Migration file number (next available after 031)
- Whether to add snapshot count to ArmyListCard on the lists page

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase 89 Context (Data Layer Foundation)
- `.planning/phases/89-schema-data-layer/89-CONTEXT.md` — D-01 (enhancement storage), D-04/D-05 (ghost unit schema), D-08 (COALESCE chain), D-12 (migration strategy)

### Phase 94 Context (Export Format — reused for snapshot data)
- `.planning/phases/94-list-export/94-CONTEXT.md` — D-10 (JSON format structure), D-15 (shared formatArmyListForExport utility)

### Army List Data Layer
- `src/db/queries/armyLists.ts` — `getArmyListWithUnits` returns all fields needed for snapshot capture
- `src/hooks/useArmyLists.ts` — `useArmyListWithUnits`, `useEnhancementsByList` hooks
- `src/types/armyList.ts` — `ArmyListUnitRow`, `ArmyListEnhancement`, `ArmyList` types

### Export Utility (reusable for snapshot serialization)
- `src/lib/exportArmyList.ts` — `formatArmyListForExport`, `buildJsonFormat` — produces the structured data that snapshot_data JSON reuses

### UI Components to Extend
- `src/features/army-lists/ArmyListDetailSheet.tsx` — Add Snapshots button to header
- `src/features/army-lists/ArmyListsPage.tsx` — Host SnapshotHistorySheet and SnapshotCompareDialog as sibling portals

### Migration Pattern
- `src-tauri/migrations/031_army_list_v3.sql` — Most recent army list migration; new snapshot migration follows the same conventions

### Requirements
- `.planning/REQUIREMENTS.md` — SNP-01, SNP-02, SNP-03, SNP-04
- `.planning/ROADMAP.md` — Phase 95 success criteria (4 items)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `formatArmyListForExport()` + `buildJsonFormat()`: Already produce structured JSON from army list data — snapshot serialization can reuse this directly
- `ExportDropdown`: Pattern for adding action buttons to ArmyListDetailSheet header
- `PrintPreviewDialog` / `DatasheetBrowserDialog`: Dialog sibling portal patterns at ArmyListsPage level
- `EnhancementPickerSheet` / `LeaderAttachmentSheet` / `LoadoutBuilderSheet`: Sheet sibling portal patterns
- `useArmyListWithUnits` + `useEnhancementsByList`: Hooks providing complete dataset needed for snapshot capture

### Established Patterns
- Sibling portal: All Sheets/Dialogs managed at ArmyListsPage level with state hoisted to parent
- Toast notifications: `sonner` toast for success/error feedback
- Confirmation dialogs: Used across the app for destructive operations (delete units, restore backup)
- JSON serialization: Phase 94's `buildJsonFormat` already handles the full army list → JSON conversion
- Safety snapshots: Phase 82 established the "auto-save before destructive action" pattern

### Integration Points
- `ArmyListDetailSheet` header: Add "Snapshots" button alongside Export dropdown
- `ArmyListsPage`: Add SnapshotHistorySheet + SnapshotCompareDialog state + sibling portals
- New migration: `032_army_list_snapshots.sql` (or next available number)
- New query module: `src/db/queries/armyListSnapshots.ts`
- New hook: `src/hooks/useArmyListSnapshots.ts`
- New components: `SnapshotHistorySheet.tsx`, `SnapshotCompareDialog.tsx` in `src/features/army-lists/`

</code_context>

<specifics>
## Specific Ideas

- Snapshot data should use the same JSON structure as the Phase 94 JSON export format so there's one canonical representation of "army list as data"
- The auto-save-before-restore pattern mirrors the safety backup approach from Phase 82 — the user should never lose their current state when experimenting with restore
- Comparison should be simple and visual: what changed between two points in time, not a full diff tool
- Snapshot history should feel like a lightweight version timeline, not a complex versioning system

</specifics>

<deferred>
## Deferred Ideas

- Snapshot sharing/export (export a snapshot as a file for sharing) — future milestone
- Auto-snapshots on significant changes (e.g., before adding 5+ units) — future milestone
- Snapshot annotations/notes beyond the label — future milestone
- Branching from a snapshot (create a new list from a snapshot) — future milestone

None from this discussion — all scope creep avoided.

</deferred>

---

*Phase: 95-Version Snapshots*
*Context gathered: 2026-05-22*
