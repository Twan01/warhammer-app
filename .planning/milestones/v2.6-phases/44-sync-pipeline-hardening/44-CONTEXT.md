# Phase 44: Sync Pipeline Hardening - Context

**Gathered:** 2026-05-08
**Status:** Ready for planning

<domain>
## Phase Boundary

Harden the existing sync pipeline so it validates CSV input before insertion, returns actual per-table row counts from Rust, displays those counts in a post-sync confirmation, logs errors to a persistent table, and invalidates all rules-related React Query caches on success. No new data types or UI pages — this phase makes the existing sync reliable and transparent.

</domain>

<decisions>
## Implementation Decisions

### Post-sync confirmation UX
- Replace the current bare `toast.success("Datasheets synced")` with a success toast that includes a summary line of per-table row counts (e.g. "Synced: 847 datasheets, 312 stratagems, 1204 abilities")
- Counts come from Rust (actual INSERT counts), not TypeScript array lengths
- Keep it as a toast — no dialog or inline display; non-disruptive to the user's flow
- On error, show `toast.error` with the error message from the persistent log

### CSV column validation
- Validate required column headers BEFORE sending data to Rust — fail the entire sync if any CSV is malformed
- Required headers defined per CSV file type (e.g. Factions.csv requires "id" and "name")
- Validation runs after `parseWahapediaCsv` returns rows — check that header keys match expected set
- On validation failure: throw with a descriptive message naming the CSV file and missing columns
- All-or-nothing: if one CSV fails validation, no data is sent to Rust — matches the existing single-transaction model

### Error logging
- New `sync_errors` table in hobbyforge.db (NOT rules.db — must survive re-syncs)
- Log sync failures only: fetch errors, parse errors, CSV validation errors, Rust transaction errors
- Schema: `id INTEGER PRIMARY KEY AUTOINCREMENT`, `occurred_at TEXT NOT NULL`, `error_type TEXT NOT NULL` (one of: "fetch_failed", "parse_error", "validation_error", "sync_error"), `message TEXT NOT NULL`, `csv_file TEXT` (which file failed, null for global errors)
- Successful syncs are already tracked in `rw_sync_meta` — no need to duplicate success records in the error table
- Error history persists across app restarts and re-syncs
- Write to error table in the `onError` path of the mutation, using hobbyforge.db (main DB client)

### Rust return type change
- Change `bulk_sync_rules` return from `Result<(), String>` to `Result<SyncResult, String>` where `SyncResult` is a struct with per-table row counts
- Count actual rows inserted (not rows attempted) — use the sqlx execute result's `rows_affected()` for each INSERT loop
- Include all 11 data tables in the counts: factions, sources, datasheets, models, abilities, keywords, wargear, shared_abilities, stratagems, detachments, detachment_abilities
- TypeScript receives counts via the Tauri IPC bridge and uses them directly (replaces the current client-side array length approximations)

### Cache invalidation contract
- Add prefix-match invalidation (`exact: false`) for all Phase 43 query keys in `useRulesSync.onSuccess`:
  - `["stratagems-by-faction"]`
  - `["detachments-by-faction"]`
  - `["detachment-abilities"]`
  - `["shared-abilities-by-faction"]`
- Keep existing invalidations: `RULES_SYNC_META_KEY`, `["datasheets-by-faction"]`, `["datasheet"]`
- If Phase 43 hooks don't exist yet at implementation time, add the invalidation keys anyway — React Query silently skips keys with no active queries

### Claude's Discretion
- Exact TypeScript validation helper structure (one function per CSV or a map-based approach)
- Whether to add the `rowCounts` missing entries (`shared_abilities`, `detachment_abilities`) now or replace the entire client-side counting with Rust counts
- Migration file number for the `sync_errors` table in hobbyforge.db
- Exact Rust `SyncResult` struct field naming
- Toast message formatting (exact wording, whether to abbreviate table names)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Architecture audit
- `.planning/phases/42-architecture-audit/ARCHITECTURE-AUDIT.md` — Full schema state, sync data flow trace, TypeScript gaps per phase, migration proposal for sync_errors table
- `.planning/phases/42-architecture-audit/42-CONTEXT.md` — Phase 42 decisions including sync pipeline assessment (write path already complete)

