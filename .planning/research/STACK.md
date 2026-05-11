# Technology Stack

**Project:** HobbyForge v0.2.9 — Recipes 3.1 / Workflow Semantics & Integrations
**Researched:** 2026-05-11
**Confidence:** HIGH

## Verdict: No New Libraries Required

This milestone extends existing patterns with new metadata columns and UI wiring. Every capability needed is already in the stack. Adding libraries would increase bundle size and maintenance burden for zero benefit.

---

## Existing Stack (Confirmed Sufficient)

### Schema Extension — SQLite Migration

| Technology | Current | Purpose | Why Sufficient |
|------------|---------|---------|----------------|
| tauri-plugin-sql | Already in stack | 4 new nullable TEXT columns on `recipe_sections` | Standard `ALTER TABLE ADD COLUMN` migration. Same pattern used 19 times already. |

**New columns on `recipe_sections`:**

```sql
ALTER TABLE recipe_sections ADD COLUMN section_type TEXT;
ALTER TABLE recipe_sections ADD COLUMN technique TEXT;
ALTER TABLE recipe_sections ADD COLUMN execution_mode TEXT;
ALTER TABLE recipe_sections ADD COLUMN applies_to TEXT;
```

All nullable TEXT — consistent with every other optional metadata column in the app (surface, notes on sections; technique, tool, dilution on steps). No new column types or constraints needed.

### Type Layer — TypeScript Const Arrays + Interface Extension

| Technology | Current | Purpose | Why Sufficient |
|------------|---------|---------|----------------|
| TypeScript 5 | Already in stack | Const arrays for new enum-like fields | Same pattern as `PAINTING_PHASES`, `RECIPE_SURFACES`, `RECIPE_EFFECTS` |

**New const arrays to define:**

```typescript
export const SECTION_TYPES = [
  "prep", "basecoat", "shade", "layer", "detail", "highlight",
  "weathering", "basing", "varnish", "finishing", "other",
] as const;
export type SectionType = typeof SECTION_TYPES[number];

export const SECTION_TECHNIQUES = [
  "brush", "airbrush", "drybrush", "wash", "contrast", "wet blend",
  "stipple", "sponge", "oil wash", "enamel wash", "pigment", "decal", "other",
] as const;
export type SectionTechnique = typeof SECTION_TECHNIQUES[number];

export const EXECUTION_MODES = [
  "sequential", "parallel", "any_order",
] as const;
export type ExecutionMode = typeof EXECUTION_MODES[number];
```

`applies_to` is free-text (too domain-specific: "all models", "sergeant only", "weapons", "cloaks") — no const array, just a text Input with max length.

**Integration points:**
- Extend `RecipeSection` interface in `src/types/recipeSection.ts` with 4 new nullable fields
- `CreateRecipeSectionInput` / `UpdateRecipeSectionInput` auto-derive via existing `Omit`/`Partial` pattern
- Extend `DraftSection` in `src/features/recipes/recipeSection.ts` with the 4 fields
- Update `buildDraftSections()` to map new fields from DB rows
- Update `makeDraftSection()` factory with null defaults

### Form UI — shadcn/ui Select + Collapsible (Progressive Disclosure)

| Technology | Current | Purpose | Why Sufficient |
|------------|---------|---------|----------------|
| shadcn/ui Select | Already in stack | Dropdowns for section_type, technique, execution_mode | `RecipeSectionCard` already renders Surface `<Select>` and Optional checkbox. Add 3 more `<Select>` using identical pattern. |
| Collapsible (shadcn/ui) | Already in stack | Progressive disclosure for workflow metadata | `RecipeSectionCard` already uses `<Collapsible>`. Workflow fields go in `CollapsibleContent` above step list, auto-shown when any field is set or user clicks a toggle. |

**Progressive disclosure design:** The `RecipeSectionCard` header has name + surface + optional. Workflow metadata (section_type, technique, execution_mode, applies_to) renders in the `CollapsibleContent` area above the step list, in a compact row. Zero new components needed — just layout within existing card structure.

### Cascading Selectors — React Hook Form `watch()` + Conditional Rendering

| Technology | Current | Purpose | Why Sufficient |
|------------|---------|---------|----------------|
| React Hook Form `watch()` | Already in stack | Recipe -> Section -> Step cascading in LogSessionSheet | LogSessionSheet already implements recipe -> step cascading via `form.watch("recipe_id")` + `useRecipePaints()`. Adding section as an intermediate selector follows identical pattern. |
| React Query hooks | Already in stack | `useRecipeSections(recipeId)` for section data | Query function exists at `getRecipeSections()` in `src/db/queries/recipeSections.ts`. Need a React Query wrapper hook. |

**LogSessionSheet changes (no new deps):**
1. Add `recipe_section_id: z.number().int().positive().nullable().optional()` to `logSessionSchema`
2. Watch `recipe_id` -> render section selector (fetch via `useRecipeSections`)
3. Watch `recipe_section_id` -> filter step list to only steps matching selected section
4. Clear section when recipe changes; clear step when section changes (existing cascade pattern)
5. Section selector shows section name + section_type badge for context
6. When recipe has zero or one section, auto-select and skip the section selector (progressive disclosure threshold already established at sections.length <= 1)

### Compact Metadata Display — Existing Badge Component

| Technology | Current | Purpose | Why Sufficient |
|------------|---------|---------|----------------|
| shadcn/ui Badge | Already in stack | Display section_type, technique, execution_mode as compact badges | `SectionedTimeline` already renders `surface` and `optional` as `<Badge variant="outline">`. Add badges for new fields in same header row. |

