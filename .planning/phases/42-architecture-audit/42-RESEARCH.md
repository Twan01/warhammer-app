# Phase 42: Architecture Audit — Research

**Researched:** 2026-05-08
**Domain:** HobbyForge rules.db sync pipeline — schema, data flow, TypeScript gaps, migration proposals
**Confidence:** HIGH (all findings sourced directly from codebase)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

1. **Architecture Note Format** — Single markdown document at `.planning/phases/42-architecture-audit/ARCHITECTURE-AUDIT.md`. Four sections matching AUDIT-01 through AUDIT-04. Becomes the reference document for Phases 43–46.

2. **Verification Method** — Code-path inspection only. Trace migration DDL + Rust DELETE/INSERT + TypeScript payload. No runtime sync required. Checklist per table: DDL exists → Rust DELETE exists → Rust INSERT loop exists → TypeScript payload field present.

3. **Gap Classification** — Organize gaps by downstream phase (43/44/45/46), not by severity.

4. **Migration Proposal Detail Level** — Table name + column sketch + rationale. NOT full DDL. Full CREATE TABLE is each implementing phase's responsibility.

5. **Sync Pipeline Assessment Scope** — Document the EXISTING pipeline completely (AUDIT-02), then note where it is sufficient vs. where extensions are needed. The pipeline is already more complete than the roadmap assumed — gaps are on the READ side (TypeScript types/queries/hooks), not the WRITE side.

### Claude's Discretion

None specified — all decisions are locked.

### Deferred Ideas (OUT OF SCOPE)

- Faction-to-Wahapedia mapping table (fuzzy name match works, acknowledged as fragile)
- Incremental sync (diff-based instead of full DELETE+INSERT)
- Cross-database ATTACH for direct JOINs (tauri-plugin-sql limitation)
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| AUDIT-01 | Architecture note confirms all rw_* extended tables exist and are populated after sync | DDL verified in rules_002_wargear_abilities.sql; Rust INSERT loops confirmed for all 5 extended tables in lib.rs |
| AUDIT-02 | Architecture note documents the full sync data flow from TypeScript fetch to Rust transaction to SQLite | Complete end-to-end trace available: useRulesSync.ts → invoke("bulk_sync_rules") → lib.rs BulkSyncPayload → sqlx INSERT → rw_sync_meta commit |
| AUDIT-03 | Architecture note identifies all TypeScript type, query function, and React Query hook gaps | 3 missing types, 4 missing query functions, 4 missing hooks confirmed by reading types/datasheet.ts, db/queries/datasheets.ts, hooks/useDatasheet.ts |
| AUDIT-04 | Architecture note proposes migration plan for sync_meta, sync_errors, rules_snapshot, and unit_overrides tables | Column-sketch proposals ready for 4 table groups; database placement (rules.db vs hobbyforge.db) determined by sync-destroy constraint |
</phase_requirements>

---

## Summary

Phase 42 is a read-only audit. No code changes are made. The output is a single ARCHITECTURE-AUDIT.md document that downstream phases (43–46) consume as their primary reference.

The sync pipeline is significantly more complete than the v2.6 roadmap anticipated. Both migration files are applied (rules_001 and rules_002), the Rust `bulk_sync_rules` handler inserts all 11 rw_* tables including stratagems, detachments, detachment_abilities, and shared abilities, and the TypeScript side fetches and strips HTML from all 12 CSVs. The pipeline WRITE path is essentially done. The gap is entirely on the READ side — TypeScript types, query functions, and React Query hooks do not exist for stratagems, detachments, detachment_abilities, or shared abilities (rw_abilities).

The audit also surfaces a structural design constraint that governs Phases 45 and 46: rules.db is fully destroyed (DELETE all rows) on every sync, so any persistent data — error logs, snapshots, user overrides — must live in hobbyforge.db. This constraint is already captured in STATE.md and CONTEXT.md but must be documented prominently in the architecture note.

**Primary recommendation:** Write ARCHITECTURE-AUDIT.md by direct code tracing. All findings are deterministic — no ambiguity, no need for runtime testing.

---

## Standard Stack

This phase produces documentation, not code. The "stack" is the existing project stack being documented.

### Technologies Being Audited

