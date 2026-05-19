# Phase 86: Shell, Route & Keyboard Shortcuts - Context

**Gathered:** 2026-05-19
**Status:** Ready for planning

<domain>
## Phase Boundary

Full-page route for Painting Mode with sidebar hidden, keyboard shortcuts for mouse-free step execution (Space/Arrow/Escape), input guards to prevent shortcuts firing in form fields, section completion acknowledgment, and time estimate display per step. No new data operations, no session logging, no entry point wiring — those are Phases 87-88.

Requirements in scope: PX-02, PX-03, PX-04, PX-05, PX-06, SP-05

</domain>

<decisions>
## Implementation Decisions

### Route Architecture (PX-01 shell)
- **D-01:** Dual layout roots in TanStack Router. Create a `bareRootRoute` that renders `<Outlet />` with `TooltipProvider` and `Toaster` but NO `AppSidebar` and NO `AppLayout`. The painting-mode route nests under this bare root, keeping the sidebar completely out of the render tree.
- **D-02:** Route path: `/painting-mode/$assignmentId`. The route component (`PaintingModePage`) extracts `assignmentId` from params, looks up the associated `recipeId` and `unitId` via `useRecipeAssignment(assignmentId)`, and passes all three to `PaintingModeView`.
- **D-03:** The route file lives at `src/app/painting-mode/page.tsx` following the existing page convention. Import and register in `src/app/router.tsx` under the new bare root.

### Keyboard Shortcuts (PX-02, PX-03, PX-04)
- **D-04:** Use `react-hotkeys-hook` v5.3.2 (already confirmed compatible, 8 KB). Three shortcuts:
  - `Space` → mark current step done (calls `useCompleteStep` mutation)
  - `ArrowLeft` / `ArrowRight` → navigate to previous/next step
  - `Escape` → exit Painting Mode
- **D-05:** Shortcuts are registered in the `PaintingModePage` (route-level component), not inside child components. This ensures a single registration point and avoids duplicate handlers.

### Input Guards (PX-05)
- **D-06:** Use `react-hotkeys-hook`'s built-in `enableOnFormTags` option (default: disabled on inputs). The hook natively skips `<input>`, `<textarea>`, and `<select>` elements. No custom guard logic needed — the library handles this. Verify the default behavior covers `contentEditable` divs if any exist in the view.

### Exit Navigation (PX-04)
- **D-07:** Escape triggers `window.history.back()` (or `navigate(-1)` via TanStack Router's `useNavigate`). This returns the user to whichever surface they came from — critical since Phase 87 adds six entry points. Falls back to dashboard if history is empty.

### Section Completion Acknowledgment (SP-05)
- **D-08:** When all steps in a section are complete, the section row in `SectionNavigator` displays a green checkmark icon replacing the progress count badge. The section name text gets a `text-muted-foreground` style to indicate completion. No toast or animation — non-intrusive visual change that the painter sees in the persistent section navigator.

### Time Estimate Display (PX-06)
- **D-09:** Time estimate is already rendered in `StepMetadataRow` (from Phase 85) with a clock icon. Verify it displays in the `StepFocalView` and confirm the formatting. No additional work expected unless the field is missing from the data flow — researcher should verify.

### Keyboard Shortcut Discoverability
- **D-10:** Subtle `<kbd>` badges on the relevant buttons in the step focal view: "Mark Done `Space`", "← `←`", "`→` →". Small, muted styling that teaches shortcuts without cluttering the distraction-free layout. Badges use `text-[10px] bg-muted px-1 rounded` inline with button labels.

### Claude's Discretion
- Whether `bareRootRoute` includes `ActiveFactionProvider` — probably yes for theming consistency, but researcher should check if painting mode needs faction context
- Exact `react-hotkeys-hook` API usage (`useHotkeys` vs individual calls) — follow library best practices
- Whether to prevent default browser behavior for Space (scroll) and ArrowLeft/Right (scroll) — likely yes via `preventDefault: true` in hotkeys config
- Loading/error states for the route-level assignment lookup

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & Roadmap
- `.planning/REQUIREMENTS.md` — PX-02 through PX-06, SP-05 requirement definitions
- `.planning/ROADMAP.md` — Phase 86 goal, success criteria, dependency chain

### Phase 84-85 Deliverables (consume, don't rebuild)
- `src/hooks/usePaintingModeState.ts` — Navigation hook: orderedSteps, currentStepId, goPrev/goNext/goToStep, sectionProgressMap
- `src/hooks/useRecipeAssignments.ts` — `useCompleteStep` mutation hook, `useStepProgress`, cache keys
- `src/features/painting-mode/PaintingModeView.tsx` — Root component to render inside the route shell
- `src/features/painting-mode/SectionNavigator.tsx` — Section navigator (needs SP-05 completion acknowledgment)
- `src/features/painting-mode/StepFocalView.tsx` — Step display (keyboard shortcut badges go here)
- `src/features/painting-mode/StepMetadataRow.tsx` — Metadata row with time estimate (verify PX-06)
- `.planning/phases/84-data-layer-early-tests/84-CONTEXT.md` — Phase 84 decisions
- `.planning/phases/85-core-execution-ui/85-CONTEXT.md` — Phase 85 decisions (layout, component organization)

### Router & Layout Patterns
- `src/app/router.tsx` — Current route tree (all under `rootRoute` with `AppLayout`). Needs `bareRootRoute` addition.
- `src/components/common/AppLayout.tsx` — Current layout with sidebar. Painting mode MUST NOT use this.
- `src/app/game-day/page.tsx` — GameDayPageShell pattern (route-level param extraction + component rendering)

### Keyboard Library
- `react-hotkeys-hook` v5.3.2 — New dependency. React 19 compatible, 8 KB.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `GameDayPageShell` pattern: Route-level component that extracts `$listId` param, validates, and renders `GameDayPage`. Clone this pattern for `PaintingModePage`.
- `PaintingModeView`: Already built in Phase 85. Takes `assignmentId`, `recipeId`, `unitId` props. The route shell just needs to resolve these and pass them in.
- `SectionNavigator`: Already renders section list with progress counts. Needs SP-05 modification (completion checkmark).
- `StepFocalView`: Already renders step details with Mark Done button. Needs keyboard badge additions (D-10).

### Established Patterns
- Route params use `$paramName` in path string, extracted via `useParams()` or route component props
- All routes registered in `routeTree` via `rootRoute.addChildren([...])`
- Page shell components handle loading/error states before rendering the main component
- `useNavigate()` from TanStack Router for programmatic navigation

### Integration Points
- `src/app/router.tsx` — Add `bareRootRoute` + `paintingModeRoute` to route tree
- `src/app/painting-mode/page.tsx` — New file: route-level shell
- `src/features/painting-mode/SectionNavigator.tsx` — Modify for SP-05 completion acknowledgment
- `src/features/painting-mode/StepFocalView.tsx` — Add keyboard shortcut `<kbd>` badges
- `package.json` — Add `react-hotkeys-hook` dependency

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches following existing codebase patterns. The Game Day route shell is the closest pattern reference for the page-level component.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 86-Shell, Route & Keyboard Shortcuts*
*Context gathered: 2026-05-19*
