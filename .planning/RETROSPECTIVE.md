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

## Milestone: v2.0 — Utility Layer

**Shipped:** 2026-05-03
**Phases:** 4 (6–9) | **Plans:** 20 | **Timeline:** 3 days (2026-05-01 → 2026-05-03)

### What Was Built

- Phase 6 back-end foundation: migration 004 (8 `ALTER TABLE ADD COLUMN` on `unit_strategy_notes`), TypeScript types for all three v2.0 features, query modules (`armyLists.ts`, `strategyNotes.ts`), hook modules with DATA-09 forward-compat dashboard invalidation, 38 automated tests
- Phase 7 Paint Inventory: PaintsPage at `/paints` with Zustand-backed brand/type/color-family multi-select filters, running-low/wishlist preset views, color swatch, recipe-count badge with cross-page navigation (`/recipes?paintId=X`), inline owned toggle with optimistic update
- Phase 8 Army List Builder: ArmyListsPage, CRUD sheets, multi-add UnitPickerDialog, ArmyListDetailSheet with pinned summary bar (COALESCE effective_points computed in SQL), per-unit notes expandable rows, full-replacement UPDATE for NULL-clearable points_override, UnitDeleteDialog with army-list membership pre-check
- Phase 9 Unit Playbook: PlaybookTab inside shadcn Tabs with 6-field stats block (suffix display, pencil edit mode, Escape-to-cancel), abilities/keywords inputs, 8 fixed-order strategy note fields, dirty-state Save gating with sonner toasts, SQLite persistence round-tripped in live app
- 1 audit gap closed: ARMY-02 assembled-status badge absent from SQL join, TypeScript type, and render — found and fixed in one session (commit 259f3fc)

### What Worked

- **Phase 6 pure back-end foundation:** Separating migration + types + queries + hooks into their own phase (with full test coverage) before touching any UI meant Phases 7–9 had zero data-layer surprises. All three UI phases built on a verified foundation.
- **COALESCE in SQL (never JS):** Computing `effective_points = COALESCE(alu.points_override, u.points, 0)` in `getArmyListWithUnits` SQL meant `ArmyListSummaryBar` could just sum a flat array — no conditional logic, no unit-level JS math. One canonical computation point.
- **Sibling portal pattern held at scale:** Phase 8 had the most complex portal geometry (List Sheet + Delete Dialog + Unit Picker Dialog, all potentially open), and the established sibling pattern handled it perfectly. Zero z-index or context issues.
- **Wave 0 TDD on pure functions:** `applyPaintFilters` (Phase 7) and `getArmyListsByUnitId` pre-check (Phase 8) both had pure-function tests before any UI existed. The Phase 8 smoke test passed 14/14 steps on the first run — no regressions.
- **Nyquist VALIDATION.md retrofit:** Retroactively auditing all v2.0 phases for Nyquist compliance surfaced the ARMY-02 gap that the audit later confirmed. Validation docs are load-bearing.

### What Was Inefficient

- **VALIDATION.md compliance flags not set during execution:** As with v1.1, all four VALIDATION.md files were created with `nyquist_compliant: false` (or draft status) during phase execution and had to be retrofitted after the milestone. The fix is to update the flag inline when the last test passes, not in a retrospective batch.
- **Progress table formatting drift:** ROADMAP.md Phase 8 and 9 rows had misaligned column counts (the milestone column was missing). Caught and fixed at archive time. Progress tables should be spot-checked when plans complete.
- **ARMY-02 gap missed until audit:** The `status_assembly` column was in the schema and the `ArmyListUnitRow` type (after fix), but the SQL join never selected it. The gap was missed because the smoke test doesn't assert on every column — it asserts on behaviors. Automated tests for the SQL join (checking selected columns) would have caught this inline.

### Patterns Established

- **Back-end foundation phase pattern:** When adding multiple new features that share a data layer, isolate the schema + types + queries + hooks into a Wave-0 phase. UI phases then build on a verified foundation. Applied in v2.0 Phase 6; worth repeating for future feature clusters.
- **Full-replacement UPDATE for nullable overrides:** When a field must be clearable to NULL (not just set), use a `SET field=$2` pattern, not `COALESCE($2, field)`. Document as a pitfall in the plan. Confirmed via smoke test.
- **Cross-page navigation via router validateSearch:** `/recipes?paintId=X` pattern (Phase 7) is the canonical cross-page filter navigation — clean URL params, typed by TanStack Router's `validateSearch`, consumed by the target page's `useSearch`.

### Key Lessons

1. **SQL join gaps are audit-only if not tested.** ARMY-02 (`status_assembly` not in SELECT) was caught by the integration checker, not by unit tests. A test that asserts on the shape of `getArmyListWithUnits` rows would have caught it inline. For SQL queries with important multi-column joins, add a shape assertion test.
2. **Set `nyquist_compliant: true` when the last test goes green, not at audit time.** Retrofitting compliance flags is extra work; the flag is most useful as a real-time signal during execution, not a post-hoc label.
3. **Pure foundation phases pay for themselves in UI phases.** Phase 6 took 3 days of work but Phases 7–9 had zero data-layer debugging time. The investment is front-loaded but the return is reliable.

### Cost Observations

- Model: Claude Sonnet 4.6 throughout
- Sessions: 2 (context compression mid-milestone)
- Notable: 4 phases in 3 calendar days — Wave 0 TDD + parallel execution of Phases 7/8/9 (all depend on Phase 6 only) were the main velocity drivers

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Phases | Plans | Key Change |
|-----------|--------|-------|------------|
| v1.1 | 5 | 20 | First milestone — baseline established |
| v2.0 | 4 | 20 | Back-end foundation phase pattern; Nyquist VALIDATION.md retrofit introduced |

### Cumulative Quality

| Milestone | Tests | Status |
|-----------|-------|--------|
| v1.1 | 113 | All passing |
| v2.0 | 212 | All passing (isolated; FactionSummaryCard ordering issue pre-existing) |

### Top Lessons (Verified Across Milestones)

1. Pre-wire cross-phase cache invalidation when dependencies are known early (v1.1 DATA-09 → v2.0 dashboard-stats forward-compat)
2. Pure function + TDD Wave 0 dramatically reduces UI debugging time
3. Sibling portal pattern prevents Radix z-index/context issues in Sheet-heavy UIs
4. SQL join shape tests catch column-omission gaps that smoke tests miss (learned from ARMY-02)
5. Foundation phases with full test coverage before UI work pay for themselves in zero data-layer debugging time
