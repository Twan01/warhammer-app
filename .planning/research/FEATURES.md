# Feature Research

**Domain:** Rules sync 2.0, extended rules schema, sync metadata/tracking, manual overrides, version comparison — HobbyForge v0.2.6 Rules Data Hub
**Researched:** 2026-05-07
**Confidence:** HIGH (based on direct codebase inspection of all relevant files; the existing system state is fully known)

---

## Baseline: What Already Exists (Do Not Rebuild)

This is a subsequent milestone. The following rules infrastructure is already fully implemented:

**Fully wired (schema + sync + UI):**
- 12-CSV parallel fetch from Wahapedia via `useRulesSync` (Factions, Source, Datasheets, Datasheets_models, Datasheets_abilities, Datasheets_keywords, Datasheets_wargear, Abilities, Stratagems, Detachments, Detachment_abilities, Last_update)
- Rust `bulk_sync_rules` command: receives all 12 parsed data types, runs DELETE-then-INSERT in a single transaction for all 11 `rw_*` tables
- `rules_002_wargear_abilities.sql` migration: creates `rw_datasheets_wargear`, `rw_abilities`, `rw_stratagems`, `rw_detachments`, `rw_detachment_abilities`
- `rw_sync_meta` table with `last_sync_at` and `wahapedia_version`; written inside sync transaction
- PlaybookTab: stats, weapons (from `rw_datasheets_wargear`), datasheet abilities (from `rw_datasheet_abilities`), keywords, sources, "Last synced" label, sync trigger button

**Stored in DB but NOT exposed in UI — gap is entirely on the read/display side:**
- `rw_stratagems` — data synced, no `getStratagems*` query function, no UI section
- `rw_detachments` — data synced, no `getDetachments*` query function, no UI section
- `rw_detachment_abilities` — data synced, no `getDetachmentAbilities*` query function, no UI section
- `rw_abilities` (shared faction abilities) — data synced, no `getSharedAbilities*` query function, no UI section

**Missing infrastructure entirely:**
- No import log table (sync history, row counts per run, error records)
- No manual override persistence (user edits stats today with no override flag; re-import silently replaces)
- No version comparison (no snapshot before DELETE, no diff after INSERT)
- `useRulesSync` returns `rowCounts` but does NOT include counts for stratagems, detachment_abilities, or shared_abilities

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features that are directly required for the milestone goal — "reliable personal rules and points reference." Missing these means the extended sync data is stored but invisible, and the sync system is opaque.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Stratagems display in PlaybookTab | The sync already fetches and stores all stratagems. Showing nothing from `rw_stratagems` in the UI makes the entire extended sync feel broken. Core wargame reference — every 40K player needs quick access to their faction's stratagems. | MEDIUM | New `getStratagemsByFaction(factionId)` query + TanStack Query hook + collapsible section in PlaybookTab. `rw_stratagems` has: id, faction_id, name, type, cp_cost, legend, turn, phase, detachment, detachment_id, description. Group by `phase` for usability. |
| Detachments display in PlaybookTab | Detachments define an army's special rules in 10th edition. Showing the user's faction's detachments (name, type, legend) is foundational context for list building. Data already in `rw_detachments`. | LOW | New `getDetachmentsByFaction(factionId)` query + hook + simple list section in PlaybookTab. Schema: id, faction_id, name, legend, type. |
| Detachment abilities display | Detachments without their abilities are useless. `rw_detachment_abilities` (description, detachment_id) must be shown alongside each detachment. | MEDIUM | New `getDetachmentAbilitiesByDetachment(detachmentId)` query or eager JOIN in `getDetachmentsByFaction`. Display grouped under each detachment. Schema: id, faction_id, name, legend, description, detachment, detachment_id. |
| Shared faction abilities display | Faction-wide abilities (e.g. "And They Shall Know No Fear" for Space Marines) apply to all units. Currently invisible despite being stored in `rw_abilities`. | LOW | New `getSharedAbilitiesByFaction(factionId)` query + hook + section in PlaybookTab. Schema: id, name, legend, faction_id, description. |
| Sync row counts surfaced in UI | After a sync run, the user has no way to verify that data landed correctly. The `useRulesSync` mutation already returns a `rowCounts` object — but it is missing stratagems, detachment_abilities, and shared_abilities counts, and nothing shows it to the user. | LOW | (1) Add missing count keys to the returned object in `useRulesSync`. (2) Surface counts in the sync success notification or a post-sync summary dialog. |
| Sync failure shows which file failed | Current error toast says "Sync failed — check your connection and try again". The underlying error message from `fetchCsv()` already contains the filename. | LOW | Improve `onError` in PlaybookTab's `handleSyncClick` to extract and display the filename from `err.message`. No hook change needed. |
| Last sync date accessible outside PlaybookTab | Currently "Last synced" only appears in PlaybookTab (unit detail). The sync trigger dialog and any future Rules Hub page also need this. | LOW | `useRulesSyncMeta` hook exists and returns `rw_sync_meta`. Just consume it in `DatasheetImportDialog` and any new Rules Hub component. Zero new code. |

