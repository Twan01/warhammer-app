# Phase 42 — Architecture Audit & Pre-flight: Context

**Created:** 2026-05-08
**Phase goal:** Audit current sync pipeline, confirm rules.db schema state, identify gaps, produce architecture note — no code changes
**Requirements:** AUDIT-01, AUDIT-02, AUDIT-03, AUDIT-04

## Decisions

### 1. Architecture Note Format

**Decision:** Single formal markdown document with sections matching each AUDIT requirement. The note lives at `.planning/phases/42-architecture-audit/ARCHITECTURE-AUDIT.md` and becomes the reference document for Phases 43–46.

**Why:** A structured document that downstream researchers and planners can reference directly. Each AUDIT requirement maps to a headed section so traceability is clear.

**Sections:**
1. Schema State (AUDIT-01) — table inventory + population status
2. Sync Data Flow (AUDIT-02) — end-to-end trace from TypeScript fetch to SQLite
3. TypeScript Gaps (AUDIT-03) — missing types, queries, hooks per extended table
4. Migration Proposal (AUDIT-04) — what new tables/columns are needed for Phases 45–46

### 2. Verification Method for "Tables Exist and Are Populated"

**Decision:** Code-path inspection only. Trace through `useRulesSync.ts` CSV fetch → `bulk_sync_rules` Rust INSERT for each table. Confirm that the migration DDL exists and the Rust handler has INSERT statements for every table. No runtime testing required.

**Why:** This is a read-only audit. The sync pipeline is already shipped (v2.1 Phase 15). We verify by reading the code, not by running a sync. The architecture note documents what the code proves.

**Verification checklist per table:** Migration DDL exists → Rust DELETE row exists → Rust INSERT loop exists → TypeScript data flows to Rust payload.

### 3. Gap Classification Strategy

**Decision:** Organize gaps by downstream phase, not by severity. Each gap is tagged to its AUDIT requirement AND to the phase that will close it (43/44/45/46).

**Why:** Downstream planners need to know "what do I need to build in MY phase?" not "how bad is this gap?" Phase-grouped gaps let the Phase 43 planner skip Phase 45 concerns.

**Gap categories:**
- Phase 43 gaps: Missing TypeScript types, query functions, hooks for extended rules data
- Phase 44 gaps: Sync pipeline extensions needed (currently already complete for base data)
- Phase 45 gaps: Missing sync metadata tables (error logs, per-table row counts, source registry)
- Phase 46 gaps: Missing override tables in hobbyforge.db, missing snapshot tables for versioning

### 4. Migration Proposal Detail Level

**Decision:** Table name + column sketch with rationale. NOT full DDL. Full CREATE TABLE statements are Phase 43/45/46's job.

**Why:** The audit proposes WHAT's needed and WHERE it goes. The implementor decides the exact DDL. Over-specifying DDL in the audit creates rigid coupling to a proposal that may change during research.

**Format per proposed table:**
```
Table: rw_<name> (rules.db) or <name> (hobbyforge.db)
Purpose: <one line>
Key columns: <list>
Phase: <which phase creates it>
```

### 5. Sync Pipeline Assessment Scope

**Decision:** Document the EXISTING pipeline completely (AUDIT-02) then note where it's already sufficient vs. where extensions are needed. The current pipeline already handles all 12 CSV types including the extended tables from rules_002.

**Why:** Codebase scout reveals the sync pipeline is more complete than the roadmap assumed. The Rust `bulk_sync_rules` already inserts wargear, shared abilities, stratagems, detachments, and detachment abilities. The TypeScript side already fetches all 12 CSVs. The gap is on the READ side (types/queries/hooks to surface the data), not the WRITE side.

**Key finding:** Phase 44 (Sync Pipeline Extension) may have less work than expected — the pipeline already syncs extended data. The real work is Phase 43 (making it queryable) and Phase 45 (adding metadata/tracking).

### 6. What the Audit Does NOT Cover

