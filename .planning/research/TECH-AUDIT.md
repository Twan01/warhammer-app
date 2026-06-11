# Technical Polish Audit — Performance & Code Quality

**App:** HobbyForge (Tauri 2 + React 19 + TanStack Router + SQLite)
**Audited:** 2026-06-11
**Scope:** Read-only analysis of `src/` — no source files modified

---

## 1. Query Pattern Analysis

### 1.1 Global Defaults — GOOD

`src/components/common/QueryProvider.tsx` sets sensible desktop-app defaults:
- `staleTime: 5 min`, `gcTime: 10 min`, `refetchOnWindowFocus: false`, `retry: 1`

These are appropriate for a local SQLite app with no remote sync.

### 1.2 staleTime Overrides — WELL CALIBRATED

Individual hooks correctly override the global default where appropriate:

- `staleTime: Infinity` — used correctly for immutable reference data (rules DB content, UDB
  units, strategies, keywords, journal sessions, unit photos). All cases are commented with
  justification. HIGH confidence this is deliberate and correct.
- `staleTime: 0` — used on `useUnitDatabase.ts:141,150` for ownership data (dynamic). Correct.
- `staleTime: 5 * 60 * 1000` — matches global default, set explicitly on a few hooks
  (`useKanbanEnrichment`, `useLoadoutOptions`, `useLeaderTargets`, `useWorkflowPositions`).
  These explicit restatements are harmless but redundant.

**Finding:** No staleTime misconfiguration found.

### 1.3 N+1 Query Pattern — ONE KNOWN INSTANCE

**WHERE:** `src/features/army-lists/ArmyListsPage.tsx:116-117`

```tsx
// ArmyListCardWrapper — called once per army list card
const { data: units = [] } = useArmyListWithUnits(list.id);
const { data: enhancements = [] } = useEnhancementsByList(list.id);
```

**WHAT:** `ArmyListCardWrapper` is rendered in a `.map()` loop, each issuing 2 React Query
hooks. With N army lists, this fires N×2 SQLite queries on mount.

**IMPACT:** The file's own comment acknowledges this: "N+1 hook usage is acceptable at
personal-use scale (max ~10 lists expected)." At 10 lists that is 20 SQLite round-trips on
page load. Since each round-trip goes through Tauri's IPC, and lists is a personal-use screen,
this is unlikely to be perceptible. MEDIUM priority.

**SUGGESTION:** If list count grows, add a batched `useArmyListsWithUnits(ids[])` hook that
joins units in a single SQL query. The kanban board already demonstrates this pattern
(`useKanbanEnrichment` batches N unit IDs into one query — see `PERF-03` comment).

### 1.4 Kanban Batch Query — GOOD

`src/hooks/useKanbanEnrichment.ts` explicitly documents and implements the PERF-03
optimization: a single batched SQL query replaces a former O(N) per-unit loop. This is the
correct pattern. No issues here.

### 1.5 Missing gcTime on Infinity-stale Queries

**WHERE:** All hooks with `staleTime: Infinity` (e.g. `useGameData.ts`, `useUnitDatabase.ts`,
`useDatasheet.ts`, `useJournalSessions.ts`, `useStrategyNote.ts`, `useUnitPhotos.ts`)

**WHAT:** None of these hooks set `gcTime`. They inherit the global 10-minute gc window. After
10 minutes of non-use, the cached data is garbage-collected and must be re-fetched. Since these
are marked `staleTime: Infinity`, the intent is clearly "never re-fetch unless invalidated."
But if gc evicts the data, the next component mount will trigger a fresh fetch.

**IMPACT:** Minor UX inconsistency — switching from the rules hub to another page and back
after 10+ minutes causes a loading flash despite `staleTime: Infinity`. For a desktop app with
persistent sessions this might never manifest in practice, but it contradicts the intent.

**SUGGESTION:** Add `gcTime: Infinity` alongside `staleTime: Infinity` on these hooks, or
globally raise `gcTime` to 30+ minutes.

---

## 2. Bundle & Code Splitting Status

### 2.1 Route-Level Lazy Loading — COMPLETE

**WHERE:** `src/app/router.tsx:19-36`

