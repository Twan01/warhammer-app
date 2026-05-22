# Phase 98: Performance Optimization - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-22
**Phase:** 98-performance-optimization
**Mode:** --auto (fully autonomous)
**Areas discussed:** Lazy loading strategy, Invalidation precision scope, Kanban batch query approach, Memo wrapping scope, Batch INSERT strategy

---

## Lazy Loading Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| React.lazy + Suspense in router.tsx | Standard React 19 code splitting on all 16 route pages | ✓ |
| TanStack Router lazy routes | TanStack Router's own lazy loading mechanism | |
| Manual dynamic import with state | Custom loading state management per route | |

**Auto-selected:** React.lazy + Suspense (recommended default — simplest, standard, no library-specific API needed)
**Notes:** All 16 pages currently eagerly imported in router.tsx. Shared Suspense fallback at layout level with centered spinner.

---

## Invalidation Precision Scope

| Option | Description | Selected |
|--------|-------------|----------|
| Audit and tighten existing chains | Remove only provably unnecessary cross-domain invalidations | ✓ |
| Aggressive pruning | Remove all cross-domain invalidations, use targeted setQueryData | |
| Leave as-is | Current 272 calls are working, don't risk regressions | |

**Auto-selected:** Audit and tighten (recommended default — safe, measurable improvement without regressions)
**Notes:** 272 invalidateQueries across 25 hook files. Many cross-domain invalidations are actually correct (unit → dashboard-stats). Researcher to map actual data dependencies.

---

## Kanban Batch Query Approach

| Option | Description | Selected |
|--------|-------------|----------|
| Single batched SQL with GROUP BY | One query joining assignments + steps + progress for all unit IDs | ✓ |
| IN-clause per table + JS merge | Separate batched queries per table, merge in JS | |
| Keep O(N) with Promise.all | Current approach with parallel per-unit queries | |

**Auto-selected:** Single batched SQL (recommended default — fewest round-trips, leverages new DB indexes from Phase 96)
**Notes:** Existing recipe name and photo count fetches already batched. Only the applied recipe progress loop (lines 37-56 in useKanbanEnrichment.ts) needs work.

---

## Memo Wrapping Scope

| Option | Description | Selected |
|--------|-------------|----------|
| Exactly 3 named components | KanbanCard, ArmyListUnitRow, CurrentFocusCard per requirements | ✓ |
| Broad memo on all list items | Wrap every component rendered in a map/list | |
| Profile-driven selection | Use React DevTools profiler to identify worst offenders first | |

**Auto-selected:** Exactly 3 named components (recommended default — matches requirements, avoids over-memoization)
**Notes:** Zero React.memo usage currently in the codebase. Starting with the 3 requirement-specified components.

---

## Batch INSERT Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Multi-row VALUES in JS queries | Convert for-of-await loops to multi-row INSERT VALUES | ✓ |
| Rust-side batch command | New Tauri command for JS-initiated batch inserts | |
| Keep JS loops, wrap in transaction | BEGIN/COMMIT around existing loops for fewer fsync | |

**Auto-selected:** Multi-row VALUES in JS queries (recommended default — simplest change, no Rust work needed)
**Notes:** Rust bulk_sync_rules already handles rules.db. This targets JS-side query files like recipes.ts section/step insertion.

---

## Claude's Discretion

- Loading spinner design and placement
- displayName on memo'd components
- Exact SQL for batched Kanban enrichment
- Additional memo candidates beyond the required 3

## Deferred Ideas

None — discussion stayed within phase scope
