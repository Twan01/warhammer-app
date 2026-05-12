# Phase 60: Kanban & CurrentFocus Integration - Research

**Researched:** 2026-05-12
**Domain:** React component enrichment, pure function derivation, SQLite batch queries
**Confidence:** HIGH

## Summary

Phase 60 adds section-aware workflow context to two existing UI components (KanbanCard and CurrentFocusCard) by deriving a user's current position in a multi-section recipe from their last logged painting session. The implementation follows an established batch-enrichment pattern already proven in `useKanbanEnrichment` and `useLatestUnitPhotos`.

The core deliverable is a pure function `computeWorkflowPosition` that takes a session's step/section data and the recipe's section/step structure, then returns a position object describing where the user is in the workflow. A React Query hook `useWorkflowPositions` wraps this function with data fetching, building a `Map<unitId, WorkflowPosition>` at the page level -- identical to the existing enrichment architecture.

**Primary recommendation:** Build the pure function first with comprehensive unit tests, then the batch hook, then integrate into cards. All data queries already exist -- no new query layer needed.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- D-01: Pure function `computeWorkflowPosition(lastSessionStepId, sections, steps)` returns `{ sectionName, sectionIndex, totalSections, stepName, stepIndex, totalSteps }` or null
- D-02: Position derived from last logged session's `recipe_step_id` -- find section containing that step
- D-03: "Next step" is stepIndex + 1 within section, or first step of next section at section end
- D-04: When last session has no `recipe_step_id` but has `section_name`, show section-level position only
- D-05: When last session has neither, return null -- card falls back to existing hints
- D-06: KanbanCard shows compact inline `"SectionName: NextStepName"` below recipe name
- D-07: CurrentFocusCard shows full format `"SectionName: Technique -- step N/M"`
- D-08: Step count is `step N/M` (1-based within section)
- D-09: Fully completed recipe shows "Complete" indicator
- D-10: Batch at page level following useKanbanEnrichment/useLatestUnitPhotos pattern
- D-11: New hook `useWorkflowPositions(unitIds)` returns `Map<unitId, WorkflowPosition>`
- D-12: Hook calls `computeWorkflowPosition` internally; pure function is testable independently
- D-13: Sections/steps fetched via existing `getRecipeSections` and `getRecipePaintsByRecipe`
- D-14: Latest session per unit uses existing `getSessionsByUnit` (most recent with recipe_step_id or section_name)
- D-15: No recipe linked -> existing `getNextActionHint()` (unchanged)
- D-16: Recipe linked but no sessions -> recipe name only (unchanged)
- D-17: Flat recipe (no sections) -> step-level position only
- D-18: Sections exist -> full workflow display
- D-19: All workflow display is additive -- never removes existing info

### Claude's Discretion
- Internal data structures for Map value type and intermediates
- Whether `computeWorkflowPosition` lives in `src/lib/` or `src/features/painting-projects/`
- Exact Tailwind classes and typography for workflow context display
- Whether to show section progress (e.g., "section 2/4") alongside step progress
- Query optimization decisions (single vs multiple queries for batch loading)

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PROJ-01 | KanbanCard shows current workflow section name and next step name when recipe linked | D-06 display format, KanbanCard.tsx line 97-101 recipe name slot, enrichment prop-drill pattern |
| PROJ-02 | CurrentFocusCard shows section-aware next action guidance | D-07 display format, CurrentFocusCard.tsx line 66-70 recipe name slot |
| PROJ-03 | Workflow position derived from last logged session step implicitly | D-01/D-02/D-03 pure function, `getSessionsByUnit` query already returns sessions with `recipe_step_id` and `section_name` |
| PROJ-04 | Shared pure function usable by both Kanban and CurrentFocus | D-12 architecture: pure function + hook wrapper, both cards consume via Map |
| PROJ-05 | Graceful fallback for missing recipe/sessions/sections | D-15 through D-19 degradation rules, existing `getNextActionHint()` preserved |
</phase_requirements>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Workflow position derivation | Frontend (pure function) | -- | Pure computation from in-memory data, no DB access needed |
| Batch data fetching | Frontend (React Query hook) | Database/Storage | Hook orchestrates existing queries; SQLite provides raw data |
| KanbanCard display | Browser/Client | -- | UI rendering only; data arrives via props |
| CurrentFocusCard display | Browser/Client | -- | UI rendering only; data arrives via props |
| Session/section/step storage | Database/Storage | -- | Existing tables, no schema changes |

