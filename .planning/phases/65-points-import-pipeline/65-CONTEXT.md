# Phase 65: Points Import Pipeline - Context

**Gathered:** 2026-05-13
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase extends the Wahapedia sync pipeline to import official points data into rules.db, adds freshness badges to army lists and the rules hub, implements delta detection showing per-unit point changes after sync, and updates all COALESCE query sites to the 5-level precedence chain. No new pages are created — this integrates into existing army list, rules hub, and sync surfaces. Import history and delta audit data live in hobbyforge.db (survive re-syncs).

</domain>

<decisions>
## Implementation Decisions

### Points Data Source & Storage (PI-01, PI-02)
- **D-01:** Points data flows through the existing Wahapedia sync pipeline — extend `RULES_SYNC_FILES` to include the points CSV from Wahapedia (researcher must verify which CSV contains points data and the exact column names). This is NOT a separate user-initiated CSV import flow.
- **D-02:** Synced points data goes in **rules.db** (consistent with roadmap SC#1: "Rules.db schema extended"). Points are rules data that get refreshed on every sync, just like datasheets, stratagems, etc. This diverges from the design doc (`points-import-design.md`) which put points in hobbyforge.db — the roadmap evolved the approach to "extend Wahapedia sync."
- **D-03:** Import history / delta audit data (`points_import_history`) goes in **hobbyforge.db** — this is user-generated audit data that must survive rules.db re-syncs. Schema follows the design doc's `points_import_history` table with `imported_at`, `source_file`, `version`, `row_count`, `delta_added`, `delta_removed`, `delta_changed`.
- **D-04:** The design doc's `points_imports` table in hobbyforge.db is NOT needed if points flow through Wahapedia sync into rules.db. Instead, extend the existing rules.db datasheets table (or create a dedicated `datasheet_points` table in rules.db) — researcher should determine the optimal schema based on Wahapedia CSV structure.
- **D-05:** `faction_id` matching uses Wahapedia text keys (e.g., `"SM"` for Space Marines), consistent with `unit_overrides` and existing rules.db patterns. NOT the integer `factions.id` from hobbyforge.db.

### 5-Level COALESCE Chain (PI-05)
- **D-06:** The COALESCE precedence order follows the design doc: `COALESCE(alu.points_override, synced_points, uo.points, u.points, 0)` where `synced_points` comes from rules.db via a LEFT JOIN on the points data.
- **D-07:** Rationale for synced_points > uo.points: imported official points are more authoritative than a manual unit-level override (which may have been set when official data was unavailable). Per-list override (`alu.points_override`) always wins — explicit per-game intent.
- **D-08:** All 3 COALESCE sites in `src/db/queries/armyLists.ts` updated atomically:
  1. `getArmyListWithUnits` (line 49) — single unit effective_points
  2. `getArmyListReadiness` (line 197) — total_points SUM
  3. `getArmyListReadiness` (line 199) — battle_ready_points conditional SUM
- **D-09:** Dashboard stats queries (`src/db/queries/dashboard.ts` lines 93-95) use `COALESCE(u.points, 0)` for total collection value — this is a different concern (collection-level, not army-list-level) and does NOT get the 5-level chain. The dashboard shows what the user entered in their collection, not the effective army list points.
- **D-10:** The LEFT JOIN for synced points in army list queries follows the design doc pattern: `LEFT JOIN <points_table> ON unit_name = u.name AND (faction_id IS NULL OR faction_id = u.faction_id)` — the IS NULL OR condition allows globally-scoped points to match all factions.

### Freshness Badges (PI-03)
- **D-11:** Reuse existing `src/lib/syncFreshness.ts` tiers (fresh/aging/stale/never) — points freshness equals sync freshness since points come from the same Wahapedia sync pipeline. No separate freshness system needed.
- **D-12:** Add freshness badges to: (a) army list cards/detail showing points freshness status, (b) rules hub SyncStatusCard extended with "includes points" indication. Reuse `FRESHNESS_DOT_CLASS` and `getSyncAgeLabel` from syncFreshness.ts.
- **D-13:** Army list freshness badge shows "stale/fresh/unknown" based on last sync date. A list with units that have no synced points shows "unknown" (neutral, not warning). The 30-day staleness threshold from the design doc is superseded by the existing 7/14-day tiers in syncFreshness.ts.

### Delta Detection (PI-04)
- **D-14:** Delta detection extends the existing snapshot/diff pattern (`src/db/queries/rulesSnapshot.ts` + `src/lib/computeSyncDiff.ts`). Before sync, snapshot current points; after sync, compare and compute deltas per unit (increased/decreased/new/removed).
- **D-15:** Delta summary integrates into the existing RulesHubPage sync diff display — add a "Points Changes" section alongside existing rules diff (stats, keywords, abilities). Follow the existing `SyncDiff` type extension pattern (`ExtendedSnapshotData`).
- **D-16:** Army list impact: after sync, compute which army lists contain units with changed points and surface this in the delta display (e.g., "3 army lists affected: List A, List B, List C").
- **D-17:** Delta counts (`delta_added`, `delta_removed`, `delta_changed`) are written to `points_import_history` in hobbyforge.db after each sync. This provides audit trail for "what changed when."

### Sync Pipeline Extension
- **D-18:** Extend the Rust `bulk_sync_rules` command in `src-tauri/src/lib.rs` to also INSERT points data during the sync transaction. The Rust command already handles 11 tables — adding a points table follows the same pattern.
- **D-19:** The `RustSyncResult` interface in `useRulesSync.ts` gains a `points: number` field for the row count of imported points entries.
- **D-20:** Cache invalidation after sync must also invalidate army list query keys (`ARMY_LISTS_KEY`, `ARMY_LIST_READINESS_KEY`) since effective_points change when synced points change.

### Claude's Discretion
- Whether to add points as columns on the existing `datasheets` table in rules.db or create a separate `datasheet_points` table (depends on Wahapedia CSV structure — researcher decides)
- Exact visual treatment of freshness badge on army list cards (dot + tooltip vs. badge component vs. banner)
- Whether the delta display shows a full unit-by-unit diff or just summary counts with expandable details
- Loading/skeleton state for freshness badges while sync data is loading
- Whether to show a pre-sync confirmation dialog with estimated changes (nice-to-have, not required)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Points Import Design (MUST READ)
- `.planning/points-import-design.md` — Original design doc for points import schema, versioning, delta computation, COALESCE chain, army list impact. NOTE: some decisions have been updated by this CONTEXT.md (storage location changed from hobbyforge.db to rules.db for synced points).

### Army List Queries (MUST READ — all COALESCE sites)
- `src/db/queries/armyLists.ts` — Contains all 3 COALESCE query sites that need updating (getArmyListWithUnits line 49, getArmyListReadiness lines 197/199)
- `src/types/armyList.ts` — ArmyListUnitRow type with effective_points field
- `src/types/unitOverride.ts` — UnitOverride type used in existing COALESCE chain

### Sync Pipeline (MUST READ — integration target)
- `src/hooks/useRulesSync.ts` — Main sync hook: fetches 12 Wahapedia CSVs, calls Rust bulk_sync_rules
- `src-tauri/src/lib.rs` — Rust backend: bulk_sync_rules command, migration registration
- `src/lib/parseWahapediaCsv.ts` — CSV parsing utility
- `src/lib/validateCsvHeaders.ts` — CSV header validation

### Sync Metadata & Freshness (READ for context)
- `src/lib/syncFreshness.ts` — SyncFreshness type, getSyncFreshness(), FRESHNESS_DOT_CLASS
- `src/features/rules-hub/SyncStatusCard.tsx` — Existing freshness display on RulesHubPage
- `src/db/queries/datasheets.ts` — getRulesSyncMeta() for last sync date/version

### Snapshot & Diff (READ for context)
- `src/db/queries/rulesSnapshot.ts` — Pre/post sync snapshot capture
- `src/lib/computeSyncDiff.ts` — SyncDiff computation, ExtendedSnapshotData type
- `src/features/rules-hub/RulesHubPage.tsx` — Sync diff display integration point

### Dashboard Queries (READ for context — NOT updated)
- `src/db/queries/dashboard.ts` — Uses COALESCE(u.points, 0) for collection value — different concern, not updated by this phase

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `parseWahapediaCsv` (src/lib/): CSV parsing for all Wahapedia files — reuse for points CSV
- `validateCsvHeaders` (src/lib/): Header validation pattern — extend for points CSV headers
- `syncFreshness.ts` (src/lib/): Freshness tiers + dot classes + age labels — reuse directly for points freshness
- `computeSyncDiff` (src/lib/): Diff computation with ExtendedSnapshotData — extend for points deltas
- `capturePreSyncSnapshot` / `getLatestSnapshot` (src/db/queries/): Pre-sync snapshot pattern — extend to capture points
- `SyncStatusCard` (src/features/rules-hub/): Existing freshness UI — extend with points awareness
- `StaleDataBanner` (src/features/army-lists/): Existing stale data warning on army lists — may extend for points staleness

### Established Patterns
- Rust `bulk_sync_rules`: DELETE-all + bulk INSERT in single transaction with FK checks disabled — points table follows same pattern
- `RustSyncResult` interface mirrors Rust struct via Tauri IPC — extend with points field
- Post-sync cache invalidation: `RULES_SYNC_META_KEY`, `SYNC_ERRORS_KEY` already invalidated — add army list keys
- LEFT JOIN for overrides: `LEFT JOIN unit_overrides uo ON uo.unit_id = u.id` — points join follows same pattern
- `staleTime: Infinity` for rules.db hooks + sync-triggered invalidation — points hooks should follow same pattern
- `insertSyncError` for sync error logging — reuse for points-specific errors

### Integration Points
- `useRulesSync.ts`: Add points CSV fetch to RULES_SYNC_FILES, pass parsed points to Rust command
- `lib.rs`: Extend `bulk_sync_rules` to accept and INSERT points rows, extend `RustSyncResult`
- `armyLists.ts`: Add LEFT JOIN for synced points + update COALESCE chain in 3 queries
- `RulesHubPage.tsx`: Add points delta section to sync diff display
- `ArmyListDetailSheet.tsx`: Add freshness badge near points total

</code_context>

<specifics>
## Specific Ideas

No specific requirements beyond the roadmap success criteria. Auto-mode resolved all gray areas using the points import design doc as the primary reference, adapted for the roadmap's "extend Wahapedia sync" approach rather than standalone CSV import.

Key adaptation from design doc: points storage moved from hobbyforge.db to rules.db since points now come through Wahapedia sync (rules data that refreshes on every sync), not through a separate user-initiated import flow.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 65-Points Import Pipeline*
*Context gathered: 2026-05-13*
