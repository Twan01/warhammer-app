# Pitfalls Research

**Domain:** Focused execution mode added to existing complex recipe/session data model (HobbyForge v0.2.15 Painting Mode)
**Researched:** 2026-05-19
**Confidence:** HIGH — all pitfalls derived directly from the existing codebase, migration history, and established patterns

---

## Critical Pitfalls

### Pitfall 1: Stale Step List When Recipe Is Edited While Painting Mode Is Open

**What goes wrong:**
Painting Mode loads `recipe_steps` and `unit_recipe_step_progress` at mount. If the user opens another window (e.g., RecipeFormSheet via Recipe Detail) and saves the recipe while Painting Mode is open, the five-phase diff may INSERT new steps (new `recipe_step_id` values) or DELETE old ones. Painting Mode now holds a stale step list: the `recipe_step_id` values displayed no longer match what is in the DB. Marking a step "done" calls `upsertStepProgress(assignmentId, staleRecipeStepId, true)` — which silently inserts a progress row for a non-existent step, or throws a FK violation.

**Why it happens:**
The non-destructive five-phase diff (REC-02/DI-04) specifically preserves existing step IDs, but it also INSERTs brand-new steps with auto-generated IDs and DELETEs removed steps. Any component holding the pre-save step array is now out of date. `useToggleStepProgress` only invalidates `STEP_PROGRESS_KEY(assignmentId)` — it does NOT re-fetch the step list itself (`RECIPE_PAINTS_KEY`).

**How to avoid:**
- Painting Mode must subscribe to the same step query that backs the recipe step list. Use `useRecipePaints(recipeId)` (which fetches `recipe_steps`) and `useStepProgress(assignmentId)` simultaneously — both are React Query hooks that refetch when their cache keys are invalidated.
- Verify that `saveRecipeGraph` (via whatever mutation hook wraps it) invalidates `RECIPE_PAINTS_KEY(recipeId)`. If not, add it.
- Consider adding `staleTime: 0` for step data consumed in Painting Mode so any background refetch is not blocked by the 5-minute default.