### Differentiators (Competitive Advantage)

Features that go beyond showing the already-stored data — adding traceability, safety, and change awareness that no consumer hobby app provides for local rules data.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Import log / sync history | User can see every sync event: timestamp, Wahapedia version, row counts per table, success/failure status, error message if any. Transforms sync from a black box into an auditable operation. | MEDIUM | New `rw_import_log` table (rules_003 migration): `id INTEGER PK`, `synced_at TEXT`, `wahapedia_version TEXT`, `row_counts TEXT` (JSON blob), `status TEXT` (success/partial/error), `error_message TEXT`. Appended after each sync run. `useRulesSync` writes the log row on success/error via `getRulesDb()`. UI: history list in a new Rules Hub section or modal. |
| Manual override persistence with override flag | When the user edits a stat field (e.g. changes W from 2 to 3 after a re-balance), there is currently no way to distinguish "I entered this myself" from "this was imported". On re-sync + re-import, the user sees a generic conflict dialog. Override records would let the UI say "You have a manual override (W=3) — Wahapedia shows W=2" instead of a generic field diff. Overrides must survive re-sync. | HIGH | New `unit_stat_overrides` table in `hobbyforge.db` (migration 015): `id INTEGER PK`, `unit_id INTEGER FK`, `field_key TEXT`, `override_value TEXT`, `imported_value TEXT`, `overridden_at TEXT`. Write on save when imported value is known. Read in DatasheetImportDialog to show override context. Override wins unless user explicitly chooses "use imported". |
| Version comparison (change detection after re-sync) | Shows the user what changed since the last sync: "Fire Warriors: W changed 1→2, keyword BATTLELINE added". Directly addresses the "update points after a FAQ" use case — user knows exactly which of their linked units need re-review without opening each one. | HIGH | Requires snapshotting key fields (stats, ability names, keyword list) for each linked datasheet before `bulk_sync_rules` runs its DELETE pass. Diff is computed post-insert by comparing snapshot vs new data. Change report displayed after sync: list of affected datasheets with field-level diffs. Snapshot can be taken in TypeScript via `getRulesDb()` before `invoke("bulk_sync_rules")`. |
| Freshness indicator per-datasheet in PlaybookTab | Each PlaybookTab currently shows "Last synced: [date]" which is the global sync date, not per-datasheet. Adding the Wahapedia source version (from `rw_sources.version` via `rw_datasheets.source_id`) gives per-datasheet provenance. | LOW | Already queryable: `getFullDatasheet` already fetches the source row. Just render `source.version` and `source.errata_date` in the PlaybookTab header alongside the global sync date. Zero new queries. |
| Stratagem phase grouping | In PlaybookTab and later in Game Day Mode (v2.8), stratagems are far more useful when grouped by game phase (Command / Movement / Shooting / Charge / Fight / End). `rw_stratagems.phase` already stores this. | LOW | Pure UI grouping — `Array.groupBy` or a reduce on the fetched stratagems array. No query change needed. Renders as phase-labeled collapsible groups. |
| Detachment-filtered stratagem view | When a user plays a specific detachment, they only want stratagems for that detachment, not the full faction list. `rw_stratagems.detachment_id` FK already exists. | LOW | Optional `detachmentId` param on `getStratagemsByFaction` — adds `AND (detachment_id IS NULL OR detachment_id = $2)` when provided. UI: detachment selector above stratagem list. Dependency: user must have selected or linked a detachment. |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Auto-apply re-sync to override fields | "Why confirm every time?" | Violates non-negotiable constraint #5: "Manual overrides must always be possible." Silent overwrite destroys user-authored data. | Override comparison dialog with "keep override" as default choice, not "use imported." Low friction: only shown when override differs from incoming value. |
| Automatic scheduled sync (background) | "I want it always current" | Tauri has no scheduler. Background network calls without user intent violate local-first ethos. Silent sync could fail with no feedback. | "Last synced N days ago" label with one-click "Sync now." Friction is appropriate — sync is an intentional user action on an infrequently changing data source. |
| Points import from any source | "Wahapedia has points in some CSVs" | Legal constraint — copyrighted GW points cannot be imported. Points data in Wahapedia CSVs is not included in the official CSV export set. User-entered point tiers are the correct approach per PROJECT.md. | Keep user-entered `unit_point_tiers`. Surface "points last verified" date using the sync timestamp + override system. |
| Wahapedia HTML scraping (fallback when CSVs fail) | "CSVs sometimes break" | Violates Wahapedia ToS, fragile against DOM changes, legally riskier. | Treat CSV format changes as a versioned breaking event. Log the failure clearly. Wait for Wahapedia to restore/update CSVs. The import log makes this transparent. |
| Full codex/rulebook text import | "I want all rules in one app" | GW copyright. The community CSV data (Wahapedia) is the legal ceiling for what can be imported. Anything beyond unit stats, abilities, weapons, stratagems, and detachments is off-limits. | Strategy notes and personal ability notes fields in PlaybookTab cover user-authored rules reminders. |
| Sync progress bar with per-file status | "I want to see each CSV downloading" | 12 CSV fetches run in `Promise.all` in under 3 seconds on a typical connection. Progress granularity adds complexity for minimal benefit in a personal tool. | Single loading state with spinner + post-sync row count summary. |

