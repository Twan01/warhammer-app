# Phase 50: Section Form UI - Context

**Gathered:** 2026-05-08
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can create and edit recipes with collapsible section cards containing step lists, with drag-and-drop reorder at both section and step levels, and progressive disclosure so single-section recipes stay as simple as they were before. Read-only section timeline (Phase 49) and recipe duplication (Phase 51) are out of scope.

</domain>

<decisions>
## Implementation Decisions

### Section card interactions
- Each section renders as a collapsible card using the existing radix Collapsible component (already used in LoadoutSection, PlaybookTab, BattleLogRow)
- All sections independently collapsible — NOT accordion-style XOR behavior
- Section card header shows: section name (inline editable), step count, surface badge (if set), drag handle (GripVertical icon), collapse chevron, and delete button (Trash2 icon)
- Section delete: immediate for empty sections, confirmation dialog for non-empty sections (cascade deletes all contained steps)
- "Add Section" button placed below the last section card, consistent with "Add step" button placement

### Progressive disclosure
- Single-section recipes hide all section scaffolding — steps render directly like the current flat form (FORM-05: "keeping the experience as simple as before sections existed")
- "Add Section" button visible even in single-section mode — adding a second section reveals all section headers and makes them editable
- When transitioning from 1 to 2+ sections, the default "Steps" section header becomes visible and editable
- Removing sections back to one auto-hides section scaffolding again

### Section inline editing
- Section name: inline text input in the header — click to edit, blur to save (no modal)
- Section surface: inline Select dropdown in the header row, reuses RECIPE_SURFACES from recipeSchema.ts
- Section optional flag: checkbox in the header row (0|1 integer SQLite boolean)
- Section notes: not exposed in section header — accessible via expand or deferred to future polish

### Drag-and-drop architecture
- Two-DndContext approach (locked in research SUMMARY.md):
  - Outer DndContext in RecipeSectionList for section reorder (items = section localIds)
  - Inner DndContext per section card in RecipeStepList for step reorder (items = step localIds)
- Both levels use crypto.randomUUID() localIds — never integer DB IDs (prevents namespace collision)
- Drag handle and collapse trigger are separate interaction zones on the section header
- Cross-section step drag is explicitly out of scope (FLOW-01 deferred to future)

### Draft state management
- DraftSection interface mirrors DraftStep pattern: localId (UUID), name, surface, optional, notes, plus nested DraftStep[] array
- buildDraftSections(sections, steps) — pure function grouping steps into sections by section_id, tested independently
- Single useEffect guarded on both existingSections.length AND existingSteps.length resolving — never two separate effects
- New recipe initialization: one DraftSection with name "Steps", empty DraftStep[] array

### Save/submit flow
- Delete-all-and-recreate for both sections and steps (extends existing pattern in RecipeFormSheet)
- Save order: (1) create/update recipe, (2) delete all existing sections (CASCADE handles step cleanup), (3) create sections in order, (4) build Map<localId, newDbId> during section creation, (5) create steps with mapped section_id
- section_id passed to addRecipePaint using the localId-to-dbId map built during section save
- Cache invalidation on save: invalidate RECIPE_SECTIONS_KEY, RECIPE_PAINTS_KEY, STEP_COUNTS_KEY, RECIPE_AVAILABILITY_KEY, RECIPE_SWATCH_KEY, and recipe-step-counts

