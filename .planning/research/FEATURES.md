# Feature Research

**Domain:** Hierarchical recipe/workflow sections in a miniature painting app
**Researched:** 2026-05-08
**Confidence:** HIGH (domain patterns clear; competitor landscape is sparse in this niche, but real-world painting community workflows provide strong signal)

---

## Context

This research covers the *section/grouping layer* being added on top of an existing recipe system. The existing recipe already has: CRUD, structured steps (painting_phase, tool, technique, dilution, time, photo, alt_paint), drag-and-drop step reorder, availability badges, duplication, and session-recipe integration.

The question is: what features belong in the **section layer**, which are differentiators, and which should be avoided?

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features the section layer must have to feel complete. Absence = product feels broken or half-built.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Section CRUD (name, create, edit, delete) | Any grouping without editable names is useless — users need to name areas like "Armor Blue", "Gold Trim", "Base" | LOW | Section name is the primary identifier; inline editing preferred over modal |
| Section ordering (drag-and-drop reorder between sections) | Steps already have DnD reorder; sections should behave identically at their level — inconsistency would feel broken | MEDIUM | Outer DnD context wrapping existing inner DnD; @dnd-kit supports nested sortable with conditional context logic |
| Step-in-section ordering (DnD within a section) | Must preserve existing step DnD behavior within a section — regression would be immediately noticed | MEDIUM | Existing RecipeStepList already handles this; needs to be scoped to a section container |
| Section collapse/expand | Sections add visual noise; collapse is standard accordion UX (Linear 2025, Notion, accordion patterns all confirm this) | LOW | Collapsible sections are table stakes for any grouped list UI; LinearApp shipped collapsible sections March 2025 |
| Section summary line (step count, optional surface badge) | Users need to assess section scope without expanding — summary information reduces cognitive load | LOW | Step count + surface label sufficient; no need for per-section time totals at v1 |
| Default section auto-created | Simple one-section recipes must remain as frictionless as today — any regression in simple recipe creation is a regression in the whole feature | LOW | Migration creates one default section per existing recipe; new recipes auto-create one default section |
| Backward-compatible section_id nullable on steps | Steps without a section must still render — graceful fallback to flat list if no sections exist | LOW | Critical for zero-downtime migration; section_id is nullable by design |
| Recipe duplication copies sections | Duplication is a heavily used action (existing feature); if duplication drops sections, users will notice immediately | MEDIUM | Requires copying recipe_sections rows before copying recipe_steps rows; FK ordering matters |
| Section-aware detail view (workflow timeline) | RecipeDetailSheet shows steps in order — section headers between step groups is the natural extension and directly serves the core "workflow" use case | MEDIUM | Replace flat timeline with grouped timeline; section header shows name, surface, step count |
| Section-aware recipe form (sectioned step list) | Form creates/edits sections and their steps — if form is still flat while detail shows sections, the model is confusing | HIGH | Largest piece: draft sections containing draft steps, replacing current flat draft steps |

### Differentiators (Competitive Advantage)

