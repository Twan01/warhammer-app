# Phase 67: Game Day Integration - Context

**Gathered:** 2026-05-13
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase surfaces Phase 66's army list validation infrastructure into the Game Day page so the user walks into a game fully informed. It adds a pre-game readiness panel showing points freshness warnings, readiness gaps (unpainted/unbuilt units), tactical coverage warnings (missing key roles), and stale data alerts. No new computation logic — this integrates existing `computeUnitWarnings`/`computeListHealthStats` pure functions and reuses the `PointsFreshnessBadge` component. Depends on Phase 66 (army list validation) for the warning system, tactical roles, and health stats infrastructure.

</domain>

<decisions>
## Implementation Decisions

### Pre-Game Readiness Panel (GD-01)
- **D-01:** Validation warnings appear as a **pre-game summary section between the header (CP tracker) and the tabs** (Stratagems/Units/Checklist). This gives at-a-glance health status before gameplay begins, separate from in-game reference tabs. The section is always visible when Game Day loads — no tab switch required to see warnings.
- **D-02:** A new **`GameDayReadinessPanel`** component, NOT a reuse of `ArmyListSummaryBar`. The summary bar has list-management concerns (not-ready unit list, edit context) that don't belong in Game Day. The readiness panel calls `computeListHealthStats` directly and focuses on actionable pre-game information: points status, readiness %, freshness, warning count, and role coverage gaps.
- **D-03:** The readiness panel shows **aggregate warnings with a collapsible detail section**. Top-level: total warning count (hard + soft split), with a toggleable section listing affected units and their specific warnings. Game Day is for quick reference — detail is available but not forced.

### Points & Freshness Display
- **D-04:** Points display follows the same `X / Y pts` format from `ArmyListSummaryBar` (red when exceeded). Reuse the `computeListHealthStats` output directly for `totalPoints`, `pointsLimit`, `pointsExceeded`.
- **D-05:** Freshness display reuses `PointsFreshnessBadge` (self-contained, queries internally). Placed in the readiness panel stats row alongside points and readiness.

### Readiness Gaps
- **D-06:** Readiness gaps show a compact list of unpainted/unbuilt units with their current painting status via `StatusBadge`. This mirrors the "Not ready" section in `ArmyListSummaryBar` but in a collapsible format.
- **D-07:** Assembly status (`status_assembly === 0`) surfaces as "Not assembled" alongside painting status — both are pre-game concerns.

### Tactical Coverage
- **D-08:** Role coverage reuses the same `TACTICAL_ROLES` / `TACTICAL_ROLES_DISPLAY` pill pattern from `ArmyListSummaryBar`. Gaps (roles with zero units) are visually distinct (dashed border per D-10 from Phase 66).
- **D-09:** Role coverage section only shows when at least one unit has a tactical role assigned (progressive disclosure — same as ArmyListSummaryBar's `hasAnyRole` check).

### Data Flow
- **D-10:** `GameDayPage` already calls `useArmyListWithUnits(listId)` which returns `ArmyListUnitRow[]` with `effective_points`, `points_override`, `status_painting`, `status_assembly`, and `tactical_role`. No new queries needed — all warning/health data derives from the existing hook result.
- **D-11:** `SyncFreshness` for the WarningContext is obtained via `useRulesSyncMeta` (same as PointsFreshnessBadge). The readiness panel needs freshness for `computeListHealthStats`.

### Claude's Discretion
- Visual layout of the readiness panel (horizontal stat row vs. grid vs. stacked cards)
- Collapsible mechanism for warning details (Collapsible from shadcn/ui vs. simple toggle)
- Whether to show a "All clear" positive state when zero warnings exist
- Icon choices for warning severity indicators
- Whether role coverage pills wrap or scroll horizontally in the panel

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Warning System (MUST READ — computation + types)
- `src/lib/computeUnitWarnings.ts` — computeUnitWarnings + computeListHealthStats pure functions, UnitWarnings/WarningContext/ListHealthStats types
- `src/types/armyList.ts` — ArmyListUnitRow type (includes effective_points, points_override, status_painting, status_assembly, tactical_role), TACTICAL_ROLES const array, TACTICAL_ROLES_DISPLAY, TacticalRole type

### Game Day Components (MUST READ — integration targets)
- `src/features/game-day/GameDayPage.tsx` — Main page hosting header + tabs; already calls useArmyListWithUnits
- `src/features/game-day/GameDayHeader.tsx` — CP tracker header; readiness panel goes below this
- `src/features/game-day/gameDayStore.ts` — Zustand persist store for Game Day state

### Army List Health Display (READ for pattern reference)
- `src/features/army-lists/ArmyListSummaryBar.tsx` — Full health panel with stats row, progress bar, freshness, warnings, role coverage. Pattern reference for GameDayReadinessPanel — similar data, different presentation.
- `src/features/army-lists/PointsFreshnessBadge.tsx` — Self-contained freshness badge; reuse directly in readiness panel

### Freshness Infrastructure (READ for context)
- `src/lib/syncFreshness.ts` — SyncFreshness type, FRESHNESS_DOT_CLASS for freshness display

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `computeListHealthStats` (src/lib/computeUnitWarnings.ts): Returns totalPoints, pointsLimit, ownershipPct, battleReadyPct, hardWarningCount, softWarningCount, pointsExceeded — all needed for readiness panel
- `computeUnitWarnings` (src/lib/computeUnitWarnings.ts): Per-unit warning classification — used for collapsible detail section
- `PointsFreshnessBadge` (src/features/army-lists/): Self-contained freshness display — embed directly
- `StatusBadge` (src/components/ui/): Painting status display — reuse for readiness gap unit list
- `TACTICAL_ROLES` / `TACTICAL_ROLES_DISPLAY` (src/types/armyList.ts): Role enum + labels — reuse for coverage pills
- `Collapsible` (shadcn/ui): For expandable warning details

### Established Patterns
- `useArmyListWithUnits` returns ArmyListUnitRow[] with all fields needed for warnings — no new query
- `useRulesSyncMeta` provides sync freshness — PointsFreshnessBadge queries this internally
- Role coverage: count per role via reduce, show pills with dashed border for gaps (ArmyListSummaryBar pattern)
- `computeListHealthStats` aggregates all health data in a single call — readiness panel calls this once

### Integration Points
- `GameDayPage.tsx`: Insert `GameDayReadinessPanel` between `GameDayHeader` and `Tabs` components
- `useArmyListWithUnits(listId)`: Already called in GameDayPage — pass result to readiness panel
- `useArmyList(listId)`: Already called — provides `points_limit` for the health stats computation

</code_context>

<specifics>
## Specific Ideas

No specific requirements beyond the roadmap success criteria. Auto-mode resolved all gray areas using established codebase patterns — new GameDayReadinessPanel component calling computeListHealthStats (like ArmyListSummaryBar), reusing PointsFreshnessBadge and TACTICAL_ROLES patterns, with collapsible per-unit warning detail for quick pre-game reference.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 67-Game Day Integration*
*Context gathered: 2026-05-13*
