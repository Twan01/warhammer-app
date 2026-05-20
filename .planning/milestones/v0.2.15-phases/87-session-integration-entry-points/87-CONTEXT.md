# Phase 87: Session Integration + Entry Points - Context

**Gathered:** 2026-05-19
**Status:** Ready for planning

<domain>
## Phase Boundary

Wire the atomic "Done + Log Session" action with user-visible session fields (duration, notes) in painting mode, provide a standalone "Mark Done" that skips session logging, and connect all six entry points (Dashboard NextPaintingActionCard, CurrentFocusCard, Unit Detail applied recipe panel, Kanban card, Recipe Detail sheet, plus empty-state handling) to the painting mode route.

</domain>

<decisions>
## Implementation Decisions

### Session Logger UX (SL-01, SL-02)
- **D-01:** Session logger opens as a Sheet/drawer when user taps "Done + Log Session" — reuses the existing Sheet pattern consistent with the rest of the app
- **D-02:** Sheet is prefilled with current unit, recipe, section, and step from painting mode context — user only needs to optionally add duration and notes
- **D-03:** The existing `LogSessionSheet.tsx` in dashboard is the reference for field layout (duration_minutes, notes) but painting mode gets its own lightweight variant that calls `completeStepWithSession` atomically rather than creating a standalone session

### Mark Done vs Done + Log (SL-02, SL-03)
- **D-04:** Primary action is "Mark Done" (standalone, no session logging) — this is the fast path for quick step completion
- **D-05:** "Done + Log Session" is a secondary action adjacent to "Mark Done" (split button or separate secondary button) — opens the session logger sheet
- **D-06:** Both actions use the same `completeStepWithSession` DB function — standalone mark-done passes null/empty session fields, combined action passes the user-entered values

### Entry Point Navigation (EP-01 through EP-05)
- **D-07:** Each entry point navigates to `/bare-layout/painting-mode/$assignmentId` using the assignment ID already available in its data context
- **D-08:** NextPaintingActionCard — change existing `/painting-projects` link to painting mode link using the action's assignment ID
- **D-09:** CurrentFocusCard — add a "Paint" button/link that navigates to painting mode for the focused unit's assignment
- **D-10:** Unit Detail applied recipe panel — add a "Start Painting" or "Continue" action on each applied recipe row
- **D-11:** Kanban card — add a painting mode link on enriched cards that have an applied recipe
- **D-12:** Recipe Detail sheet — when recipe is applied to a unit, show a "Paint" action linking to painting mode

### Empty/Missing Recipe State (EP-06)
- **D-13:** When painting mode route is accessed for a unit with no applied recipe, show a friendly empty state explaining "This unit doesn't have a painting recipe applied yet" with a CTA navigating to the unit detail page where they can apply a recipe
- **D-14:** Entry point surfaces (cards, panels) should not show a painting mode link at all when there's no applied recipe — the empty state is a safety net, not the primary path

### Claude's Discretion
- Exact button styling, icon choices, and micro-copy for entry point CTAs
- Whether "Done + Log" uses a split button or two separate buttons (pick whichever fits the existing StepFocalView layout best)
- Session logger sheet field order and optional field hints

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Painting Mode Feature
- `src/features/painting-mode/PaintingModeView.tsx` — main view component with onMarkDone callback and navigation
- `src/features/painting-mode/StepFocalView.tsx` — focal step display where mark-done buttons live
- `src/features/painting-mode/SectionNavigator.tsx` — section/step sidebar navigation

### Data Layer
- `src/db/queries/recipeAssignments.ts` — contains `completeStepWithSession()` atomic transaction (line ~179-214)
- `src/hooks/useRecipeAssignments.ts` — `useCompleteStep()` mutation hook with broad cache invalidation

### Entry Point Surfaces
- `src/features/dashboard/NextPaintingActionCard.tsx` — currently links to /painting-projects, needs redirect
- `src/features/dashboard/CurrentFocusCard.tsx` — has "Log" button, needs painting mode link
- `src/features/collection/UnitDetail.tsx` — unit detail with applied recipe panel
- `src/features/painting/KanbanCard.tsx` — kanban card with enrichment data
- `src/features/painting/RecipeDetailSheet.tsx` — recipe detail with unit application info

### Existing Session Logger
- `src/features/journal/LogSessionSheet.tsx` — reference implementation for session form fields (duration, notes)

### Route
- `src/app/router.tsx` — painting mode route at `/bare-layout/painting-mode/$assignmentId`

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `completeStepWithSession()` — atomic DB function already handles step completion + session creation in one transaction
- `useCompleteStep()` — mutation hook already invalidates workflow-positions, kanban-enrichment, next-painting-action, dashboard-stats
- `LogSessionSheet.tsx` — reference for session form field layout (duration, notes, date)
- `usePaintingModeState()` — composition hook providing current unit/recipe/section/step context for prefilling

### Established Patterns
- Sheet pattern for forms: used throughout the app (EntitySheet, LogSessionSheet, RecipeDetailSheet)
- Entry point cards already query their data and have action slots (buttons, links)
- `handleMarkDone` in painting-mode page already calls `completeMutation.mutate()` — just needs session field support

### Integration Points
- PaintingModeView receives `onMarkDone` callback — needs to also support `onMarkDoneWithSession` or pass session data through
- Each entry point card/panel needs a `useNavigate()` call to `/bare-layout/painting-mode/$assignmentId`
- Session logger sheet needs current painting context (unit, recipe, section, step) from `usePaintingModeState`

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 87-Session Integration + Entry Points*
*Context gathered: 2026-05-19*