Features that go beyond what competitors offer and directly serve the painting-specific use case.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Surface label per section (e.g., Armor, Metal, Base) | Maps directly to how miniature painters think: "armor first, then trim, then base" — no competitor app offers section-level surface classification | LOW | Reuses existing RECIPE_SURFACES enum; dropdown on section; section-level surface acts as grouping header, step-level surface remains for per-step detail |
| Optional section flag | "Display-level upgrade" sections (e.g., NMM reflection on lenses) can be marked as skippable for tabletop-quality painters — unique to this domain's Battle Ready vs Parade Ready distinction | LOW | Simple boolean on section; UI shows "(optional)" badge; RecipeDetailSheet can visually de-emphasize optional sections |
| Section-level missing-paint count badge | Aggregating missing paints per section tells the user "I can't start Gold Trim yet — missing 2 paints" — more actionable than a recipe-level count | MEDIUM | Requires joining section → steps → paints → inventory per section; reuses availability query pattern from getRecipePaintAvailability |
| Section-level time estimate rollup | Summing time_estimate_minutes from steps within a section gives a per-section duration ("Armor Blue ~45 min") — enables realistic session planning | LOW | Pure SQL aggregation: SUM(time_estimate_minutes) GROUP BY section_id; no new data needed since steps already carry time_estimate_minutes |
| Subassembly modeling via sections | Advanced painters who paint arms/torsos/cloaks separately before assembly can name sections by subassembly — the optional flag doubles as a "paint before assembly" grouping marker | LOW | No extra data model needed; users adopt by convention; section notes field supports "assemble after this section" guidance |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem like natural extensions but add disproportionate complexity for this tool's scope.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Cross-section drag-and-drop (move steps between sections) | Feels like natural DnD completeness — if you can reorder sections and steps within a section, why not move steps across sections? | @dnd-kit cross-list sortable (Issue #714) is significantly more complex than within-list sortable — cross-list state management, collision detection across containers, event propagation conflicts. Milestone context explicitly defers this for v1. Risk of breaking existing step DnD. | Provide a "Move to section" dropdown on step row — button-based section reassignment requires one UPDATE query, no DnD plumbing, and is easily discoverable |
| Section dependency graph (section B unlocks after section A) | "Can't do Gold Trim until Armor is done" sounds useful | Dependency graphs require tracking completion state per section, rendering blocked/available states, preventing edits to blocked sections — scope explodes into a mini project management tool; no miniature painting app has shipped this | The optional flag + section ordering already implies sequence; users understand visual ordering = suggested sequence without needing enforced dependencies |
| Per-section photo upload | "Show what the section looks like complete" | Sections are intermediate states, not final outcomes; photos are already on steps (step_photo_path); adding section photos means managing another file storage path, more UI surface, and doubles the photo management problem | Use the step photo on the final step within a section as the "section result" photo; the recipe-level result_photo_path covers the overall result |
| Section templates (reusable section presets) | "I always use the same Basing workflow" — save it as a reusable template | Template libraries require a separate data model (section_templates table), a template picker UI, an "apply template" mutation, and a template management page — this is its own milestone | Recipe duplication already handles this: create a recipe named "Base Template", duplicate it whenever you want to reuse the structure |
| Section execution mode (batch vs model-by-model) | Power users want to flag "do this step on all 10 marines at once" | This metadata has no downstream effect in the current app — no session tracking consumes it, no reports use it, no UI changes behavior based on it; purely aspirational metadata with zero return on investment | Defer until LogSessionSheet supports section selection; record in section notes field if users need it before then |
| Section-level progress tracking (completion %) | "Mark section as done" feeds hobby progress metrics | Session-recipe integration currently tracks which step was last worked on; adding section-level completion requires its own state table, session invalidation logic, and query complexity | The milestone context notes LogSessionSheet section integration as a future target; implement then, not now |
| Infinite nesting (sections within sections, sub-sections) | Seems like a natural extension once one level of hierarchy exists | UX research on nested tabs and grouped lists consistently warns against more than 2 levels of nesting depth; miniature painting never needs more than Recipe/Section/Step; deeper nesting adds navigation complexity with no painting domain value | The 3-level model covers all real-world patterns: subassemblies, technique blocks, and surface areas |

---

## Feature Dependencies

```
[Section CRUD]
    required by──> [Section-aware form]
    required by──> [Section-aware detail view]
    required by──> [Section ordering (DnD)]
    required by──> [Recipe duplication with sections]
    required by──> [Section-level time rollup]
    required by──> [Section-level missing-paint count]
    requires──> [Migration 016 (recipe_sections table + section_id on steps)]

[Step-in-section ordering]
    requires──> [Section CRUD]
    extends──> [Existing step DnD in RecipeStepList]

[Section-level missing-paint count]
    requires──> [Section CRUD]
    extends──> [Existing getRecipePaintAvailability query pattern]

[Optional section flag]
    requires──> [Section CRUD]
    enhances──> [Section-aware detail view]

[Section-level time rollup]
    requires──> [Section CRUD]
    requires──> [Steps having time_estimate_minutes (already exists)]

[Surface label per section]
    requires──> [Section CRUD]
    reuses──> [RECIPE_SURFACES enum (already exists)]

[Recipe duplication with sections]
    requires──> [Section CRUD]
    extends──> [Existing duplicateRecipe in recipes.ts]

[Section-aware form]
    requires──> [Section CRUD]
    extends──> [Existing RecipeFormSheet]
    extends──> [Existing RecipeStepRow (unchanged inside sections)]
    depends_on──> [DraftSection type alongside existing DraftStep]

[Section-aware detail view]
    requires──> [Section CRUD]
    extends──> [Existing RecipeDetailSheet]
    extends──> [Existing RecipeStepTimeline]
```

