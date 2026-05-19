# Phase 85: Core Execution UI - Research

**Researched:** 2026-05-19
**Domain:** React component composition, split-panel layout, step-execution UX
**Confidence:** HIGH

## Summary

Phase 85 builds the core painting mode execution UI as five new React components in `src/features/painting-mode/`. The UI consumes two hooks delivered by Phase 84 (`usePaintingModeState` for navigation/ordering, `useCompleteStep` for step completion) and two existing hooks (`useRecipePaints`, `useRecipeSections`) for paint and section metadata. No new database queries, mutations, or schema changes are needed.

The architecture is a split-panel layout (280px section navigator + flex-1 focal view) following the `GameDayPage.tsx` pattern. All shadcn components needed are already installed except `ScrollArea` which must be added. The existing `RecipeStepTimeline` provides paint swatch, metadata row, and photo patterns to scale up for the focal view context.

**Primary recommendation:** Build five components with pure prop-drilling from the root `PaintingModeView`, following established `GameDayPage` layout and `RecipeStepTimeline` display patterns. Use `useCompleteStep` for mark-done (creates a minimal 0-duration session record), then `goNext()` for auto-advance.

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions
- D-01: Split-panel layout -- persistent left sidebar for section navigator, right main area for step focal view
- D-02: Distraction-free presentation: sidebar hidden, larger typography, high contrast. Full-height flex column layout
- D-03: Large hero card layout for current step. Paint swatch circle + paint name prominently at top
- D-04: Metadata row below paint info: technique badge, tool icon + name, dilution indicator, time estimate
- D-05: Reference photo displayed large below metadata row when present. Collapses when absent
- D-06: Step name/instruction text displayed prominently above paint info as primary heading
- D-07: Persistent sidebar list showing all sections with name, completed/total count badge, current section highlight
- D-08: Each section expands to show step sub-items with completion indicator and step name. Click triggers goToStep()
- D-09: Optional sections display "Optional" badge, visually distinct
- D-10: Unsectioned steps grouped under virtual "General" section at bottom (COALESCE 999999 sort)
- D-11: Prominent "Mark Done" button calls useCompleteStep mutation, advances to next step. No animation
- D-12: Section navigator updates immediately: step gets checkmark, section badge count increments
- D-13: Previous/Next buttons flanking step focal view. Connected to goPrev/goNext. Disable at boundaries
- D-14: Position indicator: "Step X of Y" text plus current section name
- D-15: Non-blocking banner at top listing missing paints with dismiss action, shown once at entry
- D-16: Paintless steps display cleanly with no paint swatch area, no false "missing paint" warnings
- D-17: New feature directory src/features/painting-mode/ with 5 components
- D-18: Root component takes assignmentId and recipeId as props. No internal routing -- Phase 86 adds route

### Claude's Discretion
- Exact spacing, font sizes, and padding for "larger typography" (PX-01) -- UI spec provides concrete values
- Whether section navigator uses Collapsible or is always fully expanded -- UI spec specifies Collapsible
- Paint swatch rendering (CSS background-color circle vs SVG) -- follow existing RecipeStepTimeline pattern
- Loading state presentation while usePaintingModeState fetches data

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope.

</user_constraints>

<phase_requirements>

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SE-01 | User sees current step with paint swatch, technique, tool, dilution, time estimate without opening editor | StepFocalView component with paint info block + StepMetadataRow inline display |
| SE-02 | User can mark current step done with single action | Mark Done button calling useCompleteStep + goNext() |
| SE-03 | User can navigate to previous and next steps | Previous/Next buttons wired to goPrev/goNext from usePaintingModeState |
| SE-04 | User sees step position indicator and current section name | "Step X of Y . SectionName" from currentIndex + orderedSteps.length + section lookup |
| SE-05 | User sees step reference photo prominently when one exists | Large image block in StepFocalView, collapses when step_photo_path is null |
| SP-01 | User sees section list with completed/total step counts | SectionNavigator renders sections with sectionProgressMap badges |
| SP-02 | Current section is visually highlighted | border-l-3 border-primary bg-accent/50 on current section item |
| SP-03 | User can jump to any section or step | Click handlers calling goToStep(stepId) in navigator |
| SP-04 | Optional sections are visually distinct | "Optional" Badge on sections where section.optional === 1 |
| PR-01 | User sees paint availability status at mode entry | PaintReadinessBanner shown on mount when missing paints exist |
| PR-02 | Missing paint does not block progress, shows non-blocking warning | Banner is dismissible, does not prevent mark-done actions |
| PR-03 | Paintless steps handled cleanly without false availability warnings | Conditional rendering: no paint swatch area, no availability check for steps with paint_id === null |
| PX-01 | Distraction-free layout with sidebar hidden and larger typography | Full-height flex column, text-base/text-xl/text-2xl scale from UI spec |

