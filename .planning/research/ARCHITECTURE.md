# Architecture Research

**Domain:** Painting Mode — focused recipe execution view integrated into HobbyForge
**Researched:** 2026-05-19
**Confidence:** HIGH (direct codebase analysis of all integration surfaces)

---

## System Overview

```
┌──────────────────────────────────────────────────────────────────┐
│              Entry Points (6 existing surfaces)                   │
│                                                                   │
│  Dashboard             Kanban              Unit Detail            │
│  ┌──────────────────┐  ┌───────────────┐  ┌──────────────────┐  │
│  │CurrentFocusCard  │  │ KanbanCard    │  │AssignmentCheckl  │  │
│  │+ "Paint" button  │  │+ Paint Mode   │  │+ "Open in Paint  │  │
│  │NextPaintingAction│  │  action       │  │  Mode" link      │  │
│  │→ link to mode    │  │               │  │                  │  │
│  └────────┬─────────┘  └──────┬────────┘  └────────┬─────────┘  │
│           │                   │                    │             │
│  Applied Recipe    Recipe Detail                                  │
│  ┌────────┴──────┐  ┌────────┴────────────────────┘             │
│  │RecipeDetail   │  │  navigate with assignmentId               │
│  │Sheet footer   │  │                                           │
│  └───────────────┘                                              │
└───────────────────────────────┬──────────────────────────────────┘
                                │  navigate({ to: "/painting-mode/$assignmentId" })
                                ▼
┌──────────────────────────────────────────────────────────────────┐
│          PaintingModePageShell  (src/app/painting-mode/page.tsx) │
│          Extracts $assignmentId param, NaN guard, renders        │
│          PaintingModePage — matches GameDayPageShell pattern     │
└───────────────────────────────┬──────────────────────────────────┘
                                │
┌───────────────────────────────▼──────────────────────────────────┐
│              PaintingModePage  (src/features/painting-mode/)     │
│                                                                   │
│  ┌───────────────────────────────────────────────────────────┐   │
│  │  SectionNav                     StepExecutionView          │   │
│  │  (section list with              (step name, phase badge,  │   │
│  │   completion counts,              paint/tool/technique,    │   │
│  │   jump-to, active highlight)      dilution, time, photo,   │   │
│  │                                   mark done, prev/next)    │   │
│  │                                                            │   │
│  │                       PaintReadinessWarning                │   │
│  │                       (missing/low paint banner)           │   │
│  └───────────────────────────────────────────────────────────┘   │
│                                                                   │
│  [Keyboard: ArrowLeft/Right = prev/next, Space = mark done]      │
│  PaintingModeLogSheet (sheet overlay, prefilled, atomic)         │
└───────────────────────────────┬──────────────────────────────────┘
                                │
┌───────────────────────────────▼──────────────────────────────────┐
│                 Existing Hook Layer (ALL REUSED)                  │
│                                                                   │
│  useStepProgress(assignmentId)      → StepProgress[]             │
│  useToggleStepProgress()            → mark step done/undone      │
│  useRecipePaints(recipeId)          → RecipeStep[] w/ paint data  │
│  useRecipeSections(recipeId)        → RecipeSection[] + metadata  │
│  usePaints()                        → Paint[] ownership status   │
│  useCreatePaintingSession()         → log session w/ step FK     │
│  useAssignmentsByUnit(unitId)       → assignment lookup          │
└───────────────────────────────┬──────────────────────────────────┘
                                │
┌───────────────────────────────▼──────────────────────────────────┐
│                 Existing Query Layer (UNCHANGED)                  │
│  getStepProgress / upsertStepProgress                            │
│  getRecipePaintsByRecipe / getRecipeSections                     │
│  createSession                                                    │
└───────────────────────────────┬──────────────────────────────────┘
                                │
┌───────────────────────────────▼──────────────────────────────────┐
│           SQLite: hobbyforge.db (UNCHANGED, no migrations)       │
│  unit_recipe_assignments, unit_recipe_step_progress              │
│  recipe_steps, recipe_sections, painting_sessions                │
└──────────────────────────────────────────────────────────────────┘
```

