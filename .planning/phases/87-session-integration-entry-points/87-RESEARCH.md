# Phase 87: Session Integration + Entry Points - Research

**Researched:** 2026-05-19
**Domain:** React component wiring, Sheet pattern, TanStack Router navigation, form prefill
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Session logger opens as a Sheet/drawer when user taps "Done + Log Session" — reuses the existing Sheet pattern
- **D-02:** Sheet is prefilled with current unit, recipe, section, and step from painting mode context
- **D-03:** Painting mode gets its own lightweight variant that calls `completeStepWithSession` atomically
- **D-04:** Primary action is "Mark Done" (standalone, no session logging) — fast path
- **D-05:** "Done + Log Session" is a secondary action adjacent to "Mark Done" (split button or separate secondary button)
- **D-06:** Both actions use the same `completeStepWithSession` DB function — standalone passes null/empty session fields, combined passes user-entered values
- **D-07:** Each entry point navigates to `/bare-layout/painting-mode/$assignmentId`
- **D-08:** NextPaintingActionCard — change existing `/painting-projects` link to painting mode link using `data.assignment_id`
- **D-09:** CurrentFocusCard — add a "Paint" button/link navigating to painting mode for focused unit's assignment
- **D-10:** Unit Detail applied recipe panel — add a "Start Painting" / "Continue" action on each applied recipe row
- **D-11:** Kanban card — add painting mode link on enriched cards that have an applied recipe
- **D-12:** RecipeDetailSheet — when recipe is applied to a unit, show a "Paint" action linking to painting mode
- **D-13:** Empty state: show "This unit doesn't have a painting recipe applied yet" with CTA to unit detail
- **D-14:** Entry point surfaces should NOT show a painting mode link when there is no applied recipe

### Claude's Discretion

- Exact button styling, icon choices, and micro-copy for entry point CTAs
- Whether "Done + Log" uses a split button or two separate buttons (pick whichever fits the existing StepFocalView layout best)
- Session logger sheet field order and optional field hints

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SL-01 | User can open Log Session prefilled with current unit, recipe, section, and step | `usePaintingModeState` + `currentStep` + `sectionName` already computed in PaintingModePage; pass as props to a new `PaintingSessionSheet` |
| SL-02 | User can mark step done + log session in one atomic action | `completeStepWithSession` already handles both writes in one transaction; page-level handler passes user-entered duration/notes |
| SL-03 | Mark step done is available as a standalone action without session logging | Existing `handleMarkDone` already works; needs to remain as primary button in StepFocalView |
| EP-01 | User can open Painting Mode from Dashboard NextPaintingActionCard | `data.assignment_id` already on `FirstIncompleteStep`; change Link destination |
| EP-02 | User can open Painting Mode from CurrentFocusCard | `primaryAssignment.id` already computed in DashboardPage; add `onPaint` prop + button |
| EP-03 | User can open Painting Mode from Unit Detail / Applied Recipe panel | `assignment.id` available in `AppliedRecipesTab`; add a button per row |
| EP-04 | User can open Painting Mode from Painting Projects Kanban | Kanban enrichment fetches assignments; need assignment ID per card — requires `assignmentIds` map in `KanbanEnrichment` |
| EP-05 | User can open Painting Mode from Recipe Detail (when applied to a unit) | `useAssignmentsByRecipe` hook exists; RecipeDetailSheet needs to query and show per-unit "Paint" links |
| EP-06 | Empty/missing recipe states explain what to do next | Safety net shown when route is accessed with no applied recipe; also guarded at entry point surfaces |
</phase_requirements>

## Summary

Phase 87 is a pure wiring phase: no new DB migrations, no new query functions, and no new React Query hooks needed. All the heavy lifting — the atomic `completeStepWithSession` transaction, the `useCompleteStep` mutation, the `usePaintingModeState` hook, and the `/bare-layout/painting-mode/$assignmentId` route — was built in phases 84–86. What remains is (1) adding a lightweight session-logger Sheet inside painting mode that prefills from live context, (2) wiring two action buttons in `StepFocalView` (standalone "Mark Done" and secondary "Done + Log Session"), and (3) adding painting mode navigation links across five existing surfaces.

