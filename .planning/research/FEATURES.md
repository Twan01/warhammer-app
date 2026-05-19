# Feature Research

**Domain:** Focused step-by-step execution mode for miniature painting (Painting Mode)
**Researched:** 2026-05-19
**Milestone:** v0.2.15 Painting Mode
**Confidence:** HIGH (table stakes grounded in comparable app research + existing codebase), MEDIUM (differentiators), HIGH (anti-features — based on explicit complexity analysis)

---

## Context: What Already Exists (v0.2.14)

This is a subsequent milestone. Painting Mode is a new **execution surface** layered on existing data — it does not require schema changes.

| Existing capability | Implementation | Notes |
|---------------------|---------------|-------|
| Applied recipes (recipe assigned to unit) | `applied_recipes` table, `recipe_step_id`-keyed progress | Progress tracked per step; survives recipe reorders |
| Step metadata | `recipe_steps`: `paint_id`, `technique`, `tool`, `dilution`, `time_estimate`, `photos`, `notes` | All display fields present |
| Section metadata | `recipe_sections`: `section_type`, `technique`, `execution_mode`, `applies_to` | Workflow context available |
| Paint inventory state | `paints.owned`, `paints.running_low` | Availability already tracked |
| Step photos | `recipe_step_photos` table | Stored; displayed in `SectionedTimeline` |
| Session logging | `LogSessionSheet` with cascading selectors (recipe → section → step) | Accepts `initialValues` prop |
| `useUpdateAppliedRecipeStepProgress` | `src/hooks/useAppliedRecipes.ts` | Step completion mutation already exists |
| `useCreatePaintingSession` | `src/hooks/usePaintingSessions.ts` | Session creation mutation already exists |
| `CurrentFocusCard` | `src/features/dashboard/CurrentFocusCard.tsx` | Shows next step; entry point candidate |
| `NextPaintingActionCard` | `src/features/dashboard/` | Shows paint/tool/technique for next step |
| `KanbanCard` | `src/features/painting-projects/KanbanCard.tsx` | Shows workflow position + next step hint |
| `AppliedRecipesTab` | `src/features/units/AppliedRecipesTab.tsx` | Per-unit recipe progress; entry point candidate |
| `SectionedTimeline` | `src/features/recipes/SectionedTimeline.tsx` | Per-section paint availability already computed |

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features that any focused execution mode must have. Missing these makes Painting Mode feel like a re-skinned timeline rather than a distinct mode. Drawn from patterns in cooking apps (Cook Mode / SideChef), workout trackers (StrongLifts / RepCount), assembly guides (IKEA Assembly Guide app), and the miniature-specific app Liber Pigmenta.

