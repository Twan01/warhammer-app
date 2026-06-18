---
phase: 138-player-journey-depth
verified: 2026-06-18T00:00:00Z
status: human_needed
score: 12/12 must-haves verified
overrides_applied: 0
human_verification:
  - test: "Open the Unit Database, select 2 units via the GitCompare toggle, click 'Compare (2)', and verify the compare page renders two columns side by side with stats, weapons, abilities, keywords, and points; cells/rows that differ across columns should be highlighted with a visible background tint."
    expected: "Two columns render with all five sections. Differing stats show the bg-faction-accent/15 highlight. Shared WeaponTable is used per column. Identical values have no highlight."
    why_human: "Visual diff highlight (bg-faction-accent/15) and column layout cannot be verified structurally without rendering; CSS utility class presence in source is confirmed but pixel-level rendering requires a browser."
  - test: "Select 3 units for comparison, then attempt to add a 4th via the GitCompare toggle on another row."
    expected: "The 4th toggle is disabled (greyed out, cursor-not-allowed). The Compare button still shows 'Compare (3)'. Clicking the disabled button does nothing."
    why_human: "Cap enforcement at the UI affordance level (tooltip, disabled state, cursor) requires visual/interactive verification."
  - test: "On the Unit Database browser, click the 'Owned xN' badge on a row where you own units. Verify you land on the Collection page pre-filtered to show only that unit's collection entries."
    expected: "Collection page shows only units linked to that UDB unit. The filter is applied immediately on arrival. Other collection entries are hidden."
    why_human: "Deep-link filter state (Zustand udbUnitIdFilter) and resulting Collection render requires interactive navigation to verify the filter actually narrows the list."
  - test: "Perform a cross-faction search in the Unit Database (search for a unit name that appears in multiple factions). Verify that results for units you own show an 'Owned xN' badge."
    expected: "Search results include owned badges for units you have in your Collection, sourced from the faction-agnostic ownership query."
    why_human: "Cross-faction search badge visibility depends on live data in both the rules.db and the user's hobbyforge.db; requires a running app with real data."
  - test: "Open the Dashboard and verify the 'Hobby Goals' section appears in the left column (after the By Faction section) with progress bars for active goals."
    expected: "A 'Hobby Goals' heading is visible. Each active goal shows its name, a 'count / target' label, a period label, and a filled progress bar. When no goals are active, the empty state shows 'No active goals.' with a 'Set a hobby goal ->' link."
    why_human: "Progress bar fill percentage and visual layout require a running app with goal data. The empty-state copy is confirmed in source but the link behaviour requires navigation testing."
---

# Phase 138: Player Journey Depth — Verification Report