The most architecturally significant decision is how to expose `assignment_id` on the Kanban entry point (EP-04). `KanbanEnrichment` currently returns `recipeNames`, `photoCounts`, and `appliedProgress` — it does NOT return assignment IDs. The `appliedProgress` map is keyed on `unit_id` but does not carry `assignmentId`. This gap must be closed by adding `assignmentIds: Map<number, number>` to `KanbanEnrichment`, populated via the same `getAssignmentsByUnit` query that already runs there. This is a targeted addition with zero schema or migration impact.

The RecipeDetailSheet (EP-05) already calls `useAssignmentsByRecipe` — wait, it does not. It imports `useAssignmentsByUnit` inside `LogSessionSheet`, but `RecipeDetailSheet` itself does not query assignments. To show per-unit "Paint" links, RecipeDetailSheet needs to call `useAssignmentsByRecipe(recipe?.id)` (hook already exists in `useRecipeAssignments.ts`) and render one button per assignment result.

**Primary recommendation:** Build in two plans: Plan 1 covers the session logger Sheet + StepFocalView button wiring (SL-01, SL-02, SL-03); Plan 2 covers all five entry point surfaces and empty states (EP-01 through EP-06).

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Session logger Sheet (prefilled) | Frontend / UI | — | Form + Sheet component; data already in memory via `usePaintingModeState` |
| Atomic step + session write | DB query layer | React Query mutation | `completeStepWithSession` + `useCompleteStep` already exist |
| "Mark Done" / "Done + Log" buttons | UI component (StepFocalView) | Page handler (PaintingModePage) | Buttons in view, handlers lifted to page |
| Entry point navigation | UI component (each surface) | — | Each surface calls `useNavigate` or renders a `Link`; no backend change |
| Assignment ID on Kanban enrichment | DB query layer | React Query hook | `KanbanEnrichment` struct extension; one extra field per unit |
| EP-06 empty state | UI component (PaintingModePage) | — | Route-level guard when no assignment found |

## Standard Stack

### Core (all already installed — no new packages)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@tanstack/react-router` | installed | Navigation to painting mode route | App router; `useNavigate` + `Link` |
| `react-hook-form` | installed | Session logger form | Established form pattern (see `LogSessionSheet`) |
| `@hookform/resolvers` + `zod` | installed | Form validation schema | App-wide schema pattern |
| `sonner` | installed | Toast on success/error | App-wide notification pattern |
| shadcn/ui `Sheet`, `Button`, `Input` | installed | Session logger Sheet UI | App-wide component set |

### No New Packages

This phase installs zero new npm packages. All dependencies are already present.

## Package Legitimacy Audit

No new packages are being installed in this phase. Section not applicable.

## Architecture Patterns

### System Architecture Diagram

```
PaintingModePage
  ├── usePaintingModeState(assignmentId, recipeId)
  │     └── → orderedSteps, currentStepId, completedSet
  ├── useCompleteStep() mutation
  ├── handleMarkDone()          ← standalone path (D-04, SL-03)
  ├── [NEW] handleMarkDoneWithSession(duration, notes)  ← combined path (D-05, SL-02)
  │     └── calls completeStepWithSession atomically
  ├── PaintingModeView
  │     └── StepFocalView
  │           ├── [KEEP] "Mark Done" button → handleMarkDone (primary)
  │           └── [NEW] "Done + Log Session" button → opens PaintingSessionSheet
  └── [NEW] PaintingSessionSheet (open state owned by PaintingModePage)
        ├── prefilled: unit_id, recipe_id, section_name, recipe_section_id, step_id
        ├── user-editable: duration_minutes, notes
        └── onSubmit → handleMarkDoneWithSession(duration, notes)

Entry point surfaces (no data layer changes except KanbanEnrichment):
  NextPaintingActionCard    → Link to /painting-mode/${data.assignment_id}
  CurrentFocusCard          → new onPaint prop → useNavigate in DashboardPage
  AppliedRecipesTab         → "Start Painting" button per row → useNavigate
  KanbanCard                → painting mode button when assignmentId available
  RecipeDetailSheet         → useAssignmentsByRecipe() → "Paint" per applied unit
```

### Recommended Project Structure

