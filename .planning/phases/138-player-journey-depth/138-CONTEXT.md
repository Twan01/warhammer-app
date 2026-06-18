# Phase 138: Player-Journey Depth - Context

**Gathered:** 2026-06-18
**Status:** Ready for planning

<domain>
## Phase Boundary

Add the three highest-value player-journey capabilities on top of the now-honest,
deduped code from Themes A/B and the canonical leader data from Phase 137. **All
three are UI/query-layer features with NO schema changes** — they ride existing
tables (`udb_units*`, `units.udb_unit_id`, `hobby_goals`, `painting_sessions`):

1. **PLAY-01 (genuinely new)** — Side-by-side comparison of 2–3 unit datasheets
   (stats, weapons, abilities, keywords, points) with differences highlighted.
   Reuses the **shared `WeaponTable`** deduped in Phase 136 (HON-08) and fetches
   all selected units in **one batched query** (no hooks-in-loop / N+1).

2. **PLAY-04 (MOSTLY ALREADY SHIPPED — verify + close residual gap)** — The
   Collection ⇆ Unit Database loop. The scout found this loop is **already
   bidirectional in the code**:
   - "Owned ×N" badge on UDB rows + datasheet header — **ships** (Phase 105
     COL-02/COL-04: `useUdbOwnership` → page-level `ownershipMap` → `UdbUnitRow`).
   - Collection → "View Datasheet" — **ships** (`UnitDetailSheet.tsx:124`).
   - UDB → "Add to Collection" / "Add Another to Collection" — **ships**
     (`UdbDatasheetSheet.onAddToCollection` + `DatabaseBrowserPage.handleAddToCollection`
     + `FactionLinkDialog`).
   So PLAY-04 is an **honest audit-and-close** task, not a rebuild (this is the
   "Bulletproof & Honest" milestone). See D-06/D-07 for the true remaining gap.