---

## Component Responsibilities

| Component | Responsibility | New / Modified / Reused |
|-----------|----------------|------------------------|
| `PaintingModePageShell` | Route param extraction, NaN guard, renders `PaintingModePage` | NEW (matches `GameDayPageShell`) |
| `PaintingModePage` | Page root: owns keyboard handler, `logSheetOpen` state, layout composition, back navigation | NEW |
| `usePaintingModeState` | Local hook: derives initial step from completedSet, controlled `currentStepId`, prev/next/jump navigation, ordered step array | NEW |
| `StepExecutionView` | Renders step detail (name, phase badge, paint, tool, technique, dilution, time estimate, step photo), mark done button, prev/next nav | NEW |
| `SectionNav` | Vertical section list with completion counts, active section highlight, click-to-jump-to-first-step | NEW |
| `PaintReadinessWarning` | Non-blocking banner when current step's paint is missing or running-low, reuses `PaintAvailability` type | NEW |
| `PaintingModeLogSheet` | Prefilled session logger (unit+recipe+step locked from context), only duration+notes editable, atomic complete+log | NEW |
| `AssignmentChecklist` | Existing sectioned checklist — reused as-is, gains "Open in Paint Mode" link per assignment | MODIFIED (minor) |
| `CurrentFocusCard` | Gains "Paint" button alongside existing "Open" and "Log" buttons | MODIFIED (minor) |
| `NextPaintingActionCard` | Changes link target from `/painting-projects` to `/painting-mode/$assignmentId` when assignment exists | MODIFIED (minor) |
| `KanbanCardActions` | Gains "Paint Mode" action that navigates with assignment ID | MODIFIED (minor) |
| `RecipeDetailSheet` | Gains "Open in Paint Mode" footer button (enabled only when unit has assignment) | MODIFIED (minor) |
| `computeAssignmentProgress` | Pure function for progress percentages — reused unchanged | REUSED |
| `computeWorkflowPosition` | Pure function for "where am I" derivation — reused unchanged | REUSED |
| `RecipeStepTimeline` | Existing timeline display — optionally reused for recipe overview panel | REUSED |

---

## Recommended Project Structure

```
src/
├── app/
│   ├── painting-mode/
│   │   └── page.tsx                     # PaintingModePageShell
│   └── router.tsx                       # +1 route, +1 import
├── features/
│   └── painting-mode/                   # NEW feature module
│       ├── PaintingModePage.tsx         # Page root: layout, keyboard, sheet state
│       ├── usePaintingModeState.ts      # Local navigation + step state hook
│       ├── StepExecutionView.tsx        # Current step detail + mark done + nav
│       ├── SectionNav.tsx               # Section list with progress counts + jump
│       ├── PaintReadinessWarning.tsx    # Missing/low paint banner
│       └── PaintingModeLogSheet.tsx     # Prefilled session logger
```

### Structure Rationale

- **`src/features/painting-mode/`:** Follows the established one-dir-per-domain convention. All new components co-located. No files scattered across other features.
- **`src/app/painting-mode/page.tsx`:** Thin shell identical to `src/app/game-day/page.tsx`. Only purpose: extract URL param and render the feature.
- **No new files in `src/db/queries/` or `src/hooks/`:** All required data paths already exist. The only new hook is `usePaintingModeState` which is local to the feature (not a React Query hook — it is pure React state derived from existing query data).

---

## Architectural Patterns

### Pattern 1: Full-Page Route (GameDay pattern)

**What:** A new TanStack Router route at `/painting-mode/$assignmentId`. Not an overlay, not a Sheet, not a modal.

**When to use:** The feature needs full-screen real estate, distraction-free layout, keyboard shortcuts, and navigation via `useNavigate` from any existing surface. `GameDayPage` sets this exact precedent with `/game-day/$listId`.

