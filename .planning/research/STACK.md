# Stack Research

**Domain:** Hierarchical recipe sections — nested sortable containers with collapsible UI
**Researched:** 2026-05-08
**Confidence:** HIGH

---

## Summary Answer

No new packages are needed. The existing `@dnd-kit/core 6.3.1` + `@dnd-kit/sortable 10.0.0`
stack fully supports the two-level nested sortable pattern required (sections sortable, steps
sortable within sections). The Radix-based `Collapsible` component is already installed and
already used in the codebase. The manual array state pattern for form draft management (already
chosen over `useFieldArray` in v2.5) extends naturally to two levels.

---

## Recommended Stack

### Core Technologies (all already installed)

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| @dnd-kit/core | 6.3.1 | DnD event context, sensors, collision detection | Already used; single `DndContext` wraps section-level and step-level `SortableContext` instances independently |
| @dnd-kit/sortable | 10.0.0 | `SortableContext` + `useSortable` for both levels | Supports nested `SortableContext` providers; both sections and steps use `useSortable` — confirmed in official docs |
| @dnd-kit/utilities | 3.2.2 | `arrayMove`, `CSS.Transform.toString` | Used in existing step reorder; unchanged |
| shadcn/ui Collapsible | radix-ui 1.4.3 | Section collapse/expand toggle | Already installed at `src/components/ui/collapsible.tsx`; already used in `LoadoutSection`, `PlaybookTab`, `BattleLogRow` — no install needed |
| React Hook Form | 7.74.x | Recipe-level fields only (name, faction, unit, etc.) | Sections and steps stay as manual `useState` arrays — same decision as v2.5 (avoids RHF #10607 id collision) |
| Zod | 4.4.x | Recipe field validation only | No change; section names validated inline, not via RHF schema |

### Supporting Libraries (no new additions)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| React `useState` | 19.x | Draft sections array (`DraftSection[]`) | Top-level in `RecipeFormSheet` — same pattern as current `DraftStep[]`, extended one level |
| `crypto.randomUUID()` | browser built-in | `localId` for draft sections and steps | Stable globally unique IDs for DnD and React keys — same as current step pattern |

---

## Installation

No new packages to install. All required capabilities are present in the current lockfile.

---

## The Nested DnD Pattern in Detail

### How @dnd-kit handles nested sortable containers

`@dnd-kit/sortable` explicitly supports nesting multiple `SortableContext` instances. The
official documentation states: "You may nest multiple SortableContext providers within the same
parent DndContext provider, and you may also nest SortableContext providers within other
SortableContext providers, either all under the same DndContext provider or each with their own
individual DndContext providers."

### Architecture for this milestone

The v0.2.7 milestone explicitly marks "moving steps between sections via drag-and-drop" as **out
of scope**. This means sections only sort against other sections, and steps only sort within their
own section. This simplifies the architecture: use two separate `DndContext` layers rather than
one shared context with cross-container type detection.

```tsx
// RecipeSectionList: outer DndContext handles section reorder
<DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleSectionDragEnd}>
  <SortableContext items={sections.map(s => s.localId)} strategy={verticalListSortingStrategy}>
    {sections.map(section => (
      // Each section card is itself sortable (useSortable on the card header/drag handle)
      <RecipeSectionCard key={section.localId} section={section} ...>

        {/* Inner DndContext: step reorder scoped to this section */}
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleStepDragEnd(section.localId)}>
          <SortableContext items={section.steps.map(s => s.localId)} strategy={verticalListSortingStrategy}>
            {section.steps.map(step => (
              <RecipeStepRow key={step.localId} step={step} ... />
            ))}
          </SortableContext>
        </DndContext>

      </RecipeSectionCard>
    ))}
  </SortableContext>
</DndContext>
```

### Why two separate DndContexts (not one shared)

A single `DndContext` with type-based `onDragOver` is the pattern for cross-container item moves
(Trello-style). It requires: a `type` discriminator on every draggable, a `findContainer` helper,
`onDragOver` that rewrites the items array mid-drag, and a `DragOverlay` that renders different
content depending on active type. This is 80+ additional lines of stateful logic.

Since steps cannot move between sections in v1, this complexity adds zero value. Two nested
`DndContext` instances gives clean isolation — section drag events never interfere with step drag
events and vice versa.

**Future upgrade path:** If cross-section step movement is added in v0.2.8+, the upgrade is:
collapse to a single outer `DndContext`, add `data: { type: "section" | "step", sectionId }` to
`useSortable` calls, implement `onDragOver` with type discrimination, and a `findContainer`
helper. That is a contained refactor of `RecipeSectionList`, nothing else.

### ID uniqueness requirement

Each `localId` must be globally unique across all sections AND all steps within a single form
session. `crypto.randomUUID()` guarantees this. Never reuse a section `localId` as a step
`localId`.

---

## Form State Pattern

### DraftSection extends the existing DraftStep pattern

```ts
// New type in src/features/recipes/recipeSteps.ts (or new recipeSection.ts)
export interface DraftSection {
  localId: string;        // crypto.randomUUID()
  name: string;
  surface: string | null;
  optional: boolean;
  notes: string | null;
  steps: DraftStep[];     // existing type, completely unchanged
}

export function makeDraftSection(name = "General"): DraftSection {
  return {
    localId: crypto.randomUUID(),
    name,
    surface: null,
    optional: false,
    notes: null,
    steps: [],
  };
}
```

`RecipeFormSheet` currently holds `useState<DraftStep[]>`. This becomes
`useState<DraftSection[]>`. React Hook Form continues to manage only the recipe-level
fields (name, faction_id, unit_id, area, style, surface, effect, difficulty, etc.) — the
RHF boundary does not change.

### Why NOT useFieldArray for sections or steps

The existing codebase already documents this decision (CLAUDE.md key decisions, v2.5):

> "useFieldArray NOT used for step forms — Documented ID collision with @dnd-kit useSortable (RHF #10607)"

RHF's `useFieldArray` generates its own internal IDs (`id` field) for array items. When
`useSortable` also assigns a draggable ID to those same items, you must choose between using
the RHF-generated `id` (which changes on every mutation) or a separate stable `localId`. Using
the RHF ID as the DnD ID causes stale-reference bugs after reorder. The fix used in v2.5 —
manual `useState` with `localId: crypto.randomUUID()` — avoids the problem entirely and is
already battle-tested across all step operations. Extend the same pattern one level up.

Nested `useFieldArray` (sections containing step field arrays) is technically possible but
adds significant RHF complexity (`useFieldArray({ name: \`sections.${i}.steps\` as 'sections.0.steps' })`)
for zero benefit when manual state works and is already established.

---

## Collapsible Section Cards

### Already available — no installation needed

`src/components/ui/collapsible.tsx` wraps `radix-ui` `CollapsiblePrimitive`. It is already
used in three components:

- `src/features/units/LoadoutSection.tsx` — collapsible loadout editing (most similar to section cards)
- `src/features/units/PlaybookTab.tsx`
- `src/features/battle-log/BattleLogRow.tsx`

### Usage pattern for RecipeSectionCard

```tsx
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";

<Collapsible open={isOpen} onOpenChange={setIsOpen}>
  <div className="flex items-center gap-2">
    {/* Drag handle — receives useSortable listeners/attributes, NOT inside CollapsibleTrigger */}
    <GripVertical className="h-4 w-4 cursor-grab text-muted-foreground" {...listeners} {...attributes} />

    <CollapsibleTrigger asChild>
      <button className="flex flex-1 items-center gap-2 text-left">
        {/* section name, surface badge, step count, optional badge */}
        <ChevronDown className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")} />
      </button>
    </CollapsibleTrigger>
  </div>

  <CollapsibleContent>
    {/* inner DndContext + SortableContext for steps */}
    {/* + Add Step button */}
  </CollapsibleContent>
</Collapsible>
```

Radix Collapsible handles `aria-expanded`, keyboard (Space/Enter), and `data-state="open|closed"`
for CSS transition animations. No accessibility work needed beyond what Radix provides.

### Drag handle + collapsible trigger coexistence

The section card header contains two distinct interaction zones:

1. **Drag handle** — a dedicated grip icon (`GripVertical` from lucide-react) wired to
   `useSortable`'s `listeners` and `attributes`
2. **Collapse toggle** — `CollapsibleTrigger` covering the rest of the header

The drag handle must NOT be inside `CollapsibleTrigger` or the click-to-collapse action
will fire on every drag start. This is the same approach used in `LoadoutSection.tsx`.

---

## Alternatives Considered

| Recommended | Alternative | Why Not |
|-------------|-------------|---------|
| Two separate `DndContext` (outer: sections, inner per-section: steps) | Single `DndContext` with type-based `onDragOver` | Cross-section step moves are out of scope for v1; single context adds 80+ lines of type-detection logic with no v1 benefit. Simpler two-context approach has zero known pitfalls for same-container sorting. |
| Manual `useState<DraftSection[]>` | Nested `useFieldArray` for sections + steps | RHF #10607 ID collision; manual array already proven across all step operations in v2.5; nested useFieldArray requires casting hacks |
| Existing `Collapsible` (radix-ui) | Custom accordion, `<details>/<summary>` HTML | Already installed and used; provides ARIA/keyboard for free; consistent with project component library |
| `DragOverlay` on section cards | No overlay | Prevents ghost element during section drag; `DragOverlay` already used in `KanbanBoard.tsx` — extend same pattern |
| Separate `DndContext` per section for step sorting | Shared inner `SortableContext` per section under outer `DndContext` | With two separate `DndContext` layers, the sensors and collision detection can be configured independently per level |

---

## What NOT to Add

| Avoid | Why |
|-------|-----|
| `@dnd-kit/modifiers` | Not needed for simple vertical list sorting; no axis-locking or viewport-constraint requirements |
| `react-beautiful-dnd` | Deprecated and unmaintained; `@dnd-kit` is the current standard and already installed |
| shadcn `Accordion` | Accordion enforces XOR open (at most one section expanded). Recipe sections need independent collapse — each section can be open or closed independently. Use `Collapsible`. |
| Cross-section step DnD in v1 | Milestone spec explicitly out of scope; adds `onDragOver` type-detection, `findContainer` helpers, and mid-drag state rebalancing |
| `useFieldArray` for sections | Nested useFieldArray + DnD ID mismatch is a known documented bug in the project (RHF #10607); manual state is the project standard |

---

## Version Compatibility

| Package | Version | Compat Note |
|---------|---------|-------------|
| @dnd-kit/core | 6.3.1 | Pairs with @dnd-kit/sortable 10.0.0; sortable 10.0.0 released as patch against core 6.3.0, no breaking changes |
| @dnd-kit/sortable | 10.0.0 | Nested `SortableContext` confirmed supported in official docs and community patterns (dnd-kit discussions #821, #809) |
| radix-ui (Collapsible) | 1.4.3 | Already installed as `radix-ui` umbrella; `CollapsiblePrimitive` accessible via `import { Collapsible as CollapsiblePrimitive } from "radix-ui"` |
| react-hook-form | 7.74.x | Only used for recipe-level fields; sections and steps bypass RHF entirely via manual state |

---

## Sources

- [dnd-kit Sortable Context official docs](https://dndkit.com/presets/sortable/sortable-context) — nesting multiple SortableContext confirmed supported — HIGH confidence
- [dnd-kit Nested Multiple Containers discussion #821](https://github.com/clauderic/dnd-kit/discussions/821) — type-based drag differentiation pattern for cross-container moves — MEDIUM confidence
- [dnd-kit Complex Interactions discussion #809](https://github.com/clauderic/dnd-kit/discussions/809) — single DndContext production pattern for page builder with sections/rows/columns — MEDIUM confidence
- [dnd-kit issue #735](https://github.com/clauderic/dnd-kit/issues/735) — known animation/loop issues when items cross container boundaries mid-drag (avoided by two-DndContext approach) — HIGH confidence
- [RHF discussion #10607](https://github.com/orgs/react-hook-form/discussions/10607) — useFieldArray + useSortable ID collision, existing CLAUDE.md decision confirmed — HIGH confidence
- [shadcn/ui Collapsible docs](https://ui.shadcn.com/docs/components/radix/collapsible) — Radix-based, keyboard/ARIA included — HIGH confidence
- [@dnd-kit/sortable CHANGELOG](https://github.com/clauderic/dnd-kit/blob/master/packages/sortable/CHANGELOG.md) — v10.0.0 is patch-only against core 6.3.0, no breaking changes — HIGH confidence
- `src/components/ui/collapsible.tsx` — Collapsible already installed and wired — HIGH confidence (code-verified)
- `src/features/recipes/RecipeStepList.tsx` — existing DnD pattern for step reorder — HIGH confidence (code-verified)
- `src/features/painting-projects/KanbanBoard.tsx` — DragOverlay pattern already in use — HIGH confidence (code-verified)
- `package.json` — all package versions confirmed — HIGH confidence (code-verified)

---

*Stack research for: HobbyForge v0.2.7 — Hierarchical Painting Workflows*
*Researched: 2026-05-08*