3. **PLAY-05 (genuinely new; derivation already verified safe)** — Surface hobby
   goal progress on the dashboard with a progress visualization. The
   open-question audit (ARCHITECTURE §Open-Questions #3) is **resolved**: the
   goal-progress derivation (`getGoalProgress` in `src/db/queries/goals.ts`)
   queries only `hobby_goals` + `painting_sessions` via `computeGoalPeriod` —
   **zero rules.db references** — so it still computes correctly post-rules.db
   elimination. No derivation rewrite needed; this is a pure surfacing task.

**Out of scope (own phases / deferred):** pipeline FK/orphan validation, the
22-faction data audit, and French-translation extension (all DAT-*, Phase 139);
the WeaponTable semantic-`<table>` a11y conversion (deferred from Phase 136);
"this leader can lead X" datasheet enrichment (deferred from Phase 137).

</domain>

<decisions>
## Implementation Decisions

> `--auto` run: every gray area below was auto-resolved with the recommended
> default, grounded in `.planning/research/ARCHITECTURE.md` §Q4 + §Q6, the
> Phase 136/137 CONTEXT decisions (shared WeaponTable, page-level Map, NULL
> `udb_unit_id` handling), and a live codebase scout. The scout produced **one
> material correction to the research**: PLAY-04's owned-count loop is already
> implemented (see D-05/D-06). Auto-decision log is in `138-DISCUSSION-LOG.md`.

### PLAY-01 — Unit comparison view

- **D-01 (surface — full-page route):** Build comparison as a **full-page route
  `/unit-database/compare`** (child of the existing `/unit-database` route), NOT
  a dialog. Rationale: 2–3 full datasheet columns (stat block + WeaponTable +
  abilities + keywords + points) need horizontal and vertical room; a route
  mirrors the Painting Mode full-route precedent and avoids a cramped modal.
  *(auto: recommended — ARCHITECTURE §Q4 offers dialog OR route "if screen real
  estate matters"; full datasheets clearly need the room.)* Planner may revisit
  if a wide dialog proves sufficient, but build for room first.
- **D-02 (batched fetch — single query, no N+1):** New query
  `getUdbUnitsByIds(ids: string[])` + hook `useUdbUnitsByIds(ids)` with
  `staleTime: Infinity` (canonical, immutable between imports). It is a **multi-id
  variant of the existing single-unit `getUdbUnitDetail` / `useUdbUnitDetail`** —
  one query returns all selected units' detail (models/weapons/abilities/keywords/
  points). **No hook inside `.map()`** (PITFALLS #8). *(auto: recommended —
  ARCHITECTURE §Q4 + the page-level-batch discipline reaffirmed in Phases 136/137.)*
- **D-03 (selection state — Zustand Set, cap 3):** Hold the compare selection as a
  small **`Set<string>` of up to 3 udb ids** in the existing
  `databaseBrowserFilters` Zustand store (ephemeral UI state, consistent with the
  "store ID, derive from cache" key decision). Surface a per-row "add to compare"
  affordance on `UdbUnitRow` + a sticky "Compare (N)" action bar that navigates to
  the route. **Hard cap at 3**; the 3rd selection disables further adds.
  *(auto: recommended — ARCHITECTURE §Q4.)*
- **D-04 (diff highlight — per-row cell highlight):** For each comparable field
  (each stat, each points tier, presence/absence of a weapon/ability/keyword),
  **highlight the cells that differ** across the selected columns using the
  existing accent token; identical rows render neutral. Keep it a binary
  "differs / matches" highlight — **no min/max "best value" coloring** (that is a
  richer feature, deferred). Weapons/abilities/keywords compare by
  presence-in-set, not deep value diff. *(auto: recommended — simplest honest
  signal that satisfies "differences highlighted".)*

### PLAY-04 — Collection ⇆ UDB loop (audit-and-close, NOT rebuild)

- **D-05 (do NOT rebuild what ships):** The owned-count badge, Collection→View
  Datasheet, and UDB→Add-to-Collection flows **already exist and work** (see
  Phase Boundary). The plan **MUST NOT re-implement them.** First task is a
  short **verification pass** confirming all three directions work end-to-end
  (owned count updates after add; "View Datasheet" resolves; "Add to Collection"
  creates a unit pre-linked via `udb_unit_id`). *(auto: recommended — "Bulletproof
  & Honest" milestone; honest scoping over busy-work.)*
- **D-06 (the real residual gap — owned badge → filtered Collection deep link):**
  ARCHITECTURE §Q4 specified "+ a link into the filtered Collection" on the owned
  badge; the scout confirmed `UdbUnitRow` renders the badge but has **no link/
  navigate**. Close this gap: make the "Owned ×N" badge (row + datasheet header)
  a **deep link into the Collection filtered to that udb unit**, completing the
  round-trip. *(auto: recommended — the one concrete affordance §Q4 promised that
  is genuinely missing.)*
- **D-07 (owned counts in cross-faction search — extend the Map source):** Owned
  counts today come from `getUdbOwnershipByFaction(factionId)`, so they only
  populate when a faction is selected in the browser. Confirm whether
  `UdbSearchResults` (cross-faction FTS search) shows owned badges; if not, extend
  the ownership Map to cover searched units (a faction-agnostic
  `getOwnedCountsByUdbUnitId()` `GROUP BY` query, or reuse the per-unit
  `getUdbOwnershipForUnit`). **Researcher confirms whether this is a real gap**
  before the plan commits scope. *(auto: recommended — closes the loop everywhere
  the user can see a unit, not just in the faction browser.)*
- **D-08 (invalidation symmetry):** Any new/extended ownership hook must
  invalidate on `units` mutations (create/update/delete/link), per the
  cache-invalidation-symmetry rule (PITFALLS #9/#14) — so "Owned ×N" never goes
  stale after an add/remove.

### PLAY-05 — Goal progress on the dashboard

- **D-09 (reuse existing derivation + hooks — no new logic):** The dashboard
  widget consumes the **existing** `useGoals()` + `useGoalProgress()`
  (`GOAL_PROGRESS_KEY`, `src/hooks/useGoals.ts`) — no new query, no derivation
  rewrite (audit resolved, D in Phase Boundary). *(auto: recommended —
  ARCHITECTURE §Q6 C4 "audit-then-fix; likely small".)*
- **D-10 (widget shape — compact active-goals card on the dashboard):** Add a
  **goal-progress card to the dashboard grid** showing each active goal with a
  progress bar (`progress_count / target_count`) and period label, reusing the
  visualization idiom from `src/features/goals/GoalCard.tsx` (a compact dashboard
  variant, not the full card). When no goals exist, show an empty state that
  **links to `GoalsPage`** ("Set a hobby goal"). *(auto: recommended — consistent
  with the existing dashboard-grid + GoalCard patterns.)*

### Claude's Discretion
- Exact TypeScript type names for the comparison row model and the
  `getUdbUnitsByIds` return shape.
- Exact component filenames for the comparison route/page and the dashboard goal
  widget (follow existing `Udb*` / dashboard naming).
- Whether the compare action bar lives in `DatabaseBrowserPage` or a small shared
  toolbar component.
- Precise visual treatment of the diff highlight (token, opacity) within D-04's
  binary-highlight rule.
- Whether D-07 reuses `getUdbOwnershipForUnit` per searched unit (only if the
  result set is small/bounded) or a single faction-agnostic GROUP BY (preferred
  if search can return many rows — avoid N+1).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Architecture & build order (primary)
- `.planning/research/ARCHITECTURE.md` §Q4 — full design for the unit comparison
  view (selection state, `UnitCompareDialog`-vs-route, batch `getUdbUnitsByIds` +
  `useUdbUnitsByIds`, WeaponTable-dedupe prerequisite) **and** the Collection ⇆ UDB
  "owned ×N" loop (page-level Map, `getOwnedCountsByUdbUnitId`, badge + filtered-
  Collection link). NOTE: §Q4's owned-loop is **largely already implemented** —
  see D-05/D-06 for the scout correction.
- `.planning/research/ARCHITECTURE.md` §Q6 — Theme-C build order C1 (comparison,
  consumes deduped WeaponTable), C3 (owned-×N loop, page-level Map, no schema
  change), C4 (dashboard goals, audit-then-fix).
- `.planning/research/ARCHITECTURE.md` §Open-Questions #3 — the dashboard-goals
  rules.db audit (resolved: derivation is rules.db-free, see Phase Boundary).
- `.planning/research/ARCHITECTURE.md` §Anti-patterns — "per-row hooks for
  owned-count → use page-level useMemo Map"; the binding rule for PLAY-01/PLAY-04.
- `.planning/research/PITFALLS.md` §#8 (hooks-in-loop / N+1), §#9/#14 (lost
  invalidation, cache-symmetry rule).

### Conventions & precedents (prior phases)
- `.planning/phases/136-code-honesty-decomposition/136-CONTEXT.md` — the shared
  **canonical `WeaponTable` is `src/features/units/WeaponTable.tsx`** (union-prop,
  `UdbWeaponsTable` deleted); PLAY-01 columns consume it. Also the page-level Map
  vs per-row-hook discipline (HON-10 D-08).
- `.planning/phases/137-canonical-leader-attachment/137-CONTEXT.md` — page-level
  `useMemo` Map idiom (D-07) and NULL `udb_unit_id` handling (D-09) — the same
  join-on-`udb_unit_id` semantics the owned-count Map depends on.
- `CLAUDE.md` §State management / §Database patterns — React Query hook shape
  (`ENTITY_KEY` + `useEntity` + mutations); components call hooks, never queries
  directly; `$1,$2` params; `staleTime` defaults.

### Target source files (confirmed by scout — file:line)
- **PLAY-01:** `src/features/units/WeaponTable.tsx` (canonical shared table to
  reuse per column); `src/db/queries/unitDatabase.ts:198` (`getUdbUnitDetail` — the
  single-unit shape to multi-id-ify); `src/hooks/useUnitDatabase.ts:73`
  (`useUdbUnitDetail` — model for `useUdbUnitsByIds`); `src/features/unit-database/
  UdbDatasheetSheet.tsx` (column content reference); `src/features/unit-database/
  databaseBrowserFilters.ts` (Zustand store for the compare Set); `src/features/
  unit-database/UdbUnitRow.tsx` (add the "add to compare" affordance); `src/app/
  router.tsx:202` (`/unit-database` route — add the `/unit-database/compare` child).
- **PLAY-04 (already shipped — verify, do not rebuild):** `src/features/
  unit-database/UdbUnitRow.tsx:70-100` (owned badge — **add the missing filtered-
  Collection link, D-06**); `src/features/unit-database/DatabaseBrowserPage.tsx:51`
  (`useUdbOwnership`), `:87-97` (ownershipMap), `:157` (`handleAddToCollection`),
  `:178` (`handleFactionLinkConfirm`); `src/features/unit-database/
  UdbDatasheetSheet.tsx:100-111` (`onAddToCollection`); `src/features/units/
  UnitDetailSheet.tsx:124` ("View Datasheet"); `src/db/queries/unitDatabase.ts:267`
  (`getUdbOwnershipForUnit`), `:292` (`getUdbOwnershipByFaction`);
  `src/hooks/useUnitDatabase.ts:135` (`useUdbOwnership`), `:150`
  (`useUdbUnitOwnership`); `src/features/unit-database/UdbSearchResults.tsx`
  (check whether owned badges appear in cross-faction search — D-07).
- **PLAY-05:** `src/db/queries/goals.ts` (`getGoalProgress` — rules.db-free
  derivation, reuse as-is); `src/hooks/useGoals.ts:16-20` (`useGoals`,
  `useGoalProgress`, `GOAL_PROGRESS_KEY`); `src/features/goals/GoalCard.tsx`
  (progress-viz idiom to adapt); `src/features/goals/GoalsPage.tsx` (empty-state
  link target); `src/features/dashboard/` (`computeStats.ts`, dashboard grid — add
  the goal widget alongside existing dashboard cards); `src/lib/computeGoalPeriod.ts`
  (period boundary helper used by the derivation).

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **Shared `WeaponTable` (`units/WeaponTable.tsx`)** — deduped in Phase 136; PLAY-01
  renders one per comparison column. The HON-08 union-prop shape was built with
  this consumer in mind.
- **Owned-count stack already complete** — `getUdbOwnershipByFaction` /
  `getUdbOwnershipForUnit` queries, `useUdbOwnership` / `useUdbUnitOwnership`
  hooks, the `DatabaseBrowserPage` page-level `ownershipMap`, and the
  `UdbUnitRow` / `UdbDatasheetSheet` "Owned ×N" badges all ship (Phase 105). PLAY-04
  extends, it does not build.
- **Add-to-Collection flow** — `UdbDatasheetSheet.onAddToCollection` +
  `DatabaseBrowserPage.handleAddToCollection` + `FactionLinkDialog` already create a
  collection unit pre-linked by `udb_unit_id`.
- **Goal progress stack** — `getGoalProgress` (queries `painting_sessions` +
  `hobby_goals` only), `useGoals` / `useGoalProgress`, and `GoalCard`'s progress
  visualization are reusable verbatim for PLAY-05; only a dashboard surface is new.
- **`useUdbUnitDetail` / `getUdbUnitDetail`** — the single-unit datasheet read to
  generalize into the batched multi-id `useUdbUnitsByIds` for PLAY-01.

### Established Patterns
- **Page-level `useMemo` Map, never per-row hooks** — the codebase's N+1-avoidance
  idiom (DatabaseBrowserPage already uses it for `ownershipMap`); PLAY-01's batch
  fetch and any PLAY-04 extension must follow it.
- **Zustand for ephemeral UI/filter state** (`databaseBrowserFilters.ts`) — the
  home for the compare-selection Set.
- **Full-page route for room-hungry views** (Painting Mode precedent) — the model
  for `/unit-database/compare`.
- **React Query hook-per-entity + invalidation symmetry** — new/extended hooks
  must invalidate on `units` mutations (PITFALLS #9/#14).

### Integration Points
- PLAY-01 ↔ Phase 136 HON-08 shared `WeaponTable` (consumes it) and the
  `/unit-database` route tree (`router.tsx`).
- PLAY-04 ↔ existing collection/UDB ownership surfaces — additive deep-link +
  optional search-coverage extension only.
- PLAY-05 ↔ existing dashboard grid + goals stack — a new card wired to existing
  hooks; no new derivation.
- **No migration this phase** → the Phase-130 parity/release gate is NOT
  re-triggered (unlike Phases 136/137). Pure frontend + query-layer work.

</code_context>

<specifics>
## Specific Ideas

- Comparison compares **by presence and by value**: stats/points diff by value;
  weapons/abilities/keywords diff by presence-in-set across columns. Binary
  "differs/matches" highlight only (no best-value coloring).
- Compare selection is hard-capped at **3 units**; the cap is enforced at the
  "add to compare" affordance, not just at render.
- The "Owned ×N" badge should become a **round-trip deep link** — UDB → filtered
  Collection — to truly close the bidirectional loop §Q4 described.
- Dashboard goal widget shows **active goals only** with a progress bar each, and
  an empty state that routes to `GoalsPage`.

</specifics>

<deferred>
## Deferred Ideas

- **Min/max "best value" coloring in the comparison view** — richer than the
  binary differs/matches highlight (D-04); a polish follow-up, not required by
  "differences highlighted".
- **WeaponTable semantic-`<table>` accessibility conversion** (CODEBASE-REVIEW
  IN-010) — carried over from Phase 136; a behavior change, future a11y pass.
- **"This leader can lead X / can be led by Y" datasheet enrichment** from the new
  `udb_leader_targets` table — noted in Phase 137 deferred; a read-only UDB
  enrichment, candidate for a later player-depth pass.
- **22-faction data audit + French translations + pipeline FK/orphan validation**
  — all Phase 139 (DAT-01/02/03), explicitly out of this phase.

None — discussion stayed within phase scope (all deferrals are pre-existing
roadmap/prior-phase boundaries, not scope creep surfaced here).

</deferred>

---

*Phase: 138-player-journey-depth*
*Context gathered: 2026-06-18*
