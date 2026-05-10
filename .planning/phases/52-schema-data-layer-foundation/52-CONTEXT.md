# Phase 52: Schema + Data Layer Foundation - Context

**Gathered:** 2026-05-10
**Status:** Ready for planning

<domain>
## Phase Boundary

All new schema, query functions, hooks, and design documentation for v0.2.8 exist and are fully typed — every downstream phase builds on this layer without touching migrations again. Covers migration 019 (detachment_id on army_lists, rules_favorites and rules_notes tables), new query modules, new React Query hooks, and a points import design document.

</domain>

<decisions>
## Implementation Decisions

### Rule identification pattern
- Composite UNIQUE(rule_id, rule_type) as the natural key for both rules_favorites and rules_notes
- rule_name TEXT NOT NULL stored as denormalized copy — survives rules.db re-sync, enables display without cross-DB join
- CHECK constraint on rule_type: IN ('stratagem', 'detachment_ability', 'shared_ability') — enforces valid types at DB level
- rule_id is the Wahapedia string ID from the corresponding rw_* table

### Favorites/notes mutation behavior
- Optimistic toggle for favorites star — instant UI feedback with rollback on error (matches existing mutation patterns)
- upsertRulesFavorite uses INSERT OR REPLACE on composite key (rule_id, rule_type) — single function for toggle on/off
- upsertRulesNote uses INSERT OR REPLACE on composite key (rule_id, rule_type) — single function, simpler than separate create/update
- deleteRulesFavorite for explicit unfavorite (removes row entirely rather than setting a flag)
- is_reminder INTEGER DEFAULT 0 — separate from favorite status, toggleable independently

### Detachment linkage on army_lists
- detachment_id TEXT NULL — references the Wahapedia detachment string ID from rw_detachments
- detachment_name TEXT NULL — denormalized copy that survives rules.db re-sync (consistent with weapon_name TEXT copy pattern in unit_loadout_wargear)
- Both columns nullable — army lists without detachment selection remain valid
- No FK constraint to rules.db (cross-DB FK not supported) — application-level reference

### Query module organization
- getDetachmentById and getStratagemsByDetachment added to existing rulesExtended.ts (reads from rules.db)
- New rulesFavorites.ts in src/db/queries/ for favorites CRUD (reads/writes hobbyforge.db)
- New rulesNotes.ts in src/db/queries/ for notes CRUD (reads/writes hobbyforge.db)
- Army list detachment columns handled via existing armyLists.ts updates

### Cache invalidation strategy
- Favorites and notes hooks do NOT invalidate on rules sync — they live in hobbyforge.db, not rules.db
- New rules.db query hooks (useDetachmentById, useStratagemsByDetachment) use staleTime: Infinity and register in useRulesSync.onSuccess for invalidation
- Favorites mutations invalidate RULES_FAVORITES_KEY; notes mutations invalidate RULES_NOTES_KEY
- Army list mutations already invalidate ARMY_LISTS_KEY — detachment columns picked up automatically

### Points import design doc
- Full design document at .planning/points-import-design.md per success criteria
- Covers: schema design, versioning strategy, delta computation, manual override interaction, army list impact
- Design only — implementation deferred to future milestone (PTS-01 through PTS-04)

### Claude's Discretion
- Exact column ordering in migration 019
- Whether rules_favorites and rules_notes use INTEGER PRIMARY KEY AUTOINCREMENT or composite PK
- Hook file naming (useRulesFavorites.ts vs useRulesFavorite.ts)
- Points design doc internal structure and section ordering

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Schema and data patterns
- `src-tauri/migrations/017_unit_overrides.ts` — Most recent hobbyforge.db migration pattern (overrides table with TEXT copies)
- `src/db/queries/rulesExtended.ts` — Existing rules query module to extend with getDetachmentById, getStratagemsByDetachment
- `src/hooks/useRulesExtended.ts` — Existing rules hooks pattern (staleTime: Infinity, enabled guard)
- `src/hooks/useRulesSync.ts` — Sync invalidation contract — new rules.db hooks must register here

### Type patterns
- `src/types/armyList.ts` — ArmyList interface to extend with detachment_id and detachment_name
- `src/types/datasheet.ts` — RwStratagem, RwDetachment, RwDetachmentAbility type definitions

### Carried-forward decisions
- `src/db/rules-client.ts` — Rules DB connection (getRulesDb)
- `src/db/client.ts` — Main DB connection (getDb) — favorites/notes go here

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `rulesExtended.ts`: Already has getStratagemsByFaction, getDetachmentsByFaction, getDetachmentAbilitiesByDetachment — new queries follow same pattern
- `useRulesExtended.ts`: Hook pattern with staleTime: Infinity and enabled guard — template for new hooks
- `armyLists.ts` query module: Existing CRUD — extend with detachment columns in UPDATE/INSERT
- `unitOverrides.ts`: Recent example of hobbyforge.db table with TEXT key references to rules.db data

### Established Patterns
- Dual-DB architecture: rules.db for synced Wahapedia data, hobbyforge.db for user data
- TEXT copy pattern: Store name alongside ID for display without cross-DB join (weapon_name, detachment_name)
- useWahapediaFactionId(faction.name): Required for all rules-facing queries
- INSERT OR REPLACE for upsert operations (used in unit overrides)
- $1, $2 positional params for tauri-plugin-sql

### Integration Points
- useRulesSync.onSuccess: Must add invalidation for new rules.db query keys
- ArmyList type and CreateArmyListInput/UpdateArmyListInput: Must extend with detachment fields
- Existing armyLists.ts SQL: UPDATE and INSERT statements need detachment columns

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches. Phase is infrastructure-focused with clear success criteria.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 52-schema-data-layer-foundation*
*Context gathered: 2026-05-10*
