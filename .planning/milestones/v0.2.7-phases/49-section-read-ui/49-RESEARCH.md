# Phase 49: Section Read UI - Research

**Researched:** 2026-05-08
**Domain:** React component architecture — sectioned timeline display, per-section availability computation, backward-compatible flat fallback
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Section header layout**
- Section headers render as distinct rows in the timeline, visually above their child steps
- Each header shows: section name (text), surface badge (if set), step count, estimated total time (sum of child step time_estimate_minutes), and per-section owned/missing paint count
- Time is computed by summing time_estimate_minutes across all steps in the section — null values excluded from sum, display hidden when all steps have null time
- Per-section availability follows the "N owned, N missing" format with colored dots, matching the existing AvailabilityBadge pattern from RecipeCard

**Section visual grouping**
- Sections render as indented groups under their header row — child steps continue the existing timeline dot+line pattern underneath each section header
- Sections are NOT collapsible in the detail view — always expanded (collapsibility belongs to Phase 50 form UI)
- Visual separation between sections via spacing/gap, no hard borders or card wrappers — keeps the timeline feel continuous

**Optional section display**
- Optional sections show a small "Optional" Badge (variant="outline") on the section header row
- No other visual differentiation

**Flat fallback behavior**
- If useRecipeSections returns an empty array (or recipe has no sections), render the existing RecipeStepTimeline unchanged with no section headers
- The conditional check happens in RecipeDetailSheet — either the sectioned timeline or the flat timeline renders, not both
- Zero UI regression for pre-section recipes

### Claude's Discretion
- Exact section header typography and spacing (font size, weight, gap between header and first step)
- Whether section header uses a different timeline node style (e.g., larger dot, different color) or no node at all
- Component decomposition — whether SectionedTimeline is a new component or integrated into RecipeStepTimeline
- How to compute per-section availability — inline useMemo or separate helper function

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| VIEW-01 | User sees recipe detail as a workflow timeline grouped by section headers | SectionedTimeline component groups steps by section_id; conditional branch in RecipeDetailSheet |
| VIEW-02 | User sees section name, surface badge, step count, and estimated time in each section header | Computed from sections array + grouped steps; surface/optional from RecipeSection type; time sum via useMemo |
| VIEW-03 | User sees per-section owned/missing paint summary in section headers | Per-section AvailabilityStats computed by filtering steps by section_id then applying isPaintMissing; reuses AvailabilityBadge visual pattern |
| VIEW-04 | User's recipes without sections render with existing flat timeline (backward compat) | sections.length === 0 guard in RecipeDetailSheet; existing RecipeStepTimeline unchanged |
</phase_requirements>

---

## Summary

Phase 49 is a pure UI composition phase. The data layer (Phase 48) is complete and provides all the hooks and types needed. The core work is: (1) adding `useRecipeSections(recipe?.id)` alongside the existing `useRecipePaints` call in `RecipeDetailSheet`, (2) writing a new `SectionedTimeline` component that groups steps by `section_id` and renders a section header row above each group, and (3) wiring a conditional branch so that `sections.length > 0` renders the sectioned view while the empty case falls through to the existing `RecipeStepTimeline` unchanged.

All building blocks are already in the codebase: the `RecipeSection` type with `name/surface/optional/order_index`, the `RecipeStep` type with `section_id`, the `useRecipeSections` hook, the `AvailabilityBadge` visual pattern in `RecipeCard.tsx`, the `isPaintMissing` helper in `recipeSteps.ts`, and the Tailwind CSS timeline patterns used in `RecipeStepTimeline`. Per-section availability is a `useMemo` over the already-fetched `steps` array — no additional DB query needed.

**Primary recommendation:** Create `SectionedTimeline.tsx` as a standalone component (not integrated into `RecipeStepTimeline`) to keep the flat fallback path zero-change. All per-section data is derived client-side from the two existing queries.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 19 | Component rendering + useMemo for derived state | Project standard |
| shadcn/ui Badge | latest | Surface badge, Optional badge, step count | Already used throughout recipe UI |
| Lucide React | latest | Clock icon for time estimate, Layers icon for step count | Already used in RecipeCard and RecipeStepTimeline |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @tanstack/react-query | latest | useRecipeSections query (already in RecipeDetailSheet) | Fetching section list per recipe |

No new npm packages are required for this phase.

---

## Architecture Patterns

### Recommended Project Structure

