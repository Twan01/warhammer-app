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

## Milestone: v2.1 — Visual Command

**Shipped:** 2026-05-04
**Phases:** 8 (10–16 + 20) | **Plans:** 41 | **Timeline:** 2 days (2026-05-03 → 2026-05-04)

### What Was Built

- Phase 10: CSS `@theme` faction-accent system, `ActiveFactionContext`, collapsible sidebar with `useSidebarCollapsed` + Radix Tooltip labels + localStorage persistence
- Phase 11: `useCountUp` rAF cubic ease-out animation hook (600ms, prefers-reduced-motion gate), 4 hero `StatCard animate={true}`, `FactionSummaryCard` `ring-faction-accent` ring on active faction
- Phase 12: `PaintingRing` SVG (96px, stroke-dashoffset), `UnitGallery` card grid, `useCollectionViewMode` localStorage toggle — Zustand filters preserved across view switch
- Phase 13: `painting_sessions` table (migration 005), `tauri-plugin-fs/dialog`, `JournalTab` with session log + 3-col photo timeline, lightbox sibling Dialog in both CollectionPage and DashboardPage, JOUR-06 5-step disk cleanup on unit delete
- Phase 14: integer-pence discipline, `formatCurrency` as sole /100 site, `SpendingPage` with per-faction breakdown, 6 unit/paint mutations cross-invalidate `["spending-stats"]`
- Phase 15: dual-DB architecture (hobbyforge.db + rules.db), `bulk_sync_rules` Rust command, `useRulesSync` 7-CSV parallel fetch → transactional bulk insert, `DatasheetPicker`, `DatasheetImportDialog` per-field Keep/Use, full PlaybookTab (DS-01..12) — 7 plans across 4 waves
- Phase 16: Geist Variable font (@fontsource-variable), text-3xl page headers + `pb-6 border-b border-border/40`, sidebar wordmark + 3 nav groups, icon-pill empty states across all 7 pages, tabular-nums on all numerics, shadow-sm/hover:shadow-md card elevation, DashboardEmptyState welcome screen
- Phase 20 (gap closure): DS-08 DashboardPage conflict dialog wired, FactionsEmptyState Shield icon-pill, PaintingProjectsPage controlled-props CTA, upsertSyncMeta dead export removed

### What Worked

- **Dual-DB architecture isolation:** rules.db stays physically separate and migration versioning is independent of hobbyforge.db. No schema conflicts across 15 migrations total. Clean pattern that could extend to additional specialized DBs.
- **Wave 0 stubs for complex phases (Phase 15):** Writing 19 `it.skip` stubs before implementing a 7-plan phase gave a concrete execution map and caught Pitfall 3 (tolerating empty rules.db before first sync) before any UI existed.
- **Sibling portal pattern at scale:** Phase 15 added `DatasheetImportDialog` as a sibling of the lightbox Dialog which is already a sibling of `UnitDetailSheet`. Nested portals never tempted — the established pattern handled triple-portal geometry cleanly.
- **Nyquist VALIDATION.md inline (first time):** Unlike v1.1/v2.0, most VALIDATION.md files were created with `nyquist_compliant: true` during execution rather than retrofitted at audit time. Phase 20 generated the remaining 2 test files in a single nyquist audit session — zero retrofit debt.
- **Phase 20 gap closure pattern:** Rather than treating the DS-08 secondary path as a permanent known limitation, routing it through a dedicated gap-closure phase preserved the clean audit trail. The final milestone score went from `tech_debt` to `passed` in one session.

### What Was Inefficient

- **ROADMAP.md Phase Details section accumulated duplicate entries:** The v2.2 section appeared twice in ROADMAP.md (first as an in-progress summary, then again as detailed Phase Details). Arose because Phase 20 was inserted into the v2.1 scope after v2.2 planning had begun. Fixed at archive time.
- **Progress table column drift:** Several rows in the ROADMAP.md progress table had misaligned columns (Milestone column missing or in wrong position). Fixed at archive time. Should be spot-checked when plans complete.
- **DS-08 secondary path discovered at audit, not at execution:** The DashboardPage conflict-dialog wiring was missed by Phase 15 planning and only caught by the milestone audit. A review of "which pages mount this feature?" during Phase 15 planning would have caught it inline.
- **Phase 20 was unplanned at Phase 15 time:** Gap-closure phase required running the full discuss → plan → execute → validate → audit loop a second time. This overhead is low for 4 tech debt items but signals that end-of-milestone gap analysis should be a GSD workflow step, not a surprise.

