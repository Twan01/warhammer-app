# Phase 45: Sync Metadata & Import Tracking - Context

**Gathered:** 2026-05-08
**Status:** Ready for planning

<domain>
## Phase Boundary

Make sync status, completeness, and freshness always visible to the user — and capture pre-sync snapshots that enable Phase 46's version comparison diff view. This phase extends existing infrastructure (rw_sync_meta, sync_errors, Rust SyncResult) with persistent storage and UI surfacing. No new sync capabilities or data types — this phase makes the existing sync transparent and traceable.

Requirements: META-01, META-02, META-03, META-04, META-05, META-06

</domain>

<decisions>
## Implementation Decisions

### Sync info placement (META-01, META-02, META-03)
- Extend PlaybookTab's existing sync section — the "Last synced: {date}" text expands to show wahapedia version and per-table row counts
- Row counts and version displayed in a collapsible details area below the sync date line
- Keeps sync info co-located with where users trigger and interact with sync
- Row counts show the same key tables as the post-sync toast (datasheets, stratagems, abilities, wargear, keywords)

### Persistent row count storage (META-02)
- Extend `rw_sync_meta` via ALTER TABLE in a new rules.db migration to add count columns matching the Rust SyncResult fields (factions, sources, datasheets, models, abilities, keywords, wargear, shared_abilities, stratagems, detachments, detachment_abilities)
- Rust upsert writes counts alongside `last_sync_at` + `wahapedia_version` in the same transaction — single INSERT OR REPLACE
- TypeScript `RulesSyncMeta` type extended with count fields (all nullable — null before first sync)

### Freshness indicator (META-05)
- Compare `last_sync_at` to current date to determine freshness
- Three tiers: fresh (<7 days, green dot), aging (7–14 days, amber dot), stale (>14 days, red dot)
- Displayed on PlaybookTab near the "Last synced" text as a small color-coded dot with tooltip showing exact age (e.g., "Synced 3 days ago")
- 7-day threshold aligns with Wahapedia's roughly weekly update cadence for errata/points
- Pure client-side computation — no backend freshness tracking needed

### Error history display (META-04)
- Uses existing `getSyncErrors()` query from Phase 44 `src/db/queries/syncErrors.ts`
- Collapsible section below sync details in PlaybookTab, only rendered when errors exist
- Shows most recent 10 errors with timestamp, error type badge, and message
- Collapsed by default — expands on click to avoid cluttering the normal sync flow
- Hidden entirely if no sync errors have ever been recorded

### Pre-sync snapshot (META-06)
- New `rules_snapshot` table in hobbyforge.db (NOT rules.db — must survive the sync DELETE pass)
- Schema: `id INTEGER PRIMARY KEY AUTOINCREMENT`, `captured_at TEXT NOT NULL`, `wahapedia_version TEXT`, `table_name TEXT NOT NULL`, `row_count INTEGER NOT NULL`, `snapshot_data TEXT` (JSON array of key identifying fields per row — id + name pairs)
- One row per table per snapshot capture (11 rows per snapshot — one per rw_* data table)
- Captured BEFORE the DELETE pass — snapshot reads the current rules.db state, writes to hobbyforge.db, then sync proceeds
- Snapshot capture triggered from TypeScript before calling `bulk_sync_rules` — reads each table's key fields via rules.db queries, writes snapshot rows via hobbyforge.db
- Only the most recent snapshot is needed (Phase 46 compares latest snapshot to post-sync state) — older snapshots can be cleaned up but keeping ~3 is fine for history
- JSON `snapshot_data` stores `[{id, name}, ...]` per table — enough for Phase 46 to detect added/removed/renamed entries

### Claude's Discretion
- Exact collapsible section styling for sync details and error history
- Whether row counts display as a compact inline list or a mini table
- Migration file numbering for rw_sync_meta extension and rules_snapshot table
- Freshness dot implementation (CSS, icon, or badge component)
- Error history date formatting (relative "2 hours ago" vs absolute)
- Whether snapshot capture runs as a single batch query or per-table sequential reads
- Cleanup strategy for old snapshots (delete on capture or keep N most recent)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Architecture & Schema
- `.planning/phases/42-architecture-audit/ARCHITECTURE-AUDIT.md` — Section 4 "Migration Proposal": rw_sync_meta extension spec (Group A), rules_snapshot table proposal (Group B), sync_errors table (already created). Section 3: Phase 45 gaps list (META-01 through META-06)
- `.planning/phases/42-architecture-audit/42-CONTEXT.md` — Phase 42 decisions: rules.db is destroyed on every sync, persistent data MUST live in hobbyforge.db, cross-DB FKs not supported

