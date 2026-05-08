# Project Research Summary

**Project:** HobbyForge v0.2.7 -- Hierarchical Painting Workflows
**Domain:** Nested sortable recipe sections within an existing flat-step recipe system
**Researched:** 2026-05-08
**Confidence:** HIGH

## Executive Summary

HobbyForge v0.2.7 adds a section layer between recipes and steps, modeling the way miniature painters actually work: armor first, then cloth, then metal -- or by subassembly, or by technique block. No competitor app (PaintPad, Brushrage, PaintMyMinis) offers intra-recipe sectioning; this is a genuine differentiator, not a catch-up feature. The implementation is a well-scoped additive change: one new table (recipe_sections), a nullable FK on recipe_steps, and a new layer of UI components above the existing step machinery. All required libraries are already installed -- no new dependencies needed.

The recommended approach is a four-phase build ordered by risk: data layer first (migration + queries + hooks), then read-only UI (detail view), then the complex write path (form with nested draft state and DnD), then duplication and regression. This ordering means data-model mistakes are caught before any UI investment and the complex form rewrite is validated against a working read path. The existing codebase patterns -- manual useState arrays for DnD-managed drafts, crypto.randomUUID() localIds, delete-all-and-recreate submit strategy, and cache invalidation symmetry -- all extend cleanly to the section level without architectural changes.

The key risk is the DnD architecture decision: how two levels of sortable interact in a single @dnd-kit setup. This conflict between research files is resolved in a dedicated section below and must be locked in before any drag code is written in Phase 3.

---

## DndContext Conflict Resolution

The Stack researcher and Pitfalls researcher gave contradictory recommendations on DnD architecture. The resolution is unambiguous given the v0.2.7 scope.

**Stack researcher:** Two separate DndContext instances (outer for section reorder, one inner per section for step reorder). Rationale: cross-section step moves are explicitly out of scope; isolated contexts are simpler.