```
src/features/painting-mode/
  PaintingModeView.tsx       (exists — no change)
  StepFocalView.tsx          (exists — ADD onMarkDoneWithSession prop)
  SectionNavigator.tsx       (exists — no change)
  PaintReadinessBanner.tsx   (exists — no change)
  StepMetadataRow.tsx        (exists — no change)
  PaintingSessionSheet.tsx   [NEW] lightweight session logger
  paintingSessionSchema.ts   [NEW] zod schema (duration_minutes, notes only)

src/app/painting-mode/
  page.tsx                   (exists — ADD sheet state + handleMarkDoneWithSession)

src/features/painting-projects/
  KanbanCard.tsx             (exists — ADD assignmentId prop + paint button)
  KanbanBoard.tsx            (exists — pass assignmentId from enrichment)

src/hooks/
  useKanbanEnrichment.ts     (exists — ADD assignmentIds: Map<number, number>)
```

### Pattern 1: Lightweight Session Logger Sheet (PaintingSessionSheet)

The full `LogSessionSheet` has unit/recipe/step pickers — all unnecessary in painting mode because those values are already known from context. The new sheet has only two user-editable fields:

```typescript
// Source: [ASSUMED] — derived from LogSessionSheet.tsx pattern in codebase
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { paintingSessionSchema, type PaintingSessionFormValues } from "./paintingSessionSchema";

interface PaintingSessionSheetProps {
  open: boolean;
  onClose: () => void;
  // Prefilled from painting mode context — read-only display only
  unitName: string;
  recipeName: string;
  stepName: string;
  sectionName: string | null;
  // Submission handler (already has all context; just needs duration + notes)
  onSubmit: (duration: number, notes: string | null) => void;
  isPending: boolean;
}
```

**Schema (paintingSessionSchema.ts):**
```typescript
// Source: [ASSUMED] — modeled on logSessionSchema.ts in codebase
export const paintingSessionSchema = z.object({
  duration_minutes: z.number().int().positive().max(1440),
  notes: z.string().max(2000).nullable(),
});
export type PaintingSessionFormValues = z.infer<typeof paintingSessionSchema>;
```

### Pattern 2: StepFocalView Button Pair (D-04, D-05)

Current `StepFocalView` has one full-width "Mark Done" button at position 7. New layout: keep "Mark Done" as primary button, add "Done + Log Session" as a smaller secondary button below or beside it. Two separate buttons (not a split button) fits the existing layout best — split buttons require additional UI complexity not present in the app's component set.

```typescript
// Source: [ASSUMED] — derived from existing StepFocalView.tsx props pattern
export interface StepFocalViewProps {
  // ... existing props ...
  onMarkDone: () => void;           // existing
  onMarkDoneWithSession: () => void; // new — opens sheet
}
```

The `onMarkDoneWithSession` callback is owned by `PaintingModePage`, which controls the `PaintingSessionSheet` open state.

### Pattern 3: Entry Point Navigation (TanStack Router)

All entry points navigate to the same route. Two patterns in use in the codebase:

**Link component (read-only cards like NextPaintingActionCard):**
```typescript
// Source: [ASSUMED] — derived from existing Link usage in NextPaintingActionCard.tsx
import { Link } from "@tanstack/react-router";
<Link to="/painting-mode/$assignmentId" params={{ assignmentId: String(data.assignment_id) }}>
  Start Painting
</Link>
```

**useNavigate hook (interactive cards with existing callbacks):**
```typescript
// Source: [ASSUMED] — derived from existing useNavigate usage in RecipeDetailSheet.tsx
const navigate = useNavigate();
const handlePaint = (assignmentId: number) => {
  navigate({ to: "/painting-mode/$assignmentId", params: { assignmentId: String(assignmentId) } });
};
```

Note: `RecipeDetailSheet` already imports and uses `useNavigate` for its "Linked Unit" navigation — this pattern is already established in that file.

### Pattern 4: KanbanEnrichment Extension (EP-04)

`useKanbanEnrichment` runs `getAssignmentsByUnit` for every active unit to compute `appliedProgress`. The `primary` assignment is already fetched (`assignments[assignments.length - 1]`). Adding `assignmentId` to the result costs nothing extra — it is already in memory:

```typescript
// Source: [ASSUMED] — derived from useKanbanEnrichment.ts
export interface KanbanEnrichment {
  recipeNames: Map<number, string>;
  photoCounts: Map<number, number>;
  appliedProgress: Map<number, AppliedRecipeProgress>;
  assignmentIds: Map<number, number>;  // unit_id → primary assignment id [NEW]
}

// In queryFn, after computing appliedProgressMap:
const assignmentIdsMap = new Map<number, number>();
// primary is already fetched per unit — just record its id:
assignmentIdsMap.set(unitId, primary.id);
```