| Feature | Why Expected | Complexity | Dependency on Existing Infrastructure |
|---------|--------------|------------|---------------------------------------|
| Single-step focal view | Every step-by-step execution app presents one step at a time. Cook Mode (cooking apps), StrongLifts (workout), IKEA Assembly Guide all use this pattern. Scrolling a timeline with dirty hands is unusable. | LOW | Re-renders a single `recipe_step` row full-width; step list already ordered by `section_id` + `order_index` |
| Previous / Next navigation | Bidirectional navigation is universal. Assembly guides, cooking apps, and workout trackers all provide back/forward. Users need to re-read the previous step to verify prep or check dry time. | LOW | Step list already sorted; need current step index in local state (new) |
| Step position indicator ("Step 3 of 7") | Cooking apps show step count. IKEA guide shows section progress. Users need orientation inside long recipes. Without it, Painting Mode feels disorienting. | LOW | Section step counts already computed in `SectionedTimeline` |
| Mark step done (inline, no modal) | The core action of execution mode. Workout trackers require ≤3 taps to log a set. Painting Mode must be one action. Without it, Painting Mode is read-only. | LOW | `useUpdateAppliedRecipeStepProgress` mutation already exists; mutation call wired to a button/keypress |
| Paint / tool / technique display (prominent) | The primary reason to enter Painting Mode — the user needs the paint name, hex swatch, tool, technique, and dilution visible without scrolling or cross-referencing. Cook Mode shows per-step ingredient quantities for the same reason. | LOW | All fields on `recipe_step`; paint join gives `hex_color` and `brand`; display only |
| Section progress navigation with jump-to | Long recipes (10+ steps) require section jumping. IKEA Assembly Guide includes a "jump to step" dropdown. Linear-only navigation is a blocker for multi-section recipes. | LOW | Sections and completion counts already available; jump = set current step index to first step of target section |
| Missing paint warning (non-blocking) | Users need to know a required paint is not owned before executing a step. Non-blocking pattern (Baymard: "warnings alert but don't prevent proceeding") — never block the user, just inform. | LOW | `paint.owned` and `paint.running_low` already in DB; join already done in `SectionedTimeline` paint availability display |
| Entry points from existing surfaces | Users expect to enter from wherever they are: Dashboard, Unit Detail, Applied Recipe, Kanban. Recipe app cook modes are reachable from the recipe card in one tap. Without multiple entries, the mode is hidden. | MEDIUM | Routing only; no new data — all entry points need `applied_recipe_id` + `unit_id` passed as route/state params |
| Exit / close action | Every focused mode (Word Focus Mode, Novlr, Cook Mode) provides a clear escape back. Without it, users feel trapped. | LOW | Navigation only; back button or Esc |
| Distraction-free presentation | Painting Mode must look visually distinct from the regular app to signal "execution mode now." Larger typography, high-contrast paint swatch, minimal chrome. IKEA guide uses full-panel single-step layouts. | LOW | CSS only — no new data; can be implemented as a dedicated route or full-panel component |

### Differentiators (Competitive Advantage)

Features that make HobbyForge Painting Mode genuinely useful beyond what Liber Pigmenta or a plain step list provides. Grounded in patterns from Liber Pigmenta (side-by-side reference), workout trackers (keyboard speed), and cooking apps (atomic action patterns).

| Feature | Value Proposition | Complexity | Dependencies |
|---------|-------------------|------------|--------------|
| Keyboard shortcuts (Space = done, ← → = navigate, Esc = exit) | Workout trackers achieve 76% time reduction per action with keyboard nav. At a painting desk, wet brushes mean no mouse. Space + arrows = zero mouse-grabbing. This is the single highest-value UX improvement over every comparable app including Liber Pigmenta. | LOW | `useEffect` keydown handler in Painting Mode component; no DB changes; testable with keyboard event simulation |
| Session prefill from current context | When saving a session from Painting Mode, recipe, section, and step are pre-populated. Avoids three cascading dropdown interactions in `LogSessionSheet` with wet hands. | LOW | `LogSessionSheet` already accepts `initialValues`; need to wire `{ recipe_id, section_id, step_id }` from current step context as props |
| Atomic "done + log session" action | One action marks a step complete AND creates a session log entry. Removes the "go log a session afterward" friction. Unlike Liber Pigmenta which requires a separate photo/note capture step. | MEDIUM | Composes `useUpdateAppliedRecipeStepProgress` + `useCreatePaintingSession` into a single coordinated call; session prefilled from step context; no new DB schema needed |
| Step reference photo display | Steps already store photos in `recipe_step_photos`. Displaying them inline in Painting Mode provides the reference painters need at the desk — the "side-by-side inspiration and execution" pattern that Liber Pigmenta highlights as core. | LOW | Photos already stored; need inline display (lightbox or full-width image) in step focal view |
| Paint availability readiness check at mode entry | Before entering Painting Mode, show which paints in the entire recipe are missing. "Pre-flight check" pattern — IKEA assembly: "check you have all parts before starting." Non-blocking (user can proceed). | LOW | `paint.owned` join across all steps in the recipe; already done per-section in `SectionedTimeline`; aggregate to recipe level |
| Section completion acknowledgment | When all steps in a section are done, show a subtle visual acknowledgment. Workout apps use progress rings that fill; cooking apps advance a progress bar. Positive reinforcement during long sessions. | LOW | Completion percentage already computed; trigger on 100% for a section; CSS animation only |
| Time estimate display per step | Steps already have `time_estimate`. Showing "~15 min — wet blending" during execution helps the painter plan breaks without an intrusive timer. Cooking apps show per-step durations. | LOW | Field already populated; display only in step focal view |

