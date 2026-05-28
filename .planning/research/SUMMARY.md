# Project Research Summary

**Project:** HobbyForge v0.3.7 Smart Automation
**Domain:** Status auto-derivation, lifecycle management, context pre-filling, battle-readiness
**Researched:** 2026-05-28
**Confidence:** HIGH

## Executive Summary

HobbyForge v0.3.7 is a focused automation milestone on an existing Tauri 2 + React 19 + SQLite desktop app. All four target features (auto-derived assembly status, is_active_project lifecycle management, smart context pre-filling in recipe forms, and battle-readiness display in the army list unit picker) can be built entirely within the existing stack. Zero new dependencies are required. The mechanism for each feature already exists and needs extension, not replacement: syncDerivedStatuses() in recipeAssignments.ts handles basing/varnish today, useBulkCreateAssignments() is production-proven, useUnitsEnriched() provides enriched unit data, and useActiveFaction() context is globally available.

The recommended build order is layer-by-layer: all query-layer changes first (assembly detection, active-project auto-set in recipeAssignments.ts), then the new pure utility function (computeUnitReadiness), then the form/UI pre-fill changes last. No schema migrations are needed. The status_assembly, section_type, and is_active_project columns all exist. The only TypeScript const requiring extension is SECTION_TYPES to add an explicit assembly value.

The key risks are write-path conflicts, not technical complexity. syncDerivedStatuses() must never unconditionally overwrite status flags. The is_active_project auto-management must be auto-set-only (on recipe assign) with no auto-clear from step-toggle paths, to prevent manually-parked units from reappearing in Kanban. Context pre-fills must source from FactionContext not filter stores, and form defaults must be frozen at sheet-open time to avoid reset-while-typing bugs. These design constraints must be resolved in Phase 1 before code ships.
## Key Findings

### Recommended Stack

Stack research verdict: zero new libraries. Every automation capability needed already exists. syncDerivedStatuses() (lines 211-272 of recipeAssignments.ts) is the extension point for assembly detection via the existing section_type = prep column. React Hook Form defaultValues factory is the correct pre-fill mechanism. useBulkCreateAssignments() handles batch operations with INSERT OR IGNORE semantics and correct cache invalidation.

One new file: src/lib/computeUnitReadiness.ts (pure function, no React/DB deps, following computeAssignmentProgress pattern). One new UI component: src/features/army-lists/BatchApplyRecipeSheet.tsx (wires useBulkCreateAssignments() to a multi-select UI). All other changes are modifications to existing files.

**Core technologies (unchanged):**
- tauri-plugin-sql / SQLite:  parameterized syntax, auto-commit per statement
- React Query (UNITS_KEY): existing cache invalidation covers all new columns; no new cache keys needed
- React Hook Form: defaultValues factory for faction context pre-fill; no new form library
- ActiveFactionContext: global faction pre-fill source; already stable
- useUnitsEnriched(): effective_points + all status columns; already in production

**What NOT to add:** SQLite triggers (no event channel to React), background workers (single-user desktop), new Zustand stores (all derives write synchronously), useFieldArray for batch selection (known RHF/dnd-kit ID collision per PROJECT.md; use useState instead).

### Expected Features

No competitor app (Figure Case, Pile of Potential, Liber Pigmenta) implements automatic status derivation from workflow data. All require manual updates. HobbyForge is already ahead of the market. This milestone extends that lead without adding complexity.

**Must have (table stakes):**
- status_assembly auto-set when all steps in prep-type sections complete -- basing/varnish already auto-derive; assembly is the conspicuous gap
- section_type-based basing/varnish detection with name-LIKE fallback for pre-v0.2.9 recipes -- current name match is fragile; section_type column exists but unused
- is_active_project auto-set when recipe is assigned -- clearest painting-intent signal; not reflecting it in Kanban requires a manual second step
- Battle-readiness badge in army list unit picker -- data already on unit row; not surfacing it forces cross-referencing Collection page
- Points-remaining filter/display in picker -- points_limit and effective_points already computed; mental math is unnecessary

**Should have (differentiators):**
- assembly added to SECTION_TYPES const -- makes section authoring unambiguous; currently prep is ambiguous
- Faction auto-fill in RecipeFormSheet from useActiveFaction() -- eliminates most common redundant selection for single-faction painters
- Recipe picker pre-filtered by unit faction -- cross-faction noise reduced for multi-faction users
- Smart points-remaining badge in picker header -- live remaining budget without mental math