## Standard Stack

### Core (already installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 19 | UI components | Project standard |
| @tanstack/react-query | (project version) | Data fetching, caching | Server state management |
| Vitest | 4 | Testing pure function + hook | Project test framework |

No new dependencies required. This phase uses only existing libraries.

## Architecture Patterns

### System Architecture Diagram

```
PaintingProjectsPage / DashboardPage
        |
        | calls useWorkflowPositions(unitIds)
        v
useWorkflowPositions (React Query hook)
        |
        | fetches in parallel via Promise.all:
        |   1. getRecipeNamesByUnitIds(unitIds) -> Map<unitId, recipeId>
        |   2. getSessionsByUnit(unitId) per unit -> latest session
        |   3. getRecipeSections(recipeId) per recipe -> sections[]
        |   4. getRecipePaintsByRecipe(recipeId) per recipe -> steps[]
        v
computeWorkflowPosition (pure function)
        |
        | called per unit with: lastSession, sections, steps
        v
Map<unitId, WorkflowPosition>
        |
        | prop-drilled via KanbanBoard/KanbanColumn
        v
KanbanCard / CurrentFocusCard (render workflow context)
```

### Recommended File Placement

```
src/
  lib/
    computeWorkflowPosition.ts   # Pure function (Claude's discretion: src/lib/)
  hooks/
    useWorkflowPositions.ts       # Batch React Query hook
  features/
    painting-projects/
      KanbanCard.tsx              # Modified: add workflowPosition prop
      KanbanBoard.tsx             # Modified: fetch + pass workflow data
      KanbanColumn.tsx            # Modified: pass workflow data through
    dashboard/
      CurrentFocusCard.tsx        # Modified: add workflowPosition prop
      DashboardPage.tsx           # Modified: fetch workflow for focus unit
tests/
  lib/
    computeWorkflowPosition.test.ts  # Pure function tests (bulk of testing)
  hooks/
    useWorkflowPositions.test.ts     # Hook integration test
```

**Rationale for `src/lib/`:** The pure function has no feature-specific imports -- it takes plain data and returns plain data. This matches `src/lib/` conventions (pure utilities like `dates.ts`, `currency`). The hook belongs in `src/hooks/` following `useKanbanEnrichment` precedent. [VERIFIED: codebase inspection]

### Pattern 1: Batch Enrichment (existing pattern to follow)

**What:** Page-level hook fetches data for all visible units, builds a Map, prop-drills to cards.
**When to use:** Any time multiple cards need the same type of data without N+1 queries.
**Example (existing):**
```typescript
// Source: src/hooks/useKanbanEnrichment.ts (verified)
export function useKanbanEnrichment(unitIds: number[]) {
  const sortedIds = [...unitIds].sort((a, b) => a - b);
  return useQuery({
    queryKey: KANBAN_ENRICHMENT_KEY(sortedIds),
    queryFn: async (): Promise<KanbanEnrichment> => {
      const [recipeRows, photoRows] = await Promise.all([
        getRecipeNamesByUnitIds(sortedIds),
        getPhotoCountsByUnitIds(sortedIds),
      ]);
      return {
        recipeNames: new Map(recipeRows.map((r) => [r.unit_id, r.name])),
        photoCounts: new Map(photoRows.map((r) => [r.entity_id, r.photo_count])),
      };
    },
    enabled: sortedIds.length > 0,
    staleTime: 5 * 60 * 1000,
  });
}
```

### Pattern 2: Pure Function + Optional Return

**What:** Function returns a typed result or null when position cannot be determined.
**When to use:** Derivation logic that must handle multiple fallback cases.
**Example:**
```typescript
// Recommended shape for computeWorkflowPosition
export interface WorkflowPosition {
  sectionName: string | null;      // null for flat recipes
  sectionIndex: number | null;     // 0-based; null for flat recipes
  totalSections: number;           // 0 for flat recipes
  stepName: string | null;         // null when only section-level info
  stepIndex: number | null;        // 0-based within section; null when section-only
  totalSteps: number;              // total steps in current section (or all steps for flat)
  technique: string | null;        // from RecipeSection.technique (D-07 format)
  isComplete: boolean;             // true when last step of last section logged
  nextStepName: string | null;     // the NEXT step name (D-03/D-06)
}

export function computeWorkflowPosition(
  lastSessionStepId: number | null,
  lastSessionSectionName: string | null,
  sections: RecipeSection[],
  steps: RecipeStep[],
): WorkflowPosition | null {
  // D-05: no step or section info -> null
  // D-04: section_name only -> section-level position
  // D-02: step_id -> find section, compute indices
  // D-03: next step logic
  // D-09: completion detection
}
```

