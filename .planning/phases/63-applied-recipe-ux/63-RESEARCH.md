# Phase 63: Applied Recipe UX - Research

**Researched:** 2026-05-13
**Domain:** React UI / shadcn components / TanStack Query integration
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** "Apply Recipe" available from UnitDetailSheet (unit picks a recipe) AND RecipeDetailSheet (recipe picks units). Both use Phase 62 hooks.
- **D-02:** UnitDetailSheet entry — "Apply Recipe" button opens a Dialog with searchable/faction-filterable recipe picker. Selecting a recipe shows read-only SectionedTimeline preview. Confirm applies.
- **D-03:** RecipeDetailSheet entry — "Apply to Unit(s)" button opens a Dialog with unit multi-select for bulk apply.
- **D-04:** Preview displayed in a Dialog (not a nested Sheet). Reuses existing `SectionedTimeline`.
- **D-05:** Preview is mandatory before confirming — no skip option.
- **D-06:** Per-unit progress displayed as sectioned accordion with checkboxes. Each section is collapsible with "X/Y completed" badge.
- **D-07:** Steps render as Checkbox rows. Toggling calls `useToggleStepProgress` with `order_index`.
- **D-08:** Overall progress shown as Progress bar at top with completion percentage. Per-section breakdown from `bySectionId` Map.
- **D-09:** Flat recipes (no sections) display as simple checklist — just checkboxes, no accordion.
- **D-10:** Bulk apply from RecipeDetailSheet "Apply to Unit(s)" button. Searchable/filterable unit multi-select (faction filter, name search).
- **D-11:** Already-assigned units dimmed and disabled in picker. Backed by UNIQUE constraint.
- **D-12:** Confirmation shows count of selected units and recipe name before calling `useBulkCreateAssignments`.
- **D-13:** UnitDetailSheet gets a new "Recipes" tab showing all applied recipes each with progress bar. Clicking expands step checklist.
- **D-14:** Empty state when no applied recipes — "Apply Recipe" CTA.

### Claude's Discretion

- Whether to add applied recipes as a new Tab in UnitDetailSheet or as a section within the existing overview area
- Delete/remove assignment UX (trash icon, swipe, confirmation dialog)
- Exact layout of the recipe picker dialog (combobox vs list vs card grid)
- Loading and error states for all new components
- Whether to show "last completed step" or "next step" as a quick summary on the applied recipe card

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.

</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| AR-02 | User can apply one or more recipes to a unit from Collection/Unit Detail with section/step preview | `ApplyRecipeDialog` (unit→recipe) + `ApplyToUnitsDialog` (recipe→units bulk), `useCreateAssignment`, `useBulkCreateAssignments` |
| AR-03 | User can tick sections/steps as completed for a specific unit assignment — progress stored separately from recipe template | `AssignmentChecklist` with `useToggleStepProgress`; `computeAssignmentProgress` drives percentages |
| AR-04 | Applied recipe progress visible on unit detail — checklist-like section/step view with completion percentage | `AppliedRecipesTab` (new 4th tab in `UnitDetailSheet`) showing progress bars + expandable checklists |
| AR-07 | User can apply same recipe to multiple selected units — each gets separate progress | `ApplyToUnitsDialog` calling `useBulkCreateAssignments`; already-assigned units dimmed/disabled |

</phase_requirements>

---

## Summary

Phase 63 is a pure UI layer built on top of the Phase 62 data layer. No schema changes, no new query functions, and no new pure utility functions are needed. Every data operation in this phase uses hooks and types that Phase 62 already delivered (`useAssignmentsByUnit`, `useCreateAssignment`, `useDeleteAssignment`, `useStepProgress`, `useToggleStepProgress`, `useBulkCreateAssignments`, `computeAssignmentProgress`).