New file to create:
```
src/features/recipes/
├── SectionedTimeline.tsx     # NEW — section header rows + grouped step rows
├── RecipeStepTimeline.tsx    # UNCHANGED — flat fallback (not modified)
├── RecipeDetailSheet.tsx     # MODIFIED — adds useRecipeSections, conditional branch
└── recipeSteps.ts            # UNCHANGED — isPaintMissing reused in SectionedTimeline
```

New test file:
```
tests/painting/
└── sectionedTimeline.test.tsx   # VIEW-01 through VIEW-04 component tests
```

### Pattern 1: Conditional Branch in RecipeDetailSheet

The existing `<RecipeStepTimeline>` render at line 264 becomes a conditional:

```typescript
// RecipeDetailSheet.tsx — add alongside useRecipePaints call (line 56)
const { data: sections = [] } = useRecipeSections(recipe?.id);

// At line 264, replace:
<RecipeStepTimeline steps={steps} paintMap={paintMap} stepPhotoUrls={stepPhotoUrls} />

// With:
{sections.length > 0 ? (
  <SectionedTimeline
    sections={sections}
    steps={steps}
    paintMap={paintMap}
    stepPhotoUrls={stepPhotoUrls}
  />
) : (
  <RecipeStepTimeline steps={steps} paintMap={paintMap} stepPhotoUrls={stepPhotoUrls} />
)}
```

The `useRecipeSections` hook is already exported from `src/hooks/useRecipeSections.ts`. No new hook work needed.

### Pattern 2: SectionedTimeline Component Structure

```typescript
// src/features/recipes/SectionedTimeline.tsx
import { useMemo } from "react";
import type { RecipeSection } from "@/types/recipeSection";
import type { RecipeStep } from "@/types/recipePaint";
import type { Paint } from "@/types/paint";
import { Badge } from "@/components/ui/badge";
import { Clock, Layers } from "lucide-react";
import { RecipeStepTimeline } from "./RecipeStepTimeline";
import { isPaintMissing } from "./recipeSteps";

interface SectionedTimelineProps {
  sections: RecipeSection[];
  steps: RecipeStep[];
  paintMap: Map<number, Paint>;
  stepPhotoUrls?: Map<number, string>;
}

export function SectionedTimeline({ sections, steps, paintMap, stepPhotoUrls }: SectionedTimelineProps) {
  // Group steps by section_id
  const stepsBySection = useMemo(() => {
    const m = new Map<number, RecipeStep[]>();
    for (const s of steps) {
      if (s.section_id !== null) {
        const list = m.get(s.section_id) ?? [];
        list.push(s);
        m.set(s.section_id, list);
      }
    }
    return m;
  }, [steps]);

  return (
    <div className="flex flex-col gap-4" data-testid="sectioned-timeline">
      {sections.map((section) => {
        const sectionSteps = stepsBySection.get(section.id) ?? [];
        // ... render section header + RecipeStepTimeline for sectionSteps
      })}
    </div>
  );
}
```

### Pattern 3: Per-Section Availability Computation

Derived entirely from the already-fetched `steps` array and `paintMap` — no additional DB query. Compute as a `useMemo` inside `SectionedTimeline`:

```typescript
// Per-section availability: group steps by section_id, check isPaintMissing per paint
const sectionAvailability = useMemo(() => {
  const m = new Map<number, { owned: number; missing: number }>();
  for (const step of steps) {
    if (step.section_id === null || step.paint_id === 0) continue;
    const paint = paintMap.get(step.paint_id);
    const current = m.get(step.section_id) ?? { owned: 0, missing: 0 };
    if (isPaintMissing(paint)) {
      m.set(step.section_id, { ...current, missing: current.missing + 1 });
    } else {
      m.set(step.section_id, { ...current, owned: current.owned + 1 });
    }
  }
  return m;
}, [steps, paintMap]);
```

Note: The CONTEXT.md specifies "N owned, N missing" format (not the full 3-state owned/runningLow/missing of `AvailabilityBadge`). Use a simplified inline display or a reduced version of `AvailabilityBadge`.

### Pattern 4: Section Header Row