---

## Feature Dependencies

```
[Stratagems display]
    requires──> rw_stratagems populated by bulk_sync_rules (DONE)
    requires──> getStratagemsByFaction() query (NEW)
    requires──> useStratagems() hook (NEW)
    enables──> Stratagem phase grouping (pure UI on top of same data)
    enables──> Detachment-filtered stratagem view (optional filter param)
    enables──> Game Day Mode stratagem reminders (v2.8 — depends on this)

[Detachments display]
    requires──> rw_detachments populated (DONE)
    requires──> getDetachmentsByFaction() query (NEW)
    enables──> Detachment-filtered stratagem view
    enables──> Game Day Mode detachment rules (v2.8)
    enables──> Army List detachment field (v2.7 — needs detachment list to show)

[Detachment abilities display]
    requires──> rw_detachment_abilities populated (DONE)
    requires──> Detachments display (needs detachment context to group under)
    requires──> getDetachmentAbilitiesByDetachment() query (NEW)

[Shared faction abilities display]
    requires──> rw_abilities populated (DONE)
    requires──> getSharedAbilitiesByFaction() query (NEW)

[Import log]
    requires──> rules_003 migration (rw_import_log table)
    requires──> Write in useRulesSync onSuccess + onError
    enables──> Sync history UI
    independent of all other features — can be Phase 44 or Phase 45

[Manual override persistence]
    requires──> migration 015 (unit_stat_overrides in hobbyforge.db)
    requires──> Override write path: detect when saving a stat that has a known imported value
    requires──> Override read path: DatasheetImportDialog shows override context
    enables──> Version comparison (override-aware diff highlighting)
    conflicts──> Current implicit "imported fields have no memory" behaviour

[Version comparison]
    requires──> Pre-sync snapshot of linked datasheets before DELETE-INSERT runs
    requires──> Post-sync diff computation comparing snapshot vs new rw_* rows
    enhances──> Manual override persistence (show "you have an override on this changed field")
    conflicts──> bulk_sync_rules DELETE-all strategy (snapshot must be taken before DELETE)
    NOTE: snapshot taken in TypeScript before invoke("bulk_sync_rules"), not in Rust

[TypeScript types: RwStratagem, RwDetachment, RwDetachmentAbility]
    required by──> all extended display features
    currently missing from src/types/datasheet.ts
```

