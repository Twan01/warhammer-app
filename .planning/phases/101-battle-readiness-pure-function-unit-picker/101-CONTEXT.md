# Phase 101: Battle-Readiness Pure Function & Unit Picker - Context

**Gathered:** 2026-05-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can see which units are painting-complete and assembly-ready when adding units to an army list, and can filter the picker to only show units that fit within the remaining points budget. This phase establishes a single canonical readiness definition as a pure function, then upgrades UnitPickerDialog to surface readiness and affordability information.

</domain>

<decisions>
## Implementation Decisions

### Readiness Definition (BRP-01)
- **D-01:** `computeUnitReadiness()` lives in `src/lib/readiness.ts` as a pure function that takes a Unit (or the 4 status fields) and returns a structured result: `{ assembled: boolean, painted: boolean, based: boolean, varnished: boolean, battleReady: boolean }`.
- **D-02:** `battleReady` = `status_painting === 'Completed' && status_assembly === 1 && status_basing === 1 && status_varnished === 1`. This is the canonical definition — no other surface should compute readiness independently.
- **D-03:** The function is pure and takes no DB dependency — it receives unit data already fetched by the caller. This ensures no extra DB queries per row in the picker (success criterion #2).

### Badge Presentation (BRP-02)
- **D-04:** Each unit row in UnitPickerDialog shows a compact readiness indicator: painting status text as a `Badge` (reusing existing variant="secondary" pattern) plus up to 3 small colored dots/icons for assembly, basing, varnish states. Green dot = done, muted/gray = not done.
- **D-05:** If all 4 readiness checks pass (battleReady = true), show a single "Battle Ready" badge in a success/green variant instead of the individual indicators. This gives a clear at-a-glance signal.
- **D-06:** Readiness badges do NOT require additional DB queries — they use the unit fields already loaded by `useUnits()` (which returns all unit columns including status_assembly, status_basing, status_varnished, status_painting).

### Points-Remaining Display (BRP-03)
- **D-07:** The picker header shows remaining budget: `"{remaining} pts remaining"` where `remaining = list total points budget - sum of current unit effective_points in the list`. The list's total points and current sum must be passed as props to UnitPickerDialog.
- **D-08:** Each unit row in the picker shows the unit's `effective_points` (from the existing EnrichedUnit COALESCE chain) next to the readiness badge, so the user can see how many points each unit costs.
- **D-09:** UnitPickerDialog must switch from `useUnits()` (which returns basic Unit[]) to `useUnitsWithPoints()` or equivalent that returns EnrichedUnit[] with effective_points resolved — otherwise points display requires a separate query per row.

### Affordability Filter (BRP-03)
- **D-10:** A toggle switch in the picker header (next to the budget display) labeled "Fits budget" — when ON, hides units whose `effective_points > remaining budget`. Default: OFF (show all units).
- **D-11:** When no budget context is available (e.g., list has no points target or the caller doesn't pass budget info), the toggle and budget display are hidden. The picker degrades gracefully to its current behavior.

### Claude's Discretion
- Whether to use `useUnitsWithPoints()` (existing hook returning EnrichedUnit[]) or compute effective_points in-memory — optimize for reusing existing query patterns
- Visual styling of readiness dots (Lucide icons vs CSS dots vs small SVG circles) — follow what looks best with the existing Command palette aesthetic
- Whether the "Battle Ready" badge uses the existing StatusBadge component or a simple Badge with custom color class
- Test strategy for `computeUnitReadiness()` — recommend unit tests covering all 16 boolean combinations of the 4 readiness fields

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & Roadmap
- `.planning/REQUIREMENTS.md` — BRP-01 through BRP-03 requirement definitions
- `.planning/ROADMAP.md` §Phase 101 — Success criteria (3 acceptance checks)

### Prior Phase Context
- `.planning/phases/100-query-layer-automation/100-CONTEXT.md` — Phase 100 decisions: override columns (D-01..D-03), syncDerivedStatuses extensions, SECTION_TYPES vocabulary

### Key Source Files
- `src/features/army-lists/UnitPickerDialog.tsx` — Current picker implementation (cmdk Command palette, accepts factionId filter, stays open for multi-add)
- `src/types/unit.ts` — Unit interface with status_assembly, status_basing, status_varnished (0|1 booleans), status_painting (PaintingStatus), EnrichedUnit with effective_points
- `src/hooks/useUnits.ts` — useUnits() hook returning Unit[]; check for useUnitsWithPoints() variant
- `src/hooks/useArmyLists.ts` — useAddUnitToList, army list data hooks
- `src/hooks/useArmyReadiness.ts` — useArmyReadiness() for per-faction readiness (different scope but related pattern)
- `src/db/queries/dashboard.ts` — getArmyReadinessByFaction() uses `status_painting = 'Completed'` as the battle-ready canonical check (pre-Phase 100 definition)
- `src/db/queries/armyLists.ts` — getArmyListWithUnits() returns ArmyListUnitRow[] with effective_points via COALESCE chain
- `src/features/army-lists/ArmyListSummaryBar.tsx` — Existing points display pattern in army list detail view
- `src/features/army-lists/ArmyListDetailSheet.tsx` — Opens UnitPickerDialog; must pass budget context

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `UnitPickerDialog` in `army-lists/UnitPickerDialog.tsx` — cmdk-based picker, already wired with Command/CommandInput/CommandList pattern; extend with readiness badges and filter toggle
- `Badge` component from shadcn/ui — already used for unit category display in the picker
- `ArmyListSummaryBar` — shows total points for a list; pattern for points display
- `useUnits()` hook — returns all unit columns; `EnrichedUnit` interface adds effective_points
- `getArmyReadinessByFaction()` — existing readiness query for dashboard; documents the `status_painting = 'Completed'` canonical check

### Established Patterns
- Boolean statuses as `0 | 1` integers — status_assembly, status_basing, status_varnished
- COALESCE chain for effective_points: `COALESCE(alu.points_override, tier.points, sup.points, uo.points, u.points, 0)`
- Pure functions in `src/lib/` — computeStats.ts pattern for dashboard stats, same placement for computeUnitReadiness()
- Command palette stays open after selection for multi-add UX
- `variant="secondary"` Badge for metadata display in picker rows

### Integration Points
- `UnitPickerDialog` props — add optional budget-related props (currentListPoints, maxPoints or remaining)
- `ArmyListDetailSheet` / `ArmyListDetailPage` — callers of UnitPickerDialog; must compute and pass budget context
- `useUnits()` or `useUnitsWithPoints()` — picker needs effective_points per unit for budget filtering

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches. All behavior is defined by the success criteria and decisions above.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 101-Battle-Readiness Pure Function & Unit Picker*
*Context gathered: 2026-05-28*
