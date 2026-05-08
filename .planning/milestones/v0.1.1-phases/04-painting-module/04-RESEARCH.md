# Phase 4: Painting Module - Research

**Researched:** 2026-05-01
**Domain:** Kanban drag-and-drop + Recipe CRUD with paint step linkage (React + @dnd-kit + TanStack Query + SQLite via tauri-plugin-sql)
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Kanban card density**
- Rich cards: unit name + faction badge (hex color) + painting_percentage progress bar + priority indicator + target completion date
- Target date highlighted red when overdue (past today's date)
- Cards with no target date simply omit the date field — no placeholder

**Kanban board behavior**
- Columns scroll independently (fixed header, scrollable body) — standard Kanban behavior
- Empty columns hidden: only columns with ≥1 active unit are shown. If all units drain from a column it collapses.
- Drag-and-drop via @dnd-kit (already locked in) to move cards between columns, updating `status_painting` with optimistic update + Sonner error rollback

**Active project management**
- `is_active_project` toggle available in all three places: Kanban card (remove button/toggle), unit detail Sheet, and Collection table (via existing is_active_project column/flag)
- Marking inactive from the Kanban: card disappears immediately (optimistic removal)
- Kanban has an "Add project" button that opens a unit picker (Combobox/Command search over non-active units)
- Empty state: centered prompt — icon + "No active projects" + "Add a unit to get started" CTA button

**Recipe form structure**
- Ordered steps approach using `recipe_paints` join table — NOT the fixed text fields
- Fixed schema columns (primer, basecoat, shade, layer, highlight, glaze_filter, weathering, technical, basing) remain in the DB but are left empty; the UI uses only the steps list
- Each step has: a step name (free text, e.g. "Basecoat") + an optional linked paint from inventory
- Paint search: Popover + Command autocomplete from paint inventory — same pattern as CategoryCombobox (Phase 2)
- Steps are reorderable via @dnd-kit drag handles (reuse @dnd-kit already in project for Kanban)

**Recipe list page**
- Table layout (consistent with other entity pages): columns — Recipe name, Faction badge, Linked unit (if any), Area
- Filters: faction, linked unit, area (text/select)
- Clicking a row opens a right-side detail Sheet

**Recipe detail Sheet**
- Read-only view: name, faction badge, unit link, area, ordered steps with linked paint names
- "Edit" button opens the edit form Sheet (same stacked-Sheet pattern as unit detail → UnitSheet)
- CRUD follows the same pattern as Factions/Paints pages

**Recipe ↔ Unit linkage**
- Unit detail Sheet (Phase 3) gets an additional "Recipes" section listing recipe names linked to that unit
- Clicking a recipe name navigates to `/recipes` with that recipe's detail Sheet open (or filtered to it)
- No reverse link needed from recipe to unit — the recipe already shows the linked unit name in its list row and detail

### Claude's Discretion
- Exact drag handle visual (grip icon placement on Kanban card and recipe steps)
- Column header styling for empty vs. active columns during transitions
- Recipe step name placeholder suggestions (e.g. "Primer", "Basecoat"...)
- Filter bar layout on Recipes page
- Whether recipe edit form opens as a new Sheet or replaces the detail Sheet

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| PROJ-01 | Painting Projects page shows ONLY units where `is_active_project = true` | Filter from `useUnits()` cache client-side — same pattern as `applyUnitFilters`; no new query needed |
| PROJ-02 | Cards grouped into columns by `status_painting`, ordered by `PAINTING_STATUS_ORDER` constant | `PAINTING_STATUS_ORDER` already defined in `src/types/unit.ts`; group with `reduce` keyed by status |
| PROJ-03 | Each Kanban card shows unit name, faction (color accent), painting_percentage progress bar, priority, target_completion_date | `useFactions()` for badge; `<Progress>` and `<Badge>` already installed |
| PROJ-04 | Drag card between columns updates `status_painting`; uses @dnd-kit/core + @dnd-kit/sortable | @dnd-kit NOT YET INSTALLED — must `pnpm add @dnd-kit/core @dnd-kit/sortable`; current versions: core@6.3.1, sortable@10.0.0 |
| PROJ-05 | Drag-drop mutation is optimistic; rollback on DB error; invalidates units + dashboard stats | `useUpdateUnit` + `useQueryClient.setQueryData(UNITS_KEY, ...)` pattern already established in `StatusPopover.tsx` |
| PROJ-06 | Mark/unmark active project from Kanban card menu, unit detail drawer, collection table | `useUpdateUnit({ id, is_active_project: 0|1 })` + optimistic setQueryData; three call sites |
| PROJ-07 | Sortable cards within a column by priority ASC then target_completion_date ASC (nulls last) | Pure sort function over filtered array — no DB query change |
| PROJ-08 | Empty state when no active projects | Conditional render based on zero active units |
| RECIPE-01 | User can create a recipe with name, faction (optional), unit (optional), area (free-text) | `createRecipe` + `useCreateRecipe` already exist; form needs react-hook-form + zod |
| RECIPE-02 | Recipe step fields (primer, basecoat, etc.) as free-text per stage | CONTEXT decision: steps live in `recipe_paints` join table only; DB columns left empty |
| RECIPE-03 | Recipe stores notes, tutorial_link (clickable) | Already in `PaintingRecipe` type and `createRecipe` query |
| RECIPE-04 | User can edit and delete recipes | `useUpdateRecipe` + `useDeleteRecipe` already exist |
| RECIPE-05 | Attach paints to recipe steps via `recipe_paints` join table — step_name, order_index, notes | `addRecipePaint` + `removeRecipePaint` + `useAddRecipePaint` + `useRemoveRecipePaint` all exist; reorder requires bulk re-index |
| RECIPE-06 | Detail view shows owned/missing paints visually | Join paint data (from `usePaints`) to `RecipePaint` by `paint_id`; check `paint.owned === 1` |
| RECIPE-07 | List/filter recipes by faction or unit | Client-side filter same as Collection pattern; `useRecipes()` returns all |
| RECIPE-08 | Empty state for "no recipes yet" with CTA | Conditional render; same `FactionsEmptyState` pattern |
| PAINT-03 | Paint create/edit inline inside recipe builder | Inline "Add new paint" opens stacked PaintSheet; on save, auto-selects new paint in step combobox |
| PAINT-04 | Paint search/picker (combobox) filters by brand and name as you type | `usePaints()` already exists; filter with `shouldFilter` in Command or manual filter on `brand + name` concatenation |
</phase_requirements>

---

## Summary

Phase 4 delivers two new surfaces: the Painting Projects Kanban board and the Recipes CRUD. The good news is the foundational infrastructure is fully built — all DB queries, hooks, and entity types exist for units, recipes, recipe_paints, and paints. All shadcn/ui components needed are already installed. The primary new technical work is (1) integrating @dnd-kit (not yet installed) for both Kanban drag-and-drop and recipe step reordering, and (2) building the recipe step UI where `recipe_paints` rows are edited as a local in-memory draft list that is batch-written on recipe form submit.

The optimistic mutation pattern is battle-tested in this codebase — `StatusPopover.tsx` shows exactly how to snapshot, patch, and rollback the TanStack Query cache. That exact pattern governs both Kanban column drag (status_painting) and card removal (is_active_project). For recipes, steps are managed as local React state during editing and only written to the DB on submit (add new rows, remove deleted rows).

**Primary recommendation:** Install `@dnd-kit/core@6.3.1` and `@dnd-kit/sortable@10.0.0`, then build the four plan units in the order the roadmap specifies (Kanban shell → Kanban DnD → Recipes list/detail → Recipe step linker), reusing all existing hooks and patterns.

---

## Standard Stack

### Core (already installed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @tanstack/react-query | ^5.100.6 | Server-state cache, optimistic mutations | Already in project; all hooks built |
| @tanstack/react-table | ^8.21.3 | Recipe table columns, sort, filter | Already installed from Phase 3 |
| react-hook-form | ^7.74.0 | Recipe form state, validation | Already in project |
| zod | ^4.4.1 | Recipe form schema | Already in project; note: no `.default()` on fields (established pitfall) |
| zustand | ^5.0.12 | Recipe filter ephemeral state | Already installed |
| sonner | ^2.0.7 | Error toasts on drag-drop failures | Already mounted in AppLayout |
| lucide-react | ^0.460.0 | GripVertical, MoreHorizontal, Flag, Calendar, Kanban, BookOpen icons | Already installed |

### New Dependency (must install)

| Library | Version | Purpose | Why |
|---------|---------|---------|-----|
| @dnd-kit/core | 6.3.1 | DndContext, DragOverlay, sensors, pointer/keyboard | Locked decision PROJ-04; verified current npm version |
| @dnd-kit/sortable | 10.0.0 | SortableContext, useSortable, verticalListSortingStrategy | Same lock-in; sortable per column and for recipe steps |

**Note:** `@dnd-kit/utilities` (3.2.2) is an optional peer that provides CSS transform helpers. Check if `@dnd-kit/sortable` requires it — import `CSS` from `@dnd-kit/utilities` is the standard pattern for `useSortable` transforms.

**Installation:**
```bash
pnpm add @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

**Version verification:** Confirmed 2026-05-01 via `npm view`:
- `@dnd-kit/core`: 6.3.1
- `@dnd-kit/sortable`: 10.0.0
- `@dnd-kit/utilities`: 3.2.2

### shadcn/ui Components (all already installed)

| Component | File | Phase 4 Use |
|-----------|------|------------|
| Card | `src/components/ui/card.tsx` | KanbanCard container |
| Badge | `src/components/ui/badge.tsx` | Faction badge on Kanban cards and recipe table |
| Progress | `src/components/ui/progress.tsx` | painting_percentage bar on Kanban cards |
| Popover + Command | `src/components/ui/popover.tsx`, `command.tsx` | "Add project" picker, paint combobox in recipe steps |
| Sheet | `src/components/ui/sheet.tsx` | Recipe detail Sheet, recipe edit form Sheet |
| Dialog | `src/components/ui/dialog.tsx` | Recipe delete confirm |
| Skeleton | `src/components/ui/skeleton.tsx` | Loading states for board and recipe table |
| Tooltip | `src/components/ui/tooltip.tsx` | Drag handle hover label |

---

## Architecture Patterns

### Recommended Project Structure

```
src/
├── features/
│   ├── painting-projects/
│   │   ├── KanbanBoard.tsx          # DndContext wrapper, column layout
│   │   ├── KanbanColumn.tsx         # SortableContext, column header, card list
│   │   ├── KanbanCard.tsx           # useSortable, card layout, card action menu
│   │   ├── AddProjectPicker.tsx     # Popover+Command for inactive units
│   │   └── KanbanEmptyState.tsx     # Empty board prompt
│   └── recipes/
│       ├── RecipeTable.tsx          # TanStack Table, column defs, row click
│       ├── RecipeTableColumns.tsx   # Column definitions (name, faction, unit, area, steps, actions)
│       ├── RecipeDetailSheet.tsx    # Read-only Sheet with step list + owned/missing dots
│       ├── RecipeFormSheet.tsx      # Create/edit Sheet with react-hook-form
│       ├── RecipeStepList.tsx       # @dnd-kit sortable list of step rows
│       ├── RecipeStepRow.tsx        # GripVertical + step name Input + PaintCombobox + remove
│       ├── PaintCombobox.tsx        # Popover+Command over usePaints() with owned indicator
│       ├── RecipeDeleteDialog.tsx   # AlertDialog confirm
│       ├── RecipeEmptyState.tsx     # Empty state with BookOpen icon
│       └── recipeSchema.ts          # zod schema for recipe form
├── app/
│   ├── painting-projects/page.tsx   # Replace PlaceholderPage — delegates to KanbanBoard
│   └── recipes/page.tsx             # Replace PlaceholderPage — delegates to RecipeTable + Sheets
```

### Pattern 1: @dnd-kit Kanban — DndContext Over Columns

**What:** Wrap the entire board in `DndContext`. Each column has its own `SortableContext` with `verticalListSortingStrategy`. Cards implement `useSortable`. On `onDragEnd`, detect the source and destination column (container) and call `useUpdateUnit` with the new `status_painting`.

**When to use:** Multi-column Kanban where cards move between columns.

**Example:**
```typescript
// Pattern established by @dnd-kit docs and the Georgegriff reference (PROJ-04)
// DndContext with sensors for pointer and keyboard accessibility
import { DndContext, DragOverlay, PointerSensor, KeyboardSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, sortableKeyboardCoordinates } from "@dnd-kit/sortable";

// Board level
const sensors = useSensors(
  useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
);
// distance:5 prevents accidental drags on clicks (critical UX fix)

// Column level
<SortableContext items={columnCardIds} strategy={verticalListSortingStrategy}>
  {cards.map(card => <KanbanCard key={card.id} unit={card} />)}
</SortableContext>
```

### Pattern 2: Optimistic Status Update (established — copy from StatusPopover.tsx)

**What:** Snapshot → setQueryData → mutate → rollback in onError + toast.

**When to use:** All three PROJ-05/06 mutations: drag-drop status change, active project toggle from Kanban card, active project toggle from unit detail Sheet.

**Example:**
```typescript
// Source: src/features/units/StatusPopover.tsx (verified in codebase)
const previous = qc.getQueryData<Unit[]>(UNITS_KEY);
qc.setQueryData<Unit[]>(UNITS_KEY, (old) =>
  old?.map((u) => u.id === unit.id ? { ...u, status_painting: newStatus } : u) ?? []
);
updateUnit.mutate(
  { id: unit.id, status_painting: newStatus },
  {
    onError: () => {
      qc.setQueryData(UNITS_KEY, previous);
      toast.error("Status update failed. The card has been moved back.");
    },
  }
);
```

### Pattern 3: Recipe Steps as Local Draft State

**What:** During recipe form editing, steps are kept as local React state (`useState<DraftStep[]>`). Each DraftStep has `{ localId: string, step_name: string, paint_id: number | null, notes: string | null }`. On form submit, the component:
1. Creates/updates the recipe row via `useCreateRecipe` / `useUpdateRecipe`
2. For edit mode: deletes all existing `recipe_paints` rows for that recipe_id (by removing each), then re-inserts them in order — simpler than diffing
3. For create mode: inserts all steps after the recipe row is created (lastInsertId)

**When to use:** Recipe form create and edit.

**Critical detail:** RecipePaint links are immutable per the project decision (STATE.md: "No updateRecipePaint — RecipePaint links are immutable; to change, remove + re-add"). For edit mode, delete all existing steps and re-add them in the new order.

### Pattern 4: Paint Combobox With Owned Indicator

**What:** Popover + Command (same as CategoryCombobox) fed by `usePaints()`. Each CommandItem shows `● [brand] [name]` where the dot is `text-green-500` (owned=1) or `text-red-500` (owned=0). Filtering is done via `shouldFilter` on the concatenated `brand + " " + name` string. The final CommandItem is "+ Add new paint" which opens a stacked PaintSheet.

**When to use:** Each recipe step's paint picker (PAINT-03/04).

### Pattern 5: Recipe ↔ Unit Linkage in UnitDetailSheet

**What:** Add a "Linked Recipes" section to the existing `UnitDetailSheet.tsx` at the bottom (after the Notes section). Use `useRecipes()` already in cache; filter client-side by `recipe.unit_id === unit.id`. Render recipe names as `<Button variant="link" size="sm">` that navigate to `/recipes` when clicked. To open a specific recipe's detail Sheet on navigation, pass the recipe id via TanStack Router search params or component state.

**When to use:** Whenever `UnitDetailSheet` is rendered (Phase 4 adds this section to existing component).

### Anti-Patterns to Avoid

- **Server-side filtering for recipes/units:** All filtering is client-side. `getRecipes()` and `getUnits()` return full lists. TanStack Query caches them; components filter the cached data. Never add WHERE clauses for UI filter state.
- **Separate query for active units:** Do NOT add a `getActiveUnits()` query. Filter `useUnits()` data client-side: `units.filter(u => u.is_active_project === 1)`.
- **Updating recipe steps in-place:** RecipePaint rows are immutable — no UPDATE query exists or should be created. Always remove + re-add.
- **Using zod `.default()` on form schema fields:** Established pitfall (STATE.md 02-03). Use `defaultValues` in `useForm` instead.
- **Multi-step drag activation on click:** Without `activationConstraint: { distance: 5 }` on PointerSensor, clicking a card triggers drag. This is the #1 @dnd-kit pitfall for Kanban implementations.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Drag-and-drop Kanban | Custom mousedown/drag event handlers | @dnd-kit/core + @dnd-kit/sortable | Handles pointer, touch, keyboard, accessibility, screen readers, drop animations |
| Recipe table column sort/filter | Manual state + Array.sort in component | @tanstack/react-table (already installed) | Consistent with RecipeTable architecture; sorting, column defs, row state built-in |
| Paint search autocomplete | Custom input + filtered list | Popover + Command (existing shadcn pattern) | ResizeObserver polyfill already in test setup; keyboard nav, empty state built-in |
| Form validation | Manual field error checking | react-hook-form + zod (established pattern) | Consistent with UnitSheet, FactionSheet |
| Delete confirmation | Custom boolean state + inline warning | Dialog / AlertDialog (existing pattern) | FactionDeleteDialog.tsx and UnitDeleteDialog.tsx are templates |
| Optimistic mutation rollback | setTimeout + re-fetch | setQueryData snapshot + onError restore | Established in StatusPopover.tsx; faster, no flicker |

---

## Common Pitfalls

### Pitfall 1: @dnd-kit Click vs Drag Conflict
**What goes wrong:** Clicking a Kanban card triggers the drag system, which swallows the click event before it reaches DropdownMenu or Button children.
**Why it happens:** `PointerSensor` activates on any pointer movement by default.
**How to avoid:** Use `activationConstraint: { distance: 5 }` on PointerSensor so drag only activates after 5px of movement.
**Warning signs:** Card menus don't open; click events on card children silently fail.

### Pitfall 2: @dnd-kit/sortable Version Mismatch With @dnd-kit/core
**What goes wrong:** `@dnd-kit/sortable@10.0.0` requires `@dnd-kit/core@6.x`. Mismatched peer versions cause runtime errors.
**Why it happens:** npm may install incompatible versions if specified loosely.
**How to avoid:** Pin both: `pnpm add @dnd-kit/core@6.3.1 @dnd-kit/sortable@10.0.0 @dnd-kit/utilities@3.2.2`.

### Pitfall 3: Zod .default() on Form Schema Fields
**What goes wrong:** Form input types become optional (TypeScript error); react-hook-form resolver mismatches.
**Why it happens:** Zod v4 `.default()` makes the input type `T | undefined`.
**How to avoid:** Never use `.default()` in zod schema. Handle defaults via `defaultValues` in `useForm`.
**Warning signs:** "Type ... is not assignable to type ..." resolver errors at compile time.

### Pitfall 4: Recipe Steps Order Lost on Edit
**What goes wrong:** Steps reorder correctly in the UI but save in the wrong order because `order_index` is not updated.
**Why it happens:** The drag reorder updates local state array order but `order_index` field isn't reassigned.
**How to avoid:** After any drag reorder of the draft steps array, reassign `order_index` by array position (0, 1, 2...) before writing to DB. On submit, use the array index as `order_index`.

### Pitfall 5: Stale Recipe Steps in Form on Re-open
**What goes wrong:** Opening a recipe for editing shows steps from the previously edited recipe.
**Why it happens:** `RecipeFormSheet` keeps local step state between open/close cycles.
**How to avoid:** Use `key={recipe?.id ?? "new"}` on the Sheet content (already specified in UI-SPEC) — forces full re-mount, clearing local state. Also: initialize draft steps from `useRecipePaints(recipe?.id)` inside the component, guarded by the `enabled` flag.

### Pitfall 6: is_active_project Toggle Not Reflected in Kanban Immediately
**What goes wrong:** Toggling a unit active from the Collection table doesn't update the Kanban board.
**Why it happens:** Both views share `UNITS_KEY` cache; if the toggle calls `useUpdateUnit` correctly with invalidation, both update. But if a component subscribes to a derived filtered array stored in Zustand (not TanStack Query), it won't re-render.
**How to avoid:** The Kanban board must derive its data from `useUnits()` (TanStack Query), not from a separate Zustand store. Only filter state (not data) goes in Zustand.

### Pitfall 7: Paint Combobox ResizeObserver in Tests
**What goes wrong:** Tests rendering the paint Combobox (Popover + Command) crash with "ResizeObserver is not defined".
**Why it happens:** jsdom doesn't implement ResizeObserver; cmdk (Command) uses it.
**How to avoid:** The `tests/setup.ts` file already polyfills ResizeObserver and `scrollIntoView` — this is handled. New test files for recipe components automatically inherit this via `setupFiles` in `vitest.config.ts`.

### Pitfall 8: DragOverlay Portal and React Context
**What goes wrong:** The `DragOverlay` renders a cloned card that loses React context (hooks, query client, router context).
**Why it happens:** DragOverlay renders in a separate DOM portal outside the component tree.
**How to avoid:** The drag overlay should render a simplified, data-only card that doesn't call hooks — pass the active unit's data as a prop to the overlay component, not as a hook call inside it.

---

## Code Examples

Verified patterns from codebase inspection:

### Deriving Kanban Columns From Units Cache
```typescript
// Source: src/types/unit.ts (PAINTING_STATUS_ORDER) + src/hooks/useUnits.ts (useUnits)
import { PAINTING_STATUS_ORDER } from "@/types/unit";
import { useUnits } from "@/hooks/useUnits";

function useKanbanColumns() {
  const { data: units = [], isLoading } = useUnits();
  const activeUnits = units.filter(u => u.is_active_project === 1);

  // Group by status
  const grouped = PAINTING_STATUS_ORDER.reduce<Record<string, typeof activeUnits>>(
    (acc, status) => {
      acc[status] = activeUnits.filter(u => u.status_painting === status);
      return acc;
    },
    {}
  );

  // Only columns with ≥1 card (CONTEXT.md decision: empty columns hidden)
  const visibleColumns = PAINTING_STATUS_ORDER.filter(
    status => grouped[status].length > 0
  );

  return { grouped, visibleColumns, isLoading };
}
```

### Optimistic is_active_project Toggle (Kanban "Remove from board")
```typescript
// Source: pattern from src/features/units/StatusPopover.tsx, adapted for is_active_project
import { useQueryClient } from "@tanstack/react-query";
import { UNITS_KEY, useUpdateUnit } from "@/hooks/useUnits";
import { toast } from "sonner";
import type { Unit } from "@/types/unit";

function useRemoveFromBoard() {
  const qc = useQueryClient();
  const updateUnit = useUpdateUnit();

  return (unit: Unit) => {
    const previous = qc.getQueryData<Unit[]>(UNITS_KEY);
    qc.setQueryData<Unit[]>(UNITS_KEY, (old) =>
      old?.map(u => u.id === unit.id ? { ...u, is_active_project: 0 as const } : u) ?? []
    );
    updateUnit.mutate(
      { id: unit.id, is_active_project: 0 },
      {
        onError: () => {
          qc.setQueryData(UNITS_KEY, previous);
          toast.error("Failed to update project status. Changes were not saved.");
        },
      }
    );
  };
}
```

### Recipe Step Draft Management
```typescript
// Local state pattern for recipe form steps
type DraftStep = {
  localId: string;          // crypto.randomUUID() — not the DB id
  step_name: string;
  paint_id: number | null;
  notes: string | null;
};

const [steps, setSteps] = useState<DraftStep[]>([]);

// Add a step
function addStep() {
  setSteps(prev => [...prev, { localId: crypto.randomUUID(), step_name: "", paint_id: null, notes: null }]);
}

// Remove a step
function removeStep(localId: string) {
  setSteps(prev => prev.filter(s => s.localId !== localId));
}

// On submit: write to DB using order_index = array index
async function saveSteps(recipeId: number) {
  // For edit mode: remove all existing steps first
  for (const existing of existingSteps) {
    await removeRecipePaint(existing.id);
  }
  // Insert in current array order
  for (let i = 0; i < steps.length; i++) {
    if (steps[i].paint_id !== null) {
      await addRecipePaint({
        recipe_id: recipeId,
        paint_id: steps[i].paint_id!,
        step_name: steps[i].step_name,
        order_index: i,
        notes: steps[i].notes,
      });
    }
  }
}
```

### Paint Combobox With Owned Dot Indicator
```typescript
// Pattern: CategoryCombobox adapted for paints (PAINT-04)
// Source: src/features/units/CategoryCombobox.tsx + src/hooks/usePaints.ts
import { usePaints } from "@/hooks/usePaints";

function PaintCombobox({ value, onChange }: { value: number | null; onChange: (id: number | null) => void }) {
  const { data: paints = [] } = usePaints();

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-full justify-between font-normal">
          {selectedPaint ? `${selectedPaint.brand} ${selectedPaint.name}` : "Search paints..."}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command shouldFilter>
          <CommandInput placeholder="Search paints..." />
          <CommandList>
            <CommandEmpty>No paints found. Add a new paint.</CommandEmpty>
            <CommandGroup>
              {paints.map(paint => (
                <CommandItem
                  key={paint.id}
                  value={`${paint.brand} ${paint.name}`}  // shouldFilter operates on this string
                  onSelect={() => { onChange(paint.id); setOpen(false); }}
                >
                  <span className={paint.owned ? "text-green-500" : "text-red-500"}>●</span>
                  <span className="ml-1">{paint.brand} {paint.name}</span>
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandGroup>
              <CommandItem onSelect={() => { setInlineCreate(true); setOpen(false); }}>
                + Add new paint
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
```

### UnitDetailSheet — Linked Recipes Section Addition
```typescript
// Add after the existing Notes section in src/features/units/UnitDetailSheet.tsx
// Source: UnitDetailSheet.tsx (verified structure) + useRecipes from src/hooks/useRecipes.ts
import { useRecipes } from "@/hooks/useRecipes";

// Inside UnitDetailSheet component body:
const { data: recipes = [] } = useRecipes();
const linkedRecipes = recipes.filter(r => r.unit_id === unit.id);

// In JSX (after Notes section, before SheetFooter):
<Separator />
<Field label="Linked Recipes">
  {linkedRecipes.length === 0 ? (
    <span className="text-xs text-muted-foreground">No recipes linked to this unit.</span>
  ) : (
    <div className="flex flex-col gap-1">
      {linkedRecipes.map(recipe => (
        <Button key={recipe.id} variant="link" size="sm" className="h-auto p-0 justify-start"
          onClick={() => navigate({ to: "/recipes", search: { recipeId: recipe.id } })}>
          {recipe.name}
        </Button>
      ))}
    </div>
  )}
</Field>
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| react-beautiful-dnd | @dnd-kit/core + @dnd-kit/sortable | 2022–present | @dnd-kit is tree-shakeable, works without legacy React context API, fully accessible |
| Drizzle / Prisma ORM | tauri-plugin-sql raw queries | Locked pre-roadmap | ORM dead-end in Tauri WebView; project uses typed query functions |
| boolean columns in SQLite | `0 | 1` integer literals in TypeScript | Phase 2 established | Prevents runtime mismatch (DB returns number, TS expects boolean) |
| zod `.default()` for form defaults | `defaultValues` in `useForm` | Phase 2 established | Zod v4 `.default()` breaks react-hook-form resolver types |

**Deprecated/outdated:**
- `react-beautiful-dnd`: unmaintained, requires React 16 context API. Do not use.
- The fixed text recipe step columns (primer, basecoat, etc.) in `painting_recipes` table: remain in DB schema but are intentionally left empty by the UI. The `recipe_paints` join table is the authoritative step store.

---

## Open Questions

1. **Recipe edit: stacked Sheet vs. close-and-reopen**
   - What we know: CONTEXT.md marks this as Claude's Discretion. Phase 2 UnitSheet uses stacked Sheet pattern.
   - What's unclear: Whether shadcn Sheet supports two open sheets (detail + edit) on the same route without z-index conflicts.
   - Recommendation: Use the stacked pattern (detail Sheet stays open, edit Sheet opens on top) — consistent with UnitDetailSheet → UnitSheet behavior in Phase 3. The UI-SPEC confirms this approach.

2. **Recipe step reorder in edit mode — when to write to DB**
   - What we know: Reorder is optimistic in the draft step list (local state). DB writes happen on form submit only.
   - What's unclear: Whether in-flight step reorders should survive if the user cancels the form.
   - Recommendation: Steps are draft state — cancelling the form discards all local step changes. No DB write on drag; only on submit.

3. **Navigation to `/recipes` with specific recipe open (unit detail "Linked Recipes" click)**
   - What we know: TanStack Router is manual route tree with no file-based routing. Search params can carry state.
   - What's unclear: Whether to use router search params (`?recipeId=N`) or local state via a context/store.
   - Recommendation: Pass `recipeId` as a URL search param (`/recipes?recipeId=N`). The RecipesPage reads this param on mount and opens the detail Sheet for that recipe. This is the most robust pattern for deep links within the app and avoids cross-component state coupling.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | vitest 4.1.5 |
| Config file | `vitest.config.ts` (root) |
| Quick run command | `pnpm test -- --run tests/painting/` |
| Full suite command | `pnpm test -- --run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PROJ-01 | Active units filter (is_active_project=1) | unit | `pnpm test -- --run -t "PROJ-01"` | ❌ Wave 0 |
| PROJ-02 | PAINTING_STATUS_ORDER column grouping | unit | `pnpm test -- --run -t "PROJ-02"` | ❌ Wave 0 |
| PROJ-07 | Sort by priority ASC then target_completion_date ASC nulls last | unit | `pnpm test -- --run -t "PROJ-07"` | ❌ Wave 0 |
| RECIPE-05 | Step reorder assigns correct order_index on submit | unit | `pnpm test -- --run -t "RECIPE-05"` | ❌ Wave 0 |
| RECIPE-06 | Owned/missing paint indicator logic | unit | `pnpm test -- --run -t "RECIPE-06"` | ❌ Wave 0 |
| PROJ-03 | KanbanCard renders name, faction badge, progress, priority | component | `pnpm test -- --run tests/painting/KanbanCard.test.tsx` | ❌ Wave 0 |
| PROJ-08 | KanbanEmptyState renders when no active units | component | `pnpm test -- --run tests/painting/KanbanBoard.test.tsx` | ❌ Wave 0 |
| RECIPE-08 | RecipeEmptyState renders when no recipes | component | `pnpm test -- --run tests/painting/RecipeTable.test.tsx` | ❌ Wave 0 |
| PAINT-04 | PaintCombobox filters by brand+name | component | `pnpm test -- --run tests/painting/PaintCombobox.test.tsx` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `pnpm test -- --run tests/painting/`
- **Per wave merge:** `pnpm test -- --run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/painting/kanbanUtils.test.ts` — covers PROJ-01, PROJ-02, PROJ-07 (pure functions: filter active, group by status, sort cards)
- [ ] `tests/painting/recipeSteps.test.ts` — covers RECIPE-05 (order_index assignment), RECIPE-06 (owned/missing logic)
- [ ] `tests/painting/KanbanCard.test.tsx` — covers PROJ-03 (card rendering)
- [ ] `tests/painting/KanbanBoard.test.tsx` — covers PROJ-08 (empty state)
- [ ] `tests/painting/RecipeTable.test.tsx` — covers RECIPE-08 (empty state)
- [ ] `tests/painting/PaintCombobox.test.tsx` — covers PAINT-04 (search filter)

---

## Sources

### Primary (HIGH confidence)
- Codebase direct inspection — `src/features/units/StatusPopover.tsx`: optimistic mutation pattern (snapshot → setQueryData → mutate → onError rollback)
- Codebase direct inspection — `src/types/unit.ts`: `PAINTING_STATUS_ORDER` constant, `Unit` interface, `0|1` boolean pattern
- Codebase direct inspection — `src/db/queries/recipePaints.ts`: immutability decision confirmed ("No updateRecipePaint")
- Codebase direct inspection — `src/hooks/useRecipes.ts`, `useRecipePaints.ts`, `usePaints.ts`: all hooks already built
- Codebase direct inspection — `src/features/units/CategoryCombobox.tsx`: exact Popover+Command pattern for paint combobox
- Codebase direct inspection — `src/features/units/UnitDetailSheet.tsx`: existing Sheet structure for Linked Recipes section addition
- Codebase direct inspection — `tests/setup.ts`: ResizeObserver + scrollIntoView polyfills already present
- `npm view @dnd-kit/core version` → 6.3.1 (verified 2026-05-01)
- `npm view @dnd-kit/sortable version` → 10.0.0 (verified 2026-05-01)
- `npm view @dnd-kit/utilities version` → 3.2.2 (verified 2026-05-01)
- `.planning/phases/04-painting-module/04-CONTEXT.md`: all locked decisions and discretion areas
- `.planning/phases/04-painting-module/04-UI-SPEC.md`: complete interaction contracts, component inventory, copywriting

### Secondary (MEDIUM confidence)
- `.planning/STATE.md` accumulated decisions: `0|1` boolean pattern, no zod `.default()`, RecipePaint immutability, @dnd-kit lock-in
- `package.json`: confirmed all existing dependencies and versions

### Tertiary (LOW confidence)
- None — all critical claims verified directly from codebase or npm registry

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — verified via package.json and npm registry directly
- Architecture: HIGH — patterns copied from verified, working Phase 3 code (StatusPopover, CategoryCombobox, UnitDetailSheet)
- Pitfalls: HIGH — items 1–6 sourced from codebase evidence (STATE.md decisions, existing setup.ts polyfills, established patterns)
- @dnd-kit specifics: MEDIUM — based on package analysis; actual API usage should be validated against @dnd-kit docs during implementation

**Research date:** 2026-05-01
**Valid until:** 2026-06-01 (stable libraries; @dnd-kit API unlikely to break at these versions)