**Defer:**
- Dashboard active count enhancement -- side effect of auto-lifecycle; no new UI needed, existing cards become more accurate automatically
- AI/ML recipe suggestions -- out of scope, desktop-local, no network

**Anti-features to avoid:** Removing manual is_active_project toggle (keep as escape hatch), blocking unready units from lists (informational only, never gating), auto-assigning recipe on unit creation (too aggressive).

### Architecture Approach

All changes concentrate in two existing files plus one new pure function and one new UI component. Architecture layers are unchanged. UNITS_KEY cache invalidation already covers all new writes. No new React Query keys, no new hooks, no new migrations needed.

**Major components touched:**
1. src/db/queries/recipeAssignments.ts -- extend syncDerivedStatuses(), add private autoManageActiveProject(), wire into create/delete/bulk functions
2. src/lib/computeUnitReadiness.ts (new) -- canonical pure function for readiness tier; prevents definition divergence across surfaces
3. src/features/army-lists/UnitPickerDialog.tsx -- switch to useUnitsEnriched(), add readiness badges, accept usedPoints/pointsLimit props
4. src/features/recipes/RecipeFormSheet.tsx -- faction pre-fill from useActiveFaction() frozen at open time
5. src/features/recipes/ApplyRecipeDialog.tsx -- factionId prop, Suggested / Other CommandGroup split
6. src/features/army-lists/BatchApplyRecipeSheet.tsx (new UI only) -- multi-select wired to useBulkCreateAssignments()

### Critical Pitfalls

1. **Auto-derive silently overwrites manual status** -- syncDerivedStatuses() unconditionally writes all three status fields. Extending to status_assembly without a guard destroys user-set values. Prevention: only write a flag when the relevant section type exists; follow the hasBasingSections.cnt > 0 guard already in the function. Must address in Phase 1.

2. **section_type vocabulary does not cover target status fields** -- SECTION_TYPES has prep, basecoat, shade, layer, detail, effect, finishing. None map to assembly, basing, or varnish. Add assembly explicitly. Treat finishing as the varnish trigger. Use name-LIKE fallback for older recipes. Decide before writing any detection SQL.

3. **is_active_project auto-clear races with manual deactivation** -- user parks a unit, then ticks a step; if step-toggle path touches is_active_project the unit reappears in Kanban. Resolution: auto-set ONLY on recipe assign; never write is_active_project inside syncDerivedStatuses() or any step-toggle path.

4. **Context pre-fill reads stale Zustand filter store** -- faction filter persists across navigations. Source defaultFactionId exclusively from useFaction() context, frozen at sheet-open time via useEffect([open]) pattern. Never read from filter stores for form pre-fills.

5. **Battle-readiness definition diverges across surfaces** -- getArmyListReadiness() already defines ready as status_painting = Completed. Define one canonical computeUnitReadiness() pure function before any readiness-display code ships. All surfaces use this single function.

## Implications for Roadmap

Three phases, ordered by risk and dependency.

### Phase 1: Query-Layer Automation Foundation

**Rationale:** All backend logic in one file (recipeAssignments.ts) with zero UI risk. Riskiest layer because write-path conflicts are silent. The section_type vocabulary decision and manual-override guard strategy must be resolved here and cannot be retrofitted after UI ships.
**Delivers:** status_assembly auto-derives from prep sections. status_basing/status_varnished derive from section_type with name-LIKE fallback. is_active_project auto-sets on recipe assign only. assembly added to SECTION_TYPES. Private autoManageActiveProject() helper encapsulated in query file.
**Addresses:** Table stakes features 1-3 (assembly auto-derive, section_type precision, is_active_project auto-set)
**Avoids:** Pitfall 1 (unconditional overwrite), Pitfall 2 (vocabulary gap), Pitfall 3 (active-project race condition)

### Phase 2: Battle-Readiness Display in Unit Picker

**Rationale:** Isolated to a new pure function (independently testable) plus a single component modification. No form state involved. Building computeUnitReadiness() here establishes the canonical readiness definition before any other surface could diverge.
**Delivers:** src/lib/computeUnitReadiness.ts with unit tests. UnitPickerDialog switched to useUnitsEnriched(), readiness badges per unit, sort by tier (ready/in-progress/not-started), points-remaining display and filter toggle.
**Addresses:** Table stakes features 4-5 (readiness badge, points-remaining); Differentiator (smart points badge)
**Avoids:** Pitfall 6 (N+1 queries -- single JOIN from useUnitsEnriched()), Pitfall 9 (readiness definition divergence)