| Component | Location | Purpose |
|-----------|----------|---------|
| `rules_001_schema.sql` | `src-tauri/migrations/` | Base rules.db schema (7 tables) |
| `rules_002_wargear_abilities.sql` | `src-tauri/migrations/` | Extended rules.db schema (5 tables) |
| `src-tauri/src/lib.rs` | `bulk_sync_rules` fn | Rust sync handler — DELETE + INSERT transaction |
| `src/hooks/useRulesSync.ts` | hooks layer | TypeScript CSV fetch + Rust invoke |
| `src/db/queries/datasheets.ts` | queries layer | Existing read queries for rules.db |
| `src/hooks/useDatasheet.ts` | hooks layer | Existing React Query hooks for datasheets |
| `src/types/datasheet.ts` | types layer | Existing TypeScript interfaces for rules.db rows |
| `src/db/rules-client.ts` | DB layer | rules.db singleton (WAL + busy_timeout + FK ON) |

### Tool for Writing the Document

The ARCHITECTURE-AUDIT.md is written using the Write tool directly — no scaffolding, no CLI, no code generation.

---

## Architecture Patterns

### AUDIT-01 Finding: Schema State

All 12 rw_* tables exist and are proven populated by code-path inspection.

**Migration 001 tables (rules_001_schema.sql):**
- `rw_factions` — PK: id TEXT
- `rw_datasheets` — PK: id TEXT, FK: faction_id → rw_factions
- `rw_datasheet_models` — PK: (datasheet_id, line), FK cascade
- `rw_datasheet_abilities` — PK: (datasheet_id, line), FK cascade
- `rw_datasheet_keywords` — no PK (composite unique via INSERT semantics), FK cascade
- `rw_sources` — PK: id TEXT
- `rw_sync_meta` — PK: id INTEGER CHECK(id=1), singleton row

**Migration 002 tables (rules_002_wargear_abilities.sql):**
- `rw_datasheets_wargear` — PK: (datasheet_id, line, line_in_wargear)
- `rw_abilities` — PK: id TEXT (shared faction abilities)
- `rw_stratagems` — PK: id TEXT
- `rw_detachments` — PK: id TEXT
- `rw_detachment_abilities` — PK: id TEXT

**Verification checklist result per table:**

| Table | DDL exists | Rust DELETE | Rust INSERT | TS payload field |
|-------|------------|-------------|-------------|-----------------|
| rw_factions | rules_001 | YES | YES (loop on payload.factions) | factions |
| rw_sources | rules_001 | YES | YES | sources |
| rw_datasheets | rules_001 | YES | YES | datasheets |
| rw_datasheet_models | rules_001 | YES | YES | models |
| rw_datasheet_abilities | rules_001 | YES | YES | abilities |
| rw_datasheet_keywords | rules_001 | YES | YES | keywords |
| rw_sync_meta | rules_001 | NO (singleton INSERT OR REPLACE) | YES | last_sync_at, wahapedia_version |
| rw_datasheets_wargear | rules_002 | YES | YES | wargear |
| rw_abilities | rules_002 | YES | YES | shared_abilities |
| rw_stratagems | rules_002 | YES | YES | stratagems |
| rw_detachments | rules_002 | YES | YES | detachments |
| rw_detachment_abilities | rules_002 | YES | YES | detachment_abilities |

**Status: ALL 11 deletable tables are deleted. All 12 tables are inserted. AUDIT-01 is fully satisfied.**

**One gap in rw_sync_meta:** current schema has only `last_sync_at` and `wahapedia_version`. It does NOT store per-table row counts, source URL, or edition. This is a Phase 45 gap.

### AUDIT-02 Finding: Complete Data Flow Trace

