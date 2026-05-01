# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

---

## Milestone: v1.1 — HobbyForge MVP

**Shipped:** 2026-05-01
**Phases:** 5 | **Plans:** 20 | **Timeline:** 2 days (2026-04-30 → 2026-05-01)

### What Was Built

- Tauri 2 + React 19 desktop app scaffold: dark-mode sidebar, SQLite plumbing, TanStack Router/Query, all shadcn components batch-installed in Phase 1
- Full 10-table SQLite schema with FK enforcement, typed query → hook → UI stack for factions/units/paints, seed data with idempotent `INSERT OR IGNORE`
- Collection page: TanStack Table + Zustand filter store + optimistic status updates with cache rollback + 28 passing unit tests
- Painting Projects Kanban with @dnd-kit drag-and-drop (optimistic mutations + rollback) + recipe builder with sortable steps and inline paint creation
- Live dashboard: 7 stat cards, per-faction summaries, active projects + recently updated lists, 113 passing tests

### What Worked

- **DATA-09 forward-compat investment:** Invalidating `["dashboard-stats"]` in Phase 2 unit mutations meant zero wiring work when Phase 5 arrived. The cache key just worked.
- **TDD Wave 0 pattern:** Writing pure functions (computeStats, formatRelativeTime, kanbanUtils) with tests before building UI caught formula and edge-case bugs before they could become UI defects.
- **selectedUnitId pattern:** Storing ID + deriving unit from cache instead of storing the unit object directly prevented stale-data bugs after optimistic cache mutations. Clean pattern with no gotchas.
- **Sibling Sheet/Dialog portal mounting:** Putting UnitSheet, UnitDetailSheet, and UnitDeleteDialog as siblings at the page level (not nested) eliminated all Radix portal z-index and context issues. Consistent across all 3 pages.
- **shadcn batch install in Phase 1:** Installing all 19 components upfront eliminated Radix version drift risk that would have caused subtle incompatibilities if components were installed incrementally.

### What Was Inefficient

- **UI-SPEC checker revision loop (Phase 5):** The gsd-ui-checker ran 3 BLOCK cycles on the Dashboard UI-SPEC before passing — identifying progressively smaller typography/spacing issues (font weights, `text-xs` occurrences, gap values). Direct edit on the 3rd cycle was faster than spawning another researcher agent.
- **PROJ-02 empty-column deviation:** The executor changed KanbanBoard to show all 11 columns instead of hiding empty ones (correct UX decision), but the change wasn't reflected in REQUIREMENTS.md. The inconsistency required documentation at audit time. Better to update REQUIREMENTS.md inline when a known deviation ships.
- **VALIDATION.md `nyquist_compliant` flags:** All VALIDATION.md files shipped with `nyquist_compliant: false` because the flag was never updated after execution. This is a documentation gap, not a coverage gap — 113 tests pass — but it left the Nyquist compliance section as PARTIAL in the audit.

### Patterns Established

- **Wave 0 TDD:** Pure utility functions with tests first; later waves build UI on top. Applies to any phase with computable/transformable logic.
- **selectedUnitId pattern:** All pages that open a detail Sheet store the ID, not the entity. Derive the entity via `useMemo` from the query cache. This prevents stale data after any optimistic mutation.
- **Sibling portal pattern:** Sheet + Dialog components that could be open at the same time are always mounted as siblings at the page-container level, never nested inside each other.
- **FK error toast pattern:** `catch` block checks `err.message.toLowerCase().includes('foreign key')` and fires a domain-specific `toast.error(...)`. Consistent across FactionDeleteDialog, PaintDeleteDialog.
- **0|1 boolean discipline:** All SQLite boolean columns typed as `0 | 1` in TypeScript, not `boolean`. Coerce at form boundaries only (`value ? 1 : 0` write, `!!value` read).

### Key Lessons

1. **Pre-wire cache invalidation for future consumers.** DATA-09 in Phase 2 (useUnits mutations invalidate `["dashboard-stats"]`) meant Phase 5 required zero wiring to hook into the cache. If cross-phase dependencies are identifiable early, wire them early.
2. **UI spec checker is strict about typography rules.** Max 4 font sizes, max 2 weights, spacing only from the declared set. Don't mix `text-xs` with `text-sm` in different sections of the spec — the checker finds them all.
3. **Kanban all-columns-visible is better UX.** Hiding empty columns makes drag-and-drop targets disappear. When building board-style UIs, show all columns even when empty.
4. **Pure functions + tests before UI = fast feedback.** If a computation is non-trivial (percentages, sorting, filtering), extract it as a pure function and write tests. UI bugs are harder to diagnose; formula bugs are easy to fix in a test.

### Cost Observations

- Model: Claude Sonnet 4.6 throughout
- Sessions: 1 (compressed) + continuation
- Notable: 5 phases in 2 calendar days — Wave 0 TDD + parallel subagent execution were the main velocity drivers

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Phases | Plans | Key Change |
|-----------|--------|-------|------------|
| v1.1 | 5 | 20 | First milestone — baseline established |

### Cumulative Quality

| Milestone | Tests | Status |
|-----------|-------|--------|
| v1.1 | 113 | All passing |

### Top Lessons (Verified Across Milestones)

1. Pre-wire cross-phase cache invalidation when dependencies are known early
2. Pure function + TDD Wave 0 dramatically reduces UI debugging time
3. Sibling portal pattern prevents Radix z-index/context issues in Sheet-heavy UIs