### Prior phase code (Phase 44)
- `src/hooks/useRulesSync.ts` — Sync mutation: fetches 12 CSVs, calls Rust, receives typed SyncResult with per-table row counts, logs errors to sync_errors, invalidates all rules query keys
- `src-tauri/src/lib.rs` — Rust `bulk_sync_rules`: SyncResult struct (lines 153-165), rw_sync_meta upsert (lines 436-444), transaction with DELETE+INSERT per table
- `src/db/queries/syncErrors.ts` — Existing insert/read for sync_errors table in hobbyforge.db
- `src-tauri/migrations/015_sync_errors.sql` — sync_errors DDL (hobbyforge.db)

### Current sync metadata
- `src-tauri/migrations/rules_001_schema.sql` — Current rw_sync_meta DDL (id, last_sync_at, wahapedia_version only)
- `src/types/datasheet.ts` — Current RulesSyncMeta interface (lines 67-71): needs extending with count fields
- `src/db/queries/datasheets.ts` — `getRulesSyncMeta()` query (line 105): reads rw_sync_meta
- `src/hooks/useDatasheet.ts` — `useRulesSyncMeta()` hook + `RULES_SYNC_META_KEY` export

### UI integration point
- `src/features/units/PlaybookTab.tsx` — Lines 265/482-484: existing "Last synced: {date}" display, `formatSyncDate` helper (line 463), `handleSyncClick` (line 430)

### Requirements
- `.planning/REQUIREMENTS.md` — META-01 through META-06 requirement definitions
- `.planning/ROADMAP.md` — Phase 45 success criteria (6 criteria)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `useRulesSyncMeta()` hook in `src/hooks/useDatasheet.ts`: returns the rw_sync_meta singleton row — extend the type and this hook automatically surfaces new fields
- `getSyncErrors()` in `src/db/queries/syncErrors.ts`: read path for error history already implemented
- `formatSyncDate()` in PlaybookTab.tsx (line 463): date formatting helper — can be extracted to `src/lib/dates.ts` for reuse
- `Collapsible` / `CollapsibleContent` / `CollapsibleTrigger` from shadcn/ui: already imported in PlaybookTab
- `SECTION_LABEL_CLASS` constant in PlaybookTab: shared styling for section headers
- `getRulesDb()` singleton in `src/db/rules-client.ts`: rules.db connection for reading pre-snapshot data
- `getDb()` singleton in `src/db/client.ts`: hobbyforge.db connection for writing snapshot rows
- `Badge` component from shadcn/ui: available for freshness indicator

### Established Patterns
- rw_sync_meta is a singleton row (id=1, CHECK constraint) — extend with ALTER TABLE, not new table
- Rust SyncResult already returns all 11 table counts as u64 — just need to persist them in rw_sync_meta
- Rules.db migrations are separate from hobbyforge.db migrations — numbered independently in `get_migrations()`
- Query modules in `src/db/queries/` use parameterized `$1, $2` syntax
- React Query hooks use `staleTime: Infinity` for rules data (static until re-sync)
- Cache invalidation: `RULES_SYNC_META_KEY` is already invalidated on sync success

### Integration Points
- `src-tauri/src/lib.rs` line 436-444: Rust rw_sync_meta upsert — needs to include count columns
- `src/hooks/useRulesSync.ts` line 137-153: invoke + return — snapshot capture must happen BEFORE this invoke call
- `src/features/units/PlaybookTab.tsx` line 479-525: sync section UI — expand with details, freshness badge, error history
- `src-tauri/migrations/` — new migration for rw_sync_meta column additions (rules.db) and new migration for rules_snapshot table (hobbyforge.db)

</code_context>

<specifics>
## Specific Ideas

- Rust SyncResult already has all 11 count fields — the data is computed and returned but not persisted. Phase 45 closes this loop by writing counts to rw_sync_meta.
- The `rw_datasheet_keywords` INSERT uses INSERT OR IGNORE (from Phase 44 decision) — actual vs attempted counts may differ for this table. Rust's `rows_affected()` already handles this correctly.
- Snapshot capture runs from TypeScript (not Rust) — reads each rw_* table's id+name from rules.db via new query functions, then writes to hobbyforge.db. This avoids modifying the Rust transaction boundary.
- Phase 46 will need to compare snapshot data to post-sync state — the JSON format must be stable and predictable (sorted by id).

</specifics>

<deferred>
## Deferred Ideas

- Auto-sync reminder notification when data is stale — new capability, belongs in a future phase
- Sync scheduling (periodic auto-sync) — explicitly out of scope per REQUIREMENTS.md
- Detailed per-row change tracking (not just added/removed) — Phase 46 can derive this from snapshot comparison
- Sync progress bar during fetch/insert — nice UX but not in META requirements

</deferred>

---

*Phase: 45-sync-metadata-import-tracking*
*Context gathered: 2026-05-08*