</phase_requirements>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Step detail display (SE-01, SE-05) | Browser / Client | -- | Pure presentation: renders step data already fetched by React Query |
| Step completion (SE-02) | Browser / Client | Database / Storage | Click triggers mutation -> DB write via Tauri plugin-sql. Cache invalidation handled by useCompleteStep |
| Step navigation (SE-03, SE-04) | Browser / Client | -- | Client-side state management in usePaintingModeState (useState + useMemo) |
| Section progress display (SP-01 thru SP-04) | Browser / Client | -- | Derived from orderedSteps + completedSet in usePaintingModeState |
| Paint readiness check (PR-01 thru PR-03) | Browser / Client | -- | Derived from useRecipePaints paint data (owned field) + step paint_id presence |
| Layout / typography (PX-01) | Browser / Client | -- | CSS-only: Tailwind classes, no server-side rendering |

## Standard Stack

### Core (already installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 19.x | Component framework | Project standard [VERIFIED: codebase] |
| @tanstack/react-query | 5.x | Server state / cache | Project standard [VERIFIED: codebase] |
| TailwindCSS | 4.x | Styling | Project standard [VERIFIED: codebase] |
| Lucide React | latest | Icons | Project standard [VERIFIED: codebase] |
| shadcn/ui | n/a (source-copied) | UI primitives | Project standard [VERIFIED: codebase] |

### Supporting (needs install)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| shadcn ScrollArea | n/a | Scrollable section navigator panel | Install via `npx shadcn@latest add scroll-area` [VERIFIED: shadcn component registry] |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| ScrollArea (shadcn) | Native CSS `overflow-y-auto` | ScrollArea provides consistent cross-platform scrollbar styling; but native overflow works fine for a 280px panel -- either acceptable per Claude's discretion |
| Collapsible sections | Always-expanded list | Collapsible reduces visual noise for long recipes; UI spec chose Collapsible |

**Installation:**
```bash
npx shadcn@latest add scroll-area
```

## Package Legitimacy Audit

No new npm packages installed. The only addition is `scroll-area` from the official shadcn CLI which copies source code from the shadcn registry (built on `@radix-ui/react-scroll-area`, already a transitive dependency). No slopcheck needed.

**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

## Architecture Patterns

### System Architecture Diagram

```
[User Click: Mark Done / Navigate / Jump]
        |
        v
PaintingModeView (root composition)
  |-- usePaintingModeState(assignmentId, recipeId)
  |     |-- useRecipePaints(recipeId)       --> React Query --> SQLite
  |     |-- useRecipeSections(recipeId)     --> React Query --> SQLite
  |     |-- useStepProgress(assignmentId)   --> React Query --> SQLite
  |     returns: orderedSteps, currentStepId, navigation fns, sectionProgressMap
  |
  |-- useCompleteStep()
  |     mutationFn --> completeStepWithSession() --> SQLite transaction
  |     onSuccess --> invalidates 6 cache keys
  |
  +-- Renders children via props:
      |-- PaintReadinessBanner (conditional: missingPaints.length > 0)
      |-- SectionNavigator (left panel, 280px)
      +-- StepFocalView (right panel, flex-1)
            |-- StepMetadataRow (technique/tool/dilution/time)
            |-- Reference photo (conditional)
            |-- Navigation bar (prev/next + position)
            +-- Mark Done button
```

### Recommended Project Structure
```
src/features/painting-mode/
  PaintingModeView.tsx      # Root: hooks + split-panel layout + data derivation
  StepFocalView.tsx         # Right panel: step hero card + mark-done + navigation
  SectionNavigator.tsx      # Left panel: collapsible section list with step items
  StepMetadataRow.tsx       # Inline icon+text row for technique/tool/dilution/time
  PaintReadinessBanner.tsx  # Dismissible amber banner for missing paints
```