```typescript
// Inside SectionedTimeline, per section:
function SectionHeader({ section, stepCount, totalMinutes, availability }: ...) {
  return (
    <div className="flex items-center gap-2 pb-1" data-testid="section-header">
      <span className="text-sm font-semibold">{section.name}</span>
      {section.surface && (
        <Badge variant="outline" className="text-xs">{section.surface}</Badge>
      )}
      {section.optional === 1 && (
        <Badge variant="outline" className="text-xs">Optional</Badge>
      )}
      <span className="text-xs text-muted-foreground ml-auto flex items-center gap-2">
        <span className="flex items-center gap-0.5">
          <Layers className="h-3 w-3" />
          {stepCount} {stepCount === 1 ? "step" : "steps"}
        </span>
        {totalMinutes !== null && (
          <span className="flex items-center gap-0.5">
            <Clock className="h-3 w-3" />
            {totalMinutes} min
          </span>
        )}
        {/* availability dots */}
      </span>
    </div>
  );
}
```

### Pattern 5: Time Sum Computation

```typescript
// Inside SectionedTimeline, computed per section from sectionSteps:
const totalMinutes = sectionSteps.every((s) => s.time_estimate_minutes === null)
  ? null  // hide when all null
  : sectionSteps.reduce((sum, s) => sum + (s.time_estimate_minutes ?? 0), 0);
```

### Anti-Patterns to Avoid

- **Modifying RecipeStepTimeline:** The flat fallback MUST remain zero-change. All sectioned logic goes in `SectionedTimeline.tsx`. Do not add a `sections` prop to `RecipeStepTimeline`.
- **Calling useSectionStepCounts inside SectionedTimeline:** The batch hook returns global counts across all recipes. For the detail view, derive step counts from the already-fetched `steps` array via `stepsBySection.get(section.id)?.length ?? 0`. This avoids an unnecessary query.
- **Duplicate hook calls:** `useRecipePaints` is already called in `RecipeDetailSheet` at line 56. Pass the `steps` result down as a prop to `SectionedTimeline` — do not call `useRecipePaints` again inside the new component.
- **Section_id null steps in sectioned view:** Steps with `section_id === null` are auto-migrated (migration 018 ensures all existing steps have a section_id). But defensive coding should skip nulls in `stepsBySection` grouping to avoid silent rendering bugs.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Paint availability check | Custom owned/missing logic | `isPaintMissing(paint)` from `recipeSteps.ts` | Already handles `owned !== 1` edge cases correctly |
| Section badge | Custom pill component | shadcn/ui `Badge` with `variant="outline"` | Matches existing surface/optional badge patterns throughout the app |
| Time display | Custom time formatter | Inline `{totalMinutes} min` | Same pattern as RecipeCard and RecipeStepTimeline already use |
| Step-in-section rendering | New step row component | Pass section steps to existing `RecipeStepTimeline` | RecipeStepTimeline already handles all step display logic, photos, paint indicators |

**Key insight:** `SectionedTimeline` is a structural wrapper — it adds section header rows and delegates step rendering to the existing `RecipeStepTimeline` component. The only new UI element is the section header row itself.

---

## Common Pitfalls

### Pitfall 1: makeStep fixture missing section_id in test file

**What goes wrong:** The existing `makeStep` helper in `tests/painting/recipeDetailSheet.test.tsx` does not include `section_id` in the returned object, because it predates Phase 48. New tests for the sectioned timeline will need steps with explicit `section_id` values.

**Why it happens:** `RecipeStep` type gained `section_id: number | null` in Phase 48 but the test fixture was not updated.

**How to avoid:** In `tests/painting/sectionedTimeline.test.tsx`, define a new `makeStep` factory that includes `section_id`. Do not modify `recipeDetailSheet.test.tsx`.

**Warning signs:** TypeScript strict mode will flag missing fields if `makeStep` is typed correctly — catch at compile time via `pnpm build`.

### Pitfall 2: Passing `steps` to RecipeStepTimeline inside SectionedTimeline — last step line

**What goes wrong:** `RecipeStepTimeline` hides the connecting line for `isLast = i === steps.length - 1`. When called with a section's subset of steps, the last step in the section will not show a connecting line — which is correct behavior since the next section header provides visual separation. This is intentional but easy to forget when debugging visual gaps.

**Why it happens:** The "last step" check is relative to the `steps` prop array, not the full recipe steps list.

**How to avoid:** Accept this behavior as correct. Document it in the component comment. The gap between sections uses the parent `gap-4` on the outer container, not the connecting line.

### Pitfall 3: RecipeDetailSheet useRecipeSections import causes flicker