`KanbanColumn` must forward the `assignmentIds` map to `KanbanCard`. `KanbanCard` renders a painting mode link only when `assignmentIds.get(unit.id)` is defined (D-14).

### Pattern 5: RecipeDetailSheet Applied Units (EP-05)

`RecipeDetailSheet` already queries sessions via `useSessionsByRecipe`. It has `useUnits()` data for `unitMap`. The addition:

```typescript
// Source: [ASSUMED] — derived from RecipeDetailSheet.tsx + useRecipeAssignments.ts
import { useAssignmentsByRecipe } from "@/hooks/useRecipeAssignments";
const { data: assignments = [] } = useAssignmentsByRecipe(recipe?.id);

// In JSX, render per-assignment "Paint" button:
{assignments.map((a) => (
  <Button key={a.id} variant="outline" size="sm" onClick={() => navigate({
    to: "/painting-mode/$assignmentId",
    params: { assignmentId: String(a.id) }
  })}>
    Paint {unitMap.get(a.unit_id) ?? "unit"}
  </Button>
))}
```

### Anti-Patterns to Avoid

- **Nesting sheets inside other sheets:** The `PaintingSessionSheet` must be rendered as a sibling of `PaintingModeView`, not nested inside `StepFocalView`. The painting mode page controls the sheet's open state.
- **Passing session fields through multiple component layers:** The page already has `unitId`, `recipeId`, `sectionName`, `currentStep.section_id` in scope. The submit handler in the page builds the full `CreateSessionInput` from these locals — no need to thread them through `PaintingModeView` and `StepFocalView`.
- **Calling `useNavigate` inside `KanbanCard`:** KanbanCard is inside a DnD sortable context. Adding navigation via callback prop (already the pattern for `onLogSession`) is cleaner than adding a router hook.
- **Adding unnecessary form fields to PaintingSessionSheet:** The existing `LogSessionSheet` has unit picker, recipe picker, step picker, section picker, status updater, and date. None of those are needed here — context is known. Only `duration_minutes` and `notes` are user-editable.
- **Showing painting mode link when no assignment exists:** D-14 requires guarding all entry point CTAs — only render the link when `assignmentId` is defined/non-null.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Atomic step + session write | Custom transaction logic | `completeStepWithSession()` + `useCompleteStep()` | Already built with proper BEGIN/COMMIT/ROLLBACK in Phase 84 |
| Session form validation | Custom validation | `zod` + `react-hook-form` + `zodResolver` | Same pattern as `logSessionSchema.ts` + `LogSessionSheet.tsx` |
| Sheet/drawer UI | Custom modal | shadcn/ui `Sheet` | Established app-wide pattern; all forms in app use it |
| Toast notifications | Custom notification | `sonner` toast | `toast.success()` / `toast.error()` pattern used everywhere |
| Navigation to painting mode | Custom router | `useNavigate` / `Link` from `@tanstack/react-router` | Already used in `RecipeDetailSheet.tsx` and other surfaces |

## Common Pitfalls

### Pitfall 1: Sibling Sheet Contract

**What goes wrong:** Rendering `PaintingSessionSheet` inside `StepFocalView` or `PaintingModeView` causes it to unmount on re-render when step changes.
**Why it happens:** `PaintingModeView` re-renders on every step navigation; nested sheets lose their open state.
**How to avoid:** Declare `PaintingSessionSheet` as a sibling at the `PaintingModePage` level, same pattern as `LogSessionSheet` in `DashboardPage`.
**Warning signs:** Sheet closes immediately when step navigation happens while sheet is open.

### Pitfall 2: Keyboard Shortcuts Not Disabled During Session Entry

**What goes wrong:** Space bar fires `handleMarkDone` while user types in the duration input of `PaintingSessionSheet`.
**Why it happens:** `react-hotkeys-hook` disables shortcuts when focus is on HTMLInputElement — but only if the shortcut uses `enableOnFormTags: false` (the default). This should work automatically.
**How to avoid:** The existing keyboard shortcut setup in `PaintingModePage` already guards on input focus (PX-05, verified in Phase 86). Verify that `enabled` flag or form tag detection covers the sheet's inputs. If the sheet inputs are inside an `HTMLInputElement`, shortcuts are already blocked by default behavior.
**Warning signs:** Step completes unexpectedly while user types a number in the duration field.

### Pitfall 3: Assignment ID Not Available on NextPaintingActionCard

