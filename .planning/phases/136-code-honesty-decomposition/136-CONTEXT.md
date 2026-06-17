# Phase 136: Code Honesty & Decomposition - Context

**Gathered:** 2026-06-17
**Status:** Ready for planning

<domain>
## Phase Boundary

Make the army-list and datasheet code honest about its architecture. Four
mechanical, behavior-preserving cleanups — **no new user-facing capabilities**:

1. **HON-08** — Collapse the two weapon tables (`WeaponTable` in `units/` and
   `UdbWeaponsTable` in `unit-database/`) into one shared component consumed by
   every datasheet/weapon surface, rendering identically in EN and FR.
2. **HON-09** — Decompose the 786-line `ArmyListDetailPage` into focused
   sub-components/hooks within the project's file-size conventions, with zero
   behavior change.
3. **HON-10** — Route the components that call `db/queries` functions directly
   through React Query hooks, restoring cache + invalidation guarantees, with no
   hook-in-loop or N+1 regression.
4. **HON-11** — Resolve the vestigial `promoted_to_reminder` column (remove it,
   or justify retention in the schema).

**Out of scope (own phases):** the unit-comparison view (PLAY-01, Phase 138,
consumes the deduped `WeaponTable`); canonical leader-attachment repointing
(PLAY-02/03, Phase 137). This phase only makes the code those phases build on
honest — it does not build them.

</domain>

<decisions>
## Implementation Decisions