### Pattern 1: Root Composition with Prop Drilling
**What:** `PaintingModeView` composes all hooks at the top level and passes derived data down to children via props. No context providers needed for 5 components.
**When to use:** Small component trees (< 10 components) where prop drilling is clearer than context.
**Example:**
```typescript
// Source: GameDayPage.tsx pattern [VERIFIED: codebase]
export function PaintingModeView({ assignmentId, recipeId }: Props) {
  const state = usePaintingModeState(assignmentId, recipeId);
  const completeMutation = useCompleteStep();
  const { data: sections } = useRecipeSections(recipeId);
  // ... derive missingPaints, currentStep, currentSection
  
  if (state.isLoading) return <LoadingSkeleton />;
  if (state.orderedSteps.length === 0) return <EmptyState />;
  
  return (
    <div className="flex flex-col h-full">
      {showBanner && <PaintReadinessBanner ... onDismiss={...} />}
      <div className="flex flex-1 overflow-hidden">
        <SectionNavigator ... />
        <StepFocalView ... />
      </div>
    </div>
  );
}
```

### Pattern 2: Missing Paint Derivation
**What:** Derive missing paints by cross-referencing step paint_ids with the Paint objects from useRecipePaints, filtering for `owned !== 1`.
**When to use:** At mount time in PaintingModeView to populate PaintReadinessBanner.
**Example:**
```typescript
// Source: isPaintMissing in recipeSteps.ts [VERIFIED: codebase]
const missingPaints = useMemo(() => {
  const paintMap = new Map(paints.map(p => [p.paint_id, p]));
  return orderedSteps
    .filter(s => s.paint_id !== null)
    .map(s => paintMap.get(s.paint_id!))
    .filter(p => p && isPaintMissing(p))
    .filter((p, i, arr) => arr.findIndex(x => x?.id === p?.id) === i); // dedupe
}, [orderedSteps, paints]);
```

### Pattern 3: Mark Done with Auto-Advance
**What:** Mark Done calls useCompleteStep mutation then advances to next step on success.
**When to use:** StepFocalView Mark Done button click handler.

**Critical integration detail:** `useCompleteStep` requires a `CreateSessionInput` because the underlying `completeStepWithSession` always creates a session record alongside the step completion. For Phase 85 (before Phase 87 adds explicit session logging UI), pass a minimal session with 0-minute duration:
```typescript
// Source: useRecipeAssignments.ts CompleteStepVars type [VERIFIED: codebase]
const handleMarkDone = () => {
  completeMutation.mutate({
    assignmentId,
    unitId,
    recipeStepId: currentStep.id,
    session: {
      unit_id: unitId,
      session_date: new Date().toISOString().slice(0, 10),
      duration_minutes: 0,
      recipe_id: recipeId,
      recipe_step_id: currentStep.id,
      section_name: currentSection?.name ?? null,
      recipe_section_id: currentStep.section_id ?? null,
    },
  }, {
    onSuccess: () => goNext(),
  });
};
```

### Anti-Patterns to Avoid
- **Importing RecipeStepTimeline directly:** Different context (read-only timeline vs interactive execution). Scale up the patterns (swatch, metadata row) into new purpose-built components instead.
- **Using React Context for 5-component tree:** Prop drilling is simpler and more explicit here. Context adds indirection without benefit.
- **Fetching paint data separately in child components:** All data should flow from PaintingModeView root. Child components are pure presentation.
- **Using useToggleStepProgress instead of useCompleteStep:** The toggle hook only invalidates STEP_PROGRESS_KEY. useCompleteStep invalidates 6 keys (kanban, dashboard, etc.) as required by DL-03.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Scrollable panel | Custom scroll container | shadcn ScrollArea (or native overflow-y-auto) | Cross-platform scrollbar consistency |
| Collapsible sections | Manual show/hide with useState | shadcn Collapsible (Radix) | Accessible, animated, keyboard-navigable OOTB |
| Paint swatch circles | SVG circle component | CSS `backgroundColor` on rounded div | Existing pattern in RecipeStepTimeline, zero dependencies |
| Missing paint check | Custom ownership logic | `isPaintMissing()` from `recipeSteps.ts` | Already handles null/undefined/owned checks |

## Common Pitfalls

