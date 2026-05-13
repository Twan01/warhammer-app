# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

---

## Milestone: v0.1.1 — HobbyForge MVP

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

## Milestone: v0.2.0 — Utility Layer

**Shipped:** 2026-05-03
**Phases:** 4 (6–9) | **Plans:** 20 | **Timeline:** 3 days (2026-05-01 → 2026-05-03)

### What Was Built

- Phase 6 back-end foundation: migration 004 (8 `ALTER TABLE ADD COLUMN` on `unit_strategy_notes`), TypeScript types for all three v0.2.0 features, query modules (`armyLists.ts`, `strategyNotes.ts`), hook modules with DATA-09 forward-compat dashboard invalidation, 38 automated tests
- Phase 7 Paint Inventory: PaintsPage at `/paints` with Zustand-backed brand/type/color-family multi-select filters, running-low/wishlist preset views, color swatch, recipe-count badge with cross-page navigation (`/recipes?paintId=X`), inline owned toggle with optimistic update
- Phase 8 Army List Builder: ArmyListsPage, CRUD sheets, multi-add UnitPickerDialog, ArmyListDetailSheet with pinned summary bar (COALESCE effective_points computed in SQL), per-unit notes expandable rows, full-replacement UPDATE for NULL-clearable points_override, UnitDeleteDialog with army-list membership pre-check
- Phase 9 Unit Playbook: PlaybookTab inside shadcn Tabs with 6-field stats block (suffix display, pencil edit mode, Escape-to-cancel), abilities/keywords inputs, 8 fixed-order strategy note fields, dirty-state Save gating with sonner toasts, SQLite persistence round-tripped in live app
- 1 audit gap closed: ARMY-02 assembled-status badge absent from SQL join, TypeScript type, and render — found and fixed in one session (commit 259f3fc)

### What Worked

- **Phase 6 pure back-end foundation:** Separating migration + types + queries + hooks into their own phase (with full test coverage) before touching any UI meant Phases 7–9 had zero data-layer surprises. All three UI phases built on a verified foundation.
- **COALESCE in SQL (never JS):** Computing `effective_points = COALESCE(alu.points_override, u.points, 0)` in `getArmyListWithUnits` SQL meant `ArmyListSummaryBar` could just sum a flat array — no conditional logic, no unit-level JS math. One canonical computation point.
- **Sibling portal pattern held at scale:** Phase 8 had the most complex portal geometry (List Sheet + Delete Dialog + Unit Picker Dialog, all potentially open), and the established sibling pattern handled it perfectly. Zero z-index or context issues.
- **Wave 0 TDD on pure functions:** `applyPaintFilters` (Phase 7) and `getArmyListsByUnitId` pre-check (Phase 8) both had pure-function tests before any UI existed. The Phase 8 smoke test passed 14/14 steps on the first run — no regressions.
- **Nyquist VALIDATION.md retrofit:** Retroactively auditing all v0.2.0 phases for Nyquist compliance surfaced the ARMY-02 gap that the audit later confirmed. Validation docs are load-bearing.

### What Was Inefficient

- **VALIDATION.md compliance flags not set during execution:** As with v0.1.1, all four VALIDATION.md files were created with `nyquist_compliant: false` (or draft status) during phase execution and had to be retrofitted after the milestone. The fix is to update the flag inline when the last test passes, not in a retrospective batch.
- **Progress table formatting drift:** ROADMAP.md Phase 8 and 9 rows had misaligned column counts (the milestone column was missing). Caught and fixed at archive time. Progress tables should be spot-checked when plans complete.
- **ARMY-02 gap missed until audit:** The `status_assembly` column was in the schema and the `ArmyListUnitRow` type (after fix), but the SQL join never selected it. The gap was missed because the smoke test doesn't assert on every column — it asserts on behaviors. Automated tests for the SQL join (checking selected columns) would have caught this inline.

### Patterns Established

- **Back-end foundation phase pattern:** When adding multiple new features that share a data layer, isolate the schema + types + queries + hooks into a Wave-0 phase. UI phases then build on a verified foundation. Applied in v0.2.0 Phase 6; worth repeating for future feature clusters.
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

## Milestone: v0.2.1 — Visual Command

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
- **Nyquist VALIDATION.md inline (first time):** Unlike v0.1.1/v0.2.0, most VALIDATION.md files were created with `nyquist_compliant: true` during execution rather than retrofitted at audit time. Phase 20 generated the remaining 2 test files in a single nyquist audit session — zero retrofit debt.
- **Phase 20 gap closure pattern:** Rather than treating the DS-08 secondary path as a permanent known limitation, routing it through a dedicated gap-closure phase preserved the clean audit trail. The final milestone score went from `tech_debt` to `passed` in one session.

### What Was Inefficient

- **ROADMAP.md Phase Details section accumulated duplicate entries:** The v0.2.2 section appeared twice in ROADMAP.md (first as an in-progress summary, then again as detailed Phase Details). Arose because Phase 20 was inserted into the v0.2.1 scope after v0.2.2 planning had begun. Fixed at archive time.
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
3. **Duplicate ROADMAP.md sections grow from inserted phases.** When a phase is inserted into a milestone scope after planning has begun (Phase 20 inserted into v0.2.1 after v0.2.2 planning started), the ROADMAP ends up with overlapping section headers. Fix: update the milestone's phase list in one place only.

### Cost Observations

