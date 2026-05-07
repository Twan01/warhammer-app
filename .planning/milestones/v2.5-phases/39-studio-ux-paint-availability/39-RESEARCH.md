# Phase 39: Studio UX + Paint Availability - Research

**Researched:** 2026-05-07
**Domain:** React UI transformation — card grid, timeline detail view, batch SQL aggregation, React Query cache invalidation
**Confidence:** HIGH

## Summary

Phase 39 is a pure UI transformation and query layer extension built on top of Phase 37/38 foundations. No new DB migrations are needed — all data already exists in `recipe_steps`, `paints`, and `painting_recipes`. The work falls into four distinct areas: (1) replace `RecipeTable` with a new `RecipeCardGrid` component, (2) extend `RecipeDetailSheet` with a vertical timeline, (3) add a batch paint availability query + hook, and (4) extend the RecipesPage filter bar with three new dropdown filters and one toggle.

All patterns needed for this phase already exist in the codebase. The swatch strip rendering is proven in `RecipeTableColumns.tsx` (lines 125-148) and tested in `tests/workshop-play/recipeSwatchData.test.ts`. The Popover + Command filter pattern exists in `RecipesPage` as `FactionFilter` and `UnitFilter`. The batch query → Map pattern exists in `getStepCountsByRecipe` / `useAllStepCounts`. The card component exists in `src/components/ui/card.tsx`.

The single most important architectural decision already locked in CONTEXT.md is the new batch query `getRecipePaintAvailability()` that returns `{recipe_id, owned, missing, running_low}` aggregates in one SQL round-trip, and the corresponding `useRecipePaintAvailability()` hook that maps results to `Map<recipe_id, AvailabilityStats>`. Cache invalidation symmetry requires `RECIPE_AVAILABILITY_KEY` to be added to `useUpdatePaint` and `useDeletePaint` in `usePaints.ts` — currently those mutations do NOT invalidate any recipe availability data.

**Primary recommendation:** Mirror the `getStepCountsByRecipe` → `useAllStepCounts` pattern exactly for paint availability. New components (`RecipeCardGrid`, `RecipeCard`, `RecipeStepTimeline`) are additive — the old `RecipeTable` is deleted, not modified.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Replace RecipeTable entirely with a responsive card grid (no table/grid toggle)
- Card shows: name, faction badge, swatch strip (overlapping 12px circles, WKSP-02 pattern), difficulty badge, estimated time, step count, surface label, paint availability indicator
- CSS grid with `auto-fill, minmax(~280px)` for responsive column count
- Cards use `src/components/ui/card.tsx` with consistent elevation and hover effects
- Faction badge uses existing `Badge` with `backgroundColor: faction.color_theme`
- Click opens existing `RecipeDetailSheet` (enhanced, not replaced)
- Step timeline: vertical layout, connecting line, phase label badge, paint swatch circle, step title, tool/technique/dilution inline, per-step time
- Recipe metadata (style, surface, effect, difficulty, estimated total time) as badge row under title in sheet header
- Linked unit and area fields remain in detail view
- Timeline replaces the current plain `<ol>` list of steps
- Availability badge: green dot "N owned" / red dot "N missing" / amber dot "N low" / combined "3 owned · 1 missing"
- New batch query `getRecipePaintAvailability()` — join recipe_steps → paints, aggregate per recipe_id
- New hook `useRecipePaintAvailability()` returning `Map<recipe_id, { owned: number; missing: number; runningLow: number }>`
- `RECIPE_AVAILABILITY_KEY` invalidated when paint ownership changes (paint mutations)
- `isPaintMissing` definition: `paint.owned !== 1`
- Running low: `paint.running_low === 1`
- Steps with `paint_id = 0 or null` excluded from count
- Three new dropdown filters: surface (RECIPE_SURFACES), style (RECIPE_STYLES), difficulty (RECIPE_DIFFICULTIES)
- One "Has missing paints" toggle button
- Filter state: inline `useState` (match existing RecipesPage pattern)
- Filters are ephemeral — reset on navigation
- "Clear filters" button must include new filters in reset logic
- Surface/style/difficulty filters use Popover + Command pattern matching existing FactionFilter

