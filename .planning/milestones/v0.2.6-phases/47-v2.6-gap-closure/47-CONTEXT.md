# Phase 47: v0.2.6 Gap Closure - Context

**Gathered:** 2026-05-08
**Status:** Ready for planning

<domain>
## Phase Boundary

Close the remaining OVRD-06 gap by extending the pre-sync snapshot to store full field values (points, stats, keywords, abilities) per datasheet and adding per-field diff comparison. Also clean up accumulated tech debt: fix stale JSDoc in armyLists.ts and add requirements_completed entries to SUMMARY frontmatter in phases 43-46.

</domain>

<decisions>
## Implementation Decisions

### Snapshot data shape
- Extend `SNAPSHOT_TABLES` queries for composite-PK tables to store actual row data as JSON (not just COUNT(*))
- For `rw_datasheet_models`: store full stats rows `[{datasheet_id, line, name, M, T, Sv, inv_sv, W, Ld, OC}]` as JSON in snapshot_data
- For `rw_datasheet_keywords`: store `[{datasheet_id, keyword, is_faction_keyword}]` as JSON in snapshot_data
- For `rw_datasheet_abilities`: store `[{datasheet_id, line, ability_id, name, description, type}]` as JSON in snapshot_data
- For `rw_datasheets_wargear`: keep COUNT(*) only (wargear detail diff is out of OVRD-06 scope)
- `rw_datasheets` snapshot query already stores `{id, name}` — no change needed (datasheet-level add/remove/rename already works)

### Per-field diff granularity
- Extend `SyncDiff` interface with a `modified` array for datasheets that exist in both snapshots but have field-level changes
- Each modified entry includes: `{id, name, changes: [{field, oldValue, newValue}]}` — generic enough for stats, keywords, and abilities
- Stats comparison: compare M/T/Sv/W/Ld/OC per model line; report individual stat changes (e.g., "T: 5 → 6")
- Keywords comparison: report added and removed keywords by diffing keyword sets per datasheet
- Abilities comparison: report added and removed ability names per datasheet
- `total_changed` count includes modified datasheets in addition to existing added/removed/renamed

### Diff UI presentation
- Add "Modified" section to existing diff collapsible in PlaybookTab alongside added/removed/renamed sections
- Modified section shows per-datasheet expandable entries with field-level change details
- Use same compact text styling (text-xs, text-muted-foreground) as existing diff sections
- Arrow notation for value changes: "T: 5 → 6", "OC: 1 → 2"
- Keyword/ability changes shown as "+Added Keyword" / "-Removed Keyword" format
- No new components needed — extend existing CollapsibleContent in PlaybookTab

### JSDoc correction (tech debt)
- Line 20 in armyLists.ts: change `COALESCE(alu.points_override, u.points, 0)` to `COALESCE(alu.points_override, uo.points, u.points, 0)` to match actual 3-level chain with unit_overrides
- Line 159 in armyLists.ts: change `COALESCE(points_override, u.points, 0)` to `COALESCE(alu.points_override, uo.points, u.points, 0)` to match actual query

### SUMMARY frontmatter (tech debt)
- Add `requirements_completed` entries to SUMMARY frontmatter in phases 43-01, 43-02, 44-01, 44-02, 45-01, 45-02, 46-01, 46-02
- Map each SUMMARY to the requirements it satisfied (from REQUIREMENTS.md traceability table)

### Claude's Discretion
- Exact diff comparison algorithm for composite-PK table data (sort order, deep equality strategy)
- Whether to show model line names alongside stat changes
- Formatting details for long keyword/ability change lists (truncation threshold)
- How to handle first-sync case in extended diff (no baseline — empty diff as before)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Snapshot & diff system
- `src/db/queries/rulesSnapshot.ts` — capturePreSyncSnapshot, SNAPSHOT_TABLES, getLatestSnapshot (Phase 45)
- `src/lib/computeSyncDiff.ts` — SyncDiff interface, computeSyncDiff pure function (Phase 46)
- `src/hooks/useRulesSync.ts` — Sync mutation calling snapshot capture and diff computation
- `src-tauri/migrations/016_rules_snapshot.sql` — rules_snapshot table DDL

### Rules schema (data source for extended snapshot)
- `src-tauri/migrations/rules_001_schema.sql` — rw_datasheets, rw_datasheet_models (M/T/Sv/W/Ld/OC), rw_datasheet_abilities, rw_datasheet_keywords
- `src-tauri/migrations/rules_002_wargear_abilities.sql` — rw_datasheets_wargear, rw_abilities, rw_stratagems, rw_detachments

### Diff UI
- `src/features/units/PlaybookTab.tsx` — Lines 737-772: existing diff collapsible section (OVRD-06/07)

### Tech debt targets
- `src/db/queries/armyLists.ts` — Lines 20, 159: stale JSDoc referencing 2-level COALESCE (actual is 3-level with uo.points)
- `.planning/phases/43-extended-rules-read-layer/43-01-SUMMARY.md` — Missing requirements_completed
- `.planning/phases/43-extended-rules-read-layer/43-02-SUMMARY.md` — Missing requirements_completed
- `.planning/phases/44-sync-pipeline-hardening/44-01-SUMMARY.md` — Missing requirements_completed
- `.planning/phases/44-sync-pipeline-hardening/44-02-SUMMARY.md` — Missing requirements_completed
- `.planning/phases/45-sync-metadata-import-tracking/45-01-SUMMARY.md` — Missing requirements_completed
- `.planning/phases/45-sync-metadata-import-tracking/45-02-SUMMARY.md` — Missing requirements_completed
- `.planning/phases/46-manual-overrides-version-comparison/46-01-SUMMARY.md` — Missing requirements_completed
- `.planning/phases/46-manual-overrides-version-comparison/46-02-SUMMARY.md` — Missing requirements_completed

### Requirements
- `.planning/REQUIREMENTS.md` — OVRD-06 definition (the gap being closed)

### Prior phase context
- `.planning/phases/46-manual-overrides-version-comparison/46-CONTEXT.md` — Override storage, diff view, and visual marker decisions

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `capturePreSyncSnapshot()` in rulesSnapshot.ts — extend SNAPSHOT_TABLES queries to include full row data for composite-PK tables
- `computeSyncDiff()` in computeSyncDiff.ts — extend with modified datasheets comparison using new snapshot fields
- `SyncDiff` interface — extend with `modified` array type
- PlaybookTab diff collapsible (lines 737-772) — extend with "Modified" section
- `Collapsible`/`CollapsibleContent`/`CollapsibleTrigger` from shadcn — already used in diff section

### Established Patterns
- SNAPSHOT_TABLES array with `{table, query}` entries — extend query strings for composite-PK tables
- JSON.parse/stringify for snapshot_data — same pattern for richer data
- Map-based diff comparison in computeSyncDiff — extend with per-field comparison logic
- text-xs/text-muted-foreground styling in diff sections — reuse for modified entries

### Integration Points
- `useRulesSync.onSuccess` — already calls computeSyncDiff and sets lastSyncDiff state; will use extended SyncDiff
- `setLastSyncDiff(data.diff)` in PlaybookTab — receives extended diff data
- Toast summary in PlaybookTab sync handler — extend with modified count

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches. Auto-mode selected recommended defaults based on existing codebase patterns.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 47-v0.2.6-gap-closure*
*Context gathered: 2026-05-08*