**Phase Goal:** The user can compare units side by side, see what they own straight from the database, and watch goal progress on the dashboard.
**Verified:** 2026-06-18
**Status:** human_needed — all automated checks VERIFIED; 5 visual/interactive behaviors require human confirmation.
**Re-verification:** No — initial verification.

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | `getUdbUnitsByIds` exists and uses positional `$1,$2,...` placeholders — ids are never string-interpolated into the SQL | VERIFIED | `src/db/queries/unitDatabase.ts:285` builds `ids.map((_, i) => \`$${i+1}\`).join(", ")` and binds `ids` as the parameter array. The SQL string contains only `${placeholders}` (index-derived), never `${ids[i]}`. |
| 2 | `useUdbUnitsByIds` in `src/hooks/useUnitDatabase.ts` uses a sorted-array cache key and `staleTime: Infinity`; disabled when `ids.length === 0` | VERIFIED | Lines 98-108: key factory does `[...ids].sort()`, `enabled: ids.length > 0`, `staleTime: Infinity`, `gcTime: Infinity`. |
| 3 | `databaseBrowserFilters` holds a `compareIds` Set capped at 3; 4th `addToCompare` is a no-op | VERIFIED | Lines 54-60: `addToCompare` guards `if (s.compareIds.size >= 3) return s;`. Creates a new Set before mutating for Zustand reference identity. `clearFilters` does NOT reset compareIds. |
| 4 | `/unit-database/compare` route is registered and resolves to `UnitComparePage` | VERIFIED | `src/app/router.tsx`: `unitDatabaseCompareRoute` created with `path: "/unit-database/compare"`, added to `layoutRoute.addChildren`. |
| 5 | `UnitComparePage` renders 2-3 columns via ONE batched `useUdbUnitsByIds` call (no hooks-in-loop); uses shared WeaponTable; includes diff highlight and empty state | VERIFIED | `UnitComparePage.tsx:27` — single `useUdbUnitsByIds(ids)` call. `UnitCompareColumn.tsx` imports `WeaponTable` from `@/features/units/WeaponTable` and applies `bg-faction-accent/15` via `statDiffMap` prop. Empty state at line 71-83: "Select units to compare" heading + "Browse Unit Database" CTA. |
| 6 | `UdbUnitRow` has a cap-aware GitCompare toggle with `e.stopPropagation()` and a Tooltip | VERIFIED | `UdbUnitRow.tsx:1,86-169`: imports `GitCompare`, `compareDisabled = compareIds.size >= 3 && !isInCompare`, toggle click calls `e.stopPropagation()`, wrapped in `TooltipProvider/Tooltip/TooltipTrigger/TooltipContent`. |
| 7 | `UnitCompareActionBar` renders with `Compare (N)` disabled at `< 2` and is wired into `DatabaseBrowserPage` | VERIFIED | `UnitCompareActionBar.tsx:31`: `disabled={compareIds.size < 2}`. `DatabaseBrowserPage.tsx`: imports and renders `<UnitCompareActionBar />`. |
| 8 | `getOwnedCountsByUdbUnitId` is faction-agnostic (no JOIN to `udb_units`, no faction WHERE, GROUP BY `udb_unit_id`) + `useUdbOwnershipAll` with `staleTime: 0` exists | VERIFIED | `unitDatabase.ts:403-412`: SELECT from `units u` only, `WHERE u.udb_unit_id IS NOT NULL`, `GROUP BY u.udb_unit_id` — no JOIN. `useUnitDatabase.ts:197-204`: key `["udb-ownership-all"]`, `staleTime: 0`. |
| 9 | All three units mutations (create/update/delete) invalidate `["udb-ownership-all"]` (D-08 symmetry) | VERIFIED | `useUnits.ts` lines 51, 78, 100: all three onSuccess blocks include `qc.invalidateQueries({ queryKey: ["udb-ownership-all"] })`. |
| 10 | `udbUnitIdFilter` is in `collectionFilters.ts` (field + setter + clearAll reset), in `applyUnitFilters.ts` (interface + first filter clause), and read + passed into `applyUnitFilters` in `CollectionPage.tsx` (including useMemo deps) | VERIFIED | `collectionFilters.ts:14,35,46,48`: field, initial null, setter, clearAll reset. `applyUnitFilters.ts:11,18`: `UnitFiltersInput` + `if (filters.udbUnitIdFilter && unit.udb_unit_id !== filters.udbUnitIdFilter) return false`. `CollectionPage.tsx:50,75,80,82`: selector, `hasActiveFilters` check, filters object, useMemo deps. |
| 11 | Owned badge on `UdbUnitRow` deep-links to `/collection` with `setUdbUnitIdFilter` and `e.stopPropagation()`; same on `UdbDatasheetSheet` header; `UdbSearchResults` shows owned badges from `ownershipAllMap` prop | VERIFIED | `UdbUnitRow.tsx:118-123`: `Link to="/collection"`, `e.stopPropagation()`, `setUdbUnitIdFilter(unit.id)`. `UdbDatasheetSheet.tsx:2,45,123-131`: imports Link + useCollectionFilters, Link-wrapped badge. `UdbSearchResults.tsx:11,46-47`: `ownershipAllMap` prop, per-result lookup. `DatabaseBrowserPage.tsx:102-107,257`: `useUdbOwnershipAll`, `ownershipAllMap` useMemo, passed to UdbSearchResults. |
| 12 | `GoalProgressCard` reuses `useGoals` + `useGoalProgress` (no new query); renders progress bars with `bg-faction-accent` (active) / `bg-battle-gold` (completed); empty state "No active goals." with Link to `/goals`; wired into `DashboardPage` left column under "Hobby Goals" header | VERIFIED | `GoalProgressCard.tsx:17-18`: `useGoals()` + `useGoalProgress()`. Lines 51-52: `fillColor` keyed to `deriveGoalStatus`. Lines 32-34: empty state copy + `Link to="/goals"`. `DashboardPage.tsx:437-443`: "Hobby Goals" section header + `<GoalProgressCard />`. |

