# Phase 111: Bilingual Infrastructure - Context

**Gathered:** 2026-06-01
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase makes all canonical data (faction names, unit names, abilities, weapons, keywords) displayable in French alongside English. It delivers: (1) a build script extension that populates `_fr` columns from a manual overlay file, (2) a query layer that accepts a locale parameter and uses COALESCE fallback, (3) an EN/FR locale toggle persisted to localStorage, and (4) FTS5 search that covers French names. No new pages — this is infrastructure that threads through the build pipeline, query layer, and existing UI surfaces.

**Requirements in scope:** FR-02, FR-03, FR-04, FR-05 (4 requirements)

</domain>

<decisions>
## Implementation Decisions

### Translation Overlay Format (FR-02)
- **D-01:** `scripts/data/translations_fr.json` is structured by entity type: `{ factions: { id: name_fr }, units: { id: name_fr }, abilities: { id: { name_fr, description_fr } }, weapons: { id: name_fr }, keywords: { keyword: keyword_fr } }`. This mirrors the DB table structure and is easy for the build script to consume per-table.
- **D-02:** Build script loads `translations_fr.json` after parsing all English data. For each entity, if a French translation exists in the overlay, the `_fr` field is populated; otherwise it stays null (English fallback at query time).

### Query Layer Locale Strategy (FR-03)
- **D-03:** Explicit `locale?: 'en' | 'fr'` parameter on query functions that return canonical data (e.g., `getUdbFactions(locale?)`, `getUdbUnitDetail(unitId, locale?)`, `searchUdbUnits(query, locale?)`). When `fr`, SELECT uses `COALESCE(name_fr, name) AS name` (and similar for description, keyword). When `en` or omitted, just the English column. No global state in the query layer — clean and testable.
- **D-04:** The React Query hooks pass locale from a Zustand store to the query functions. The locale is part of the query key so React Query automatically refetches when locale changes (e.g., `["udb-factions", locale]`).

### Locale Toggle Placement & Persistence (FR-04)
- **D-05:** Small EN/FR toggle in the app sidebar footer area (near the collapse toggle). Uses a Zustand `persist` store with localStorage backend — same pattern as `useSidebarCollapsed` and `gameDayStore`.
- **D-06:** Switching locale invalidates all `udb_*` React Query keys to trigger refetch with the new locale parameter. No page reload needed.
- **D-07:** Locale type is `'en' | 'fr'` — a simple union, not an extensible i18n system. Two-locale design is intentional per REQUIREMENTS.md out-of-scope.

### FTS5 Bilingual Search (FR-05)
- **D-08:** Single FTS5 `udb_search` table with French names concatenated into the searchable content: `COALESCE(name, '') || ' ' || COALESCE(name_fr, '') || ' ' || COALESCE(sub_faction, '') || ' ' || keywords`. One index covers both languages — typing "Ultramarines" or the French faction name both return results.
- **D-09:** FTS5 rebuild happens inside the existing import transaction (DROP + CREATE + populate), extended to include `_fr` fields. No new migration needed — the Rust import command already rebuilds FTS5.

### Claude's Discretion
- Build script internal structure for loading and applying the overlay
- Exact Zustand store implementation (naming, file location)
- Which existing query functions need the locale parameter vs. which can skip it (e.g., points queries don't need French)
- React Query key structure for locale-aware caching
- Toggle component styling (button group vs. dropdown vs. switch)
- Error handling when translations_fr.json is missing or malformed

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Build Pipeline
- `scripts/build-unit-db.ts` — Build script; already outputs `_fr: null` fields; needs to load translations_fr.json overlay and populate them
- `scripts/lib/types.ts` — TypeScript types for all UDB entities; already has `_fr` fields (name_fr, description_fr, keyword_fr)

### Schema & Import
- `src-tauri/migrations/041_udb_sub_faction_fr.sql` — Migration that added all `_fr` columns (name_fr on factions/units/abilities/weapons, description_fr on abilities, keyword_fr on keywords)
- `src-tauri/src/lib.rs` (import_unit_database_inner) — Rust import with `#[serde(default)]` for _fr fields; FTS5 rebuild logic lives here

### Query Layer
- `src/db/queries/unitDatabase.ts` — All UDB query functions; needs locale parameter on functions returning displayable text
- `src/hooks/useUnitDatabase.ts` — React Query hooks wrapping UDB queries; needs locale from store in query keys

### Existing Patterns
- `src/context/ActiveFactionContext.tsx` — React Context pattern for app-wide state (reference for locale provider pattern)
- `src/components/common/useSidebarCollapsed.ts` — Zustand persist + localStorage pattern to follow for locale store
- `src/features/game-day/gameDayStore.ts` — Another Zustand persist store reference

### Planning Context
- `.planning/REQUIREMENTS.md` — FR-02..FR-05 requirement definitions
- `.planning/ROADMAP.md` — Phase 111 success criteria and dependency chain
- `.planning/phases/108-build-script-hardening-schema-foundation/108-CONTEXT.md` — Prior decisions D-10..D-12 on _fr schema and build script foundation

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `scripts/lib/types.ts` — All UDB entity types already have `_fr` nullable fields; no type changes needed
- `build-unit-db.ts` — Already outputs `_fr: null` per entity; just needs overlay loading logic
- `useSidebarCollapsed.ts` — Zustand persist pattern to clone for locale store
- `unitDatabase.ts` queries — 10+ functions to extend with optional locale parameter

### Established Patterns
- Zustand `persist` with localStorage: used by sidebar collapse and Game Day store
- React Query key arrays include variable parameters (e.g., `["factions", id]`) — locale fits naturally
- FTS5 rebuild inside Rust import transaction: DROP + CREATE + populate pattern already in place
- `COALESCE` used extensively in the codebase (points resolution, metadata clearing) — familiar pattern

### Integration Points
- FTS5 `udb_search` table rebuilt in `import_unit_database_inner()` Rust function — must extend content columns
- `searchUdbUnits()` in `unitDatabase.ts` — query unchanged (FTS5 content already includes French names); results just match more terms
- All UI surfaces displaying UDB data (DatabaseBrowser, PlaybookTab, Game Day, army list picker) pick up French names automatically via the locale-aware hooks — no per-surface changes needed
- `DbHealthGate.tsx` `EXPECTED_SCHEMA_VERSION` — no bump needed (no new migration)

</code_context>

<specifics>
## Specific Ideas

- The translations_fr.json file should be manually curated — not machine-translated. Start with faction names and unit names (most visible), then abilities and weapons (lower priority, can ship with partial coverage).
- The locale toggle should be subtle — a small "EN | FR" text toggle, not a full dropdown. This is a two-locale app, not an i18n framework.
- When locale is FR but a unit has no French name, the English name shows (COALESCE fallback) — no empty cells or "[untranslated]" placeholders.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 111-Bilingual Infrastructure*
*Context gathered: 2026-06-01*