**What goes wrong:** `useRecipeSections` is disabled when `recipeId` is `undefined`. When the Sheet opens, `recipe` is set to a valid object immediately. If `useRecipeSections` returns `{ data: undefined }` on the first render (before query resolves), and the code defaults to `sections = []`, the flat fallback renders briefly before the sectioned view appears.

**Why it happens:** React Query staleTime is 5 minutes — on second open of the same recipe, data is served from cache instantly. On first open, there's a brief loading state.

**How to avoid:** Use `isLoading` guard: only switch to the sectioned path when `sections.length > 0 && !sectionsLoading`. Alternatively, keep the flat fallback rendering during loading and switch to sectioned once data is ready — this avoids a jarring layout shift since the sections share the same step rows.

### Pitfall 4: step_photo_path resolution scope

**What goes wrong:** `stepPhotoUrls` Map is built in `RecipeDetailSheet` from `steps.filter((s) => s.step_photo_path)`. When passing `stepPhotoUrls` to `SectionedTimeline`, which then passes the same map to `RecipeStepTimeline` per section, the URLs are resolved globally. This is correct and needs no change.

**Why it happens:** The Map keys are `step.id` (globally unique), so filtering steps by section before passing them to `RecipeStepTimeline` does not break photo URL lookup.

**How to avoid:** No action needed — just pass the full `stepPhotoUrls` map unchanged to each `RecipeStepTimeline` instance.

---

## Code Examples

### SectionedTimeline full prop interface

```typescript
// Source: derived from existing RecipeStepTimelineProps + RecipeSection type
export interface SectionedTimelineProps {
  sections: RecipeSection[];   // ordered by order_index ASC (from useRecipeSections)
  steps: RecipeStep[];         // all steps for the recipe (from useRecipePaints)
  paintMap: Map<number, Paint>;
  stepPhotoUrls?: Map<number, string>;
}
```

### Conditional branch in RecipeDetailSheet

```typescript
// Source: existing RecipeDetailSheet.tsx line 56 pattern + useRecipeSections hook
const { data: sections = [], isLoading: sectionsLoading } = useRecipeSections(recipe?.id);

// At line 264:
<Field label="Recipe Steps">
  {sections.length > 0 && !sectionsLoading ? (
    <SectionedTimeline
      sections={sections}
      steps={steps}
      paintMap={paintMap}
      stepPhotoUrls={stepPhotoUrls}
    />
  ) : (
    <RecipeStepTimeline
      steps={steps}
      paintMap={paintMap}
      stepPhotoUrls={stepPhotoUrls}
    />
  )}
</Field>
```

### isPaintMissing reuse for per-section availability