```
Step 1: TypeScript fetch (useRulesSync.ts)
  → Promise.all(12 × fetchCsv()) using @tauri-apps/plugin-http
  → 12 CSVs: Factions, Source, Datasheets, Datasheets_models,
             Datasheets_abilities, Datasheets_keywords, Datasheets_wargear,
             Abilities, Stratagems, Detachments, Detachment_abilities, Last_update
  → Base URL: https://wahapedia.ru/wh40k10ed/{filename}

Step 2: TypeScript parsing (useRulesSync.ts)
  → parseWahapediaCsv() called on each raw CSV string → Record<string,string>[]
  → stripHtml() applied to: damaged_description, ability names+descriptions,
    wargear descriptions, shared ability descriptions,
    stratagem descriptions+legends, detachment_ability descriptions+legends
  → parseLastUpdate() extracts wahapediaVersion from Last_update.csv line 2

Step 3: Tauri IPC (useRulesSync.ts → lib.rs)
  → invoke("bulk_sync_rules", { payload: BulkSyncPayload })
  → BulkSyncPayload is a Rust struct (serde::Deserialize) with 13 fields
  → Serialized as JSON over the Tauri IPC bridge

Step 4: Rust transaction (lib.rs bulk_sync_rules)
  → Opens direct sqlx connection (NOT plugin pool) to rules.db
  → SqliteConnectOptions: WAL mode, 30s busy_timeout, create_if_missing=false
  → PRAGMA foreign_keys = OFF
  → BEGIN TRANSACTION
  → DELETE all 11 rw_* tables (order: keywords, abilities, models, wargear,
    datasheets, sources, factions, rw_abilities, stratagems, det_abilities, detachments)
  → INSERT loops for all 11 tables
  → INSERT OR REPLACE INTO rw_sync_meta (singleton row, id=1)
  → COMMIT

Step 5: TypeScript response (useRulesSync.ts)
  → bulk_sync_rules returns Result<(), String> — no row counts returned
  → TypeScript constructs rowCounts from local array lengths (9 tables counted:
    factions, sources, datasheets, models, abilities, keywords, wargear,
    stratagems, detachments — shared_abilities and detachment_abilities NOT counted)
  → Returns { wahapediaVersion, rowCounts }
  → onSuccess: invalidates RULES_SYNC_META_KEY, ["datasheets-by-faction"], ["datasheet"]
```

**Critical gap identified at Step 5:** `bulk_sync_rules` returns `()` (void). Row counts are computed client-side from local array lengths, NOT from the actual database. After a sync, if some INSERTs failed silently (e.g. due to duplicates being skipped via INSERT OR IGNORE), the row counts displayed would be inaccurate. This is SYNC-01's concern in Phase 44.

**Second gap at Step 5:** `onSuccess` invalidates only 3 query keys. When Phase 43 adds hooks for stratagems, detachments, detachment_abilities, and shared abilities, those keys must also be invalidated here (SYNC-05).

### AUDIT-03 Finding: TypeScript Gaps

**Types defined** in `src/types/datasheet.ts`:
- `RwFaction`, `RwDatasheet`, `RwDatasheetModel`, `RwDatasheetAbility`, `RwDatasheetKeyword`
- `RwSource`, `RulesSyncMeta`, `RwDatasheetWargear`, `RwAbility`
- `DatasheetSummary`, `FullDatasheet`, `DatasheetConflict`, `DatasheetImportResolution`, `DatasheetImportPayload`

**Types MISSING** (Phase 43 creates):
- `RwStratagem` — maps rw_stratagems columns: id, faction_id, name, type, cp_cost, legend, turn, phase, detachment, detachment_id, description
- `RwDetachment` — maps rw_detachments columns: id, faction_id, name, legend, type
- `RwDetachmentAbility` — maps rw_detachment_abilities columns: id, faction_id, name, legend, description, detachment, detachment_id

**Note:** `RwAbility` already exists and maps rw_abilities correctly (id, name, legend, faction_id, description). No new type needed for shared abilities.

**Query functions defined** in `src/db/queries/datasheets.ts`:
- `getDatasheetsByFaction`, `getFullDatasheet`, `getRulesSyncMeta`
- `getDatasheetIdForUnit`, `upsertDatasheetLink`
- `resolveWahapediaFactionIdByName`, `searchAllDatasheets`

**Query functions MISSING** (Phase 43 creates, likely in new file `src/db/queries/rulesExtended.ts`):
- `getStratagemsByFaction(factionId: string): Promise<RwStratagem[]>`
- `getDetachmentsByFaction(factionId: string): Promise<RwDetachment[]>`
- `getDetachmentAbilitiesByDetachment(detachmentId: string): Promise<RwDetachmentAbility[]>`
- `getSharedAbilitiesByFaction(factionId: string): Promise<RwAbility[]>`

