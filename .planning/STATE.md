---
gsd_state_version: 1.0
milestone: v2.5
milestone_name: Recipes 2.0 / Painting Studio
status: completed
stopped_at: Phase 40 context gathered
last_updated: "2026-05-07T10:15:29.307Z"
last_activity: 2026-05-07 — 39-03 vertical timeline, metadata badge row, STUDIO-02 complete
progress:
  total_phases: 5
  completed_phases: 3
  total_plans: 7
  completed_plans: 7
  percent: 100
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-05-06 after v2.5 milestone started)

**Core value:** A single personal command center that always answers "what do I own, what's painted, and what's ready to play" — without ever depending on copyrighted GW data.
**Current focus:** v2.5 Phase 39 — Studio UX + Paint Availability

## Current Position

Phase: 39 of 41 (Studio UX + Paint Availability) — COMPLETE
Plan: 3 of 3 (39-03 complete — all plans done)
Status: 39-03 RecipeStepTimeline and metadata badges delivered — Phase 39 complete
Last activity: 2026-05-07 — 39-03 vertical timeline, metadata badge row, STUDIO-02 complete

Progress: [██████████] 100% (7/7 plans in v2.5)

## Accumulated Context

### Decisions Carried Forward

- All queries via `tauri-plugin-sql` directly — no ORM
- `0|1` integer discipline for SQLite booleans
- All new query modules go to `src/db/queries/` — never import DB in UI
- All new hook modules go to `src/hooks/` — components call hooks only
- Sibling Sheet/Dialog portal pattern — never nest Radix portals
- selectedUnitId pattern for any page that opens a detail Sheet
- Migrations are append-only and immutable — new columns always via ALTER TABLE in a new numbered file
- Integer pence discipline (formatCurrency is the only /100 site)
- pnpm is the package manager — npm fails with workspace: protocol errors
- Tailwind v4 CSS-first theming — @theme inline {} block, no tailwind.config.js
- Design tokens: Forge Black, Gunmetal, Panel Elevated, Battle Gold defined in globals.css
- PageHeader shared component on all 9 pages
- StatusBadge 4-tier color system for 11 painting statuses
- Quick Add via QuickAddContext provider with 8-action dropdown
- Cache invalidation symmetry: if useCreate invalidates a key, useDelete must too
- todayISO() from @/lib/dates is the single source of truth for date defaults
- UnitThumbnail shared component (Swords icon + faction-color fallback)
- Recipe by-unit cache invalidation uses prefix match
- Radix Select sentinel value `__none__` for "no selection" — Radix forbids empty string in SelectItem
- recipe_paints IS the step system — extend to recipe_steps (not a parallel table)
- @dnd-kit already wired; reuse for step reordering
- Photo upload pattern: reuse JournalTab UUID-relative-path approach
- useFieldArray NOT used for step forms — documented ID collision with @dnd-kit useSortable (RHF #10607)

### Decisions from Phase 37 Plan 01

- Deprecated alias pattern (RecipePaint = RecipeStep) avoids mass import refactor in a single phase — clean up in a later refactor
- New recipe metadata fields use raw assignment in UPDATE (not COALESCE) so users can clear them to NULL
- result_photo_path column added to DB/types now; photo upload form field deferred to Phase 40 (STEP-05)
- New step fields (painting_phase, tool, technique, dilution, time_estimate_minutes) default to null in RecipeFormSheet — full step creation UI comes in Phase 38

### Decisions from Phase 37 Plan 02

- Single GROUP BY query (getStepCountsByRecipe) returns all recipe step counts in one round-trip — O(1) vs O(N)
- STEP_COUNTS_KEY = ["recipe-step-counts"] declared as a module constant so invalidation is centralized in useAddRecipePaint and useRemoveRecipePaint
- RecipesPage no longer imports from the query layer directly — all data flows through hooks (architecture rule enforced)

### Decisions from Phase 38 Plan 01

- PAINTING_PHASES placed in recipeSchema.ts (not recipeSteps.ts) — follows the existing pattern where all const arrays for the recipe feature live in one file
- DraftStep new fields use string | null rather than PaintingPhase union type — keeps draft state loose; validation/coercion happens at form submit
- RecipeFormSheet.tsx existing-step mapper must be kept in sync with DraftStep interface (auto-fix applied)

### Decisions from Phase 38 Plan 02

- datalist suggestions (not combobox) for tool and technique — keeps freeform text entry while offering hints
- formatMinutes placed at module level above the component — testable in isolation, avoids re-creating on every render
- Math.round() enforces integer discipline at input boundary — prevents float values reaching SQLite INTEGER column
- Two-row step input layout locked: (phase Select + title + paint) on row 1, (tool + technique + dilution + time) on row 2

### Decisions from Phase 39 Plan 01

- Split-mock TDD strategy: vi.mock('@/db/client') captures SQL strings for query tests; vi.mock('@/db/queries/recipePaints', importOriginal) wraps the module for hook tests — prevents mock conflicts in the same test file
- RECIPE_AVAILABILITY_KEY excluded from useCreatePaint — new paint has no step links, availability unaffected; symmetry rule applied precisely (not over-invalidating)
- getRecipePaintAvailability() uses JOIN (not LEFT JOIN) — steps without a matching paint row (paint deleted) are excluded, avoiding NULL aggregation noise

### Decisions from Phase 39 Plan 02

- applyRecipeFilters extracted to applyRecipeFilters.ts following the applyEntityFilters pattern in other features
- StringFilter local component reused for Surface/Style/Difficulty — single-select popover with __any__ sentinel, variant changes to default when active filter
- difficultyColors uses literal Tailwind class strings (not dynamic) to avoid Tailwind purge removing unused utility classes
- Availability badge uses inline style backgroundColor (#ef4444/#f59e0b/#22c55e) for color accuracy and purge safety

### Decisions from Phase 39 Plan 03

- RecipeStepTimeline is a pure presentational component receiving steps + paintMap as props — no internal data fetching
- Metadata badge row placed inside SheetHeader (not content area) so it appears adjacent to the recipe title and faction badge
- Tests added to .tsx test file (has real implementation) not .ts stub file (only todos)
- Vertical timeline connecting line uses absolute positioning left-[11px] aligned to center of 14px node dot

### Key v2.5 Architectural Constraints

- FIXED (Phase 37-01): useDeleteRecipe now includes `["kanban-enrichment"]` invalidation — cache symmetry restored
- FIXED (Phase 37-02): RecipesPage N+1 step count loop replaced with single batch GROUP BY query
- Substitutions (PAINT-02) need persisted step IDs — must come AFTER Phase 38 step creation
- Session-recipe linking (INTEG-01/02) is highest complexity — Phase 41 last

### Pending Todos

None.

### Open Blockers

None.

## Session Continuity

Last session: 2026-05-07T10:15:29.301Z
Stopped at: Phase 40 context gathered
Resume: Phase 39 complete — begin Phase 40 (photo upload for result_photo_path, STEP-05)
