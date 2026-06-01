# Phase 105: Collection Integration - Context

**Gathered:** 2026-05-30
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase links collection units to the canonical unit database (`udb_*` tables from Phase 103) via a nullable FK, adds an "Add from Database" flow so users can browse/search the database and add a unit to their collection with pre-filled fields, surfaces ownership and painting-readiness badges on database browser rows (Phase 104 UI), adds a Data Health diagnostic for unlinked collection units, and preserves the ability to create custom/kitbash units without a database link. No army list changes, no points resolution changes, no rules.db changes.

</domain>

<decisions>
## Implementation Decisions

### Schema & Migration
- **D-01:** New migration `039_collection_udb_link.sql` adds `udb_unit_id TEXT REFERENCES udb_units(id) ON DELETE SET NULL` column to the `units` table. Nullable — custom/kitbash units have NULL. This is already confirmed in STATE.md key decisions.
- **D-02:** The migration includes a best-effort backfill: `UPDATE units SET udb_unit_id = (SELECT id FROM udb_units WHERE LOWER(udb_units.name) = LOWER(units.name) AND udb_units.faction_id = (SELECT wahapedia_faction_id FROM factions WHERE factions.id = units.faction_id)) WHERE udb_unit_id IS NULL`. Case-insensitive exact match on name + faction scope. Advisory only — unmatched units remain NULL and are flagged in Data Health.
- **D-03:** Add an index `idx_units_udb_unit_id` on `units(udb_unit_id)` for efficient ownership badge lookups (reverse FK join from `udb_units` to `units`).

### "Add from Database" Flow
- **D-04:** The flow originates from the database browser. An "Add to Collection" button appears on the `UdbDatasheetSheet` detail view. Clicking it opens the existing `UnitSheet` in create mode with fields pre-filled from the database entry.
- **D-05:** Pre-filled fields from the database entry: `name`, `faction_id` (mapped from udb faction to collection faction), `category` (derived from `udb_units.role`), `points` (base points from lowest tier), `model_count` (from `udb_unit_composition.min_models` or 1 if no composition data). `udb_unit_id` is set automatically on the created unit.
- **D-06:** All pre-filled fields are editable before saving. Painting status fields (`status_painting`, `status_assembly`, etc.) default to their normal defaults (Not Started / 0).
- **D-07:** After successful creation, the ownership badge on the database browser row updates immediately (React Query invalidation covers this).

### Faction ID Mapping
- **D-08:** The backfill migration and "Add from Database" flow both need to map between collection `factions.id` (integer auto-increment) and `udb_units.faction_id` (Wahapedia text ID like "SM", "NEC"). The mapping uses an existing or new column. If `factions` doesn't already have a `wahapedia_faction_id` column, the migration adds one and backfills it from the `udb_factions` table by name matching. Claude's discretion on exact implementation — the goal is reliable faction cross-reference.

### Ownership Badges on Database Browser
- **D-09:** `UdbUnitRow` in the database browser shows an **"Owned ×N"** count badge when the user owns 1+ copies of that unit (joined via `udb_unit_id` FK). Badge uses the existing `Badge` component with a subtle variant (e.g., outline or secondary). Not owned = no badge (clean default).
- **D-10:** Badge data comes from a single query that returns ownership counts per `udb_unit_id` for the current faction — fetched once per faction view, not per row. This avoids N+1 queries. Pattern follows the `Page-level Map<compositeKey, T>` approach established in Rules Hub annotations.

### Readiness Badges on Database Browser
- **D-11:** For owned units, a small readiness indicator shows the **aggregate painting status** across all owned copies. If all copies are "Display Ready" or "Battle Ready", show a green badge. If any copy is still in progress, show an amber/yellow badge. If all are "Not Started", show a gray badge. This gives a quick "is my collection of this unit painted?" signal.
- **D-12:** Readiness data is bundled into the same ownership query (joined with painting status), so no additional DB round-trip.

### Data Health Diagnostic
- **D-13:** A new diagnostic type `"unlinked_units"` with **warning** severity surfaces collection units where `udb_unit_id IS NULL`. Description: "X collection units are not linked to the unit database". This follows the existing `DiagnosticsCard` pattern in Data Health.
- **D-14:** The diagnostic is informational — clicking it does NOT open a linking wizard (that would be scope creep). Users can manually link by editing the unit and selecting from the database. A future phase could add bulk linking if needed.

### Collection Page & UnitSheet Changes
- **D-15:** The `UnitSheet` create/edit form gains an optional "Database Link" field — a read-only display showing the linked database unit name (or "Custom unit" if NULL). This is not a picker; linking happens via the "Add from Database" flow or migration backfill.
- **D-16:** The `createUnit` and `updateUnit` query functions accept the new `udb_unit_id` parameter. The `Unit` and `CreateUnitInput` types are extended accordingly.