- Model: Claude Sonnet 4.6 throughout
- Sessions: 3 (context compression mid-milestone; Phase 20 in a new session)
- Notable: 8 phases with 41 plans in 2 calendar days — parallel wave execution (Phase 12/13/14 all depend on Phase 10 only) and autonomous single-wave plans (Phase 20's 3 plans) drove velocity

---

## Milestone: v0.2.2 — Full Circle

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
- **Milestone audit → gap closure → re-audit cycle:** The v0.2.2-MILESTONE-AUDIT identified 4 specific tech debt items, Phase 35 was planned and executed in 4 minutes, and re-audit confirmed all resolved. The GSD gap closure workflow is now battle-tested.
- **COALESCE chain untouched by tier feature:** Phase 24 wisely writes tier-confirmed points to `units.points` at application layer rather than modifying the COALESCE SQL. Army list effective_points computation remained stable with zero regression risk.
- **Cache invalidation symmetry enforced:** Phase 35 identified that useDeletePaintingSession was missing goal-progress invalidation that useCreatePaintingSession had. The symmetry rule is now a documented pattern.
- **Nyquist validation inline throughout:** All phases shipped with `nyquist_compliant: true` — no retrofit batch needed. The pattern established in v0.2.1 held consistently.

### What Was Inefficient

- **v0.2.2 "partial ship" confusion:** Phases 17–19 shipped early (2026-05-04) while Phases 21–24 were still in flight. PROJECT.md recorded this as "v0.2.2 partial ship" which required cleanup at milestone completion. Better to not mark partial milestones in PROJECT.md — keep it binary (shipped or not).
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

## Milestone: v0.2.4 — Premium Dashboard UX & Visual Polish

**Shipped:** 2026-05-06
**Phases:** 6 (30–34, 36) | **Plans:** 13 | **Timeline:** 2 days (2026-05-05 → 2026-05-06)

### What Was Built

- Phase 30: Dashboard CSS grid bento layout — asymmetric 2-column responsive grid, StatCards with `to` prop navigation (conditional `interactiveProps` spread, never conditional hook call), 5-bucket HobbyPipeline grouping with BUCKET_GROUPS/BUCKET_ORDER co-located palette
- Phase 31: UnitThumbnail shared component (Swords icon fallback, faction-colored bg), CurrentFocusCard v2 (photo thumbnail + metadata + Open Unit / Log Progress buttons), ActiveProjectsPanel (top 5 active projects with relativeDate utility, compact rows)
- Phase 32: ArmyReadinessCard — `getArmyReadinessByFaction` query (INNER JOIN), `useArmyReadinessTarget` localStorage hook with validated reads, 4-tier target selector (500/1000/1500/2000), per-faction progress bars capped at 100%
- Phase 33: LogSessionSheet `new_status` field with __none__ sentinel for Radix Select, 3-key cache invalidation (dashboard-stats + units + painting-sessions), `computeSpendingStats` extended with costPerCompletedModelPence and value split, RecipeDetailSheet ↔ unit bidirectional navigation, CurrentFocusCard recipe name display
- Phase 34: FactionSummaryCard v2 (absolute inner div accent band, bg-faction-accent/10 active glow, Circle dot icon), hero radial gradient (hex + "12" opacity suffix ~7%), hover shadow hierarchy (transition-shadow duration-150 hover:shadow-md) on all dashboard cards
- Phase 36: Recipe cache invalidation fix — `["recipes", "by-unit"]` prefix added to all 3 mutation hooks in useRecipes.ts; 3 stale planning docs updated

### What Worked

- **Atomic CSS grid migration:** Phase 30 updated all 4 DashboardPage render branches (populated, empty, loading, error) in a single commit, preventing any half-migrated grid state. The responsive breakpoint (`grid-cols-1 lg:grid-cols-[2fr_1fr]`) worked correctly from the first test.
- **UnitThumbnail as shared component:** Creating a single thumbnail component with consistent fallback (faction color + Swords icon) in Phase 31 eliminated duplicate photo rendering logic across CurrentFocusCard and ActiveProjectsPanel. Clean prop interface (`unitId`, `factionId`, `photoPath`, `size`).
- **Milestone audit → gap closure cycle (3rd time):** The v0.2.4 audit caught DATA-06 cache staleness (recipe mutations not invalidating by-unit queries) and 3 stale docs. Phase 36 fixed everything in 6 minutes. The pattern is now fully routine.
- **Nyquist validation inline for all phases:** All 6 phases shipped with `nyquist_compliant: true` — zero retrofit debt. The validate-phase workflow creates test files automatically.
- **Wave 0 TDD continued delivering:** 33-00 and 34-00 created test stubs before any UI work, catching issues early (e.g., Radix Select requiring hasPointerCapture polyfill in jsdom).

### What Was Inefficient

- **VIS-03 stale verification document:** Phase 34's VERIFICATION.md was written before commit e4a221c fixed the hover shadow gap in RecentActivityFeed and ArmyReadinessCard populated branches. The verification step ran on pre-fix code, producing a false "gaps_found" status. The re-verification note was only added in Phase 36. Better to re-run verification after any post-verification fixes.
- **SUMMARY frontmatter `requirements_completed` omissions:** Three SUMMARY files (32-01, 33-01, 36-01) were created without `requirements_completed` in frontmatter despite the requirements being code-satisfied. The milestone audit caught this as a traceability gap. The executor should add `requirements_completed` to SUMMARY frontmatter as a standard step.
- **Progress table column misalignment (again):** Phases 30–36 rows in ROADMAP.md had misaligned columns (milestone column missing). This is the 4th consecutive milestone with this issue.

### Patterns Established

- **Conditional hook-call avoidance via props:** StatCard's `to` prop triggers an `interactiveProps` object spread (`cursor-pointer`, `onClick`, `role="link"`) rather than a conditional `useNavigate` call. Prevents Rules of Hooks violations in components that conditionally need navigation.
- **Radix Select sentinel values:** Use `__none__` (not empty string) as the "no selection" value in Radix Select items — Radix reserves empty string for clearing selection.
- **jsdom pointer capture polyfills:** `hasPointerCapture`, `setPointerCapture`, `releasePointerCapture` must be polyfilled in tests/setup.ts for Radix Select to work with userEvent.click in jsdom.
- **Recipe cache prefix invalidation:** `invalidateQueries({ queryKey: ["recipes", "by-unit"] })` invalidates all `["recipes", "by-unit", *]` keys via React Query's prefix matching — no need for an exported constant when the key is only used inline.

### Key Lessons

1. **Re-run verification after post-verification code fixes.** VIS-03 was code-fixed after the verifier ran, leaving a stale "gaps_found" status that required Phase 36 cleanup. If a fix ships after verification, update the verification doc immediately.
2. **Add `requirements_completed` to SUMMARY frontmatter as a standard executor step.** Three files missed it, causing traceability gaps at audit time. The field is load-bearing for 3-source cross-reference.
3. **ROADMAP progress table still drifts.** Four milestones in a row now. The milestone column is consistently missing for new phases. This needs a structural fix — either automated validation or a template row.

### Cost Observations

- Model: Claude Opus 4.6 throughout
- Sessions: 2 (Phase 30–34 execution, then Phase 36 gap closure + audit + completion)
- Notable: 6 phases with 13 plans in 1 calendar day — the v0.2.4 scope (dashboard polish, no new schema) made phases fast; gap closure (Phase 36) completed in 6 minutes

---

## Milestone: v0.2.5 — Recipes 2.0 / Painting Studio

**Shipped:** 2026-05-07
**Phases:** 5 (37–41) | **Plans:** 12 | **Timeline:** 1 day (2026-05-07)

### What Was Built

- Phase 37: Migration 012 (recipe_paints → recipe_steps rename + 11 new columns), recipe metadata fields (style/surface/effect/difficulty/time/photo), kanban cache invalidation fix, batch step count query replacing N+1 loop
- Phase 38: Full step input UI — painting phase dropdown (10 values), tool/technique/dilution/time inputs on two-line layout, @dnd-kit drag-and-drop reordering, time sum display in recipe header
- Phase 39: RecipeTable → RecipeCard/RecipeCardGrid transformation, paint availability batch query with AvailabilityBadge (green/red/amber dots), RecipeStepTimeline vertical detail view, 4-dimension filtering (surface/style/difficulty/missing paints), applyRecipeFilters extraction
- Phase 40: Migration 013 (step_photo_path + alt_paint_id), recipe duplication (copies header + all 12 step columns), per-step photo upload via Tauri FS API with timeline thumbnails, alt paint combobox, bulk "Add all missing to wishlist" with name-based dedup
- Phase 41: Migration 014 (recipe_id/recipe_step_id on painting_sessions), LogSessionSheet recipe/step dropdowns with faction-sorted picker and cascading clear, RecipeDetailSheet sessions history section

### What Worked

- **Rename-not-copy migration strategy:** Phase 37's `ALTER TABLE recipe_paints RENAME TO recipe_steps` preserved all existing data with zero risk of loss or duplication. Combined with a `RecipePaint = RecipeStep` type alias, the rename was invisible to downstream consumers until they opted in to the new name.
- **Progressive column expansion (10 → 12):** Phase 38 expanded addRecipePaint to 10 columns, Phase 40 to 12. Each expansion was additive and backward-compatible (new columns default to NULL). No existing code broke at any step.
- **Batch SQL for aggregates (2 independent queries):** `getStepCountsByRecipe` (GROUP BY) and `getRecipePaintAvailability` (JOIN + CASE WHEN) each replaced potential N+1 patterns with single round-trips. Both return Map-shaped results consumed by the page.
- **Pure presentational timeline component:** RecipeStepTimeline takes `steps + paintMap + stepPhotoUrls` as props with zero internal data fetching. Made testing trivial and photo URL resolution cleanly separated in the parent RecipeDetailSheet.
- **SUMMARY frontmatter gap still present:** 8 of 18 requirements missing from SUMMARY `requirements_completed` arrays (same issue flagged in v0.2.4). All 18 were verified in VERIFICATION.md — the gap is documentation-only but it adds overhead at audit time.

### What Was Inefficient

- **SUMMARY frontmatter requirements_completed not populated in 8/12 plans:** Despite being flagged as a lesson in v0.2.4, 8 plan SUMMARYs still shipped with empty `requirements_completed` arrays. The 3-source cross-reference at audit time had to manually verify these via VERIFICATION.md. The executor workflow should enforce this field.
- **Phase 40/41 progress table column misalignment:** Phases 40 and 41 were missing the milestone column in ROADMAP.md (5th consecutive milestone with this issue). Fixed at archive time.
- **No one-liner in any SUMMARY frontmatter:** All 12 SUMMARY files had `one_liner: null`, which forced manual accomplishment extraction at milestone completion. The `one_liner` field should be populated during plan execution.

### Patterns Established

- **Rename migration for table evolution:** When restructuring an existing table, `ALTER TABLE ... RENAME TO` + type alias is safer than create-copy-drop. Data stays in place; downstream code migrates incrementally.
- **Batch availability query pattern:** For features that need per-entity aggregate stats on a listing page (owned/missing/low counts per recipe), a single GROUP BY JOIN query returning a Map is the standard approach. Paired with a dedicated cache key for cross-mutation invalidation.
- **ON DELETE SET NULL for cross-feature FKs:** When feature B (sessions) references feature A (recipes), use SET NULL so B survives A's deletion. The link clears but the row persists.
- **Cascading Select clear via useEffect:** When Select B depends on Select A's value, a `useEffect([watchedA]) → form.setValue(B, null)` prevents stale FK references. Applied in LogSessionSheet (recipe → step cascade).
- **Sequential mutateAsync for bulk operations:** For small-batch writes (e.g., adding 3–5 wishlist items), a sequential `for...of + mutateAsync` loop is simpler and more debuggable than `Promise.all`. Acceptable for local desktop apps.

### Key Lessons

1. **Enforce `requirements_completed` in SUMMARY frontmatter during plan execution.** v0.2.4 identified this; v0.2.5 didn't fix it. 8/12 plans missing. This is the most persistent documentation gap — needs a workflow enforcement hook, not just a lesson.
2. **Enforce `one_liner` in SUMMARY frontmatter.** All 12 plans missing. The milestone completion workflow depends on this field for accomplishment extraction; without it, accomplishments must be manually composed.
3. **ROADMAP progress table column alignment needs automated validation.** 5th consecutive milestone. Manual editing will never fix this consistently.
4. **Rename migration + type alias is the cleanest table evolution strategy.** Zero data loss, zero downstream breakage, incremental consumer migration. Use this for any table restructure going forward.
5. **Batch aggregate queries scale cleanly.** Two independent batch queries (step counts + paint availability) serve the entire RecipesPage without N+1 risk. The Map-return pattern is reusable for any aggregate-on-listing-page scenario.

### Cost Observations

- Model: Claude Opus 4.6 throughout
- Sessions: 2 (Phase 37–40 execution, Phase 41 + audit + completion)
- Notable: 5 phases with 12 plans and 18 requirements in 1 calendar day — fastest milestone yet by velocity-per-requirement (18 req in 1 day); clean phase dependency chain (37→38→39→40→41) with no parallelism needed

---

## Milestone: v0.2.6 — Rules Sync 2.0 / Rules Data Hub

**Shipped:** 2026-05-08
**Phases:** 6 (42–47) | **Plans:** 11 | **Timeline:** 1 day (2026-05-08)

### What Was Built

- Phase 42: Architecture audit — full sync pipeline mapping (TypeScript CSV fetch → Rust transaction → SQLite), type/query/hook gap inventory, migration plan for 4 new tables
- Phase 43: Extended rules read layer — TypeScript types, queries, and hooks for stratagems, detachments, detachment abilities, and shared abilities; PlaybookTab collapsible sections (SCHEMA-01–05)
- Phase 44: Sync pipeline hardening — Rust SyncResult with per-table row counts via rows_affected(), CSV header validation module, sync_errors persistence layer (SYNC-01–05)
- Phase 45: Sync metadata & import tracking — rw_sync_meta count columns, rules_snapshot DDL, Rust upsert extension, freshness utility, PlaybookTab sync details and error history (META-01–06)
- Phase 46: Manual overrides — unit_overrides migration + CRUD, 3-level COALESCE for effective_points, computeSyncDiff pure function, PlaybookTab override markers + diff view (OVRD-01–07)
- Phase 47: Gap closure — enriched SNAPSHOT_TABLES with full field data, ExtendedSnapshotData options object, per-field comparison (stats/keywords/abilities), Modified section in diff UI, SUMMARY frontmatter standardization

### What Worked

- **Architecture audit as Phase 0:** Phase 42 was a read-only investigation that produced a written reference document. Every subsequent phase referenced it for table schemas, data flow diagrams, and migration plans. Zero planning confusion across Phases 43–47.
- **ExtendedSnapshotData options object:** Instead of adding 6 positional parameters to computeSyncDiff, the optional third param `extended?: ExtendedSnapshotData` maintained full backward compatibility. Zero call sites needed updating; existing tests continued passing unchanged.
- **Overrides in hobbyforge.db, not rules.db:** The critical design decision to store unit_overrides in hobbyforge.db (not rules.db which is wiped on every sync) was established early in Phase 42's audit and never questioned. Overrides survived re-syncs from day one.
- **Milestone audit → gap closure cycle (5th time):** The v0.2.6 audit identified OVRD-06 as partial (per-field diff missing), stale JSDoc, and SUMMARY frontmatter gaps. Phase 47 closed all gaps. The cycle is fully routine — audit findings become Phase 47 scope.
- **SUMMARY frontmatter standardization in Phase 47:** Finally addressed the persistent `requirements_completed` gap across Phases 43–46 (8 files). Phase 47 Plan 02 renamed and added the field in all 8 files as part of tech debt cleanup.

### What Was Inefficient

- **Phase 42 audit predated Phase 47 execution:** The milestone audit at v0.2.6 was run after Phase 46 (status: `tech_debt`). Phase 47 resolved all tech debt items, but the audit wasn't re-run. The audit file still shows `status: tech_debt` and `requirements: 26/27` even though all 27 are now complete.
- **one_liner still missing from all 11 SUMMARY files:** Despite being flagged as a lesson in v0.2.5, none of the v0.2.6 SUMMARYs populated the `one_liner` field. Accomplishment extraction at milestone completion still required manual grep of summary headers. The `summary-extract` tool returned null for every file.
- **ROADMAP progress table column misalignment (6th consecutive):** Phases 43–47 were missing the milestone column. Fixed at archive time. This is the most persistent process issue.

### Patterns Established

- **Architecture audit phase for complex feature clusters:** Before starting a multi-phase feature (rules sync 2.0), invest one phase in a read-only audit that maps existing architecture, identifies gaps, and produces a migration plan. All subsequent phases reference the audit document.
- **Options object for backward-compatible function extension:** When extending a pure function's signature, use an optional trailing options object (`extended?: T`) instead of positional params. Preserves all existing call sites and tests.
- **Dual-query merge for cross-database data:** Since ATTACH DATABASE isn't available via tauri-plugin-sql, query both databases separately and merge in TypeScript. Used consistently for override-enriched data views.
- **Pre-sync snapshot read before capture ordering:** `getLatestSnapshot()` must run before `capturePreSyncSnapshot()` to capture the baseline for diffing. The ordering is enforced in mutationFn with sequential awaits.

### Key Lessons

1. **Re-run milestone audit after gap closure phase.** The v0.2.6 audit shows `tech_debt` status but all tech debt was resolved by Phase 47. The stale audit status is misleading.
2. **Enforce `one_liner` in SUMMARY frontmatter.** 6th milestone with this gap. The `summary-extract` tool depends on it; milestone completion falls back to manual extraction every time.
3. **Architecture audits should be standard for multi-phase features.** Phase 42's investment paid off across 5 downstream phases. Worth formalizing as a GSD workflow option.
4. **Per-field diff is valuable but scope-sensitive.** OVRD-06 was initially deferred as "snapshot stores only {id, name}" in Phase 46, then promoted to a gap closure phase. The enriched snapshot approach (storing full row JSON) is clean but required 2 additional plans. Worth scoping upfront in future features.

### Cost Observations

- Model: Claude Opus 4.6 throughout
- Sessions: 2 (Phase 42–46 execution, Phase 47 gap closure + validation + completion)
- Notable: 6 phases with 11 plans and 27 requirements in 1 calendar day; single-day milestone completion is now the norm for well-scoped work

---

## Milestone: v0.2.7 — Recipes 3.0 / Hierarchical Painting Workflows

**Shipped:** 2026-05-08
**Phases:** 4 (48–51) | **Plans:** 8 | **Timeline:** 1 day (2026-05-08)

### What Was Built

- Phase 48: Migration 018 (recipe_sections table with 9 columns, section_id FK on recipe_steps, zero-data-loss default section backfill), typed CRUD queries, 5-key cascade invalidation contract on section delete, batch per-section step counts via GROUP BY
- Phase 49: SectionedTimeline component — section headers with name, surface badge, step count, estimated time, per-section owned/missing paint availability dots; backward-compatible flat fallback for unsectioned recipes
- Phase 50: DraftSection type + buildDraftSections pure functions (TDD), RecipeSectionCard (collapsible + useSortable), RecipeSectionList (outer DndContext for section reorder), RecipeFormSheet rewrite with DraftSection[] state and progressive disclosure
- Phase 51: duplicateRecipe extended with section copy + Map<oldId, newId> remapping, getSectionCountsByRecipe batch query, RecipeCard section count badge with progressive disclosure (hidden for single-section recipes), 1,112 tests passing

### What Worked

- **Data layer foundation phase (Phase 48):** Separating migration + types + queries + hooks into a dedicated phase before any UI work meant Phases 49–51 had zero data-layer surprises. Consistent with the v0.2.0 and v0.2.5 pattern.
- **TDD for pure functions (Phase 50):** Plan 50-01 wrote `makeDraftSection` and `buildDraftSections` with 8 tests before any UI existed. The form rewrite in Plan 50-03 consumed these functions without a single bug.
- **Progressive disclosure design decision:** The `sections.length <= 1` threshold keeps simple recipes simple while exposing full section UI only when needed. Confirmed as correct by all verification reports.
- **No gap closure phase needed:** All 19 requirements passed on first audit — no gap closure phase was required. This is the second milestone (after v0.2.5) with a clean first-pass audit.
- **Nyquist compliance inline:** All 4 phases shipped with `nyquist_compliant: true` — zero retrofit debt. The pattern is now fully routine.

### What Was Inefficient

- **SUMMARY frontmatter `requirements_completed` still empty in 6/8 plans:** Despite being flagged as a lesson in v0.2.4, v0.2.5, and v0.2.6, 6 of 8 SUMMARY files shipped with empty `requirements_completed` arrays. The 3-source cross-reference at audit time had to fall back to VERIFICATION.md evidence. This is the 4th consecutive milestone with this issue.
- **SUMMARY frontmatter `one_liner` missing in all 8 plans:** 8th consecutive milestone with null `one_liner` fields. Accomplishment extraction at milestone completion is always manual.
- **2 orphaned hook exports:** `useReorderRecipeSections` and `useSectionStepCounts` were built in Phase 48 but never consumed by any component. The form used DELETE+re-INSERT instead of the reorder hook, and SectionedTimeline computes counts inline instead of using the batch hook. Planning could have anticipated the actual consumption patterns.

### Patterns Established

- **Two-DndContext nested approach:** Outer DndContext for section reorder, inner DndContext per section for step reorder. Each context is independent — no cross-container DnD complexity.
- **DELETE-all + re-INSERT for hierarchical saves:** When saving a form with parent + child relationships (sections + steps), delete all existing parents (CASCADE removes children), then re-INSERT in order. Simpler than diffing.
- **Progressive disclosure threshold for optional complexity:** When a feature adds complexity that not all entities need, use a count-based threshold (e.g., sections.length <= 1) to hide the complex UI for simple cases.
- **sectionIdMap for duplication ID remapping:** When duplicating an entity with child hierarchies, build a Map<oldId, newId> during the parent copy loop and use it during the child copy loop. O(1) per child.

### Key Lessons

1. **Anticipate consumption patterns when building hooks.** Two hooks (useReorderRecipeSections, useSectionStepCounts) were built speculatively but the UI used alternative approaches. Planning should ask "how will the form/view actually consume this data?" before building hooks.
2. **SUMMARY frontmatter enforcement remains the most persistent gap.** `requirements_completed` and `one_liner` fields are missing in nearly every plan across 4 milestones. This needs a workflow enforcement mechanism, not just retrospective lessons.
3. **Clean first-pass audits correlate with well-scoped milestones.** Both v0.2.5 and v0.2.7 had clean audits (no gap closure needed) and both had focused, well-scoped work (recipe features, 4–5 phases, clear dependency chain). Milestones with broader scope (v0.2.1, v0.2.2) needed gap closure.

### Cost Observations

- Model: Claude Opus 4.6 throughout
- Sessions: 2 (v0.2.6 + v0.2.7 execution in same day, then audit + completion)
- Notable: 4 phases with 8 plans and 19 requirements in 1 calendar day — fastest per-plan velocity; clean linear dependency chain (48→49→50→51) with no parallelism needed

---

## Milestone: v0.2.8 — Rules Data Hub UI / Army Lists 2.0 / Game Day

**Shipped:** 2026-05-11
**Phases:** 5 (52–56) | **Plans:** 12 | **Timeline:** 2 days (2026-05-10 → 2026-05-11)

### What Was Built

- Phase 52: Migration 019 (detachment_id on army_lists, rules_favorites and rules_notes tables in hobbyforge.db), typed query modules with optimistic updates, points import design document with 5-level COALESCE precedence
- Phase 53: RulesHubPage at /rules-hub with sync status header, Zustand filter store, 3-tab browser (stratagems with phase/CP filter chips, detachments with abilities count, shared abilities with legend search), Wahapedia disclaimer
- Phase 54: DetachmentPicker Combobox scoped to faction, StaleDataBanner for >30-day stale rules, DetachmentRulesSection (inline ability + filtered stratagems), RemindersSection (is_reminder=1 favorites)
- Phase 55: RuleAnnotationControls (star + reminder flag), RuleNoteEditor (debounced auto-save textarea), page-level Map<compositeKey, T> pattern via useMemo for both RulesHubPage and PlaybookTab
- Phase 56: GameDayPage with tabbed layout (Stratagems/Units/Checklist), Zustand persist store for CP/checklist/OPG toggles, phase-grouped stratagems with pinned reminders, UnitAbilityCard with OPG heuristic detection, ChecklistTab

### What Worked

- **Data layer foundation phase (Phase 52):** Consistent with v0.2.0/v0.2.5/v0.2.7 pattern — migration + types + queries + hooks isolated before UI work. Zero data-layer surprises in Phases 53–56.
- **Page-level Map lookup pattern:** Loading favorites/notes once at page level and building Map<compositeKey, T> via useMemo prevented N+1 hook calls. Pattern discovered in Phase 55-01 and immediately reused in 55-02. Clean O(1) per-card lookup.
- **Sub-component pattern for hooks-in-loop:** DetachmentAbilityRow wrapping per-item mutation hooks satisfied Rules of Hooks without awkward lifting. Used in both RulesHubPage and PlaybookTab.
- **No gap closure phase needed:** All 27 requirements passed on first audit — third consecutive milestone (v0.2.5, v0.2.7, v0.2.8) with clean first-pass audit.
- **Dual-DB separation discipline:** User annotations (favorites, notes, detachment_name) always in hobbyforge.db, never rules.db. Zero data loss on re-sync by design.
- **StratagemCard reuse:** Component built in Phase 53-02 reused in Phase 54-02 (army list), Phase 56-01 (game day) without modification. True component reuse.

### What Was Inefficient

- **SUMMARY frontmatter gaps persist:** `requirements_completed` and `one_liner` still missing in most SUMMARY files. 5th consecutive milestone with this issue. Manual accomplishment extraction at milestone completion continues.
- **Orphan hook/query exports:** useDetachmentById, getRulesFavoritesByType, getRulesNoteByKey were built proactively but never consumed. Consumers preferred different access patterns (full-list + client filter, Map lookup). Same lesson as v0.2.7 Phase 48.
- **GameDayStratagemCard nested button:** Button inside CollapsibleTrigger creates an HTML validation warning. Should have used onClick on the card surface instead of a nested button.

### Patterns Established

- **Page-level Map lookup for cross-entity annotations:** Load all annotations for a page once, build Map<`${rule_type}:${rule_name}`, T>, pass relevant entry to each card as a prop. Eliminates N+1 hook anti-pattern.
- **Sub-component per list item for hooks compliance:** When a mapped list item needs its own hooks (mutations, queries), extract it as a named component (e.g., DetachmentAbilityRow). Each component instance has its own hook call, satisfying Rules of Hooks.
- **Zustand persist for game session state:** CP tracker, checklist, OPG toggles use Zustand persist with localStorage keyed by list ID. Appropriate for single-session ephemeral state that doesn't warrant SQLite.
- **Heuristic keyword detection for ability properties:** Scanning ability text for "once per" to infer OPG status avoids schema changes to rules.db while covering common patterns.

### Key Lessons

1. **Component reuse works when the component is pure display.** StratagemCard from Phase 53 was reused in 3 contexts (rules hub, army list, game day) without modification because it takes data as props with no embedded state management.
2. **Orphan export pattern is recurring.** Three milestones now have unused proactively-built hooks/queries. Planning should verify consumption sites exist before building speculative exports.
3. **Clean audits continue to correlate with focused milestones.** v0.2.8 had clear dependency chain (52→53→54/55→56), well-scoped phases, and passed audit on first attempt.

### Cost Observations

- Model: Claude Opus 4.6 throughout
- Sessions: 3 (schema + hub phases, army lists + playbook phases, game day + completion)
- Notable: 12 plans across 5 phases in 2 days — 82 commits, 6,137 lines added; clean linear execution with Phase 52 foundation enabling parallel-ready Phases 53/54/55

---

## Milestone: v0.2.9 — Recipes 3.1 / Workflow Semantics & Integrations

**Shipped:** 2026-05-12
**Phases:** 4 | **Plans:** 8 | **Timeline:** 1 day (2026-05-12)

### What Was Built

- Schema & data layer: migration 020 adds 4 workflow metadata columns to recipe_sections + section_name on painting_sessions; const arrays as single sources of truth
- Recipe form & timeline display: Workflow collapsible with progressive disclosure; compact badges and dot-separated metadata in SectionedTimeline
- Session section cascade: 3-level cascading selector (recipe → section → step) in LogSessionSheet with dual reset chains
- Kanban & CurrentFocus integration: pure computeWorkflowPosition + batch useWorkflowPositions hook; section-aware display on KanbanCard and CurrentFocusCard with 5 degradation paths

### What Worked

- **Pure function derivation pattern:** `computeWorkflowPosition` in src/lib/ with 12 unit tests made the complex position logic trivially testable and shareable between KanbanCard and CurrentFocusCard.
- **Batch enrichment hook pattern:** `useWorkflowPositions` followed the exact `useKanbanEnrichment` pattern — sorted ID key, Map result, Promise.all parallel fetch. Pattern reuse eliminated design decisions.
- **Denormalized section_name:** Matching the established weapon_name/detachment_name pattern avoided cross-FK complexity with the DELETE-all + re-INSERT save pattern.
- **TDD gate on Phase 60 Plan 01:** RED commit (12 failing tests) → GREEN commit (all pass) — caught implementation edge cases before any UI wiring.

### What Was Inefficient

- **Missing verification docs caught at audit:** Phases 59 and 60 completed without VERIFICATION.md files. The milestone audit surfaced this as "gaps_found" — requiring a fix pass before milestone close. Adding verification as a standard executor step would prevent this.
- **REQUIREMENTS.md checkbox drift:** 5 boxes not checked despite implementation being verified. Manual checkbox tracking doesn't scale — the traceability table should be the single source of truth.
- **ROADMAP progress table inconsistency:** Phase 58 showed "1/2 In Progress" and Phase 60 showed "0/2 Not started" despite all summaries existing. Same drift problem as prior milestones.

### Patterns Established

- **Workflow position derivation:** Pure function handles sectioned/flat/section-only/complete/orphaned scenarios — reusable for any future recipe progress features.
- **3-level cascade selector:** useState local filter + useMemo filtered list + dual useEffect reset chain — pattern for any cascading form selector.
- **Design deviation documentation:** CONTEXT D-08 pattern for documenting intentional deviations from requirements during implementation.

### Key Lessons

- Verification docs should be created as part of phase execution, not retroactively at milestone close.
- The batch enrichment hook pattern (sorted ID key, Map result, page-level prop drill) is now proven across 3 use cases — it's a project-wide standard.
- Cache invalidation additions need cross-phase review — the workflow-positions key was missed in useCreatePaintingSession because it was added in a later phase than the mutation hook.

### Cost Observations

- Sessions: 1 milestone in a single day
- Notable: 8 plans across 4 phases — clean linear execution with Phase 57 foundation enabling all downstream work

---

## Milestone: v0.2.11 — Foundation Hardening

**Shipped:** 2026-05-13
**Phases:** 5 (68–72) | **Plans:** 9 | **Timeline:** 1 day (2026-05-13)

### What Was Built

- Infrastructure quick wins: COALESCE null-clearing fix, migration registration for 018-021, section-aware step ordering via LEFT JOIN, version alignment, duplicateRecipe section metadata copy
- Paintless recipe steps: migration 022 (table rebuild for nullable paint_id), RecipeFormSheet guard removal, SectionedTimeline null-safe availability
- Non-destructive recipe save: dbId tracking on DraftStep/DraftSection, UpdateRecipeStepInput with 13 columns, five-phase diff algorithm (collect surviving IDs → DELETE removed → UPDATE existing → INSERT new → step diff)
- Stable session section FK: migration 023 (recipe_section_id ON DELETE SET NULL), 8-column createSession INSERT, LogSessionSheet dual-write from watchedSectionId
- Data-layer test suite: better-sqlite3 devDep, db-helpers.ts factory, 14 tests (migration parity, schema shape, recipe persistence, session FK)

### What Worked

- **Non-destructive save preceded session FK (dependency ordering):** The decision to ship REC-02 (Phase 70) before REC-04 (Phase 71) was critical — the old DELETE-all pattern would fire ON DELETE SET NULL on every save, making the session FK useless. Correct dependency ordering meant the FK worked from day one.
- **Five-phase diff algorithm isolation:** The diff logic is entirely in RecipeFormSheet.onSubmit — no new hooks, no new query functions beyond updateRecipeStep. The create-new-recipe path is completely untouched, reducing regression risk.
- **Data-layer tests caught real contracts:** The 14 tests in Phase 72 verify actual SQLite behavior (ON DELETE CASCADE, ON DELETE SET NULL, FK pragma) that can't be tested through React Testing Library. These are load-bearing for migration confidence.
- **No gap closure phase needed:** All 9 requirements passed on first completion — 4th consecutive milestone (v0.2.7, v0.2.8, v0.2.9, v0.2.11) with clean first-pass. Well-scoped foundation work with clear dependency chain.

### What Was Inefficient

- **Verification docs missing for 2 of 5 phases:** Phases 68 and 70 had no VERIFICATION.md despite having VALIDATION.md and UAT.md. The milestone audit flagged `gaps_found` due to the missing formal verification — requiring manual assessment that the UATs covered the same ground. VERIFICATION.md should be generated as part of phase completion.
- **Audit ran before requirements checkboxes were updated:** REQUIREMENTS.md showed 3/9 checked when the audit ran, but all 9 were code-complete. The audit's `requirements: 3/9` score was misleading. Checkboxes should be updated at phase completion, not after audit.
- **v0.2.11 phases executed out-of-milestone-order:** These phases were v0.2.11 scope but executed while v0.2.10 was in progress (Phases 63, 64, 66, 67 still remaining). This created a confusing state where v0.2.11 shipped before v0.2.10. The dependency (Phase 70's non-destructive save enabling safe FK work) justified the sequencing, but the milestone numbering is counterintuitive.

### Patterns Established

- **dbId tracking in form state for diff saves:** Adding `dbId: number | null` to draft types enables diff-based saves without querying the DB for "what existed before." The form state is the single source of truth for what to update vs insert.
- **Five-phase diff algorithm:** Collect surviving IDs → DELETE removed parents (CASCADE children) → UPDATE existing parents → INSERT new parents + build ID map → per-parent child diff. Reusable for any hierarchical form save.
- **better-sqlite3 for data-layer tests:** In-memory SQLite via better-sqlite3 with `// @vitest-environment node` override enables testing real SQLite behavior (FK constraints, cascades, schema shape) without Tauri runtime.
- **Dual-write for FK + denormalized text:** Store both the FK (for analytics/querying) and a text copy (for display after parent deletion). Pattern now used for weapon_name, detachment_name, and section_name.

### Key Lessons

1. **Update REQUIREMENTS.md checkboxes at phase completion, not after audit.** The 3/9 score was misleading and created unnecessary audit remediation work.
2. **VERIFICATION.md should be a standard phase completion artifact.** UAT covers functional testing, but VERIFICATION.md provides the formal cross-reference that the milestone audit depends on.
3. **Out-of-order milestone execution works when dependency-justified.** v0.2.11 shipped before v0.2.10 because the foundation fixes were prerequisites for safe v0.2.10 feature work. Document the reasoning clearly.
4. **Data-layer tests are most valuable for SQLite-specific behavior.** FK cascades, pragma enforcement, and schema shape can't be tested through the React layer. The better-sqlite3 approach fills a real gap.

### Cost Observations

- Model: Claude Opus 4.6 throughout
- Sessions: 1 (all 5 phases in a single day)
- Notable: 9 plans across 5 phases in 1 day — foundation/data-layer work is fast when well-scoped with clear dependency chain (68→69→70→71→72)

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Phases | Plans | Key Change |
|-----------|--------|-------|------------|
| v0.1.1 | 5 | 20 | First milestone — baseline established |
| v0.2.0 | 4 | 20 | Back-end foundation phase pattern; Nyquist VALIDATION.md retrofit introduced |
| v0.2.1 | 8 | 41 | Dual-DB architecture; gap-closure phase pattern; inline Nyquist compliance (no retrofit) |
| v0.2.2 | 8 | 23 | Cache invalidation symmetry rule; gap closure as formal phase; milestone audit → fix → re-audit cycle proven |
| v0.2.3 | 5 | 21 | Unified design system; Quick Add pattern; kanban enrichment |
| v0.2.4 | 6 | 13 | CSS grid dashboard; photo-rich panels; Radix sentinel pattern; gap closure routine (6 min) |
| v0.2.5 | 5 | 12 | Recipe restructure (rename migration); batch aggregate queries; session-recipe linking; no gap closure needed |
| v0.2.6 | 6 | 11 | Architecture audit phase; dual-DB overrides; per-field diff; SUMMARY frontmatter standardization |
| v0.2.7 | 4 | 8 | Hierarchical recipe sections; nested DnD; progressive disclosure; no gap closure needed |
| v0.2.8 | 5 | 12 | Rules hub UI; army list detachment selection; annotation layer; Game Day mode; no gap closure needed |
| v0.2.9 | 4 | 8 | Workflow metadata; cascade selector; pure derivation function; batch enrichment pattern; no gap closure needed |
| v0.2.11 | 5 | 9 | Foundation hardening; non-destructive save; data-layer tests; paintless steps; session FK; no gap closure needed |

### Cumulative Quality

| Milestone | Tests | Status |
|-----------|-------|--------|
| v0.1.1 | 113 | All passing |
| v0.2.0 | 212 | All passing (isolated; FactionSummaryCard ordering issue pre-existing) |
| v0.2.1 | 395 | All passing post-Phase 20 |
| v0.2.2 | 644 | All passing (16 phase-24-specific tests, 2 pre-existing skips) |
| v0.2.3 | 758 | All passing (114 v0.2.3-specific tests) |
| v0.2.4 | 778 | 778 passing, 1 pre-existing flaky (paintRowSwatch timeout), 2 skipped, 12 todo |
| v0.2.5 | ~900 | All passing (18 requirements, 42/42 observable truths verified, Nyquist compliant) |
| v0.2.6 | 1,031 | All passing (27 requirements, Nyquist compliant, 1 test added by validation audit) |
| v0.2.7 | 1,112 | All passing (19 requirements, 33/33 observable truths verified, Nyquist compliant, no gap closure) |
| v0.2.8 | ~1,200 | All passing (27 requirements, Nyquist compliant, no gap closure, 3rd consecutive clean audit) |
| v0.2.9 | ~1,240 | All passing (18/19 requirements satisfied, 1 partial design deviation, Nyquist compliant, gaps resolved inline) |
| v0.2.11 | ~1,260 | All passing (9/9 requirements satisfied, 14 data-layer tests added, Nyquist 4/5 compliant, no gap closure) |

### Top Lessons (Verified Across Milestones)

1. Pre-wire cross-phase cache invalidation when dependencies are known early (v0.1.1 DATA-09 → v0.2.0 dashboard-stats forward-compat → v0.2.2 symmetry rule)
2. Pure function + TDD Wave 0 dramatically reduces UI debugging time
3. Sibling portal pattern prevents Radix z-index/context issues in Sheet-heavy UIs
4. SQL join shape tests catch column-omission gaps that smoke tests miss (learned from ARMY-02)
5. Review mounting points for Sheet-mounted features during planning — not at audit (learned from DS-08 secondary path)
6. Foundation phases with full test coverage before UI work pay for themselves in zero data-layer debugging time
7. Gap closure as a formal phase is fast (4 min for Phase 35, 6 min for Phase 36) and preserves audit trail — never patch informally
8. ROADMAP progress table column alignment drifts every milestone — needs structural fix or automated validation
9. Re-run verification after any post-verification code fix — stale verification docs create false gaps at audit time (learned from VIS-03 in v0.2.4)
10. `requirements_completed` in SUMMARY frontmatter is load-bearing for 3-source cross-reference — add it as a standard executor step
11. Rename migration + type alias is the cleanest table evolution strategy — zero data loss, zero downstream breakage (learned in v0.2.5 Phase 37)
12. `one_liner` in SUMMARY frontmatter must be enforced — milestone completion depends on it for accomplishment extraction (all 12 v0.2.5 SUMMARYs missing)
13. Anticipate hook consumption patterns during planning — speculative hooks that don't match the UI's actual data flow become dead code (learned in v0.2.7 Phase 48)
14. Clean first-pass audits correlate with well-scoped milestones — focused work (4–5 phases, clear dependency chain) ships without gap closure