### Dependency Notes

- **Section CRUD requires Migration 016:** The database layer must land before any UI or query work — this is Phase 1 in the implementation sequence.
- **Section-aware form requires Section CRUD:** The form manages draft sections in memory; mutations only fire on save, but the data model must exist first.
- **Section DnD extends existing step DnD:** Both use @dnd-kit; section DnD is an outer SortableContext wrapping the existing inner SortableContext per section. The key risk is the documented RHF useFieldArray + useSortable ID collision — the existing workaround (manual array + useMemo) must be extended to draft sections.
- **Section detail view is safer to build before form:** Read-only rendering of sections has no mutation risk; building it first provides a verification checkpoint before the more complex form changes.
- **Section-level missing-paint count is a P2 feature:** It depends on Section CRUD but is independent of the form and detail view. Can be added after the core section layer is working.

---

## MVP Definition

For v0.2.7, "MVP" means: the section layer ships complete for the described scope. This is not an exploratory MVP — it is a well-scoped feature milestone.

### Launch With (v1 — this milestone)

- [ ] Migration 016: recipe_sections table + section_id FK on recipe_steps + data migration wrapping existing steps in default sections
- [ ] TypeScript types: RecipeSection, CreateRecipeSectionInput, UpdateRecipeSectionInput; RecipeStep gains section_id
- [ ] Query module (recipeSections.ts): getRecipeSections, createRecipeSection, updateRecipeSection, deleteRecipeSection, reorderRecipeSections
- [ ] Query additions (recipePaints.ts): getRecipeStepsBySection, moveStepToSection (button-based cross-section reassignment)
- [ ] Hook module (useRecipeSections.ts): query + all mutations with correct cache invalidation
- [ ] RecipeDetailSheet: section-grouped workflow timeline with section headers, step count, surface badge
- [ ] RecipeSectionList + RecipeSectionCard components: collapsible, section DnD reorder, section summary line
- [ ] RecipeFormSheet: draft sections containing draft steps (existing RecipeStepRow unchanged inside)
- [ ] Section CRUD in form: add section, edit section name/surface/optional, delete section (cascades steps)
- [ ] Default section auto-creation for new recipes and for recipes migrated from flat step list
- [ ] Recipe duplication copies sections + steps (maintains section → step FK relationships)
- [ ] Regression: paint availability badges, swatch strips, wishlist, LogSessionSheet step selector all unaffected

### Add After Validation (post-v0.2.7)

- [ ] Section-level missing-paint count badge on RecipeSectionCard — add when users report friction identifying which section they can start next
- [ ] Section-level time estimate rollup in detail view — add when session planning is the primary workflow trigger
- [ ] LogSessionSheet section selector — when session tracking becomes the primary workflow trigger
- [ ] Move-step-to-section button on RecipeStepRow — add when users report the section assignment workflow feels clunky

### Future Consideration (v2+)

- [ ] Section templates / reusable section presets — defer until recipe library grows large enough to justify template management UI
- [ ] Per-section completion tracking — defer until LogSessionSheet section integration lands and provides the completion signal

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Migration 016 + data migration | HIGH | LOW | P1 |
| Section CRUD (query + hook layer) | HIGH | LOW | P1 |
| Section-aware detail view (RecipeDetailSheet) | HIGH | MEDIUM | P1 |
| Section-aware form (RecipeFormSheet) | HIGH | HIGH | P1 |
| Section DnD reorder | HIGH | MEDIUM | P1 |
| Collapsible section cards | HIGH | LOW | P1 |
| Surface label per section | MEDIUM | LOW | P1 |
| Optional section flag | MEDIUM | LOW | P1 |
| Recipe duplication with sections | HIGH | MEDIUM | P1 |
| Section-level time rollup | MEDIUM | LOW | P2 |
| Section-level missing-paint count | MEDIUM | MEDIUM | P2 |
| Move-step-to-section button | MEDIUM | LOW | P2 |
| Cross-section drag-and-drop | LOW | HIGH | P3 (anti-feature for v1) |
| Section templates | LOW | HIGH | P3 |
| Per-section photo | LOW | MEDIUM | P3 |

**Priority key:**
- P1: Must have for milestone to be considered done
- P2: Should have, add when P1 is working
- P3: Nice to have — defer; some are anti-features at this scope

---

## Competitor Feature Analysis

