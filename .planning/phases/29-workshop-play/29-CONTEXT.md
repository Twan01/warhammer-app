# Phase 29: Workshop + Play - Context

**Gathered:** 2026-05-05
**Status:** Ready for planning

<domain>
## Phase Boundary

Paint list entries display color swatches, recipe rows show a compact horizontal swatch strip of linked paints, the Army List detail sheet gains a readiness panel answering "what's battle-ready?", and Battle Log entries display their linked army list's live battle-ready point count.

No new database tables. No new routes. No new pages. Enrichment of four existing surfaces with existing data.

</domain>

<decisions>
## Implementation Decisions

### Paint Color Swatches (WKSP-01)

- **Existing swatch preserved**: PaintRow already renders a 16×16px (h-4 w-4) rounded-full swatch circle next to the paint name — `hex_color` paints get a `backgroundColor` inline style, null `hex_color` paints get `bg-muted border border-border`
- **Scope**: PaintRow.tsx is the sole surface for WKSP-01 — "paint list entries" means the Paints page table rows
- **Consistency upgrade**: ensure every paint entry has a visually consistent swatch — the existing code already does this correctly with the hex_color / null fallback pattern
- **No new component needed**: the swatch rendering is inline in PaintRow (4 lines of JSX) — extracting a `PaintSwatch` component is acceptable if the recipe swatch strip needs the same rendering logic (Claude's discretion)

### Recipe Swatch Strip (WKSP-02)

- **Placement**: inline in the recipe table row — a new column or appended to the existing "Name" column cell showing a horizontal strip of paint swatches
- **Data source**: new batch query joining `recipe_paints` → `paints` to fetch `hex_color` per recipe — returns `Map<number, { paint_id: number; hex_color: string | null }[]>` keyed by recipe_id
- **Visual style**: overlapping circles (negative margin stack, `-ml-1` after the first) — compact, matches avatar stack pattern
- **Swatch size**: 12×12px (h-3 w-3) circles — smaller than the paint table swatch (16px) to fit a strip of multiple swatches without overwhelming the row
- **Max display**: show up to 8 swatches, then a `+N` indicator circle in `bg-muted text-xs` for overflow — typical recipes have 3-8 paints
- **Order**: by `order_index` ASC (recipe step order) — first swatch = first paint applied
- **Fallback**: paints without `hex_color` render as `bg-muted border border-border` circles (same pattern as PaintRow)
- **Hook**: new `useRecipeSwatchData()` in `src/hooks/useRecipePaints.ts` — fetches all recipe paint colors in one query, returns Map keyed by recipe_id
- **Cache invalidation**: invalidate on recipe_paint mutations (addRecipePaint, removeRecipePaint) — already covered by existing `useRecipePaints` invalidation patterns

### Army List Readiness Panel (PLAY-01)

- **Upgrade ArmyListSummaryBar in-place**: the existing component already computes total points, painted points (status_painting === "Completed"), and battle-ready percentage — extend it with a "not ready" unit list
- **Existing data sufficiency**: `useArmyListWithUnits` already returns `ArmyListUnitRow[]` with `status_painting`, `effective_points`, and `unit_name` — no new queries needed
- **Enhanced display**:
  - Keep existing stats row: Total pts, Painted pts, Battle-ready %
  - Add a thin progress bar below the stats (2px, bg-battle-gold fill for the ready portion, bg-muted track)
  - Add a collapsible "Not ready" section below listing units where `status_painting !== "Completed"` with their `unit_name` and a StatusBadge showing current status
- **Not-ready list format**: compact vertical list — each row shows unit name + StatusBadge (from Phase 25) — only shown when at least one unit is not "Completed"
- **Battle-ready definition**: `status_painting === "Completed"` — consistent with existing ArmyListSummaryBar logic and PAINTING_STATUS_ORDER
- **Live update**: automatic — useArmyListWithUnits already refetches on unit mutations via React Query invalidation; no additional wiring needed
- **Fully ready state**: when 100% battle-ready, show a gold-tinted "All units battle-ready" message (bg-battle-gold/10 text-battle-gold) instead of the not-ready list

### Battle Log Army Context (PLAY-02)

- **Placement**: enhance existing BattleLogRow line 2 — currently shows `armyListName · battle_date`; add battle-ready points inline: `armyListName (120/200 pts ready) · battle_date`
- **Live computation**: the point count must be the current live value derived from painting status, not a snapshot — requirement explicitly states this
- **Data strategy**: new batch query `getArmyListReadiness(armyListIds: number[])` in `src/db/queries/armyLists.ts` that computes total and battle-ready (status_painting = "Completed") points per army list in a single SQL query:
  ```sql
  SELECT al.id,
    SUM(COALESCE(alu.points_override, u.points, 0)) as total_points,
    SUM(CASE WHEN u.status_painting = 'Completed' THEN COALESCE(alu.points_override, u.points, 0) ELSE 0 END) as battle_ready_points
  FROM army_lists al
  JOIN army_list_units alu ON alu.list_id = al.id
  JOIN units u ON u.id = alu.unit_id
  WHERE al.id IN (...)
  GROUP BY al.id
  ```
- **New hook**: `useArmyListReadiness(armyListIds: number[])` in `src/hooks/useArmyLists.ts` — returns `Map<number, { total: number; battleReady: number }>`
- **Query key**: `['army-list-readiness', ...sortedIds]` — invalidated by unit mutations (painting status changes) and army list unit mutations
- **Display when army_list_id is null**: show nothing (existing "No army list" italic text remains)
- **Display when army list deleted**: show existing "(Army list deleted)" italic text — no points display
- **Display format**: `armyListName (120/200 pts ready) · battle_date` — parenthetical inline with army name, tabular-nums for point values

### Claude's Discretion

- Whether to extract a shared `PaintSwatch` component used by both PaintRow and recipe swatch strip, or keep rendering inline
- Exact SQL for the batch recipe paint colors query (CTE vs subquery vs simple JOIN)
- ArmyListSummaryBar progress bar exact styling (rounded corners, height)
- Whether the "Not ready" section in ArmyListSummaryBar is collapsible (Collapsible component) or always visible
- RecipeTable swatch strip placement: new column vs appended to name column
- Cache invalidation key structure for useArmyListReadiness

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` §WKSP-01, WKSP-02, PLAY-01, PLAY-02 — Acceptance criteria for all four Workshop + Play requirements

### Phase 25 outputs (design system prerequisites)
- `.planning/phases/25-design-foundation/25-CONTEXT.md` — StatusBadge API, battle-gold token, design tokens
- `src/components/ui/status-badge.tsx` — StatusBadge component (4-tier color system, dot+text format) for readiness panel unit list
- `src/styles/globals.css` — `--color-battle-gold` CSS variable for readiness bar fill

### Phase 28 outputs (co-dependency)
- `.planning/phases/28-collection-projects/28-CONTEXT.md` — StatusBadge integration patterns, batch query patterns

### Paint inventory code to modify
- `src/features/paints/PaintRow.tsx` — Existing swatch rendering (lines 28-36) — verify consistency with WKSP-01
- `src/features/paints/PaintsPage.tsx` — Paint list page context (table-based layout, no cards)

### Recipe code to modify
- `src/features/recipes/RecipeTable.tsx` — Table component receiving recipe data + step counts
- `src/features/recipes/RecipeTableColumns.tsx` — Column definitions (add swatch strip column or integrate into name column)
- `src/features/recipes/RecipeDetailSheet.tsx` — Detail view already renders per-step paints with owned/missing indicators
- `src/features/recipes/RecipesPage.tsx` — Page root (add useRecipeSwatchData call)

### Army list code to modify
- `src/features/army-lists/ArmyListDetailSheet.tsx` — Sheet containing ArmyListSummaryBar
- `src/features/army-lists/ArmyListSummaryBar.tsx` — Summary bar to upgrade with readiness panel (total/painted/battle-ready stats already computed)
- `src/features/army-lists/ArmyListUnitRow.tsx` — Unit rows in the detail sheet

### Battle log code to modify
- `src/features/battle-log/BattleLogRow.tsx` — Row component (line 2: army name + date — add points)
- `src/features/battle-log/BattleLogPage.tsx` — Page root (add useArmyListReadiness call, pass data to rows)

### Query/hook code to extend
- `src/db/queries/recipePaints.ts` — Add batch recipe paint colors query
- `src/db/queries/armyLists.ts` — Add getArmyListReadiness() batch query
- `src/hooks/useRecipePaints.ts` — Add useRecipeSwatchData() hook
- `src/hooks/useArmyLists.ts` — Add useArmyListReadiness() hook

### Type definitions
- `src/types/paint.ts` — Paint interface with `hex_color: string | null`
- `src/types/recipePaint.ts` — RecipePaint interface (recipe_id, paint_id, order_index)
- `src/types/armyList.ts` — ArmyListUnitRow with `status_painting`, `effective_points`, `unit_name`

### Established patterns
- Batch query + Map pattern (Phase 18 armyListNameById, Phase 28 useKanbanEnrichment)
- COALESCE for effective_points in SQL (never reimplemented in JS)
- `status_painting === "Completed"` as the battle-ready definition
- Sibling portal pattern for sheets
- tabular-nums for numeric display

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `PaintRow.tsx` swatch rendering (lines 28-36): existing 16px rounded-full circle with hex_color or muted fallback — reusable pattern for recipe strip
- `StatusBadge` (Phase 25): dot+text format for painting status — use in readiness panel "not ready" list
- `ArmyListSummaryBar.tsx`: already computes total/painted/battle-ready using `status_painting === "Completed"` — upgrade in-place
- `relativeTime()` from Phase 26: available if needed for any date display
- `getNextActionHint()` from Phase 26: available for readiness panel next-action suggestions per unit

### Established Patterns
- PaintRow already has a swatch — WKSP-01 may be partially satisfied by existing code; verify coverage
- RecipeDetailSheet renders per-step paints with owned/missing dot indicators (line 126-134) — swatch strip is a table-level summary, not a detail sheet change
- ArmyListSummaryBar uses the `Completed` status check — any readiness logic must use the same string
- BattleLogRow receives `armyListName` as a pre-resolved prop — readiness points should follow the same pattern (pre-resolved at page level, passed as prop)

### Integration Points
- `RecipesPage.tsx` — calls useRecipes + useAllStepCounts; add useRecipeSwatchData at this level, pass to RecipeTable
- `BattleLogPage.tsx` — already builds armyListNameById and unitNameById Maps; add armyListReadiness Map alongside
- `ArmyListDetailSheet.tsx` — passes `units` to ArmyListSummaryBar; no new prop needed since units[] already has all readiness data
- `src/hooks/useArmyLists.ts` — existing file with ARMY_LISTS_KEY, useArmyLists, useArmyListWithUnits — add useArmyListReadiness

</code_context>

<specifics>
## Specific Ideas

- WKSP-01 swatch consistency check: PaintRow already renders swatches, but verify that ALL paints in the table have visually consistent treatment (the existing code looks correct — hex fills or muted fallback)
- WKSP-02 overlapping circle strip gives a "palette preview" feel — similar to how design tools show layer thumbnails stacked
- PLAY-01 readiness panel should feel like a pre-game checklist: "here's what you still need to paint before game night"
- PLAY-02 live points are explicitly called out in the requirement — this is NOT a snapshot; it must recompute from current painting status each time the page loads
- BattleLogRow line 2 format: `Ultramarines 2000pts (120/200 pts ready) · 2026-05-01` — army name comes first, readiness in parenthetical, date last

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 29-workshop-play*
*Context gathered: 2026-05-05*