The phase introduces four new components and modifies two existing ones. The four new components are: `ApplyRecipeDialog` (unit-side assignment entry), `ApplyToUnitsDialog` (recipe-side bulk assignment entry), `AssignmentChecklist` (per-assignment step checklist with sectioned accordion), and `AppliedRecipesTab` (new tab panel in `UnitDetailSheet`). The two existing components that are modified are `UnitDetailSheet` (gains a 4th "Recipes" tab) and `RecipeDetailSheet` (gains an "Apply to Unit(s)" footer button).

The single blocking dependency on the component side is the shadcn `Accordion` component, which does not yet exist in `src/components/ui/`. The underlying `@radix-ui/react-accordion` package is already installed as part of the `radix-ui@1.4.3` bundle — only the shadcn wrapper component needs to be scaffolded via `npx shadcn add accordion`. The UI spec (`63-UI-SPEC.md`) is already fully defined and checker-approved, providing exact copy, interaction states, layout constraints, and design token references.

**Primary recommendation:** Start with Wave 0 (install Accordion + write test stubs), then build the four new components top-down before integrating into the two host sheets.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Apply recipe to unit (single) | Frontend (Dialog component) | React Query (mutation) | Pure UI + cache mutation; no backend involvement |
| Apply recipe to multiple units (bulk) | Frontend (Dialog component) | React Query (mutation) | Same pattern; `useBulkCreateAssignments` handles DB loop |
| Display step checklist with checkboxes | Frontend (AssignmentChecklist) | — | Pure rendering from query data |
| Toggle step completion | Frontend (Checkbox onChange) | React Query (mutation) | Optimistic UI update + cache invalidation |
| Display assignment progress (%) | Frontend (Progress component) | Pure function (`computeAssignmentProgress`) | No DB round-trip; derived from `useStepProgress` result |
| Remove assignment | Frontend (AlertDialog confirm) | React Query (mutation) | `useDeleteAssignment` handles DB + cache |
| Preview recipe before applying | Frontend (SectionedTimeline reuse) | — | Read-only display; sections/steps already loaded |

---

## Standard Stack

### Core (all already installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `radix-ui` | 1.4.3 | Accordion, Checkbox, Dialog primitives | Project-wide UI primitive layer |
| `@tanstack/react-query` | (project default) | `useAssignmentsByUnit`, `useStepProgress`, all mutations | Project server-state standard |
| `sonner` | (project default) | Toast feedback on mutation success/error | Established project pattern |
| `lucide-react` | (project default) | Icons (Trash2, ClipboardList, ChevronDown) | Project icon library |

### Component Layer (shadcn/ui, all in `src/components/ui/`)
| Component | File | Status |
|-----------|------|--------|
| `Dialog` | `dialog.tsx` | Installed [VERIFIED: codebase] |
| `Checkbox` | `checkbox.tsx` | Installed [VERIFIED: codebase] |
| `Progress` | `progress.tsx` | Installed [VERIFIED: codebase] |
| `Badge` | `badge.tsx` | Installed [VERIFIED: codebase] |
| `Button` | `button.tsx` | Installed [VERIFIED: codebase] |
| `Collapsible` | `collapsible.tsx` | Installed [VERIFIED: codebase] |
| `AlertDialog` | `alert-dialog.tsx` | Installed [VERIFIED: codebase] |
| `Command` | `command.tsx` | Installed [VERIFIED: codebase] |
| `Skeleton` | `skeleton.tsx` | Installed [VERIFIED: codebase] |
| `Accordion` | `accordion.tsx` | **NOT installed** [VERIFIED: codebase glob] |

**Installation required:**
```bash
npx shadcn add accordion
```

`@radix-ui/react-accordion` is already present as a dependency of `radix-ui@1.4.3` [VERIFIED: node_modules inspection]. The `npx shadcn add accordion` command will only scaffold the wrapper component file.

---

## Architecture Patterns

### System Architecture Diagram