### Pattern 3: Prop Extension (additive)

**What:** Add optional props to existing card components without changing required props.
**When to use:** Enriching cards with data that may not always be available.
**Example:**
```typescript
// KanbanCardProps -- add optional workflow data
export interface KanbanCardProps {
  // ... existing required props unchanged
  recipeName?: string;
  photoCount?: number;
  workflowPosition?: WorkflowPosition | null;  // NEW (D-19: additive)
}
```

### Anti-Patterns to Avoid
- **N+1 hooks per card:** Never call `useWorkflowPositions` inside KanbanCard -- always at page level
- **Removing existing info:** D-19 forbids removing current displays; workflow context is always additive
- **Explicit completion tracking:** Out of scope (REQUIREMENTS.md "Out of Scope" section); derive everything from last session

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Session fetching | Custom session query | Existing `getSessionsByUnit(unitId)` | Already returns sessions with `recipe_step_id` and `section_name` |
| Section fetching | New section query | Existing `getRecipeSections(recipeId)` | Returns sections ordered by `order_index` |
| Step fetching | New step query | Existing `getRecipePaintsByRecipe(recipeId)` | Returns steps with `section_id` ordered by `order_index` |
| Recipe-unit linking | Custom lookup | Existing `getRecipeNamesByUnitIds(unitIds)` | Batch query already returns `{unit_id, name}` |
| Status-based hints | New fallback system | Existing `getNextActionHint(status)` | Preserved as degradation fallback (D-15) |

**Key insight:** Every data access function needed already exists. This phase is purely about orchestrating existing queries and adding a derivation layer.

## Common Pitfalls

### Pitfall 1: Recipe-to-Unit Linking Returns Only Name
**What goes wrong:** `getRecipeNamesByUnitIds` returns `{unit_id, name}` but not `recipe_id`. The hook needs recipe IDs to fetch sections and steps.
**Why it happens:** The existing query was designed only for display (recipe name on cards).
**How to avoid:** Either (a) write a new batch query `getRecipeIdsByUnitIds` that returns `{unit_id, recipe_id, name}`, or (b) extend `getRecipeNamesByUnitIds` to include `id`. Option (b) is simpler and won't break existing consumers (adding a field to SELECT).
**Warning signs:** Hook fetches recipe name but cannot proceed to fetch sections/steps.

### Pitfall 2: Sorted Unit ID Key for Cache Stability
**What goes wrong:** DnD reorder changes the unit ID array order, causing unnecessary re-fetches.
**Why it happens:** React Query uses deep equality on query keys; `[1,2,3]` !== `[3,1,2]`.
**How to avoid:** Sort IDs before using as query key, exactly as `useKanbanEnrichment` does: `const sortedIds = [...unitIds].sort((a, b) => a - b)`.
**Warning signs:** Kanban cards flash/reload after every drag operation.

### Pitfall 3: Multiple Sessions per Unit -- Finding the "Last" One
**What goes wrong:** `getSessionsByUnit` returns ALL sessions for a unit. The hook needs only the most recent session that has a `recipe_step_id` or `section_name`.
**Why it happens:** The query returns sessions ordered by `session_date DESC, id DESC` but doesn't filter by presence of recipe data.
**How to avoid:** After fetching, find the first session with `recipe_step_id !== null` (preferred) or `section_name !== null` as fallback. Do this in JS, not SQL -- keeps the existing query untouched.
**Warning signs:** Position shows data from an old session that wasn't recipe-linked.

### Pitfall 4: Flat Recipe (No Sections) Step Ordering
**What goes wrong:** Steps with `section_id = null` are orphaned from the section structure.
**Why it happens:** Recipes created before Phase 48 have steps without section assignments.
**How to avoid:** D-17 specifies: treat all steps as a flat list ordered by `order_index`. When `sections.length === 0`, compute position from the flat step list.
**Warning signs:** Position returns null for recipes that have steps but no sections.

