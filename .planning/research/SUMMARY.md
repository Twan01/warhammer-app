# Project Research Summary

**Project:** HobbyForge v0.7.0 "Technique Library"
**Domain:** Parameterized, live-linked reusable painting technique templates extending an existing recipe system on a local-first Tauri 2 + SQLite desktop app
**Researched:** 2026-06-19
**Confidence:** HIGH

---

## Executive Summary

The v0.7.0 Technique Library adds a canonical template layer above the existing recipe graph: a technique owns its structure (multiple sections, steps, phases, tools, dilutions, times) and declares named colour slots (e.g. OSL: Glow Core / Glow Mid / Glow Edge / Surface Tint). Recipes "use" a technique by filling each slot with a real paint from their inventory; multiple recipes can use the same technique with entirely different colour mappings. Structure is authored once and propagates everywhere via a live link -- this is the core value proposition and the source of the milestone's highest technical risk.

The recommended approach maps almost perfectly onto existing codebase patterns: the technique data model mirrors recipe_sections/recipe_steps exactly; TechniqueFormSheet mirrors RecipeFormSheet; the five-phase diff save (saveRecipeGraph) is reused for saveTechniqueGraph; the slot-fill dialog follows ApplyRecipeDialog; and the "from technique X" badge follows the existing shadcn Badge usage throughout. Zero new runtime or dev dependencies are needed -- this is a schema + React Query + RHF + dnd-kit feature. The four-layer stack (UI -> React Query hooks -> query modules -> tauri-plugin-sql) is unchanged. Confidence in the technical approach is HIGH because every pattern it needs already exists in production.

The key risk is step-identity and progress stability under live-link edits. The existing system (v0.2.13 migration 028) keys progress to `recipe_step_id` (a concrete PK in `recipe_steps`). The Technique Library introduces a new stable identity -- `technique_step_id` -- and the two research streams (ARCHITECTURE.md vs PITFALLS.md + FEATURES.md) reached opposite conclusions about how these identities should relate. This disagreement is the single most important design decision to resolve before any other phase begins; it determines the shape of every migration, every query, and every integration surface.

---

## Open Design Decision: Progress Key and Step Materialisation Strategy

**This is the #1 decision. It must be resolved at the start of Phase 1 before any migration is written.**

Both options claim to preserve the v0.2.13 step-identity invariant. They disagree on where the complexity lives: in the schema (materialised rows + re-sync) vs. in the query layer (virtual JOIN resolution + dual-column progress table).

---

### Option A: Materialise Technique Steps as `recipe_steps` Rows (ARCHITECTURE.md recommendation)

**Mechanism:** When a user applies a technique to a recipe, concrete `recipe_steps` rows are inserted, each carrying a `technique_step_id` FK column pointing back to its source `technique_steps` row. The `recipe_step_id` PK of each materialised row is the progress key -- unchanged from the existing system.

**Re-sync (on technique edit):** A `resyncTechniqueInstance` function runs after every `saveTechniqueGraph`. For each non-detached recipe instance it runs a diff (Map<technique_step_id, recipe_step_id>) and:
- SURVIVING step: UPDATE recipe_steps SET ... WHERE id = map[technique_step_id] -- same recipe_step_id PK, progress intact
- ADDED step: INSERT INTO recipe_steps (technique_step_id = ...) -- new PK, progress starts at zero
- REMOVED step: DELETE FROM recipe_steps WHERE technique_step_id = ... -- ON DELETE CASCADE cleans progress rows

**Schema additions under Option A:**
- ALTER TABLE recipe_sections ADD COLUMN technique_instance_id (nullable FK SET NULL)
- ALTER TABLE recipe_steps ADD COLUMN technique_step_id (nullable FK SET NULL)
- NEW: recipe_technique_instances, recipe_slot_fills
- NO change to unit_recipe_step_progress

