# Phase 33: Data Intelligence - Context

**Gathered:** 2026-05-06
**Status:** Ready for planning

<domain>
## Phase Boundary

Log Session gains the ability to update a unit's painting status in the same action with proper cache invalidation. The Spending page surfaces cost-per-model and painted-vs-unpainted value metrics. Recipe–unit associations become navigable from both the recipe and unit sides. CurrentFocusCard displays the linked recipe name. No schema changes — all data is derived from existing tables and relationships.

</domain>

<decisions>
## Implementation Decisions

### Log Session Status Update (DATA-01, DATA-02)
- LogSessionSheet gains an optional "Update Painting Status" Select dropdown between the Unit picker and Date field
- Default value: "No change" (null/empty) — submitting without selecting a status logs the session only, no unit update
- Dropdown options: "No change" + all 11 values from PAINTING_STATUS_ORDER
- Status update is atomic with session creation — the onSubmit handler calls both createSession and updateUnit in sequence (updateUnit only if a status was selected)
- If updateUnit fails after createSession succeeds, show a warning toast ("Session logged but status update failed") — don't roll back the session
- After submit with status change, invalidate all affected caches:
  - `["painting-sessions", unitId]` (existing — from session creation)
  - `["dashboard-stats"]` (existing — from session creation via hobby-analytics)
  - `["units"]` (from status change — useUpdateUnit pattern)
  - `["hobby-analytics"]` (existing — from session creation)
  - `["recent-activity"]` (existing — from session creation)
  - `["goal-progress"]` (existing — from session creation)
  - `["army-list-readiness"]` (from status change — Completed status affects battle-ready points)
  - `["spending-stats"]` (from status change — Completed count affects cost-per-model metric)
- The Zod schema (logSessionSchema) gains an optional `new_status` field: `z.enum(PAINTING_STATUS_ORDER).nullable().optional()`

### Spending Intelligence Metrics (DATA-03, DATA-04)
- Two new metric cards appear between the hero "Total Hobby Spend" card and the "Monthly Trend" section
- Metric 1: "Cost Per Completed Model" — `totalPence / count of units where status_painting === "Completed"` displayed via formatCurrency
- Metric 2: "Painted vs Unpainted Value" — two figures: sum of purchase_price_pence for Completed units (painted value) vs sum for all other units (unpainted/in-progress value)
- When no units are at Completed status: cost-per-model shows "—" (not zero, not infinity), painted value shows £0.00, unpainted value shows full total
- Metric cards use same Card styling as hero card but without the ring-2 accent — `bg-card border border-border/60 shadow-sm` with label above and value below
- Metrics are computed in computeSpendingStats.ts — extend the SpendingStats interface with `costPerCompletedModelPence: number | null` and `paintedValuePence: number` and `unpaintedValuePence: number`
- The computation needs unit status_painting data — extend the unit Pick type in computeSpendingStats to include `status_painting`

