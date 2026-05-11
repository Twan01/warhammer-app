# Architecture Patterns

**Domain:** Recipe workflow semantics and section-aware integrations (v0.2.9)
**Researched:** 2026-05-11
**Confidence:** HIGH (all findings derived from codebase analysis -- no external dependencies)

## Current State Summary

The existing architecture has three relevant subsystems:

1. **Recipe Sections** (`recipe_sections` table, 9 columns: id, recipe_id, name, surface, optional, order_index, notes, created_at, updated_at). Steps FK to sections via `section_id`. Sections are saved with DELETE-all + re-INSERT pattern. Progressive disclosure hides section UI when `sections.length <= 1`.

2. **Log Session** (`LogSessionSheet`) has recipe_id and recipe_step_id FKs on painting_sessions. Step selector is a flat list sorted by order_index -- no section awareness.

3. **Kanban/CurrentFocus** display recipe name only. KanbanCard gets recipe names via `useKanbanEnrichment` (batch query by unit_id). CurrentFocusCard gets recipe name via `getRecipeNamesByUnitIds`. Next-action hint is a static PaintingStatus-to-string map (`getNextActionHint`).

---

## New Architecture: Integration Map

### Feature 1: Section-Level Workflow Metadata

**Schema change:** 4 new columns on `recipe_sections`:

| Column | Type | Nullable | Purpose |
|--------|------|----------|---------|
| `section_type` | TEXT | YES | Workflow category: "prep", "basecoat", "shade", "layer", "highlight", "detail", "basing", "finishing", "custom" |
| `technique` | TEXT | YES | Painting technique: "drybrush", "wetblend", "stipple", "glaze", "wash", "edge", "freehand", etc. |
| `execution_mode` | TEXT | YES | "sequential" (default null = sequential) or "parallel" (can be done in any order relative to siblings) |
| `applies_to` | TEXT | YES | Free-text target surface: "armour panels", "cloth", "skin", "weapon blade" |

**Migration file:** `020_section_workflow_metadata.sql` -- 4 ALTER TABLE ADD COLUMN statements. All nullable, no backfill needed (existing sections get NULL = no metadata, which is correct).

**Files modified:**

| File | Change |
|------|--------|
| `src/types/recipeSection.ts` | Add 4 fields to `RecipeSection` interface |
| `src/features/recipes/recipeSection.ts` | Add 4 fields to `DraftSection`, update `makeDraftSection` and `buildDraftSections` |
| `src/db/queries/recipeSections.ts` | Add 4 params to `createRecipeSection` INSERT and `updateRecipeSection` UPDATE |

**No new files.** The workflow metadata fields are additive to existing types and queries.

**Key decision:** Use direct assignment (not COALESCE) for all 4 new columns in UPDATE, consistent with the existing `surface` and `notes` pattern. Users must be able to clear fields to NULL.

### Feature 2: Workflow Metadata Editing UI

**Files modified:**

| File | Change |
|------|--------|
| `src/features/recipes/RecipeSectionCard.tsx` | Add collapsible "Workflow" section below existing name/surface/optional fields. Show under progressive disclosure (collapsed by default). Contains 4 fields: section_type (Select), technique (Select), execution_mode (Select), applies_to (Input). |

**No new files.** The metadata editing lives inside the existing section card form. Progressive disclosure pattern (Chevron toggle) already exists in RecipeSectionCard for notes.

**Key decision:** Use const arrays in `src/types/recipeSection.ts` for section_type and technique values (same pattern as `PAINTING_STATUS_ORDER` for union types). execution_mode has only 2 values so a simple Select is sufficient.

### Feature 3: Compact Metadata Display in SectionedTimeline

**Files modified:**

| File | Change |
|------|--------|
| `src/features/recipes/SectionedTimeline.tsx` | Add compact metadata badges after existing surface/optional badges in section header row. Show section_type as a colored badge, technique as text badge, execution_mode "parallel" as a distinct icon/badge (Shuffle icon from Lucide). applies_to as italic text. |

