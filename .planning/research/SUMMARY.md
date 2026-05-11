# Project Research Summary

**Project:** HobbyForge v0.2.9 -- Recipes 3.1 / Workflow Semantics & Integrations
**Domain:** Warhammer miniature painting workflow management (desktop app extension)
**Researched:** 2026-05-11
**Confidence:** HIGH

## Executive Summary

HobbyForge v0.2.9 is a pure extension milestone: adding workflow semantics (section_type, technique, execution_mode, applies_to) to the existing recipe sections model, then surfacing that metadata across the app key interaction points -- the recipe timeline, the session logging sheet, the Kanban board, and the dashboard focus card. No new libraries are required. Every UI pattern, query pattern, and data flow pattern already exists in the codebase. The work is integration-heavy but architecturally routine.

The recommended approach is a strict 4-phase build following the dependency chain: schema + data layer first, then recipe form/display UI, then session logging cascade, then cross-feature integrations (Kanban + Dashboard). This order ensures each phase has stable foundations and avoids the primary risk: the DELETE-all + re-INSERT save pattern on recipe sections, which silently destroys any FK references from painting_sessions. The research strongly recommends using a denormalized TEXT column (section_name) on painting_sessions instead of a FK to recipe_sections, matching the established denormalization pattern used elsewhere in the codebase (detachment_name, weapon_name).

The main risks are: (1) the DELETE-all + re-INSERT pattern destroying session-section links, (2) the DraftSection round-trip silently erasing new metadata fields if not extended atomically with the migration, and (3) N+1 query explosions if workflow data is fetched per-card in the Kanban board instead of batch-queried at page level. All three have clear prevention strategies documented in the pitfalls research. With disciplined implementation following existing patterns, this milestone carries low technical risk.
## Key Findings

### Recommended Stack

No new dependencies. The existing stack (Tauri 2, React 19, TypeScript 5, shadcn/ui, React Query, React Hook Form, Zustand) handles every requirement. The milestone adds one SQL migration file (4 ALTER TABLE ADD COLUMN on recipe_sections, 1 on painting_sessions), extends existing TypeScript types with const arrays for new enum-like fields, and wires new Select/Badge components from shadcn/ui -- all already in use throughout the app.

**Core technologies (all existing):**
- **tauri-plugin-sql**: Standard ALTER TABLE ADD COLUMN migration -- same pattern used 19 times already
- **shadcn/ui Select + Collapsible**: Workflow metadata editing via progressive disclosure in RecipeSectionCard
- **React Hook Form watch()**: 3-level cascading selector in LogSessionSheet (recipe -> section -> step)
- **React Query batch enrichment**: Extend useKanbanEnrichment with workflow summary data -- no per-card hooks

### Expected Features

**Must have (table stakes):**
- Section-type metadata (section_type column) -- sections need semantic meaning beyond just grouping
- Execution mode (sequential/batch/parallel) -- painters need to declare workflow intent
- Section technique column -- dominant technique per section (distinct from step-level)
- Applies-to column -- specific model area targeting complementing the broad surface field
- Compact metadata badges in SectionedTimeline -- users scanning recipes need metadata at a glance
- LogSession section-aware cascading selector -- Recipe -> Section -> Step (currently flat)
- Workflow metadata editing UI with progressive disclosure -- must not clutter default experience

**Should have (differentiators):**
- Kanban card section-aware next step -- "Armour: Shade with Nuln Oil" instead of generic "Apply shade"
- CurrentFocus section-aware guidance -- transforms dashboard from status display to workflow navigator
- Workflow-aware session duration estimates -- "estimated remaining: ~45 min (3 sections left)"

**Defer to v0.3.0+:**
- Explicit step-by-step completion checkboxes -- turns creative tool into checkbox app
- Automated painting status advancement -- too rigid for multi-recipe units
- Section templates / shared section library -- over-engineering for personal tool
- Section progress tracking table -- high complexity, needs its own milestone
- Section dependency graphs -- over-constraining for a hobby tool

### Architecture Approach