**Decision:** The audit does not:
- Propose UI changes (that's Phases 43–46)
- Benchmark sync performance (not needed for personal tool)
- Audit Wahapedia CSV format stability (acknowledged as risk, not investigable)
- Recommend ORM or schema changes to the core pattern

**Why:** Scope guardrail. The audit answers "what exists, what's missing, what's needed" — not "how should we redesign."

## Code Context

### Current Schema State (from codebase scout)

**rules.db — 2 migrations:**

Migration 001 (`rules_001_schema.sql`):
- `rw_factions` (id TEXT PK, name)
- `rw_datasheets` (id TEXT PK, name, faction_id FK, source_id, role, damaged_w, damaged_description)
- `rw_datasheet_models` (datasheet_id FK, line, name, M, T, Sv, inv_sv, W, Ld, OC — PK: datasheet_id+line)
- `rw_datasheet_abilities` (datasheet_id FK, line, ability_id, name, description, type, parameter — PK: datasheet_id+line)
- `rw_datasheet_keywords` (datasheet_id FK, keyword, is_faction_keyword)
- `rw_sources` (id TEXT PK, name, type, edition, version, errata_date)
- `rw_sync_meta` (id INTEGER PK CHECK id=1, last_sync_at, wahapedia_version)

Migration 002 (`rules_002_wargear_abilities.sql`):
- `rw_datasheets_wargear` (datasheet_id, line, line_in_wargear, dice, name, description, range, type, A, BS_WS, S, AP, D — PK: datasheet_id+line+line_in_wargear)
- `rw_abilities` (id TEXT PK, name, legend, faction_id, description)
- `rw_stratagems` (id TEXT PK, faction_id, name, type, cp_cost, legend, turn, phase, detachment, detachment_id, description)
- `rw_detachments` (id TEXT PK, faction_id, name, legend, type)
- `rw_detachment_abilities` (id TEXT PK, faction_id, name, legend, description, detachment, detachment_id)

### Current Sync Pipeline

**TypeScript side** (`src/hooks/useRulesSync.ts`):
- Fetches 12 CSVs: Factions, Source, Datasheets, Datasheets_models, Datasheets_abilities, Datasheets_keywords, Datasheets_wargear, Abilities, Stratagems, Detachments, Detachment_abilities, Last_update
- Parses all with `parseWahapediaCsv`, strips HTML from description fields
- Sends complete payload to Rust `bulk_sync_rules` command
- Returns `wahapediaVersion` + `rowCounts` (currently 9 table counts: factions, sources, datasheets, models, abilities, keywords, wargear, stratagems, detachments)
- On success: invalidates `RULES_SYNC_META_KEY`, `datasheets-by-faction`, `datasheet`

**Rust side** (`src-tauri/src/lib.rs`):
- Opens direct SQLite connection (not plugin pool) for real transactions
- PRAGMA foreign_keys OFF → DELETE all 11 tables → INSERT all rows → write rw_sync_meta → COMMIT
- DELETE order: keywords, abilities, models, wargear, datasheets, sources, factions, abilities (shared), stratagems, detachment_abilities, detachments

### TypeScript Type/Query/Hook Gaps

**Types exist for:** RwFaction, RwDatasheet, RwDatasheetModel, RwDatasheetAbility, RwDatasheetKeyword, RwSource, RulesSyncMeta, RwDatasheetWargear, RwAbility, DatasheetSummary, FullDatasheet

**Types MISSING for:** RwStratagem, RwDetachment, RwDetachmentAbility

**Query functions exist for:** getDatasheetsByFaction, getFullDatasheet, getRulesSyncMeta, getDatasheetIdForUnit, upsertDatasheetLink, resolveWahapediaFactionIdByName, searchAllDatasheets

**Query functions MISSING for:** getStratagemsByFaction, getDetachmentsByFaction, getDetachmentAbilitiesByDetachment, getSharedAbilitiesByFaction

**React Query hooks exist for:** useDatasheet, useDatasheetsByFaction, useRulesSyncMeta, useWahapediaFactionId

**React Query hooks MISSING for:** useStratagemsByFaction, useDetachmentsByFaction, useDetachmentAbilities, useSharedAbilities

**Cache invalidation gap:** `useRulesSync.onSuccess` only invalidates 3 query keys. When new hooks are added (Phase 43), their keys must be added to the invalidation list (SYNC-05).

### Tables Not Yet Designed (Needed for Phases 45–46)

**For Phase 45 (Sync Metadata):**
- Sync error log table (in rules.db — destroyed on re-sync, OR in hobbyforge.db to persist)
- Extended sync_meta (per-table row counts, source URL, edition)

**For Phase 46 (Overrides + Versioning):**
- Override tables in hobbyforge.db (MUST be in hobbyforge.db — rules.db is destroyed on re-sync)
- Pre-sync snapshot table for change detection

## Deferred Ideas

- Faction-to-Wahapedia mapping table (currently uses fuzzy name match — works but fragile)
- Incremental sync (diff-based instead of full DELETE+INSERT) — not needed for personal tool
- Cross-database ATTACH for direct JOINs — tauri-plugin-sql limitation, dual-query merge continues

## Prior Decisions Applied

- Overrides MUST live in hobbyforge.db (from STATE.md accumulated context)
- Cross-database FKs not supported (from STATE.md)
- Dual-query merge pattern continues (from STATE.md)
- rules.db uses WAL mode + 10s busy_timeout (from STATE.md)
- No ORM — tauri-plugin-sql directly (from PROJECT.md key decisions)

---
*Context created: 2026-05-08 (auto mode — decisions made from codebase analysis)*
