# Phase 85: Core Execution UI - Context

**Gathered:** 2026-05-19
**Status:** Ready for planning

<domain>
## Phase Boundary

A focused, distraction-free step-by-step painting execution view. The user opens Painting Mode for an applied recipe and sees a split-panel UI: a section navigator on the left and a large step focal view on the right. Each step displays paint swatch, technique, tool, dilution, time estimate, and reference photo. The user marks steps done, navigates forward/backward, jumps to any section/step, and sees paint readiness warnings. No routing, no keyboard shortcuts, no session logging — those are Phases 86–87.

Requirements in scope: SE-01, SE-02, SE-03, SE-04, SE-05, SP-01, SP-02, SP-03, SP-04, PR-01, PR-02, PR-03, PX-01

</domain>

<decisions>
## Implementation Decisions

### Layout Architecture (PX-01)
- **D-01:** Split-panel layout — persistent left sidebar for section navigator, right main area for step focal view. Follows Game Day's structured layout pattern. The section list is always visible so the painter can see progress and jump to any section without extra interaction.
- **D-02:** Distraction-free presentation: sidebar hidden (app-level sidebar, not the section nav), larger typography scaled for desk-distance readability, high contrast. Uses a full-height flex column layout like `GameDayPage.tsx`.

### Step Detail Presentation (SE-01, SE-05)
- **D-03:** Large hero card layout for the current step. Paint swatch circle + paint name displayed prominently at the top. Brand and paint type shown as secondary text.
- **D-04:** Metadata row below paint info: technique badge, tool icon + name, dilution indicator, time estimate with clock icon. Follows `RecipeStepTimeline`'s inline metadata row pattern but scaled up.
- **D-05:** Reference photo displayed large below the metadata row when present. When no photo exists, the space collapses — no empty placeholder.
- **D-06:** Step name/instruction text displayed prominently above the paint info as the primary heading of the focal view.

### Section Navigator (SP-01, SP-02, SP-03, SP-04)
- **D-07:** Persistent sidebar list showing all sections. Each section entry displays: section name, completed/total step count badge (e.g., "3/5"), and visual highlight for the current section.
- **D-08:** Each section expands to show its step sub-items. Steps show a completion indicator (checkmark or dot) and step name. Clicking any step triggers `goToStep()` from `usePaintingModeState`.
- **D-09:** Optional sections (SP-04) display an "Optional" badge, visually distinct from required sections.
- **D-10:** Unsectioned steps (section_id = NULL) grouped under a virtual "General" section at the bottom, matching D-04 from Phase 84 (COALESCE 999999 sort).

### Step Completion (SE-02)
- **D-11:** A prominent "Mark Done" button on the step focal view. Single click marks the step complete via `useCompleteStep` mutation and instantly swaps to the next step. No animation — speed over polish at the desk.
- **D-12:** The section navigator updates immediately: step gets a checkmark, section badge count increments. This provides sufficient visual feedback without separate transition animations.

### Step Navigation (SE-03, SE-04)
- **D-13:** Previous/Next buttons flanking the step focal view (or at the bottom). Connected to `goPrev`/`goNext` from `usePaintingModeState`. Buttons disable at boundaries (first step / last step).
- **D-14:** Position indicator always visible: "Step X of Y" text plus current section name (e.g., "Step 3 of 7 · Basecoat"). Uses `currentIndex` and `orderedSteps.length` from the hook.

### Paint Readiness (PR-01, PR-02, PR-03)
- **D-15:** Non-blocking banner at the top of the execution view, shown once at entry, listing missing paints with a dismiss action. Satisfies PR-01 ("at entry") and PR-02 ("non-blocking").
- **D-16:** Paintless steps (steps with no paint assigned) display cleanly with no paint swatch area — no false "missing paint" warnings (PR-03). The metadata row adapts to show only available fields (technique/tool without paint-specific info).

### Component Organization
- **D-17:** New feature directory `src/features/painting-mode/` with components: `PaintingModeView.tsx` (root), `StepFocalView.tsx` (right panel), `SectionNavigator.tsx` (left sidebar), `PaintReadinessBanner.tsx` (dismissible warning), `StepMetadataRow.tsx` (technique/tool/dilution/time).
- **D-18:** The root component takes `assignmentId` and `recipeId` as props and composes `usePaintingModeState` + `useCompleteStep` hooks. No internal routing — Phase 86 adds the route shell.