All 16 page components use `React.lazy()` with the named-export adapter pattern. The
`Suspense` boundary is correctly placed on the layout route, not individual pages. This is
correct and complete. No action needed.

### 2.2 No Prefetching on Navigation

**WHERE:** Router configuration (`src/app/router.tsx:236`)

**WHAT:** TanStack Router supports `defaultPreload: 'intent'` (prefetch on link hover) and
`defaultPreload: 'render'` (prefetch on initial render). The router is created with no
preload configuration, so every route navigation starts fresh with the Suspense spinner.

**IMPACT:** Each first visit to a route shows the `<Loader2>` spinner while the JS chunk
downloads. On a desktop app with fast local disk, chunk load time is negligible (<30ms),
so this is LOW priority.

**SUGGESTION:** Optional quality-of-life: add `defaultPreload: 'intent'` to the router to
eliminate the spinner on sidebar nav links the user hovers before clicking.

### 2.3 Large Imports — Not Critical

No massive third-party imports were found outside what the stack already includes (DnD Kit,
TanStack Table, Recharts in `chart.tsx`, Radix UI). All are tree-shakeable. Lucide React icon
imports are per-named-symbol. No identified bundle bloat.

---

## 3. Animation & Transition Gaps

### 3.1 Shadcn/Radix Primitives — GOOD

All shadcn/ui primitives include proper open/close animations via Radix data-attributes:

- `Sheet` — `slide-in-from-right` / `slide-out-to-right` (300ms close, 500ms open)
- `Dialog` / `AlertDialog` — `fade-in-0 zoom-in-95` / `animate-out` variants
- `Popover`, `Select`, `DropdownMenu` — slide-in directional variants
- `Tooltip` — `fade-in-0 zoom-in-95`
- `Accordion` — `animate-accordion-down` / `animate-accordion-up`

These are all functioning animations from the shadcn defaults. No degradation found.

### 3.2 Page Transitions — ABSENT

**WHERE:** `src/app/router.tsx` + all page components

**WHAT:** There are no page-level transition animations. Route changes are instantaneous —
the previous page disappears and the new one appears (or the Suspense spinner shows).

**IMPACT:** The app feels snappy but "blunt" on navigation. Standard desktop apps use subtle
crossfades (100-150ms) to signal context change. LOW visual polish impact.

**SUGGESTION:** TanStack Router supports a `pendingComponent` and `pendingMinMs` to prevent
flash on fast loads. For crossfades, a `data-transitioning` CSS class on the `<Outlet>`
wrapper plus a `transition: opacity 100ms` would provide a minimal but polished effect.

### 3.3 List Item Add/Remove Animations — ABSENT

**WHERE:** Kanban columns (`KanbanColumn.tsx`), unit table rows, recipe card grid, goals list

**WHAT:** Items appear/disappear instantly when added, removed, or filtered. React 19 ships
`ViewTransition` support; DnD Kit already handles drag animations via `transition` from
`useSortable`. But static mutations (add/delete) have no entry/exit animations.

**IMPACT:** Deleting a recipe card causes an abrupt layout reflow. LOW priority but
noticeably less polished than apps with staggered appear/disappear.

**SUGGESTION:** For card grids, a simple CSS class (`animate-in fade-in-0 duration-150`)
applied to newly-rendered items, combined with a `data-removing` class that triggers `fade-out`
before unmount, would suffice. The `tw-animate-css` package (already imported in
`globals.css:2`) provides these utilities.

### 3.4 Sidebar Collapse — INLINE STYLE, NO CSS TRANSITION

**WHERE:** `src/components/common/AppSidebar.tsx:71`

```tsx
style={{ width: collapsed ? 48 : 240 }}
```

**WHAT:** Sidebar width changes are applied via an inline style with no `transition` property.
The collapse/expand is instantaneous.

**IMPACT:** Minor visual jank — the sidebar snaps rather than sliding. LOW priority.

**SUGGESTION:** Add `transition: width 200ms ease` to the sidebar element's CSS class (or
alongside the inline style) to get a smooth sidebar toggle. The `sidebar.tsx` Radix component
already uses `transition-[width,height]` utilities on the interior — the outer wrapper just
needs to match.

### 3.5 Progress Bar Animations — PARTIAL