### Pitfall 5: Step ID Not Found in Steps Array
**What goes wrong:** Session's `recipe_step_id` references a step that no longer exists (deleted during recipe edit).
**Why it happens:** DELETE-all + re-INSERT save pattern on recipe steps destroys old step IDs. Session still references the old ID.
**How to avoid:** When step lookup fails, fall back to `section_name` match (D-04). If that also fails, return null (D-05). This is expected behavior, not an error.
**Warning signs:** Console errors about missing step IDs; position always null for edited recipes.

### Pitfall 6: N+1 Query Explosion for Many Active Units
**What goes wrong:** For N active units, hook calls `getSessionsByUnit` N times, `getRecipeSections` N times, `getRecipePaintsByRecipe` N times.
**Why it happens:** Existing queries are per-unit/per-recipe, not batch.
**How to avoid:** Accept the N+1 for now -- typical Kanban boards have 5-15 active units, making this 15-45 queries total. Use `Promise.all` to parallelize. If needed later, write batch queries. The per-unit data is already cached by React Query (5-minute staleTime).
**Warning signs:** Visible lag on boards with 20+ active units.

## Code Examples

### computeWorkflowPosition -- Core Algorithm

```typescript
// Source: synthesized from D-01 through D-09 decisions
import type { RecipeSection } from "@/types/recipeSection";
import type { RecipeStep } from "@/types/recipePaint";

export interface WorkflowPosition {
  sectionName: string | null;
  sectionIndex: number | null;
  totalSections: number;
  stepName: string | null;
  stepIndex: number | null;
  totalSteps: number;
  technique: string | null;
  isComplete: boolean;
  nextStepName: string | null;
}

export function computeWorkflowPosition(
  lastSessionStepId: number | null,
  lastSessionSectionName: string | null,
  sections: RecipeSection[],
  steps: RecipeStep[],
): WorkflowPosition | null {
  // D-05: nothing to derive from
  if (lastSessionStepId === null && lastSessionSectionName === null) return null;
  if (steps.length === 0) return null;

  const sortedSections = [...sections].sort((a, b) => a.order_index - b.order_index);

  // Case 1: We have a step ID -- find it in the steps array
  if (lastSessionStepId !== null) {
    const stepIdx = steps.findIndex((s) => s.id === lastSessionStepId);
    if (stepIdx === -1) {
      // Step deleted (Pitfall 5) -- fall through to section_name
    } else {
      const step = steps[stepIdx];

      // D-17: Flat recipe (no sections)
      if (sortedSections.length === 0) {
        const sortedSteps = [...steps].sort((a, b) => a.order_index - b.order_index);
        const flatIdx = sortedSteps.findIndex((s) => s.id === lastSessionStepId);
        const isLast = flatIdx === sortedSteps.length - 1;
        return {
          sectionName: null,
          sectionIndex: null,
          totalSections: 0,
          stepName: step.step_name,
          stepIndex: flatIdx,
          totalSteps: sortedSteps.length,
          technique: null,
          isComplete: isLast,
          nextStepName: isLast ? null : sortedSteps[flatIdx + 1].step_name,
        };
      }

      // D-18: Sectioned recipe -- find which section owns this step
      const section = sortedSections.find((s) => s.id === step.section_id);
      if (section) {
        const sectionIdx = sortedSections.indexOf(section);
        const sectionSteps = steps
          .filter((s) => s.section_id === section.id)
          .sort((a, b) => a.order_index - b.order_index);
        const stepInSection = sectionSteps.findIndex((s) => s.id === lastSessionStepId);
        const isLastStep = stepInSection === sectionSteps.length - 1;
        const isLastSection = sectionIdx === sortedSections.length - 1;
        const isComplete = isLastStep && isLastSection;

        // D-03: next step logic
        let nextStepName: string | null = null;
        if (!isComplete) {
          if (!isLastStep) {
            nextStepName = sectionSteps[stepInSection + 1].step_name;
          } else {
            // First step of next section
            const nextSection = sortedSections[sectionIdx + 1];
            const nextSectionSteps = steps
              .filter((s) => s.section_id === nextSection.id)
              .sort((a, b) => a.order_index - b.order_index);
            nextStepName = nextSectionSteps[0]?.step_name ?? null;
          }
        }

        return {
          sectionName: section.name,
          sectionIndex: sectionIdx,
          totalSections: sortedSections.length,
          stepName: step.step_name,
          stepIndex: stepInSection,
          totalSteps: sectionSteps.length,
          technique: section.technique ?? null,
          isComplete,
          nextStepName,
        };
      }
    }
  }

  // D-04: section_name only (no valid step ID)
  if (lastSessionSectionName !== null && sortedSections.length > 0) {
    const section = sortedSections.find((s) => s.name === lastSessionSectionName);
    if (section) {
      const sectionIdx = sortedSections.indexOf(section);
      const sectionSteps = steps
        .filter((s) => s.section_id === section.id)
        .sort((a, b) => a.order_index - b.order_index);
      return {
        sectionName: section.name,
        sectionIndex: sectionIdx,
        totalSections: sortedSections.length,
        stepName: null,
        stepIndex: null,
        totalSteps: sectionSteps.length,
        technique: section.technique ?? null,
        isComplete: false,
        nextStepName: null,
      };
    }
  }

  return null;
}
```