**Pitfalls researcher:** Single DndContext is non-negotiable. Nested DndContext instances are isolated silos by design -- drag events are consumed by the innermost context and never bubble to the outer one. Dragging a section header near a step activates the wrong context. Integer ID collisions occur between section and step IDs in nested contexts (GitHub issues #46, #766, #280).

**Resolution: The two-DndContext approach is correct for v0.2.7, but only because steps use UUID localId strings (not integer DB IDs) as their sortable identifiers, which eliminates the integer collision risk.** The pitfalls concern about ID collisions is valid but already mitigated by the existing localId: crypto.randomUUID() convention on DraftStep. Since cross-section step moves are out of scope, the inner DndContexts are intentionally isolated silos -- that is the desired behavior, not a bug. The pitfalls single-DndContext recommendation applies to the pattern where cross-container moves are needed; it is the wrong pattern here.

**Implementation decision:**
- RecipeSectionList owns one outer DndContext for section reorder (items = section localIds)
- RecipeSectionCard renders RecipeStepList, which retains its existing inner DndContext for step reorder (items = step localIds)
- Both levels use crypto.randomUUID() localIds -- never integer DB IDs -- ensuring no namespace collision
- When cross-section step drag is added in v0.2.8+: collapse to single DndContext, add data: { type: section/step, sectionId } to useSortable calls, implement onDragOver type discrimination

---

## Key Findings

### Recommended Stack

No new packages are required. @dnd-kit/core (6.3.1) and @dnd-kit/sortable (10.0.0) fully support nested SortableContext instances. The Collapsible component (radix-ui 1.4.3) is already installed and used in three existing components (LoadoutSection, PlaybookTab, BattleLogRow). React Hook Form continues to manage only recipe-level fields; sections and steps bypass RHF via manual useState -- consistent with the existing v2.5 decision that avoids the documented RHF #10607 ID collision with useSortable.

**Core technologies:**
- @dnd-kit/core + @dnd-kit/sortable: Two-level DnD (sections + steps) -- already installed, nested SortableContext confirmed supported
- shadcn/ui Collapsible: Section card collapse/expand -- already installed, ARIA/keyboard provided by Radix
- React useState + crypto.randomUUID(): Draft section/step array management -- same pattern as v2.5 DraftStep, extended one level up
- React Hook Form + Zod: Recipe-level fields only -- boundary unchanged from v2.5

**What NOT to add:** shadcn/ui Accordion (enforces XOR-open, recipe sections need independent collapse); useFieldArray for sections or steps (RHF #10607 ID collision -- manual state is the project standard); @dnd-kit/modifiers (not needed for vertical list sorting).

### Expected Features

**Must have (table stakes) -- v0.2.7 P1:**
- Migration 018: recipe_sections table + nullable section_id FK on recipe_steps with data migration grouping existing steps into default sections
- Section CRUD: name, surface label (reuses RECIPE_SURFACES enum), optional flag -- inline editing, no modal
- Section ordering via drag-and-drop reorder (outer DndContext)
- Step ordering preserved within each section (existing inner DndContext, unchanged)
- Collapsible section cards -- each section independently open/closed
- Section summary line on card header: step count + surface badge
- Default section auto-created for new recipes and migrated recipes
- Section-aware form (RecipeFormSheet rewrite: DraftSection[] containing DraftStep[])
- Section-aware detail view (RecipeDetailSheet conditional: RecipeSectionedTimeline when sections exist, RecipeStepTimeline fallback)
- Recipe duplication copies sections with section ID remap for steps (critical -- see Pitfall 4)
- Backward compat: section_id nullable; existing consumers (LogSessionSheet, RecipeCard, batch queries) unchanged

**Should have (differentiators) -- add post-validation:**
- Section-level missing-paint count badge
- Section-level time estimate rollup -- pure SQL SUM(time_estimate_minutes) GROUP BY section_id
- Move-step-to-section button on step row -- button-based cross-section reassignment

**Defer to v2+:** Section templates (recipe duplication already covers the use case); per-section completion tracking (depends on LogSessionSheet section integration); cross-section drag-and-drop (reserved as v0.2.8 upgrade path).

**Anti-features (do not build):** Per-section photo upload (step photos already solve this); section dependency graph (scope explodes into project management tool); infinite nesting / sub-sections (3-level model covers all real-world painting patterns).

### Architecture Approach

The section layer integrates into the existing four-tier architecture (UI -> React Query hooks -> query modules -> SQLite) with three new files (recipeSection.ts types, recipeSections.ts queries, useRecipeSections.ts hook) and one significant rewrite (RecipeFormSheet) plus one moderate update (RecipeDetailSheet). Critical constraints: (1) DraftSection[] uses the same manual-state + UUID-localId pattern as DraftStep[]; (2) form submit uses delete-all-and-recreate for sections; (3) ON DELETE CASCADE on recipe_steps.section_id handles step cleanup -- never delete steps manually before deleting a section; (4) batch query helpers (getStepCountsByRecipe, getRecipePaintAvailability, getRecipeSwatchColors) are left completely unchanged.

**Major components:**
1. src/types/recipeSection.ts -- RecipeSection, CreateRecipeSectionInput, UpdateRecipeSectionInput
2. src/db/queries/recipeSections.ts -- 6 query functions: getRecipeSections, createRecipeSection, updateRecipeSection, deleteRecipeSection, reorderRecipeSections, getStepCountsBySection
3. src/hooks/useRecipeSections.ts -- all 5 mutations with 5-key invalidation contract on delete
4. RecipeSectionList.tsx -- outer DnD container for section reorder
5. RecipeSectionCard.tsx -- collapsible card with drag handle + collapse trigger as separate interaction zones
6. RecipeSectionForm.tsx -- inline name/surface editor (pure controlled inputs, no RHF)
7. RecipeSectionedTimeline.tsx -- read-only grouped timeline for RecipeDetailSheet
8. RecipeFormSheet.tsx (rewrite) -- DraftSection[] state, atomic initialization from both queries, delete-all-recreate submit

**Key patterns:** buildDraftSections(sections, steps) -- pure function tested independently before component wiring. Form initialization uses a single useEffect depending on both existingSections.length and existingSteps.length -- never two separate effects calling setSections. Progressive disclosure: single-section recipes hide section scaffolding; only adding a second section reveals section-level UI.

**Unchanged consumers (zero changes needed):** RecipeCard.tsx, RecipesPage.tsx, LogSessionSheet, KanbanCard, CurrentFocusCard, usePaints.ts mutations.

### Critical Pitfalls

1. **DndContext nesting conflict (resolved above)** -- Use two independent DndContext instances with UUID localIds. The isolated-silo behavior is desirable since cross-section step moves are out of scope. Establish the localId convention on DraftSection before any drag code (Phase 3).

2. **duplicateRecipe omitting section ID remap** -- Copying steps with original section_id creates structural corruption. Fix: build Map<oldSectionId, newSectionId> during section copy loop, remap each step section_id. First item in Phase 4.

3. **Two-phase draft initialization race** -- Two async queries feeding a single useEffect can briefly show an incomplete draft. Fix: single useEffect guarded on both queries resolving; buildDraftSections is a pure tested function, never called from multiple effects (Phase 3).

4. **Cache invalidation asymmetry on section delete** -- ON DELETE CASCADE makes 4 additional cache keys stale. useDeleteRecipeSection.onSuccess must invalidate all 5 keys: RECIPE_SECTIONS_KEY, RECIPE_PAINTS_KEY, STEP_COUNTS_KEY, RECIPE_AVAILABILITY_KEY, RECIPE_SWATCH_KEY. Document contract in comment block (Phase 1).

5. **Section UI overwhelming simple recipes** -- Single-section recipes hide section scaffolding entirely; Add Section is the gateway to the multi-section workflow (Phase 3).

6. **Order index drift** -- Use DraftSection[] array as source of truth; delete-all-and-recreate on submit guarantees contiguous order_index values (Phase 1 design, Phase 3 implementation).

---

## Implications for Roadmap

Based on research, suggested phase structure:

### Phase 1: Data Layer
**Rationale:** Data foundation before any UI. Migration mistakes caught early. All 5 cache keys and FK cascade chain established and tested here. Every other phase depends on this.
**Delivers:** Migration 018 (schema + data migration), TypeScript types, recipeSections.ts queries, useRecipeSections.ts hook with correct 5-key invalidation contract, section_id addition to addRecipePaint, passing tests for cascade chain and batch helper integrity.
**Avoids:** Cache asymmetry on section delete (Pitfall 7), order_index drift (Pitfall 9), cascade chain missing sessions (Pitfall 3), batch helpers broken (Pitfall 5).
**Research flag:** Standard patterns -- no research-phase needed.

### Phase 2: Read-Only UI (Detail View)
**Rationale:** Read-only rendering has no mutation risk. Validates the query layer works before the complex form changes. Single-section recipes show identical UI to v2.5 (progressive disclosure starts here).
**Delivers:** RecipeSectionedTimeline, updated RecipeDetailSheet with conditional render (sections vs flat fallback).
**Uses:** useRecipeSections hook from Phase 1, existing RecipeStepTimeline as fallback.
**Research flag:** Standard patterns -- no research-phase needed.

### Phase 3: Form UI (Write Path)
**Rationale:** Most complex phase. Builds on confirmed working data layer and detail view. DndContext architecture decision and progressive disclosure rule must be locked in before any drag code is written.
**Delivers:** RecipeSectionList, RecipeSectionCard, RecipeSectionForm, full RecipeFormSheet rewrite with DraftSection[] state, section DnD reorder, step DnD within sections (existing RecipeStepList unchanged), progressive disclosure, buildDraftSections pure function with tests.
**Avoids:** DndContext nesting conflict (resolved), two-phase initialization race (Pitfall 6), section UI overwhelming simple recipes (Pitfall 8).
**Research flag:** Standard patterns -- lock DndContext decision first (see resolution above).

### Phase 4: Duplication + Regression
**Rationale:** Duplication depends on a working section data model and verified FK relationships. Regression pass confirms no existing consumers broken.
**Delivers:** Updated duplicateRecipe with section ID remap, useDuplicateRecipe invalidating [recipe-sections] prefix, full regression pass across LogSessionSheet, batch helpers, paint availability, swatch strips.
**Avoids:** duplicateRecipe structural corruption (Pitfall 4 -- first item in this phase).
**Research flag:** Standard patterns -- no research-phase needed.

### Phase Ordering Rationale

- Data layer before UI prevents discovering schema mistakes after building UI on top
- Detail view before form: read-only path has zero mutation risk; verifies query layer before the complex form rewrite
- Form phase is self-contained: RecipeStepRow and RecipeStepList are unchanged -- slot into RecipeSectionCard without modification
- Duplication last: depends on confirmed FK integrity and working section rendering to verify the copy is structurally correct

### Research Flags

Needs research during planning: none -- all patterns are code-verified against the existing codebase.

Standard patterns (skip research-phase):
- **Phase 1:** SQLite migration + Tauri plugin-sql + React Query hooks -- established project patterns
- **Phase 2:** Read-only conditional rendering -- trivial extension of existing RecipeDetailSheet
- **Phase 3:** @dnd-kit nested SortableContext -- verified in official docs and KanbanBoard.tsx DragOverlay pattern
- **Phase 4:** duplicateRecipe extension -- straightforward loop + ID map pattern

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All packages code-verified in package.json; DnD nesting confirmed in official dnd-kit docs; Collapsible verified in 3 existing components |
| Features | HIGH | Domain signal from painting community; competitor landscape sparse but clear; milestone spec explicitly bounds scope |
| Architecture | HIGH | All findings from direct codebase reads of all affected source files; zero training-data assumptions |
| Pitfalls | HIGH | Derived from direct codebase inspection + GitHub issues #46, #766, #280, #714; migration FK chain verified against migrations 014 and 017 |

**Overall confidence:** HIGH

### Gaps to Address

- **DndContext conflict:** Resolved above -- two independent contexts with UUID localIds is correct for v0.2.7. Revisit if cross-section step drag is added in v0.2.8+.
- **Progressive disclosure exact threshold:** The exact UX treatment (auto-collapse vs. no card wrapper vs. hidden label) should be validated during Phase 3 implementation against the actual rendered form.
- **Migration number:** Verify next hobbyforge.db migration number at start of Phase 1. Git status shows rules_002_wargear_abilities.sql as untracked -- confirm 018 is correct and no filename ordering conflict exists.

---

## Sources

### Primary (HIGH confidence)
- src/features/recipes/RecipeFormSheet.tsx -- draft state pattern, submit strategy, useEffect sentinel
- src/features/recipes/RecipeStepList.tsx -- existing DnD pattern (DndContext + SortableContext + closestCenter)
- src/features/recipes/recipeSteps.ts -- DraftStep type, localId pattern, makeDraftStep
- src/db/queries/recipePaints.ts -- addRecipePaint INSERT, batch helpers GROUP BY recipe_id
- src/db/queries/recipes.ts -- duplicateRecipe copy loop
- src/hooks/useRecipePaints.ts -- 5 exported cache keys, invalidation pattern
- src-tauri/migrations/014_session_recipe_link.sql -- ON DELETE SET NULL on painting_sessions.recipe_step_id (cascade chain risk)
- src/features/painting-projects/KanbanBoard.tsx -- DragOverlay pattern already in use
- src/components/ui/collapsible.tsx -- Collapsible already installed
- package.json -- all package versions confirmed
- @dnd-kit Sortable Context official docs -- nested SortableContext confirmed supported
- @dnd-kit GitHub Issues #46, #280, #766 -- DndContext isolation constraints confirmed
- RHF Discussion #10607 -- useFieldArray + useSortable ID collision confirmed

### Secondary (MEDIUM confidence)
- PaintPad, Brushrage, PaintMyMinis app survey -- no intra-recipe sectioning found in competitors
- Warhammer Community painting guide -- area-first workflow validates section model
- Linear changelog (2025-03-19) -- collapsible sections as table stakes UX pattern
- @dnd-kit GitHub Issue #714 -- cross-list sortable complexity (why cross-section drag is deferred)
- @dnd-kit Discussions #821, #809 -- single DndContext production patterns for cross-container moves

### Tertiary (LOW confidence)
- Mengel Miniatures, cypaint.com -- subassembly painting practices (community signal)
- Miniature painting app survey list (fandom wiki) -- competitor enumeration

---
*Research completed: 2026-05-08*
*Ready for roadmap: yes*