**Trade-offs:** User must navigate back to return to the source page. This is intentional — the "distraction-free" goal means Paint Mode should own the full screen. The browser-back button or an explicit "Exit" button handles return.

**Example:**
```typescript
// src/app/painting-mode/page.tsx
import { useParams } from "@tanstack/react-router";
import { PaintingModePage } from "@/features/painting-mode/PaintingModePage";

export function PaintingModePageShell() {
  const { assignmentId } = useParams({ from: "/painting-mode/$assignmentId" });
  const id = Number(assignmentId);
  if (Number.isNaN(id)) return null;
  return <PaintingModePage assignmentId={id} />;
}

// src/app/router.tsx addition
const paintingModeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/painting-mode/$assignmentId",
  component: PaintingModePageShell,
});
```

### Pattern 2: Current Step as Derived-then-Controlled State

**What:** On mount, derive `currentStepId` from the first incomplete step in the ordered steps array. After that, it is controlled local React state — prev/next navigation changes it without any DB round-trip.

**When to use:** When "current position" is cheap to derive from existing data (completedSet from `useStepProgress`) and navigation needs to be instantaneous.

**Trade-offs:** If the user returns to Paint Mode after a break, the initial position re-derives correctly. If two windows somehow both modified progress (impossible for a single-user desktop app), they could diverge — not a concern here.

**Example (`usePaintingModeState.ts`):**
```typescript
export function usePaintingModeState(
  steps: RecipeStep[],
  sections: RecipeSection[],
  progressRows: StepProgress[]
) {
  // Build flat ordered array: sort by [section.order_index, step.order_index]
  const orderedSteps = useMemo(() => {
    const sectionOrder = new Map(sections.map((s, i) => [s.id, s.order_index]));
    return [...steps].sort((a, b) => {
      const sa = sectionOrder.get(a.section_id ?? -1) ?? 0;
      const sb = sectionOrder.get(b.section_id ?? -1) ?? 0;
      if (sa !== sb) return sa - sb;
      return a.order_index - b.order_index;
    });
  }, [steps, sections]);

  const completedSet = useMemo(
    () => new Set(progressRows.filter(p => p.completed === 1).map(p => p.recipe_step_id)),
    [progressRows]
  );

  // Derive once on mount: first incomplete step, fallback to last step
  const initialStepId = useMemo(() => {
    const first = orderedSteps.find(s => !completedSet.has(s.id));
    return first?.id ?? orderedSteps[orderedSteps.length - 1]?.id ?? null;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally run once on mount only

  const [currentStepId, setCurrentStepId] = useState<number | null>(initialStepId);
  const currentIndex = orderedSteps.findIndex(s => s.id === currentStepId);

  return {
    currentStepId,
    currentIndex,
    orderedSteps,
    completedSet,
    canGoPrev: currentIndex > 0,
    canGoNext: currentIndex < orderedSteps.length - 1,
    goToStep: setCurrentStepId,
    goPrev: () => currentIndex > 0 && setCurrentStepId(orderedSteps[currentIndex - 1].id),
    goNext: () => currentIndex < orderedSteps.length - 1 && setCurrentStepId(orderedSteps[currentIndex + 1].id),
  };
}
```

### Pattern 3: Keyboard Handler at Page Root with Sheet Guard

**What:** `PaintingModePage` registers a `keydown` listener in a `useEffect`. Keyboard shortcuts (ArrowLeft/Right for nav, Space/Enter for mark done, Escape to exit) are handled centrally. The handler is suppressed when `logSheetOpen` is true or when focus is in a form control.

**When to use:** Always in a "mode" page with keyboard navigation. The central registration means shortcuts work regardless of where focus is on the page.

**Trade-offs:** Must guard against shortcuts firing when PaintingModeLogSheet is open (it has its own form). Use a `logSheetOpen` boolean state flag checked first in the handler.