**No new files.** Pure display change in existing component.

**Data flow:** SectionedTimeline already receives `sections: RecipeSection[]` -- the 4 new fields flow through automatically once the type is extended. Zero prop changes needed.

### Feature 4: Log Session Section-Aware Cascading Selectors

**Schema change:** 1 new column on `painting_sessions`:

| Column | Type | Nullable | Purpose |
|--------|------|----------|---------|
| `section_id` | INTEGER | YES | FK to recipe_sections(id) ON DELETE SET NULL |

**Migration:** `020_section_workflow_metadata.sql` (same migration file) -- `ALTER TABLE painting_sessions ADD COLUMN section_id INTEGER REFERENCES recipe_sections(id) ON DELETE SET NULL`.

**Files modified:**

| File | Change |
|------|--------|
| `src/types/paintingSession.ts` | Add `section_id: number \| null` to `PaintingSession` and `CreateSessionInput` |
| `src/db/queries/paintingSessions.ts` | Add `$7` param for section_id in `createSession` INSERT |
| `src/features/dashboard/logSessionSchema.ts` | Add `section_id: z.number().int().positive().nullable().optional()` |
| `src/features/dashboard/LogSessionSheet.tsx` | Add section selector between recipe and step selectors (cascading: recipe -> section -> step) |
| `src/hooks/useJournalSessions.ts` | No change -- createSession already passes all CreateSessionInput fields |

**Cascading selector logic in LogSessionSheet:**

```
Recipe selector (existing)
  |-- when recipe selected, fetch sections via useRecipeSections(watchedRecipeId)
       |-- Section selector (NEW -- only shown when recipe has 2+ sections)
            |-- when section selected, filter steps to that section
                 |-- Step selector (existing, now filtered by section_id)
```

**Key decisions:**
- Section selector only appears when recipe has 2+ sections (progressive disclosure threshold, consistent with form UI).
- Changing recipe resets both section_id and recipe_step_id (existing pattern already resets recipe_step_id).
- Changing section resets recipe_step_id only.
- Steps in the step selector are filtered by `section_id` when a section is selected, otherwise show all steps (backward compat for single-section recipes).

**Cache invalidation:** No new invalidation keys needed. `useCreatePaintingSession` already invalidates `PAINTING_SESSIONS_KEY(unit_id)`, `hobby-analytics`, `recent-activity`, `goal-progress`, and conditionally `RECIPE_SESSIONS_KEY`.

### Feature 5: Kanban Card Workflow Display

**New query function** in `src/db/queries/recipes.ts`:

```typescript
export async function getSectionSummaryByUnitIds(
  unitIds: number[]
): Promise<{ unit_id: number; section_name: string; section_type: string | null }[]>
```

This returns the first section (by order_index) for each unit's recipe. The Kanban card shows workflow context ("Basecoat -- Armour Panels"), not completion status.

**Files modified:**

| File | Change |
|------|--------|
| `src/db/queries/recipes.ts` | Add `getSectionSummaryByUnitIds()` -- returns first section name + type per unit's recipe |
| `src/hooks/useKanbanEnrichment.ts` | Add third parallel fetch for section summaries; extend `KanbanEnrichment` type |
| `src/features/painting-projects/KanbanCard.tsx` | Show workflow metadata below recipe name (e.g., "Basecoat -- Armour Panels") |
| `src/features/painting-projects/KanbanColumn.tsx` | Pass new enrichment data through |

**Key decision:** Do NOT add session-based progress tracking to Kanban cards. The Kanban board is a drag-and-drop view; adding per-step progress would require N+1 session queries per card. Instead, show static workflow context from the recipe's sections. Progress tracking is a future milestone concern.

### Feature 6: CurrentFocus Section-Aware Next Action

**Files modified:**

| File | Change |
|------|--------|
| `src/features/dashboard/DashboardPage.tsx` | Fetch sections for focus unit's recipe; compute section-aware hint |
| `src/features/dashboard/CurrentFocusCard.tsx` | Add optional `workflowHint` prop for section-level guidance |
| `src/features/dashboard/getNextActionHint.ts` | Add `getSectionAwareHint()` that combines PaintingStatus hint with section context |