```
UnitDetailSheet (modified)              RecipeDetailSheet (modified)
  └─ "Recipes" tab (new)                  └─ "Apply to Unit(s)" button (new)
       └─ AppliedRecipesTab                    └─ ApplyToUnitsDialog
            ├─ empty state + CTA                    ├─ unit multi-select (Command)
            ├─ applied recipe cards                 ├─ faction filter (Select)
            │    ├─ Progress bar                    ├─ already-assigned dim/disable
            │    ├─ trash → AlertDialog             └─ useBulkCreateAssignments
            │    └─ click expands ↓
            └─ AssignmentChecklist
                 ├─ overall Progress bar
                 ├─ sectioned: Accordion
                 │    ├─ AccordionItem per section
                 │    │    trigger: name + "X/Y" badge
                 │    └─ AccordionContent: Checkbox rows
                 │         └─ useToggleStepProgress
                 └─ flat: <ul> + Checkbox rows

"Apply Recipe" button (UnitDetailSheet Details tab)
  └─ ApplyRecipeDialog
       ├─ recipe picker (Command, searchable + faction filter)
       ├─ SectionedTimeline preview (read-only, reused)
       └─ useCreateAssignment on confirm
```

### Recommended Project Structure

```
src/features/recipes/
  ApplyRecipeDialog.tsx      # NEW — unit→recipe assignment entry
  ApplyToUnitsDialog.tsx     # NEW — recipe→units bulk assignment entry
  AssignmentChecklist.tsx    # NEW — per-assignment step checklist
  (existing files unchanged)

src/features/units/
  AppliedRecipesTab.tsx      # NEW — tab panel for UnitDetailSheet
  UnitDetailSheet.tsx        # MODIFIED — add 4th "recipes" tab
  (existing files unchanged)

src/features/recipes/
  RecipeDetailSheet.tsx      # MODIFIED — add "Apply to Unit(s)" footer button

src/components/ui/
  accordion.tsx              # NEW (Wave 0) — shadcn accordion wrapper

tests/applied-recipes/
  ApplyRecipeDialog.test.tsx    # Wave 0 stub → AR-02
  ApplyToUnitsDialog.test.tsx   # Wave 0 stub → AR-07
  AssignmentChecklist.test.tsx  # Wave 0 stub → AR-03, AR-04
  AppliedRecipesTab.test.tsx    # Wave 0 stub → AR-04
```

### Pattern 1: Sectioned Accordion Checklist

The `AssignmentChecklist` component follows the pattern already established by `SectionedTimeline` for grouping steps by `section_id`. It uses the Phase 62 `computeAssignmentProgress` pure function and `bySectionId` Map to derive per-section counts.

```typescript
// Source: [VERIFIED: src/lib/computeAssignmentProgress.ts]
const progress = computeAssignmentProgress(steps, stepProgressRows);
// progress.bySectionId is Map<number | null, { total: number; completed: number }>
// progress.percentage is 0-100 integer
```

```typescript
// Source: [VERIFIED: CONTEXT.md D-06, D-07, D-08; 63-UI-SPEC.md]
// Accordion usage (after installing accordion component):
<Accordion type="multiple">
  {sections.map(section => {
    const bucket = progress.bySectionId.get(section.id) ?? { total: 0, completed: 0 };
    return (
      <AccordionItem key={section.id} value={String(section.id)}>
        <AccordionTrigger className="min-h-12">
          <span>{section.name}</span>
          <Badge variant="outline">{bucket.completed}/{bucket.total}</Badge>
        </AccordionTrigger>
        <AccordionContent>
          {sectionSteps.map(step => (
            <div key={step.order_index} className="min-h-12 flex items-center gap-2">
              <Checkbox
                checked={isCompleted(step.order_index)}
                onCheckedChange={(checked) =>
                  toggleStep.mutate({ assignmentId, orderIndex: step.order_index, completed: !!checked })
                }
              />
              <span className={isCompleted(step.order_index) ? "line-through text-muted-foreground" : ""}>
                {step.step_name}
              </span>
            </div>
          ))}
        </AccordionContent>
      </AccordionItem>
    );
  })}
</Accordion>
```

### Pattern 2: Recipe Picker Dialog (ApplyRecipeDialog)

Uses the `Command` component (already installed) for searchable list + the existing `SectionedTimeline` for preview. The recipe picker filters by faction using the same faction filtering pattern seen in existing comboboxes.