**Example:**
```typescript
// PaintingModePage.tsx
useEffect(() => {
  function handleKey(e: KeyboardEvent) {
    if (logSheetOpen) return;
    const tag = (e.target as HTMLElement).tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
    if (e.key === "ArrowRight" || e.key === "l") { e.preventDefault(); nav.goNext(); }
    if (e.key === "ArrowLeft"  || e.key === "h") { e.preventDefault(); nav.goPrev(); }
    if (e.key === " " || e.key === "Enter")       { e.preventDefault(); handleMarkDone(); }
    if (e.key === "Escape")                        { navigate({ to: ".." }); }
  }
  window.addEventListener("keydown", handleKey);
  return () => window.removeEventListener("keydown", handleKey);
}, [logSheetOpen, nav, handleMarkDone, navigate]);
```

### Pattern 4: Atomic Step Completion + Session Log

**What:** "Mark done" is a two-mutation sequence: (1) `upsertStepProgress` marks the step complete, (2) `createSession` logs the session with the same `recipe_step_id`. Sequential `mutateAsync`. Partial failure (step ok, session fails) shows warning toast and stays on the step — matches `LogSessionSheet`'s existing tolerance.

**When to use:** Whenever the user marks a step done in Paint Mode. Session creation is the natural result of completing a step.

**Trade-offs:** Sequential means latency is the sum of both mutations. For a local SQLite desktop app this is imperceptible (< 5ms each). No need for `Promise.all` since session depends on step completion.

### Pattern 5: Section-Grouped Step Navigation in `usePaintingModeState`

**What:** The `orderedSteps` flat array is built by sorting steps using `[sectionOrderIndex, stepOrderIndex]` as the composite key. This produces the correct painting order: all steps in section 1 first, then all in section 2, etc. Section nav jumps to the first step of a target section by finding `orderedSteps.find(s => s.section_id === targetSectionId)`.

**Why this works:** It mirrors exactly how `AssignmentChecklist` and `SectionedTimeline` render steps — sectioned by `section_id`, ordered by `order_index` within each section. `computeWorkflowPosition` uses the same ordering logic.

---

## Data Flow

### Request Flow: Entry to Active Step

```
[User clicks "Paint" on KanbanCard or CurrentFocusCard]
    ↓
Resolve assignment.id from local data (useAssignmentsByUnit already fetched)
    ↓
navigate({ to: "/painting-mode/$assignmentId", params: { assignmentId: String(id) } })
    ↓
PaintingModePageShell extracts param, NaN guard
    ↓
PaintingModePage mounts, fires 4 parallel queries:
  useStepProgress(assignmentId)      → progressRows
  useRecipePaints(recipeId)          → steps (all RecipeStep fields)
  useRecipeSections(recipeId)        → sections (section_type, technique, etc.)
  usePaints()                        → allPaints (ownership status)
    ↓
usePaintingModeState(steps, sections, progressRows)
  → orderedSteps, currentStepId, completedSet, nav functions
    ↓
currentStep = orderedSteps.find(s => s.id === currentStepId)
paintMap = new Map(allPaints.map(p => [p.id, p]))
currentStepPaints = [paintMap.get(currentStep.paint_id), paintMap.get(currentStep.alt_paint_id)]
    ↓
Render: SectionNav (left) + StepExecutionView (center) + PaintReadinessWarning (if needed)
```

### Request Flow: Mark Done + Log Session

```
[Space keypress or "Mark Done" button click]
    ↓
useToggleStepProgress.mutateAsync({
  assignmentId,
  recipeStepId: currentStepId,
  completed: true
})
    ↓ success → invalidates STEP_PROGRESS_KEY(assignmentId)
    ↓
useCreatePaintingSession.mutateAsync({
  unit_id,                              // from assignment lookup
  recipe_id,                            // from assignment
  recipe_step_id: currentStepId,
  section_name: currentSection?.name ?? null,
  recipe_section_id: currentSection?.id ?? null,
  session_date: todayISO(),
  duration_minutes: logSheetDuration ?? 30,
  notes: null
})
    ↓ success → invalidates painting-sessions, workflow-positions, hobby-analytics, etc.
    ↓
nav.goNext()  — advance to next step (local state update, instant)
```

