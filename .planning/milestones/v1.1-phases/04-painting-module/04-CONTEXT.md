# Phase 4: Painting Module - Context

**Gathered:** 2026-05-01
**Status:** Ready for planning

<domain>
## Phase Boundary

Two distinct surfaces delivered together:
1. **Painting Projects page** — Kanban board of active units by painting status, drag-and-drop between columns, mark/unmark active from anywhere
2. **Recipes page** — Recipe CRUD with ordered steps linked to paints from inventory, filter by faction/unit/area, detail Sheet, recipe-unit relationship surfaced in unit detail

No army lists, no dashboard — those are Phase 5. No images per unit — that's a future phase.

</domain>

<decisions>
## Implementation Decisions

### Kanban card density
- Rich cards: unit name + faction badge (hex color) + painting_percentage progress bar + priority indicator + target completion date
- Target date highlighted red when overdue (past today's date)
- Cards with no target date simply omit the date field — no placeholder

### Kanban board behavior
- Columns scroll independently (fixed header, scrollable body) — standard Kanban behavior
- Empty columns hidden: only columns with ≥1 active unit are shown. If all units drain from a column it collapses.
- Drag-and-drop via @dnd-kit (already locked in) to move cards between columns, updating `status_painting` with optimistic update + Sonner error rollback

### Active project management
- `is_active_project` toggle available in all three places: Kanban card (remove button/toggle), unit detail Sheet, and Collection table (via existing is_active_project column/flag)
- Marking inactive from the Kanban: card disappears immediately (optimistic removal)
- Kanban has an "Add project" button that opens a unit picker (Combobox/Command search over non-active units)
- Empty state: centered prompt — icon + "No active projects" + "Add a unit to get started" CTA button

### Recipe form structure
- Ordered steps approach using `recipe_paints` join table — NOT the fixed text fields
- Fixed schema columns (primer, basecoat, shade, layer, highlight, glaze_filter, weathering, technical, basing) remain in the DB but are left empty; the UI uses only the steps list
- Each step has: a step name (free text, e.g. "Basecoat") + an optional linked paint from inventory
- Paint search: Popover + Command autocomplete from paint inventory — same pattern as CategoryCombobox (Phase 2)
- Steps are reorderable via @dnd-kit drag handles (reuse @dnd-kit already in project for Kanban)

### Recipe list page
- Table layout (consistent with other entity pages): columns — Recipe name, Faction badge, Linked unit (if any), Area
- Filters: faction, linked unit, area (text/select)
- Clicking a row opens a right-side detail Sheet

### Recipe detail Sheet
- Read-only view: name, faction badge, unit link, area, ordered steps with linked paint names
- "Edit" button opens the edit form Sheet (same stacked-Sheet pattern as unit detail → UnitSheet)
- CRUD follows the same pattern as Factions/Paints pages

### Recipe ↔ Unit linkage
- Unit detail Sheet (Phase 3) gets an additional "Recipes" section listing recipe names linked to that unit
- Clicking a recipe name navigates to `/recipes` with that recipe's detail Sheet open (or filtered to it)
- No reverse link needed from recipe to unit — the recipe already shows the linked unit name in its list row and detail

### Claude's Discretion
- Exact drag handle visual (grip icon placement on Kanban card and recipe steps)
- Column header styling for empty vs. active columns during transitions
- Recipe step name placeholder suggestions (e.g. "Primer", "Basecoat"...)
- Filter bar layout on Recipes page
- Whether recipe edit form opens as a new Sheet or replaces the detail Sheet

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase 4 requirements
- `.planning/REQUIREMENTS.md` §Painting Projects (Kanban — Phase 3) — PROJ-01 through PROJ-08: Kanban columns, card fields, drag-and-drop, active project toggle, priority sorting, target date
- `.planning/REQUIREMENTS.md` §Painting Recipes — RECIPE-01 through RECIPE-08: recipe fields, faction/unit linking, paint steps, tutorial link, notes, filters
- `.planning/ROADMAP.md` §Phase 3 — Painting Module (ROADMAP Phase 3 = GSD Phase 4): Kanban columns list, recipe fields, acceptance criteria

### Existing code to read before planning
- `src/features/units/CategoryCombobox.tsx` — Popover + Command + shouldFilter pattern to follow for the paint search in recipe steps
- `src/hooks/useUnits.ts` — `useUpdateUnit` for optimistic status and is_active_project mutations; cache invalidation pattern
- `src/db/queries/units.ts` — getUnits() for the unit picker in "Add to active projects"
- `src/db/queries/recipes.ts` — existing recipe query functions (if any); check before adding new ones
- `src/db/queries/recipePaints.ts` — join table queries for recipe steps
- `.planning/phases/03-collection-module/03-CONTEXT.md` — unit detail Sheet spec (adding Recipes section must align with existing Sheet layout decisions)
- `.planning/phases/03-collection-module/03-UI-SPEC.md` — visual contracts for Sheet, Badge, Progress patterns to reuse

### Architecture constraints
- `.planning/REQUIREMENTS.md` §Out of Scope — tauri-plugin-sql directly (no ORM)
- `.planning/PROJECT.md` — "dark slate, compact tables, serious command center" visual principle

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/features/units/CategoryCombobox.tsx`: Popover + Command + shouldFilter — template for paint search in recipe steps (same interaction model)
- `src/hooks/useUnits.ts`: `useUpdateUnit()` already handles optimistic mutations with invalidation; reuse for is_active_project toggle and status drag updates
- `src/components/ui/progress.tsx`: Progress bar — reuse on Kanban cards for painting_percentage
- `src/components/ui/badge.tsx`: Faction colored badge — same hex-driven approach as Phase 3 collection table
- `src/components/ui/sheet.tsx`: Recipe detail + edit form Sheet (same stacked pattern as unit detail → UnitSheet)
- `src/components/ui/sonner.tsx` + AppLayout Toaster: error toasts already wired
- `src/db/queries/recipePaints.ts`: Join table queries for recipe steps — read before writing new queries

### Established Patterns
- Feature folder: `src/features/` — Kanban goes in `src/features/painting-projects/`, Recipes in `src/features/recipes/`
- Optimistic update pattern: `useQueryClient` + `setQueryData` before mutation, rollback in `onError` + Sonner toast
- @dnd-kit: already installed for Kanban — reuse the same `@dnd-kit/core` and `@dnd-kit/sortable` for recipe step reordering (no extra install)
- TanStack Router: manual route tree in `src/app/router.tsx` — replace placeholders at `/painting-projects` and `/recipes`

### Integration Points
- `src/app/router.tsx`: replace PaintingProjectsPage and RecipesPage placeholders with real components
- Unit detail Sheet (Phase 3, `03-04-PLAN.md`): add "Recipes" read-only section — must coordinate with Phase 3 implementation
- `src/hooks/useUnits.ts`: is_active_project toggle must work from three locations — ensure `useUpdateUnit` mutation is called consistently

</code_context>

<specifics>
## Specific Ideas

- Kanban columns map directly to `PAINTING_STATUS_ORDER` (already defined in `src/types/unit.ts`) — use the same constant, skip "Not Started" from Kanban (those units aren't active projects) or include it as the entry column
- Recipe steps drag handle: small grip icon (GripVertical from lucide-react) on the left of each step row — same visual as typical sortable lists
- "Add project" picker on Kanban: a Command/Popover showing units where `is_active_project = 0`, searchable by name, clicking marks active and adds to board

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 04-painting-module*
*Context gathered: 2026-05-01*