The architecture is purely additive: 4 new nullable columns on recipe_sections, 1 new nullable column on painting_sessions, 1 new batch query function, and UI extensions to 6 existing components. No new database tables, no new React contexts, no new Zustand stores. The critical architectural decision is the session-section link strategy: denormalized TEXT (section_name) on painting_sessions instead of FK, avoiding the DELETE-all + re-INSERT cascade destruction. Data flows through existing layers (UI -> React Query hooks -> query modules -> SQLite) with zero new architectural concepts.

**Major components:**
1. **recipe_sections (DB)** -- Stores 4 new workflow metadata columns; feeds into form UI, timeline display, and cross-feature enrichment queries
2. **painting_sessions (DB)** -- Stores section_name (denormalized) for session-section association that survives recipe edits
3. **LogSessionSheet (UI)** -- 3-level cascading selector (recipe -> section -> step) with proper reset chain
4. **useKanbanEnrichment (hook)** -- Extended batch query adding workflow summary data for all active-project cards in a single query
5. **getNextActionHint (utility)** -- Layered hint system: section-aware when available, status-based fallback

### Critical Pitfalls

1. **DELETE-all + re-INSERT destroys session FKs** -- Use denormalized TEXT column (section_name) on painting_sessions instead of FK. The existing save pattern silently NULLs any FK referencing recipe_sections on every recipe save.
2. **DraftSection round-trip erases new metadata** -- Extend DraftSection, buildDraftSections, makeDraftSection, and createRecipeSection INSERT atomically with the migration. If any link in the chain is missed, metadata is silently lost on every save.
3. **Cascading selector 3-level desync** -- Two useEffects required: recipe change clears section AND step; section change clears step. Missing either allows cross-recipe section references that pass FK validation but are structurally invalid.
4. **N+1 queries in Kanban cards** -- Never put per-recipe hooks inside KanbanCard. Batch query at page level via useKanbanEnrichment, prop-drill the Map.
5. **Progressive disclosure threshold collision** -- Single-section recipes with workflow metadata must show section card UI. Adjust threshold to check for non-null metadata, not just section count.
## Implications for Roadmap

Based on research, suggested phase structure:

### Phase 1: Schema + Data Layer
**Rationale:** Every other phase depends on the migration and type extensions. The column type decision for session-section linking (FK vs denormalized text) must be locked before any UI code references it.
**Delivers:** Migration file, extended TypeScript types (RecipeSection, DraftSection, PaintingSession, CreateSessionInput), updated query modules (INSERT/UPDATE with new params), new const arrays for section_type and technique values.
**Addresses:** Section-type metadata, execution mode, technique, applies_to columns.
**Avoids:** Pitfall 1 (FK cascade destruction -- decide denormalized TEXT here), Pitfall 3 (DraftSection round-trip -- extend atomically), Pitfall 7 (NULL section_id handling -- document LEFT JOIN contract), Pitfall 12 (applies_to ambiguity -- decide enum vs free-text).

### Phase 2: Recipe Form UI + Timeline Display
**Rationale:** Workflow metadata must be editable and visible in recipe context before it can be surfaced elsewhere. This phase has zero cross-feature dependencies -- it modifies only recipe-domain components.
**Delivers:** Workflow metadata editing in RecipeSectionCard (progressive disclosure), compact metadata badges in SectionedTimeline, adjusted progressive disclosure threshold for single-section recipes.
**Addresses:** Workflow metadata editing UI, compact metadata badges in SectionedTimeline.
**Avoids:** Pitfall 4 (progressive disclosure threshold collision -- adjust threshold based on metadata presence), Pitfall 11 (badge visual overflow -- icon badges + tooltips at narrow widths).

### Phase 3: LogSession Section-Aware Cascade
**Rationale:** The session logging flow is isolated from Kanban/Dashboard and smaller in scope (2 files vs 6). Building it before cross-feature integration ensures the section_name data starts accumulating on sessions, which enriches subsequent Kanban/Focus displays.
**Delivers:** 3-level cascading selector in LogSessionSheet (recipe -> section -> step), section_name saved on painting_sessions, step filtering by selected section.
**Addresses:** LogSession section-aware cascading selector, session-section linking.
**Avoids:** Pitfall 2 (cascading selector desync -- two useEffects with proper reset chain), Pitfall 10 (form bloat -- progressive disclosure for section/step selectors).