### Claude's Discretion
- Exact spacing, font sizes, and padding for "larger typography" (PX-01) — any reasonable scale-up from base sizes that's readable at arm's length
- Whether section navigator uses Collapsible or is always fully expanded — either works, pick based on typical recipe section count
- Paint swatch rendering implementation (CSS background-color circle vs SVG) — follow existing `RecipeStepTimeline` pattern
- Loading state presentation while `usePaintingModeState` fetches data

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & Roadmap
- `.planning/REQUIREMENTS.md` — SE-01 through SE-05, SP-01 through SP-04, PR-01 through PR-03, PX-01 requirement definitions
- `.planning/ROADMAP.md` — Phase 85 goal, success criteria, dependency chain (depends on Phase 84)

### Phase 84 Deliverables (consume these, don't rebuild)
- `src/hooks/usePaintingModeState.ts` — Navigation hook: orderedSteps, currentStepId, goPrev/goNext/goToStep, sectionProgressMap, completedSet
- `src/hooks/useRecipeAssignments.ts` — `useCompleteStep` mutation hook, `useStepProgress`, cache key definitions
- `src/db/queries/recipeAssignments.ts` — `completeStepWithSession` transaction function
- `.planning/phases/84-data-layer-early-tests/84-CONTEXT.md` — Phase 84 decisions (D-01 through D-11)

### UI Pattern References (read for consistency)
- `src/features/game-day/GameDayPage.tsx` — Full-page focused mode layout pattern (flex col h-full, fixed header, structured panels)
- `src/features/game-day/GameDayHeader.tsx` — Control bar header pattern with back button + actions
- `src/features/game-day/GameDayReadinessPanel.tsx` — Readiness warning panel pattern with badges and dismiss
- `src/features/recipes/RecipeStepTimeline.tsx` — Step display pattern: paint swatch dots, metadata row (tool/technique/dilution/time), photo thumbnails
- `src/features/recipes/SectionedTimeline.tsx` — Section grouping pattern: section headers with step counts, time estimates, paint availability indicators

### Reusable Primitives
- `src/components/ui/badge.tsx` — Badge variants (default, secondary, outline, ghost)
- `src/components/ui/progress.tsx` — Progress bar component
- `src/components/ui/status-badge.tsx` — 4-tier color-coded status badge
- `src/components/common/PageHeader.tsx` — Standard page header layout

### Paint Data
- `src/hooks/useRecipePaints.ts` — Recipe step data with paint info (name, brand, hex color, owned status)
- `src/hooks/useRecipeSections.ts` — Section data (name, order_index, is_optional, section_type)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `usePaintingModeState(assignmentId, recipeId)`: Delivers everything the UI needs — ordered steps, current step, navigation functions, section progress map. Phase 85 UI is a pure consumer.
- `useCompleteStep`: Mutation hook with full cache invalidation (kanban, dashboard, workflow positions). Wire directly to "Mark Done" button.
- `RecipeStepTimeline`: Paint swatch node dots, metadata row layout, photo thumbnail pattern. Scale up the patterns rather than importing the component directly (different context: read-only timeline vs interactive execution).
- `GameDayPage/Header/ReadinessPanel`: Full-page focused mode with header controls and readiness warnings. Closest architectural match for the painting mode shell.
- `Collapsible` from shadcn: Used throughout game-day for expandable sections. Suitable for section navigator step lists.

### Established Patterns
- Full-page layouts use `flex flex-col h-full` with fixed header and flex-1 content area
- Metadata rows use inline icon + text pairs with `gap-2` spacing and `text-xs text-muted-foreground`
- Paint swatches use CSS `backgroundColor` with the paint's hex value on a rounded div
- Status indicators use color-coded dots and badges (green/amber/red for availability)
- All pages use `p-6` container padding, `px-4 py-3` for panel sections

### Integration Points
- New `src/features/painting-mode/` directory — Phase 86 adds the route, Phase 87 adds entry points
- `PaintingModeView` component will be the render target for the Phase 86 route
- `useCompleteStep` called from `StepFocalView` on mark-done action
- `usePaintingModeState` composed at the `PaintingModeView` root level and passed down via props

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches following existing codebase patterns. The Game Day feature is the closest architectural reference for the focused-mode layout.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 85-Core Execution UI*
*Context gathered: 2026-05-19*