### Claude's Discretion
- Exact card dimensions, padding, and spacing within the responsive grid
- Whether difficulty badge uses color coding (green/yellow/orange/red) or uniform styling
- Step timeline node exact visual design (circle vs line-dot vs pill for the connecting line)
- Whether detail view shows "Start painting" CTA or remains read-only (read-only is fine)
- Exact responsive breakpoints for card grid columns
- Card hover/focus interaction details
- Whether to show "No paints linked" in availability badge when a recipe has zero paint links

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| STUDIO-01 | User can view recipes as a card grid with color swatches, metadata badges, and availability indicator | RecipeCardGrid component; swatch strip from RecipeTableColumns lines 125-148; useRecipeSwatchData, useAllStepCounts, useRecipePaintAvailability all feed the card |
| STUDIO-02 | User can view recipe detail as a step-by-step vertical timeline | RecipeDetailSheet enhanced with RecipeStepTimeline component; RecipeStep fields (painting_phase, tool, technique, dilution, time_estimate_minutes) are all populated by Phase 38 |
| STUDIO-04 | User can filter recipes by surface, style, difficulty, and missing paints | Four new filter controls in RecipesPage filter bar; filtered useMemo extended; Popover+Command pattern from FactionFilter |
| PAINT-01 | User can see owned/missing/running-low paint count as a badge on recipe cards | getRecipePaintAvailability() batch query; useRecipePaintAvailability() hook; RECIPE_AVAILABILITY_KEY invalidated by paint mutations |
</phase_requirements>

---

## Standard Stack

### Core (already installed — no new dependencies)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React 19 | 19.2.5 | Component rendering | Project stack |
| TailwindCSS 4 | 4.x | Utility CSS, grid layout | Project stack — CSS-first, `@theme inline {}` |
| shadcn/ui Card | installed | Recipe card container | Project UI library (new-york style, zinc base) |
| shadcn/ui Badge | installed | Faction, difficulty, phase label badges | Project UI library |
| Lucide React | installed | Icons (e.g., Clock, Layers, Palette, AlertCircle) | Project icon library |
| React Query 5 | 5.100.6 | Server state, batch queries, cache invalidation | Project state layer |

### No New Dependencies

This phase requires zero new packages. All UI primitives, icons, and state management tools already exist.

---

## Architecture Patterns

### Recommended Project Structure (new files)

```
src/features/recipes/
  RecipeCardGrid.tsx        # NEW — replaces RecipeTable; renders CSS grid of RecipeCard
  RecipeCard.tsx            # NEW — single card with swatch strip, badges, availability
  RecipeStepTimeline.tsx    # NEW — vertical timeline component for RecipeDetailSheet
  RecipeTable.tsx           # DELETE — replaced by RecipeCardGrid
  RecipeTableColumns.tsx    # DELETE — column definitions no longer needed
  (all others — unchanged or extended)

src/db/queries/
  recipePaints.ts           # EXTEND — add getRecipePaintAvailability()

src/hooks/
  useRecipePaints.ts        # EXTEND — add useRecipePaintAvailability() + RECIPE_AVAILABILITY_KEY
  usePaints.ts              # EXTEND — add RECIPE_AVAILABILITY_KEY invalidation to useUpdatePaint + useDeletePaint
```

### Pattern 1: Batch Availability Query (mirrors getStepCountsByRecipe)

**What:** A single GROUP BY + CASE WHEN query that aggregates owned/missing/running_low counts per recipe_id across all recipes in one SQL round-trip.

**When to use:** Any time a card-level badge needs aggregated data across all recipes.

**SQL:**
```sql
-- Source: mirrors getStepCountsByRecipe in src/db/queries/recipePaints.ts
SELECT
  rs.recipe_id,
  COUNT(CASE WHEN p.owned = 1 AND p.running_low = 0 THEN 1 END) AS owned,
  COUNT(CASE WHEN p.owned != 1 THEN 1 END) AS missing,
  COUNT(CASE WHEN p.owned = 1 AND p.running_low = 1 THEN 1 END) AS running_low
FROM recipe_steps rs
JOIN paints p ON p.id = rs.paint_id
WHERE rs.paint_id IS NOT NULL AND rs.paint_id != 0
GROUP BY rs.recipe_id
```