### useWorkflowPositions Hook Pattern

```typescript
// Source: modeled on useKanbanEnrichment.ts (verified)
import { useQuery } from "@tanstack/react-query";
import { getSessionsByUnit } from "@/db/queries/paintingSessions";
import { getRecipeSections } from "@/db/queries/recipeSections";
import { getRecipePaintsByRecipe } from "@/db/queries/recipePaints";
import { computeWorkflowPosition, type WorkflowPosition } from "@/lib/computeWorkflowPosition";

export const WORKFLOW_POSITIONS_KEY = (unitIds: number[]) =>
  ["workflow-positions", ...unitIds] as const;

export function useWorkflowPositions(unitIds: number[], recipeMap: Map<number, { id: number; name: string }>) {
  const sortedIds = [...unitIds].sort((a, b) => a - b);
  return useQuery({
    queryKey: WORKFLOW_POSITIONS_KEY(sortedIds),
    queryFn: async (): Promise<Map<number, WorkflowPosition>> => {
      const result = new Map<number, WorkflowPosition>();
      // Only process units that have a recipe linked
      const unitsWithRecipes = sortedIds.filter((uid) => recipeMap.has(uid));

      await Promise.all(unitsWithRecipes.map(async (unitId) => {
        const recipe = recipeMap.get(unitId)!;
        const [sessions, sections, steps] = await Promise.all([
          getSessionsByUnit(unitId),
          getRecipeSections(recipe.id),
          getRecipePaintsByRecipe(recipe.id),
        ]);
        // Find most recent session with recipe step or section info
        const lastSession = sessions.find(
          (s) => s.recipe_step_id !== null || s.section_name !== null
        );
        if (!lastSession) return;

        const position = computeWorkflowPosition(
          lastSession.recipe_step_id,
          lastSession.section_name,
          sections,
          steps,
        );
        if (position) result.set(unitId, position);
      }));

      return result;
    },
    enabled: sortedIds.length > 0,
    staleTime: 5 * 60 * 1000,
  });
}
```

### KanbanCard Workflow Display

```typescript
// Source: D-06 decision, matches existing recipeName conditional rendering
{workflowPosition && !workflowPosition.isComplete && (
  <span className="truncate text-xs text-muted-foreground">
    {workflowPosition.sectionName
      ? `${workflowPosition.sectionName}: ${workflowPosition.nextStepName}`
      : workflowPosition.nextStepName}
  </span>
)}
{workflowPosition?.isComplete && (
  <span className="text-xs text-green-600">Complete</span>
)}
```

### CurrentFocusCard Workflow Display