### Phase 4: Kanban + CurrentFocus Integration
**Rationale:** Cross-feature integration comes last because it consumes data produced by all prior phases. The batch query pattern and hint layering strategy must be designed before touching any leaf components.
**Delivers:** Section-aware workflow context on KanbanCard, section-aware next action hint on CurrentFocusCard, enriched getNextActionHint with section-based priority and status-based fallback.
**Addresses:** Kanban card section-aware next step, CurrentFocus section-aware guidance.
**Avoids:** Pitfall 5 (competing hint sources -- layered priority with fallback), Pitfall 6 (N+1 queries -- batch at page level), Pitfall 8 (cross-feature coupling), Pitfall 9 (cache invalidation gap -- add new keys to invalidation contract).

### Phase Ordering Rationale

- Schema first because every subsequent phase reads or writes the new columns. Building UI before migration creates compilation errors or requires stub types.
- Form UI before integrations because users need to populate metadata before it can be displayed elsewhere.
- LogSession before Kanban/Focus because session data with section_name enriches the "current position" heuristic used by Kanban/Focus hints.
- Kanban and CurrentFocus together because they share the derivation logic (getSectionAwareHint) and the batch enrichment query pattern.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 3 (LogSession cascade):** The 3-level cascading selector with reset chain is the most complex UI interaction in this milestone. Worth a focused design pass.
- **Phase 4 (Kanban + CurrentFocus):** The "current section" heuristic (first non-optional section by order_index) is a design decision with UX implications. May need validation during planning.

Phases with standard patterns (skip research-phase):
- **Phase 1 (Schema + Data Layer):** Pure migration + type extension. Pattern used 19 times. No research needed.
- **Phase 2 (Form UI + Timeline):** Adding Select fields and Badge components to existing card/timeline components. Established patterns throughout the app.
## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | No new dependencies. Every technology confirmed via direct codebase inspection. |
| Features | HIGH | Feature set derived from existing domain patterns and competitive analysis. Clear table stakes vs differentiators. |
| Architecture | HIGH | All findings from codebase analysis. Every component, hook, query, and data flow path verified against existing code. |
| Pitfalls | HIGH | All pitfalls derived from inspecting actual save patterns, cascade rules, and cache invalidation contracts. No speculative risks. |

**Overall confidence:** HIGH

### Gaps to Address

- **Session-section link strategy:** Research recommends denormalized TEXT (section_name), but this precludes future JOIN-based queries. If section-level analytics are planned for v0.3.0+, the FK + SET NULL approach may be preferable. Decide during Phase 1 requirements.
- **applies_to enum vs free-text:** STACK.md recommends free-text, PITFALLS.md warns it degenerates into a second notes field. Decide during Phase 1 requirements -- if any future filtering/grouping is planned, use a const array.
- **"Current section" heuristic accuracy:** The first-non-optional-section-by-order-index heuristic is simple but may not match user expectations for partially-painted models. Validate during Phase 4 planning.

## Sources

### Primary (HIGH confidence)
- Direct codebase analysis of all referenced files (types, queries, hooks, components, migrations)
- Existing pattern verification: DELETE-all + re-INSERT, cascading selectors, batch enrichment, cache invalidation contracts, progressive disclosure thresholds

### Secondary (MEDIUM confidence)
- [PaintMyMinis](https://www.paintmyminis.de/) -- competitive analysis for recipe/workflow features
- [Goonhammer Hobby 101: Batch Painting](https://www.goonhammer.com/hobby-101-batch-painting/) -- batch vs sequential workflow validation
- [Gamer Grove Painting Guide](https://gamersgrove.com/blogs/front-page/warhammer-painting-how-to-use-base-shade-and-layer-paints) -- canonical basecoat/shade/layer workflow reference

---
*Research completed: 2026-05-11*
*Ready for roadmap: yes*