> `--auto` run: every gray area below was auto-resolved with the recommended
> default, grounded in the existing research (`ARCHITECTURE.md` Q5/Q6,
> `PITFALLS.md` #4/#8/#9/#12/#14, `CODEBASE-REVIEW.md`). Auto-decision log is in
> `136-DISCUSSION-LOG.md`.

### HON-08 — Shared WeaponTable
- **D-01:** `src/features/units/WeaponTable.tsx` is the **canonical** component
  (keep its name/location — it is the one the requirements and PLAY-01 reference).
  Merge `UdbWeaponsTable`'s behavior into it as a **union-prop** component, then
  delete `src/features/unit-database/UdbWeaponsTable.tsx`. Do not relocate to
  `components/common` — both feature areas can import from `units/`.
  *(auto: recommended — canonical-by-reference, least churn)*
- **D-02:** Migrate consumers **one caller at a time**, verifying each renders
  identically (EN **and** FR, bilingual COALESCE preserved) before moving on.
  Known consumer surfaces to re-point: `ArmyListUnitRow`, `DatasheetPointsTab`,
  `UdbDatasheetSheet`, `UnitAbilityCard`, `PlaybookDatasheet` (researcher to
  confirm the full surface list — PITFALLS #12 flags ~7 surfaces / render-drift).
- **D-03:** Keep HON-08 a **pure mechanical dedup** — "render identically
  everywhere" is the acceptance bar. The semantic-`<table>` accessibility fix
  (CODEBASE-REVIEW **IN-010**: WeaponTable renders a div-grid, not a real table)
  is a **behavior change → deferred** (see Deferred Ideas), not folded here.
  *(auto: recommended — protects the "renders identically" guarantee)*

### HON-09 — ArmyListDetailPage decomposition
- **D-04:** Follow the extraction boundaries in `ARCHITECTURE.md` Q5 **exactly**:
  `ArmyListUnitTable.tsx` (DndContext + categorized rendering + SortableUnitRow +
  handleDragEnd), a `useArmyListExport` hook (copy/JSON/PDF handlers +
  ExportDropdown + snapshot button), `ArmyListQuickAdd.tsx`, `ArmyListPortals.tsx`
  (the sibling Sheet/Dialog portals — preserve the never-nested portal rule and
  reducer-dispatch contract), `ArmyListDetailHeader.tsx`. Orchestrator keeps the
  reducer, data hooks, and shared derived memos (`groupedUnits`/`unitsByCategory`/
  `leaderNameMap`). *(auto: recommended — research-specified seams)*
- **D-05:** Size targets: **orchestrator < ~250 lines, each child < ~200**,
  consistent with the PlaybookTab/UnitSheet decomposition precedent (PROJECT.md).
- **D-06:** **Mechanical block-moves only — extract, do not rewrite.** No logic
  changes, no opportunistic fixes. Land each extraction as a **separate,
  revertable commit** (PITFALLS #4). The dirty-branch caveat from research is
  **resolved** — Theme A is merged on master and Phase 133 already removed the
  `freshness` prop/memo, so extraction proceeds on a clean `ArmyListDetailPage`.

### HON-10 — Route hook-layer bypasses through hooks
- **D-07:** **One named React Query hook per bypass**, each with its `*_KEY`
  factory; reuse the existing entity hook where one exists, create a thin hook
  where missing. Enforce the **symmetry rule** — confirm the mutations that
  should invalidate each key actually do (PITFALLS #9/#14).
- **D-08:** **No hook inside a `.map()`/loop.** Any per-row data goes through a
  page-level `useMemo` Map (the established N+1-avoidance pattern), never a
  per-item hook (PITFALLS #8).
- **D-09:** Scope the "7" to genuine **render-path data reads**. Purely
  imperative one-shot calls inside event handlers (e.g. settings I/O in
  `DataManagementTab`, on-demand snapshot fetch in `SnapshotHistorySheet`,
  delete-cascade reads in `UnitDeleteDialog`) may legitimately stay as direct
  calls where a hook adds no caching value — the plan must justify each such
  exclusion. Researcher pins the exact 7. *(auto: recommended — cache value is
  the test, not a mechanical "wrap everything")*

### HON-11 — Vestigial `promoted_to_reminder` column
- **D-10:** **Remove it.** The column (added in migration
  `027_battle_log_after_action.sql`, `INTEGER NOT NULL DEFAULT 0`) has **zero
  read/write usage** anywhere in `src/` or `src-tauri/` — only a type field
  (`src/types/battleLog.ts:34`) and the `CreateBattleLogInput` Omit reference it.
  The "surface forgotten rules as reminders" feature was never built. Removal is
  the honest choice and aligns with the "Bulletproof & Honest" milestone.
  *(auto: recommended over "justify retention" — genuinely dead, no FK, no data
  meaning)*
- **D-11:** Remove via a **new migration** (`ALTER TABLE battle_logs DROP COLUMN
  promoted_to_reminder` — SQLite ≥3.35 / Tauri's bundled SQLite supports
  `DROP COLUMN`). **Never edit migration 027.** Also delete the field from
  `src/types/battleLog.ts` and adjust the `CreateBattleLogInput` Omit.
- **D-12:** The new migration **bumps the migration count** → this re-triggers
  the Theme-A release/parity gate: update `tests/data-layer/db-helpers.ts`,
  the `lib.rs` migration registration, and the `check-version.mjs` invariants
  **together** in one move (PITFALLS #3). Author the migration file with
  **LF line endings** to avoid the CRLF checksum-drift class that caused the
  "update breaks launch" incident.

### Claude's Discretion
- Exact filenames/prop names for extracted ArmyListDetailPage children (follow
  existing naming conventions).
- The precise union-prop shape for the merged `WeaponTable`.
- Naming of any new hooks created for HON-10 bypasses.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Architecture & build order (primary)
- `.planning/research/ARCHITECTURE.md` §Q5 — `ArmyListDetailPage` decomposition:
  exact extraction-boundary table, size targets, dirty-branch sequencing.
- `.planning/research/ARCHITECTURE.md` §Q6 + §Anti-patterns — Theme B build order
  (B3 dedupe → prereq for C1; B5 decompose after Theme A; B4 hook bypasses) and
  codebase-specific anti-patterns (mechanical-only decomposition, page-level Map
  vs per-row hooks).
- `.planning/research/PITFALLS.md` §Pitfall 4, 8, 9, 12, 14 + Phase-Specific
  Warnings table (Theme B rows) — render-drift, hooks-in-loop, lost invalidation,
  symmetry rule, separate revertable commits.

### Conventions & precedents
- `.planning/PROJECT.md` line 337 — "Components only call hooks, never query
  functions directly" (the rule HON-10 restores).
- `.planning/PROJECT.md` lines 432–433 — PlaybookTab (<300 lines) and UnitSheet
  (<200 lines) decomposition precedents that set HON-09's size targets.
- `CLAUDE.md` §Database patterns — "never edit existing migration files";
  migrations run in filename order; booleans stored `0|1`.

### Code review findings (for awareness, not scope)
- `.planning/CODEBASE-REVIEW.md` **IN-010** — WeaponTable div-grid a11y gap
  (deferred, see Deferred Ideas).
- `.planning/CODEBASE-REVIEW.md` **IN-011/IN-013/IN-014/IN-015** — army-list
  findings near the decomposition surface; do **not** fix opportunistically
  during mechanical extraction (would violate "no behavior change").

### Target source files
- `src/features/units/WeaponTable.tsx` (43 lines — canonical target, HON-08)
- `src/features/unit-database/UdbWeaponsTable.tsx` (59 lines — to delete, HON-08)
- `src/features/army-lists/ArmyListDetailPage.tsx` (786 lines — to decompose, HON-09)
- `src/types/battleLog.ts` (line 34 + CreateBattleLogInput Omit — HON-11)
- `src-tauri/migrations/027_battle_log_after_action.sql` (column origin — HON-11)
- `tests/data-layer/db-helpers.ts`, `scripts/check-version.mjs` (parity gate
  to update when the HON-11 migration lands)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`WeaponTable` (`units/`)**: keep as the single component; supersets
  `UdbWeaponsTable`'s columns/props via union props.
- **`armyListDetailReducer.ts`** (extracted v0.5.2): stays in the orchestrator;
  extracted children dispatch into it — preserve the dispatch contract.
- **Existing `use*` hooks under `src/hooks/`**: reuse for HON-10 bypasses where
  the entity already has a hook; only create new ones for genuinely unhooked reads.
- **Page-level `useMemo` Map pattern**: the established N+1-avoidance idiom; use
  it for any per-row data instead of per-item hooks.

### Established Patterns
- One hook file per entity exporting `ENTITY_KEY` + `useEntity` + mutations
  (CLAUDE.md). New HON-10 hooks must follow this shape.
- Orchestrator + focused sub-component pattern for large components
  (PlaybookTab, UnitSheet) — the template for HON-09.
- Migrations are DDL-only, filename-ordered, never edited after creation; new
  migration count must agree across `lib.rs`, `db-helpers.ts`, and check-version.

### Integration Points
- HON-08's deduped `WeaponTable` is a **gating prerequisite** for PLAY-01
  (comparison view, Phase 138) — build the union-prop shape with that consumer
  in mind, but do not build the comparison view here.
- HON-09's `ArmyListUnitTable` will later be repointed to the canonical
  leader-target FK shape (Phase 137) — extract it cleanly now; the repoint is
  a separate phase.
- HON-11's new migration touches the Theme-A release/parity gate surface.

</code_context>

<specifics>
## Specific Ideas

- Decomposition target shape is explicit in research: orchestrator < ~250 lines,
  five children < ~200 lines each, named per `ARCHITECTURE.md` Q5.
- WeaponTable dedup approach is explicit: union-prop component, one caller
  migrated at a time, EN/FR snapshot parity as the acceptance check.

</specifics>

<deferred>
## Deferred Ideas

- **WeaponTable semantic-table accessibility (CODEBASE-REVIEW IN-010)** — convert
  the div-grid to a real `<table>`/`<th scope="col">` structure. A behavior
  change, so excluded from the HON-08 mechanical dedup. Candidate for a future
  accessibility-pass phase; doing it *after* the dedup means fixing it once in
  the single shared component.
- **Army-list correctness/quality findings (IN-011 ghost-unit filter, IN-013
  duplicated readiness logic, IN-014 dead `StaleDataBanner`, IN-015 O(n²)
  snapshot pairing)** — surfaced near the decomposition surface but are behavior
  changes; do not fold into mechanical extraction. Note for a later cleanup phase.

</deferred>

---

*Phase: 136-code-honesty-decomposition*
*Context gathered: 2026-06-17*
