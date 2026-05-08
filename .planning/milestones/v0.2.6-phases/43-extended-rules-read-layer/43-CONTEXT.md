# Phase 43: Extended Rules Read Layer - Context

**Gathered:** 2026-05-08
**Status:** Ready for planning

<domain>
## Phase Boundary

Make the already-synced extended rules data (stratagems, detachments, detachment abilities, shared faction abilities) queryable from TypeScript and visible in PlaybookTab. The sync WRITE path is complete (confirmed by Phase 42 audit) — this phase builds the READ path: types, queries, hooks, and UI sections.

Requirements: SCHEMA-01, SCHEMA-02, SCHEMA-03, SCHEMA-04, SCHEMA-05

</domain>

<decisions>
## Implementation Decisions

### PlaybookTab Display Layout
- Collapsible sections for each data type — matches existing Weapons and Datasheet Abilities pattern (both use `<Collapsible defaultOpen={true}>`)
- Each section has a section label (SECTION_LABEL_CLASS) header + collapsible content
- Sections only render when data exists (same conditional pattern as `hasWeapons`, `hasAnyDatasheetAbility`)

### Data Grouping & Organization
- **Stratagems**: grouped by `phase` field (Command Phase, Movement Phase, Shooting Phase, Charge Phase, Fight Phase) — matches how players look up stratagems during a game turn sequence
- Stratagems within each phase group sorted alphabetically by name
- Show CP cost, type, turn restriction, and description per stratagem
- **Detachments**: flat list by name — typically 1-3 per faction, no sub-grouping needed
- Show name, legend, and type per detachment
- **Detachment abilities**: grouped under their parent detachment (via `detachment_id` FK) — directly matches SCHEMA-03 requirement
- Show name, legend, and description per detachment ability
- **Shared faction abilities**: flat list sorted by name — these are faction-wide abilities not attached to a specific datasheet
- Show name, legend, and description per shared ability

### Faction Data Linking
- Reuse existing `useWahapediaFactionId` hook to resolve local faction name → Wahapedia `faction_id`
- All four new hooks take `wahapediaFactionId` as parameter — same pattern as `useDatasheetsByFaction`
- Data only loads when a unit has a linked faction with a resolved Wahapedia faction ID
- When faction can't be resolved (null), sections simply don't render — no error state needed

### Section Ordering in PlaybookTab
- New sections appear after Datasheet Abilities / Sources, before Personal Ability Notes
- Order: Stratagems → Detachments (with abilities nested) → Shared Abilities
- Separator between each major section (existing pattern)

### Query & Hook Patterns
- New query file: `src/db/queries/rulesExtended.ts` — keeps extended rules queries separate from datasheet queries
- New hook file: `src/hooks/useRulesExtended.ts` — follows same pattern as `useDatasheet.ts`
- All hooks use `staleTime: Infinity` (rules data is static until re-sync, same as datasheet hooks)
- Query keys: `["stratagems-by-faction", factionId]`, `["detachments-by-faction", factionId]`, `["detachment-abilities", detachmentId]`, `["shared-abilities-by-faction", factionId]`
- `enabled` guard: only when param is defined (same as `useDatasheetsByFaction`)

### Type Definitions
- Add `RwStratagem`, `RwDetachment`, `RwDetachmentAbility` to `src/types/datasheet.ts`
- `RwAbility` already exists and correctly maps `rw_abilities` — no new type needed for shared abilities
- All fields nullable except `id` and `name` (matching DDL NOT NULL constraints)

### Claude's Discretion
- Exact CSS styling of stratagem/detachment/ability entries within collapsible sections
- Whether to use AbilityEntry sub-component pattern or new sub-components for extended data
- Empty state text when faction has no stratagems/detachments (e.g., "No stratagems found for this faction")
- Whether stratagem phase headers use icons or just text labels

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Architecture & Schema
- `.planning/phases/42-architecture-audit/ARCHITECTURE-AUDIT.md` — Complete schema DDL for all 12 rw_* tables, sync data flow, TypeScript gap analysis with exact type/query/hook specs
- `.planning/phases/42-architecture-audit/42-CONTEXT.md` — Phase 42 decisions including gap classification strategy and sync pipeline assessment

### Requirements
- `.planning/REQUIREMENTS.md` — SCHEMA-01 through SCHEMA-05 requirements for this phase
- `.planning/milestones/v0.2.6-ROADMAP.md` — Phase 43 goal, success criteria, and dependency on Phase 42

### Existing Patterns
- `src/types/datasheet.ts` — Existing RwAbility type (reuse for shared abilities), all other rw_* types as pattern reference
- `src/db/queries/datasheets.ts` — Pattern for rules.db queries (getRulesDb(), SELECT with parameterized $1)
- `src/hooks/useDatasheet.ts` — Pattern for rules hooks (staleTime: Infinity, enabled guard, query key conventions)
- `src/features/units/PlaybookTab.tsx` — Integration target; existing Collapsible sections, AbilityEntry sub-component, faction resolution chain

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `AbilityEntry` sub-component in PlaybookTab.tsx (line 789): renders name + description with left-border styling — can be reused or extended for detachment abilities and shared abilities
- `WargearTable` sub-component in PlaybookTab.tsx (line 750): pattern for tabular data display within a collapsible
- `SECTION_LABEL_CLASS` constant: shared styling for section headers
- `getRulesDb()` singleton: rules.db connection with WAL mode + busy timeout
- `useWahapediaFactionId` hook: resolves local faction name → Wahapedia faction_id (the link between hobbyforge.db factions and rules.db rw_factions)
- `Collapsible` / `CollapsibleContent` / `CollapsibleTrigger` from shadcn/ui: already imported in PlaybookTab

### Established Patterns
- Rules queries use `getRulesDb()` + `db.select<T[]>(SQL, [params])` with `$1, $2` positional syntax
- React Query hooks for rules use `staleTime: Infinity`, `enabled` guard on param truthiness
- Query keys use descriptive prefix array: `["stratagems-by-faction", factionId]`
- UI sections conditionally render based on data presence (`hasWeapons`, `hasAnyDatasheetAbility`)
- Collapsible sections use `defaultOpen={true}` with ChevronDown icon trigger

### Integration Points
- PlaybookTab.tsx between line 633 (after Datasheet Abilities / Sources separator) and line 637 (TierManager): new collapsible sections insert here
- `src/types/datasheet.ts`: new interfaces added alongside existing rw_* types
- `useRulesSync.ts` onSuccess: Phase 44 will add cache invalidation for new query keys (NOT this phase's responsibility, but hooks must use consistent keys)

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches. The architecture audit (Phase 42) already provides exact type definitions, query signatures, and hook patterns. Implementation follows established codebase conventions.

</specifics>

<deferred>
## Deferred Ideas

- Cache invalidation for new hooks on sync success — Phase 44 (SYNC-05)
- Detachment selection UI (choosing which detachment to play) — future phase, not in v0.2.6 scope
- Stratagem favoriting or custom notes per stratagem — new capability, not in scope
- Filtering stratagems by CP cost or type — could be useful but beyond read-only display scope

</deferred>

---

*Phase: 43-extended-rules-read-layer*
*Context gathered: 2026-05-08 (auto mode — decisions made from codebase analysis and Phase 42 audit)*