### Dependency Notes

- **No schema changes needed for extended display.** All four hidden data types (`rw_stratagems`, `rw_detachments`, `rw_detachment_abilities`, `rw_abilities`) already have complete tables and populated data. Phase 43 is purely query + hook + UI work.
- **Version comparison must snapshot before the DELETE pass.** The current `bulk_sync_rules` strategy is DELETE all rows then INSERT fresh. The snapshot for comparison must be taken in TypeScript via `getRulesDb()` immediately before `invoke("bulk_sync_rules")`. Doing it inside Rust would require changes to the Rust command interface; doing it in TypeScript is lower risk.
- **Manual overrides depend on a new hobbyforge.db migration.** This is migration 015 — additive, no existing data touched.
- **Import log is fully independent.** Can ship in any phase without blocking anything else. Recommend Phase 44 alongside sync pipeline cleanup.

---

## Phase-by-Phase Feature Assignment

Aligned with v0.2.6 phases 42–46:

### Phase 42 — Architecture Audit (no code)
- Confirm the above findings: sync is fully wired end-to-end; all extended tables exist and are populated on sync
- Document: which Wahapedia CSV fields map to which `rw_*` columns (needed for snapshot/diff logic)
- Produce the architecture note required before implementation begins

### Phase 43 — Extended Rules Schema (read side + TypeScript types + UI)
- New TypeScript types: `RwStratagem`, `RwDetachment`, `RwDetachmentAbility` in `src/types/datasheet.ts`
- New query functions in `src/db/queries/datasheets.ts`: `getStratagemsByFaction`, `getDetachmentsByFaction`, `getDetachmentAbilitiesByDetachment`, `getSharedAbilitiesByFaction`
- New hooks: `useStratagems(factionId)`, `useDetachments(factionId)`, `useSharedAbilities(factionId)`
- PlaybookTab new sections: Shared Faction Abilities, Detachments + Abilities, Stratagems (grouped by phase)
- Fix `useRulesSync` row counts: add `stratagems`, `detachment_abilities`, `shared_abilities` keys

### Phase 44 — Sync Pipeline Extension
- `rules_003` migration: `rw_import_log` table
- `useRulesSync`: write import log entry on success (with row counts JSON) and on error
- Improve sync error toast: extract filename from error message and surface it
- `useRulesSyncMeta` / `getImportLog` query: read last N import log entries for UI
- Row count display in sync success notification

### Phase 45 — Sync Metadata & Import Tracking
- Rules Hub UI: dedicated section (new page or Settings-adjacent panel) showing sync history from `rw_import_log`
- Freshness indicator per-datasheet: render `source.version` + `source.errata_date` in PlaybookTab using already-fetched source row
- Last sync date in `DatasheetImportDialog` (already accessible via `useRulesSyncMeta`)