**Data flow for CurrentFocusCard workflow hint:**

```
DashboardPage mounts
  |-- focusUnitId (from stats.activeProjects[0])
  |-- focusRecipes (existing query by unit_id)
  |-- NEW: focusSections = useRecipeSections(focusRecipes?.[0]?.id)
  |-- Compute: first non-optional section name + type -> workflowHint string
  |-- Pass workflowHint to CurrentFocusCard
```

**Key decision:** The hint is informational only (e.g., "Next: Basecoat -- armour panels"). It does NOT track which steps are complete. Step-level progress tracking across sessions is a separate feature requiring a `completed_at` column on recipe_steps and is explicitly out of scope for v0.2.9.

---

## Component Boundaries

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| `recipe_sections` (DB) | Stores section workflow metadata | Query modules |
| `painting_sessions` (DB) | Stores section_id FK for session-section linking | Query modules |
| `recipeSections.ts` (queries) | CRUD with 4 new workflow fields | useRecipeSections hook |
| `paintingSessions.ts` (queries) | INSERT with section_id | useJournalSessions hook |
| `RecipeSectionCard` (UI) | Workflow metadata editing form | DraftSection state |
| `SectionedTimeline` (UI) | Compact metadata badge display | RecipeSection type |
| `LogSessionSheet` (UI) | 3-level cascading selector | useRecipeSections, useRecipePaints |
| `KanbanCard` (UI) | Workflow context display | useKanbanEnrichment |
| `CurrentFocusCard` (UI) | Section-aware next action hint | DashboardPage prop drilling |

---

## Data Flow

### Write Path (Section Metadata)

```
RecipeSectionCard (form fields)
  -> DraftSection state (useState in RecipeFormSheet)
  -> onSubmit: DELETE-all + re-INSERT sections (existing pattern)
  -> createRecipeSection() now includes 4 new params
  -> SQLite recipe_sections table
  -> Invalidate RECIPE_SECTIONS_KEY(recipeId)
```

### Write Path (Session with Section)

```
LogSessionSheet (cascading selectors)
  -> logSessionSchema validation (includes section_id)
  -> createSession() with section_id param
  -> SQLite painting_sessions table
  -> Invalidate PAINTING_SESSIONS_KEY(unit_id) + related keys
```

### Read Path (Kanban Enrichment)

```
KanbanBoard mounts
  -> useKanbanEnrichment(unitIds)
  -> Promise.all([getRecipeNamesByUnitIds, getPhotoCountsByUnitIds, getSectionSummaryByUnitIds])
  -> Map<unitId, { recipeName, photoCount, sectionSummary }>
  -> KanbanCard renders workflow context
```

### Read Path (CurrentFocus Hint)

```
DashboardPage mounts
  -> focusRecipes query (existing)
  -> useRecipeSections(focusRecipes[0].id) (NEW)
  -> getSectionAwareHint(status, sections) (NEW pure function)
  -> CurrentFocusCard.workflowHint prop
```

---

## Patterns to Follow

### Pattern 1: Const Array Union Types for Workflow Enums

**What:** Define section_type and technique values as const arrays, derive TypeScript types.
**When:** Any new TEXT column with a fixed set of valid values.
**Example:**

```typescript
// src/types/recipeSection.ts
export const SECTION_TYPES = [
  "prep", "basecoat", "shade", "layer", "highlight",
  "detail", "basing", "finishing", "custom"
] as const;
export type SectionType = typeof SECTION_TYPES[number];

export const SECTION_TECHNIQUES = [
  "drybrush", "wetblend", "stipple", "glaze", "wash",
  "edge", "layering", "feathering", "sponge", "airbrush",
  "contrast", "freehand"
] as const;
export type SectionTechnique = typeof SECTION_TECHNIQUES[number];
```