**React Query hooks defined** in `src/hooks/useDatasheet.ts`:
- `useDatasheet(unitId)`, `useDatasheetsByFaction(factionId)`
- `useRulesSyncMeta()`, `useWahapediaFactionId(localFactionName)`

**React Query hooks MISSING** (Phase 43 creates, likely in new file `src/hooks/useRulesExtended.ts`):
- `useStratagemsByFaction(factionId: string | undefined)`
- `useDetachmentsByFaction(factionId: string | undefined)`
- `useDetachmentAbilitiesByDetachment(detachmentId: string | undefined)`
- `useSharedAbilitiesByFaction(factionId: string | undefined)`

**Cache keys MISSING** (must be added to useRulesSync.onSuccess in Phase 44 for SYNC-05):
- `["stratagems-by-faction", factionId]`
- `["detachments-by-faction", factionId]`
- `["detachment-abilities", detachmentId]`
- `["shared-abilities-by-faction", factionId]`

### AUDIT-04 Finding: Migration Proposals

**Constraint:** rules.db is fully destroyed on every sync. Any persistent data must live in hobbyforge.db.

**Group A — rules.db extensions (destroyed on re-sync, rebuilt each time):**

```
Table: rw_sync_meta (existing — extend in Phase 45)
Purpose: Track sync metadata per run
Missing columns to add (ALTER TABLE in new migration):
  - source_url TEXT           — base URL synced from
  - edition INTEGER           — Wahapedia edition number
  - factions_count INTEGER
  - datasheets_count INTEGER
  - models_count INTEGER
  - abilities_count INTEGER
  - keywords_count INTEGER
  - wargear_count INTEGER
  - stratagems_count INTEGER
  - detachments_count INTEGER
  - detachment_abilities_count INTEGER
  - shared_abilities_count INTEGER
Phase: 45
```

**Group B — hobbyforge.db new tables (persistent across re-syncs):**

```
Table: sync_errors (hobbyforge.db)
Purpose: Persist sync error history with timestamp (META-04)
Key columns: id INTEGER PK, occurred_at TEXT, error_type TEXT,
             message TEXT, wahapedia_version TEXT
Phase: 45
Note: Must be in hobbyforge.db — rules.db is cleared on each sync

Table: rules_snapshot (hobbyforge.db)
Purpose: Pre-sync snapshot for change detection (META-06, OVRD-06, OVRD-07)
Key columns: id INTEGER PK, captured_at TEXT, wahapedia_version TEXT,
             snapshot_json TEXT (serialized delta or full checksum per table)
Design question for Phase 45: full serialization vs. per-table checksums
Phase: 45

Table: unit_overrides (hobbyforge.db)
Purpose: User manual overrides for points, stats, keywords, abilities (OVRD-01–04)
Key columns: id INTEGER PK, unit_id INTEGER FK → units.id,
             field_name TEXT, override_value TEXT,
             created_at TEXT, updated_at TEXT
Note: References units.id in hobbyforge.db — NOT rw_datasheets.id (cross-DB FK not supported)
Phase: 46
```

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Document authoring | Custom template engine | Write tool directly | Single markdown file, no tooling needed |
| Schema inspection | Runtime PRAGMA table_info | Read migration SQL files | Audit is code-path inspection; no runtime needed |
| Gap enumeration | Automated diff script | Manual file-by-file comparison | Phase 42 has 3 source files to compare; automation is overkill |

---

## Common Pitfalls

### Pitfall 1: Confusing the Two Distinct "abilities" Concepts

**What goes wrong:** The word "abilities" means two different things in this codebase: `rw_datasheet_abilities` (per-unit abilities, keyed by datasheet_id+line) and `rw_abilities` (shared faction-wide abilities, keyed by TEXT id, from Abilities.csv). In useRulesSync.ts the CSV variable is named `abilities` for datasheet abilities and `sharedAbils` for shared abilities, but in the Rust BulkSyncPayload the fields are named `abilities` and `shared_abilities`.

**Why it happens:** Two separate CSVs with overlapping naming from Wahapedia.

**How to avoid:** Always specify the full table name (rw_datasheet_abilities vs rw_abilities) in the architecture note. Never use bare "abilities" without qualification.

### Pitfall 2: Misattributing rowCounts Origin