### Anti-Features (Avoid These)

| Feature | Why It Seems Appealing | Why Problematic | Better Approach |
|---------|----------------------|-----------------|-----------------|
| Built-in countdown timer per step | Cooking app timers are useful because times are precise. Painting drying times depend on temperature, brand, and layer thickness — a timer creates false urgency and noise. | Adds live state, timer lifecycle management, notification complexity. `time_estimate` already exists as a rough guide. | Display `time_estimate` as a static label ("~15 min"). User controls their own timer externally if needed. |
| Auto-advance to next step on completion | Seems efficient. In practice, painters mark a step done and then re-read it while the paint dries. Auto-advance removes the ability to reference the completed step. Assembly guide research shows users frequently look back. | Silent loss of reference to the just-completed step. | Keep current step visible after marking done. Show "Next" button prominently but require explicit navigation. |
| Voice control / hands-free commands | Sounds perfect for a dirty-hands painting desk. | Windows Speech API + microphone permissions + noise sensitivity = high implementation complexity for a personal desktop app. Liber Pigmenta has this; community feedback shows it is rarely used. Keyboard shortcuts achieve the same goal more reliably. | Keyboard shortcuts (Space, arrows) are the correct solution for a desktop app. |
| Multi-unit parallel execution mode ("paint 5 at once") | Power painters batch identical steps across a squad simultaneously. | Requires a fundamentally different UI — step focal view becomes a per-unit checklist, not a single action. This is a distinct "batch painting" workflow that deserves its own feature if ever requested. | Painting Mode targets one applied recipe on one unit. Bulk apply (already built) handles assigning the same recipe to multiple units independently. |
| Full recipe edit within Painting Mode | Painters sometimes notice an error mid-execution. | `RecipeDetailSheet` is a complex sectioned DnD form. Embedding it inside Painting Mode creates a nested sheet stack and risks accidental edits during execution. | Add an "Edit Recipe" link that navigates out of Painting Mode to the recipe editor. Keep editing and execution as separate surfaces. |
| Painting Mode as a detached/floating window | Would allow keeping Painting Mode visible while switching to reference photos in another app. | Tauri multi-window requires IPC for state sync. High complexity for a single-user personal desktop app where the main window is maximized full-screen. | Full-panel route presentation within the existing window is sufficient. The app is a maximized desktop window; there is no mobile screen-real-estate problem. |

---

## Feature Dependencies

```
Painting Mode Entry
    └──requires──> Applied Recipe (recipe assigned to unit with per-step progress)
                       └──requires──> Recipe with sections and steps (already built)
                       └──requires──> Unit in collection (already built)
    └──entry-points──> CurrentFocusCard, AppliedRecipesTab, KanbanCard, RecipeDetailSheet

Single-Step Focal View
    └──requires──> Step list ordered by section_id + order_index (already in DB)
    └──requires──> Current step index in local component state (new)
    └──enhances──> All other step-level features (paint display, photo, time estimate)

Mark Step Done
    └──requires──> useUpdateAppliedRecipeStepProgress (already exists)
    └──enhances──> Atomic Session Save (optional composition)

Keyboard Shortcuts
    └──requires──> Focused Painting Mode component (needs mounted event listener)
    └──enhances──> Mark Step Done (Space)
    └──enhances──> Navigation (← →)
    └──enhances──> Exit (Esc)

Session Prefill
    └──requires──> LogSessionSheet accepting initialValues (already supported)
    └──requires──> Current step context { recipe_id, section_id, step_id } in scope

Atomic Session Save on Completion
    └──requires──> Mark Step Done (calls progress mutation)
    └──requires──> Session Prefill (prefills session context)
    └──requires──> useCreatePaintingSession (already exists)

Missing Paint Warning
    └──requires──> paint.owned join across recipe steps (already queryable)
    └──enhances──> Entry readiness check (aggregate to recipe level at mode entry)
    └──enhances──> Per-step indicator (flag icon if current step's paint is missing)

Step Reference Photos
    └──requires──> recipe_step_photos table (already exists)
    └──enhances──> Single-Step Focal View (inline display)
```