**TypeScript (query layer):**
```typescript
// src/db/queries/recipePaints.ts
export interface RecipePaintAvailability {
  recipe_id: number;
  owned: number;
  missing: number;
  running_low: number;
}

export async function getRecipePaintAvailability(): Promise<RecipePaintAvailability[]> {
  const db = await getDb();
  return db.select<RecipePaintAvailability[]>(
    `SELECT
       rs.recipe_id,
       COUNT(CASE WHEN p.owned = 1 AND p.running_low = 0 THEN 1 END) AS owned,
       COUNT(CASE WHEN p.owned != 1 THEN 1 END) AS missing,
       COUNT(CASE WHEN p.owned = 1 AND p.running_low = 1 THEN 1 END) AS running_low
     FROM recipe_steps rs
     JOIN paints p ON p.id = rs.paint_id
     WHERE rs.paint_id IS NOT NULL AND rs.paint_id != 0
     GROUP BY rs.recipe_id`,
    []
  );
}
```

### Pattern 2: Hook with Map result (mirrors useAllStepCounts)

```typescript
// src/hooks/useRecipePaints.ts
export const RECIPE_AVAILABILITY_KEY = ["recipe-paint-availability"] as const;

export interface AvailabilityStats {
  owned: number;
  missing: number;
  runningLow: number;
}

export function useRecipePaintAvailability() {
  return useQuery({
    queryKey: RECIPE_AVAILABILITY_KEY,
    queryFn: async () => {
      const rows = await getRecipePaintAvailability();
      return new Map<number, AvailabilityStats>(
        rows.map((r) => [r.recipe_id, { owned: r.owned, missing: r.missing, runningLow: r.running_low }])
      );
    },
  });
}
```

### Pattern 3: Cache Invalidation in usePaints.ts

The `useUpdatePaint` and `useDeletePaint` mutations currently do NOT invalidate recipe availability. They must be extended:

```typescript
// src/hooks/usePaints.ts — add to useUpdatePaint onSuccess
qc.invalidateQueries({ queryKey: RECIPE_AVAILABILITY_KEY });

// src/hooks/usePaints.ts — add to useDeletePaint onSuccess
qc.invalidateQueries({ queryKey: RECIPE_AVAILABILITY_KEY });
```

Import `RECIPE_AVAILABILITY_KEY` from `@/hooks/useRecipePaints`.

Note: `useCreatePaint` does NOT need this invalidation — creating a new paint cannot affect existing recipe availability (no recipe links a non-existent paint).

### Pattern 4: CSS Grid Card Layout

```tsx
// RecipeCardGrid.tsx — grid wrapper
<div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}>
  {filtered.map((recipe) => (
    <RecipeCard key={recipe.id} ... />
  ))}
</div>
```

Tailwind v4 note: `grid-cols-[repeat(auto-fill,minmax(280px,1fr))]` arbitrary value syntax works in v4. Alternatively use inline `style` for the auto-fill pattern.

### Pattern 5: Swatch Strip Extraction

The swatch strip JSX in `RecipeTableColumns.tsx` lines 125-148 must be extracted into a standalone `SwatchStrip` component (or inline in `RecipeCard`). The visual spec is proven: overlapping 12px circles, `-ml-1` negative margin, 8-max + `+N` overflow.

```tsx
// Extractable from RecipeTableColumns.tsx lines 125-148
function SwatchStrip({ swatches }: { swatches: { paint_id: number; hex_color: string | null }[] }) {
  const total = swatches.length;
  if (total === 0) return <span className="text-sm text-muted-foreground">--</span>;
  return (
    <div className="flex items-center">
      {swatches.slice(0, 8).map((s, i) => (
        <span
          key={s.paint_id}
          className={`inline-block h-3 w-3 rounded-full border border-border shrink-0${i > 0 ? " -ml-1" : ""}${s.hex_color ? "" : " bg-muted"}`}
          style={s.hex_color ? { backgroundColor: s.hex_color } : undefined}
          aria-hidden="true"
        />
      ))}
      {total > 8 && (
        <span className="inline-flex items-center justify-center h-3 w-3 rounded-full bg-muted -ml-1 text-[8px] text-muted-foreground">
          +{total - 8}
        </span>
      )}
    </div>
  );
}
```