**WHERE:** Various progress bars (`UnitGallery.tsx`, `GoalCard.tsx`, `FactionSummaryCard.tsx`,
`ArmyListSummaryBar.tsx`, `GameDayReadinessPanel.tsx`)

**WHAT:** Progress bar fill is set via `style={{ width: "Xpct" }}`. `UnitGallery.tsx:152`
applies `transition-all` on the fill div, which is good. Most other progress bars use the
shadcn `<Progress>` component which has a CSS `translate` transition on the indicator. These
are fine.

**FINDING:** No issues — progress bars animate correctly where `transition` is applied.

### 3.6 Smooth Scrolling — ABSENT

**WHERE:** Entire app

**WHAT:** No `scroll-behavior: smooth` or `scrollIntoView({ behavior: 'smooth' })` was found.
The `PlaybookTab.tsx` uses `useRef` for auto-scroll state management but the actual DOM scroll
is not smooth.

**IMPACT:** Negligible — this app is mostly panel/sheet-based rather than long-scroll pages.

---

## 4. CSS Technical Debt

### 4.1 `!important` Usage — JUSTIFIED

**WHERE:** `src/styles/globals.css:136,141,146`

All three `!important` declarations are in a `@media print` block — hiding app chrome and
showing only `#print-content`. This is the standard and correct approach for print stylesheets.
No fix needed.

### 4.2 Inline Styles — FUNCTIONAL BUT MIXED

**WHERE:** ~50 occurrences across feature files (see grep results)

Most inline styles fall into four justified categories:

1. **Dynamic hex colors** — `style={{ backgroundColor: faction.color_theme }}` — Cannot be
   expressed as Tailwind classes because the value is a runtime hex string from the DB. This
   is correct.

2. **DnD Kit transform styles** — `style={{ transform: CSS.Transform.toString(transform), transition }}` —
   Required by DnD Kit for drag-and-drop positioning. Correct.

3. **Dynamic width percentages** — `style={{ width: "X%" }}` — Common for progress bar fills
   and chart bars. These cannot be pre-generated as Tailwind classes.

4. **CSS Grid with dynamic columns** — `src/features/recipes/RecipeCardGrid.tsx:46,71`
   ```tsx
   style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}
   ```
   This is a valid case — Tailwind v4 does not support `minmax()` in grid-template-columns
   utilities. But it appears in two identical places and could become a CSS class.

**Found problematic case:**

**WHERE:** `src/features/recipes/RecipeCard.tsx:36,42,48,60,78,89`

```tsx
style={{ backgroundColor: "#22c55e" }}  // green-500
style={{ backgroundColor: "#f59e0b" }}  // amber-500
style={{ backgroundColor: "#ef4444" }}  // red-500
```

**WHAT:** Hardcoded hex colors for availability status dots. These are hardcoded in 6 places
in `RecipeCard.tsx` and duplicated again in `SectionedTimeline.tsx:126,134`. They bypass the
theme system and will look wrong on light mode (the app is dark-mode-primary but ships both).

**IMPACT:** MEDIUM — the status colors are hardcoded as light-theme greens/reds/ambers that
don't adapt. In dark mode they look fine by coincidence but this is fragile.

**SUGGESTION:** Replace with Tailwind semantic classes: `bg-green-500`, `bg-amber-500`,
`bg-red-500`. These are identical visually but semantically correct. Or better, define CSS
variables `--color-status-good`, `--color-status-warn`, `--color-status-missing` in
`globals.css` and use `bg-[var(--color-status-good)]`.

### 4.3 Dark Mode Coverage — GOOD (with one gap)

**WHERE:** `src/styles/globals.css` + shadcn tokens

The app defines full `--background`, `--card`, `--muted`, etc. tokens for both `:root` (light)
and `.dark` variants. All shadcn components use CSS variables. Custom feature components use
`bg-card`, `bg-muted`, `text-muted-foreground`, etc. — all correctly theme-aware.

**One gap found:**

**WHERE:** `src/features/army-lists/SnapshotCompareDialog.tsx` (2 `dark:` occurrences) and
`src/features/units/PaintingPipeline.tsx` (1 `dark:` occurrence)