**Why:** Consistent with `PAINTING_STATUS_ORDER` pattern. Enables Select options and type safety without a separate enum.

### Pattern 2: Progressive Disclosure for Cascading Selectors

**What:** Show the section selector only when the selected recipe has 2+ sections.
**When:** LogSessionSheet, anywhere a recipe-section-step cascade appears.
**Why:** Single-section recipes should not show a redundant "Steps" selector. Consistent with the existing threshold (`sections.length <= 1` hides section UI in RecipeFormSheet and RecipeDetailSheet).

### Pattern 3: Batch Enrichment Extension (Not N+1)

**What:** Add the new section summary fetch to the existing `useKanbanEnrichment` Promise.all.
**When:** Adding new per-card data to Kanban.
**Why:** The existing pattern already batches recipe names and photo counts in one hook. Adding a third parallel query maintains O(1) queries regardless of card count.

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Session-Based Step Progress Tracking

**What:** Querying painting_sessions to determine which recipe steps are "complete" and computing progress percentages per section.
**Why bad:** Requires N+1 session queries per recipe/section, complex aggregation logic, and a concept of "step completion" that does not exist in the schema (a step can be logged multiple times, there is no `completed_at` flag).
**Instead:** Show static workflow context (section type, technique, applies_to). Progress tracking is a future milestone that requires schema additions (`completed_at` on recipe_steps or a separate step_completions table).

### Anti-Pattern 2: Adding section_id to LogSessionSheet Without Cascade Reset

**What:** Adding the section selector but not resetting dependent fields when the parent changes.
**Why bad:** Stale FK references -- user selects Section A, picks a step from Section A, then changes to Section B. The step still points to a Section A step.
**Instead:** Always reset `recipe_step_id` to null when `section_id` changes. Always reset both `section_id` and `recipe_step_id` when `recipe_id` changes. Use `useEffect` with watched field values (existing pattern for recipe_id -> step clearing).

### Anti-Pattern 3: Separate Enrichment Hooks per Kanban Card

**What:** Calling `useRecipeSections` inside each KanbanCard component.
**Why bad:** N+1 queries. With 20 cards on the board, that is 20 section queries.
**Instead:** Batch query in `useKanbanEnrichment` at the board level, pass data down via props.

---

## Recommended Build Order

The build order follows dependency chains. Each phase builds on the previous.

### Phase 1: Schema + Data Layer (foundation -- everything depends on this)

1. Migration `020_section_workflow_metadata.sql`:
   - 4 ALTER TABLE ADD COLUMN on recipe_sections (section_type, technique, execution_mode, applies_to)
   - 1 ALTER TABLE ADD COLUMN on painting_sessions (section_id FK)
2. Update `src/types/recipeSection.ts` -- add 4 fields + const arrays
3. Update `src/types/paintingSession.ts` -- add section_id
4. Update `src/db/queries/recipeSections.ts` -- extend CREATE/UPDATE with 4 new params
5. Update `src/db/queries/paintingSessions.ts` -- add section_id to INSERT
6. Update `src/features/recipes/recipeSection.ts` -- extend DraftSection + builders

### Phase 2: Form UI + Timeline Display (recipe editing -- no cross-feature deps)

1. Update `src/features/recipes/RecipeSectionCard.tsx` -- workflow metadata form fields
2. Update `src/features/recipes/SectionedTimeline.tsx` -- compact metadata badges

### Phase 3: Log Session Section-Aware Flow (depends on Phase 1 schema)

1. Update `src/features/dashboard/logSessionSchema.ts` -- add section_id field
2. Update `src/features/dashboard/LogSessionSheet.tsx` -- add cascading section selector

### Phase 4: Kanban + CurrentFocus Integration (depends on Phase 1 schema)