### Sync pipeline code
- `src-tauri/src/lib.rs` — Rust `bulk_sync_rules` command (lines 151-410): BulkSyncPayload struct, transaction logic, all 11 INSERT loops, sync_meta upsert
- `src/hooks/useRulesSync.ts` — TypeScript sync mutation: 12 CSV fetch, parse, HTML strip, invoke, client-side rowCounts, onSuccess invalidation
- `src/db/rules-client.ts` — rules.db singleton connection (WAL mode, busy_timeout, FK enforcement)
- `src/lib/parseWahapediaCsv.ts` — Pipe-delimited CSV parser (10 lines, no validation)

### Existing types and queries
- `src/types/datasheet.ts` — All current rules types (RwFaction through RwAbility, RulesSyncMeta, FullDatasheet)
- `src/db/queries/datasheets.ts` — Read queries for rules.db (getFullDatasheet, getRulesSyncMeta, etc.)
- `src/hooks/useDatasheet.ts` — React Query hooks + RULES_SYNC_META_KEY export

### UI integration point
- `src/features/units/PlaybookTab.tsx` — Lines 403-411: handleSyncClick with toast.success/toast.error (the exact code to modify for SYNC-02)

### Requirements
- `.planning/REQUIREMENTS.md` — SYNC-01 through SYNC-05 requirement definitions
- `.planning/ROADMAP.md` — Phase 44 success criteria (4 criteria)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `parseWahapediaCsv()` in `src/lib/parseWahapediaCsv.ts`: Returns `Record<string,string>[]` with headers from line 0 — validation can check `headers` against expected set before returning rows
- `toast.success()` / `toast.error()` from sonner: Already used in PlaybookTab sync handler — extend with formatted count string
- `getDb()` from `src/db/client.ts`: Main DB singleton for writing to `sync_errors` in hobbyforge.db
- `getRulesDb()` from `src/db/rules-client.ts`: Rules DB singleton for reading `rw_sync_meta`
- `RULES_SYNC_META_KEY` from `src/hooks/useDatasheet.ts`: Existing query key constant for sync meta invalidation

### Established Patterns
- Tauri IPC: `invoke("command_name", { payload })` → Rust `#[tauri::command]` returns `Result<T, String>`
- SQLite migrations: Numbered files in `src-tauri/migrations/`, registered in `get_migrations()` in `lib.rs`
- Query modules: One `.ts` per entity in `src/db/queries/`, parameterized with `$1, $2`
- React Query hooks: One file per entity in `src/hooks/`, exports ENTITY_KEY + useEntity + mutations
- Error handling: Rust returns `Err(format!("context: {e}"))`, TypeScript catches in `onError`

### Integration Points
- `src-tauri/src/lib.rs` `bulk_sync_rules`: Return type changes from `Result<(), String>` to `Result<SyncResult, String>`
- `src/hooks/useRulesSync.ts` `mutationFn`: Must receive Rust counts instead of computing client-side, format for toast
- `src/hooks/useRulesSync.ts` `onSuccess`: Must add 4 new invalidation calls for Phase 43 query keys
- `src/features/units/PlaybookTab.tsx` `handleSyncClick`: Toast message updates to show counts
- `src-tauri/migrations/015_sync_errors.sql` (new): CREATE TABLE sync_errors in hobbyforge.db
- `src/db/queries/syncErrors.ts` (new): Insert error, get error history

</code_context>

<specifics>
## Specific Ideas

- Rust `rows_affected()` is the authoritative source for insertion counts — the current TypeScript `.length` approach masks INSERT OR IGNORE skips
- The `rw_datasheet_keywords` table has no UNIQUE constraint and uses plain INSERT (not INSERT OR IGNORE) — CSV validation should check for duplicate `(datasheet_id, keyword)` rows to prevent intra-sync duplicates (noted in ARCHITECTURE-AUDIT.md)
- `sync_errors` must live in hobbyforge.db because rules.db is fully cleared on every sync — this is a critical constraint from Phase 42 audit

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 44-sync-pipeline-hardening*
*Context gathered: 2026-05-08*