```typescript
// Source: [VERIFIED: src/components/ui/command.tsx exists; CONTEXT.md D-02]
// Recipe list uses Command + optional SectionedTimeline preview below the picker.
// Sections/steps for the selected recipe are loaded via:
const { data: sections } = useRecipeSections(selectedRecipeId);
const { data: steps } = useRecipePaints(selectedRecipeId);
// Preview renders only when selectedRecipeId is set.
```

### Pattern 3: Optimistic Checkbox Toggle

The UI spec mandates optimistic updates for step toggles. The pattern: update local state immediately on `onCheckedChange`, call `useToggleStepProgress`, revert and show toast on error.

```typescript
// Source: [VERIFIED: src/hooks/useRecipeAssignments.ts — useToggleStepProgress]
const toggleStep = useToggleStepProgress();
// On error, React Query cache invalidation will refresh `useStepProgress(assignmentId)`
// causing the checkbox to revert. No manual local state management needed if
// the component derives `isCompleted` from the query data rather than local state.
```

### Pattern 4: Remove Assignment with AlertDialog

```typescript
// Source: [VERIFIED: src/components/ui/alert-dialog.tsx exists; 63-UI-SPEC.md]
// Pattern mirrors existing UnitDeleteDialog.tsx structure.
const deleteAssignment = useDeleteAssignment();
// deleteAssignment.mutate({ id, unitId, recipeId }) — requires all 3 for cache invalidation
```

### Anti-Patterns to Avoid