1. Add `getSectionSummaryByUnitIds()` to `src/db/queries/recipes.ts`
2. Update `src/hooks/useKanbanEnrichment.ts` -- add section summary to enrichment
3. Update `src/features/painting-projects/KanbanCard.tsx` -- display workflow context
4. Update `src/features/dashboard/getNextActionHint.ts` -- add section-aware hint
5. Update `src/features/dashboard/CurrentFocusCard.tsx` -- add workflowHint prop
6. Update `src/features/dashboard/DashboardPage.tsx` -- fetch sections, compute hint

### Phase ordering rationale:

- **Phase 1 first:** All other phases depend on the schema and type changes. The migration must exist before any UI can reference the new fields.
- **Phase 2 before 3/4:** The workflow metadata must be editable before it can be displayed elsewhere. Users need to populate section_type/technique before Kanban or CurrentFocus can show meaningful workflow context.
- **Phase 3 and 4 are independent:** Log Session and Kanban/CurrentFocus do not depend on each other. They could be built in parallel or in either order. Phase 3 is listed first because it is smaller (2 files modified vs 6).

---

## Files Inventory: New vs Modified

### New Files

| File | Purpose |
|------|---------|
| `src-tauri/migrations/020_section_workflow_metadata.sql` | Schema migration |

### Modified Files (15 total)

| File | Nature of Change |
|------|-----------------|
| `src/types/recipeSection.ts` | Add 4 fields + 2 const arrays |
| `src/types/paintingSession.ts` | Add section_id field |
| `src/db/queries/recipeSections.ts` | Extend INSERT/UPDATE params |
| `src/db/queries/paintingSessions.ts` | Add $7 to INSERT |
| `src/db/queries/recipes.ts` | Add getSectionSummaryByUnitIds() |
| `src/features/recipes/recipeSection.ts` | Extend DraftSection type + builders |
| `src/features/recipes/RecipeSectionCard.tsx` | Workflow metadata form fields |
| `src/features/recipes/SectionedTimeline.tsx` | Compact metadata badges |
| `src/features/dashboard/logSessionSchema.ts` | Add section_id to schema |
| `src/features/dashboard/LogSessionSheet.tsx` | Cascading section selector |
| `src/features/dashboard/getNextActionHint.ts` | Section-aware hint function |
| `src/features/dashboard/CurrentFocusCard.tsx` | workflowHint prop |
| `src/features/dashboard/DashboardPage.tsx` | Fetch sections, compute hint |
| `src/hooks/useKanbanEnrichment.ts` | Add section summary to enrichment |
| `src/features/painting-projects/KanbanCard.tsx` | Display workflow context |

---

## Cache Invalidation Contract

No new cache keys are needed. Existing invalidation contracts cover all changes:

| Mutation | Keys Invalidated | Notes |
|----------|-----------------|-------|
| Section save (DELETE+re-INSERT) | RECIPE_SECTIONS_KEY, RECIPE_PAINTS_KEY, STEP_COUNTS_KEY, RECIPE_AVAILABILITY_KEY, RECIPE_SWATCH_KEY | Existing contract unchanged |
| Session create with section_id | PAINTING_SESSIONS_KEY, hobby-analytics, recent-activity, goal-progress, conditionally RECIPE_SESSIONS_KEY | Existing contract unchanged -- section_id is just another column |
| Kanban enrichment | KANBAN_ENRICHMENT_KEY | Existing key with sorted IDs; new section data included in same fetch |

---

## Sources

- All findings derived from direct codebase analysis (HIGH confidence)
- Migration files: `src-tauri/migrations/005_hobby_journal.sql`, `014_session_recipe_link.sql`, `018_recipe_sections.sql`
- Type definitions: `src/types/recipeSection.ts`, `src/types/paintingSession.ts`
- Query modules: `src/db/queries/recipeSections.ts`, `src/db/queries/paintingSessions.ts`, `src/db/queries/recipes.ts`
- UI components: `LogSessionSheet.tsx`, `CurrentFocusCard.tsx`, `KanbanCard.tsx`, `SectionedTimeline.tsx`, `RecipeSectionCard.tsx`
- Hooks: `useRecipeSections.ts`, `useJournalSessions.ts`, `useKanbanEnrichment.ts`