**What goes wrong:** The `rowCounts` returned by `useRulesSync` look like they come from the database, but they are computed client-side from TypeScript array `.length` before invoking Rust. They reflect what was sent, not what was actually inserted.

**Why it happens:** `bulk_sync_rules` returns `()` (void), so the TypeScript layer counts its own arrays.

**How to avoid:** Document this gap explicitly in AUDIT-02 and flag it as a SYNC-01 concern for Phase 44.

### Pitfall 3: Missing detachment_abilities Count in rowCounts

**What goes wrong:** `rowCounts` in useRulesSync includes 9 tables but omits `shared_abilities` and `detachment_abilities`. These are synced to the database but their counts are not surfaced in the post-sync confirmation.

**Why it happens:** The rowCounts object was built incrementally and these two tables were not added when rules_002 was introduced.

**How to avoid:** Document in AUDIT-02. Phase 44 (SYNC-02) adds these counts.

### Pitfall 4: Overrides in rules.db Would Be Destroyed

**What goes wrong:** Placing sync_errors, unit_overrides, or rules_snapshot in rules.db — they would be deleted on every re-sync.

**Why it happens:** The DELETE pass covers all 11 rw_* tables in one transaction.

**How to avoid:** All persistent user data and metadata tables go in hobbyforge.db. Document prominently in AUDIT-04.

### Pitfall 5: rw_datasheet_keywords Has No Unique Constraint

**What goes wrong:** The migration DDL for rw_datasheet_keywords has no PRIMARY KEY and no UNIQUE constraint. The Rust INSERT uses plain INSERT (not INSERT OR IGNORE). On a re-sync, the DELETE removes all rows first, so duplicate keys cannot accumulate across syncs. But within a single sync, if Wahapedia CSV has duplicate (datasheet_id, keyword) rows, they would both insert.

**Why it happens:** The schema was designed assuming Wahapedia data is clean. No defensive deduplication.

**How to avoid:** Document in AUDIT-01 schema state section. Not a bug to fix in Phase 42 — flag as Phase 44 (SYNC-03) validation concern.

---

## Code Examples

### Existing: BulkSyncPayload Rust Struct
```rust
// Source: src-tauri/src/lib.rs lines 129-145
#[derive(serde::Deserialize)]
pub struct BulkSyncPayload {
    factions: Vec<JsRow>,
    sources: Vec<JsRow>,
    datasheets: Vec<JsRow>,
    models: Vec<JsRow>,
    abilities: Vec<JsRow>,          // → rw_datasheet_abilities
    keywords: Vec<JsRow>,
    wargear: Vec<JsRow>,            // → rw_datasheets_wargear
    shared_abilities: Vec<JsRow>,   // → rw_abilities
    stratagems: Vec<JsRow>,         // → rw_stratagems
    detachments: Vec<JsRow>,        // → rw_detachments
    detachment_abilities: Vec<JsRow>, // → rw_detachment_abilities
    last_sync_at: String,
    wahapedia_version: String,
}
```

### Existing: Cache Invalidation in useRulesSync (gap highlighted)
```typescript
// Source: src/hooks/useRulesSync.ts lines 137-141
onSuccess: () => {
  qc.invalidateQueries({ queryKey: RULES_SYNC_META_KEY });
  qc.invalidateQueries({ queryKey: ["datasheets-by-faction"] });
  qc.invalidateQueries({ queryKey: ["datasheet"] });
  // MISSING: stratagems-by-faction, detachments-by-faction,
  //          detachment-abilities, shared-abilities-by-faction
},
```

### Pattern for Missing Types (Phase 43 will create)
```typescript
// Pattern from src/types/datasheet.ts — extend same file or new section
export interface RwStratagem {
  id: string;
  faction_id: string | null;
  name: string;
  type: string | null;
  cp_cost: string | null;
  legend: string | null;
  turn: string | null;
  phase: string | null;
  detachment: string | null;
  detachment_id: string | null;
  description: string | null;
}
```

---

## State of the Art

| Old Assumption | Actual State | Impact |
|----------------|-------------|--------|
| "Extended tables may not be synced yet" | All 11 tables are synced; rules_002 was merged in v2.1 Phase 15 | Phase 44 has less work than roadmap assumed |
| "Row counts come from DB" | Row counts are computed client-side before Rust invoke | SYNC-01 requires Rust to return actual counts |
| "Missing types for all extended data" | RwAbility already exists; only RwStratagem, RwDetachment, RwDetachmentAbility missing | Phase 43 is scoped to 3 types, not 4 |