### Dependency Notes

- **All Painting Mode features require Applied Recipe:** The mode operates on an `applied_recipe` record. Every entry point must pass `applied_recipe_id` + `unit_id`. There is no Painting Mode for a recipe not applied to a unit.
- **Keyboard shortcuts have zero DB dependencies:** Pure UI layer; testable without DB mocking using keyboard event simulation.
- **Atomic Session Save is compositional:** No new DB schema. It chains the two existing mutations (`useUpdateAppliedRecipeStepProgress` + `useCreatePaintingSession`) in sequence from the user's single action. "Atomic" is from the UX perspective, not a DB transaction.
- **Missing Paint Warning has no new data requirement:** `paint.owned` is already joined in the applied recipe query pattern; `SectionedTimeline` already aggregates this per section. Painting Mode needs the recipe-level aggregate.
- **Session Prefill has no new data requirement:** `LogSessionSheet` already accepts `initialValues`; only the calling code needs to pass current step context.

---

## MVP Definition for v0.2.15

### Launch With (P1 — core Painting Mode)

Minimum viable mode — turns the recipe into a usable desk reference with tracked progress.

- [ ] Single-step focal view with full step detail (paint swatch, technique, tool, dilution, time estimate, step notes)
- [ ] Previous / Next navigation with step position indicator ("Step 3 of 7")
- [ ] Section progress navigation with completion counts and jump-to-section
- [ ] Mark step done (inline button, no modal)
- [ ] Missing paint non-blocking warning at mode entry + per-step indicator
- [ ] Session prefill from current context (recipe, section, step pre-populated in LogSessionSheet)
- [ ] Keyboard shortcuts: Space = mark done, ← → = navigate, Esc = exit
- [ ] Entry points: CurrentFocusCard (Dashboard), AppliedRecipesTab (Unit Detail), KanbanCard, RecipeDetailSheet
- [ ] Distraction-free presentation: larger typography, minimal chrome, high-contrast paint swatch, visually distinct from regular app
- [ ] Test coverage: step selection, navigation, completion, paint warnings, session prefill logic

### Add After Core Works (P2)

- [ ] Step reference photo display — trigger: users report switching to another app to see reference photos
- [ ] Atomic "done + log session" action — trigger: users report logging sessions as post-execution friction
- [ ] Section completion acknowledgment — trigger: feedback that long recipes feel unrewarding mid-session
- [ ] Time estimate label per step — low cost; add with any P2 pass

### Future Consideration (v0.2.16+)

- [ ] Batch painting mode (same step across multiple units) — trigger: explicit user request with clear UX solution
- [ ] Per-model progress within a squad unit — requires data model changes; defer until squad-level tracking is validated

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Single-step focal view | HIGH | LOW | P1 |
| Previous / Next navigation | HIGH | LOW | P1 |
| Mark step done (inline) | HIGH | LOW | P1 |
| Paint / tool / technique display | HIGH | LOW | P1 |
| Section progress indicator | HIGH | LOW | P1 |
| Keyboard shortcuts | HIGH | LOW | P1 |
| Missing paint warning (non-blocking) | HIGH | LOW | P1 |
| Entry from multiple surfaces | HIGH | MEDIUM | P1 |
| Session prefill from context | HIGH | LOW | P1 |
| Distraction-free presentation | MEDIUM | LOW | P1 |
| Jump-to-section navigation | MEDIUM | LOW | P1 |
| Step reference photos | MEDIUM | LOW | P2 |
| Atomic done + log session | MEDIUM | MEDIUM | P2 |
| Time estimate label | LOW | LOW | P2 |
| Section completion acknowledgment | LOW | LOW | P2 |

