# Pitfalls Research

**Domain:** HobbyForge v2.4 — Premium Dashboard UX: CSS grid layout, visual depth, photo thumbnails, ArmyReadinessCard, recipe-faction/unit linking, spending intelligence — added to existing Tauri 2 + React 19 + Tailwind v4 + shadcn/ui + SQLite app with established v2.3 design token system.
**Researched:** 2026-05-05
**Confidence:** HIGH — derived from direct codebase audit of `DashboardPage.tsx`, `computeStats.ts`, `useUnitPhotos.ts`, `globals.css`, `computeSpendingStats.ts`, `ArmyListSummaryBar.tsx`, `default.json` capabilities, and confirmed prior pitfall history. Confidence levels noted per finding.

---

## Critical Pitfalls

### Pitfall 1: CSS Grid Overlay Breaks the Existing Vertical-Stack Responsive Contract

**What goes wrong:**
`DashboardPage.tsx` currently uses `flex flex-col gap-12 p-6` as its outer wrapper. Replacing that with a CSS grid while leaving the child components (CurrentFocusCard, HobbyPipeline, StatCard row, FactionSummaryCard row, RecentActivityFeed) unchanged causes grid children to collapse or stretch unexpectedly. The `flex flex-wrap gap-4` FactionSummaryCard section — which relies on each card's intrinsic `min-w-[180px]` to drive wrapping — will be placed inside a single grid cell and lose its wrapping behavior unless the cell is explicitly set to `col-span-full`. The 4-StatCard row (`grid grid-cols-4 gap-6`) nested inside a 2-column outer grid creates a nested grid without an explicit track width reference and can overflow. Skeleton loading blocks use hard-coded `h-28 w-full` assumptions that break in a narrower grid cell.

**Why it happens:**
Grid replaces the parent-axis control mechanism. Children that depended on `w-full` from a flex column context now inherit the grid track width instead. An asymmetric 2-column layout (e.g., `2fr 1fr`) assigns different column widths at the grid level; components designed for full-width rendering get clipped on the narrower column.

**How to avoid:**
Introduce the grid at the page wrapper level as a single deliberate migration. Map every existing child to an explicit `col-span` or `col-span-full` class before removing the flex container. Keep the FactionSummaryCard section inside its own `flex flex-wrap` sub-container placed in a `col-span-full` cell — do not flatten individual faction cards into separate grid cells. Update all Skeleton blocks in the loading state to match the new span assignments in the same commit. Only after all existing components are correctly spanned should new cards (ActiveProjectsPanel, ArmyReadinessCard) be added.

**Warning signs:**
- FactionSummaryCard row renders as a single narrow column at any viewport width.
- RecentActivityFeed appears narrower than CurrentFocusCard even though both should be full-width.
- The 4-StatCard inner grid overflows its grid cell.
- Skeleton loading state has different column structure than the populated state.

**Phase to address:** Dashboard CSS grid phase (the first new phase). Grid wrapper introduction and per-child span assignment must happen before any new card components are added.

---

### Pitfall 2: Tailwind v4 `@theme inline` Token Conflicts with New Premium Tokens

**What goes wrong:**
Adding new CSS custom properties to `.dark {}` in `globals.css` without registering them in the `@theme inline {}` block means no Tailwind utility classes are generated. Conversely, registering a new `--color-*` token in `@theme inline {}` that shadows an existing shadcn/ui variable (e.g., `--color-accent`) will globally override every component that uses `bg-accent` or `text-accent`, including Button, Badge, Select, and Sidebar primitives across the entire app.