```typescript
// Source: src/features/recipes/recipeSteps.ts
// isPaintMissing(paint: Paint | undefined | null): boolean — returns true when owned !== 1
// Use directly for counting owned vs missing paints per section
const sectionStats = sectionSteps.reduce(
  (acc, step) => {
    if (step.paint_id === 0) return acc;
    const paint = paintMap.get(step.paint_id);
    if (isPaintMissing(paint)) acc.missing++;
    else acc.owned++;
    return acc;
  },
  { owned: 0, missing: 0 }
);
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Flat step list in RecipeDetailSheet | Sectioned timeline with header rows | Phase 49 | Section grouping visible in detail view |
| No section_id on steps | steps.section_id links each step to a section | Phase 48 | Enables client-side grouping without extra query |
| Single RecipeStepTimeline render | Conditional: SectionedTimeline or RecipeStepTimeline | Phase 49 | Backward-compatible branch |

---

## Open Questions

1. **Should steps with section_id === null appear in the sectioned view?**
   - What we know: Migration 018 auto-assigns all existing steps to a default "Steps" section. New steps created via current form pass `section_id: null` (Phase 48 decision, to be fixed in Phase 50).
   - What's unclear: If a step somehow ends up with `section_id: null` in a recipe that has sections (e.g., via direct DB edit), it would be invisible in the sectioned view.
   - Recommendation: Defensive handling — collect `section_id === null` steps and render them in an "Unsectioned" group at the bottom, or simply skip them. Given the migration guarantees, this is low risk. The planner should make the call; a simple `filter` skip is safest for Phase 49.

2. **AvailabilityBadge: two-state (owned/missing) vs three-state (owned/runningLow/missing)?**
   - What we know: CONTEXT.md specifies "N owned, N missing" format. `AvailabilityBadge` in `RecipeCard.tsx` already handles three-state.
   - What's unclear: Whether running-low paints are counted as "owned" or separated in the section header.
   - Recommendation: For Phase 49, use the simpler two-state (owned = not-missing, missing = `isPaintMissing` returns true). `isPaintMissing` treats `owned !== 1` as missing — running-low paints with `owned === 1` will count as owned. This matches CONTEXT.md's stated format.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4 + React Testing Library 16 |
| Config file | `vite.config.ts` (vitest inline config) |
| Quick run command | `pnpm test -- tests/painting/sectionedTimeline.test.tsx` |
| Full suite command | `pnpm test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| VIEW-01 | Recipe with sections renders `[data-testid="sectioned-timeline"]` | unit | `pnpm test -- tests/painting/sectionedTimeline.test.tsx` | Wave 0 |
| VIEW-01 | Section headers appear above their child steps in DOM order | unit | `pnpm test -- tests/painting/sectionedTimeline.test.tsx` | Wave 0 |
| VIEW-02 | Section header displays name, surface badge, step count, and time sum | unit | `pnpm test -- tests/painting/sectionedTimeline.test.tsx` | Wave 0 |
| VIEW-02 | Time display hidden when all steps in section have null time_estimate_minutes | unit | `pnpm test -- tests/painting/sectionedTimeline.test.tsx` | Wave 0 |
| VIEW-02 | Optional section shows "Optional" Badge | unit | `pnpm test -- tests/painting/sectionedTimeline.test.tsx` | Wave 0 |
| VIEW-03 | Section header shows owned and missing paint counts | unit | `pnpm test -- tests/painting/sectionedTimeline.test.tsx` | Wave 0 |
| VIEW-04 | Recipe with no sections renders `[data-testid="step-timeline"]` (flat fallback) | unit | `pnpm test -- tests/painting/sectionedTimeline.test.tsx` | Wave 0 |
| VIEW-04 | Existing `RecipeDetailSheet` tests still pass (no regression) | regression | `pnpm test -- tests/painting/recipeDetailSheet.test.tsx` | Exists |

### Sampling Rate
- **Per task commit:** `pnpm test -- tests/painting/sectionedTimeline.test.tsx`
- **Per wave merge:** `pnpm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/painting/sectionedTimeline.test.tsx` — covers VIEW-01 through VIEW-04 (SectionedTimeline component + RecipeDetailSheet branch)
- [ ] Note: `tests/painting/recipeDetailSheet.test.tsx` already exists and covers VIEW-04 implicitly once the hook mock for `useRecipeSections` is added

*(Note: The existing `tests/painting/recipeDetailSheet.test.tsx` will require one mock addition — `vi.mock("@/hooks/useRecipeSections", ...)` returning `{ data: [] }` — to ensure the flat fallback tests continue to pass after `useRecipeSections` is called in `RecipeDetailSheet`.)*

---

## Sources

### Primary (HIGH confidence)
- `src/features/recipes/RecipeStepTimeline.tsx` — timeline dot/line/node patterns, step content structure
- `src/features/recipes/RecipeCard.tsx` — AvailabilityBadge component and pattern
- `src/features/recipes/RecipeDetailSheet.tsx` — integration points (line 56, line 264)
- `src/hooks/useRecipeSections.ts` — hook API, RECIPE_SECTIONS_KEY
- `src/hooks/useRecipePaints.ts` — steps hook already used in RecipeDetailSheet
- `src/types/recipeSection.ts` — RecipeSection interface (name, surface, optional, order_index)
- `src/types/recipePaint.ts` — RecipeStep interface (section_id: number | null)
- `src/features/recipes/recipeSteps.ts` — isPaintMissing helper
- `tests/painting/recipeDetailSheet.test.tsx` — existing test patterns, mock setup, fixture factories

### Secondary (MEDIUM confidence)
- `.planning/phases/49-section-read-ui/49-CONTEXT.md` — locked decisions on layout, grouping, fallback behavior
- `.planning/phases/48-section-data-layer/48-CONTEXT.md` — data layer contract, cascade rules

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already in use, no new dependencies
- Architecture: HIGH — built from direct code inspection of all integration points
- Pitfalls: HIGH — derived from reading actual existing code paths, not speculation

**Research date:** 2026-05-08
**Valid until:** 2026-06-08 (stable stack — no fast-moving dependencies)