- **Nesting a Sheet inside an open Sheet:** The Dialog (not Sheet) is the correct container for both assignment flows. D-04 explicitly locks this. PlaybookTab's DatasheetPicker Dialog inside UnitDetailSheet Sheet is the established precedent that this pattern is safe.
- **Passing recipe `section_id` instead of `order_index` to useToggleStepProgress:** The hook takes `order_index` (position within the full recipe's steps), not a section-scoped index.
- **Calling useStepProgress inside a loop or conditionally:** Each `AssignmentChecklist` receives a single `assignmentId`. The hook must be called at the top level of the component, not inside a `.map()`.
- **Managing `isCompleted` in local state:** Deriving from `useStepProgress` data (via a Set of completed `order_index` values) is simpler and avoids stale state on cache invalidation.
- **Using `Collapsible` instead of `Accordion` for sections:** `Collapsible` manages only one panel independently with no shared group semantics. `Accordion type="multiple"` is the correct primitive since multiple sections can be open simultaneously (D-06).

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Collapsible sections with expand/collapse | Custom div toggle state | `Accordion` (shadcn) | Keyboard nav, accessibility, animation, already backed by Radix |
| Searchable picker list | Custom filtered `<ul>` | `Command` component | Fuzzy search, keyboard nav, already installed |
| Step completion progress math | Custom percentage formula | `computeAssignmentProgress` (Phase 62) | Already handles 0-steps edge case, per-section breakdown |
| Assignment creation / deletion / toggle | Direct `db.execute` calls | `useCreateAssignment`, `useDeleteAssignment`, `useToggleStepProgress` | Cache invalidation contracts already tested |
| Recipe section/step display in preview | Custom read-only UI | `SectionedTimeline` / `RecipeStepTimeline` | Already handles sectioned + flat cases; paint metadata badges included |
| Confirmation before destructive action | Custom inline confirm state | `AlertDialog` (shadcn) | Accessible, focus-trapped; already installed |

**Key insight:** This phase is almost entirely composition of already-built primitives. The risk of hand-rolling is cache inconsistency (bypassing established invalidation contracts) and accessibility gaps (skipping proven keyboard/focus management in Radix primitives).

---

## Common Pitfalls

### Pitfall 1: `useStepProgress` called with `undefined` assignment ID

**What goes wrong:** When `AppliedRecipesTab` renders before `useAssignmentsByUnit` has resolved, the `assignmentId` is `undefined`. If passed directly to `useStepProgress`, the hook falls back to the unscoped key `["recipe-assignments"]`, which is never populated, causing a perpetual loading state in `AssignmentChecklist`.

**Why it happens:** React Query hooks are conditional by default when `enabled: false`. The hook in `useRecipeAssignments.ts` already handles `undefined` correctly (returns `[]`, does not fire query). But the *component* mounting `AssignmentChecklist` must not mount it until the assignment is confirmed to exist.

**How to avoid:** Gate `AssignmentChecklist` rendering behind `assignmentId !== undefined`. In `AppliedRecipesTab`, iterate `assignments` (which is empty array during loading) and only render `AssignmentChecklist` for known assignment IDs.

---

### Pitfall 2: Missing `unitId` / `recipeId` on `useDeleteAssignment`

**What goes wrong:** `useDeleteAssignment` requires `{ id, unitId, recipeId }` — all three are needed for the D-13 symmetric cache invalidation. Passing only `{ id }` silently deletes the DB row but leaves the cache stale, so the UI does not refresh.

**Why it happens:** API footgun — the mutation function itself only uses `id` but the `onSuccess` callback needs `unitId` and `recipeId`.

**How to avoid:** Always construct the full `{ id: assignment.id, unitId: assignment.unit_id, recipeId: assignment.recipe_id }` object when calling `deleteAssignment.mutate(...)`.

---

### Pitfall 3: `bulkCreateAssignments` includes already-assigned units

**What goes wrong:** The DB has a `UNIQUE (unit_id, recipe_id)` constraint. `INSERT OR IGNORE` silently skips duplicates, but if the picker does not visually disable already-assigned units (D-11), users will see the success toast but not understand why count didn't match.

**Why it happens:** `useAssignmentsByRecipe(recipeId)` provides the already-assigned unit IDs. The picker must cross-reference this set to dim/disable rows.

**How to avoid:** In `ApplyToUnitsDialog`, call `useAssignmentsByRecipe(recipe.id)` and build a `Set<number>` of already-assigned `unit_id` values. Disable picker rows where `alreadyAssigned.has(unit.id)`.

---

### Pitfall 4: `SectionedTimeline` requires `paintMap` prop

**What goes wrong:** Reusing `SectionedTimeline` for the recipe preview in `ApplyRecipeDialog` requires passing a `paintMap: Map<number, Paint>`. If `usePaints` is not called in `ApplyRecipeDialog`, the map is empty and paint-missing indicators won't render.

**Why it happens:** `SectionedTimeline` interface declares `paintMap` as required. It won't crash with an empty map, but availability badges will be missing.

**How to avoid:** Call `usePaints()` in `ApplyRecipeDialog` (already done in `RecipeDetailSheet` as precedent) and build the `paintMap` via `useMemo`.

---

### Pitfall 5: Accordion not installed — import will fail at build time

**What goes wrong:** `AssignmentChecklist.tsx` imports `Accordion` from `@/components/ui/accordion`. If Wave 0 does not install the accordion component first, the build fails immediately.

**Why it happens:** `accordion.tsx` does not yet exist in `src/components/ui/` [VERIFIED: codebase glob scan].

**How to avoid:** Wave 0 task must run `npx shadcn add accordion` before any other task in this phase.

---

### Pitfall 6: Dialog opened from inside a Sheet — z-index / portal nesting

**What goes wrong:** Both assignment Dialogs are opened from within Sheet components. Radix uses portals, but incorrect z-index stacking or unmounting the Sheet while the Dialog is open can cause focus to escape the Dialog.

**Why it happens:** Radix Dialog portals to `document.body` and manages focus independently. The risk is in the Dialog `onOpenChange` — if it closes the parent Sheet too, focus restoration breaks.

**How to avoid:** Dialog state must be owned by the Sheet component itself (useState), not by the Dialog. The Sheet should not close when the Dialog closes. UnitDetailSheet's existing DatasheetPicker Dialog pattern (`pickerOpen` / `setPickerOpen` in `PlaybookTab`) is the established precedent.

---

## Code Examples

### Pattern: Building paintMap for SectionedTimeline preview

```typescript
// Source: [VERIFIED: src/features/recipes/RecipeDetailSheet.tsx lines 75-80]
const { data: paints = [] } = usePaints();
const paintMap = useMemo(() => {
  const m = new Map<number, typeof paints[number]>();
  for (const p of paints) m.set(p.id, p);
  return m;
}, [paints]);
```

### Pattern: Progress bar with percentage label

```typescript
// Source: [VERIFIED: src/types/recipeAssignment.ts — AssignmentProgress.percentage]
// Source: [VERIFIED: src/lib/computeAssignmentProgress.ts — returns integer 0-100]
<div className="flex items-center gap-2">
  <Progress value={progress.percentage} className="h-2 flex-1" />
  <span className="text-xs text-muted-foreground tabular-nums">
    {progress.percentage}% complete
  </span>
</div>
```

### Pattern: Already-assigned unit detection in multi-select

```typescript
// Source: [VERIFIED: src/hooks/useRecipeAssignments.ts — useAssignmentsByRecipe]
const { data: existingAssignments = [] } = useAssignmentsByRecipe(recipe?.id);
const assignedUnitIds = useMemo(
  () => new Set(existingAssignments.map((a) => a.unit_id)),
  [existingAssignments]
);
// In picker row: disabled={assignedUnitIds.has(unit.id)} className={assignedUnitIds.has(unit.id) ? "opacity-50" : ""}
```

### Pattern: Tab trigger addition in UnitDetailSheet

```typescript
// Source: [VERIFIED: src/features/units/UnitDetailSheet.tsx lines 102-107]
// Existing: Details / Playbook / Journal
// Add 4th tab:
<TabsTrigger value="recipes">Recipes</TabsTrigger>
// ...
<TabsContent value="recipes">
  <AppliedRecipesTab unitId={unit.id} />
</TabsContent>
```

---

## Environment Availability

Step 2.6: SKIPPED — no external tool dependencies beyond the project's own code. The `npx shadcn add accordion` command uses the project's already-configured shadcn CLI.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4 + React Testing Library 16 |
| Config file | `vite.config.ts` (vitest section) |
| Quick run command | `pnpm test -- tests/applied-recipes/` |
| Full suite command | `pnpm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AR-02 | ApplyRecipeDialog renders recipe picker; confirm calls useCreateAssignment | unit (component) | `pnpm test -- tests/applied-recipes/ApplyRecipeDialog.test.tsx` | Wave 0 |
| AR-02 | ApplyToUnitsDialog renders unit list; already-assigned units disabled | unit (component) | `pnpm test -- tests/applied-recipes/ApplyToUnitsDialog.test.tsx` | Wave 0 |
| AR-03 | AssignmentChecklist toggles step via useToggleStepProgress with correct order_index | unit (component) | `pnpm test -- tests/applied-recipes/AssignmentChecklist.test.tsx` | Wave 0 |
| AR-04 | AppliedRecipesTab shows Progress bar + assignment list; empty state when no assignments | unit (component) | `pnpm test -- tests/applied-recipes/AppliedRecipesTab.test.tsx` | Wave 0 |
| AR-07 | ApplyToUnitsDialog calls useBulkCreateAssignments with all selected unit IDs | unit (component) | `pnpm test -- tests/applied-recipes/ApplyToUnitsDialog.test.tsx` | Wave 0 |

### Sampling Rate

- **Per task commit:** `pnpm test -- tests/applied-recipes/`
- **Per wave merge:** `pnpm test`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `src/components/ui/accordion.tsx` — install via `npx shadcn add accordion` (required before any component import)
- [ ] `tests/applied-recipes/ApplyRecipeDialog.test.tsx` — covers AR-02 (unit→recipe flow)
- [ ] `tests/applied-recipes/ApplyToUnitsDialog.test.tsx` — covers AR-02/AR-07 (recipe→units bulk flow)
- [ ] `tests/applied-recipes/AssignmentChecklist.test.tsx` — covers AR-03 (step toggle)
- [ ] `tests/applied-recipes/AppliedRecipesTab.test.tsx` — covers AR-04 (progress display + empty state)

---

## Security Domain

No authentication, session management, access control, or cryptographic operations are introduced in this phase. All data flows through the existing Tauri IPC bridge (same trust boundary as all other DB operations). Input validation is handled by the existing `useCreateAssignment` / `useBulkCreateAssignments` hooks which pass typed inputs to parameterized SQL queries.

ASVS V5 (Input Validation): Covered by existing Phase 62 query layer — no new raw SQL in this phase.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `npx shadcn add accordion` will scaffold correctly with the project's existing `components.json` config | Standard Stack | Minor — worst case, accordion.tsx needs manual creation using the collapsible.tsx as a template |

**All other claims are VERIFIED against codebase or CITED from CONTEXT.md / UI-SPEC.md.**

---

## Open Questions

1. **Optimistic vs. server-derived checkbox state**
   - What we know: `useToggleStepProgress` invalidates `STEP_PROGRESS_KEY(assignmentId)` on success. On error, the invalidation still fires, refreshing the cache from DB.
   - What's unclear: Should `AssignmentChecklist` maintain a local `pendingToggles` Set for optimistic UI, or simply derive all state from the query data?
   - Recommendation: Derive all state from query data. React Query's invalidation is fast (local SQLite, ~5ms). Local optimistic state adds complexity and a divergence risk. If the checkbox feels sluggish, add `pendingToggles` as a follow-up optimization.

2. **"Next step" summary on applied recipe card**
   - What we know: UI spec mentions "Next: [step description]" as optional summary text. CONTEXT.md leaves this to Claude's Discretion.
   - What's unclear: Whether to show the next-uncompleted step name on the card before expanding.
   - Recommendation: Include it. It's a single `steps.find(s => !isCompleted(s.order_index))` lookup on already-loaded data and adds meaningful at-a-glance value.

---

## Sources

### Primary (HIGH confidence)
- [VERIFIED: codebase] `src/hooks/useRecipeAssignments.ts` — all 7 hooks with exact signatures and invalidation contracts
- [VERIFIED: codebase] `src/types/recipeAssignment.ts` — `RecipeAssignment`, `StepProgress`, `AssignmentProgress` types
- [VERIFIED: codebase] `src/lib/computeAssignmentProgress.ts` — pure function signature and behavior
- [VERIFIED: codebase] `src/features/units/UnitDetailSheet.tsx` — existing tab structure (Details/Playbook/Journal)
- [VERIFIED: codebase] `src/features/recipes/RecipeDetailSheet.tsx` — existing footer pattern + SectionedTimeline reuse pattern
- [VERIFIED: codebase] `src/features/recipes/SectionedTimeline.tsx` — component interface (requires sections, steps, paintMap, stepPhotoUrls)
- [VERIFIED: codebase] `src/components/ui/*.tsx` glob — all installed UI primitives; accordion.tsx absent
- [VERIFIED: node_modules] `radix-ui@1.4.3` dependencies include `@radix-ui/react-accordion`
- [VERIFIED: codebase] `.planning/phases/63-applied-recipe-ux/63-UI-SPEC.md` — complete design contract

### Secondary (MEDIUM confidence)
- [CITED: 63-CONTEXT.md] All locked decisions D-01 through D-14
- [CITED: REQUIREMENTS.md] AR-02, AR-03, AR-04, AR-07 requirement descriptions
- [CITED: tests/painting/recipeAssignments.test.ts] Phase 62 test patterns (mocking, hook wrapper)

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all components verified in codebase or node_modules
- Architecture: HIGH — all entry points, hooks, and types verified in source
- Pitfalls: HIGH — derived from actual code inspection of hook signatures and component interfaces
- Wave 0 gaps: HIGH — verified by codebase glob scan

**Research date:** 2026-05-13
**Valid until:** 2026-06-13 (stable — no external dependencies, all verified in local codebase)