```typescript
// Source: D-07 decision format: "SectionName: Technique -- step N/M"
{workflowPosition && !workflowPosition.isComplete && (
  <span className="flex items-center gap-1 text-xs text-muted-foreground">
    {workflowPosition.sectionName && (
      <>{workflowPosition.sectionName}
        {workflowPosition.technique ? `: ${workflowPosition.technique}` : ""}
        {" -- "}
      </>
    )}
    {workflowPosition.stepIndex !== null
      ? `step ${workflowPosition.stepIndex + 1}/${workflowPosition.totalSteps}`
      : `section ${(workflowPosition.sectionIndex ?? 0) + 1}/${workflowPosition.totalSections}`
    }
  </span>
)}
```

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `getRecipeNamesByUnitIds` can be extended to return `id` alongside `unit_id` and `name` without breaking existing consumers | Pitfall 1 | Need alternative batch query for recipe IDs; minor refactor |
| A2 | Typical Kanban board has 5-15 active units, making N+1 queries acceptable | Pitfall 6 | Visible lag; would need batch queries |

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4 + React Testing Library 16 |
| Config file | vitest.config.ts (project root) |
| Quick run command | `pnpm test -- tests/lib/computeWorkflowPosition.test.ts` |
| Full suite command | `pnpm test` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PROJ-01 | KanbanCard shows workflow section/step | unit | `pnpm test -- tests/painting/KanbanCard.test.tsx` | Exists (extend) |
| PROJ-02 | CurrentFocusCard shows section-aware guidance | unit | `pnpm test -- tests/dashboard/CurrentFocusCard.test.tsx` | Create new |
| PROJ-03 | Position derived from last session step | unit | `pnpm test -- tests/lib/computeWorkflowPosition.test.ts` | Create new |
| PROJ-04 | Shared pure function usable by both | unit | `pnpm test -- tests/lib/computeWorkflowPosition.test.ts` | Create new |
| PROJ-05 | Graceful fallback for all edge cases | unit | `pnpm test -- tests/lib/computeWorkflowPosition.test.ts` | Create new |

### Sampling Rate
- **Per task commit:** `pnpm test -- tests/lib/computeWorkflowPosition.test.ts`
- **Per wave merge:** `pnpm test`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `tests/lib/computeWorkflowPosition.test.ts` -- covers PROJ-03, PROJ-04, PROJ-05 (pure function, all edge cases)
- [ ] `tests/dashboard/CurrentFocusCard.test.tsx` -- covers PROJ-02 (workflow display in focus card)

## Open Questions

1. **Recipe ID in batch query**
   - What we know: `getRecipeNamesByUnitIds` returns `{unit_id, name}` but hook needs `recipe_id` to fetch sections/steps
   - What's unclear: Whether to extend the existing query (add `id` to SELECT) or write a new one
   - Recommendation: Extend existing query -- adding `id` to SELECT is additive, won't break consumers

2. **Section progress display (section 2/4)**
   - What we know: D-07 specifies `"SectionName: Technique -- step N/M"` format
   - What's unclear: Whether to also show section progress (Claude's Discretion item)
   - Recommendation: Include section progress on CurrentFocusCard only (more space), skip on KanbanCard (compact)

## Sources

### Primary (HIGH confidence)
- Codebase inspection: `src/hooks/useKanbanEnrichment.ts` -- batch enrichment pattern [VERIFIED]
- Codebase inspection: `src/features/painting-projects/KanbanCard.tsx` -- current card props and rendering [VERIFIED]
- Codebase inspection: `src/features/dashboard/CurrentFocusCard.tsx` -- current focus card structure [VERIFIED]
- Codebase inspection: `src/db/queries/paintingSessions.ts` -- `getSessionsByUnit` query [VERIFIED]
- Codebase inspection: `src/db/queries/recipeSections.ts` -- `getRecipeSections` query [VERIFIED]
- Codebase inspection: `src/db/queries/recipePaints.ts` -- `getRecipePaintsByRecipe` query [VERIFIED]
- Codebase inspection: `src/types/paintingSession.ts` -- PaintingSession with `section_name`, `recipe_step_id` [VERIFIED]
- Codebase inspection: `src/types/recipeSection.ts` -- RecipeSection with workflow metadata [VERIFIED]
- Codebase inspection: `src/types/recipePaint.ts` -- RecipeStep with `section_id` [VERIFIED]
- Phase CONTEXT.md: D-01 through D-19 locked decisions [VERIFIED]

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new libraries; all existing
- Architecture: HIGH -- follows established batch enrichment pattern exactly
- Pitfalls: HIGH -- derived from codebase inspection of actual data flow and known patterns (DELETE+re-INSERT, sorted key cache)

**Research date:** 2026-05-12
**Valid until:** 2026-06-12 (stable domain, no external dependencies)