---

## Open Questions

1. **rules_snapshot storage strategy**
   - What we know: A pre-sync snapshot is needed for change detection (META-06, OVRD-06)
   - What's unclear: Full serialization (entire rw_* dump as JSON) vs. per-table checksums vs. row-count deltas. Full serialization is simple but potentially large. Checksums are compact but require diffing logic.
   - Recommendation: Defer the design decision to Phase 45 research. Document in AUDIT-04 as "design TBD in Phase 45 research."

2. **unit_overrides field granularity**
   - What we know: Overrides cover points, stats (M/T/Sv/W/Ld/OC), keywords, abilities (OVRD-01–04)
   - What's unclear: One row per field (EAV pattern) vs. one row per unit with nullable columns per override type
   - Recommendation: Document both options in AUDIT-04 column sketch. Let Phase 46 research decide.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4 + React Testing Library 16 |
| Config file | `vite.config.ts` (vitest config embedded) |
| Quick run command | `pnpm test -- tests/datasheet/` |
| Full suite command | `pnpm test` |

### Phase Requirements → Test Map

Phase 42 is a **documentation-only phase** — it produces an architecture note, not code. There are no runtime behaviors to test. All AUDIT requirements are satisfied by writing accurate content in ARCHITECTURE-AUDIT.md.

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AUDIT-01 | Schema state documented accurately | manual-only | N/A | N/A |
| AUDIT-02 | Data flow documented accurately | manual-only | N/A | N/A |
| AUDIT-03 | TypeScript gaps listed completely | manual-only | N/A | N/A |
| AUDIT-04 | Migration proposals documented | manual-only | N/A | N/A |

**Justification for manual-only:** AUDIT-01 through AUDIT-04 require a human to judge the accuracy and completeness of a prose document. There is no executable artifact — no function, no component, no query — produced by Phase 42. The existing test suite (`tests/datasheet/`) covers the existing datasheets.ts queries and useDatasheet hook, but none of those are modified in this phase.

### Wave 0 Gaps

None — no test files are needed for a documentation-only phase.

---

## Sources

### Primary (HIGH confidence)

All findings are sourced directly from the codebase — no external documentation required.

- `src-tauri/migrations/rules_001_schema.sql` — complete DDL for 7 base rules.db tables
- `src-tauri/migrations/rules_002_wargear_abilities.sql` — complete DDL for 5 extended tables
- `src-tauri/src/lib.rs` — BulkSyncPayload struct, complete DELETE and INSERT loops, transaction logic
- `src/hooks/useRulesSync.ts` — CSV fetch list, HTML stripping, invoke payload, onSuccess invalidation
- `src/types/datasheet.ts` — all defined TypeScript interfaces
- `src/db/queries/datasheets.ts` — all defined query functions
- `src/hooks/useDatasheet.ts` — all defined React Query hooks + query keys
- `src/db/rules-client.ts` — connection configuration (WAL, busy_timeout, FK ON)
- `.planning/REQUIREMENTS.md` — requirement IDs and phase assignments
- `.planning/STATE.md` — accumulated decisions (overrides in hobbyforge.db, no cross-DB FK)
- `.planning/phases/42-architecture-audit/42-CONTEXT.md` — locked decisions from pre-planning

### Secondary (MEDIUM confidence)

None needed — all facts are read directly from source files.

### Tertiary (LOW confidence)

None.

---

## Metadata

**Confidence breakdown:**
- Schema state (AUDIT-01): HIGH — read directly from DDL and Rust source
- Data flow (AUDIT-02): HIGH — read directly from useRulesSync.ts and lib.rs
- TypeScript gaps (AUDIT-03): HIGH — enumerated by reading types, queries, and hooks files
- Migration proposals (AUDIT-04): HIGH for placement constraint (rules.db vs hobbyforge.db); MEDIUM for exact column sketches (Phase 45/46 research will refine)

**Research date:** 2026-05-08
**Valid until:** This phase is code-path inspection of stable shipped code. Valid until Phase 43–46 modify the files listed in Sources. No time-based expiry.