**What goes wrong:** `NextPaintingActionCard` has `data.assignment_id` but the route expects a string param.
**Why it happens:** `FirstIncompleteStep` type (returned by `getMostRecentAssignmentWithIncompleteStep`) includes `assignment_id: number`. TanStack Router's `$assignmentId` path param is a string.
**How to avoid:** Always wrap in `String(data.assignment_id)` when constructing the `params` object for `Link` or `navigate`.
**Warning signs:** TypeScript error on `params.assignmentId` expecting string vs receiving number.

### Pitfall 4: KanbanColumn Missing assignmentIds Prop

**What goes wrong:** `KanbanCard` receives `undefined` for `assignmentId` and never shows the paint button.
**Why it happens:** `KanbanBoard` passes data from enrichment down through `KanbanColumn` to `KanbanCard` — all three components need the new prop threaded through.
**How to avoid:** Update `KanbanColumn.tsx` interface and render to forward `assignmentIds` map to each `KanbanCard`.
**Warning signs:** Paint button never appears on any kanban card even when units have assignments.

### Pitfall 5: RecipeDetailSheet Assignments Query Enabled Guard

**What goes wrong:** `useAssignmentsByRecipe` fires with `undefined` recipe id when sheet is closed.
**Why it happens:** `recipe` prop is `null` when sheet is closed; `recipe?.id` is `undefined`.
**How to avoid:** The hook already has `enabled: recipeId !== undefined` guard. Pass `recipe?.id` — the hook handles undefined correctly.
**Warning signs:** Network/DB calls to assignments query when sheet is closed (check React Query devtools).

### Pitfall 6: handleMarkDone vs handleMarkDoneWithSession both call state.goNext()

**What goes wrong:** If both handlers call `state.goNext()` in `onSuccess`, the step advances twice or there is a race condition.
**Why it happens:** The combined "Done + Log Session" path closes the sheet AND advances the step — but `onSuccess` is called once, so it should only advance once.
**How to avoid:** Both handlers use `onSuccess: () => state.goNext()` in the mutation's `onSuccess` callback — this is the single source of truth. The sheet's `onClose` does NOT call `goNext`.

## Code Examples

### Prefill Values for PaintingSessionSheet

```typescript
// Source: [ASSUMED] — derived from PaintingModePage page.tsx existing context
// In PaintingModePage, all these values are already in scope:

const currentStep = state.orderedSteps.find((s) => s.id === state.currentStepId);
const sectionName = currentStep?.section_id
  ? (sections.find((s) => s.id === currentStep.section_id)?.name ?? null)
  : null;
// assignment.unit_id, assignment.recipe_id, recipeId — all already bound

// handleMarkDoneWithSession is called from PaintingSessionSheet onSubmit:
function handleMarkDoneWithSession(duration: number, notes: string | null) {
  if (!currentStep || !assignment) return;
  completeMutation.mutate(
    {
      assignmentId,
      unitId,
      recipeStepId: currentStep.id,
      session: {
        unit_id: unitId,
        session_date: todayISO(),
        duration_minutes: duration,
        notes: notes ?? null,
        recipe_id: recipeId,
        recipe_step_id: currentStep.id,
        section_name: sectionName,
        recipe_section_id: currentStep.section_id ?? null,
      },
    },
    { onSuccess: () => { setPaintingSessionOpen(false); state.goNext(); } },
  );
}
```

### CurrentFocusCard Entry Point

```typescript
// Source: [ASSUMED] — derived from CurrentFocusCard.tsx + DashboardPage.tsx

// In CurrentFocusCardProps (add onPaint):
onPaint?: () => void;

// In DashboardPage.tsx, wire to navigate:
onPaint={() => {
  if (primaryAssignment) {
    navigate({ to: "/painting-mode/$assignmentId", params: { assignmentId: String(primaryAssignment.id) } });
  }
}}

// Render condition in CurrentFocusCard (D-14):
{onPaint && (
  <Button variant="ghost" size="sm" onClick={onPaint}>
    <Palette size={14} className="mr-1.5" /> Paint
  </Button>
)}
```

### EP-06 Empty State in PaintingModePage