### Pitfall 1: useCompleteStep Requires Session Data
**What goes wrong:** Calling useCompleteStep without a valid CreateSessionInput causes a DB error. The function always inserts a painting_sessions row.
**Why it happens:** Phase 84 built the atomic transaction for the Phase 87 combined action. Phase 85 uses it for mark-done only.
**How to avoid:** Pass a minimal session with `duration_minutes: 0` and `session_date: todayISO()`. Phase 87 will add the UI for explicit session logging.
**Warning signs:** Runtime error on mark-done click; check that all required CreateSessionInput fields are provided.

### Pitfall 2: unitId Not Available from Hook Returns
**What goes wrong:** `useCompleteStep` requires `unitId` in its variables but `usePaintingModeState` does not return it. The root component receives `assignmentId` and `recipeId` as props but not `unitId`.
**Why it happens:** The navigation hook composes step/section/progress data but not assignment metadata.
**How to avoid:** Either (a) add `unitId` as a prop to `PaintingModeView`, or (b) query the assignment record to get unit_id. Option (a) is simpler since the parent route (Phase 86) will have assignment data including unit_id.
**Warning signs:** Missing unitId when constructing CompleteStepVars.

### Pitfall 3: Paint Data Shape Mismatch
**What goes wrong:** `useRecipePaints` returns `RecipeStep[]` (step rows with joined paint columns), not `Paint[]` objects. The paint hex_color, brand, name, and owned status are joined onto the step row.
**Why it happens:** The query module `getRecipePaintsByRecipe` joins recipe_steps with paints.
**How to avoid:** Access paint properties directly from the step objects returned by `useRecipePaints` / `usePaintingModeState.orderedSteps`. Do NOT expect a separate Paint object -- the step IS the paint carrier.
**Warning signs:** Undefined paint properties when trying to access a separate paint map.

### Pitfall 4: ScrollArea Not Installed
**What goes wrong:** Import error for `@/components/ui/scroll-area` since the component doesn't exist yet.
**Why it happens:** ScrollArea was never needed before this phase.
**How to avoid:** Add it as a Wave 0 / prerequisite task: `npx shadcn@latest add scroll-area`. Alternatively, use native `overflow-y-auto` and skip the install.
**Warning signs:** TypeScript import error at build time.

### Pitfall 5: Stale initialStepId After Mark Done
**What goes wrong:** After marking a step done, `initialStepId` in usePaintingModeState has empty deps array (mount-only). This is intentional -- navigation is controlled state after mount.
**Why it happens:** The hook uses `useState(initialStepId)` with `[]` deps to prevent re-computation on every progress update.
**How to avoid:** Use `goNext()` in the mark-done `onSuccess` callback to advance. Do NOT rely on initialStepId re-computing.
**Warning signs:** Step not advancing after mark-done.

### Pitfall 6: Section Name for Position Indicator
**What goes wrong:** The position indicator needs the current section name, but `sectionProgressMap` is keyed by section_id and the current step has `section_id` which may be null (unsectioned steps).
**Why it happens:** Unsectioned steps have `section_id === null` and need "General" as the display name.
**How to avoid:** Look up section name from `sections` array by matching `currentStep.section_id`. If null, display nothing or "General" per UI spec.
**Warning signs:** "undefined" appearing in position indicator text.

## Code Examples

### Current Step Data Access
```typescript
// Source: usePaintingModeState.ts + recipePaint.ts types [VERIFIED: codebase]
// orderedSteps contains RecipeStep objects with joined paint data available
// via useRecipePaints query. The step itself carries:
//   step.paint_id, step.step_name, step.technique, step.tool,
//   step.dilution, step.time_estimate_minutes, step.step_photo_path,
//   step.painting_phase, step.section_id, step.notes

const currentStep = orderedSteps.find(s => s.id === currentStepId);
// For paint display, need paint object from a separate lookup
```

### Paint Object Lookup Pattern
```typescript
// Source: RecipeStepTimeline.tsx paintMap pattern [VERIFIED: codebase]
// useRecipePaints returns RecipeStep[] -- steps with paint_id.
// To get Paint objects (hex_color, brand, name, owned), need usePaints or
// a paint map. RecipeStepTimeline receives paintMap: Map<number, Paint>.
// SectionedTimeline does the same.

// PaintingModeView needs to build this map from existing paint data.
// Option: useRecipePaintAvailability gives per-recipe stats but not per-step.
// The cleanest approach: pass the same paintMap pattern used by RecipeStepTimeline.
```