### Kanban/CurrentFocus Integration — Extended Enrichment Queries

| Technology | Current | Purpose | Why Sufficient |
|------------|---------|---------|----------------|
| React Query | Already in stack | Extend `useKanbanEnrichment` with section workflow data | Hook already fetches recipe names + photo counts via `Promise.all`. Add a third query for current section context. |

**Kanban card enhancement:**
- `getNextActionHint()` currently returns generic status-based hints ("Apply primer", "Apply shade")
- When a recipe with sections is linked, derive section-aware hints: "Armour: drybrush highlight" instead of generic "Apply layer highlights"
- New query function: `getWorkflowContextByUnitIds(unitIds)` joins unit -> recipe -> first section for workflow metadata
- "Current section" heuristic for v0.2.9: use the first section by `order_index`. Section-level completion tracking is a future milestone concern.

**CurrentFocusCard enhancement:**
- Add a workflow line below existing recipe name: e.g., "Next: Armour -- basecoat (sequential)"
- Data from same enrichment query as Kanban
- No new component — additional text rendering in existing card

---

## Database Query Additions

| Query | Status | Pattern |
|-------|--------|---------|
| `getRecipeSections(recipeId)` | EXISTS | Used for LogSessionSheet section selector |
| `getWorkflowContextByUnitIds(unitIds)` | NEW | Same batch pattern as `getRecipeNamesByUnitIds`. Returns `Map<unitId, SectionWorkflowContext>` |
| `updateRecipeSection(input)` | EXISTS — needs 4 new columns in SET clause | Direct assignment (not COALESCE) for all 4 fields since null is a valid "clear" value |
| `createRecipeSection(input)` | EXISTS — needs 4 new columns in INSERT | Nullable, default null |

---

## Hook Inventory

| Hook | Status | Notes |
|------|--------|-------|
| `useRecipeSections(recipeId)` | NEEDS CREATION | Query function exists in `recipeSections.ts` but no React Query wrapper hook found in `src/hooks/`. Trivial to create following `useRecipePaints` pattern. |
| `useKanbanEnrichment(unitIds)` | EXISTS — needs extension | Add `workflowContexts: Map<number, SectionWorkflowContext>` to return shape |
| `useRecipePaints(recipeId)` | EXISTS | Already used in LogSessionSheet for step selector |

---

## Migration File

One new migration: `019_section_workflow_metadata.sql`

```sql
ALTER TABLE recipe_sections ADD COLUMN section_type TEXT;
ALTER TABLE recipe_sections ADD COLUMN technique TEXT;
ALTER TABLE recipe_sections ADD COLUMN execution_mode TEXT;
ALTER TABLE recipe_sections ADD COLUMN applies_to TEXT;
```

SQLite `ALTER TABLE ADD COLUMN` requires one column per statement. Same pattern as migration 004 (8 columns added to units) and migration 012 (6 columns added to recipes).

---

## What NOT to Add

| Temptation | Why Not | Use Instead |
|------------|---------|-------------|
| Combobox/autocomplete library | `applies_to` is simple free-text. Enum fields use shadcn Select. App already has `PaintCombobox` for complex search. | shadcn/ui Select + Input |
| XState / state machine library | `execution_mode` is display metadata, not runtime state transitions. A string field + visual badges is sufficient. | Const array + Badge display |
| react-select / downshift | React Hook Form + shadcn Select handle every selector pattern. Adding another creates inconsistency. | Existing Select components |
| Animation library | Workflow display is badges and text, not animated diagrams. Tailwind transitions suffice. | Tailwind CSS transitions |
| Progress tracking library | Per-section completion tracking is not in v0.2.9 scope. This milestone adds metadata and surfaces it. | Deferred to future milestone |
| New Zustand stores | No new filter state needed. Workflow metadata is server state (React Query) and form state (RHF `watch()`). | Existing React Query + RHF patterns |
| Drizzle ORM | Confirmed dead-end per PROJECT.md. Raw parameterized queries continue. | tauri-plugin-sql direct queries |

---

## Key Design Decision: "Current Section" Heuristic

The Kanban and CurrentFocus integrations need to answer "what section should this unit work on next?" without per-section completion tracking (out of scope for v0.2.9).

**Recommended heuristic:** First section by `order_index` that has `optional = 0`. This is simple, deterministic, and matches the workflow ordering the user defined. When section-level progress tracking arrives in a future milestone, the heuristic upgrades to "first incomplete non-optional section."

**Alternative rejected:** Using the painting_sessions table to infer which section was last worked on. This requires session-to-section FK (exists as `recipe_step_id` -> step -> section_id, but joining is fragile and assumes sessions are logged per-step). Too complex for v0.2.9.

---

## Sources

- Codebase analysis: all findings from direct inspection of existing files
- `src/types/recipeSection.ts` — current RecipeSection interface (9 columns)
- `src/features/recipes/recipeSection.ts` — DraftSection type and buildDraftSections()
- `src/features/recipes/RecipeSectionCard.tsx` — existing section form UI with Select + Collapsible
- `src/features/dashboard/LogSessionSheet.tsx` — existing recipe->step cascade pattern
- `src/features/dashboard/CurrentFocusCard.tsx` — current card layout
- `src/features/painting-projects/KanbanCard.tsx` — current card with getNextActionHint()
- `src/hooks/useKanbanEnrichment.ts` — existing batch enrichment pattern
- `src/features/recipes/recipeSchema.ts` — existing const arrays for enum-like fields
- `src/db/queries/recipeSections.ts` — existing CRUD functions
- Confidence: HIGH — every pattern referenced already works in the shipped codebase
