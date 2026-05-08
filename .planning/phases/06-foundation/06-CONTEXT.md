# Phase 6: Foundation - Context

**Gathered:** 2026-05-01
**Status:** Ready for planning

<domain>
## Phase Boundary

Pure back-end foundation for v0.1.1 — no UI ships. Deliverables: migration 002 (`ALTER TABLE` only), TypeScript types for all three v0.1.1 features, query modules `armyLists.ts` and `strategyNotes.ts`, new hooks `useArmyLists.ts` and `useStrategyNote.ts`, and a cross-invalidation patch to `usePaints.ts`. Phase ends when all query functions return typed results against the live database and the app launches without error.

</domain>

<decisions>
## Implementation Decisions

### Sv (Save) stat column type
- `save` column in migration 002 is `INTEGER` — stores the raw number (e.g., `3` for a 3+ save)
- The UI (Phase 9 PlaybookTab) appends the "+" suffix at display time; it is never stored in the DB
- **The ARCHITECTURE.md draft listed `save TEXT` — that is wrong. Use `INTEGER` in the actual migration.**

### Duplicate units in army lists
- The same unit may appear multiple times in one army list — each insertion creates an independent row in `army_list_units`
- Phase 6 must NOT add a `UNIQUE` constraint on `(list_id, unit_id)` — the schema intentionally allows duplicates to support multi-model entries (e.g., 3× Intercessor squads)
- Query functions in `armyLists.ts` must allow repeated `unit_id` values for the same `list_id` without conflict

### Claude's Discretion
- Types file layout: whether to merge into `src/types/index.ts` or keep separate files per type (follow existing per-type pattern in `src/types/`)
- Hook export naming: `useCreateArmyList` vs `useArmyListCreate` (follow existing `useCreatePaint` / `useDeletePaint` naming in `usePaints.ts`)
- Whether to add a `UNIQUE INDEX` on `unit_strategy_notes.unit_id` in migration 002 — select-then-insert/update works without it and is safer for an existing schema; this is a judgment call for the planner

</decisions>

<specifics>
## Specific Ideas

No specific implementation preferences stated — open to patterns already established in the codebase (see Established Patterns below).

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope and success criteria
- `.planning/ROADMAP.md` §Phase 6 — success criteria 1–5 define exact deliverables and the acceptance bar
- `.planning/REQUIREMENTS.md` §v0.1.1 — PINV-01..06, ARMY-01..07, STRAT-01..06 define what query functions and types must support

### Schema and migration
- `src-tauri/migrations/001_core_schema.sql` — existing schema; do not modify; verify column names before writing types
- `.planning/research/ARCHITECTURE.md` §Schema Gap Analysis — lists the 8 missing columns for `unit_strategy_notes` (note: `save` column type shown as TEXT in this doc is OVERRIDDEN by the decision above — use INTEGER)
- `.planning/research/ARCHITECTURE.md` §Build Order — Phase A (schema + types) before Phase B (queries) before Phase C (hooks)

### Query and hook patterns
- `.planning/research/ARCHITECTURE.md` §Architectural Patterns — Pattern 3 (PaintWithRecipeCount join), Pattern 4 (strategy note upsert), Pattern 6 (army list points calc)
- `.planning/research/ARCHITECTURE.md` §Query Key Conventions — canonical query key shapes for all new hooks
- `.planning/research/ARCHITECTURE.md` §Cross-Feature Invalidation Summary — exactly which existing mutation `onSuccess` handlers need `['paints-with-recipes']` added

### Pitfalls
- `.planning/research/PITFALLS.md` — Pitfall 1 (SQLite boolean as 0|1), Pitfall 4 (COALESCE cannot clear NULL), and any army-list-specific pitfalls noted there

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/db/queries/paints.ts` — add `getPaintsWithRecipeCount()` here (do not create a new file); follow the `getPaints()` function signature pattern
- `src/hooks/usePaints.ts` — patch `useCreatePaint`, `useUpdatePaint`, `useDeletePaint` `onSuccess` handlers; `PAINTS_KEY` is already exported from this file; add `PAINTS_WITH_RECIPES_KEY` alongside it
- `src/types/paint.ts` — add `PaintWithRecipeCount` extending `Paint` here (matching per-type file convention)

### Established Patterns
- All query functions call `await getDb()` then `db.select<T[]>(...)` or `db.execute(...)` — see `src/db/queries/units.ts` for the full pattern including error handling
- Boolean columns in SQLite are `0|1` literal types in TypeScript interfaces, never `boolean` — enforced since Phase 2 (02-02 decision)
- Query keys are exported constants from hook files: `export const UNITS_KEY = ['units'] as const` — follow this exactly
- `useCreateX`, `useUpdateX`, `useDeleteX` naming from `usePaints.ts` and `useUnits.ts` — use same convention for army list mutations

### Integration Points
- `src-tauri/src/lib.rs` `get_migrations()` vec — add migration version 2 entry; follow the existing version 1 registration pattern
- `src/hooks/usePaints.ts` mutations (3 files) — add `PAINTS_WITH_RECIPES_KEY` invalidation to each `onSuccess`; this is the only existing file that changes behavior
- `army_list_units.unit_id` has `ON DELETE RESTRICT` — the Phase 6 query layer does not need to handle this; Phase 8 will add the pre-delete warning UI

### New Files Needed (Phase 6 scope only)
- `src-tauri/migrations/002_unit_playbook_stats.sql`
- `src/types/armyList.ts` — `ArmyList`, `ArmyListUnit`, `ArmyListWithUnits`, `CreateArmyListInput`
- `src/types/strategyNote.ts` — `StrategyNote`, `UpsertStrategyNoteInput`
- `src/db/queries/armyLists.ts` — full CRUD + unit membership functions
- `src/db/queries/strategyNotes.ts` — `getStrategyNote(unitId)`, `upsertStrategyNote(input)`
- `src/hooks/useArmyLists.ts` — TanStack Query wrappers for all army list mutations
- `src/hooks/useStrategyNote.ts` — `useStrategyNote(unitId)`, `useUpsertStrategyNote()`

</code_context>

<deferred>
## Deferred Ideas

- Army suggestion engine (SUGG-01..03) — deferred to v1.2; no implementation in Phase 6 or any v0.1.1 phase
- `/paint-inventory` route, sidebar nav entries — Phase 7
- Army list UI components — Phase 8
- `UnitDetailSheet` Tabs wrapper and `PlaybookTab` — Phase 9

</deferred>

---

*Phase: 06-foundation*
*Context gathered: 2026-05-01*