### Pattern 6: Vertical Timeline in RecipeDetailSheet

Replace the `<ol>` at lines 133-160 of RecipeDetailSheet.tsx with a timeline using relative/absolute positioning:

```tsx
// Each step node
<div className="relative pl-8">
  {/* Connecting line (except last step) */}
  {!isLast && (
    <div className="absolute left-3 top-5 bottom-0 w-px bg-border" />
  )}
  {/* Node dot */}
  <div
    className="absolute left-1.5 top-1.5 h-3 w-3 rounded-full border-2 border-border"
    style={paint?.hex_color ? { backgroundColor: paint.hex_color } : undefined}
  />
  {/* Step content */}
  <div>
    {step.painting_phase && (
      <Badge variant="outline" className="text-[10px] mb-1">{step.painting_phase}</Badge>
    )}
    <p className="text-sm font-medium">{step.step_name}</p>
    {/* tool / technique / dilution inline */}
    {/* time estimate */}
  </div>
</div>
```

### Pattern 7: New Filter Controls (Popover + Command — single-select)

Mirror the existing `UnitFilter` pattern (single-select with `onChange(null)` for "Any"):

```tsx
function SurfaceFilter({ value, onChange }: { value: string | null; onChange: (v: string | null) => void }) {
  const [open, setOpen] = useState(false);
  const label = value ?? "Surface";
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm">{label}</Button>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-0">
        <Command>
          <CommandList>
            <CommandGroup>
              <CommandItem value="__any__" onSelect={() => { onChange(null); setOpen(false); }}>
                Any surface
              </CommandItem>
              {RECIPE_SURFACES.map((s) => (
                <CommandItem key={s} value={s} onSelect={() => { onChange(s); setOpen(false); }}>
                  {s}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
```

Apply same pattern for `StyleFilter` and `DifficultyFilter`.

### Pattern 8: "Has missing paints" Toggle

```tsx
<Button
  variant={hasMissingFilter ? "default" : "outline"}
  size="sm"
  onClick={() => setHasMissingFilter((prev) => !prev)}
>
  Missing paints
</Button>
```

Filter logic in `useMemo`:
```typescript
if (hasMissingFilter) {
  const avail = availabilityByRecipe.get(r.id);
  if (!avail || avail.missing === 0) return false;
}
```

### Pattern 9: RecipesPage Data Flow Extension

RecipesPage already owns all data hooks at page level. The pattern is to add `useRecipePaintAvailability()` alongside existing hooks and pass `availabilityByRecipe` down to `RecipeCardGrid`:

```tsx
// RecipesPage.tsx additions
const { data: availabilityByRecipe = new Map<number, AvailabilityStats>() } = useRecipePaintAvailability();

// Pass to RecipeCardGrid
<RecipeCardGrid
  data={filtered}
  factions={factions}
  units={units}
  stepCountByRecipe={stepCountByRecipe}
  swatchColorsByRecipe={swatchColorsByRecipe}
  availabilityByRecipe={availabilityByRecipe}
  isLoading={isLoading}
  onCardClick={openDetail}
  onAdd={onAddRecipe}
  onEdit={onEditRecipe}
  onDelete={openDelete}
/>
```

### Anti-Patterns to Avoid

- **N+1 availability queries:** Never call `useRecipePaints(recipe.id)` per card to compute availability — one batch query for all recipes at page level.
- **Client-side availability aggregation from paint list:** Never fetch all paints and join to all steps in JS — use the SQL GROUP BY.
- **Modifying RecipeTable instead of deleting:** The table is replaced, not extended. Delete `RecipeTable.tsx` and `RecipeTableColumns.tsx`.
- **Nesting Radix portals:** RecipeDetailSheet and RecipeFormSheet both use Sheet; never nest Sheet inside Sheet. The existing sibling portal pattern in RecipesPage is correct.
- **Empty string in filter Popover CommandItem values:** The `__any__` / `__none__` sentinel pattern is established — use `__any__` for "no filter selected".

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| CSS responsive grid | Manual breakpoint classes | `auto-fill, minmax(280px, 1fr)` CSS grid | Adapts to any container width without breakpoint math |
| Paint availability count | JS loop over all paints + steps | SQL `COUNT(CASE WHEN ...)` GROUP BY | Single round-trip; correct at DB level |
| Swatch strip rendering | New swatch component from scratch | Extract from RecipeTableColumns lines 125-148 | Already tested, proven visual design |
| Multi-select filter | Custom dropdown | Popover + Command + CommandItem | Already established in FactionFilter |
| Single-select filter | Custom dropdown | Popover + Command (UnitFilter pattern) | Already established in UnitFilter |
| Timeline layout | Third-party timeline library | CSS relative/absolute positioning | Simple enough; avoids new dependency |
| Card component | Custom card markup | `src/components/ui/card.tsx` shadcn primitives | Project standard; consistent elevation |

