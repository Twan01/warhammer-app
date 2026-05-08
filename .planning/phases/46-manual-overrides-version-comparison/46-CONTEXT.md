# Phase 46: Manual Overrides & Version Comparison - Context

**Gathered:** 2026-05-08
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can correct or annotate any imported rules value for their own units, with changes surviving every future re-sync, and can see what the re-sync changed. Overridable fields: points, stats (M/T/Sv/W/Ld/OC), keywords, and ability reminders. Post-sync diff view shows what changed or was removed. Requirements: OVRD-01 through OVRD-07.

</domain>

<decisions>
## Implementation Decisions

### Override storage pattern
- Wide table (`unit_overrides` in hobbyforge.db), one row per unit, nullable columns for each overridable field
- Fields: `unit_id` (FK to units.id), `points`, `move`, `toughness`, `save`, `wounds`, `leadership`, `objective_control`, `keywords`, `abilities`
- All override columns nullable — NULL means "use imported value"
- UNIQUE constraint on `unit_id` (one override row per unit)
- Matches existing wide-table patterns: `unit_strategy_notes` is wide, `army_list_units` has `points_override`
- COALESCE chain in queries: `COALESCE(unit_overrides.points, u.points, 0)` for effective values
- Separate from `unit_strategy_notes` — strategy notes are personal gameplay notes, overrides are corrections to imported data

### Override UX entry point
- Enhance existing PlaybookTab stats block with override semantics
- When user manually edits a stat that has an imported (datasheet) value, that edit becomes an override stored in `unit_overrides`
- Override values take priority over imported values via COALESCE
- Points override stored in `unit_overrides.points` — army list SQL can pick it up via extended COALESCE: `COALESCE(alu.points_override, unit_overrides.points, u.points, 0)`
- Keywords and abilities overrides entered via the existing PlaybookTab textarea/input, but stored in `unit_overrides` (not `unit_strategy_notes`) when they represent corrections to imported data
- Clear/reset action to remove an override (revert to imported value)

### Diff view presentation
- Collapsible section in PlaybookTab sync area (matches existing "Sync details" Collapsible pattern)
- Shows changes since last snapshot: added/removed/changed datasheets, stat changes, keyword changes
- Toast summary after sync completes with change count ("Synced: 3 datasheets changed, 1 removed")
- Uses `rules_snapshot` data (pre-sync capture from Phase 45) compared against current rules.db state (post-sync)
- Diff data computed in TypeScript: read latest snapshot from hobbyforge.db, read current state from rules.db, compare
- Removed/renamed datasheets shown as a distinct alert (OVRD-07)

### Visual override markers
- Small icon (Pencil from lucide-react, already imported in PlaybookTab) next to stat cells that have user overrides
- Tooltip on hover showing "Manual override — imported value: X"
- Override stat cells get a subtle accent border or background tint to distinguish from imported values
- Consistent with existing compact UI language in PlaybookTab stats block

### Claude's Discretion
- Exact migration number and DDL for `unit_overrides` table
- Diff view layout details (column widths, grouping strategy for changes)
- Whether to show diff inline per-unit or as a faction-wide summary
- Toast message formatting for post-sync change summary
- Whether "clear override" is a button per field or a bulk "reset all" action

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Architecture & schema
- `.planning/phases/42-architecture-audit/ARCHITECTURE-AUDIT.md` — Full schema inventory, sync data flow, migration proposal for unit_overrides (Section 4), gap analysis per phase
- `.planning/phases/42-architecture-audit/42-CONTEXT.md` — Prior decisions: overrides in hobbyforge.db, cross-DB FK constraint, dual-query merge pattern

### Sync pipeline
- `src/hooks/useRulesSync.ts` — Current sync mutation: CSV fetch, snapshot capture, Rust invoke, cache invalidation
- `src/db/queries/rulesSnapshot.ts` — Pre-sync snapshot capture and retrieval (capturePreSyncSnapshot, getLatestSnapshot)
- `src-tauri/migrations/016_rules_snapshot.sql` — rules_snapshot table DDL

### Existing override patterns
- `src/db/queries/armyLists.ts` — COALESCE(alu.points_override, u.points, 0) pattern for effective points
- `src-tauri/migrations/004_unit_playbook_stats.sql` — unit_strategy_notes stat columns (move, toughness, save, wounds, leadership, objective_control, keywords, abilities)

### UI integration points
- `src/features/units/PlaybookTab.tsx` — Main UI surface: stats block, edit mode, sync details collapsible, datasheet import conflict resolution
- `src/types/unit.ts` — Unit interface, points field
- `src/types/strategyNote.ts` — StrategyNote interface with stat fields

### Requirements
- `.planning/REQUIREMENTS.md` — OVRD-01 to OVRD-07 definitions

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `PlaybookTab.tsx` stats block with edit mode toggle — extend with override semantics
- `COALESCE(alu.points_override, u.points, 0)` pattern in `armyLists.ts` — reuse for unit_overrides
- `rules_snapshot` table + `getLatestSnapshot()` query — foundation for diff view
- `capturePreSyncSnapshot()` already runs before every sync — diff data is available
- `Collapsible`/`CollapsibleContent`/`CollapsibleTrigger` from shadcn — reuse for diff view section
- `Pencil` icon already imported in PlaybookTab — reuse for override markers
- `Tooltip`/`TooltipContent`/`TooltipTrigger` — reuse for "imported value: X" tooltips
- `Badge` component — potential use for override indicators
- `formatStatValue()` in PlaybookTab — reuse for diff view stat formatting

### Established Patterns
- Wide table with nullable columns (unit_strategy_notes, army_list_units) — override table follows same pattern
- COALESCE chain in SQL for effective values — extend for override precedence
- React Query hooks per entity with ENTITY_KEY constants — follow for useUnitOverrides
- Mutation + cache invalidation symmetry — useCreateOverride / useDeleteOverride must invalidate consistently
- `getDb()` for hobbyforge.db writes, `getRulesDb()` for rules.db reads — dual-query merge for diff computation

### Integration Points
- PlaybookTab stats section — primary UI surface for override entry and display
- PlaybookTab sync details collapsible — add diff view section below existing sync metadata
- `useRulesSync.onSuccess` — trigger diff computation and toast summary after sync
- Army list effective points SQL — extend COALESCE chain to include unit_overrides.points
- Dashboard stats queries — may need COALESCE update if they reference unit.points directly

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

*Phase: 46-manual-overrides-version-comparison*
*Context gathered: 2026-05-08*