### Collapsible Section Pattern
```typescript
// Source: GameDayReadinessPanel.tsx Collapsible usage [VERIFIED: codebase]
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible";

<Collapsible defaultOpen={isCurrentSection}>
  <CollapsibleTrigger asChild>
    <button className="flex items-center justify-between w-full px-3 py-2">
      <span className="text-sm">{section.name}</span>
      <Badge variant="secondary">{completed}/{total}</Badge>
    </button>
  </CollapsibleTrigger>
  <CollapsibleContent>
    {sectionSteps.map(step => (
      <StepItem key={step.id} ... />
    ))}
  </CollapsibleContent>
</Collapsible>
```

### Loading State Pattern
```typescript
// Source: GameDayPage.tsx loading pattern [VERIFIED: codebase]
if (state.isLoading) {
  return (
    <div className="flex flex-col gap-4 p-6">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-64 w-full" />
      <Skeleton className="h-40 w-[280px]" />
    </div>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| recipe_paints table name | recipe_steps table (migration 012) | v0.2.5 | Type is RecipeStep, hook is still useRecipePaints |
| useToggleStepProgress (single cache key) | useCompleteStep (6 cache keys) | Phase 84 | Must use useCompleteStep for painting mode mark-done |
| Flat step ordering | Section-aware ordering (COALESCE) | Phase 84 | usePaintingModeState handles ordering |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | useRecipePaints returns RecipeStep[] with paint_id but NOT joined Paint objects -- a separate paint map is needed | Pitfall 3 | If paint data IS already joined, the paint lookup code is unnecessary overhead |
| A2 | ScrollArea can be installed via `npx shadcn@latest add scroll-area` without conflicts | Pitfall 4 | If install fails, fall back to native overflow-y-auto |
| A3 | Passing duration_minutes: 0 in the minimal session for Mark Done is acceptable and won't cause validation errors | Pitfall 1 | If the DB or business logic rejects 0-duration sessions, need a different approach |

## Open Questions

1. **Paint object access for step display**
   - What we know: `useRecipePaints` returns `RecipeStep[]`. `RecipeStepTimeline` receives a separate `paintMap: Map<number, Paint>`.
   - What's unclear: How does the caller build this paintMap? The Recipes detail page likely fetches all paints separately.
   - Recommendation: Check how RecipeDetailSheet builds its paintMap. PaintingModeView will need the same pattern -- likely `usePaints()` to get all paints, then build Map.

2. **unitId availability**
   - What we know: `useCompleteStep` needs `unitId`. PaintingModeView receives `assignmentId` + `recipeId` per D-18.
   - What's unclear: Whether to add `unitId` as a third prop or derive it from an assignment query.
   - Recommendation: Add `unitId` as a prop -- simpler, avoids extra query. Phase 86 route will have this from URL params or assignment lookup.

3. **Step photo asset URL resolution**
   - What we know: `RecipeStepTimeline` receives `stepPhotoUrls?: Map<number, string>` for `asset://` URLs. Steps store `step_photo_path` as a relative path.
   - What's unclear: How asset URLs are resolved from paths. The Tauri asset protocol converts filesystem paths.
   - Recommendation: Check how the recipe detail view resolves photo paths to asset URLs. Replicate the same pattern.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4 + React Testing Library 16 |