**Warning signs:**
- Marking a step "done" does nothing visible (progress bar doesn't move) — indicates a stale `recipe_step_id` was sent.
- A FK constraint error toast appears after toggling a step in Painting Mode immediately after a recipe edit.
- `getStepProgress` returns rows for IDs that no longer exist in the displayed step list.

**Phase to address:**
Phase introducing the Painting Mode data layer (earliest phase). Add a test: "after saveRecipeGraph invalidates step cache, Painting Mode refetches and shows updated step list."

---

### Pitfall 2: `useToggleStepProgress` Does Not Invalidate Derived Progress Surfaces

**What goes wrong:**
`useToggleStepProgress` currently invalidates only `STEP_PROGRESS_KEY(assignmentId)`. Three other surfaces show derived assignment progress:
1. `KanbanCard` — reads from `useWorkflowPositions` / `["kanban-enrichment"]` key
2. `CurrentFocusCard` — reads from the `NextPaintingActionCard` query chain
3. `Unit Detail` applied recipe panel — reads from a separate query

When a step is marked complete in Painting Mode, none of those surfaces refresh. The user sees stale progress badges on the Kanban board and Dashboard after returning from Painting Mode.

**Why it happens:**
The D-13 symmetry rule (invalidate the same keys in create and delete) is enforced for assignments, but `useToggleStepProgress` was written before Painting Mode existed and only targets its own narrow key. The Kanban enrichment hook uses a different cache branch.

**How to avoid:**
When writing Painting Mode's step completion mutation, use a new `useCompleteStep` mutation that wraps `upsertStepProgress` AND handles the full invalidation set — do NOT reuse `useToggleStepProgress` bare. This new mutation must also invalidate:
- `["kanban-enrichment"]` — Kanban card progress badges refresh immediately
- `UNIT_ASSIGNMENTS_KEY(unitId)` — Unit Detail assignment panel refreshes (requires `unitId` as a mutation variable)
- Any Dashboard query key showing next painting action or step progress

**Warning signs:**
- Kanban card progress badge shows old percentage after exiting Painting Mode.
- `CurrentFocusCard` "next step" still shows a step already marked complete.
- Unit Detail checklist and Painting Mode checklist disagree on which steps are done.

**Phase to address:**
Phase introducing the step completion mutation in Painting Mode. Do not reuse `useToggleStepProgress` without auditing its invalidation set first.

---

### Pitfall 3: Atomic Step Completion + Session Log — Partial Failure Leaves Inconsistent State

**What goes wrong:**
Painting Mode's "Mark Done + Log Session" flow must do two writes in sequence: `upsertStepProgress(...)` then `createSession(...)`. If `upsertStepProgress` succeeds but `createSession` throws, the step is permanently marked complete with no matching session. The reverse (session written, progress not updated) is equally bad.

**Why it happens:**
`tauri-plugin-sql` cannot nest transactions (Key Decision: "Flat inline SQL for transactions"). `upsertStepProgress` and `createSession` each call `getDb()` and issue their own statements. There is no existing cross-table transaction wrapper for these two operations.

**How to avoid:**
Implement a single `completeStepWithSession` SQL function in `src/db/queries/recipeAssignments.ts` (following the `saveRecipeGraph` pattern) that issues both the progress upsert and session insert inside a single flat `BEGIN/COMMIT` block. The JS mutation hook calls this one function; if it throws, both writes are rolled back.

The `LogSessionSheet` partial-failure pattern (session ok, status fails → warning toast, no rollback) is acceptable there because status update is a separate optional enhancement. Here, session logging is integral to the step-completion action, so atomicity is required.

**Warning signs:**
- "Mark Done" succeeds (step shows completed) but session history for that recipe shows no entry.
- Retry creates a duplicate session row in `painting_sessions` for the same `unit_id + session_date + recipe_step_id`.
- After an error mid-action, step is complete but no time was logged.

**Phase to address:**
Phase introducing the `completeStepWithSession` DB function. Write it before the UI, with a test verifying that if the session INSERT fails, the progress row is not persisted.

---

### Pitfall 4: Keyboard Shortcuts Conflicting with Tauri WebView / Radix Components

**What goes wrong:**
Painting Mode will register `ArrowRight`/`ArrowLeft` (next/prev step), `Space` (mark done), and `Escape` (exit). In the existing Tauri WebView:
- `Escape` is also caught by any open Radix Dialog, Sheet, or DropdownMenu — they call `e.preventDefault()` and close themselves first.
- `Space` fires the focused button's click handler even without keyboard interception, and also scrolls the page if no element is focused.
- Arrow keys conflict with text inputs inside any step notes or session form embedded in Painting Mode.
- Global `document.addEventListener("keydown")` (the ShowcaseMode pattern) does not respect focus context.

**Why it happens:**
ShowcaseMode works with a global keydown listener because it is a pure gallery with no interactive text inputs. Painting Mode is more complex — it will contain buttons, a session form, and potentially step note inputs. Naive global listeners fire during text input.

**How to avoid:**
- Add an `e.target` check: skip shortcut handling if `e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement`.
- For Escape: check `e.defaultPrevented` before acting — if Radix already consumed it to close a popover, skip the Painting Mode exit handler.
- For Space as "mark done": bind to `onKeyDown` on the focused step container (with `tabIndex={0}`) rather than globally, OR verify focus guard before acting.
- Follow the ShowcaseMode `useEffect` + cleanup pattern but add the target guard.
- Document the shortcut set before implementing — test each shortcut against session form fields.

**Warning signs:**
- Pressing `Space` to mark a step done also clicks another focused button.
- `Escape` dismisses a tooltip, then immediately exits Painting Mode.
- Arrow key navigation fires while the user is typing in the session notes field.

**Phase to address:**
Phase introducing keyboard shortcuts. Add a test using `userEvent.keyboard` verifying that arrow navigation does NOT fire when `document.activeElement` is an input.

---

### Pitfall 5: Cache Invalidation Asymmetry — New Mutation Surface for `upsertStepProgress`

**What goes wrong:**
Prior to Painting Mode, `upsertStepProgress` was only callable from the Unit Detail applied recipe checklist. Painting Mode adds a second surface. If both surfaces are visible simultaneously (e.g., Unit Detail Sheet open, Painting Mode overlay also open for the same unit), they share `STEP_PROGRESS_KEY(assignmentId)` but the 5-minute `staleTime` means the checklist may not see a completion from Painting Mode for 5 minutes.

Additionally, `useToggleStepProgress` does not invalidate `UNIT_ASSIGNMENTS_KEY` or `RECIPE_ASSIGNMENTS_KEY`, so progress percentage shown on unit detail cards drifts from reality until a manual refetch.

**Why it happens:**
The D-13 symmetry rule was enforced for `create/delete assignment` pairs but not applied to `upsertStepProgress`, which was added as a leaf mutation with no symmetry audit.

**How to avoid:**
Apply the D-13 symmetry rule explicitly to Painting Mode's completion mutation. Declare the complete invalidation set in a code comment referencing D-13, and add every surface that displays assignment progress. Use `staleTime: 0` for `STEP_PROGRESS_KEY` in Painting Mode so the step list always reflects the latest DB state.

**Warning signs:**
- Unit Detail progress bar shows 30%, Painting Mode shows 40% for the same assignment.
- After exiting Painting Mode, Dashboard "Next Painting Action" still shows a step that was just completed.
- Kanban card shows old progress badge for 5 minutes after completing steps in Painting Mode.

**Phase to address:**
Phase introducing Painting Mode completion mutation. Audit the full invalidation surface before shipping.

---

### Pitfall 6: `getMostRecentAssignmentWithIncompleteStep` Returns Wrong Step for Multi-Section Recipes

**What goes wrong:**
`getMostRecentAssignmentWithIncompleteStep` uses `ORDER BY a.created_at DESC, rs.order_index ASC`. But `order_index` is per-section (resets to 0 in each section). For a recipe with multiple sections each starting at `order_index = 0`, this query will return a step with `order_index = 0` from whichever section sorts first — not necessarily the logically first incomplete step in workflow order.

This is the same ambiguity that migration 028 had to solve with `ROW_NUMBER()` during the order_index → recipe_step_id back-fill.

**Why it happens:**
The query uses `rs.order_index` without incorporating section order. It was written before the section-aware sort pattern (`COALESCE(s.order_index, 999999) ASC, rs.order_index ASC`) was established.

**How to avoid:**
Painting Mode should NOT use `getMostRecentAssignmentWithIncompleteStep` as-is to determine the "current step." Instead:
1. Load all steps via `getRecipePaintsByRecipe(recipeId)` (which uses the section-aware COALESCE sort).
2. Load all progress via `getStepProgress(assignmentId)`.
3. Derive the first incomplete step client-side by finding the first step (in section-aware order) whose `recipe_step_id` has no completed progress row.

If `getMostRecentAssignmentWithIncompleteStep` is used for the Dashboard entry point, fix its ORDER BY to use `COALESCE(sec.order_index, 999999) ASC, rs.order_index ASC` before relying on it for navigation.

**Warning signs:**
- Painting Mode opens on step 1 of the last section instead of step 1 of the first incomplete section.
- "Resume where you left off" lands on a step the user already completed in a different section.

**Phase to address:**
Data layer phase (first phase). Write a test for multi-section step ordering with partial completions.

---

### Pitfall 7: `ON DELETE SET NULL` on `painting_sessions.recipe_step_id` Misleads Navigation

**What goes wrong:**
If a step referenced by a past session is deleted (e.g., user edits recipe and removes that step), `recipe_step_id` on the session row becomes NULL via `ON DELETE SET NULL`. If Painting Mode derives "resume position" from session history, it will call `computeWorkflowPosition` with `null` as the step ID — triggering the section_name fallback. This fallback is a display hint, not authoritative position tracking.

Additionally, `recipe_section_id` on `painting_sessions` also uses `ON DELETE SET NULL` (migration 023). Both FK columns may simultaneously be NULL on the same session row if both the step and section were deleted.

**Why it happens:**
`ON DELETE SET NULL` is correct for preserving session history, but consumers that use session FKs for navigation must handle the NULL case and not treat session FKs as a canonical position tracker.

**How to avoid:**
Painting Mode must derive current step from `unit_recipe_step_progress` (the keyed progress table), NOT from `painting_sessions`. Sessions are a log of past work, not a source of truth for current position. Use `getStepProgress(assignmentId)` to find completed steps, then derive the first incomplete step in sorted order. Sessions are only used for pre-filling the "Log Session" form.

**Warning signs:**
- After deleting a step that appeared in session history, Painting Mode opens on the wrong step.
- `computeWorkflowPosition` returns `null` even though the assignment has incomplete steps.

**Phase to address:**
Phase defining the Painting Mode data model. Explicitly document in code: "Navigation state = derived from step progress, not sessions."

---

### Pitfall 8: Full-Screen Overlay Leaves Sidebar Interactive

**What goes wrong:**
If Painting Mode is implemented as a route rendered inside `AppLayout`, the sidebar remains visible and interactive. Users can click sidebar items mid-session, navigate away, and lose transient Painting Mode state (e.g., unsaved session form data).

If Painting Mode is instead a fixed overlay (like ShowcaseMode), the `isTauri()` guard must wrap the fullscreen API call. Missing it causes the Tauri window to fail to go fullscreen because `document.documentElement.requestFullscreen()` is a browser-only API that silently does nothing (or errors) in the WebView context.

**Why it happens:**
Developers default to the existing route pattern (consistent with Game Day, Rules Hub) without considering that "distraction-free" requires hiding navigation. Game Day Mode explicitly accepts the sidebar being present — Painting Mode at the desk does not.

**How to avoid:**
Implement Painting Mode as a fixed overlay (`fixed inset-0 z-[60]`) rendered conditionally at a high level (AppLayout level or router-agnostic), not as a route. Store entry-point state (assignmentId, initial step) in a Zustand store or context. Follow the ShowcaseMode `isTauri()` guard for fullscreen:
```ts
if (isTauri()) {
  await getCurrentWindow().setFullscreen(true);
} else {
  await document.documentElement.requestFullscreen?.();
}
```
If a route is chosen instead: implement a `PaintingModeLayout` that replaces AppLayout, hiding the sidebar entirely.

**Warning signs:**
- User can see and click sidebar links while in Painting Mode.
- `setFullscreen(true)` call fails silently in Tauri builds.
- Navigating away via sidebar does not prompt about unsaved session data.

**Phase to address:**
Phase introducing the Painting Mode shell/layout. Decide overlay vs. route before writing any component code.

---

### Pitfall 9: `saveRecipeGraph` Called with Empty `existingSections` Destroys All Progress

**What goes wrong:**
`saveRecipeGraph(recipeId, formValues, sections, existingSections, existingSteps)` requires callers to pre-load `existingSections` and `existingSteps` from the DB. If a new entry point (e.g., "quick edit step name" from Painting Mode) calls `saveRecipeGraph` without correctly loading the existing state — passing `[]` as defaults — the section diff classifies all sections as "to DELETE," deletes them, and CASCADE-deletes all `recipe_steps` rows. All `unit_recipe_step_progress` rows (keyed by `recipe_step_id` with `ON DELETE CASCADE`) are then destroyed.

**Why it happens:**
`saveRecipeGraph` is safe when called from `RecipeFormSheet` because that component always loads existing sections/steps before opening. A new calling site may not follow this pre-load requirement.

**How to avoid:**
- Never add an inline recipe editing flow in Painting Mode. Route any recipe edits through the existing `RecipeFormSheet`.
- If a new DB function for minor edits is needed (e.g., editing step notes only), implement a targeted `UPDATE recipe_steps SET notes = $2 WHERE id = $1` — not a full graph save.
- Add a runtime guard in `saveRecipeGraph` for the edit path:
```ts
if (recipeId !== null && existingSections.length === 0) {
  throw new Error("saveRecipeGraph: existingSections must be pre-loaded for existing recipes");
}
```

**Warning signs:**
- All step progress rows disappear after a recipe edit from a new Painting Mode action.
- `painting_sessions.recipe_section_id` becomes NULL for all sessions after one edit.
- `getStepProgress(assignmentId)` returns an empty array immediately after a recipe save.

**Phase to address:**
Any phase adding inline recipe editing capability from Painting Mode. Verify before shipping that saving a recipe with an assignment does not destroy existing progress rows.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Reuse `useToggleStepProgress` without extending its invalidation set | Less new code | Stale progress on Kanban/Dashboard after Painting Mode actions | Never — always audit invalidation before reuse |
| Global `document.addEventListener("keydown")` without target guard | Fast to write | Shortcuts fire inside text inputs, breaking session form | Never for overlays with embedded forms — only acceptable in pure gallery/showcase modes with no inputs |
| Derive current step from `painting_sessions.recipe_step_id` | Simple — one query | Wrong position if step was deleted or ON DELETE SET NULL triggered | Never — always derive from `unit_recipe_step_progress` |
| Pass `existingSections: []` to `saveRecipeGraph` for an existing recipe | Avoids pre-loading | Destroys all section/step IDs and orphans progress rows | Never for edit path — only valid when `recipeId === null` |
| Store Painting Mode current step index in React local state independently | Simple | State lost on re-render caused by cache invalidation refetch | Acceptable only if step index is always re-derived from progress data, never stored as the canonical source |
| Implement Painting Mode as a route inside AppLayout | Consistent with existing patterns | Sidebar remains visible, violating "distraction-free" goal | Acceptable only if the design explicitly accepts a visible sidebar |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| `upsertStepProgress` + `createSession` | Two sequential `mutateAsync` calls | Single `completeStepWithSession` function with flat `BEGIN/COMMIT` transaction, following `saveRecipeGraph` pattern |
| `getMostRecentAssignmentWithIncompleteStep` for navigation | Use the query result directly as the initial step | Verify section-aware ordering; prefer client-side derivation from full step list + progress |
| `computeWorkflowPosition` for Painting Mode navigation | Use it as the source of truth for current step | It is a display hint derived from session history — use `unit_recipe_step_progress` for authoritative position |
| Tauri `setFullscreen` | Call `document.documentElement.requestFullscreen()` directly | Always guard with `isTauri()` and use `getCurrentWindow().setFullscreen(true)` — see `ShowcaseMode.tsx` |
| React Query step progress `staleTime` | Default 5-minute staleTime from QueryProvider | Override to `staleTime: 0` for step queries in Painting Mode so invalidations apply immediately |
| Session pre-fill from Painting Mode context | Manually populate form fields from props | Use `buildDefaultValues` pattern: pre-fill `recipe_id`, `recipe_step_id`, `recipe_section_id`, `unit_id` from current painting context |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Loading full recipe list (`getRecipes`) to find the recipe name in Painting Mode | Slow initial load, large payload | Load only `getRecipeById(recipeId)` — Painting Mode always knows the recipe ID from the assignment | Not a correctness issue, but wastes queries and sets a bad precedent |
| Per-step paint availability check inside render | N queries per render cycle | Use `getRecipePaintAvailability(recipeId)` batch query (already in `useRecipePaints`) and derive per-step availability in the component | Breaks at recipes with 20+ steps if done naively |
| Loading all assignments to find the current one | Unnecessary data | Pass `assignmentId` as prop/param; use `getAssignment(id)` not `getAssignmentsByUnit(unitId)` | Not a correctness issue, but wastes queries |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| No confirmation before exiting Painting Mode when session form has unsaved data | User accidentally exits and loses duration/notes typed | Show "Log session before leaving?" confirmation if session form has data (duration > 0 or notes not empty) |
| "Mark Done" and "Log Session" as two separate actions | User marks step done but forgets to log the session; time spent is lost | Combine into one "Complete Step + Log Time" primary action; session logging is opt-out, not opt-in |
| Painting Mode shows all steps including completed ones with equal visual weight | Completed steps compete visually with the current active step | Collapse or visually dim completed steps; surface the current step prominently |
| Missing paint warning blocks step navigation | User cannot proceed until acknowledging missing paint, even if they have a substitute | Warnings are non-blocking per milestone spec — render as a badge/indicator, never as a modal gate |
| Section jump navigation triggers a visible loading state | UX feels sluggish for pure navigation | Section navigation is pure client-side index change, not a new query — no loading state should appear |

---

## "Looks Done But Isn't" Checklist

- [ ] **Step completion mutation:** Verify the mutation invalidates `["kanban-enrichment"]` and `UNIT_ASSIGNMENTS_KEY(unitId)` — not just `STEP_PROGRESS_KEY(assignmentId)`
- [ ] **Session + progress atomicity:** Verify session INSERT and progress INSERT are in the same transaction, not sequential `mutateAsync` calls
- [ ] **Section-aware step ordering:** Verify first-incomplete-step derivation uses `COALESCE(s.order_index, 999999), rs.order_index` sort — not raw `rs.order_index` alone
- [ ] **Keyboard shortcut guard:** Verify arrow/space shortcuts check `e.target instanceof HTMLInputElement` before firing
- [ ] **Escape key guard:** Verify Painting Mode Escape handler checks `e.defaultPrevented` to avoid double-firing with Radix components
- [ ] **Fullscreen API:** Verify `isTauri()` guard wraps `getCurrentWindow().setFullscreen()` call
- [ ] **`saveRecipeGraph` caller safety:** Verify any new entry point pre-loads `existingSections` and `existingSteps` before calling `saveRecipeGraph` with a non-null `recipeId`
- [ ] **Paint availability:** Verify per-step missing-paint indicator uses the existing batch `getRecipePaintAvailability` query, not per-step individual queries
- [ ] **Progress derivation source:** Verify Painting Mode derives current step from `unit_recipe_step_progress`, not from `painting_sessions.recipe_step_id`
- [ ] **Entry point context propagation:** Verify all six entry points (Dashboard, CurrentFocus, Kanban, Unit Detail, Recipe Detail, Applied Recipe) correctly pass `assignmentId` (not just `recipeId` or `unitId`) to Painting Mode

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Stale step list causes wrong `recipe_step_id` on progress row | MEDIUM | Delete orphaned `unit_recipe_step_progress` rows where `recipe_step_id` not in `recipe_steps`; add check to diagnostics page |
| Partial session + progress write leaves inconsistent state | LOW | No data lost — one of the two exists; user can manually re-log session or re-check step |
| `saveRecipeGraph` called with `existingSections: []` for existing recipe | HIGH | All sections deleted, all step progress rows CASCADE deleted; requires restore from backup |
| Keyboard shortcut fires in text input and submits form | LOW | UX annoyance only; no data corruption; fix target guard and re-test |
| Progress shows stale values after exiting Painting Mode | LOW | Navigate away and return to trigger React Query refetch; fix invalidation set in next phase |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Stale step list during recipe edit | Phase 1 (data layer) | Test: save recipe while step progress exists; verify step list refetches in Painting Mode |
| `useToggleStepProgress` incomplete invalidation | Phase 1 (data layer) | Test: complete step in Painting Mode; verify Kanban card progress updates |
| Non-atomic step + session write | Phase 1 (data layer) | Test: `completeStepWithSession` with failing session INSERT rolls back progress row |
| Keyboard shortcut conflicts | Phase introducing shortcuts | Test: `userEvent.keyboard` in session notes field does not trigger step navigation |
| Cache invalidation asymmetry | Phase 1 (data layer) | Audit: compare `useCompleteStep` invalidation keys against D-13 rule |
| `getMostRecentAssignmentWithIncompleteStep` ordering | Phase 1 (data layer) | Test: multi-section recipe returns step from first incomplete section, not first by raw `order_index` |
| `ON DELETE SET NULL` session navigation | Phase 1 (data layer) | Test: delete a step that has sessions; verify Painting Mode still opens on correct step |
| Full-screen / sidebar interaction | Phase introducing shell | Manual smoke: sidebar not visible and not interactive while Painting Mode is open |
| `saveRecipeGraph` called with empty existing sections | Any phase adding inline recipe editing | Test: calling `saveRecipeGraph` with `existingId` and `[]` sections throws guard error |

---

## Sources

- `src/hooks/useRecipeAssignments.ts` — invalidation set for `useToggleStepProgress`; D-13 symmetry comment
- `src/db/queries/recipeAssignments.ts` — `getMostRecentAssignmentWithIncompleteStep` ORDER BY analysis
- `src/db/queries/recipes.ts` — `saveRecipeGraph` five-phase diff; `existingSections` requirement
- `src/db/queries/paintingSessions.ts` — `createSession` signature; absence of transaction wrapper
- `src-tauri/migrations/023_session_section_fk.sql` — ON DELETE SET NULL on `recipe_section_id`
- `src-tauri/migrations/028_step_progress_identity.sql` — per-section order_index ambiguity (ROW_NUMBER fix)
- `src-tauri/migrations/021_applied_recipe_assignments.sql` — cascade rules on assignments/progress
- `src/features/units/ShowcaseMode.tsx` — fullscreen API pattern, keyboard handler pattern with cleanup
- `src/features/dashboard/LogSessionSheet.tsx` — partial failure handling precedent
- `src/lib/computeWorkflowPosition.ts` — session-derived position vs. progress-derived position distinction
- `.planning/PROJECT.md` — Key Decisions log (saveRecipeGraph, ON DELETE SET NULL, recipe_step_id keying, flat inline SQL transactions)

---
*Pitfalls research for: Painting Mode (focused recipe execution mode) added to HobbyForge v0.2.15*
*Researched: 2026-05-19*
