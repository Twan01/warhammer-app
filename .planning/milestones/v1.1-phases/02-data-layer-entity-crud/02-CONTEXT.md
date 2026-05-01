# Phase 2: Data Layer + Entity CRUD - Context

**Gathered:** 2026-04-30
**Status:** Ready for planning

<domain>
## Phase Boundary

Deliver the full data layer and three entity CRUD surfaces: (1) schema — all 10 tables in a single migration with FK constraints verified, (2) seed data, (3) TypeScript types + query modules + TanStack Query hooks for all entities, (4) Faction CRUD page (complete), (5) Unit CRUD UI (form), (6) minimal Paints page (list + add/edit). No Collection filters, no Kanban, no Recipe builder — those are Phase 3 and 4.

</domain>

<decisions>
## Implementation Decisions

### Unit form structure
- Two-step layout: required fields always visible at top, optional fields in a collapsible "More details" section at the bottom — all inside a Sheet
- Required (always shown): name, faction (dropdown), category (combobox with suggestions)
- Optional (collapsible): all status fields (painting_status, painting_percentage, status_assembly, status_basing, status_varnished, is_active_project, priority, target_completion_date), counts (model_count, owned_count), points, purchase_date, purchase_price, storage_location, main_image_path, notes
- `painting_status` displays as a shadcn Select dropdown in PAINTING_STATUS_ORDER order
- Same Sheet component used for both create and edit; `key={unit.id}` prevents stale state on re-open

### Paint management surface
- Minimal Paints page (accessible from sidebar nav) — not a placeholder, but not the full inventory UI
- List shows: name, brand, paint_type, owned badge — no running-low or wishlist columns in Phase 2
- "Add paint" button opens a Sheet with the full PAINT-01 field set
- Edit and delete from each row
- Full inventory features (filters, running-low view, wishlist) come in Phase 4

### Faction color picker
- Native `<input type="color">` in the faction form, with a live preview swatch next to it (a colored circle that updates as you pick)
- Color stored as hex string (e.g., `#4A90D9`)
- Color accent on the faction list: 4px left border strip on each faction card, rendered via inline `style={{ borderLeftColor: faction.color_theme }}`
- The accent pattern from FACT-05 is scoped to the Faction page only in Phase 2; Phase 3+ extends it to unit cards

### FK error UX
- FK violations (delete faction with units, delete paint used in a recipe step) surface as Sonner toasts
- Toast message mentions the specific dependency: "Cannot delete faction — it still has units assigned." / "Cannot delete paint — it's used in a recipe step."
- The delete confirm dialog closes normally; the toast appears immediately after the failed mutation
- Consistent with POLISH-03 (all mutation errors via Sonner toast)

### Claude's Discretion
- Exact field ordering within the collapsible section of the unit form
- Sheet width (standard shadcn Sheet size)
- Toast duration and variant (error/destructive styling via Sonner)
- Loading skeleton design for lists while data fetches

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Data layer spec
- `.planning/REQUIREMENTS.md` §Database — DATA-01 through DATA-09: getDb() singleton, FK pragma, migration strategy, TypeScript types, query module layout, hooks pattern, invalidation rules
- `.planning/REQUIREMENTS.md` §Seed Data — SEED-01 through SEED-06: seed content (real GW faction names + README disclaimer), INSERT OR IGNORE idempotency, stable IDs

### Entity schemas and CRUD rules
- `.planning/REQUIREMENTS.md` §Factions — FACT-01 through FACT-05: faction fields, FK delete constraint, color_theme accent requirement
- `.planning/REQUIREMENTS.md` §Units / Collection Schema — UNIT-01 through UNIT-06: all unit fields, status fields, PAINTING_STATUS_ORDER constant location
- `.planning/REQUIREMENTS.md` §Paints — PAINT-01 through PAINT-02: paint fields, FK delete constraint; PAINT-03 confirms full inventory UI is Phase 4

### Existing implementation to read first
- `src/db/client.ts` — getDb() singleton + FK pragma already implemented (DATA-01/02 done); query modules must import from here, never re-implement Database.load()

### Architecture constraints
- `.planning/REQUIREMENTS.md` §Out of Scope — Prisma and Drizzle at runtime explicitly excluded; tauri-plugin-sql directly is the path
- `.planning/PROJECT.md` — visual style ("dark slate background, faction-colored accents, rounded cards, serious dashboard"), folder structure for DB access

### Phase goal and success criteria
- `.planning/ROADMAP.md` §Phase 2 — 5 success criteria and the 4-plan breakdown (02-01 schema, 02-02 types+hooks, 02-03 faction UI, 02-04 unit+paint UI)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/db/client.ts`: `getDb()` singleton with FK pragma — DATA-01 and DATA-02 are already done; query modules just import this
- `src/components/ui/sheet.tsx`: Sheet for all add/edit forms (consistent with Phase 3 plans)
- `src/components/ui/select.tsx`: for painting_status dropdown and paint_type in forms
- `src/components/ui/command.tsx` + `src/components/ui/popover.tsx`: for the category combobox (UNIT-01)
- `src/components/ui/dialog.tsx`: for delete confirm modals (POLISH-01)
- `src/components/ui/sonner.tsx`: for mutation error toasts (POLISH-03)
- `src/components/ui/badge.tsx`: for owned badge on paints list, and faction-color badges later
- `src/components/ui/form.tsx` + `src/components/ui/input.tsx`: for all form fields
- `src/components/ui/progress.tsx`: available for painting_percentage display
- `src/components/common/PlaceholderPage.tsx`: pattern to follow for new page components
- `src/components/common/AppLayout.tsx`: wraps all pages — new feature pages slot in via router, no layout changes needed

### Established Patterns
- Feature folder structure: `src/features/<entity>/` — page component + sub-components live here
- DB access chain: `src/db/queries/<entity>.ts` calls `getDb()` → hook in `src/hooks/use<Entity>.ts` wraps query function → component calls hook only
- Query client configured with `staleTime: 5min, gcTime: 10min, refetchOnWindowFocus: false` (already set in QueryProvider)
- TanStack Router: manual route tree in `src/app/router.tsx`; new pages are added as `createRoute` entries pointing to feature page components

### Integration Points
- `src/app/router.tsx`: add routes for `/factions`, `/paints` (already has nav entries from Phase 1 sidebar — just need real page components)
- `src/hooks/`: add `useFactions.ts`, `useUnits.ts`, `usePaints.ts`, `useRecipes.ts` (and `useRecipePaints.ts`)
- `src/types/`: add entity types (Faction, Unit, Paint, PaintingRecipe, RecipePaint)
- `src/db/queries/`: add `factions.ts`, `units.ts`, `paints.ts`, `recipes.ts`, `recipePaints.ts`
- `src-tauri/migrations/`: create `001_core_schema.sql`, `002_seed_factions.sql`, `003_seed_data.sql`

</code_context>

<specifics>
## Specific Ideas

- FK pragma already done: `src/db/client.ts` runs `PRAGMA foreign_keys = ON` immediately on first load — the planner should verify DATA-01/02 as done, not re-implement them
- Seed data uses real GW faction names (Tau Empire, Ultramarines, Necrons, Tyranids) — this is a conscious decision with SEED-06 requiring a README disclaimer; do not replace with fictional names
- PAINTING_STATUS_ORDER constant: defined in `src/types/` (not in a component), used to order the status dropdown and later the Kanban columns
- `model_instances` table explicitly NOT created — the schema must not include it (DATA-04)

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 02-data-layer-entity-crud*
*Context gathered: 2026-04-30*