| Config file | `vitest.config.ts` |
| Quick run command | `pnpm test -- tests/painting-mode/` |
| Full suite command | `pnpm test` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SE-01 | Step detail renders paint swatch, technique, tool, dilution, time | unit | `pnpm test -- tests/painting-mode/StepFocalView.test.tsx` | Wave 0 |
| SE-02 | Mark Done button completes step and advances | unit | `pnpm test -- tests/painting-mode/PaintingModeView.test.tsx` | Wave 0 |
| SE-03 | Previous/Next navigation works | unit | `pnpm test -- tests/painting-mode/StepFocalView.test.tsx` | Wave 0 |
| SE-04 | Position indicator shows correct step/section | unit | `pnpm test -- tests/painting-mode/StepFocalView.test.tsx` | Wave 0 |
| SE-05 | Reference photo shows when present, hidden when absent | unit | `pnpm test -- tests/painting-mode/StepFocalView.test.tsx` | Wave 0 |
| SP-01 | Section list shows completed/total counts | unit | `pnpm test -- tests/painting-mode/SectionNavigator.test.tsx` | Wave 0 |
| SP-02 | Current section is highlighted | unit | `pnpm test -- tests/painting-mode/SectionNavigator.test.tsx` | Wave 0 |
| SP-03 | Jump to step from navigator | unit | `pnpm test -- tests/painting-mode/SectionNavigator.test.tsx` | Wave 0 |
| SP-04 | Optional sections show badge | unit | `pnpm test -- tests/painting-mode/SectionNavigator.test.tsx` | Wave 0 |
| PR-01 | Missing paint banner shown at entry | unit | `pnpm test -- tests/painting-mode/PaintReadinessBanner.test.tsx` | Wave 0 |
| PR-02 | Banner is dismissible | unit | `pnpm test -- tests/painting-mode/PaintReadinessBanner.test.tsx` | Wave 0 |
| PR-03 | Paintless steps have no false warnings | unit | `pnpm test -- tests/painting-mode/PaintReadinessBanner.test.tsx` | Wave 0 |
| PX-01 | Distraction-free layout classes applied | unit | `pnpm test -- tests/painting-mode/PaintingModeView.test.tsx` | Wave 0 |

### Sampling Rate
- **Per task commit:** `pnpm test -- tests/painting-mode/`
- **Per wave merge:** `pnpm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/painting-mode/StepFocalView.test.tsx` -- covers SE-01, SE-03, SE-04, SE-05
- [ ] `tests/painting-mode/SectionNavigator.test.tsx` -- covers SP-01, SP-02, SP-03, SP-04
- [ ] `tests/painting-mode/PaintReadinessBanner.test.tsx` -- covers PR-01, PR-02, PR-03
- [ ] `tests/painting-mode/PaintingModeView.test.tsx` -- covers SE-02, PX-01 (root integration)
- [ ] `src/components/ui/scroll-area.tsx` -- install via shadcn CLI

## Security Domain

This phase involves no authentication, session management, access control, cryptography, or external input handling. All data comes from the local SQLite database via parameterized queries (already enforced by the data layer). No user-facing text inputs are introduced (mark-done is a button click, navigation is click-based).

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | n/a |
| V3 Session Management | no | n/a |
| V4 Access Control | no | n/a |
| V5 Input Validation | no | No user text input in this phase |
| V6 Cryptography | no | n/a |

## Sources

### Primary (HIGH confidence)
- `src/hooks/usePaintingModeState.ts` -- Hook API surface, return types, navigation functions
- `src/hooks/useRecipeAssignments.ts` -- useCompleteStep mutation signature, CompleteStepVars type, cache invalidation keys
- `src/db/queries/recipeAssignments.ts` -- completeStepWithSession function signature, CreateSessionInput requirement
- `src/features/game-day/GameDayPage.tsx` -- Full-page layout pattern (flex col h-full)
- `src/features/game-day/GameDayReadinessPanel.tsx` -- Collapsible + warning panel pattern
- `src/features/recipes/RecipeStepTimeline.tsx` -- Paint swatch dot, metadata row, photo thumbnail pattern
- `src/features/recipes/SectionedTimeline.tsx` -- Section grouping with headers and step counts
- `src/types/recipePaint.ts` -- RecipeStep interface (all available fields)
- `src/types/recipeSection.ts` -- RecipeSection interface (optional field, section_type)
- `src/types/paintingSession.ts` -- CreateSessionInput interface (required fields)
- `src/types/paint.ts` -- Paint interface (owned field, hex_color)
- `src/components/ui/` -- Verified installed components (Button, Badge, Collapsible, Skeleton, Tooltip)

### Secondary (MEDIUM confidence)
- `.planning/phases/85-core-execution-ui/85-UI-SPEC.md` -- Layout contract, spacing, typography, interaction contract
- `.planning/phases/85-core-execution-ui/85-CONTEXT.md` -- All 18 locked decisions (D-01 through D-18)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all libraries verified in codebase, only ScrollArea is new (standard shadcn component)
- Architecture: HIGH -- follows established GameDayPage pattern, all hooks verified with exact signatures
- Pitfalls: HIGH -- identified through direct code reading (session requirement, unitId gap, paint data shape)

**Research date:** 2026-05-19
**Valid until:** 2026-06-19 (stable -- no external dependencies, all patterns are internal codebase patterns)