### Patterns Established

- **Gap-closure phases:** When a milestone audit reveals tech debt or partial requirements, a gap-closure phase (Phase 20 pattern) preserves clean per-phase traceability. Better than amending previous phase summaries.
- **Controlled-props with internal useState fallback:** AddProjectPicker pattern (`open: controlledOpen` destructure rename, `internalOpen` fallback, `const open = controlledOpen ?? internalOpen`) — portable pattern for any popover that needs both controlled and uncontrolled modes.
- **Wave 0 stubs with TODO import comments:** When Phases 18 and 19 couldn't import not-yet-existing modules, TODO comments pointing to exact import lines to restore at activation time preserved the stubs' executability without polluting the file with broken imports.

### Key Lessons

1. **Review mounting points for new features during planning, not audit.** DS-08 was planned for CollectionPage only but DashboardPage also mounts UnitDetailSheet. A "which pages use this Sheet?" check during Phase 15 planning would have caught it. Add this to plan checklist for Sheet-mounted features.
2. **Milestone audits should be structured workflow steps.** Running `/gsd:audit-milestone` surfaced DS-08, 3 tech debt items, and a stale progress table. The workflow is now the standard end-of-milestone step — not optional.
3. **Duplicate ROADMAP.md sections grow from inserted phases.** When a phase is inserted into a milestone scope after planning has begun (Phase 20 inserted into v2.1 after v2.2 planning started), the ROADMAP ends up with overlapping section headers. Fix: update the milestone's phase list in one place only.

### Cost Observations