### Phase 46 — Manual Overrides & Version Comparison
- `migration 015`: `unit_stat_overrides` table in `hobbyforge.db`
- Override write path: when user saves a PlaybookTab stat that was previously imported, record override vs imported value
- Override read path: DatasheetImportDialog shows override badge; `useDatasheet` invalidation checks for overrides
- Pre-sync snapshot: capture current stat/ability/keyword values for all linked datasheets before `invoke("bulk_sync_rules")`
- Post-sync diff computation: compare snapshot vs new `rw_*` rows; build change list
- Change report UI: post-sync summary showing affected units and changed fields

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Stratagems display | HIGH | MEDIUM | P1 |
| Detachments + abilities display | HIGH | LOW-MEDIUM | P1 |
| Shared faction abilities display | MEDIUM | LOW | P1 |
| Sync row counts surfaced | MEDIUM | LOW | P1 |
| Sync error detail (filename) | LOW | LOW | P1 |
| TypeScript types for extended data | Enabler | LOW | P1 |
| Import log / sync history | MEDIUM | MEDIUM | P2 |
| Freshness indicator per-datasheet | MEDIUM | LOW | P2 |
| Stratagem phase grouping | MEDIUM | LOW | P2 (on top of P1) |
| Detachment-filtered stratagem view | MEDIUM | LOW | P2 |
| Manual override persistence | HIGH | HIGH | P2 |
| Version comparison after re-sync | HIGH | HIGH | P2 |

**Priority key:**
- P1: Must ship for the milestone to be considered functional
- P2: Should ship to achieve the "reliable personal rules reference" goal
- P3: Nice to have, defer to later milestone if time-constrained

---

## Existing Infrastructure to Reuse

The following must NOT be reimplemented:

| Existing Piece | How v0.2.6 Reuses It |
|----------------|---------------------|
| `useRulesSync` hook | Extend in-place: fix row counts, add import log write, improve error toast |
| `bulk_sync_rules` Rust command | No changes needed — all 11 extended tables already handled |
| `getRulesDb()` singleton | Used by new query functions for stratagems/detachments/abilities |
| `useRulesSyncMeta()` hook | Already reads `rw_sync_meta`; expose in more UI locations |
| `getFullDatasheet()` query | Already fetches source row with version/errata_date — just display it |
| `DatasheetImportDialog` | Extend to show override context; add last-sync-date |
| PlaybookTab collapsible pattern | Use same `<Collapsible>` + `<CollapsibleContent>` pattern for new sections |
| `RULES_SYNC_META_KEY` invalidation | Already invalidated by `useRulesSync` onSuccess; new hooks can share this pattern |

---

## Sources

- Direct codebase inspection: `src/hooks/useRulesSync.ts` — confirmed 12-CSV fetch + complete Rust invoke payload
- Direct codebase inspection: `src-tauri/src/lib.rs` — confirmed all 11 extended table DELETE+INSERT blocks in `bulk_sync_rules`
- Direct codebase inspection: `src-tauri/migrations/rules_002_wargear_abilities.sql` — confirmed complete schema for wargear, abilities, stratagems, detachments, detachment_abilities
- Direct codebase inspection: `src/features/units/PlaybookTab.tsx` — confirmed NO sections for stratagems, detachments, shared abilities
- Direct codebase inspection: `src/db/queries/datasheets.ts` — confirmed absence of getStratagems*, getDetachments*, getSharedAbilities* functions
- Direct codebase inspection: `src/types/datasheet.ts` — confirmed absence of RwStratagem, RwDetachment, RwDetachmentAbility types
- Direct codebase inspection: `src/db/rules-client.ts` — confirmed singleton pattern and WAL/FK-ON settings
- `.planning/milestones/v3.0-ROADMAP.md` — Milestone 3.2 requirements
- `.planning/milestones/v3.0-PHASES.md` — Phase 42–46 breakdown with risk notes
- `.planning/PROJECT.md` — non-negotiable constraints, key decisions

---

*Feature research for: HobbyForge v0.2.6 — Rules Sync 2.0 / Rules Data Hub*
*Researched: 2026-05-07*