The `PaintingModePage` currently shows "Assignment not found" when `assignment` is null (after loading). This is correct for invalid IDs. EP-06 is about the case where the user has no recipe applied — but that cannot happen via `assignment_id` routing because the route always receives a valid assignment ID from the entry point. The true EP-06 guard is **at the entry points** (D-14): don't show the Paint button when there's no assignment. The existing "no steps in this recipe" empty state in `PaintingModeView` already handles the edge case where an assignment exists but the recipe has zero steps.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Standalone LogSessionSheet with all pickers | Lightweight PaintingSessionSheet with only duration + notes | Phase 87 (new) | Faster UX — context already known |
| No painting mode links on entry surfaces | Direct navigation from 5 surfaces | Phase 87 (new) | Painting Mode is reachable from natural user flows |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | TanStack Router `Link` accepts `params` object with string values for dynamic segments | Code Examples | TypeScript would catch this at build time; fix is trivial |
| A2 | `useAssignmentsByRecipe` is already exported from `useRecipeAssignments.ts` (verified in codebase read) | Architecture Patterns, Pattern 5 | No risk — VERIFIED by reading the file |
| A3 | `react-hotkeys-hook` default behavior blocks shortcuts when HTMLInputElement is focused (verified in existing Phase 86 tests) | Common Pitfalls | No risk — test PX-05 verifies this behavior already |
| A4 | Extending `KanbanEnrichment` interface to add `assignmentIds` does not break existing callers since TypeScript structural typing means new optional-like fields added as required would require updating all consumers | Architecture Patterns, Pattern 4 | Must update KanbanColumn and KanbanCard prop types in the same PR to avoid compile errors |
| A5 | `PaintingSessionSheet` needs `isPending` prop to disable submit button while mutation is in-flight | Standard Stack | Low risk — same pattern as all other mutation-backed sheets |

If this table is non-empty: claims A2 and A3 were directly verified in the codebase. Claims A1, A4, A5 are patterns consistent with the codebase but not individually confirmed by tool output.

## Open Questions (RESOLVED)

1. **Should CurrentFocusCard always show the Paint button, or only when `appliedProgress` is present?**
   - What we know: `primaryAssignment` is computed in `DashboardPage` and is `undefined` when no assignments exist. `onPaint` prop can be conditionally set.
   - What's unclear: The decision doc says "add a Paint button/link that navigates to painting mode for the focused unit's assignment" — but a focused unit might have no assignment.
   - RESOLVED: Follow D-14 — only pass `onPaint` to `CurrentFocusCard` when `primaryAssignment !== undefined`. Card renders the button only when `onPaint` is provided.

2. **EP-06 exact rendering location**
   - What we know: The route guard for assignment-not-found already exists in `PaintingModePage`. A truly "no recipe applied" scenario can only happen if someone navigates to the URL directly with a valid assignment ID for an assignment whose recipe has no steps.
   - What's unclear: CONTEXT.md D-13 says "when painting mode route is accessed for a unit with no applied recipe" — but the route is always accessed VIA an assignment ID, meaning an applied recipe exists by definition.
   - RESOLVED: The D-13 empty state is the **entry point guard** (D-14) plus the existing "No steps in this recipe" state in `PaintingModeView`. No new route-level empty state is needed for "no recipe" beyond what already exists.

## Environment Availability

Step 2.6: SKIPPED — no external dependencies. This phase is entirely code/component wiring within the existing Tauri + React stack. No new runtimes, CLIs, databases, or services are required.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4 + React Testing Library 16 |
| Config file | `vite.config.ts` (vitest section) |
| Quick run command | `pnpm test -- tests/painting-mode/` |
| Full suite command | `pnpm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SL-01 | PaintingSessionSheet opens prefilled with unit/recipe/section/step context | unit | `pnpm test -- tests/painting-mode/PaintingSessionSheet.test.tsx` | No — Wave 0 |
| SL-02 | "Done + Log Session" calls `completeStepWithSession` with user-entered duration+notes | unit | `pnpm test -- tests/painting-mode/PaintingModePage.test.tsx` | Yes — extend existing |
| SL-03 | "Mark Done" standalone does not open sheet or pass non-zero duration | unit | `pnpm test -- tests/painting-mode/StepFocalView.test.tsx` | Yes — extend existing |
| EP-01 | NextPaintingActionCard link points to painting mode route | unit | `pnpm test -- tests/painting-mode/entryPoints.test.tsx` | No — Wave 0 |
| EP-02 | CurrentFocusCard "Paint" button triggers navigation | unit | `pnpm test -- tests/painting-mode/entryPoints.test.tsx` | No — Wave 0 |
| EP-03 | AppliedRecipesTab shows "Start Painting" button per assignment | unit | `pnpm test -- tests/painting-mode/entryPoints.test.tsx` | No — Wave 0 |
| EP-04 | KanbanCard shows painting mode link when assignmentId available | unit | `pnpm test -- tests/painting-mode/entryPoints.test.tsx` | No — Wave 0 |
| EP-05 | RecipeDetailSheet shows "Paint" link for applied units | unit | `pnpm test -- tests/painting-mode/entryPoints.test.tsx` | No — Wave 0 |
| EP-06 | Entry point surfaces suppress paint link when no assignment | unit | `pnpm test -- tests/painting-mode/entryPoints.test.tsx` | No — Wave 0 |

### Sampling Rate

- **Per task commit:** `pnpm test -- tests/painting-mode/`
- **Per wave merge:** `pnpm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `tests/painting-mode/PaintingSessionSheet.test.tsx` — covers SL-01 (sheet renders prefilled fields)
- [ ] `tests/painting-mode/entryPoints.test.tsx` — covers EP-01 through EP-06 (one describe block per surface, mocking hooks)