- Model: Claude Sonnet 4.6 throughout
- Sessions: 3 (context compression mid-milestone; Phase 20 in a new session)
- Notable: 8 phases with 41 plans in 2 calendar days — parallel wave execution (Phase 12/13/14 all depend on Phase 10 only) and autonomous single-wave plans (Phase 20's 3 plans) drove velocity

---

## Milestone: v2.2 — Full Circle

**Shipped:** 2026-05-05
**Phases:** 8 (17–19, 21–24, 35) | **Plans:** 23 | **Timeline:** 2 days (2026-05-04 → 2026-05-05)

### What Was Built

- Phase 17: Schema enrichment — lore_notes/undercoat on units, lore_notes on factions, purchase_date on paints, todayISO() timezone-safe utility in @/lib/dates
- Phase 18: Battle Log CRUD — BattleLogPage at /battle-log, opponent faction, mission/result/army-list linkage, chronological list with date sorting
- Phase 19: Analytics Core — hobby velocity metrics, painting streak calculation on Dashboard, monthly spend trend chart
- Phase 21: Hobby Goals — goal CRUD with target dates, track progress via painting sessions, dashboard goal card with progress ring
- Phase 22: Hobby Goals Polish — goal filtering/sorting, completion celebrations, streak integration with goals
- Phase 23: Display Features — Battle Ready collection filter preset, unit showcase mode with photo display
- Phase 24: Unit Point Calculator — per-model-count point tiers (unit_point_tiers table), wargear loadout selection (unit_loadout_wargear table), delta preview badge in army list builder, COALESCE chain integration
- Phase 35: Gap Closure — 4 surgical tech debt fixes (timezone, 2× cache invalidation, purchase_date form wiring)

### What Worked

- **Phase 24 multi-plan architecture (4 plans, 3 waves):** Splitting a complex data-heavy feature into foundation → selection → preview stages kept each plan focused and testable. 16 automated tests across 3 test files provided high confidence despite the SQL and UI complexity.
- **Milestone audit → gap closure → re-audit cycle:** The v2.2-MILESTONE-AUDIT identified 4 specific tech debt items, Phase 35 was planned and executed in 4 minutes, and re-audit confirmed all resolved. The GSD gap closure workflow is now battle-tested.
- **COALESCE chain untouched by tier feature:** Phase 24 wisely writes tier-confirmed points to `units.points` at application layer rather than modifying the COALESCE SQL. Army list effective_points computation remained stable with zero regression risk.
- **Cache invalidation symmetry enforced:** Phase 35 identified that useDeletePaintingSession was missing goal-progress invalidation that useCreatePaintingSession had. The symmetry rule is now a documented pattern.
- **Nyquist validation inline throughout:** All phases shipped with `nyquist_compliant: true` — no retrofit batch needed. The pattern established in v2.1 held consistently.

### What Was Inefficient

- **v2.2 "partial ship" confusion:** Phases 17–19 shipped early (2026-05-04) while Phases 21–24 were still in flight. PROJECT.md recorded this as "v2.2 partial ship" which required cleanup at milestone completion. Better to not mark partial milestones in PROJECT.md — keep it binary (shipped or not).
- **4 tech debt items missed until milestone audit:** All 4 Phase 35 fixes (timezone import, 2 cache invalidations, purchase_date form field) could have been caught during their respective phase executions. The timezone bug in BattleLogSheet existed since Phase 18 but the smoke test didn't catch off-by-one dates.
- **Progress table column misalignment:** Phases 23 and 24 were missing the milestone column in ROADMAP.md. This drift pattern has occurred in every milestone — needs a structural fix (template validation or automated check).

### Patterns Established

- **Cache invalidation symmetry rule:** If useCreateX invalidates a query key, useDeleteX must invalidate the same key. Documented as a project convention.
- **todayISO() as single source of truth:** All date defaults use `todayISO()` from `@/lib/dates` (local timezone). No more inline `new Date().toISOString().slice(0,10)`.
- **weapon_name TEXT copy for cross-DB references:** When referencing rules.db data from hobbyforge.db, store as denormalized TEXT column — SQLite doesn't support cross-database FKs.
- **Gap closure as formal phase:** Tech debt items discovered at milestone audit get a dedicated numbered phase with full plan/execute/verify lifecycle, not ad-hoc patches.

### Key Lessons

1. **Don't mark "partial ship" in PROJECT.md.** It creates cleanup work at milestone completion and confuses the shipping history. A milestone is either complete or in-progress.
2. **Cache invalidation should be reviewed per-mutation during code review.** Each new mutation hook should explicitly audit which query keys it touches, checking symmetry with the corresponding create/delete counterpart.
3. **ROADMAP progress table needs automated column validation.** Three milestones in a row have had column misalignment. This is a structural issue in the manual editing workflow.
4. **Gap closure is fast when scoped correctly.** Phase 35 completed in 4 minutes (2 tasks, 5 files). The overhead of a formal phase is negligible when the scope is surgical.

### Cost Observations

- Model: Claude Opus 4.6 + Sonnet 4.6 (mixed)
- Sessions: 3 (Phase 17-19 in first, Phase 21-24 in second, Phase 35 + audit + completion in third)
- Notable: 8 phases with 23 plans in 2 calendar days — Phase 35 gap closure (4 min) demonstrates that the plan→execute cycle is fast for surgical fixes

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Phases | Plans | Key Change |
|-----------|--------|-------|------------|
| v1.1 | 5 | 20 | First milestone — baseline established |
| v2.0 | 4 | 20 | Back-end foundation phase pattern; Nyquist VALIDATION.md retrofit introduced |
| v2.1 | 8 | 41 | Dual-DB architecture; gap-closure phase pattern; inline Nyquist compliance (no retrofit) |
| v2.2 | 8 | 23 | Cache invalidation symmetry rule; gap closure as formal phase; milestone audit → fix → re-audit cycle proven |

### Cumulative Quality

| Milestone | Tests | Status |
|-----------|-------|--------|
| v1.1 | 113 | All passing |
| v2.0 | 212 | All passing (isolated; FactionSummaryCard ordering issue pre-existing) |
| v2.1 | 395 | All passing post-Phase 20 |
| v2.2 | 644 | All passing (16 phase-24-specific tests, 2 pre-existing skips) |

### Top Lessons (Verified Across Milestones)

1. Pre-wire cross-phase cache invalidation when dependencies are known early (v1.1 DATA-09 → v2.0 dashboard-stats forward-compat → v2.2 symmetry rule)
2. Pure function + TDD Wave 0 dramatically reduces UI debugging time
3. Sibling portal pattern prevents Radix z-index/context issues in Sheet-heavy UIs
4. SQL join shape tests catch column-omission gaps that smoke tests miss (learned from ARMY-02)
5. Review mounting points for Sheet-mounted features during planning — not at audit (learned from DS-08 secondary path)
6. Foundation phases with full test coverage before UI work pay for themselves in zero data-layer debugging time
7. Gap closure as a formal phase is fast (4 min for Phase 35) and preserves audit trail — never patch informally
8. ROADMAP progress table column alignment drifts every milestone — needs structural fix or automated validation
