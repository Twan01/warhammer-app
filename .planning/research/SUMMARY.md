# Project Research Summary

**Project:** HobbyForge v0.2.15 — Painting Mode
**Domain:** Focused step-by-step recipe execution surface (desktop hobby app)
**Researched:** 2026-05-19
**Confidence:** HIGH

## Executive Summary

Painting Mode is a focused execution surface layered on top of HobbyForge's existing applied-recipe and session data model. It does not require schema changes, new Rust commands, or new Tauri permissions — the entire data layer is already in place. The recommended approach is a full-page route at `/painting-mode/$assignmentId` (mirroring the `GameDayPage` pattern), with a distraction-free layout that hides the sidebar, keyboard shortcuts for desk-side operation, and an atomic step-completion + session-log action. One new npm package is needed: `react-hotkeys-hook` v5.3.2 (8 KB, React 19 compatible).

The highest-value UX differentiator over comparable apps (Liber Pigmenta, Cook Mode, StrongLifts) is keyboard navigation: Space to mark a step done, arrow keys to navigate, Escape to exit. This removes all mouse interaction for a painter with wet brushes. The second differentiator is atomic session logging — marking a step done simultaneously creates a session log entry pre-filled from context, eliminating the post-session "remember to log" friction.

The primary risks are data integrity and cache coherence: the step completion mutation must use a full `BEGIN/COMMIT` transaction covering both the progress upsert and session insert, and it must invalidate a broader cache key set than the existing `useToggleStepProgress` covers. Section-aware step ordering (`COALESCE(section.order_index, 999999), step.order_index`) must be enforced client-side to prevent Painting Mode from opening on the wrong step in multi-section recipes.

## Stack Additions

One new package: `react-hotkeys-hook` v5.3.2. Everything else reuses proven infrastructure:
- Fullscreen via `getCurrentWindow().setFullscreen(true)` (already in `capabilities/default.json`)
- Step transition animation via `animate-fade-in` from `tw-animate-css` (already installed)
- Step navigation via custom `usePaintingModeState` hook (pure `useState`)

## Feature Assessment

### Table Stakes (P1 — must ship)
- Single-step focal view with full step detail (paint swatch, technique, tool, dilution, time estimate)
- Previous / Next navigation with step position indicator
- Section progress navigation with completion counts and jump-to-section
- Mark step done (inline, one action, no modal)
- Missing paint non-blocking warning at mode entry and per-step
- Session pre-fill from current context
- Keyboard shortcuts: Space = mark done, ArrowLeft/Right = navigate, Escape = exit
- Entry points from existing surfaces: CurrentFocusCard, AppliedRecipesTab, KanbanCard, RecipeDetailSheet
- Distraction-free presentation: full panel, minimal chrome, sidebar hidden

### Differentiators (P2)
- Step reference photo display
- Atomic "done + log session" single action
- Section completion acknowledgment
- Time estimate label per step

### Defer (v0.2.16+)
- Batch painting mode (same step across multiple units)
- Per-model progress within a squad unit
- Voice control

## Architecture Impact

- Full-page route at `/painting-mode/$assignmentId` (mirrors `GameDayPage` pattern)
- New feature module: `src/features/painting-mode/` (6 new files)
- No new DB migrations or Rust commands
- One new transactional function: `completeStepWithSession` in `src/db/queries/recipeAssignments.ts`
- Extended cache invalidation on new `useCompleteStep` mutation

**Major components:**
1. `PaintingModePageShell` — thin route wrapper, param extraction
2. `usePaintingModeState` — section-aware step ordering, controlled `currentStepId`, navigation
3. `StepExecutionView` — current step detail, mark done, position indicator
4. `SectionNav` — vertical section list with completion counts, jump-to
5. `PaintReadinessWarning` — non-blocking banner for missing/low paint
6. `PaintingModeLogSheet` — prefilled session logger with atomic complete+log

## Key Pitfalls

1. **Incomplete cache invalidation** — `useToggleStepProgress` only invalidates `STEP_PROGRESS_KEY`. New `useCompleteStep` must also invalidate kanban-enrichment, unit assignments, dashboard action keys.
2. **Non-atomic step + session write** — Must use `BEGIN/COMMIT` block following `saveRecipeGraph` pattern.
3. **Wrong step ordering in multi-section recipes** — Derive first incomplete step client-side using section+step order.
4. **Keyboard shortcuts firing inside form inputs** — Guard with `e.target instanceof HTMLInputElement` checks.
5. **Sidebar remaining interactive** — Full-page route with `PaintingModeLayout` hiding sidebar.

## Suggested Phase Order

| Phase | Focus | Risk | Dependencies |
|-------|-------|------|--------------|
| 1 | Data Layer + Navigation Hook | HIGH | None |
| 2 | Core Painting Mode UI | MEDIUM | Phase 1 |
| 3 | Shell, Route, Keyboard Shortcuts | MEDIUM | Phase 2 |
| 4 | Session Integration + Entry Points | LOW | Phase 3 |
| 5 | P2 Features + Test Coverage | LOW | Phase 4 |

## Sources

### Primary (HIGH confidence)
- `src/hooks/useRecipeAssignments.ts` — invalidation set for `useToggleStepProgress`
- `src/hooks/useNextPaintingAction.ts` — `FirstIncompleteStep` type, paint availability
- `src/features/units/ShowcaseMode.tsx` — fullscreen + keyboard handler pattern
- `src/features/recipes/SectionedTimeline.tsx` — section+step rendering, paintMap pattern
- `src/db/queries/recipes.ts` — `saveRecipeGraph` transaction pattern
- `src/app/game-day/page.tsx` — `GameDayPageShell` route shell pattern
- `src-tauri/capabilities/default.json` — fullscreen permission verified

---
*Synthesized: 2026-05-19*