### State Management

```
Server State (React Query):
  progressRows       ← useStepProgress(assignmentId)
  steps              ← useRecipePaints(recipeId)
  sections           ← useRecipeSections(recipeId)
  allPaints          ← usePaints()

Local Derived State (usePaintingModeState):
  orderedSteps       ← derived from steps + sections (memo)
  completedSet       ← derived from progressRows (memo)
  currentStepId      ← useState, initialized from completedSet on mount

UI State (PaintingModePage):
  logSheetOpen       ← useState<boolean>
  logSheetDuration   ← useState<number>
```

---

## Integration Points

### Entry Point Wiring

| Surface | File | Current Behavior | Required Change |
|---------|------|-----------------|-----------------|
| `NextPaintingActionCard` | `src/features/dashboard/NextPaintingActionCard.tsx` | Link to `/painting-projects` | Change link to `/painting-mode/${data.assignment_id}` — `assignment_id` must be added to `FirstIncompleteStep` query result |
| `CurrentFocusCard` | `src/features/dashboard/CurrentFocusCard.tsx` | "Open" + "Log" buttons | Add "Paint" button, pass `onPaint` callback from `DashboardPage` (sibling portal pattern) |
| `DashboardPage` | `src/features/dashboard/DashboardPage.tsx` | Manages `onOpen`/`onLog` callbacks | Add assignment lookup for focus unit, pass `onPaint: () => navigate(...)` to `CurrentFocusCard` |
| `KanbanCardActions` | `src/features/painting-projects/KanbanCardActions.tsx` | "Log Session" | Add "Paint Mode" action, pass `onPaintMode` callback |
| `KanbanCard` | `src/features/painting-projects/KanbanCard.tsx` | `onLogSession` prop | Add `onPaintMode` prop, thread through to `KanbanCardActions` |
| `KanbanBoard` | `src/features/painting-projects/KanbanBoard.tsx` | Calls `onLogSession` | Add `onPaintMode` callback, resolve `assignmentId` via enrichment data |
| `AssignmentChecklist` | `src/features/recipes/AssignmentChecklist.tsx` | Checklist only | Add "Open in Paint Mode" button at top, receives `onPaintMode` callback from parent |
| `RecipeDetailSheet` | `src/features/recipes/RecipeDetailSheet.tsx` | "Apply to Unit(s)" in footer | Add "Open in Paint Mode" footer button (enabled when assignments exist for the linked unit) |

### Assignment ID Resolution by Surface

The key question at each entry point: "which `assignmentId` do I navigate with?"

| Surface | How to Get Assignment ID |
|---------|--------------------------|
| `CurrentFocusCard` (via `DashboardPage`) | `useAssignmentsByUnit(focusUnit.id)` → `assignments[0]?.id`. Already fetched in `DashboardPage`. |
| `NextPaintingActionCard` | `data.assignment_id` — add this column to `getMostRecentAssignmentWithIncompleteStep` SQL query (trivially: `a.id AS assignment_id` already in the SELECT as `assignment_id`). Confirm it is exposed on `FirstIncompleteStep` type. |
| `KanbanCard` | `useKanbanEnrichment` or `useAssignmentsByUnit` per unit. The Kanban board already has enrichment data — thread `assignment_id` through the enrichment or do a targeted lookup. |
| `RecipeDetailSheet` | `useAssignmentsByRecipe(recipe.id)` → `assignments[0]?.id`. Already imported in the sheet's hook list. |
| `AssignmentChecklist` | `assignment.id` — it is a required prop of the component. Pass it directly to `onPaintMode`. |

### Route Registration

```typescript
// src/app/router.tsx
import { PaintingModePageShell } from "./painting-mode/page";

const paintingModeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/painting-mode/$assignmentId",
  component: PaintingModePageShell,
});

const routeTree = rootRoute.addChildren([
  // ... existing routes
  paintingModeRoute,
]);
```