### Phase 3: Smart Context Pre-Filling and Batch Apply

**Rationale:** Form state changes require the most careful testing (reset-on-open, stale closure, useEffect timing). Done last after backend and utility function are stable and validated.
**Delivers:** RecipeFormSheet faction pre-fill from useActiveFaction() frozen at open. ApplyRecipeDialog faction grouping. ApplyToUnitsDialog faction sort. BatchApplyRecipeSheet new component wired to useBulkCreateAssignments().
**Addresses:** Differentiators (faction auto-fill, recipe picker pre-filter, batch apply UI)
**Avoids:** Pitfall 4 (stale Zustand faction), Pitfall 5 (pre-fill indicators for high-stakes fields), Pitfall 12 (freeze defaultFactionId at open time)

### Phase Ordering Rationale

- Query layer first: write-path conflicts are silent failures; catching them before UI ships avoids cross-layer debugging
- Pure function + picker second: readiness logic must be centralized before any UI surface renders it (prevents Pitfall 9)
- Forms last: form reset behavior via useEffect([open]) is the most subtle integration surface; benefits from stable backend already in place
- No migrations across any phase -- all target columns already exist
- UNITS_KEY invalidation already covers all new writes -- no new cache keys in any phase

### Research Flags

All phases have well-documented patterns. None require /gsd:plan-phase --research-phase:
- **Phase 1:** SQL patterns mirror existing basing/varnish detection exactly; all extension points confirmed from source
- **Phase 2:** computeUnitReadiness mirrors computeAssignmentProgress; useUnitsEnriched() already in production
- **Phase 3:** Faction filtering mirrors UnitPickerDialog prop pattern already used for army list filtering

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All relevant source files read directly; zero ambiguity about what exists |
| Features | HIGH | Existing code traced through all 12 call sites; competitors confirmed manual-only |
| Architecture | HIGH | Key files read line-by-line; exact SQL patterns specified; extension points confirmed |
| Pitfalls | HIGH | All 12 pitfalls derived from direct codebase inspection, not inference |

**Overall confidence:** HIGH

### Gaps to Address

- **section_type mapping for varnish:** finishing is the closest existing type but ambiguous (could mean edge highlights, not just varnish). Decision needed before Phase 1: use finishing as-is or add an explicit varnish value alongside assembly. Adding explicit values is cleaner.
- **Points-remaining filter UX interaction model:** Quartermaster app was described in search results but not directly accessed (MEDIUM confidence). Decision needed before Phase 2: hide unaffordable units vs. badge-fade vs. show below a divider.
- **is_active_project auto-clear on 100%:** STACK/FEATURES research suggested clearing at 100%; PITFALLS recommends omitting auto-clear entirely. Adopt the PITFALLS recommendation (auto-set-only policy) unless there is explicit product intent otherwise.

## Sources

### Primary (HIGH confidence -- direct codebase reads)
- src/db/queries/recipeAssignments.ts -- syncDerivedStatuses() lines 211-272, all assignment CRUD
- src/db/queries/units.ts -- updateUnit() COALESCE pattern
- src/db/queries/armyLists.ts -- getArmyListWithUnits(), getArmyListReadiness() battle-ready definition
- src/features/army-lists/UnitPickerDialog.tsx -- current display (no readiness)
- src/features/recipes/RecipeFormSheet.tsx -- DEFAULT_VALUES, no faction pre-fill on create
- src/features/recipes/ApplyRecipeDialog.tsx -- full recipe list, no faction grouping
- src/types/recipeSection.ts -- SECTION_TYPES const
- src/types/unit.ts -- all status field types
- src/lib/computeAssignmentProgress.ts -- pure function pattern template
- src/hooks/useRecipeAssignments.ts -- full cache invalidation chains
- src/hooks/useUnits.ts -- UNITS_KEY, useUnitsEnriched() confirmation
- src/context/ActiveFactionContext.tsx -- global faction context
- .planning/PROJECT.md -- Key Decisions log

### Secondary (MEDIUM confidence)
- Figure Case -- Hobby Progress (App Store) -- confirmed manual status updates only
- Pile of Potential (Wargamer review) -- confirmed manual updates only
- Quartermaster army builder -- points-remaining filter pattern described; not directly accessed

### Tertiary (supporting UX patterns)
- UX Patterns: Good Defaults (UI-Patterns.com) -- pre-fill from context, allow override
- Zuko Blog: Smart Defaults in Forms -- defaults should reflect most-likely user intent

---
*Research completed: 2026-05-28*
*Ready for roadmap: yes*