| Feature | PaintPad | Brushrage | PaintMyMinis | HobbyForge (v0.2.7 target) |
|---------|----------|-----------|--------------|---------------------------|
| Intra-recipe grouping / sections | Not found — flat step list or free-text tutorial | Not found — paint-set based, no structured steps | Not found — flat paint/step list | Section layer with surface labels, ordering, collapse |
| Section ordering | N/A | N/A | N/A | DnD reorder |
| Optional sections | N/A | N/A | N/A | optional flag |
| Section-level surface classification | N/A | N/A | N/A | Surface label reusing RECIPE_SURFACES enum |
| Drag-and-drop step reorder | Not documented | Not documented | Not documented | Existing within-section DnD |
| Paint availability per section | N/A | Paint inventory/wishlist | Paint inventory | Per-section missing-paint count (P2) |

No miniature painting app surveyed (PaintPad, Brushrage, PaintMyMinis, paintRack) currently implements a hierarchical section layer within recipes. All use flat step or paint-set lists. This is a genuine differentiator — not a catch-up feature.

---

## Real-World Painting Workflow Patterns (Domain Signal)

Research into community painting tutorials and guides (Warhammer Community, Goonhammer, DakkaDakka, Age of Miniatures, Army Painter) consistently describes painting workflows in section terms:

1. **Area-first approach:** "Do all the armor, then the cloth, then the metal, then the skin" — maps directly to Recipe → Section (surface area) → Steps. The area-first vs phase-first distinction is a central community debate, and the section model supports both.

2. **Subassembly separation:** Legs, torso, arms, head, backpack are often painted before final assembly. Sections map naturally to body part groupings with notes like "attach after this section."

3. **Technique block separation:** Sponge weathering, airbrush stages, NMM passes are distinct workflow blocks that cut across surface areas but form coherent technique sections. The section model supports this without forcing a surface label.

4. **Battle Ready vs Parade Ready distinction:** Optional sections for display-quality work (OSL lenses, freehand, edge highlights on every surface) that tabletop painters skip. The optional section flag maps directly to this recognized community pattern.

5. **Section-before-moving-on:** "It is best to do one section at a time by doing the base coat, washing, and then drybrushing" — validates the core premise that flat linear steps don't model real painting behavior. The section system lets users model this as distinct section blocks rather than interleaved steps.

---

## Sources

- PaintPad recipe structure: https://paintpad.app/ (WebFetch — no intra-recipe sectioning found; MEDIUM confidence)
- Brushrage app features: https://play.google.com/store/apps/details?id=de.game_coding.trackmymi (MEDIUM confidence via app store description)
- PaintMyMinis features: https://www.paintmyminis.de/ (MEDIUM confidence)
- Miniature painting area-first workflow: https://www.wargamer.com/painting-miniatures (MEDIUM confidence)
- Warhammer Community official painting guide: https://www.warhammer-community.com/en-gb/articles/R3aCeiQA/how-to-paint-warhammer-expert-tips-for-two-very-different-types-of-painter/ (HIGH confidence)
- Subassembly painting practices: http://www.mengelminiatures.com/2014/09/hobby-use-of-subassemblies.html (MEDIUM confidence)
- Subassembly community discussion: https://cypaint.com/article/should-you-paint-a-miniature-before-putting-it-together (MEDIUM confidence)
- @dnd-kit nested sortable patterns: https://dndkit.com/concepts/sortable/ (HIGH confidence — official docs)
- @dnd-kit cross-list complexity issue: https://github.com/clauderic/dnd-kit/issues/714 (HIGH confidence — official repo issue)
- Linear collapsible sections (2025): https://linear.app/changelog/2025-03-19-collapsible-sections (HIGH confidence — official changelog)
- Accordion/collapsible UX best practices: https://muz.li/blog/the-ultimate-accordion-design-playbook/ (MEDIUM confidence)
- Cross-list DnD complexity analysis: https://www.digia.tech/post/drag-and-drop-ui-systems (MEDIUM confidence)
- Drag-and-drop UX antipatterns: https://www.pencilandpaper.io/articles/ux-pattern-drag-and-drop (MEDIUM confidence)
- Miniature painting app survey (List): https://minipainting.fandom.com/wiki/List_of_Miniature_Painting_Apps (MEDIUM confidence)

---
*Feature research for: HobbyForge v0.2.7 — Recipes 3.0 / Hierarchical Painting Workflows (section layer)*
*Researched: 2026-05-08*