**Key insight:** This phase is 90% composition of already-proven patterns. The only novel element is the SQL availability aggregation query, which directly mirrors the existing step count batch query pattern.

---

## Common Pitfalls

### Pitfall 1: Missing RECIPE_AVAILABILITY_KEY Invalidation in usePaints.ts

**What goes wrong:** User marks a paint as owned on the Paint Inventory page. The availability badge on recipe cards does NOT update until the user navigates away and back.

**Why it happens:** `useUpdatePaint` and `useDeletePaint` in `usePaints.ts` currently invalidate `PAINTS_KEY`, `PAINT_KEY`, `PAINTS_WITH_RECIPES_KEY`, `spending-stats`, and `hobby-analytics` — but NOT `RECIPE_AVAILABILITY_KEY` (which doesn't exist yet).

**How to avoid:** When adding `RECIPE_AVAILABILITY_KEY` to `useRecipePaints.ts`, immediately also add its invalidation to `useUpdatePaint.onSuccess` and `useDeletePaint.onSuccess` in `usePaints.ts`. This is the cache symmetry rule from STATE.md.

**Warning signs:** Availability badge shows stale data after paint ownership change without page reload.

### Pitfall 2: Steps With paint_id = 0 or null Included in Count

**What goes wrong:** The availability badge shows "1 missing" for a step that has no paint linked. The `paint_id = 0` sentinel (used by some older inserts) or `NULL` from new steps must be excluded.

**Why it happens:** The SQL JOIN on `recipe_steps.paint_id = paints.id` naturally excludes `NULL` but not `paint_id = 0` (which would find no match in paints but shouldn't produce a row). The WHERE clause `rs.paint_id IS NOT NULL AND rs.paint_id != 0` guards both.

**How to avoid:** Always include `WHERE rs.paint_id IS NOT NULL AND rs.paint_id != 0` in the availability query.

### Pitfall 3: RecipeDetailSheet useRecipePaints Fetches Steps on Open

**What goes wrong:** The timeline has no `painting_phase`, `tool`, `technique`, `dilution`, or `time_estimate_minutes` because `useRecipePaints` returns `RecipeStep[]` rows but the query `SELECT * FROM recipe_steps` should already include all structured step fields.

**Why it happens:** Not a real risk since the DB schema added these columns in Phase 37. But verify `useRecipePaints` returns the full row with `SELECT *` (confirmed in `recipePaints.ts` line 6).

**How to avoid:** No action needed — `SELECT *` returns all fields. When rendering timeline nodes, safely access `step.painting_phase ?? null`, etc.

### Pitfall 4: Filter "Clear filters" Missing New Filter State

**What goes wrong:** User clicks "Clear filters" and the surface/style/difficulty/hasMissing filters don't reset, because they're added to state but not to the clear handler.

**Why it happens:** The clear button onClick lists each state setter individually — easy to forget new ones.

**How to avoid:** When adding `surfaceFilter`, `styleFilter`, `difficultyFilter`, `hasMissingFilter` state variables, immediately update the Clear filters onClick to reset all four.

**Warning signs:** Grayed-out filter badge persists after clicking Clear.

### Pitfall 5: Difficulty Badge Color Coding Adds Tailwind Purge Risk

**What goes wrong:** Dynamic class names like `text-green-500`, `text-yellow-500`, `text-orange-500`, `text-red-500` computed at runtime are purged by Tailwind if they don't appear literally in source.

**Why it happens:** Tailwind v4 still purges unused classes by scanning source files for literal class strings.

**How to avoid:** Use a lookup object mapping difficulty to class name (literals appear in source), OR use `style={{ color: ... }}` with hardcoded color values, OR use `data-difficulty` attribute with CSS variables.

```typescript
const difficultyColors: Record<string, string> = {
  Beginner: "text-green-500",
  Intermediate: "text-yellow-500",
  Advanced: "text-orange-500",
  Expert: "text-red-500",
};
// Usage: className={difficultyColors[difficulty] ?? "text-muted-foreground"}
```

---

## Code Examples

### Verified: isPaintMissing definition (canonical)
```typescript
// Source: src/features/recipes/recipeSteps.ts
export function isPaintMissing(paint: Paint | undefined | null): boolean {
  if (!paint) return true;
  return paint.owned !== 1;
}
```

### Verified: Existing batch query pattern (getStepCountsByRecipe)
```typescript
// Source: src/db/queries/recipePaints.ts — mirror this pattern for availability
export async function getStepCountsByRecipe(): Promise<RecipeStepCount[]> {
  const db = await getDb();
  return db.select<RecipeStepCount[]>(
    `SELECT recipe_id, COUNT(*) AS step_count FROM recipe_steps GROUP BY recipe_id`,
    []
  );
}
```

### Verified: Existing hook Map pattern (useAllStepCounts)
```typescript
// Source: src/hooks/useRecipePaints.ts — mirror for useRecipePaintAvailability
export function useAllStepCounts() {
  return useQuery({
    queryKey: STEP_COUNTS_KEY,
    queryFn: async () => {
      const rows = await getStepCountsByRecipe();
      return new Map(rows.map((r) => [r.recipe_id, r.step_count]));
    },
  });
}
```

### Verified: FactionFilter Popover + Command (multi-select)
```typescript
// Source: src/features/recipes/RecipesPage.tsx lines 195-248
// Pattern: Popover > Command > CommandInput > CommandList > CommandGroup > CommandItem
// Each CommandItem toggles item in/out of number[] array
```

### Verified: UnitFilter (single-select with null reset)
```typescript
// Source: src/features/recipes/RecipesPage.tsx lines 251-301
// Pattern: CommandItem value="__any__" onSelect => onChange(null) + setOpen(false)
// Individual items: onChange(u.id) + setOpen(false)
```

### Verified: RecipesPage data hook pattern
```typescript
// Source: src/features/recipes/RecipesPage.tsx lines 27-31
const { data: stepCountByRecipe = new Map<number, number>() } = useAllStepCounts();
const { data: swatchColorsByRecipe = new Map<...>() } = useRecipeSwatchData();
// Add alongside:
const { data: availabilityByRecipe = new Map<number, AvailabilityStats>() } = useRecipePaintAvailability();
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| TanStack Table RecipeTable | CSS Grid RecipeCardGrid | Phase 39 | Removes `@tanstack/react-table` dependency from recipes feature |
| Flat `<ol>` step list in detail | Vertical timeline with phase labels | Phase 39 | Requires only CSS positioning — no new lib |
| No availability data | Batch SQL GROUP BY availability query | Phase 39 | O(1) for any number of recipes |

**Deprecated in this phase:**
- `RecipeTable.tsx` — deleted, replaced by `RecipeCardGrid.tsx`
- `RecipeTableColumns.tsx` — deleted; swatch strip extracted into `RecipeCard.tsx` or a shared `SwatchStrip` component

---

## Open Questions

1. **Availability badge when recipe has zero paint links**
   - What we know: CONTEXT.md leaves this to Claude's discretion
   - What's unclear: Show "No paints linked" text, a neutral badge, or hide the badge entirely?
   - Recommendation: Hide the badge entirely (render nothing) — reduces visual noise for recipes with no step-paint links

2. **RecipeTable deletion timing**
   - What we know: CONTEXT.md says RecipeTable is replaced, not toggled
   - What's unclear: Delete in same plan as RecipeCardGrid creation, or in a separate cleanup plan?
   - Recommendation: Delete in the same plan that introduces RecipeCardGrid — keeping a dead file risks confusion during implementation

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4 + React Testing Library 16 |
| Config file | `vite.config.ts` (Vitest inlined) |
| Quick run command | `pnpm test -- tests/painting/` |
| Full suite command | `pnpm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PAINT-01 | `getRecipePaintAvailability()` returns correct owned/missing/running_low counts | unit | `pnpm test -- tests/painting/recipePaintAvailability.test.ts` | ❌ Wave 0 |
| PAINT-01 | `useRecipePaintAvailability()` maps rows to `Map<recipe_id, AvailabilityStats>` | unit | `pnpm test -- tests/painting/recipePaintAvailability.test.ts` | ❌ Wave 0 |
| PAINT-01 | Steps with paint_id = null or 0 are excluded from counts | unit | `pnpm test -- tests/painting/recipePaintAvailability.test.ts` | ❌ Wave 0 |
| STUDIO-01 | RecipeCard renders swatch strip, difficulty badge, availability badge | unit | `pnpm test -- tests/painting/RecipeCard.test.tsx` | ❌ Wave 0 |
| STUDIO-01 | RecipeCardGrid renders correct number of cards from filtered data | unit | `pnpm test -- tests/painting/RecipeCardGrid.test.tsx` | ❌ Wave 0 |
| STUDIO-02 | RecipeDetailSheet renders step timeline nodes with phase badge and paint swatch | unit | `pnpm test -- tests/painting/recipeDetailSheet.test.ts` | ✅ (stub — extend) |
| STUDIO-04 | Surface/style/difficulty filters narrow filtered array correctly | unit | `pnpm test -- tests/painting/recipeStudioFilters.test.ts` | ❌ Wave 0 |
| STUDIO-04 | hasMissingFilter only shows recipes with missing > 0 in availability map | unit | `pnpm test -- tests/painting/recipeStudioFilters.test.ts` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `pnpm test -- tests/painting/`
- **Per wave merge:** `pnpm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/painting/recipePaintAvailability.test.ts` — covers PAINT-01 (query SQL contract + hook Map mapping)
- [ ] `tests/painting/RecipeCard.test.tsx` — covers STUDIO-01 card rendering (swatch, badges, availability)
- [ ] `tests/painting/RecipeCardGrid.test.tsx` — covers STUDIO-01 grid rendering (card count, empty state)
- [ ] `tests/painting/recipeStudioFilters.test.ts` — covers STUDIO-04 filter logic (surface, style, difficulty, hasMissing)

Note: `tests/painting/recipeDetailSheet.test.ts` already exists as a stub with `.todo` tests — extend it for STUDIO-02 timeline assertions.

---

## Sources

### Primary (HIGH confidence)
- Direct source file reads: `src/features/recipes/RecipesPage.tsx`, `RecipeDetailSheet.tsx`, `RecipeTableColumns.tsx`, `RecipeTable.tsx`, `RecipeEmptyState.tsx`, `recipeSteps.ts`, `recipeSchema.ts`
- Direct source file reads: `src/hooks/useRecipePaints.ts`, `src/hooks/usePaints.ts`, `src/db/queries/recipePaints.ts`
- Direct type reads: `src/types/recipe.ts`, `src/types/recipePaint.ts`, `src/types/paint.ts`
- Direct test reads: `tests/workshop-play/recipeSwatchData.test.ts`, `tests/painting/recipeDetailSheet.test.ts`
- CONTEXT.md locked decisions — all implementation choices verified against actual code
- `.planning/REQUIREMENTS.md` — requirement definitions
- `.planning/STATE.md` — architectural decisions carried forward

### Secondary (MEDIUM confidence)
- SQLite `COUNT(CASE WHEN ...)` GROUP BY pattern — standard SQL, confirmed by existing `getStepCountsByRecipe` proof of pattern
- Tailwind v4 purge behavior for dynamic class names — known convention, mitigated by lookup object pattern

### Tertiary (LOW confidence)
- None — all claims verified against actual codebase

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries confirmed installed; no new dependencies
- Architecture: HIGH — all patterns verified in existing codebase source files
- SQL query: HIGH — mirrors confirmed-working getStepCountsByRecipe pattern
- Pitfalls: HIGH — all identified from direct code inspection (not hypothetical)
- Test gaps: HIGH — existing test file inventory confirms which files exist vs. need creation

**Research date:** 2026-05-07
**Valid until:** 2026-06-07 (stable codebase, no fast-moving dependencies)