**Score:** 12/12 truths verified

---

### Code Review Confirmations

| Fix | Status | Evidence |
|-----|--------|----------|
| CR-01: `resolveWorstStatus` unknown-segment guard | VERIFIED | `UdbUnitRow.tsx:42`: `if (idx !== -1 && idx < worstIndex)` — unrecognized statuses skipped, not treated as "worst". |
| CR-02: `udbUnitIdFilter` added to `hasActiveFilters` | VERIFIED | `CollectionPage.tsx:75`: `udbUnitIdFilter !== null` included in the `hasActiveFilters` boolean expression. |

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/db/queries/unitDatabase.ts` | `getUdbUnitsByIds` batch query (positional params) + `getOwnedCountsByUdbUnitId` faction-agnostic | VERIFIED | Both functions present, both substantive, positional params confirmed |
| `src/hooks/useUnitDatabase.ts` | `useUdbUnitsByIds` (staleTime Infinity, sorted key) + `useUdbOwnershipAll` (staleTime 0) | VERIFIED | Both hooks present and substantive |
| `src/features/unit-database/databaseBrowserFilters.ts` | `compareIds` Set + addToCompare/removeFromCompare/clearCompare; cap-3 guard | VERIFIED | All four fields and actions present; cap guard confirmed |
| `src/app/router.tsx` | `/unit-database/compare` route in layoutRoute children | VERIFIED | `unitDatabaseCompareRoute` wired in |
| `src/features/unit-database/UnitComparePage.tsx` | Full impl; single `useUdbUnitsByIds` call; empty state; diff map | VERIFIED | 113 lines; single batched call; all branches present |
| `src/features/unit-database/UnitCompareColumn.tsx` | `WeaponTable` reused; `bg-faction-accent/15`; no hooks | VERIFIED | 220 lines; WeaponTable used; diff highlight on stats, weapons, abilities, keywords, points; zero hook calls |
| `src/features/unit-database/UnitCompareActionBar.tsx` | "Compare (N)" disabled at < 2; returns null when empty | VERIFIED | Present; `disabled={compareIds.size < 2}`; `return null` when `size === 0` (intentional guard) |
| `src/features/unit-database/UdbUnitRow.tsx` | GitCompare toggle; cap-aware; Tooltip; e.stopPropagation; Link badge | VERIFIED | All elements present |
| `src/features/unit-database/DatabaseBrowserPage.tsx` | `UnitCompareActionBar` rendered; `useUdbOwnershipAll` + `ownershipAllMap` to UdbSearchResults | VERIFIED | Both wired |
| `src/features/units/collectionFilters.ts` | `udbUnitIdFilter` + `setUdbUnitIdFilter` + clearAll reset | VERIFIED | All three |
| `src/features/units/applyUnitFilters.ts` | `udbUnitIdFilter` in interface + first filter clause | VERIFIED | Both present |
| `src/features/units/CollectionPage.tsx` | Reads `udbUnitIdFilter` from store; passes to `applyUnitFilters`; in useMemo deps | VERIFIED | All three wiring points confirmed |
| `src/features/unit-database/UdbDatasheetSheet.tsx` | Link-wrapped owned badge; `setUdbUnitIdFilter` | VERIFIED | Present |
| `src/features/unit-database/UdbSearchResults.tsx` | `ownershipAllMap` prop; per-result badge | VERIFIED | Present |
| `src/hooks/useUnits.ts` | `["udb-ownership-all"]` invalidation in all 3 mutations | VERIFIED | Confirmed at lines 51, 78, 100 |
| `src/features/dashboard/GoalProgressCard.tsx` | `useGoals` + `useGoalProgress`; progress bars; empty state; Link to /goals | VERIFIED | 77 lines; all elements present |
| `src/features/dashboard/DashboardPage.tsx` | "Hobby Goals" section + `GoalProgressCard` in left column | VERIFIED | Present after "By Faction" section |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `useUnitDatabase.ts` | `unitDatabase.ts` | `useUdbUnitsByIds -> getUdbUnitsByIds` | WIRED | Import confirmed; hook calls the batch query |
| `router.tsx` | `UnitComparePage.tsx` | lazy import | WIRED | `component: UnitComparePage` (lazy loaded) |
| `UnitComparePage.tsx` | `useUnitDatabase.ts` | `useUdbUnitsByIds(ids)` single call | WIRED | Line 27; one call, not in a map |
| `UnitCompareColumn.tsx` | `WeaponTable.tsx` | `<WeaponTable ... />` per weapon group | WIRED | Import at line 9; rendered for ranged (BS) and melee (WS) groups |
| `UnitCompareActionBar.tsx` | `/unit-database/compare` | `navigate({ to: "/unit-database/compare" })` | WIRED | Line 32 |
| `UdbUnitRow.tsx` | `/collection` | `Link to="/collection"` + `setUdbUnitIdFilter` | WIRED | Lines 118-122 |
| `CollectionPage.tsx` | `applyUnitFilters.ts` | `udbUnitIdFilter` passed in filters object | WIRED | Line 80; also in useMemo deps at line 82 |
| `UdbSearchResults.tsx` | `DatabaseBrowserPage.tsx` | `ownershipAllMap` prop | WIRED | Prop defined in component; passed at DatabaseBrowserPage line 257 |
| `useUnits.ts` | `useUnitDatabase.ts` | `invalidate ["udb-ownership-all"]` | WIRED | All 3 mutation onSuccess blocks confirmed |
| `GoalProgressCard.tsx` | `useGoals.ts` | `useGoals()` + `useGoalProgress()` | WIRED | Lines 17-18 |
| `DashboardPage.tsx` | `GoalProgressCard.tsx` | import + `<GoalProgressCard />` | WIRED | Line 25 (import), line 442 (render) |
| `GoalProgressCard.tsx` | `/goals` | empty-state `Link to="/goals"` | WIRED | Line 33 |

---

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `UnitComparePage.tsx` | `units` (from `useUdbUnitsByIds`) | `getUdbUnitsByIds` -> `SELECT FROM udb_units WHERE id IN (...)` | Yes — live DB query; positional params bound | FLOWING |
| `GoalProgressCard.tsx` | `goals` / `progressMap` | `useGoals` -> `getGoals`; `useGoalProgress` -> `getGoalProgress` (existing verified hooks) | Yes — existing queries over `hobby_goals` + `painting_sessions` | FLOWING |
| `UdbSearchResults.tsx` | `ownershipAllMap` | `useUdbOwnershipAll` -> `getOwnedCountsByUdbUnitId` -> `SELECT COUNT(*) ... FROM units GROUP BY udb_unit_id` | Yes — live aggregate over user's collection | FLOWING |
| `CollectionPage.tsx` | `udbUnitIdFilter` -> `preFilteredUnits` | `useCollectionFilters` Zustand store -> `applyUnitFilters` clause | Yes — filters live collection data; initial `null` is a no-op | FLOWING |

---

### Behavioral Spot-Checks

Step 7b: SKIPPED for UI components (no runnable entry point without the full Tauri desktop app). The test suite (2877 passed, 0 failures per prompt context) covers the component and query behaviors programmatically.

---

### Probe Execution

Step 7c: No probe scripts declared for this phase (`scripts/*/tests/probe-*.sh` not referenced in any plan or summary). SKIPPED.

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| PLAY-01 | 138-01, 138-02 | Side-by-side unit comparison (2-3 units) with shared WeaponTable and diff highlight | SATISFIED | Batch query, compare store (cap-3), compare route, UnitComparePage, UnitCompareColumn, action bar, row toggle — all verified |
| PLAY-04 | 138-03 | Collection ↔ UDB bidirectional loop; owned badges; deep-link to Collection | SATISFIED | Owned badges link to filtered Collection; faction-agnostic ownership for search; invalidation symmetry — all verified |
| PLAY-05 | 138-04 | Goal progress on dashboard with progress visualization | SATISFIED | GoalProgressCard with per-goal progress bars reusing existing hooks; wired in DashboardPage |

No orphaned requirements (REQUIREMENTS.md marks PLAY-01, PLAY-04, PLAY-05 as Phase 138 / Complete).

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `UnitCompareActionBar.tsx` | 15 | `return null` | Info | Intentional conditional — action bar is invisible when no units selected; not a stub |

No `TBD`, `FIXME`, or `XXX` markers found in any phase-138-modified files. No unreferenced debt markers. No empty implementations or hardcoded placeholder data in production paths.

---

### Human Verification Required

#### 1. Side-by-Side Column Layout and Diff Highlight

**Test:** Open the Unit Database, select 2 units (e.g. Tactical Squad + Intercessors) via the GitCompare icon on their rows. Click "Compare (2)" in the sticky action bar. Observe the compare page.
**Expected:** Two columns render side by side, each with Stats, Weapons, Abilities, Keywords, and Points sections. Stat cells that differ between the two units have a visible faint background highlight (faction accent color at 15% opacity). Identical stat values have no highlight. Each column shows a WeaponTable for its weapons.
**Why human:** Visual rendering of CSS utility classes (`bg-faction-accent/15`) and grid layout (CSS `repeat(N, minmax(280px, 1fr))`) cannot be verified structurally. Class names are confirmed in source but pixel-level rendering requires a browser.

#### 2. Cap Enforcement at 3 — Affordance Verification

**Test:** Select 3 units via the GitCompare toggle. Attempt to click the toggle on a 4th unit row.
**Expected:** The 4th toggle appears greyed out (`opacity-50`, `cursor-not-allowed`). The tooltip reads "Add {name} to comparison" but the button is disabled. The "Compare (3)" button in the action bar remains enabled; clicking it navigates to the compare page.
**Why human:** Disabled-button rendering and cursor style require interactive browser verification.

#### 3. Owned Badge Deep-Link into Filtered Collection

**Test:** In the Unit Database, find a row where you own units (badge reads "Owned xN"). Click the badge.
**Expected:** The app navigates to `/collection`. The Collection page is pre-filtered to show only units linked to that UDB unit (other collection entries are hidden). The filter persists until the user clears it.
**Why human:** The Zustand filter (`udbUnitIdFilter`) is confirmed wired into `applyUnitFilters` and the `CollectionPage` call site, but the resulting visual narrowing of the collection list requires a running app with real data.

#### 4. Cross-Faction Search Owned Badges

**Test:** Use the Unit Database global search to search for a unit name that you own (e.g. search a unit name that appears across factions). Verify the results panel.
**Expected:** Search results for units you own show an "Owned xN" badge. Units you do not own show no badge. Clicking a badge in search results navigates to the filtered Collection.
**Why human:** Requires live data in both databases (rules.db for unit search, hobbyforge.db for owned counts).

#### 5. Dashboard Goal Progress Widget

**Test:** Open the Dashboard. Observe the left column below "By Faction". If you have active goals, verify each shows a name, a "count / target" label, a period label, and a coloured progress bar. If no goals, verify the empty state.
**Expected:** "Hobby Goals" section header is visible. Active goals show individual progress bars (faction-accent colour for active, gold for completed). The empty state shows "No active goals." and a "Set a hobby goal ->" link navigating to /goals.
**Why human:** Progress bar fill percentage and colour rendering require a running app with goal + session data.

---

### Gaps Summary

No automated-verification gaps found. All 12 must-haves are VERIFIED in the codebase. The 5 human verification items are visual and interactive behaviors that structurally pass all code-level checks (existence, substantive implementation, wiring, data flow) but cannot be confirmed without a running Tauri desktop app and real database content.

---

_Verified: 2026-06-18_
_Verifier: Claude (gsd-verifier)_