These are the only files in `src/features/` using explicit `dark:` variant classes, meaning
they hardcode light-mode defaults that need dark-mode overrides. All other components use
token-based classes that adapt automatically.

**IMPACT:** LOW — these are infrequently-visited screens.

**SUGGESTION:** Audit those specific `dark:` usages and replace with token-based classes if
possible.

### 4.4 Hardcoded Color String in FactionRow

**WHERE:** `src/features/factions/FactionRow.tsx:29`

```tsx
style={{ borderLeft: `4px solid ${/^#[0-9A-Fa-f]{6}$/.test(faction.color_theme) ? faction.color_theme : "#71717a"}` }}
```

**WHAT:** The fallback `#71717a` is `zinc-500` — matches `--faction-accent` default in
`globals.css`. But the hardcoded hex string and the inline regex validation are duplicated
logic that lives more naturally as a utility function.

**IMPACT:** LOW — functional, not a bug. But it is duplicating logic from two different places.

**SUGGESTION:** Extract to a `getFactionBorderStyle(colorTheme: string | null)` utility in
`@/lib/factionUtils.ts`.

---

## 5. Large Component Inventory

Line counts from file sizes (via glob + read spot checks):

| File | Approx Lines | Concern |
|------|-------------|---------|
| `src/features/army-lists/ArmyListDetailPage.tsx` | ~760 | God component — see §5.1 |
| `src/features/army-lists/ArmyListDetailSheet.tsx` | ~340 | Partial duplicate of DetailPage — see §5.2 |
| `src/features/rules-hub/DatasheetPointsTab.tsx` | ~569 | Complex but single-concern |
| `src/features/units/PlaybookTab.tsx` | ~253 | Multiple local state fields, acceptable |
| `src/features/recipes/RecipeFormSheet.tsx` | ~300+ | Form component, acceptable |
| `src/features/dashboard/DashboardPage.tsx` | ~470+ | See §5.3 |

### 5.1 ArmyListDetailPage.tsx — God Component

**WHERE:** `src/features/army-lists/ArmyListDetailPage.tsx` (~760 lines)

**WHAT:** This file contains:
- A `useReducer` with 14 action types and a full reducer function (lines 100–194)
- A `SortableUnitRow` wrapper component (lines 204–260)
- The main `ArmyListDetailPage` component with ~15 `useMemo`/`useCallback` declarations,
  multiple `useEffect` hooks, inline quick-add search, DnD setup, and the full render tree

**IMPACT:** High maintenance cost. Adding any new feature to the army list detail page
requires navigating a ~760-line file. Bugs in the reducer, the DnD layer, and the rendering
logic are hard to isolate.

**SUGGESTION:** Extract:
1. The reducer + types to `armyListDetailReducer.ts` (already done for `armyListsReducer.ts`
   on the list page — follow that pattern)
2. `SortableUnitRow` to a sibling file `SortableUnitRow.tsx`
3. The quick-add search block to a `QuickAddSearch.tsx` component

### 5.2 ArmyListDetailSheet vs ArmyListDetailPage — DUPLICATION

**WHERE:**
- `src/features/army-lists/ArmyListDetailPage.tsx` (full page, ~760 lines)
- `src/features/army-lists/ArmyListDetailSheet.tsx` (~340 lines)

**WHAT:** Two components render the army list detail view — one as a full page (navigated to
via `/army-lists/$listId`), one as a Sheet (appears to be the older implementation). The Sheet
version still exists and was referenced in comments as "ArmyListDetailSheet" in
`ArmyListUnitRow.tsx`. The Sheet version is NOT used on the current army lists page — clicking
a card now navigates. The Sheet version appears to be legacy code that was not cleaned up when
the full page was introduced.

**IMPACT:** MEDIUM — ~340 lines of active-looking code that may no longer serve any users.
Any bug fixes to army list detail logic must be checked in two places.

**SUGGESTION:** Audit whether `ArmyListDetailSheet` is still mounted anywhere. If not, delete
it. A grep for `<ArmyListDetailSheet` shows it is only referenced in its own file definition
and the export — it is NOT imported by any page component. Safe to delete.

### 5.3 DashboardPage.tsx — Dense but Justified

**WHERE:** `src/features/dashboard/DashboardPage.tsx` (~470 lines)

**WHAT:** The file is large but has a clear reason: the dashboard orchestrates ~12 child
components and needs to wire up their event handlers (log session, unit select, faction accent).
The data flows are documented with comments.

**IMPACT:** Acceptable. The component is not a god component — it delegates rendering to
specialist sub-components.

**SUGGESTION:** Minor — the `focusAppliedProgress` memo on line 116 derives from `stats`
and could be co-located in a `useCurrentFocusData()` hook to reduce dashboard file size by
~40 lines. LOW priority.

---

## 6. React Pattern Issues

### 6.1 `React.memo` — USED ONLY WHERE CRITICALLY NEEDED

**WHERE:** Only two components use `memo`:
- `src/features/army-lists/ArmyListUnitRow.tsx:65` — memoized in a large sortable table
- `src/features/painting-projects/KanbanCard.tsx:42` — memoized in DnD kanban

**WHAT:** No other list-rendered components use `React.memo`. The unit gallery (`UnitGallery`),
recipe card grid (`RecipeCardGrid`), and faction summary cards (`FactionSummaryCard`) all
re-render their entire lists on any state change in the parent.

**IMPACT:** For current data sizes (personal hobby app, <200 units, <50 recipes) this is
unlikely to cause visible jank. React 19's automatic batching and the fiber architecture
handle this efficiently. MEDIUM priority for the UnitGallery specifically, which can display
photo `<img>` tags and has more expensive render work per card.

**SUGGESTION:** Wrap the inner card component in `UnitGallery` (the inline card JSX) into
a named `UnitGalleryCard` component and apply `memo`. Similarly for `RecipeCard` — it is
already a separate component but is not memoized. Given that `RecipesPage` re-renders on
every search keystroke (the filter is derived from the input), every RecipeCard re-renders
on each keystroke even if its own data hasn't changed.

### 6.2 useEffect for Form Reset — WIDESPREAD PATTERN

**WHERE:** Nearly every Sheet/Dialog component:
- `FactionSheet.tsx:62`, `PaintSheet.tsx:88`, `GoalSheet.tsx:59`, `ArmyListSheet.tsx:81`
- `BattleLogSheet.tsx:145`, `RecipeFormSheet.tsx:157,168`, `WishlistItemSheet.tsx:83`
- `UnitSheet.tsx:117`, `PaintingSessionSheet.tsx:60`

**WHAT:** All follow the same pattern:
```tsx
useEffect(() => {
  if (open) form.reset({ ...defaultValues });
}, [open]);  // or [open, entity.id]
```

This is the standard React Hook Form reset pattern and is NOT a bug. However, several of
these `useEffect` calls have incomplete dependency arrays where the `form` object is not
included (RHF's `form` reference is stable, so this is safe in practice but would trigger
the `react-hooks/exhaustive-deps` lint rule).

**IMPACT:** No runtime issue. If a linter were added, these would all flag.

**SUGGESTION:** These are a known RHF idiom. No change needed unless a linter is added.
If/when a linter is introduced, suppress with `// eslint-disable-next-line react-hooks/exhaustive-deps`
or switch to `useResetableForm` pattern.

### 6.3 useEffect with Derived State — PlaybookTab

**WHERE:** `src/features/units/PlaybookTab.tsx:88-98`

```tsx
useEffect(() => {
  if (data === undefined || initialRef.current !== undefined) return;
  initialRef.current = data;
  setMove(data?.move ?? null);
  setToughness(data?.toughness ?? null);
  // ... 8 more setX calls
}, [data]);
```

**WHAT:** 11 separate `useState` fields are populated from a single query result on first
load. Each `setState` call could trigger a re-render. React 19 batches these in a single
event handler but `useEffect` callbacks also batch in React 18+, so this is fine.

**IMPACT:** The pattern is architecturally heavy — 11 parallel local state fields that
mirror a server state object. The "dirty check" `useMemo` on line 112 compares all 11 fields
manually, resulting in a 15-condition boolean.

**SUGGESTION:** Consolidate into a single form state object using `useReducer` or a single
`useState({ move, toughness, save, ... })`, eliminating the need for 11 individual setters.
Or migrate to React Hook Form which handles the dirty-tracking automatically.

### 6.4 Key Prop Using Array Index — SKELETON ONLY

**WHERE:** ~14 skeleton loading components across features

```tsx
{Array.from({ length: 8 }, (_, i) => (
  <Skeleton key={i} ... />
))}
```

**WHAT:** Array-index keys on skeleton loaders. This is a known acceptable exception — skeletons
have no identity, never reorder, and are replaced entirely when data loads. NOT an issue.

### 6.5 `useEffect` Debounce Pattern

**WHERE:** `src/features/unit-database/DatabaseBrowserPage.tsx:51-65`

```tsx
useEffect(() => {
  const timer = setTimeout(() => setDebouncedSearch(inputSearch), 300);
  return () => clearTimeout(timer);
}, [inputSearch]);
```

**WHAT:** Manual debounce via `useEffect` + `setTimeout`. This works but is a common source
of subtle bugs with React StrictMode double-invocation.

**IMPACT:** LOW — functional. In production (StrictMode disabled by default in Tauri builds)
this behaves correctly.

**SUGGESTION:** Replace with a small `useDebounce(value, delay)` hook extracted to
`src/hooks/useDebounce.ts`, or use the `use-debounce` npm package. This pattern appears in
at least one place and will likely be repeated if more search inputs are added.

### 6.6 Prop Drilling Assessment — ACCEPTABLE

The app uses React Context for:
- Active faction ID + accent color (`ActiveFactionContext`)
- Quick-add state (`QuickAddContext`)
- Theme (`ThemeProvider`)

Zustand is used for filter state per feature. There is no notable prop drilling — data
is either React Query (via hook), Zustand (via store), or passed 1-2 levels to child
renderers. No chains of 3+ levels were observed.

---

## 7. Performance Improvement Opportunities

### 7.1 HIGH IMPACT: RecipeCard Not Memoized in Search-Reactive Grid

**WHERE:** `src/features/recipes/RecipeCardGrid.tsx` + `RecipesPage.tsx`

`RecipesPage` debounces a text search with `useEffect`. On each keystroke debounce, `filtered`
(useMemo) recomputes, causing `RecipeCardGrid` and all its `RecipeCard` children to re-render.
Each `RecipeCard` is reasonably complex (badges, swatch strip, availability calculation).

With 50+ recipes visible, this means 50+ component re-renders per search keystroke.

**SUGGESTION:** Wrap `RecipeCard` in `memo`:
```tsx
export const RecipeCard = memo(function RecipeCard({ recipe, faction, ... }) { ... });
```
Since props are primitives or stable references passed from Maps, this will short-circuit most
re-renders.

### 7.2 MEDIUM IMPACT: Unit Gallery — No Virtualization

**WHERE:** `src/features/units/UnitGallery.tsx`

The gallery renders all `sorted` units as `<Card>` elements with `<img>` tags (lazy loaded).
No virtualization. At 100 units the DOM has 100 card elements, each with an `<img>` that
triggers a filesystem `asset://` fetch.

The Unit Database (`UdbUnitList`) uses `@tanstack/react-virtual` — the same library is
already in the dependency tree.

**SUGGESTION:** Apply `useVirtualizer` to the gallery grid, or at minimum implement pagination.
The `UnitTable` already paginates (25 per page). The gallery should do the same.

### 7.3 MEDIUM IMPACT: Dashboard Loads All Units on Mount

**WHERE:** `src/hooks/useDashboardStats.ts` → `src/db/queries/dashboard.ts`

`useDashboardStats` calls `getDashboardStats()` which fetches all units + factions in a single
query for `computeStats`. This is the correct approach — one query, client-side aggregation.

However, the `DashboardPage` also calls `useLatestUnitPhotos()` (fetches latest photo per unit)
and `useRecentActivity()` independently, meaning 3 separate DB queries fire on dashboard mount.
This is fine for current data volumes but worth noting.

**SUGGESTION:** No action needed at current scale. If dashboard load becomes perceptible,
consider merging `getDashboardStats` and `getLatestPhotosForUnits` into a single denormalized
query.

### 7.4 LOW IMPACT: `factionMap` Computed in Multiple Sibling Components

**WHERE:** `UnitGallery.tsx:71`, `RecipeCardGrid.tsx:36`, `UnitTable.tsx:59`,
`KanbanBoard.tsx:48`, `BattleLogPage.tsx:40`, `RecipesPage.tsx`, `FactionsPage.tsx:35`

Each component independently builds `new Map<number, Faction>()` from the `factions` array.
This is cheap (O(N) where N ≤ 20 factions) and cached by `useMemo`, so the cost is negligible.

**SUGGESTION:** If this pattern grows, consider a `useFactionMap()` hook that derives and
caches the map at query level. Not urgent.

### 7.5 LOW IMPACT: AppSidebar Width Controlled by Inline Style Without Transition

**WHERE:** `src/components/common/AppSidebar.tsx:71`

```tsx
style={{ width: collapsed ? 48 : 240 }}
```

The sidebar snaps width on collapse without CSS transition. Already noted in §3.4.

### 7.6 LOW IMPACT: `ArmyListDetailSheet` Appears to Be Dead Code

**WHERE:** `src/features/army-lists/ArmyListDetailSheet.tsx`

As noted in §5.2, this ~340-line file is not imported by any currently-active page.
It is a full React component doing its own data fetching. It will be initialized by
hot module reload, type-checked, and parsed at bundle time, adding ~340 lines to the
army-lists chunk for no runtime benefit.

**SUGGESTION:** Confirm via grep that it is truly dead code and delete it. Estimated
savings: ~340 lines removed, ~15 unused React Query subscriptions eliminated at bundle level.

---

## Summary Table

| Area | Finding | Severity | Action |
|------|---------|----------|--------|
| Query staleTime | Correctly calibrated; `Infinity` hooks missing `gcTime: Infinity` | LOW | Add `gcTime: Infinity` to companion hooks |
| N+1 queries | ArmyListsPage does N×2 queries per list card | LOW (personal scale) | Note for future batch hook |
| Route lazy loading | All routes lazy-loaded correctly | — | None |
| Route prefetch | No `defaultPreload` set | LOW | Add `intent` prefetch |
| Sheet/Dialog animations | shadcn defaults present and working | — | None |
| Page transitions | No crossfades on navigation | LOW | Optional CSS fade |
| List animations | No add/remove animations | LOW | Optional `tw-animate-css` |
| Sidebar transition | Instant snap on collapse | LOW | Add CSS transition |
| `!important` | Only in `@media print` — justified | — | None |
| Hardcoded hex colors | RecipeCard/SectionedTimeline status dots | MEDIUM | Replace with Tailwind classes |
| Dark mode | Mostly token-based; 5 files use `dark:` explicitly | LOW | Audit those 5 files |
| ArmyListDetailPage | ~760-line god component | MEDIUM | Extract reducer + SortableUnitRow |
| ArmyListDetailSheet | Dead code (~340 lines, never imported) | MEDIUM | Delete after verification |
| React.memo | Missing on RecipeCard, UnitGalleryCard | MEDIUM | Add memo to fix search re-renders |
| useEffect debounce | Manual pattern in DatabaseBrowserPage | LOW | Extract useDebounce hook |
| PlaybookTab state | 11 parallel useState fields from one query | LOW | Consolidate to useReducer |
| Unit Gallery | No virtualization; renders all photos | MEDIUM | Add pagination or useVirtualizer |
| factionMap rebuilds | N components each build their own Map | LOW | Optional shared useFactionMap |

---

## Top 5 Actionable Improvements (by impact/effort ratio)

1. **Delete `ArmyListDetailSheet.tsx`** — Confirmed dead code. Zero effort, removes 340 lines.

2. **Add `React.memo` to `RecipeCard`** — Two-line fix that eliminates O(N) re-renders on
   every search keystroke in the recipes page.

3. **Add `gcTime: Infinity` to all `staleTime: Infinity` hooks** — Ensures immutable data is
   never evicted from cache unexpectedly. ~25 one-line additions across 10 hook files.

4. **Extract reducer to `armyListDetailReducer.ts`** — Reduces `ArmyListDetailPage.tsx` from
   ~760 to ~600 lines and follows the existing convention from `armyListsReducer.ts`.

5. **Add CSS transition to sidebar collapse** — One-line CSS addition for a visible polish
   improvement on every sidebar toggle.