**Priority key:** P1 = must have for v0.2.15 launch / P2 = add once core works / P3 = future

---

## Comparable App Pattern Analysis

| App Type | Pattern Used | Key Insight for Painting Mode |
|----------|-------------|-------------------------------|
| Cooking (Cook Mode / SideChef) | Full-screen, one-step-at-a-time; swipe left/right or tap next/prev; per-step ingredient context; screen stays awake | One-step focal view is non-negotiable; per-step paint display mirrors per-step ingredient display |
| Workout (StrongLifts / RepCount) | ≤3 taps to log a set; keyboard nav reduces per-cell time by 76%; distraction-free screens; no pop-ups during execution | Keyboard shortcuts (Space to mark done) are the highest-ROI UX feature; minimize taps |
| Assembly (IKEA Assembly Guide app) | "Mark step as complete" to avoid confusion; forward/back + dropdown jump; audio/hands-free; consistent step layout | Explicit completion action per step; jump-to-section dropdown; stable layout between steps |
| Miniature painting (Liber Pigmenta) | Dedicated Painting Mode as separate surface; phase-by-phase navigation; per-model progress; side-by-side reference + execution; photo + notes capture | Direct inspiration; HobbyForge differentiates with keyboard nav and atomic session save |
| Focus/Zen mode research (NN/g) | Zen mode can make users focus on the interface instead of the task when poorly designed | Present Painting Mode as a distinct route/panel, not a modal overlay. Gradual chrome reduction preferred over total UI hiding. |

---

## Sources

- [Cook Mode: Follow Recipes Step by Step — Drizzle Lemons](https://www.drizzlelemons.com/blog/cook-mode-step-by-step-recipe-view)
- [Hands-Free Recipe Navigation UX Case Study — Medium](https://medium.com/@calebha_63744/handsfree-recipe-navigation-a-ux-case-study-of-finding-and-following-recipe-like-a-breeze-49cc4cafc408)
- [How to Design Effective UX for Recipe Apps — Ratomir](https://www.ratomir.com/blog/how-to-design-effective-ux-for-recipe-apps-with-step-by-step-cooking-guides/)
- [Fitness App UX: Key Principles for Engaging Workout Apps — Stormotion](https://stormotion.io/blog/fitness-app-ux/)
- [IKEA Assembly Guide App UX Case Study — Medium/Design Bootcamp](https://medium.com/design-bootcamp/ui-ux-case-study-ikea-assemble-app-b3523e45c7a6)
- [The IKEA Manual: UX of Building Furniture — Sketchboat](https://www.sketchboat.com/blog/the-ikea-manual-the-ux-of-building-furniture-and-why-it-works)
- [Liber Pigmenta Miniature Painting App](https://www.liberpigmenta.com/)
- [Why Zen Mode Isn't the Answer to Everything — NN/G](https://www.nngroup.com/articles/zen-mode/)
- [Form Usability: Validations vs Warnings — Baymard](https://baymard.com/blog/validations-vs-warnings)
- [The UX of Keyboard Shortcuts — Medium/Design Bootcamp](https://medium.com/design-bootcamp/the-art-of-keyboard-shortcuts-designing-for-speed-and-efficiency-9afd717fc7ed)
- [List of Miniature Painting Apps — Minipainting Wiki](https://minipainting.fandom.com/wiki/List_of_Miniature_Painting_Apps)
- Existing codebase: `src/hooks/useAppliedRecipes.ts`, `src/hooks/usePaintingSessions.ts`, `src/features/recipes/SectionedTimeline.tsx`, `src/features/units/AppliedRecipesTab.tsx`, `src/features/dashboard/CurrentFocusCard.tsx`

---

*Feature research for: HobbyForge v0.2.15 — Painting Mode (focused step-by-step execution)*
*Researched: 2026-05-19*