Additionally, there is a documented Tailwind v4 bug (GitHub issue #15874) where CSS variables defined in `@theme inline` do not cascade from inline `style` attribute values on elements. The existing `--faction-accent` token already uses the runtime-mutable `style={{ borderLeftColor: accent }}` pattern in `CurrentFocusCard` and `FactionSummaryCard`. New premium tokens for radial gradients or elevated surfaces that attempt the same inline-style-variable injection will fail silently.

**Why it happens:**
Tailwind v4 CSS-first theming generates utility classes from `@theme inline` variables. Shadow conflicts are invisible at authoring time — the new token name looks unique but resolves to a slot already consumed by shadcn components. The inline-style cascade issue is a known v4 limitation not present in v3.

**How to avoid:**
Always use the established `--forge-*` namespace prefix for new HobbyForge-specific tokens (the `--forge-black`, `--panel-elevated`, `--panel-surface`, `--battle-gold` tokens in `globals.css` already follow this pattern — extend it). Audit the existing `@theme inline {}` block before adding any `--color-*` entry to verify no name collision. For radial gradient card effects, apply `background-image: radial-gradient(...)` via Tailwind arbitrary values (`bg-[radial-gradient(...)]`) rather than through a CSS variable that needs inline-style injection. Verify after every globals.css change that `Button variant="outline"` and `Badge` still render correctly.

**Warning signs:**
- Button `variant="outline"` turns gold or changes color unexpectedly after adding a new token.
- Radial gradient background shows nothing on a card despite the class being applied.
- `bg-panel-elevated` stops resolving after a globals.css edit.
- A new `--color-accent` or `--color-primary` entry appears in `@theme inline`.

**Phase to address:** Visual depth / gradient pass. Audit `@theme inline` before every token addition; run `pnpm build` and visually inspect Button/Badge/Select after each change.

---

### Pitfall 3: Photo Thumbnail Memory Pressure from Unguarded `useLatestUnitPhotos` Expansion

**What goes wrong:**
`useLatestUnitPhotos` batch-loads one photo per unit across the entire collection via `getLatestPhotoByUnit()`. Each row invokes `appDataDir()` + `join()` + `convertFileSrc()`. With v2.4 surfacing thumbnails in the Dashboard (CurrentFocusCard, ActiveProjectsPanel), Collection gallery, and Recent Activity feed simultaneously, multiple components mounting this hook (or triggering cache invalidation via photo upload) will cause concurrent `convertFileSrc` calls proportional to collection size. The Tauri asset:// protocol has a documented memory leak when images are loaded and removed from the DOM without the browser releasing the object URL (Tauri issue #2952).

**Why it happens:**
`staleTime: Infinity` on `LATEST_UNIT_PHOTOS_KEY` prevents redundant fetches normally. But `useCreateUnitPhoto` and `useDeleteUnitPhoto` both call `qc.invalidateQueries({ queryKey: LATEST_UNIT_PHOTOS_KEY })` on success. After a photo upload in the Journal tab, the Dashboard will re-fetch all latest photos while the Collection gallery may also be cached. A collection of 50+ units can produce 50+ concurrent `convertFileSrc` calls creating asset:// URLs the WebView may not release.

**How to avoid:**
- Preserve the `staleTime: Infinity` contract — never reduce it for photo queries.
- Add `<img onError>` with a neutral placeholder `src` at every thumbnail render site so broken asset:// URLs do not leave blank boxes.
- Cap the Dashboard thumbnail surface: show thumbnails only for the `focusUnit` in CurrentFocusCard and the top 3-5 cards in ActiveProjectsPanel. Do not render thumbnails inside RecentActivityFeed rows.
- Do not mount `useLatestUnitPhotos` at `DashboardPage` level for all cards simultaneously — let each consuming component mount it and rely on the shared React Query cache key.
- Add `loading="lazy"` to every thumbnail `<img>` element.

**Warning signs:**
- App RAM usage climbs steadily as the user uploads photos to multiple units.
- Thumbnail `<img>` elements render blank boxes after navigating away from Dashboard and back.
- `convertFileSrc` calls appear repeatedly in Tauri dev console after photo mutations.
- `useLatestUnitPhotos` mounted at DashboardPage level for all card types simultaneously.

**Phase to address:** CurrentFocusCard v2 / ActiveProjectsPanel phase (photo thumbnail introduction). Establish `onError` fallback and thumbnail cap before widening photo surface.

---

### Pitfall 4: Missing `["dashboard-stats"]` Invalidation in New Log Session + Status Update Mutation

**What goes wrong:**
`LogSessionSheet` calls `useCreatePaintingSession`, which invalidates `["painting-sessions", unitId]` but does NOT invalidate `["dashboard-stats"]`. If v2.4 extends `createSession` to also write `status_painting` or `painting_percentage` back to the `units` table, the `["dashboard-stats"]` cache will serve stale data on the Dashboard for up to 5 minutes (the `staleTime` default). The user logs a session that marks a unit "Completed" but HobbyPipeline still shows the unit at its previous stage and the "Fully Painted" StatCard does not increment.

**Why it happens:**
`useDashboardStats` uses `DASHBOARD_STATS_KEY = ["dashboard-stats"]`. The existing `useUnits` mutations all invalidate this key as a forward-compat decision from Phase 2. But `useCreatePaintingSession` was authored in Phase 13 (Hobby Journal) and only invalidates journal session keys. Extending the session creation to also update unit status without extending the invalidation chain is an easy miss.

**How to avoid:**
In whichever mutation handles "Log Session updates painting status", add both `qc.invalidateQueries({ queryKey: DASHBOARD_STATS_KEY })` and `qc.invalidateQueries({ queryKey: UNITS_KEY })` to the `onSuccess` handler, alongside the existing journal session key invalidation. The pattern to mirror is `useUpdateUnit` in `useUnits.ts`. These two invalidations must be added in the same commit as the mutation logic change — never deferred.

**Warning signs:**
- HobbyPipeline counts do not change after logging a session that includes a status update.
- "Fully Painted" StatCard is unchanged 30 seconds after a Log Session completes.
- A newly logged session appears in RecentActivityFeed but the pipeline bucket count is stale.

**Phase to address:** Log Session enhancement phase (whichever phase adds status-update-on-session).

---

### Pitfall 5: ArmyReadinessCard Aggregation Must Be a Dedicated Query, Not a `computeStats` Extension

**What goes wrong:**
The ArmyReadinessCard (per-faction readiness, target point selector 500/1000/1500/2000) needs to aggregate across army lists, joining `army_list_units` with `units` to compute readiness at a user-chosen threshold. The natural instinct is to extend `ComputedDashboardStats` in `computeStats.ts`. This fails because `getDashboardStats()` only fetches `units` and `factions` — it has no `army_list_units` data. Adding the army list join to `getDashboardStats()` increases the payload for every Dashboard render and makes the points-threshold filter impossible because it requires client-side state that changes on user interaction.

**Why it happens:**
`computeStats.ts` is a pure function fed by a two-table query. It is easy to extend the data shape but extending the SQL query bloats the always-on Dashboard fetch. The ArmyReadinessCard's selected-points state (`500 | 1000 | 1500 | 2000`) requires a parameterized query key that changes on user interaction — incompatible with the static `["dashboard-stats"]` key.

**How to avoid:**
Write a dedicated `getArmyReadinessByFaction(targetPoints: number)` query (in `src/db/queries/`) that JOINs `army_lists`, `army_list_units`, and `units`. Wrap it in `useArmyReadiness(targetPoints)` with a query key of `["army-readiness", targetPoints]`. Mount this hook only inside ArmyReadinessCard. Replicate the COALESCE pattern from `getArmyListWithUnits` for `effective_points` — do not reimplement the points calculation in JS. Include a guard for 0 army lists (show an empty state with a link to /army-lists).

**Warning signs:**
- `getDashboardStats` SQL gains a JOIN to `army_list_units`.
- `ComputedDashboardStats` type gains army readiness fields.
- The points-threshold selector triggers a full Dashboard re-fetch.
- ArmyReadinessCard shows stale data when the selector changes (because `["dashboard-stats"]` has a 5-min staleTime).

**Phase to address:** ArmyReadinessCard phase. Create the dedicated hook and query before building the UI component.

---

### Pitfall 6: Spending Intelligence Division Creates Pence Fractions via JS Division

**What goes wrong:**
"Cost per completed model" = `totalPence / completedCount`. If `completedCount` is 0 this is `Infinity` or `NaN`. If non-zero, the result is a float (`2750 / 3 = 916.666...`). Using `toFixed(2)` to convert to a currency string can produce `£9.16` instead of `£9.17` due to binary floating-point rounding, even though the correct integer arithmetic gives `917` pence (`£9.17`).

**Why it happens:**
The existing codebase correctly stores all spending as integer pence and uses integer-safe summation in `computeSpendingStats.ts`. "Cost per completed model" is the first division-based metric in the system. Division of integers in JavaScript produces floats, and `toFixed` on a float is not safe for currency display.

**How to avoid:**
Always divide pence values using `Math.round(pence / count)` and treat the result as integer pence. Convert to display currency only at the final render step via the existing `formatCurrency(pence)` utility. Guard divide-by-zero: `completedCount > 0 ? Math.round(totalPence / completedCount) : 0`. Never use `toFixed` on a pence-derived float. Mirror the guard-zero pattern already used in `computeStats.ts` for `paintingPct`. All new division-based metrics must have a TDD test with a zero-input case before the UI is wired up.

**Warning signs:**
- "Cost per model" displays `£0.00` when there are completed models.
- `NaN` or `Infinity` visible in the spending intelligence section.
- `toFixed(2)` used on a raw division result before `formatCurrency`.

**Phase to address:** Spending intelligence phase. Write and test `computeSpendingIntelligence` as a pure function before UI integration.

---

### Pitfall 7: Clickable StatCard Navigation Orphans Open Sheet Portals

**What goes wrong:**
Making StatCards clickable (navigate to Collection, Projects, etc.) requires `onClick` + `useNavigate`. If the user clicks a StatCard while `UnitDetailSheet`, `LogSessionSheet`, or any other sibling portal is open, TanStack Router unmounts `DashboardPage` but does not clean up the sibling portals. The Sheet's Radix overlay stays rendered over the new page, blocking interaction, because the portals are siblings of `DashboardPage`'s main content div and their `open` state is owned by `DashboardPage`'s local state — which disappears with the page.

**Why it happens:**
The sibling portal pattern (documented in `DashboardPage.tsx` comments as "Pitfall 1: SIBLINGS, never nested") ensures correct z-index stacking while the page is active. But navigation destroys the state owner while leaving the portal DOM node rendered until the next React reconciliation cycle.

**How to avoid:**
In every StatCard navigation handler: call all Sheet close callbacks before calling `navigate()`. Pattern:
```
setSelectedUnitId(null);
setLogSessionOpen(false);
setQuickAddOpen(false);
navigate({ to: "/collection" });
```
Do not attempt to make StatCards full `<Link>` or `<a>` elements — they are inside the main content div and navigation via `<Link>` does not flush Sheet state. The close-then-navigate sequence must be atomic in the handler.

**Warning signs:**
- Ghost Sheet overlay visible on the Collection page after navigating from the Dashboard.
- Radix `SheetOverlay` backdrop div present in DOM on the destination page.
- The Escape key dismisses an invisible Sheet on the Collection page.

**Phase to address:** Clickable StatCards phase. The navigation + state-flush pattern must be in the same wave — not deferred to a polish pass.

---

### Pitfall 8: Recipe ↔ Faction/Unit FK Migration Without Backfill Orphans Existing Links

**What goes wrong:**
The v2.4 "recipe ↔ faction/unit integration" likely adds a `faction_id` FK column to `recipes` (or a new linking table). Adding a nullable column via migration with no backfill means every existing recipe will have `faction_id = NULL` even though most recipes already have a `unit_id` set — and that unit belongs to a faction. Existing recipe-faction associations are lost, causing the Recipes page faction filter to return 0 results for any faction even though recipes exist that are implicitly associated.

**Why it happens:**
A migration adds a nullable column with no default backfill because the migration cannot "know" which faction to assign without a JOIN. Developers assume the column will be filled in when users re-save their recipes — but the user won't know data was lost.

**How to avoid:**
If `faction_id` is added to `recipes`, the migration must include a backfill UPDATE in the same transaction:
```sql
UPDATE recipes
SET faction_id = (
    SELECT u.faction_id FROM units u WHERE u.id = recipes.unit_id
)
WHERE unit_id IS NOT NULL;
```
This is safe (idempotent, FK-valid) and runs once at migration time. Verify with a smoke-test query after migration: `SELECT COUNT(*) FROM recipes WHERE unit_id IS NOT NULL AND faction_id IS NULL` must return 0. If the design is a separate linking table, populate it with the same backfill logic in the same migration transaction. Never edit existing migration files (CLAUDE.md constraint).

**Warning signs:**
- All existing recipes show "no faction" after the migration deploys.
- Faction filter on Recipes page returns 0 results even though recipes exist.
- `RecipeDetailSheet` correctly links new recipes but not pre-migration ones.
- Migration SQL has `ALTER TABLE recipes ADD COLUMN faction_id INTEGER` without a subsequent `UPDATE`.

**Phase to address:** Recipe ↔ faction/unit integration phase. The backfill UPDATE must be in the migration before any UI work begins.

---

## High-Severity Pitfalls

### Pitfall 9: HobbyPipeline 5-Bucket Simplification Must Not Double-Count Units

**What goes wrong:**
The v2.4 target is "5 grouped buckets instead of 11" stages in HobbyPipeline. The current implementation counts units at each of the 11 stages exactly (no double-counting is possible). Grouping stages into buckets introduces double-counting if any unit's `status_painting` value could match more than one bucket boundary condition. Silently incorrect totals (e.g., bucket totals summing to more than `units.length`) make the Dashboard look broken.

**Why it happens:**
Bucket grouping uses `includes` or range checks on the `PAINTING_STATUS_ORDER` array. An off-by-one in the range boundary, or including the same stage in two buckets, causes a unit to appear in both. With 11 stages and 5 buckets, boundary stages ("Primed" as the top of "prep" and bottom of "base-coat"?) are ambiguous if not explicitly specified.

**How to avoid:**
Define the bucket-to-stages mapping as an exhaustive, non-overlapping `Record<BucketName, PaintingStatus[]>` constant. Each status value must appear in exactly one bucket. Write a unit test that asserts: `Object.values(PIPELINE_BUCKETS).flat().length === PAINTING_STATUS_ORDER.length` (all 11 stages accounted for) and no value appears in more than one bucket. The HobbyPipeline component sums counts per bucket by filtering the full `units` array against the bucket's stage list — same pattern as the current per-stage count.

**Warning signs:**
- Pipeline bucket totals sum to a number greater than `units.length`.
- A unit appears in two pipeline buckets simultaneously.
- "Primed" or any boundary stage is listed in two bucket definitions.

**Phase to address:** Dashboard redesign phase (simplified pipeline). TDD Wave 0: pure bucket definition test before any UI rendering.

---

### Pitfall 10: Faction Cards v2 "Larger" Layout Breaks at 900px Minimum Window Width

**What goes wrong:**
The current FactionSummaryCard uses `min-w-[180px]` inside a `flex flex-wrap` container. At 900px viewport width (the minimum from `tauri.conf.json`), four faction cards at 180px each plus `gap-4` (16px × 3 = 48px) requires 768px — technically fitting. But a "larger, more expressive" Faction Card v2 that increases to e.g. `min-w-[240px]` would require 1008px minimum (4 × 240 + 48px gaps) — overflowing the 900px minimum window. This causes cards to wrap onto two rows, which may be acceptable or may look broken depending on the design intent.

**Why it happens:**
"Larger" is a relative term without a specific pixel value. The minimum window constraint (900px wide) is not checked against the new card dimensions before design is locked in.

**How to avoid:**
Before finalizing Faction Card v2 dimensions, verify: `(card_min_width × num_factions) + (gap × (num_factions - 1)) <= 900px` at the minimum window. With 4 factions: card must stay at or below `(900 - 48) / 4 = 213px`. If a wider card is required, switch the container to a CSS grid with `grid-cols-2` at the minimum width and `grid-cols-4` at wider viewports, rather than relying on `flex flex-wrap`. Also verify the faction card click-to-Collection interaction still works after any restructuring (the `useCollectionFilters.setState` + `navigate` pattern in `FactionSummaryCard.tsx`).

**Warning signs:**
- Faction cards wrap to two rows at 900px viewport width.
- Cards overflow the Dashboard width at the minimum window size.
- The design spec mentions "larger" without specifying a pixel width.

**Phase to address:** Faction Cards v2 phase. Verify dimensions against the 900px constraint before implementation.

---

### Pitfall 11: `SELECT * FROM units` in `getDashboardStats` Fetches All Columns Including Large Text Fields

**What goes wrong:**
`getDashboardStats()` uses `SELECT * FROM units` — fetching all columns including `lore_notes TEXT` (migration 008, Phase 17) and `notes TEXT`, which can be large free-text fields. As users add more detailed lore notes and unit notes, the Dashboard fetch payload grows. This is not a problem today but becomes noticeable as the collection grows and more text fields are populated. The same query is already used by the spending tracker (`getSpendingStats` also does `SELECT * FROM units`).

**Why it happens:**
`SELECT *` is the established pattern in this codebase and works well for small collections. The `Unit` type requires all columns to be present for TypeScript to function. New large-text columns added by migrations increase the row size silently.

**How to avoid:**
For the Dashboard specifically, consider whether `computeStats` actually needs `lore_notes` and `notes`. If not, do not change the query now — the collection is unlikely to grow large enough to matter within this milestone. Flag this as a future optimization if the user reports Dashboard slowness. For new analytics queries (ArmyReadiness, SpendingIntelligence), write column-specific SELECT lists that only fetch what is needed for the computation, not `SELECT *`.

**Warning signs:**
- Dashboard load time increases noticeably as `lore_notes` fields are filled in.
- New analytics queries use `SELECT * FROM units` when only 3-4 columns are needed.

**Phase to address:** Any new query introduction phase (ArmyReadiness, SpendingIntelligence). Use column-specific SELECTs for new queries; leave `getDashboardStats` alone unless performance evidence warrants it.

---

## Moderate Pitfalls

### Pitfall 12: `convertFileSrc` Returns a Valid URL Even for Non-Existent Files

**What goes wrong:**
`convertFileSrc(absolutePath)` constructs an `asset://` URL string without checking whether the file actually exists on disk. If a unit's `main_image_path` references a file that was deleted, moved, or never uploaded, the `<img src={assetUrl}>` element will load and display a browser broken-image icon or blank space. In the Dashboard's CurrentFocusCard v2, this means the hero photo area shows a broken image for the most prominent visual element on the page.

**Why it happens:**
`convertFileSrc` is a pure string transformation — it does not perform a file existence check. The Tauri asset:// server returns a 404 which the browser receives as a failed load event, but only if an `onError` handler is registered.

**How to avoid:**
Every `<img src={photo.assetUrl}>` must include an `onError` handler that falls back to a neutral placeholder:
```tsx
<img
  src={photo.assetUrl}
  alt={photo.stage_label ?? "Unit photo"}
  onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder-unit.png"; }}
  className="object-cover w-full h-full"
/>
```
Use a consistent placeholder image (a Forge-themed silhouette or gradient) rather than leaving the img element broken. For CurrentFocusCard v2, if the unit has no photo, render the existing text-only layout rather than an image slot with a broken image.

**Warning signs:**
- Broken image icons visible in CurrentFocusCard or gallery card thumbnails.
- No `onError` handler on thumbnail `<img>` elements.
- Dashboard hero area shows a broken image for the focus unit.

**Phase to address:** CurrentFocusCard v2 phase (first thumbnail introduction). Establish the `onError` pattern before widening to other thumbnail sites.

---

### Pitfall 13: Radial Gradient on Multiple Cards Causes GPU Layer Pressure

**What goes wrong:**
CSS radial gradients (`background-image: radial-gradient(...)`) are repainted by the GPU. Applying a radial gradient to every StatCard, every FactionSummaryCard, CurrentFocusCard, and ArmyReadinessCard simultaneously forces the browser to maintain multiple GPU composite layers. On a desktop this is typically fine, but animated gradients (gradients that change on hover or faction theme change) across 10+ elements simultaneously can cause frame drops during animations, especially during the `transition-all duration-500` faction-accent color transitions already in use.

**Why it happens:**
"Premium visual depth" is interpreted as "gradient on everything." Each gradient element can trigger a new composite layer depending on the rendering engine. WebView2 on Windows has lower GPU memory budgets than a standalone browser.

**How to avoid:**
Apply radial gradients sparingly: at most the hero area (CurrentFocusCard) and the card surface hierarchy background (the page wrapper or a single decorative element). StatCards, FactionSummaryCards, and activity rows should use flat color tokens (`bg-card`, `bg-panel-elevated`) for their backgrounds. Gradients on cards are fine when static — avoid animating `background-image` on hover (use `opacity` or `box-shadow` for hover effects instead, as these are GPU-composited without gradient re-render).

**Warning signs:**
- Frame drops visible during faction theme change when multiple gradient cards animate simultaneously.
- More than 3-4 elements with `background-image: radial-gradient(...)` on the Dashboard.
- Radial gradient applied to StatCards, which are already 4-across in a grid.

**Phase to address:** Visual depth / gradient phase. Limit gradient usage to the hero area and page-level decorative layer.

---

### Pitfall 14: New Cache Keys for ArmyReadiness and SpendingIntelligence Must Be Invalidated by Relevant Mutations

**What goes wrong:**
`useArmyReadiness(targetPoints)` and `useSpendingIntelligence()` will be new React Query cache keys introduced in v2.4. When a user updates a unit's painting status (via Collection page, Kanban, or Log Session), the army readiness percentages and spending intelligence metrics will be stale until the cache expires. Specifically: the "painted vs unpainted value" metric in spending intelligence must update when a unit moves to "Completed" status, but `useUpdateUnit`'s `onSuccess` does not yet invalidate these new keys.

**Why it happens:**
New query keys introduced after the mutation hooks were written require manually auditing and extending the existing mutation `onSuccess` callbacks. This is the same pattern as Pitfall 16 from the v2.2 research — it is a recurring class of issue in this codebase.

**How to avoid:**
At the start of each v2.4 feature phase that introduces a new query key, audit all existing mutation hooks for which new keys they should invalidate:

| Mutation | New keys to invalidate |
|----------|----------------------|
| `useUpdateUnit` (status change) | `["army-readiness", *]`, `["spending-intelligence"]` |
| `useCreateUnit` / `useDeleteUnit` | `["army-readiness", *]`, `["spending-intelligence"]` |
| `useCreatePaintingSession` (if updates status) | `["dashboard-stats"]`, `["units"]`, `["army-readiness", *]` |

For `["army-readiness", targetPoints]` keys — since the points parameter varies — invalidate with a prefix match: `qc.invalidateQueries({ queryKey: ["army-readiness"] })` (TanStack Query v5 uses prefix matching by default).

**Warning signs:**
- ArmyReadinessCard shows stale percentages after marking a unit complete elsewhere in the app.
- "Painted vs unpainted value" does not update after a status change until page reload.
- No invalidation of `["army-readiness"]` in `useUpdateUnit`'s `onSuccess`.

**Phase to address:** Each phase introducing a new query key. Include cache invalidation audit as a Wave 0 step.

---

### Pitfall 15: ActiveProjectsPanel Sliced to 5 Loses Units — Must Distinguish from "No Active Projects"

**What goes wrong:**
`computeStats.ts` already slices `activeProjects` to 5 entries. If `ActiveProjectsPanel` renders exactly this slice and the user has 8 active projects, 3 projects are silently invisible with no indication that more exist. The user wonders why a project they know is active does not appear in the panel.

**Why it happens:**
`activeProjects: Unit[]` in `ComputedDashboardStats` is already sliced: `units.filter(is_active).sort().slice(0, 5)`. The panel receives this pre-sliced array and cannot know whether items were omitted.

**How to avoid:**
Either: (a) expose `activeProjectsCount` (already on `ComputedDashboardStats`) alongside the sliced `activeProjects` array, and show "X more active — see Projects" in the panel when `activeProjectsCount > activeProjects.length`; or (b) increase the slice limit to a reasonable cap (e.g., 10) and add internal scrolling to the panel. The "X more" disclosure is preferred for Dashboard brevity — it drives the user to the Projects page for the full list.

**Warning signs:**
- User with more than 5 active projects does not see all of them on the Dashboard with no explanation.
- `ActiveProjectsPanel` renders an empty slot or a different empty state when there are 6+ active projects.

**Phase to address:** ActiveProjectsPanel phase. The "X more" indicator must be in the initial implementation, not deferred.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Extend `getDashboardStats` with army readiness JOIN | One hook, one fetch | Dashboard load grows; stale data on points selector change; 5-min cache miss | Never — use dedicated query |
| Render thumbnails in all 10 activity feed rows | Richer activity feed | 10x concurrent asset:// fetches on Dashboard mount | Never — cap to focus card + active projects |
| Use `toFixed(2)` for pence division display | One-liner | Silent rounding errors in "cost per model" metric | Never for currency |
| Add `faction_id` to recipes without backfill migration | Simple nullable column | All existing recipe-unit links become faction-orphaned | Never — always backfill in same migration |
| Inline radial gradient as `style={}` prop on all cards | Easy implementation | Bypasses token system; inconsistent with design tokens | Only for faction-accent dynamic color (already established pattern) |
| `activeProjects.slice(0, 5)` with no "X more" indicator | Simple panel | Users with 6+ active projects lose visibility silently | Never without a disclosure count |
| `SELECT * FROM units` in new analytics queries | Consistent with existing pattern | Payload grows as text columns are populated | Acceptable for `getDashboardStats` (unchanged); avoid in new dedicated queries |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| `useLatestUnitPhotos` on Dashboard | Mount at DashboardPage level for all thumbnails at once | Mount only inside components that need it; rely on shared React Query cache key |
| `convertFileSrc` for thumbnails | Render `<img src={assetUrl}>` without error handling | Always add `onError` fallback with a placeholder before wiring to any component |
| CSS grid outer wrapper migration | Replace `flex flex-col` and update children in separate commits | Replace wrapper and assign `col-span` to all existing children in the same commit |
| `@theme inline` new tokens | Add `--color-*` without checking shadcn variable namespace | Use `--forge-*` or `--panel-*` prefix exclusively for new HobbyForge tokens |
| `DASHBOARD_STATS_KEY` invalidation | Add only to new unit-status mutations, forget Log Session path | Add to ALL mutations that write `units.status_painting` or `units.painting_percentage` |
| Clickable StatCard navigation | Call `navigate()` directly from `onClick` | Flush all Sheet state (set to closed) then call `navigate()` |
| ArmyReadinessCard points aggregation | Add to `computeStats` / `getDashboardStats` | Dedicated `getArmyReadinessByFaction` query with parameterized points threshold |
| Recipe FK migration | Add nullable `faction_id` column only | Backfill with `UPDATE recipes SET faction_id = (SELECT u.faction_id FROM units u WHERE u.id = recipes.unit_id) WHERE unit_id IS NOT NULL` in same migration |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Too many `convertFileSrc` calls after photo mutation | RAM creep; blank thumbnails after navigation | Preserve `staleTime: Infinity`; limit dashboard thumbnail surface | Collections with 30+ units each having a photo |
| Radial gradient on every dashboard card | Frame drops during faction-accent theme transition | Apply gradient only to hero area (CurrentFocusCard) and page-level decorative element | 6+ gradient elements with concurrent animations |
| `getDashboardStats` SELECT * as text columns grow | Dashboard load time increases | Column-specific SELECT for new queries; leave getDashboardStats alone | Collections with extensive lore_notes (100+ characters per unit) |
| ActiveProjectsPanel re-fetching on faction accent change | Unnecessary re-renders | Ensure `useActiveFaction` context change does not invalidate `["dashboard-stats"]` | Every FactionSummaryCard click |
| New analytics query without React Query cache key | Runs on every render | Always wrap new queries in `useQuery` with a stable key | Immediate — any new DB call in a component |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| ArmyReadinessCard with no army lists shows empty/broken state | User confused about card purpose | Show "Create an army list to see readiness" with a link to /army-lists |
| Simplified pipeline loses per-stage identity | User cannot see which specific stage units are in | Show bucket labels with unit counts; hover/click to expand to the full 11-stage breakdown |
| Faction Cards v2 "larger" overflows at 900px min window | Cards wrap to two rows unexpectedly | Verify dimensions against 900px constraint; use CSS grid fallback at narrow widths |
| Photo thumbnail aspect ratio distortion | Dark background visible around portrait-oriented mini photos | Use `object-cover` with a fixed-ratio container on every thumbnail |
| Log Session marks status change with no undo | User accidentally marks wrong status | Show a Sonner toast with undo action (5-second window) using the existing toast pattern |
| Clickable StatCard navigates mid-flow (user was reading CurrentFocusCard) | Jarring loss of context | Prefer opening a filtered Collection Sheet or navigating to Collection with pre-set filter |
| "Cost per completed model" shows £0.00 with no explanation when no units are completed | Metric looks broken | Show "No completed models yet" placeholder instead of £0.00 |

---

## "Looks Done But Isn't" Checklist

- [ ] **CSS grid layout:** Verify the Skeleton loading state uses matching `col-span` assignments — not just the populated state.
- [ ] **CSS grid layout:** Verify all 7 existing dashboard sections render correctly at 900px, 1280px, and 1440px viewport widths.
- [ ] **CurrentFocusCard v2 photo:** Confirm `onError` fallback is in place and renders a placeholder before wiring to `useLatestUnitPhotos`.
- [ ] **ArmyReadinessCard:** Confirm 0-army-list empty state renders correctly and links to /army-lists.
- [ ] **ArmyReadinessCard:** Confirm changing the target points selector does not trigger a full dashboard re-fetch.
- [ ] **Spending intelligence "cost per model":** Confirm `completedCount === 0` shows a "no completed models" placeholder (not `NaN`, `Infinity`, or `£0.00`).
- [ ] **Log Session status update:** Confirm both `DASHBOARD_STATS_KEY` and `UNITS_KEY` are invalidated in the same `onSuccess`.
- [ ] **Clickable StatCards:** Open UnitDetailSheet → click Total Models StatCard → Sheet closes, Collection page loads without overlay.
- [ ] **Recipe migration backfill:** `SELECT COUNT(*) FROM recipes WHERE unit_id IS NOT NULL AND faction_id IS NULL` returns 0 after migration.
- [ ] **Faction Cards v2:** Layout is usable with 4 factions at 900px minimum window width.
- [ ] **HobbyPipeline 5 buckets:** `Object.values(PIPELINE_BUCKETS).flat().length === 11` (all stages covered); no stage in two buckets.
- [ ] **ActiveProjectsPanel:** User with 8 active projects sees "3 more active — see Projects" indicator.
- [ ] **Radial gradient:** Gradient does not appear broken or blank in the production Tauri binary (confirm in `pnpm tauri build`).
- [ ] **Photo thumbnails:** `loading="lazy"` present on all thumbnail `<img>` elements.
- [ ] **New query keys:** All new `useArmyReadiness` and `useSpendingIntelligence` keys are invalidated by `useUpdateUnit` and `useCreateUnit`/`useDeleteUnit`.

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| CSS grid breaks existing components | MEDIUM | Revert to `flex flex-col` wrapper; implement grid on a feature branch with per-component `col-span` audit first |
| Tailwind v4 token conflict corrupts shadcn component styles | LOW | Rename the conflicting `--color-*` variable in globals.css; restart `pnpm dev` to clear Tailwind cache; visually inspect Button/Badge |
| Photo memory leak confirmed | MEDIUM | Add `loading="lazy"` to all thumbnail `<img>` tags; remove Dashboard thumbnail surface from all but CurrentFocusCard if RAM > threshold |
| Dashboard stale after Log Session status update | LOW | Add `qc.invalidateQueries({ queryKey: DASHBOARD_STATS_KEY })` and `UNITS_KEY` to session mutation `onSuccess` |
| Recipe migration data loss (no backfill) | HIGH | Write a repair migration (new file, next version number) that runs the backfill UPDATE; never edit the original migration |
| ArmyReadinessCard NaN or incorrect points | LOW | Add guard `totalPoints > 0 ? Math.round(...) : 0` in the compute function; add unit test |
| Clickable StatCard leaves ghost Sheet portal | LOW | Add close callbacks before `navigate()` in each StatCard handler |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| CSS grid breaks existing layout | Dashboard grid phase (first) | All 7 sections render at 900px / 1280px / 1440px; Skeletons match populated layout |
| Tailwind v4 token conflict | Visual depth / gradient phase | `pnpm build` passes; Button/Badge/Select visually unchanged after token addition |
| Photo thumbnail memory pressure | CurrentFocusCard v2 / ActiveProjectsPanel phase | `onError` fallback renders; RAM stable after 5 photo uploads |
| Missing `DASHBOARD_STATS_KEY` invalidation | Log Session enhancement phase | Log session + status change → Dashboard counters update same render cycle |
| ArmyReadinessCard wrong query scope | ArmyReadinessCard phase | Points selector change updates card without re-fetching full dashboard |
| Pence division rounding error | Spending intelligence phase | Unit test: `computeSpendingIntelligence(2750, 3)` → 916 pence displayed as `£9.16` |
| Clickable StatCard orphans Sheet portals | Clickable StatCards phase | Open UnitDetailSheet → click StatCard → Sheet closed, no ghost overlay on destination |
| Recipe FK migration no backfill | Recipe integration phase | Post-migration: `SELECT COUNT(*) FROM recipes WHERE unit_id IS NOT NULL AND faction_id IS NULL` = 0 |
| HobbyPipeline bucket double-counting | Dashboard redesign (simplified pipeline) phase | Pure function test: bucket totals sum to `units.length` |
| Faction Cards v2 overflow at 900px | Faction Cards v2 phase | Visual check at 900px window width with 4 factions |
| New cache keys not invalidated | ArmyReadiness and SpendingIntelligence phases | Mutation hook `onSuccess` audit checklist; unit status change → new metrics update |
| ActiveProjectsPanel silent truncation | ActiveProjectsPanel phase | User with 8 active projects sees "3 more" disclosure |

---

## Sources

- Tailwind v4 inline style / CSS variable cascade bug: https://github.com/tailwindlabs/tailwindcss/issues/15874
- Tailwind v4 `@theme` token discussion: https://github.com/tailwindlabs/tailwindcss/discussions/15122
- Tauri asset:// memory not released: https://github.com/tauri-apps/tauri/issues/2952
- Tauri v2 asset protocol scope / 403 issues: https://github.com/tauri-apps/tauri/issues/9648
- React Query invalidation missing dependent queries: https://tkdodo.eu/blog/automatic-query-invalidation-after-mutations
- Integer pence / safe currency arithmetic: https://frontstuff.io/how-to-handle-monetary-values-in-javascript
- CSS gradient GPU layer compositing: https://web.dev/articles/css-paint-times
- Clickable card keyboard accessibility: https://reactrouter.com/how-to/accessibility
- HobbyForge codebase: `src/features/dashboard/DashboardPage.tsx`, `src/features/dashboard/computeStats.ts`, `src/hooks/useUnitPhotos.ts`, `src/db/queries/dashboard.ts`, `src/features/spending/computeSpendingStats.ts`, `src/features/army-lists/ArmyListSummaryBar.tsx`, `src/styles/globals.css`, `src-tauri/capabilities/default.json`
- Prior research: `.planning/research/PITFALLS.md` (v2.2) — Pitfall 16 (cache key invalidation) recurring class documented

---
*Pitfalls research for: HobbyForge v2.4 — Premium Dashboard UX (CSS grid, visual depth, photo thumbnails, ArmyReadiness, recipe linking, spending intelligence)*
*Researched: 2026-05-05*