**Paint resolution:** recipe_steps.paint_id is always NULL for technique-owned steps; effective paint is resolved at read time via LEFT JOIN through recipe_slot_fills (producing resolved_paint_id).

**Consumer-surface impact:** All downstream consumers (Painting Mode, paint availability, apply-to-units, SectionedTimeline, saveRecipeGraph diff, duplicateRecipe) need to use resolved_paint_id instead of paint_id. saveRecipeGraph must be guarded to skip steps with technique_step_id IS NOT NULL. No change to the progress table or its FK chain.

**Trade-offs:**

| Dimension | Assessment |
|-----------|-----------|
| Progress table change | None -- progress stays keyed to recipe_step_id |
| Query complexity | Low -- resolved_paint_id via LEFT JOIN through slot fills |
| Propagation complexity | HIGH -- explicit resyncAllInstancesForTechnique must run after every technique save |
| Detach complexity | Low -- clear FK columns; steps become standard recipe_steps |
| Risk of re-sync bug | HIGH -- incomplete re-sync leaves stale step content in some instances |
| tauri-plugin-sql constraint | Re-sync must use a single db handle; no nested getDb() calls |

---

### Option B: Keep Technique Steps Non-Materialised -- Resolve at Read Time via JOIN (PITFALLS.md + FEATURES.md recommendation)

**Mechanism:** Technique steps are NEVER copied into `recipe_steps`. They stay in `technique_steps` and are joined into a virtual step list at read time via recipe_technique_instances and a VIEW or CTE. The progress table gains a nullable `technique_step_id` column alongside `recipe_step_id`, with a CHECK constraint (exactly one must be non-NULL per row).

**Re-sync (on technique edit):** None. Structural changes propagate automatically via the JOIN.

**Schema additions under Option B:**
- ALTER TABLE unit_recipe_step_progress ADD COLUMN technique_step_id (requires full table rebuild -- CHECK constraint)
- NEW: techniques, technique_sections, technique_steps, technique_slots, recipe_technique_instances, recipe_slot_fills
- NO new columns on recipe_sections or recipe_steps

**Consumer-surface impact:** EVERY consumer of step progress must handle the dual-column key. Painting Mode, apply-to-units, syncPaintingPercentage, and session-logging step selectors all assume recipe_step_id is always set. This is a broader change to the query layer than Option A.

**Trade-offs:**

| Dimension | Assessment |
|-----------|-----------|
| Progress table change | HIGH -- table rebuild migration; every progress consumer updated |
| Query complexity | HIGH -- every step-list query must JOIN through recipe_technique_instances to technique_steps |
| Propagation complexity | None -- falls out naturally from the JOIN |
| Detach complexity | MEDIUM -- must INSERT new recipe_steps rows and remap progress rows from technique_step_id |
| Risk of re-sync bug | None -- no re-sync exists |
| tauri-plugin-sql constraint | Table-rebuild migration must use PRAGMA foreign_keys = OFF / CREATE-INSERT-DROP-RENAME |

---

### Decision Recommendation

**Recommendation: Option A** (materialised rows) is lower total implementation risk for this codebase because:
1. The progress table (unit_recipe_step_progress) has extensive downstream consumers; a dual-column key change touches more production code than a re-sync function.
2. saveRecipeGraph's five-phase diff is already battle-tested; resyncTechniqueInstance is structurally identical and has clear data-layer test coverage.
3. The "single db handle for resync" constraint is a documented Key Decision; it is implementable with discipline.
4. Option B's detach path (remap progress from technique_step_id to new recipe_step_ids) is the most complex operation in either option; Option A's detach (clear FK columns) is simpler.

**This recommendation is conditional.** If the re-sync explosion risk (a technique used by 30+ recipes) is unacceptable at scale, Option B's zero-propagation-cost approach is correct. The decision must be made in Phase 1 before any migration is committed.

---

## Key Findings

### Stack

Zero new runtime or dev dependencies. Every technical challenge in v0.7.0 maps to an existing, production-proven pattern:

| Capability needed | Pattern reused |
|-------------------|----------------|
| New SQLite tables with FK hierarchies | tauri-plugin-sql + $N positional syntax (same as all prior migrations) |
| Technique authoring form with DnD section/step reorder | Two-DndContext nested approach from RecipeFormSheet; manual array + useMemo (not useFieldArray) to avoid RHF #10607 |
| Colour slot definition and slot-fill dialog | react-hook-form + Zod form with controlled Select per slot; follows ApplyRecipeDialog |
| Five-phase non-destructive save | saveRecipeGraph (DI-04 from v0.2.13); saveTechniqueGraph is identical in structure |
| Read-time paint resolution | COALESCE/CTE pattern from points resolution; resolved_paint_id via LEFT JOIN through recipe_slot_fills |
| "From technique X" badge | shadcn/ui Badge (already used throughout); TechniqueInstanceBadge component |
| Flat inline SQL for multi-step operations | No nested BEGIN -- Key Decision; single db handle for resync loop |
| Data-layer tests | better-sqlite3 harness (Vitest import-stripping bug #7177 blocks node:sqlite) |

Critical version constraints (all current, no changes needed): tauri-plugin-sql 2.4.0, @dnd-kit/core 6.3.1, react-hook-form 7.74.0, zod 4.4.1, @tanstack/react-query 5.100.6, vitest 4.1.5.

### Features

**Must have (table stakes -- v0.7.0 launch):**
- Named technique with full section + step structure (name, description, painting_phase, tool, dilution, time, notes)
- Named colour slots with role hints (e.g. OSL: Glow Core / Glow Mid / Glow Edge / Surface Tint); steps reference slots, not fixed paints
- Per-recipe slot mapping: each recipe carries its own colours over one shared structure; multiple instances of the same technique in one recipe
- Technique library browse page: list, filter by effect, usage count badge, detail view
- Apply technique to recipe: picker dialog, slot-fill dialog, position selection
- "From technique X" badge visible on every technique-sourced section
- Live-link propagation: technique structure edits reach all recipe consumers
- Detach action: materialise and permanently unlink; recipe section becomes plain and editable
- effectivePaintId() / resolved_paint_id wired into ALL consumers: Painting Mode swatch, paint availability badge, apply-to-units step list, NextPaintingActionCard, wishlist bulk-add
- Painting Mode works for technique-sourced steps (correct progress marking; unfilled slot warning distinct from paintless-step)
- Paint availability calculation includes slot-resolved paints
- SectionedTimeline shows technique-sourced sections with badge
- Recipe duplication preserves live links (new instance + copied slot fills, not copied steps)
- "X recipes will be affected" warning before saving a structural technique change

**Should have (differentiators -- v0.7.0 if scope allows):**
- Slot fill suggests recently used paints for that slot across other instances
- Role hints shown in slot-fill dialog with existing paint swatch
- Technique name shown in Painting Mode section navigator
- "Missing slots" warning alongside owned/missing paint count

**Defer to post-v0.7.0:** Inline slot fill in Painting Mode; change summary on technique save; technique duplication; technique export/import; community/cloud library; version history; technique analytics.

**Anti-features (never do):**
- Snapshot mode (contradicts the live-link requirement)
- Per-step overrides within a live-linked section (creates confusing mixed-state)
- "Lock technique" to freeze propagation per-recipe
- New top-level sidebar nav entry for Techniques (Workshop sub-route only)
- Apply technique to all recipes at once (undefined slot colours, dangerous bulk op)
- Global "default colours" baked into the technique (breaks the per-recipe parameterisation promise)

**Concrete colour slot examples (real 40K techniques):**
- OSL: Glow Core / Glow Mid / Glow Edge / Surface Tint (4 slots, 4-step section)
- NMM Silver: Deep Shadow / Shadow / Midtone / Light / Highlight / Blackline (6 slots, 6-7 steps)
- NMM Gold: Deep Shadow / Shadow / Midtone / Bright Highlight / Specular (5 slots)
- Zenithal: Base Shadow / Mid Coat / Zenith Highlight (3 slots, 3-step primer section)
- Edge Highlight: Base Colour / First Edge / Sharp Edge (3 slots, 2-3 steps)

### Architecture

The technique library is a second-order extension of the recipe graph -- a canonical template layer above it. The four-layer stack (UI -> React Query -> query modules -> tauri-plugin-sql) is unchanged.

**New schema tables (migrations 051+):**
- `techniques` -- header (name, description, difficulty, style)
- `technique_sections` -- FK CASCADE to techniques; mirrors recipe_sections columns
- `technique_slots` -- named colour roles; FK CASCADE to techniques; declared BEFORE technique_steps (FK order matters)
- `technique_steps` -- FK CASCADE to technique_sections AND technique_id; nullable slot_id FK SET NULL; NO paint_id column
- `recipe_technique_instances` -- per-recipe-per-technique link; FK CASCADE to recipes, FK RESTRICT to techniques
- `recipe_slot_fills` -- per-instance slot->paint mapping; FK CASCADE to instances AND slots; FK SET NULL to paints; UNIQUE(instance_id, slot_id)

**The single resolution spine (effectivePaintId):**
Every consumer that needs a paint ID for a step MUST route through effectivePaintId() (pure function in src/lib/) or its SQL equivalent CTE:

  effectivePaintId(step) = resolved_paint_id (from recipe_slot_fills JOIN) ?? step.paint_id

Direct step.paint_id reads on technique-owned steps always return NULL and silently ignore slot-resolved paints. This is the most likely source of subtle integration bugs.

**New feature module:** src/features/techniques/ -- TechniqueLibraryPage, TechniqueSheet, TechniqueCard, TechniqueInstanceBadge, SlotFillDialog, SlotFillRow, applyTechniqueFilters, techniqueFilters

**New query module:** src/db/queries/techniques.ts -- getTechniques, getTechniqueGraph, saveTechniqueGraph, deleteTechnique (with RESTRICT guard), createRecipeTechniqueInstance, resyncAllInstancesForTechnique (Option A only), detachTechniqueInstance, upsertSlotFill

**New hook file:** src/hooks/useTechniques.ts -- TECHNIQUES_KEY, TECHNIQUE_KEY(id), TECHNIQUE_INSTANCES_KEY(recipeId); query + mutation hooks with correct invalidation symmetry

**Minimal modified files:**
- src/db/queries/recipes.ts -- saveRecipeGraph diff must exclude steps with technique_step_id IS NOT NULL
- src/db/queries/recipePaints.ts -- getStepsForRecipe enriched with LEFT JOINs producing resolved_paint_id, slot_name
- src/types/recipe.ts, recipeSection.ts, recipePaint.ts -- add technique_instance_id, technique_step_id, resolved_paint_id fields
- src/app/router.tsx -- add /techniques route
- src/components/common/AppSidebar.tsx -- Workshop group gains "Techniques" sub-nav entry (not top-level)
- src/features/recipes/recipeSection.ts -- makeDraftSection gains technique_instance_id: null

### Critical Pitfalls

1. **Step-identity / progress corruption (TOP RISK)** -- The live link adds/removes/reorders technique steps. If the progress key is not stable across those edits, users see completed steps un-check themselves (the v0.2.13 class of bug). Prevention: lock the materialisation strategy decision in the first migration. Under Option A, resyncTechniqueInstance must match rows via technique_step_id FK column (not order_index). Tests required: reorder technique steps -> assert progress unchanged; add step -> new uncompleted row; remove step -> progress row gone.

2. **The resolution spine must be universal** -- Paint availability, Painting Mode swatch, apply-to-units step list, NextPaintingActionCard, and wishlist bulk-add all currently read recipe_steps.paint_id directly. For technique-owned steps that column is always NULL. Any consumer that does not route through effectivePaintId() silently undercounts paints (availability shows "0 of 3 owned"), Painting Mode shows no swatch, and apply-to-units shows no steps. No crash -- just wrong numbers.

3. **tauri-plugin-sql cannot nest transactions -- propagation must be flat** -- resyncAllInstancesForTechnique (Option A) must use a SINGLE db handle obtained once at the top. Helper functions that call getDb() independently may receive different pool members. No nested BEGIN. Any helper that calls BEGIN inside a re-sync loop will crash at runtime with no compile-time warning.

4. **Unfilled slots after slot addition / orphaned fills after slot removal** -- recipe_slot_fills.technique_slot_id must carry ON DELETE CASCADE in the migration (not patched later). Gap-check LEFT JOIN surfaces unfilled slot warnings (not blockers -- follows PR-03 pattern). Paint availability must distinguish "unfilled slot" (paint unknown) from "paint missing" (paint identified but not owned).

5. **saveRecipeGraph must not touch live-linked steps** -- The five-phase diff must filter out steps with technique_step_id IS NOT NULL from its DELETE and UPDATE passes. Guard: `manualExistingSteps = existingSteps.filter(st => st.technique_step_id === null)`. The recipe editor must also render technique-linked sections as read-only.

6. **Migration integrity -- CASCADE hierarchy and rebuild pattern** -- technique_slots must be declared before technique_steps (FK order). Option B requires a full table rebuild for unit_recipe_step_progress using the migration 028 pattern: PRAGMA foreign_keys = OFF / CREATE new / INSERT SELECT / DROP / RENAME. Never edit an existing migration to fix a bug.

---

## Implications for Roadmap

Based on the dependency graph across all four research files, the following phase structure is recommended. The ordering is strict -- each phase has hard dependencies on the previous one.

### Phase 1: Schema Foundation + Design Decision Lock

**Rationale:** Nothing else can be built until the materialisation strategy is decided and encoded in migrations. The progress-key decision shapes every migration, every query, and every integration surface downstream.

**Delivers:**
- Written decision record (Option A vs B) committed to PROJECT.md Key Decisions
- Migrations 051+: techniques, technique_sections, technique_slots, technique_steps, recipe_technique_instances, recipe_slot_fills with correct FK CASCADE hierarchy (slots before steps)
- Option A: ALTER TABLE recipe_sections/recipe_steps additions; Option B: unit_recipe_step_progress rebuild migration
- Data-layer tests: migration parity, CASCADE correctness, FK enforcement (RESTRICT on technique delete), slot-fill UNIQUE constraint, PRAGMA foreign_key_check over all new tables

**Avoids:** Progress corruption, orphaned slot fills, nested-transaction crashes, migration editing

**Research flag:** No additional research needed -- schema is fully specified. The Option A vs B decision itself is the work.

---

### Phase 2: Technique Authoring (CRUD + Graph Save)

**Rationale:** The technique library is the canonical data source. It must exist and be correctly saved before any consumer can be built. saveTechniqueGraph is a direct reuse of saveRecipeGraph.

**Delivers:** getTechniques, getTechniqueGraph, saveTechniqueGraph, deleteTechnique (with instance count guard); useTechniques hooks; TechniqueLibraryPage, TechniqueSheet (metadata + sections + steps + slots with DnD reorder), TechniqueCard, techniqueFilters Zustand store, techniqueSchema.ts Zod validation.

**Avoids:** DELETE-all + re-INSERT destroying technique_step_id stability (five-phase diff prevents this)

**Research flag:** Standard pattern -- RecipeFormSheet and saveRecipeGraph are direct precedents. No research phase needed.

---

### Phase 3: Apply Flow + Slot-Fill System

**Rationale:** Bridges the library to recipes. Must build on stable technique CRUD from Phase 2. Establishes recipe_technique_instances rows and the resolved_paint_id read path that all integration surfaces depend on.

**Delivers:** createRecipeTechniqueInstance; upsertSlotFill mutation + hook; SlotFillDialog + SlotFillRow; technique picker dialog in RecipeFormSheet; enriched getStepsForRecipe query (resolved_paint_id, slot_name, technique_step_id); effectivePaintId() pure function in src/lib/effectivePaint.ts; TypeScript type updates; saveRecipeGraph guard; TechniqueInstanceBadge on recipe sections.

**Avoids:** Direct paint_id reads silently ignoring slot-resolved paints; recipe editor touching live-linked steps

**Research flag:** Standard pattern -- follows ApplyRecipeDialog and COALESCE resolution precedents. No research phase needed.

---

### Phase 4: Live-Link Re-Sync and Data-Layer Tests

**Rationale:** The highest-risk implementation work. Must be built on stable Phase 3 foundations, verified by data-layer tests before any UI integration.

**Delivers:** resyncTechniqueInstance + resyncAllInstancesForTechnique (Option A) OR virtual-step VIEW + gap-fill logic (Option B); useResyncTechniqueInstance hook; "X recipes will be affected" warning in TechniqueSheet save path; data-layer tests covering all edit cases (reorder, add, remove step; add, remove slot; delete with live instances).

**Avoids:** Single-db-handle violation for resync; keying resync identity to order_index instead of technique_step_id; nested transaction crash

**Research flag:** NEEDS EXTRA CARE during planning -- the re-sync is the most novel code in the milestone. Recommend stubbing test cases before implementing the loop.

---

### Phase 5: Integration Pass (Timeline / Painting Mode / Paint Availability / Apply-to-Units / Duplication)

**Rationale:** All existing surfaces need to understand technique-sourced steps. Each integration is independently testable once the resolution spine exists from Phase 3.

**Delivers:** SectionedTimeline technique badge + unfilled slot affordance; PaintingMode resolved_paint_id swatch + unfilled slot vs paintless-step distinction + technique name in navigator; paint availability CTE via effectivePaintId; apply-to-units technique step support; duplicateRecipe technique_instance_id detection + instance copy + slot-fill copy; NextPaintingActionCard technique step names.

**Avoids:** Paint availability undercounting; Painting Mode showing no swatch for technique steps; duplication silently copying steps instead of preserving live link

**Research flag:** No research phase needed -- all integrations follow documented existing patterns. Priority is test coverage for each surface.

---

### Phase 6: Detach + Safety Rails

**Rationale:** Detach is last because it requires the full live-link to be working and must understand the final progress key schema to do remapping correctly.

**Delivers:** detachTechniqueInstance (Option A: clear FK columns; Option B: INSERT new recipe_steps rows + remap progress); useDetachTechniqueInstance hook; confirm dialog on detach; "Detach" action on TechniqueInstanceBadge; deleteTechnique UI with "N recipes still using this technique" guard.

**Avoids:** Half-linked state; silent cascading deletes with progress loss; irreversible delete without user confirmation

**Research flag:** No research phase needed. Most complex edge case: Option B's progress remapping during detach -- test-first before implementing.

---

### Phase Ordering Rationale

- Schema must precede all phases -- it encodes the Option A vs B decision and every subsequent phase depends on it.
- Technique authoring must precede apply flow -- you cannot apply a technique that does not exist.
- Apply flow (Phase 3) must precede re-sync (Phase 4) -- re-sync operates on instances created in Phase 3.
- Re-sync must precede integration (Phase 5) -- integration consumers must see correct step data; verifying live-link correctness in data-layer tests before wiring UI surfaces reduces bug surface.
- Data-layer tests gate Phase 4 -- no Phase 5 work until re-sync invariants are verified in better-sqlite3 tests.
- Detach is last -- requires the full live-link to be correct and must understand the exact progress key schema in production.

### Research Flags

**Needs extra care during planning (test-first discipline, not additional research):**
- Phase 4 (Live-Link Re-Sync): stub test cases before writing implementation
- Phase 6 (Detach under Option B): progress row remapping from technique_step_id to new recipe_step_ids is the most complex operation in the milestone

**Standard patterns (no additional research needed):**
- Phase 1: schema migration authoring follows existing migration patterns exactly
- Phase 2: TechniqueSheet / saveTechniqueGraph directly mirrors RecipeFormSheet / saveRecipeGraph
- Phase 3: SlotFillDialog follows ApplyRecipeDialog; effectivePaintId() follows resolveUnitPoints() pattern
- Phase 5: each integration surface is a targeted update to an existing, well-understood consumer
- Phase 6: detach follows the pattern of similar destructive operations already in the codebase

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Zero new dependencies; every pattern maps to existing production code; all package versions confirmed from package.json |
| Features | HIGH | Grounded in existing codebase + real 40K technique examples; Figma component/override/detach model validates the UX approach |
| Architecture | HIGH | Direct source inspection of saveRecipeGraph, recipeDiff.ts, migration 028, all downstream consumers; both Option A and B are fully specified |
| Pitfalls | HIGH | Derived from actual prior bugs (v0.2.13 DI-01/DI-02), confirmed Key Decisions (no nested transactions, five-phase diff, flat inline SQL), and direct schema inspection |

**Overall confidence:** HIGH

### Gaps to Address

- **Option A vs B decision** -- not a research gap; a design decision the team must make in Phase 1. Both options are fully specified above. The recommendation is Option A, conditioned on the re-sync explosion risk being acceptable at personal-tool scale (10-30 techniques, fewer than 100 recipes).

- **saveRecipeGraph guard correctness** -- verify `existingSteps.filter(st => st.technique_step_id === null)` operates on the step list before the diff in the actual recipeDiff.ts. 5-minute code check.

- **duplicateRecipe sectionIdMap extension** -- the exact extension point to carry technique_instance_id through buildSectionIdMap needs a read of the current implementation before Phase 5 planning.

- **Unfilled slot vs paintless step UI treatment** -- specific Tailwind classes and component structure need to be confirmed against the current PaintingMode implementation during Phase 5 planning.

---

## Sources

### Primary (HIGH confidence)

- src/db/queries/recipes.ts + src/lib/recipeDiff.ts -- saveRecipeGraph, computeSectionDiff, computeStepDiff, buildSectionIdMap (direct inspection)
- src/db/queries/recipeAssignments.ts -- upsertStepProgress, completeStepWithSession, syncPaintingPercentage (direct inspection)
- src-tauri/migrations/028_step_progress_identity.sql -- prior art for progress-key migration with CTE backfill
- .planning/PROJECT.md -- v0.7.0 milestone spec, Key Decisions table (confirmed: no nested transactions, five-phase diff, recipe_step_id progress key, useFieldArray NOT used, flat inline SQL)
- CLAUDE.md + package.json -- confirmed stack, all installed dependency versions
- v0.2.13 requirements DI-01/DI-02 -- "completed step jumps" bug class; migration 028 fix pattern

### Secondary (MEDIUM confidence)

- OSL technique steps -- The Army Painter blog, Tangible Day, Creative Twilight (3-4 colour progression, step structure)
- NMM Silver/Gold -- Warhammer Guild, Goonhammer, The Army Painter (6-step silver, warm-tone gold palettes)
- Zenithal undercoat -- Army Painter, Tangible Day, Warhammer Guild (black/grey/white 3-spray, universally documented)
- Edge highlight -- universally documented in 40K community; base + 1-2 lighter passes
- Figma component/override/detach pattern -- Figma Help Center (UX analogy for live-link model; "detach is permanent" principle)

### Tertiary (LOW confidence)

- Paint Pad (paintpad.app) -- narrative-style only, no parameterisation; confirmed as non-competitor at this feature level

---

*Research completed: 2026-06-19*
*Ready for roadmap: yes -- pending Option A vs B decision in Phase 1*