### Claude's Discretion
- Exact section card styling (border, background, spacing within the sheet)
- Whether section header uses a compact single-row or a two-row layout
- Animation for collapse/expand transitions
- Whether "Add Section" uses a full-width button or a smaller text-link style
- Exact confirmation dialog wording for non-empty section delete
- Whether to show a visual indicator (badge/count) on collapsed section cards

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` — FORM-01 through FORM-06 acceptance criteria

### Prior phase context
- `.planning/phases/48-section-data-layer/48-CONTEXT.md` — Section data layer decisions, cascade contract, cache invalidation contract, default naming
- `.planning/phases/49-section-read-ui/49-CONTEXT.md` — Section read UI decisions, section header layout, visual grouping

### Architecture decisions
- `.planning/research/SUMMARY.md` — v0.2.7 research: DndContext resolution (two-context approach), buildDraftSections pattern, critical pitfalls

### Existing recipe form code
- `src/features/recipes/RecipeFormSheet.tsx` — Current recipe form (will be rewritten to support sections)
- `src/features/recipes/RecipeStepList.tsx` — Current step DnD list (inner DndContext — reusable within section cards)
- `src/features/recipes/RecipeStepRow.tsx` — Current step row with useSortable (unchanged)
- `src/features/recipes/recipeSteps.ts` — DraftStep interface, makeDraftStep(), computeOrderIndex()

### Data layer (Phase 48 output)
- `src/hooks/useRecipeSections.ts` — useRecipeSections, useCreateRecipeSection, useDeleteRecipeSection, useReorderRecipeSections, useSectionStepCounts
- `src/hooks/useRecipePaints.ts` — useRecipePaints, useAddRecipePaint, useRemoveRecipePaint + 5 cache keys
- `src/db/queries/recipeSections.ts` — Section CRUD and reorder queries
- `src/types/recipeSection.ts` — RecipeSection, CreateRecipeSectionInput, UpdateRecipeSectionInput

### Collapsible component
- `src/components/ui/collapsible.tsx` — shadcn/ui Collapsible (radix-ui), used in LoadoutSection, PlaybookTab, BattleLogRow

### Recipe schema
- `src/features/recipes/recipeSchema.ts` — RECIPE_SURFACES, PAINTING_PHASES, and other const arrays for select options

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `RecipeStepList`: Inner DndContext + SortableContext for step reorder — reusable as-is inside section cards
- `RecipeStepRow`: useSortable step row with drag handle, paint combobox, photo upload — unchanged
- `recipeSteps.ts`: DraftStep, makeDraftStep(), computeOrderIndex() — step-level utilities
- `Collapsible` (radix-ui): Already used in 3 components — section collapse/expand
- `PaintCombobox`: Paint selector in step rows — unchanged
- `GripVertical` icon: Already used for step drag handles — reuse for section drag handles
- `RecipeDeleteDialog`: Confirmation dialog pattern — reuse pattern for non-empty section delete

### Established Patterns
- Manual useState + crypto.randomUUID() for DnD-managed drafts (not useFieldArray — RHF #10607)
- Delete-all-and-recreate on form submit (RecipeFormSheet.onSubmit)
- Re-mount on recipe switch via key={recipe?.id ?? "new"} on SheetContent
- Single useEffect for draft initialization guarded on data length
- 5-key cache invalidation contract on section delete
- PaintSheet stacked portal for inline paint creation

### Integration Points
- RecipeFormSheet.tsx: Major rewrite — flat DraftStep[] becomes DraftSection[] containing DraftStep[]
- RecipeStepList.tsx: Minor change — receives steps for a single section instead of all recipe steps
- addRecipePaint call sites: section_id changes from null to real section DB IDs
- recipe-step-counts query invalidation: already in onSubmit, unchanged

</code_context>

<specifics>
## Specific Ideas

No specific requirements — standard form patterns apply. The key reference is the existing RecipeFormSheet which is being extended from flat steps to sectioned steps. The progressive disclosure pattern ensures backward UX compatibility.

</specifics>

<deferred>
## Deferred Ideas

- Cross-section step drag-and-drop (FLOW-01) — v0.2.8+ upgrade path, requires collapsing to single DndContext
- "Move to section" button on step rows — simpler alternative to cross-section DnD, add post-validation
- Section notes textarea in an expanded section header — future polish

</deferred>

---

*Phase: 50-section-form-ui*
*Context gathered: 2026-05-08*
