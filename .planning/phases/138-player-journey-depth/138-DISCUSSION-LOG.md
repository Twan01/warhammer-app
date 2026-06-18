# Phase 138: Player-Journey Depth - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-18
**Phase:** 138-player-journey-depth
**Mode:** `--auto` (every area auto-resolved with the recommended default; no interactive prompts)
**Areas discussed:** Comparison surface, Comparison fetch/selection/diff, Collection⇆UDB scope, Dashboard goal widget

---

## PLAY-01 — Comparison surface (dialog vs route)

| Option | Description | Selected |
|--------|-------------|----------|
| Full-page route `/unit-database/compare` | Room for 2–3 full datasheet columns; mirrors Painting Mode full-route precedent | ✓ |
| `UnitCompareDialog` overlay | Keeps browser context but cramped for full datasheets | |

**Auto-choice:** Full-page route (D-01).
**Notes:** ARCHITECTURE §Q4 offers both and flags "route if screen real estate matters"; 3 full datasheets (stat block + WeaponTable + abilities + keywords + points) clearly need the room. Planner may revisit if a wide dialog proves sufficient.

---

## PLAY-01 — Batched fetch + selection + diff highlight

| Option | Description | Selected |
|--------|-------------|----------|
| Single `getUdbUnitsByIds` + `useUdbUnitsByIds`, Zustand Set (cap 3), per-cell binary diff highlight | One batched query (no N+1); multi-id variant of `getUdbUnitDetail`; selection in `databaseBrowserFilters`; highlight differing cells only | ✓ |
| Per-unit hook in a loop / per-row fetch | Violates PITFALLS #8 (hooks-in-loop / N+1) | |
| Min/max "best value" coloring | Richer diff than required by "differences highlighted" | (deferred) |

**Auto-choice:** Batched query + Zustand Set (cap 3) + binary per-cell highlight (D-02/D-03/D-04).
**Notes:** Grounded in ARCHITECTURE §Q4 and the page-level-Map discipline reaffirmed in Phases 136/137. Min/max coloring deferred as polish.

---

## PLAY-04 — Collection ⇆ UDB loop scope

| Option | Description | Selected |
|--------|-------------|----------|
| Audit-and-close (verify existing loop; add the missing owned-badge→filtered-Collection link; extend owned counts to search if a real gap) | Honest scoping; owned badge, View Datasheet, and Add-to-Collection already ship | ✓ |
| Rebuild the owned-count badge + add/view flows per §Q4 as if new | Would re-implement shipped Phase-105/v0.5.2 code — busy-work, violates "Honest" milestone | |

**Auto-choice:** Audit-and-close (D-05/D-06/D-07/D-08).
**Notes:** **Scout correction to research** — §Q4 wrote PLAY-04 as net-new, but the scout found the owned badge (`UdbUnitRow`, Phase 105 `useUdbOwnership`/`ownershipMap`), Collection→View Datasheet (`UnitDetailSheet.tsx:124`), and UDB→Add to Collection (`UdbDatasheetSheet.onAddToCollection` + `FactionLinkDialog`) all already ship. The genuine residual gap is the owned-badge → filtered-Collection deep link (§Q4 promised it; `UdbUnitRow` has no link), plus confirming owned badges appear in cross-faction search.

---

## PLAY-05 — Dashboard goal widget

| Option | Description | Selected |
|--------|-------------|----------|
| Compact active-goals card on the dashboard grid, reusing `useGoals`/`useGoalProgress` + `GoalCard` viz; empty state → GoalsPage | No new derivation; surfacing-only | ✓ |
| New goal-progress derivation/query for the dashboard | Unnecessary — existing derivation is rules.db-free and correct | |

**Auto-choice:** Reuse existing derivation + hooks; compact dashboard card (D-09/D-10).
**Notes:** ARCHITECTURE §Open-Questions #3 audit resolved — `getGoalProgress` (`src/db/queries/goals.ts`) queries only `hobby_goals` + `painting_sessions` via `computeGoalPeriod`; zero rules.db references. Pure surfacing task.

## Claude's Discretion

- TypeScript type names for the comparison row model and `getUdbUnitsByIds` return shape.
- Component filenames for the comparison route/page and the dashboard goal widget.
- Whether the compare action bar lives in `DatabaseBrowserPage` or a shared toolbar.
- Exact diff-highlight visual treatment within the binary-highlight rule.
- D-07 implementation: per-unit ownership reuse vs a single faction-agnostic GROUP BY (prefer GROUP BY if search returns many rows).

## Deferred Ideas

- Min/max "best value" coloring in the comparison view (polish follow-up).
- WeaponTable semantic-`<table>` a11y conversion (Phase 136 carry-over).
- "This leader can lead X" UDB datasheet enrichment from `udb_leader_targets` (Phase 137 carry-over).
- 22-faction data audit + French translations + pipeline FK/orphan validation (Phase 139, DAT-*).