### Cache Invalidation Contract

`useToggleStepProgress` currently invalidates only `STEP_PROGRESS_KEY(assignmentId)`. This is correct and sufficient for Painting Mode — the `completedSet` updates via query refetch, which drives `SectionNav` progress counts and `StepExecutionView` done state.

`useCreatePaintingSession` already invalidates the broader keys: `painting-sessions`, `workflow-positions`, `hobby-analytics`, `recent-activity`, `goal-progress`. No changes to invalidation contracts are needed.

### Hook Reuse Map

| Required Data | Existing Hook | Status |
|---------------|--------------|--------|
| Step definitions with all fields | `useRecipePaints(recipeId)` | Reused |
| Section grouping + workflow metadata | `useRecipeSections(recipeId)` | Reused |
| Step completion state | `useStepProgress(assignmentId)` | Reused |
| Toggle step done/undone | `useToggleStepProgress()` | Reused |
| Paint ownership status | `usePaints()` | Reused |
| Log session with step FK | `useCreatePaintingSession()` | Reused |
| Per-section progress counts | `computeAssignmentProgress()` pure fn | Reused |
| Navigation + ordered steps | `usePaintingModeState` | NEW (local hook) |
| Assignment metadata (unit_id, recipe_id) | `getAssignment(id)` query | 1 new query or JOIN |

The one gap: given only `assignmentId`, the page needs `unit_id` and `recipe_id` to call the correct hooks. Options in preference order:
1. Add a `getAssignment(id)` query to `src/db/queries/recipeAssignments.ts` (a trivial `SELECT * WHERE id = $1` — the function stub already exists at line 79 of that file).
2. Pass `unitId` and `recipeId` as additional route search params from the entry point.

Option 1 is cleaner: the page is self-contained with just `assignmentId`.

---

## Suggested Build Order

Dependencies flow bottom-up. Each phase is unblocked when its predecessor completes.

| Phase | Deliverable | Depends On | Parallelizable |
|-------|-------------|-----------|----------------|
| 1 | `usePaintingModeState` hook + unit tests (step ordering, navigation, completedSet derivation) | Existing `RecipeStep` type, `computeAssignmentProgress` patterns | Independent, start here |
| 2 | `StepExecutionView` + `PaintReadinessWarning` components | Phase 1 hook, `usePaints`, existing `RecipeStepTimeline` patterns | After phase 1 |
| 3 | `SectionNav` component | Phase 1 hook for progress Map, `RecipeSection` type | After phase 1, parallel with phase 2 |
| 4 | `PaintingModePage` full layout + keyboard handler + route registration | Phases 2–3, `useStepProgress`, `useRecipePaints`, `useRecipeSections`, `useToggleStepProgress` | After phases 2–3 |
| 5 | `PaintingModeLogSheet` (prefilled, atomic complete+log) | Phase 4 (needs page context), `useCreatePaintingSession` | After phase 4 |
| 6 | Entry point wiring (all 6 surfaces: add "Paint" buttons, navigate calls) | Completed route from phase 4 | After phase 4 |
| 7 | Tests: step selection, navigation, completion, paint warnings, session prefill | Phases 1–6 | After phase 6 |

---

## Anti-Patterns

### Anti-Pattern 1: Overlay / Modal Instead of Full Route

**What people do:** Implement Painting Mode as a Dialog or Sheet overlay on an existing page.

**Why it's wrong:** Sheets are 400–500px side panels. The feature requires "distraction-free presentation with larger typography, high contrast." Sheet real estate is insufficient. Keyboard shortcuts from the overlay would compete with the parent page's listeners. Radix nested portal context issues apply (documented pitfall in `PROJECT.md`).

**Do this instead:** Full-page route at `/painting-mode/$assignmentId`. Exact precedent: `GameDayPage` at `/game-day/$listId`.