### Claude's Discretion
- Exact badge styling (color, variant, position on the row)
- Whether to show readiness as a colored dot, a text badge, or a mini progress ring
- Layout of the "Add to Collection" button on the datasheet sheet (header action, footer button, etc.)
- Whether the collection table/gallery view shows a small "linked" icon — nice-to-have, not required
- Navigating from a collection unit to its database entry — nice-to-have, not required
- Empty state messaging when backfill finds 0 matches
- Whether the faction mapping column is added to `factions` table or handled via a join through the `udb_factions` table

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Schema & Data Layer
- `src-tauri/migrations/038_udb_schema.sql` — Complete udb_* schema (udb_units, udb_factions, etc.). Defines the FK target for units.udb_unit_id.
- `src/types/unit.ts` — Current Unit interface (24 fields), EnrichedUnit, CreateUnitInput, UpdateUnitInput. Must be extended with udb_unit_id.
- `src/db/queries/units.ts` — Collection CRUD. createUnit and updateUnit must accept udb_unit_id.
- `src/hooks/useUnits.ts` — React Query hooks and cache invalidation patterns. UNITS_KEY, UNITS_ENRICHED_KEY.

### Database Browser (Phase 104 code to modify)
- `src/features/unit-database/UdbDatasheetSheet.tsx` — Datasheet detail sheet. Add "Add to Collection" button here.
- `src/features/unit-database/UdbUnitRow.tsx` — Unit list row. Add ownership and readiness badges here.
- `src/db/queries/unitDatabase.ts` — UDB query module. Add ownership count query here (or new query function).
- `src/hooks/useUnitDatabase.ts` — UDB React Query hooks. Add useUdbOwnership hook.

### Data Health
- `src/features/data-health/DiagnosticsCard.tsx` — Diagnostic rendering pattern (type, count, description, severity).
- `src/db/queries/diagnostics.ts` — Diagnostic query functions. Add unlinked units count query.

### Unit Creation Flow
- `src/features/units/UnitSheet.tsx` — Create/edit form. Must accept pre-fill props from database entry.
- `src/features/units/unitSchema.ts` — Zod schema for unit form validation.

### Prior Phase Context
- `.planning/phases/103-data-acquisition-schema/103-CONTEXT.md` — D-03/D-04: Wahapedia string IDs for udb_units and udb_factions.
- `.planning/phases/104-database-browser-ui/104-CONTEXT.md` — D-07: Sheet overlay pattern for datasheet, D-13/D-14: query layer and hooks.

### Requirements & Roadmap
- `.planning/REQUIREMENTS.md` § "Collection Integration" — COL-01 through COL-07
- `.planning/ROADMAP.md` § "Phase 105" — Success criteria (4 items)
- `.planning/STATE.md` § "Key Decisions (v0.4.0)" — FK nullable decision, entity ID reuse

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `UnitSheet.tsx`: Existing create/edit form. Can accept pre-fill values via props or defaultValues. The "Add from Database" flow opens this in create mode with fields populated from the database entry.
- `DiagnosticsCard.tsx`: Diagnostic rendering — extend with new `"unlinked_units"` type following the same `{ type, count, description, severity }` pattern.
- `Page-level Map<compositeKey, T>` pattern (from Rules Hub): Load ownership data once per faction view, build a Map keyed by udb_unit_id, pass to row components for O(1) lookup.
- `Badge` component (shadcn/ui): Used throughout the app for status indicators.

### Established Patterns
- `ON DELETE SET NULL` for optional FKs (sessions → recipe, sessions → section) — same pattern for units → udb_units
- `$1, $2` positional params for all SQL
- Booleans as `0 | 1` integers
- React Query invalidation symmetry: if create invalidates a key, delete must too
- Zustand filter stores for UI state
- Sheet overlays for detail views

### Integration Points
- `src-tauri/src/lib.rs` `get_migrations()`: Must register migration 039
- `src/types/unit.ts`: Add `udb_unit_id: string | null` to Unit, CreateUnitInput, UpdateUnitInput
- `src/db/queries/units.ts`: Add `udb_unit_id` parameter to createUnit/updateUnit SQL
- `src/hooks/useUnits.ts`: No structural changes needed — existing invalidation covers the new column
- `src/features/unit-database/UdbDatasheetSheet.tsx`: Add "Add to Collection" button
- `src/features/unit-database/UdbUnitRow.tsx`: Add ownership/readiness badges
- `src/features/data-health/`: Add unlinked units diagnostic

</code_context>

<specifics>
## Specific Ideas

- The "Owned ×N" badge should feel subtle — not competing with the unit name or role badge. A small secondary-variant badge at the end of the row.
- Readiness badges should use the same color language as the collection page painting status (green = done, amber = in progress, gray = not started).
- The backfill migration should log how many units were matched vs unmatched (via Rust import command return or simply queryable after migration).
- The "Add to Collection" button should be prominent on the datasheet sheet — this is a key user flow for Phase 105.

</specifics>

<deferred>
## Deferred Ideas

- Bulk linking wizard for unmatched units from Data Health page — future enhancement
- Army list points resolved from database FK join — Phase 106 (ALI-01)
- Remove synced_unit_points cache table — Phase 106 (ALI-03)
- Collection page "linked" icon showing database connection — nice-to-have, not in COL-01–07
- Navigate from collection unit to database entry — nice-to-have, not in COL-01–07

None — discussion stayed within phase scope

</deferred>

---

*Phase: 105-Collection Integration*
*Context gathered: 2026-05-30*
