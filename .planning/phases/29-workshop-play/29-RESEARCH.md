# Phase 29: Workshop + Play - Research

**Researched:** 2026-05-05
**Domain:** UI enrichment — paint color swatches, recipe swatch strips, army list readiness panel, battle log live readiness points
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Paint Color Swatches (WKSP-01)**
- PaintRow already renders a 16x16px rounded-full swatch circle — hex_color paints get backgroundColor inline style, null hex_color gets bg-muted border border-border
- Scope: PaintRow.tsx is the sole surface — "paint list entries" means the Paints page table rows
- No new component needed unless recipe swatch strip reuses it (Claude's discretion)

**Recipe Swatch Strip (WKSP-02)**
- Placement: inline in recipe table row — new column or appended to "Name" column cell
- Data source: new batch query joining recipe_paints -> paints to fetch hex_color per recipe — returns Map<number, { paint_id: number; hex_color: string | null }[]> keyed by recipe_id
- Visual style: overlapping circles (negative margin stack, -ml-1 after the first)
- Swatch size: 12x12px (h-3 w-3) circles
- Max display: up to 8 swatches then +N indicator circle in bg-muted text-xs
- Order: by order_index ASC
- Fallback: paints without hex_color render as bg-muted border border-border
- Hook: new useRecipeSwatchData() in src/hooks/useRecipePaints.ts
- Cache invalidation: invalidate on recipe_paint mutations (addRecipePaint, removeRecipePaint)

**Army List Readiness Panel (PLAY-01)**
- Upgrade ArmyListSummaryBar in-place — do NOT create a new component
- Existing data sufficiency: useArmyListWithUnits already returns all needed fields
- Enhanced display: keep existing stats row + add progress bar + add "Not ready" list
- Progress bar: 2px height, bg-battle-gold fill for ready portion, bg-muted track
- Not-ready list: compact vertical list with unit_name + StatusBadge per row
- Battle-ready definition: status_painting === "Completed" (canonical string)
- Fully ready state: gold-tinted "All units battle-ready" message (bg-battle-gold/10 text-battle-gold)

**Battle Log Army Context (PLAY-02)**
- Placement: enhance BattleLogRow line 2 — append readiness inline with army name
- Display format: `armyListName (120/200 pts ready) · battle_date` — tabular-nums for point values
- Live computation: current live value from painting status, NOT a snapshot
- Data strategy: new batch query getArmyListReadiness(armyListIds: number[]) in src/db/queries/armyLists.ts
- SQL computes total and battle-ready points per army list in a single GROUP BY query
- New hook useArmyListReadiness(armyListIds: number[]) in src/hooks/useArmyLists.ts
- Query key: ['army-list-readiness', ...sortedIds]
- null army_list_id: show nothing (existing "No army list" italic text)
- Deleted army list: show existing "(Army list deleted)" italic text — no points

### Claude's Discretion
- Whether to extract a shared PaintSwatch component used by both PaintRow and recipe swatch strip, or keep rendering inline
- Exact SQL for the batch recipe paint colors query (CTE vs subquery vs simple JOIN)
- ArmyListSummaryBar progress bar exact styling (rounded corners, height)
- Whether the "Not ready" section in ArmyListSummaryBar is collapsible (Collapsible component) or always visible
- RecipeTable swatch strip placement: new column vs appended to name column
- Cache invalidation key structure for useArmyListReadiness

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| WKSP-01 | Paint list entries display a color swatch with consistent visual treatment using the design token color system | PaintRow.tsx already has the swatch (lines 29-38). Research confirms the hex_color / null fallback pattern is complete. WKSP-01 is a verification + minor consistency check, not a net-new build. |
| WKSP-02 | Recipe cards show a compact paint swatch strip — all linked paints visible at a glance on the card | Requires new batch query (getRecipeSwatchColors), new hook (useRecipeSwatchData), new UI in RecipeTableColumns.tsx. Existing recipe_paints schema has paint_id and order_index. No schema changes. |
| PLAY-01 | Army List detail shows a readiness panel with battle-ready points, total points, readiness percentage, and a list of which units are blocking full readiness | ArmyListSummaryBar already computes total/painted/battleReadyPct. Upgrade in-place: add progress bar + not-ready unit list. ArmyListUnitRow has status_painting and unit_name. StatusBadge available from Phase 25. |
| PLAY-02 | Battle Log entries display the linked army list's name alongside its current battle-ready point count | Requires new batch SQL query (getArmyListReadiness), new hook (useArmyListReadiness), prop threading from BattleLogPage to BattleLogRow. BattleLogPage already has the armyListNameById Map pattern to follow. |
</phase_requirements>

---

## Summary

Phase 29 is a pure UI enrichment phase with no database schema changes and no new pages or routes. All four requirements (WKSP-01, WKSP-02, PLAY-01, PLAY-02) enrich existing surfaces by surfacing data that is already in the database.

**WKSP-01 is nearly complete today.** PaintRow.tsx already renders a 16x16px rounded-full swatch using hex_color inline style with a bg-muted fallback — the pattern the requirement demands. The task reduces to a verification pass and possibly minor consistency fixes.

**WKSP-02** requires the most new code: a batch JOIN query (recipe_paints -> paints), a new hook, and a horizontal swatch strip rendered inside RecipeTableColumns. The recipe_paints schema has paint_id and order_index already. The overlapping-circles pattern is standard Tailwind with negative margin.

**PLAY-01** upgrades ArmyListSummaryBar in-place. The component already computes all three stats. The plan adds a narrow progress bar and a conditional "not ready" unit list using the Phase 25 StatusBadge.

**PLAY-02** follows the established BattleLogPage Map pattern (armyListNameById is built at page level, passed to rows as props). A batch SQL query computes readiness for all army_list_ids in a single query; the result Map is passed to BattleLogRow alongside armyListName.

**Primary recommendation:** Execute in four distinct plans matching the four requirements. Wave 0 for each plan writes the test file first. No plan depends on another within this phase.

---

## Standard Stack

### Core (confirmed by reading source files)
| Library | Purpose | Confirmed Location |
|---------|---------|-------------------|
| React 19 + TypeScript 5 | Component rendering | src/features/ |
| TailwindCSS 4 | Utility classes including bg-battle-gold, tabular-nums | src/styles/globals.css |
| shadcn/ui (new-york) | Table, Badge, Skeleton primitives | src/components/ui/ |
| @tanstack/react-query | Data hooks, caching, invalidation | src/hooks/ |
| tauri-plugin-sql | SQLite DB access via getDb() | src/db/client.ts |
| Vitest 4 + RTL 16 | Testing (jsdom, vi.mock pattern) | vitest.config.ts + tests/setup.ts |

### Phase 25 Design System (prerequisites confirmed present)
| Token | Value | Location |
|-------|-------|----------|
| --color-battle-gold | oklch(0.78 0.17 85) | globals.css line 76 |
| bg-battle-gold | Tailwind utility via @theme inline | globals.css line 120 |
| StatusBadge | dot+text format, 4-tier system | src/components/ui/status-badge.tsx |
| PAINTING_STATUS_TIER | Record<PaintingStatus, Tier> | status-badge.tsx lines 16-28 |

---

## Architecture Patterns

### Established Pattern: Batch Map at Page Level
Every existing feature that needs to display derived data in a list row builds a Map at the page level and passes values as props. Never query inside a row component.

**BattleLogPage example (existing, lines 40-47):**
```typescript
// src/features/battle-log/BattleLogPage.tsx
const armyListNameById = useMemo(() => {
  const m = new Map<number, string>();
  (armyLists ?? []).forEach((l) => m.set(l.id, l.name));
  return m;
}, [armyLists]);
```

**PLAY-02 will follow this exactly** — add `armyListReadiness` Map alongside `armyListNameById`.

### Established Pattern: Batch Query + Map Return (Phase 18 / Phase 28)
Batch queries return `Map<id, data>` — never N+1 per row.

```typescript
// Pattern from Phase 18: armyListNameById (in-memory Map from flat query)
// Pattern for PLAY-02 getArmyListReadiness (new SQL batch):
export async function getArmyListReadiness(
  ids: number[]
): Promise<Map<number, { total: number; battleReady: number }>> {
  // IN clause with positional params — see SQL section below
}
```

### Established Pattern: React Query with Sorted IDs Key
When a hook takes a variable-length ID array, the query key must be stable regardless of call-site ordering.

```typescript
// From CONTEXT.md decision — query key for useArmyListReadiness:
export const ARMY_LIST_READINESS_KEY = (ids: number[]) =>
  ["army-list-readiness", ...[...ids].sort((a, b) => a - b)] as const;
```

### Established Pattern: Swatch Rendering in PaintRow (confirmed source)
```typescript
// src/features/paints/PaintRow.tsx lines 30-38 — confirmed exact code:
{paint.hex_color ? (
  <span
    className="inline-block h-4 w-4 rounded-full border border-border shrink-0"
    style={{ backgroundColor: paint.hex_color }}
    aria-hidden="true"
  />
) : (
  <span className="inline-block h-4 w-4 rounded-full border border-border bg-muted shrink-0" aria-hidden="true" />
)}
```

**Recipe swatch circles** use the same pattern at h-3 w-3 (12px) with negative margin:
```tsx
<div className="flex items-center">
  {swatches.slice(0, 8).map((s, i) => (
    <span
      key={s.paint_id}
      className={`inline-block h-3 w-3 rounded-full border border-border shrink-0 ${i > 0 ? "-ml-1" : ""} ${s.hex_color ? "" : "bg-muted"}`}
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
```

### Established Pattern: ArmyListSummaryBar useMemo (confirmed source)
```typescript
// src/features/army-lists/ArmyListSummaryBar.tsx — existing computations:
const totalPoints = useMemo(() => units.reduce((sum, u) => sum + u.effective_points, 0), [units]);
const paintedPoints = useMemo(() =>
  units.reduce((sum, u) => u.status_painting === "Completed" ? sum + u.effective_points : sum, 0),
  [units],
);
const battleReadyPct = totalPoints > 0 ? Math.round((paintedPoints / totalPoints) * 100) : 0;
```

Progress bar using battle-gold token:
```tsx
<div className="h-0.5 w-full bg-muted rounded-full overflow-hidden">
  <div
    className="h-full bg-battle-gold transition-all duration-300"
    style={{ width: `${battleReadyPct}%` }}
  />
</div>
```

### Recommended Project Structure Changes
```
src/
  db/queries/
    recipePaints.ts        # ADD: getRecipeSwatchColors() batch query
    armyLists.ts           # ADD: getArmyListReadiness() batch query
  hooks/
    useRecipePaints.ts     # ADD: useRecipeSwatchData() hook
    useArmyLists.ts        # ADD: useArmyListReadiness() hook
  features/
    paints/
      PaintRow.tsx         # VERIFY: swatch consistency (may be no-op)
    recipes/
      RecipeTableColumns.tsx  # ADD: swatch strip column/cell
      RecipesPage.tsx         # ADD: useRecipeSwatchData call, pass to RecipeTable
      RecipeTable.tsx         # ADD: swatchColorsByRecipe prop
    army-lists/
      ArmyListSummaryBar.tsx  # EXTEND: progress bar + not-ready list
    battle-log/
      BattleLogRow.tsx        # EXTEND: readiness points in line 2
      BattleLogPage.tsx       # ADD: useArmyListReadiness call, pass armyListReadiness prop
```

### Anti-Patterns to Avoid
- **N+1 queries in row components:** Never call useRecipePaints(recipeId) inside a RecipeRow — one batch query at page level
- **JS-side COALESCE:** Effective points are computed in SQL. Never reimplent `points_override ?? unit_points ?? 0` in JS
- **Snapshot for live data:** PLAY-02 explicitly requires live computation — the battle-ready count shown is derived from current painting status, not stored at battle-log-write time
- **Nested Radix portals:** All Sheets/Dialogs remain at page root as siblings (established Pitfall 1)
- **"Complete" vs "Completed":** The canonical string is "Completed" — one typo breaks all readiness calculations

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Color swatch rendering | Custom CSS component | Inline span with TailwindCSS utilities | Already established in PaintRow.tsx |
| Progress bar | Third-party progress component | `div` with width% style + bg-battle-gold class | Matches HobbyPipeline.tsx TIER_BUBBLE_CLASS 'done' pattern |
| Status display in "not ready" list | Custom status text | StatusBadge from @/components/ui/status-badge | Phase 25 DSFD-04 |
| Batch ID array SQL | Multiple single queries | Single GROUP BY query with IN clause | N+1 is the established anti-pattern |
| Army list readiness at write time | Snapshot stored in battle_logs | Live SQL query on read | Requirement explicitly: "live value...not a snapshot" |

---

## Common Pitfalls

### Pitfall 1: "Completed" vs "Complete" string
**What goes wrong:** Using `status_painting === "Complete"` (no 'd') produces zero battle-ready points for all units.
**Why it happens:** The PAINTING_STATUS_ORDER array in src/types/unit.ts has "Completed" but the word "complete" is intuitive.
**How to avoid:** Always copy-paste from ArmyListSummaryBar.tsx line 30 or the canonical PAINTING_STATUS_ORDER array.
**Warning signs:** battleReadyPct is always 0, paintedPoints is always 0.

### Pitfall 2: IN clause with empty array
**What goes wrong:** `WHERE al.id IN ()` is a SQL syntax error in SQLite.
**Why it happens:** `getArmyListReadiness([])` is called when BattleLogPage has no logs with army_list_id.
**How to avoid:** Guard at hook level — `enabled: ids.length > 0`. Return empty Map immediately when ids is empty.
**Warning signs:** Runtime SQL error in the Tauri console when opening the Battle Log page.

### Pitfall 3: useAllStepCounts in RecipesPage is N+1 today
**What goes wrong:** The existing `useAllStepCounts` in RecipesPage.tsx (lines 29-42) already loops through all recipes calling `getRecipePaintsByRecipe(r.id)` per recipe. The new `useRecipeSwatchData` must NOT replicate this pattern.
**How to avoid:** Write `getRecipeSwatchColors()` as a single JOIN query across all recipes.
**Warning signs:** N db.select calls per recipe visible in dev logs.

### Pitfall 4: RecipeTable column signature mismatch
**What goes wrong:** `buildRecipeColumns` in RecipeTableColumns.tsx takes exactly 5 params. Adding `swatchColorsByRecipe` requires updating: the function signature, the RecipeTable props interface, RecipeTable's `useMemo` deps, and RecipesPage's call site.
**How to avoid:** Update all four locations in a single plan task.
**Warning signs:** TypeScript errors on `buildRecipeColumns` call in RecipeTable.tsx.

### Pitfall 5: battle-gold token only defined in .dark block
**What goes wrong:** `bg-battle-gold` / `text-battle-gold` only render correctly in dark mode because `--battle-gold` is defined inside `.dark {}` in globals.css (line 42-77). Light mode has no value for `--color-battle-gold`.
**Why it happens:** Phase 25 deferred light-mode application — confirmed by globals.css code.
**How to avoid:** The app runs in dark mode by default (confirmed by DashboardPage.tsx and AppLayout). Apply the token only in dark-mode surfaces. If light mode is ever enabled, this will need revisiting.
**Warning signs:** Progress bar invisible in light mode.

### Pitfall 6: tabular-nums for readiness point display
**What goes wrong:** Point counts like "120/200 pts ready" shift width as digits change without tabular-nums, causing layout jitter.
**How to avoid:** Always wrap numeric spans in `className="tabular-nums"` per BattleLogRow existing pattern (line 78).

### Pitfall 7: Query key array sorting for useArmyListReadiness
**What goes wrong:** If BattleLogPage passes IDs in display order one render and sorted order another, React Query treats them as different queries, causing duplicate fetches.
**How to avoid:** Sort IDs inside the hook or key factory before spreading into the key array.

---

## Code Examples

### getRecipeSwatchColors (new batch query)
```typescript
// src/db/queries/recipePaints.ts — new export
export interface RecipeSwatchEntry {
  recipe_id: number;
  paint_id: number;
  hex_color: string | null;
}

export async function getRecipeSwatchColors(): Promise<RecipeSwatchEntry[]> {
  const db = await getDb();
  return db.select<RecipeSwatchEntry[]>(
    `SELECT rp.recipe_id, rp.paint_id, p.hex_color
     FROM recipe_paints rp
     JOIN paints p ON p.id = rp.paint_id
     ORDER BY rp.recipe_id ASC, rp.order_index ASC`,
    [],
  );
}
```

Returns a flat array; the hook maps it into `Map<recipe_id, RecipeSwatchEntry[]>`.

### useRecipeSwatchData (new hook)
```typescript
// src/hooks/useRecipePaints.ts — new export
export const RECIPE_SWATCH_KEY = ["recipe-swatch-colors"] as const;

export function useRecipeSwatchData() {
  return useQuery({
    queryKey: RECIPE_SWATCH_KEY,
    queryFn: async () => {
      const rows = await getRecipeSwatchColors();
      const m = new Map<number, { paint_id: number; hex_color: string | null }[]>();
      for (const row of rows) {
        const list = m.get(row.recipe_id) ?? [];
        list.push({ paint_id: row.paint_id, hex_color: row.hex_color });
        m.set(row.recipe_id, list);
      }
      return m;
    },
  });
}
```

Cache invalidation: add `qc.invalidateQueries({ queryKey: RECIPE_SWATCH_KEY })` to `useAddRecipePaint.onSuccess` and `useRemoveRecipePaint.onSuccess`.

### getArmyListReadiness (new batch SQL query)
```typescript
// src/db/queries/armyLists.ts — new export
export interface ArmyListReadiness {
  id: number;
  total_points: number;
  battle_ready_points: number;
}

export async function getArmyListReadiness(
  ids: number[]
): Promise<ArmyListReadiness[]> {
  if (ids.length === 0) return [];
  const db = await getDb();
  // Positional params: $1..$N for the IN clause
  const placeholders = ids.map((_, i) => `$${i + 1}`).join(", ");
  return db.select<ArmyListReadiness[]>(
    `SELECT al.id,
       SUM(COALESCE(alu.points_override, u.points, 0)) AS total_points,
       SUM(CASE WHEN u.status_painting = 'Completed'
                THEN COALESCE(alu.points_override, u.points, 0)
                ELSE 0 END) AS battle_ready_points
     FROM army_lists al
     JOIN army_list_units alu ON alu.list_id = al.id
     JOIN units u ON u.id = alu.unit_id
     WHERE al.id IN (${placeholders})
     GROUP BY al.id`,
    ids,
  );
}
```

### useArmyListReadiness (new hook)
```typescript
// src/hooks/useArmyLists.ts — new export
export const ARMY_LIST_READINESS_KEY = (ids: number[]) =>
  ["army-list-readiness", ...[...ids].sort((a, b) => a - b)] as const;

export function useArmyListReadiness(ids: number[]) {
  const sortedIds = useMemo(() => [...ids].sort((a, b) => a - b), [ids]);
  return useQuery({
    queryKey: ARMY_LIST_READINESS_KEY(sortedIds),
    queryFn: async () => {
      const rows = await getArmyListReadiness(sortedIds);
      const m = new Map<number, { total: number; battleReady: number }>();
      for (const row of rows) {
        m.set(row.id, { total: row.total_points, battleReady: row.battle_ready_points });
      }
      return m;
    },
    enabled: sortedIds.length > 0,
  });
}
```

**Invalidation:** `useUpdateUnit` and `useArmyListUnit` mutations must invalidate `['army-list-readiness']` prefix — use `queryKey: ['army-list-readiness']` in invalidateQueries (prefix match). Alternatively, invalidate from the unit mutation hooks since painting status changes flow through unit updates.

### BattleLogPage — ID extraction + hook call
```typescript
// src/features/battle-log/BattleLogPage.tsx — additions
const armyListIds = useMemo(() => {
  const ids = new Set<number>();
  (logs ?? []).forEach((l) => { if (l.army_list_id !== null) ids.add(l.army_list_id); });
  return [...ids];
}, [logs]);

const { data: armyListReadiness = new Map() } = useArmyListReadiness(armyListIds);
```

### BattleLogRow — line 2 display
```tsx
// src/features/battle-log/BattleLogRow.tsx — readiness prop + display
interface BattleLogRowProps {
  // ...existing props...
  armyListReadiness: { total: number; battleReady: number } | null;
}

// Line 2 render:
<p className="text-sm text-muted-foreground mt-0.5">
  {armyListName ? (
    <>
      {armyListName}
      {armyListReadiness && (
        <span className="tabular-nums">
          {" "}({armyListReadiness.battleReady}/{armyListReadiness.total} pts ready)
        </span>
      )}
    </>
  ) : log.army_list_id !== null ? (
    <span className="italic">(Army list deleted)</span>
  ) : (
    <span className="italic">No army list</span>
  )}
  {" · "}
  {log.battle_date}
</p>
```

---

## State of the Art

| Old Approach | Current Approach | Notes |
|--------------|------------------|-------|
| Per-row paint queries | Batch JOIN query returning flat array, Map built in hook | Phase 18 established this |
| Snapshot battle-ready count stored at write time | Live SQL GROUP BY on read | PLAY-02 requirement is explicit |
| Custom progress bar libraries | Div + width% + TailwindCSS | HobbyPipeline.tsx uses this |

---

## Open Questions

1. **PaintSwatch component extraction**
   - What we know: PaintRow.tsx has inline swatch rendering (4 lines JSX). Recipe strip will need the same logic at h-3 w-3.
   - What's unclear: Whether a shared `PaintSwatch` component is worth the overhead of a new file for ~4 lines.
   - Recommendation: Extract `PaintSwatch` component only if both call sites are updated in the same plan. If WKSP-01 and WKSP-02 are separate plans, keep inline in each and note the tech debt.

2. **useArmyListReadiness invalidation scope**
   - What we know: readiness depends on unit.status_painting changes, army_list_units changes.
   - What's unclear: Which mutation hooks to add invalidation to — the CONTEXT.md says "unit mutations (painting status changes) and army list unit mutations" but does not specify which hook files.
   - Recommendation: Add invalidation in `useUpdateUnit` (src/hooks/useUnits.ts) and `useAddUnitToList` / `useRemoveUnitFromList` / `useUpdateArmyListUnit` (src/hooks/useArmyLists.ts). Use prefix key `['army-list-readiness']` so all readiness queries are swept.

3. **WKSP-01 verification scope**
   - What we know: PaintRow.tsx already has the exact swatch pattern the requirement demands.
   - What's unclear: Whether the requirement can be closed purely by inspection or needs a test assertion.
   - Recommendation: Write one unit test confirming the swatch span renders for a paint with hex_color and for one without. This closes WKSP-01 with green Nyquist coverage.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4 + React Testing Library 16 |
| Config file | vitest.config.ts |
| Quick run command | `pnpm test -- tests/workshop-play/` |
| Full suite command | `pnpm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| WKSP-01 | PaintRow renders swatch span with backgroundColor for hex paint; renders bg-muted span for null hex | unit | `pnpm test -- tests/workshop-play/paintRowSwatch.test.tsx` | Wave 0 |
| WKSP-02 | getRecipeSwatchColors returns flat array with recipe_id, paint_id, hex_color; useRecipeSwatchData maps to Map<recipe_id, entry[]>; swatch strip renders up to 8 circles + +N overflow | unit | `pnpm test -- tests/workshop-play/recipeSwatchData.test.ts` | Wave 0 |
| PLAY-01 | ArmyListSummaryBar renders progress bar with correct width%; renders "not ready" list with StatusBadge per non-Completed unit; renders "All units battle-ready" when 100% | unit | `pnpm test -- tests/workshop-play/armyListReadinessPanel.test.tsx` | Wave 0 |
| PLAY-02 | getArmyListReadiness returns correct total/battleReady per id; returns empty for empty ids array; BattleLogRow renders "(battleReady/total pts ready)" when readiness provided; renders nothing extra when armyListReadiness is null | unit | `pnpm test -- tests/workshop-play/armyListReadiness.test.ts` | Wave 0 |

### Sampling Rate
- **Per task commit:** `pnpm test -- tests/workshop-play/`
- **Per wave merge:** `pnpm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/workshop-play/paintRowSwatch.test.tsx` — covers WKSP-01
- [ ] `tests/workshop-play/recipeSwatchData.test.ts` — covers WKSP-02 (query + hook + component)
- [ ] `tests/workshop-play/armyListReadinessPanel.test.tsx` — covers PLAY-01
- [ ] `tests/workshop-play/armyListReadiness.test.ts` — covers PLAY-02 (query + hook + row)

---

## Sources

### Primary (HIGH confidence — read directly from source files)
- `src/features/paints/PaintRow.tsx` — confirmed existing swatch rendering, lines 29-38
- `src/features/army-lists/ArmyListSummaryBar.tsx` — confirmed existing computations, lines 22-46
- `src/features/battle-log/BattleLogRow.tsx` — confirmed line 2 format, lines 82-93
- `src/features/battle-log/BattleLogPage.tsx` — confirmed armyListNameById Map pattern, lines 40-44
- `src/features/recipes/RecipeTable.tsx` — confirmed props interface
- `src/features/recipes/RecipeTableColumns.tsx` — confirmed buildRecipeColumns signature (5 params)
- `src/features/recipes/RecipesPage.tsx` — confirmed useAllStepCounts pattern + call site
- `src/db/queries/recipePaints.ts` — confirmed existing query functions
- `src/db/queries/armyLists.ts` — confirmed getArmyListWithUnits COALESCE SQL
- `src/hooks/useArmyLists.ts` — confirmed key constants, mutation invalidation patterns
- `src/hooks/useRecipePaints.ts` — confirmed RECIPE_PAINTS_KEY pattern, mutation hooks
- `src/components/ui/status-badge.tsx` — confirmed StatusBadge API and PAINTING_STATUS_TIER
- `src/types/paint.ts` — confirmed hex_color: string | null
- `src/types/recipePaint.ts` — confirmed paint_id, order_index fields
- `src/types/armyList.ts` — confirmed ArmyListUnitRow fields: status_painting, effective_points, unit_name
- `src/styles/globals.css` — confirmed --color-battle-gold token and @theme inline registration
- `.planning/phases/29-workshop-play/29-CONTEXT.md` — locked decisions and canonical refs

### Secondary (MEDIUM confidence)
- `.planning/STATE.md` Phase 18/25/26 decisions — established Map pattern, battle-gold value, "Completed" string canonical source
- `.planning/REQUIREMENTS.md` — WKSP-01, WKSP-02, PLAY-01, PLAY-02 acceptance criteria

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries confirmed from source files
- Architecture patterns: HIGH — all patterns traced to real source code
- SQL for getArmyListReadiness: HIGH — pattern copied verbatim from CONTEXT.md which was authored by user
- Pitfalls: HIGH — traced directly to source code (Pitfall 1 from PaintRow, Pitfall 3 from RecipesPage useAllStepCounts)
- Test file names/locations: MEDIUM — directories inferred from existing test structure (tests/battle-log/, tests/army-list/); `tests/workshop-play/` is new

**Research date:** 2026-05-05
**Valid until:** 2026-06-05 (stable libraries, no fast-moving dependencies)