*(Existing test files `PaintingModePage.test.tsx` and `StepFocalView.test.tsx` will be extended for SL-02 and SL-03 within plan tasks.)*

## Security Domain

This phase adds no authentication, session management, access control, cryptography, or external input surfaces beyond what already exists. No ASVS categories are newly applicable. The only user input is `duration_minutes` (number, validated by Zod `z.number().int().positive().max(1440)`) and `notes` (string, validated by `z.string().max(2000).nullable()`). Both pass through the existing `completeStepWithSession` parameterized query — no SQL injection surface.

## Sources

### Primary (HIGH confidence — verified from codebase)

- `src/db/queries/recipeAssignments.ts` — `completeStepWithSession`, `getStepProgress`, `getAssignmentsByUnit`, `getAssignmentsByRecipe`
- `src/hooks/useRecipeAssignments.ts` — `useCompleteStep`, `useAssignmentsByRecipe`, cache key constants
- `src/hooks/usePaintingModeState.ts` — returned state shape, what context is in scope
- `src/app/painting-mode/page.tsx` — `handleMarkDone` pattern, `useHotkeys` guards, state shape
- `src/features/painting-mode/StepFocalView.tsx` — existing button layout and props interface
- `src/features/painting-mode/PaintingModeView.tsx` — `onMarkDone` prop thread
- `src/features/dashboard/LogSessionSheet.tsx` — reference for form field layout and RHF+Zod pattern
- `src/features/dashboard/logSessionSchema.ts` — schema pattern for session fields
- `src/features/dashboard/NextPaintingActionCard.tsx` — current Link target + `data.assignment_id` field
- `src/features/dashboard/CurrentFocusCard.tsx` — props interface + button slot
- `src/features/dashboard/DashboardPage.tsx` — `primaryAssignment` is computed; sibling sheet pattern
- `src/features/painting-projects/KanbanCard.tsx` — existing props and structure
- `src/features/painting-projects/KanbanBoard.tsx` — how enrichment is threaded to columns
- `src/hooks/useKanbanEnrichment.ts` — current `KanbanEnrichment` interface and `primary` assignment already fetched
- `src/features/recipes/RecipeDetailSheet.tsx` — `useNavigate` already imported; `units` and `unitMap` already in scope
- `src/features/units/AppliedRecipesTab.tsx` — `assignment.id` available per row
- `src/app/router.tsx` — route path `/painting-mode/$assignmentId` under `bareLayoutRoute`
- `tests/painting-mode/PaintingModePage.test.tsx` — mock patterns for testing this feature area
- `.planning/phases/87-session-integration-entry-points/87-CONTEXT.md` — locked decisions

### Secondary (MEDIUM confidence)

- `src/features/painting-projects/KanbanColumn.tsx` — props forwarding pattern (not read in full but structure inferred from KanbanBoard.tsx)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new packages, all existing
- Architecture: HIGH — all referenced files read directly from codebase
- Pitfalls: HIGH — derived from codebase-specific patterns and existing test evidence
- Entry point gaps (EP-04 KanbanEnrichment extension): HIGH — `assignmentIds` field addition directly traced to existing `primary.id` variable in `useKanbanEnrichment.ts`

**Research date:** 2026-05-19
**Valid until:** Stable — no fast-moving external dependencies