### Recipe-Unit Bidirectional Navigation (DATA-05)
- RecipeDetailSheet already shows "Linked Unit" as text — upgrade to a `variant="link"` Button that closes the sheet and navigates to `/collection` (matches the pattern in UnitDetailSheet's recipe links)
- UnitDetailSheet already shows "Linked Recipes" with navigation to /recipes — this is sufficient for the unit→recipe direction
- Both directions are already structurally present; the main gap is making RecipeDetailSheet's unit name clickable/navigable
- RecipeDetailSheet also lists which units use the recipe — since the FK is `recipe.unit_id`, one recipe links to at most one unit, so the existing single "Linked Unit" field is correct (not a list)

### Focus Card Recipe Display (DATA-06)
- CurrentFocusCard shows the linked recipe name when the focus unit has an associated recipe
- Display position: below the faction name in the metadata stack, as small muted text with a Palette icon from lucide-react
- Recipe data comes from the `getRecipeNamesByUnitIds` query (already exists in recipes.ts) — call it for the focus unit ID
- When no recipe is linked: omit the recipe line entirely (don't show "No recipe" — keeps the card clean)
- When multiple recipes are linked to the focus unit: show the first recipe name + "(+N more)" suffix

### Claude's Discretion
- Exact visual layout of the two spending metric cards (side-by-side in a grid-cols-2 or stacked)
- Whether the status dropdown in LogSessionSheet uses the same StatusBadge colors/styling as the collection page
- Loading skeleton adjustments for the new spending metrics section
- Whether RecipeDetailSheet's unit link navigates to /collection or opens a unit detail (simpler to just navigate)
- Error handling details for the atomic session+status update flow
- How to pass recipe data to CurrentFocusCard (prop from DashboardPage or internal hook call)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` §DATA-01, DATA-02, DATA-03, DATA-04, DATA-05, DATA-06 — Acceptance criteria for all 6 data intelligence requirements

### Phase 31 context (CurrentFocusCard)
- `.planning/phases/31-focus-projects-panels/31-CONTEXT.md` — CurrentFocusCard v2 design (photo, metadata, action buttons) — DATA-06 recipe name adds to this card's metadata

### Phase 30 context (grid layout)
- `.planning/phases/30-grid-layout-foundation/30-CONTEXT.md` — Dashboard bento grid structure

### LogSessionSheet (DATA-01, DATA-02)
- `src/features/dashboard/LogSessionSheet.tsx` — Current session logging form; add optional status dropdown
- `src/features/dashboard/logSessionSchema.ts` — Zod schema to extend with `new_status` field
- `src/hooks/useJournalSessions.ts` — `useCreatePaintingSession` mutation; cache invalidation patterns
- `src/hooks/useUnits.ts` — `useUpdateUnit` mutation; cache invalidation patterns for status changes

### Spending page (DATA-03, DATA-04)
- `src/features/spending/SpendingPage.tsx` — Current layout; add metric cards section
- `src/features/spending/computeSpendingStats.ts` — Pure aggregation function; extend with cost-per-model and value split
- `src/hooks/useSpendingStats.ts` — Spending query hook; may need to include status_painting in unit data

### Recipe-unit navigation (DATA-05)
- `src/features/recipes/RecipeDetailSheet.tsx` — Shows "Linked Unit" as text (line 86-88); upgrade to navigable link
- `src/features/units/UnitDetailSheet.tsx` — Already shows "Linked Recipes" with nav buttons (lines 197-220)
- `src/db/queries/recipes.ts` — `getRecipeNamesByUnitIds` batch lookup; recipe CRUD with unit_id FK

### CurrentFocusCard recipe display (DATA-06)
- `src/features/dashboard/CurrentFocusCard.tsx` — Add recipe name display to metadata section
- `src/features/dashboard/DashboardPage.tsx` — Wire recipe data to CurrentFocusCard
- `src/db/queries/recipes.ts` — `getRecipeNamesByUnitIds()` for batch recipe lookup by unit IDs

### Type definitions
- `src/types/unit.ts` — Unit interface, PAINTING_STATUS_ORDER (11 statuses)
- `src/types/recipe.ts` — PaintingRecipe interface (unit_id FK)

### Cache invalidation reference
- `src/hooks/useUnits.ts` — useUpdateUnit invalidation list (dashboard-stats, units, spending-stats, hobby-analytics, army-list-readiness, army-lists)
- `src/hooks/useJournalSessions.ts` — useCreatePaintingSession invalidation list (painting-sessions per unit, hobby-analytics, recent-activity, goal-progress)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `LogSessionSheet` (`src/features/dashboard/LogSessionSheet.tsx`): Already has unit picker, form setup, defaultUnitId prop — extend with status dropdown
- `computeSpendingStats` (`src/features/spending/computeSpendingStats.ts`): Pure function taking units + factions + paintsPence — extend to compute new metrics
- `getRecipeNamesByUnitIds` (`src/db/queries/recipes.ts`): Batch query already exists — reuse for CurrentFocusCard recipe lookup
- `PAINTING_STATUS_ORDER` (`src/types/unit.ts`): All 11 status values — use for the status dropdown options
- `StatusBadge` (`src/components/ui/status-badge.tsx`): Color-coded status display — optionally reuse styling in the status dropdown
- `useUpdateUnit` (`src/hooks/useUnits.ts`): Existing mutation with comprehensive cache invalidation — call alongside createSession

### Established Patterns
- Cache invalidation symmetry: if a mutation creates data that affects a query, it must invalidate that query key
- Integer pence discipline: all currency stored in pence, formatCurrency is the only /100 site
- logSessionSchema uses `.default()`-free pattern with `buildDefaultValues()` (Pitfall 8)
- Sibling portal pattern: Sheets are top-level siblings, not nested inside grid sections
- `variant="link"` Button for cross-page navigation (used in UnitDetailSheet for recipe links)

### Integration Points
- LogSessionSheet.onSubmit calls `createSession.mutateAsync` — extend to also call `updateUnit.mutateAsync` when status selected
- SpendingPage reads from `useSpendingStats()` — the underlying query may need to include `status_painting` in the unit data it fetches
- DashboardPage already renders CurrentFocusCard with `unit` and `faction` props — add recipe data prop
- RecipeDetailSheet already has `units` data loaded (`useUnits()`) — just need to make the unit name clickable

</code_context>

<specifics>
## Specific Ideas

- The Log Session status update should feel like a natural extension of the session logging flow — "I just painted for 45 minutes and moved this unit to Basecoated" in one action
- Spending intelligence metrics should feel like dashboard-level insights — glanceable numbers that answer "how much does a finished model cost me?" and "how much of my collection value is actually painted?"
- Recipe name on CurrentFocusCard creates a "what am I painting, how am I painting it" at-a-glance view that ties the collection and recipe systems together on the dashboard

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 33-data-intelligence*
*Context gathered: 2026-05-06*