### Anti-Pattern 2: Fetching Assignment in the Shell

**What people do:** `PaintingModePageShell` queries for the assignment to validate it exists before rendering the page, causing a loading flash.

**Why it's wrong:** The parent already has the assignment context (that's how it navigated). The shell's only job is param extraction and NaN guard, matching `GameDayPageShell`.

**Do this instead:** Shell extracts raw `number`, passes to page. Page handles all loading states.

### Anti-Pattern 3: Storing Current Step in SQLite

**What people do:** Add `current_step_id` to `unit_recipe_assignments` to persist which step the user is "on."

**Why it's wrong:** Current step is transient UI state — it changes on every prev/next keypress. Would flood the DB with writes. The position is already derivable from `completedSet` (first incomplete step).

**Do this instead:** Derive initial step on mount from `completedSet`. Navigate in local React state. Optionally persist to `localStorage["painting-mode-step-${assignmentId}"]` if resume-on-reload is desired.

### Anti-Pattern 4: Per-Step Hook Calls for Paint Data

**What people do:** Call `usePaints()` inside `StepExecutionView` and filter per step, or call a per-step data hook.

**Why it's wrong:** `usePaints()` inside a component that re-renders on every step navigation is wasteful (though React Query deduplicates it). More importantly, the pattern is inconsistent with the rest of the codebase.

**Do this instead:** `usePaints()` once at page level → `paintMap = new Map(paints.map(p => [p.id, p]))` → pass as prop. Identical pattern to `RecipeDetailSheet`, `SectionedTimeline`, and `RecipeStepTimeline`.

### Anti-Pattern 5: Two-State Section + Step Navigation

**What people do:** Track `currentSectionIndex` and `currentStepIndexWithinSection` as two separate state values, requiring synchronization on section jumps.

**Why it's wrong:** Creates derived-state sync bugs when jumping sections. Section is always derivable from `currentStep.section_id`.

**Do this instead:** Track only `currentStepId`. Derive section from `currentStep.section_id`. Section nav jumps set `currentStepId` to the first step of the target section.

---

## Sources

- `src/hooks/useRecipeAssignments.ts` — `useStepProgress`, `useToggleStepProgress`, `STEP_PROGRESS_KEY`
- `src/hooks/useWorkflowPositions.ts` — batch enrichment pattern, `computeWorkflowPosition` usage
- `src/hooks/useNextPaintingAction.ts` — `FirstIncompleteStep` type, paint availability derivation pattern
- `src/hooks/useJournalSessions.ts` — `useCreatePaintingSession`, cache invalidation contract
- `src/hooks/useRecipePaints.ts` — `useRecipePaints`, `usePaints`, `paintMap` pattern
- `src/features/recipes/AssignmentChecklist.tsx` — section-grouped step rendering, completedSet pattern
- `src/features/recipes/SectionedTimeline.tsx` — section+step rendering, stepsBySection Map pattern
- `src/features/recipes/RecipeDetailSheet.tsx` — `paintMap` prop-drilling pattern, step photo resolution
- `src/features/dashboard/LogSessionSheet.tsx` — prefill pattern, atomic session+step-toggle sequence
- `src/features/dashboard/CurrentFocusCard.tsx` — existing "Open"/"Log" button pattern
- `src/features/dashboard/NextPaintingActionCard.tsx` — paint availability display, `PaintAvailability` type
- `src/features/painting-projects/KanbanCard.tsx` — `WorkflowPosition`, `AppliedRecipeProgress` props
- `src/lib/computeWorkflowPosition.ts` — step ID as source of truth, section derived
- `src/lib/computeAssignmentProgress.ts` — `bySectionId` Map for progress counts
- `src/app/game-day/page.tsx` — `GameDayPageShell` route param extraction pattern
- `src/app/router.tsx` — route tree, existing `gameDayRoute` pattern

---
*Architecture research for: v0.2.15 Painting Mode integration into HobbyForge*
*Researched: 2026-05-19*
