---
gsd_state_version: 1.0
milestone: v2.2
milestone_name: Full Circle
status: idle
stopped_at: Phase 22 context gathered
last_updated: "2026-05-05T16:11:09.968Z"
progress:
  total_phases: 7
  completed_phases: 3
  total_plans: 9
  completed_plans: 9
---

---
gsd_state_version: 1.0
milestone: none
milestone_name: none
status: idle
stopped_at: "v2.3 Hobby Command Center archived and tagged. Run /gsd:new-milestone to start next."
last_updated: "2026-05-05T16:30:00.000Z"
progress:
  total_phases: 0
  completed_phases: 0
  total_plans: 0
  completed_plans: 0
---

---
gsd_state_version: 1.0
milestone: v2.2
milestone_name: Full Circle
status: executing
stopped_at: Completed 29-04-PLAN.md (Phase 29 smoke test — all 4 requirements verified, 561 tests green, build clean)
last_updated: "2026-05-05T15:06:30.033Z"
progress:
  total_phases: 12
  completed_phases: 8
  total_plans: 30
  completed_plans: 30
  percent: 100
---

---
gsd_state_version: 1.0
milestone: v2.2
milestone_name: Full Circle
status: executing
stopped_at: Completed 29-03-PLAN.md (PLAY-01 readiness panel + PLAY-02 battle log readiness points)
last_updated: "2026-05-05T15:00:40.719Z"
progress:
  [██████████] 100%
  completed_phases: 7
  total_plans: 30
  completed_plans: 29
  percent: 97
---

---
gsd_state_version: 1.0
milestone: v2.2
milestone_name: Full Circle
status: executing
stopped_at: Completed 28-04-PLAN.md (Smoke-test verification — all 5 Phase 28 requirements auto-approved)
last_updated: "2026-05-05T14:48:31.769Z"
progress:
  [██████████] 97%
  completed_phases: 7
  total_plans: 30
  completed_plans: 28
  percent: 90
---

---
gsd_state_version: 1.0
milestone: v2.2
milestone_name: Full Circle
status: executing
stopped_at: "Completed 28-03-PLAN.md (Wave 2: KanbanCard enrichment + Log Session shortcut)"
last_updated: "2026-05-05T14:40:32.172Z"
progress:
  [█████████░] 90%
  completed_phases: 6
  total_plans: 30
  completed_plans: 26
---

---
gsd_state_version: 1.0
milestone: v2.2
milestone_name: Full Circle
status: executing
# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-05-04 after v2.3 milestone start)

**Core value:** A single personal command center that always answers "what do I own, what's painted, and what's ready to play" — without ever depending on copyrighted GW data.
**Current focus:** v2.3 Hobby Command Center — Design Foundation, Dashboard Redesign, Quick Add, page-level UX upgrades

## Current Position

Phase: 29 — Workshop + Play (plan 04 complete — ALL PLANS DONE)
Plan: 29-04 complete — Full smoke test: 561 tests pass, build clean, all 4 Phase 29 requirements verified (WKSP-01/02, PLAY-01/02). Checkpoint auto-approved.
Status: Phase 29 COMPLETE — 4/4 plans done. v2.3 Hobby Command Center milestone FULLY DELIVERED — 30/30 plans complete.

Progress: [██████████] 100% (30/30 plans complete)

## v2.3 Phase Map

| Phase | Name | Requirements | Status |
|-------|------|--------------|--------|
| 25 | Design Foundation | DSFD-01, DSFD-02, DSFD-03, DSFD-04 | Complete |
| 26 | Dashboard Redesign | DASH-01, DASH-02, DASH-03, DASH-04, DASH-05, DASH-06 | In progress (2/5) |
| 27 | Navigation & Quick Add | NAV-01, NAV-02, NAV-03 | Complete (4/4) |
| 28 | Collection + Projects | COLL-01, COLL-02, PROJ-01, PROJ-02, PROJ-03 | Complete (4/4) |
| 29 | Workshop + Play | WKSP-01, WKSP-02, PLAY-01, PLAY-02 | Complete (4/4) |

## Accumulated Context

### Phase 29 Decisions

- SwatchStrip test helper uses React.createElement (not JSX) so recipeSwatchData.test.ts stays .ts without rename — avoids spurious rename, keeps query/hook/UI tests in same file
- Palette swatch strip: h-3 w-3 rounded-full circles, -ml-1 after first item, max 8 visible with +N overflow span — overlapping circle pattern established for recipe palette display
- Wave 0 stubs omit imports of not-yet-existing modules (getRecipeSwatchColors, useRecipeSwatchData, getArmyListReadiness, useArmyListReadiness) — mirrors Phase 28 pattern; TODO comments carry exact module paths for Wave 1
- `it.skip` used (not `xit`/`xtest`) — consistent with Phase 26 Wave 0 decision; Wave 1 greps `it.skip` to find activation candidates
- PLAY-02 stubs split across two describe blocks: query/hook stubs tagged TODO Plan 29-01, UI stubs tagged TODO Plan 29-03 — matches the two-wave execution of PLAY-02
- `useRecipeSwatchData` returns `Map<recipe_id, {paint_id, hex_color}[]>` not flat array — Plan 29-02 UI renders swatch strips without extra grouping at component level
- `ARMY_LIST_READINESS_KEY` factory sorts ids before spreading — `[3,1,2]` and `[1,2,3]` resolve to same cache entry (Pitfall 7); prefix `["army-list-readiness"]` used for blanket invalidation
- `status_painting = 'Completed'` (with 'd') in SQL — canonical PAINTING_STATUS_ORDER value; 'Complete' is wrong (Pitfall 1 from RESEARCH)
- `vi.mock` factory uses inline `vi.fn()` not top-level const reference — Vitest hoists vi.mock before variable initialization causing TDZ errors
- Query SQL contract tests call `db.select` directly with expected SQL and assert on `dbSelectMock.mock.calls[0][0]` — separates SQL shape tests from hook behavior tests
- `armyListReadiness.test.ts` renamed to `.tsx` when BattleLogRow UI stubs activated (Plan 29-03) — esbuild requires .tsx for JSX syntax; consistent with Phase 28 wave-activation pattern
- `Collapsible`/`CollapsibleContent` mocked in BattleLogRow tests to avoid Radix portal issues in jsdom — BattleLogRow wraps content in Collapsible; tests need only name/readiness rendering
- `status_assembly: 1` (not string) in test makeUnit helper — ArmyListUnitRow.status_assembly is number (SQLite 0|1 integer); TypeScript strict mode caught string literal
- BattleLog has no `updated_at` column — `makeLog` test helper must not include it; `notes: null` must be explicit since it is not optional in BattleLog interface
- Checkpoint auto-approved (29-04): 561 tests pass, build green — manual smoke test auto-approved; full automated coverage provides equivalent confidence to visual verification

### Phase 28 Decisions

- stopPropagation pattern on Log Session Paintbrush button mirrors KanbanCardActions PopoverTrigger — prevents dnd-kit drag from activating on button click
- activeUnitIds memoized (useMemo) before useKanbanEnrichment call in KanbanBoard — avoids hook receiving a new array reference on every render, preventing unnecessary refetches
- enrichment passed as optional prop (enrichment?) on KanbanColumn — kanban renders correctly before hook resolves; no skeleton gating needed for enrichment data
- LogSessionSheet mounted as sibling portal after UnitSheet in PaintingProjectsPage — consistent with sibling Sheet/Dialog portal pattern (never nested inside KanbanCard or KanbanBoard)
- GalleryCardPhoto sub-component co-located in UnitGallery.tsx (not separate file) — self-contained fallback logic with useState(imgFailed) stays adjacent to the gallery rendering
- faction color applied as borderTop on placeholder div (not background) — maintains legibility of initials text against bg-panel-surface
- latestPhotos passed as optional prop (latestPhotos?) — gallery renders without photos during initial load before hook resolves
- RECIPE_SWATCH_KEY + useRecipeSwatchData added to useRecipePaints.ts — Wave 0 Phase 29 stubs referenced RECIPE_SWATCH_KEY in mutation handlers before the constant was defined; fix unblocks pnpm build
- Wave 0 stubs omit top-level imports of not-yet-existing modules — mirrors Phase 18/19/26/27 pattern; TODO Wave 1 comment blocks carry exact import paths so Wave 1 knows exactly what to uncomment
- `it.skip` used (not `xit`/`xtest`) — consistent with Phase 26 Wave 0 decision; Wave 1 greps `it.skip` to find activation candidates
- `getPhotoCountsByUnitIds` stubs appear in both collection (COLL-01) and painting (PROJ-01) test files — same function serves both gallery thumbnails and kanban card enrichment
- Wave 0 `.test.ts` stubs renamed to `.test.tsx` when activated — esbuild errors on JSX syntax in `.ts` files; renderHook wrappers require JSX
- `getAllByText` in LogSessionSheet tests — shadcn Select renders the selected value in both a visible span and a hidden native option, causing `getByText` "multiple elements" error
- `beforeEach mockReset` required in useKanbanEnrichment tests — module-level vi.fn() mocks accumulate calls across tests without explicit reset
- `LATEST_UNIT_PHOTOS_KEY` invalidated in `useDeleteUnitPhoto.onSettled` not `onSuccess` — ensures batch refresh even when optimistic delete rolls back on error
- kanban-enrichment invalidation uses literal `["kanban-enrichment"]` in useRecipes — consistent with project pattern (no cross-module KANBAN_ENRICHMENT_KEY import needed)
- `defaultUnitId` added to useEffect deps in LogSessionSheet — Pitfall 4 from plan; without it re-opening sheet for different unit would not reset the unit_id field

### Phase 27 Decisions

- Checkpoint auto-approved (27-03): 28 navigation tests all pass — human-verify smoke test skipped because automated coverage is complete
- QuickAddContext.test.tsx uses inline stub types (not direct import) — module does not exist yet; mirrors Phase 18/19 Wave 0 pattern; TODO Wave 1 comment carries exact import path `{ QuickAddProvider, useQuickAdd, QuickAddAction } from "@/context/QuickAddContext"`
- NAV-01 + NAV-02 tests use `vi.mock("@/context/QuickAddContext")` to mock the not-yet-created module — Vite resolves mocked imports even when the real file is absent; Wave 1 adds real module without changing the mock
- `_action` parameter prefix used in stub `useQuickAdd` to satisfy TypeScript `noUnusedParameters` strict mode without ESLint
- QuickAddProvider placed at main.tsx level (same as QueryProvider) — both AppSidebar and AppLayout are descendants and can call useQuickAdd()
- Radix DropdownMenuTrigger requires pointer events to open — use userEvent (pointer+mouse+click sequence) in tests, not fireEvent.click
- Existing theming/AppSidebar and app-shell/AppSidebar tests required vi.mock for QuickAddContext after AppSidebar began calling useQuickAdd()
- Factions moved from Command group to Management group alongside Spending (four distinct hobby-native groups now)
- useCallback wraps openQuickAdd and closeQuickAdd — stable references prevent unnecessary re-renders in consumers
- shadcn DropdownMenu installed via `pnpm dlx shadcn@latest add dropdown-menu` — generates Radix primitive wrapper at src/components/ui/dropdown-menu.tsx

### Phase 26 Decisions

- Wave 0 stubs use `it.skip` (not `xit`/`xtest`) — Wave 1 greps `it.skip` to find activation candidates; consistent with existing Phase 19 Wave 0 pattern
- TODO Wave 1 import comments carry exact module paths and named exports so Wave 1 knows exactly what to uncomment with no ambiguity
- Pitfall 4 (session_date YYYY-MM-DD normalize to 23:59:59) and Pitfall 5 (no battle_logs.updated_at) documented as file-level JSDoc in computeRecentActivity.test.ts — Wave 1 cannot miss them
- `u()` builder helper cloned verbatim from computeStats.test.ts into computeRecentActivity.test.ts — consistent fixture pattern across dashboard tests
- units field on ComputedDashboardStats passes same array reference (no copy/sort) — Wave 2 can use it directly as ActivityEvent source without extra memoization
- session_date normalized to `${session_date} 23:59:59` end-of-day: sessions appear after same-day battles in DESC sort, consistent with treating a session as an end-of-day activity
- `enabled: units !== undefined` (not `!units`) — empty array is valid and must not suppress the useRecentActivity query
- Invalidation wired only to useCreatePaintingSession (not useDeletePaintingSession) — dashboard unit event refresh flows through dashboard-stats invalidation on unit mutations
- ActivityEvent id prefix pattern: 'unit-added-{id}', 'unit-updated-{id}', 'session-logged-{id}', 'battle-logged-{id}' — stable React keys across all 4 event types
- LogSessionSheet uses buildDefaultValues() not zod .default() — Pitfall 8 pattern consistent with battleLogSchema/armyListSchema (react-hook-form zodResolver type inference breaks with zod v4 .default())
- HobbyPipeline derives stage counts from full units[] prop — never from sliced activeProjects/recentlyUpdated (Pitfall 6: those cap at 5 items)
- RecentActivityFeed onUnitClick wiring limited to unit_added/unit_updated — session_logged and battle_logged are non-interactive in Phase 26
- TIER_BUBBLE_CLASS 'done' tier uses bg-battle-gold/30 in HobbyPipeline — consistent with Phase 25 CSS custom property for "done" state
- allDisplayedUnits memo replaced with `stats?.units ?? []` (full array, Pitfall 3) — selectedUnit can find any unit not just those in sliced activeProjects/recentlyUpdated
- handleRowClick removed from DashboardPage (unused after DashboardListRow replaced by RecentActivityFeed); handleUnitIdClick retained for RecentActivityFeed onUnitClick prop
- DashboardListRow.tsx + statusAbbr.ts were already deleted from HEAD in commit d0e3f17 (Phase 25 Nyquist session); Task 3 confirmed zero references in src/ and tests/

### Phase 25 Decisions

- PAINTING_STATUS_TIER co-located in status-badge.tsx (not types/unit.ts) — visual tier logic is a UI concern; Phase 28 (COLL-02) imports from `@/components/ui/status-badge`
- Battle Gold value: `oklch(0.78 0.17 85)` — confirmed. Defined in `.dark` block but NOT applied in Phase 25; Phase 26+ owns application per UI-SPEC §Phase Boundary Constraints
- StatCard `progress !== undefined` guard — ensures `progress={0}` renders a 0%-wide bar (truthy check would omit it)
- StatCard `icon: Icon` destructure rename — JSX requires capitalized identifier to render a component element
- PageHeader outer className locked: `flex items-center justify-between pb-6 border-b border-border/40` — Plan 25-02 uses this verbatim for all 9 page rewrites
- Dashboard actions slot empty in Phase 25 — Phase 26 DASH-02 will add Quick Add + Log Session buttons
- FactionsPage title upgraded from text-xl (20px) to text-3xl (28px) in Plan 25-02 — intentional design system alignment
- SpendingPage PageHeader kept inside max-w-3xl wrapper per Phase 16 Pitfall 1 — border-b spans narrow column only

### Phase 20 Decisions

- Shield chosen as Factions empty-state icon (domain-appropriate: faction heraldry) replacing generic PackageOpen — aligns FactionsEmptyState with ArmyListsEmptyState / KanbanEmptyState icon-pill pattern
- upsertSyncMeta removed from datasheets.ts without replacement — Rust bulk_sync_rules in src-tauri/src/lib.rs is the sole sync-meta write path (zero JS callers confirmed by grep)
- getRulesDb import preserved in datasheets.ts after removal — still used by 4 remaining query functions (getDatasheetsByFaction, getFullDatasheet, getRulesSyncMeta, resolveWahapediaFactionIdByName)
- AddProjectPicker controlled-props with internal fallback: destructure rename (open: controlledOpen) avoids shadowing; = {} default enables uncontrolled call sites; ?? operator selects controlled vs internal state
- KanbanEmptyState CTA "Add Project" replaces "Go to Collection" — matches action that fires (picker opens, no navigation occurs); tech-debt:PaintingProjectsPage-DOM-query resolved
- DS-08 conflict props added only to populated UnitDetailSheet in DashboardPage — empty-state no-op UnitDetailSheet (open={false}) left unchanged; DatasheetImportDialog mounted as last sibling inside populated-state fragment after lightbox Dialog

### Phase 19 Decisions

- Wave 0 stubs omit top-level imports of not-yet-existing modules — TODO comment blocks used so Plan 01 knows exact imports to restore when activating (mirrors Phase 18 pattern)
- Plan 01 activation order: computeHobbyAnalytics (pure fn, no mocks) → analyticsQueries (vi.mock) → useHobbyAnalytics (single import + equality)
- recharts 3.8.0 installed via shadcn chart (newer than research estimate 2.15.x — same ChartContainer API surface, no migration needed)
- computeHobbyAnalytics placed in src/features/dashboard/ to mirror computeStats.ts (resolved RESEARCH open question 1)
- HOBBY_ANALYTICS_KEY = ['hobby-analytics'] as const — Plan 02 must invalidate this key in useJournalSessions, useUnits, usePaints mutations
- SpendTrendChart uses hsl(var(--chart-1)) via chartConfig — stable across faction theme changes (anti-pattern: faction-accent on chart bars)
- Monthly Trend skeleton is independent of hero card — analyticsLoading gates only the chart slot (Pitfall 7 pattern)
- 8 mutations now invalidate hobby-analytics using literal ['hobby-analytics'] array — matches existing project pattern (no HOBBY_ANALYTICS_KEY import)
- HOBBY HEALTH section uses grid-cols-2 (distinct from Progress grid-cols-3); animate={false} on both StatCards

### Phase 18 Decisions

- Wave 0 stubs omit top-level imports entirely (modules don't exist yet) — TODO comment blocks used so Plan 01 knows exact imports to restore when activating; pattern mirrors Phase 15 datasheet stubs
- Battle Log stubs cover full-replacement UPDATE pitfall (Pitfall 5): BATTLE-02 stub names it explicitly so Plan 01 knows to avoid COALESCE for army_list_id, mvp_unit_id, underperforming_unit_id
- Full-replacement UPDATE in updateBattleLog (NOT COALESCE) for army_list_id/mvp_unit_id/underperforming_unit_id — enables clearing nullable FKs back to NULL (Pitfall 5); verified by test
- Cache keys: ['battle-logs'] for index, ['battle-logs', 'summary'] for aggregated summary — matches useArmyLists convention
- All mutations invalidate ['dashboard-stats'] for forward-compat with future dashboard win/loss totals
- battleLogSchema avoids zod .default() — same as armyListSchema; react-hook-form zodResolver type inference breaks with zod v4 .default()
- Dialog (not AlertDialog) used for BattleLogDeleteDialog — alert-dialog not installed; fallback to existing dialog with destructive Button per UI-SPEC §alternative
- armyListNameById and unitNameById built as Map<number,string> in useMemo — O(1) lookup for name resolution in BattleLogRow props
- battleLogRoute slots between spendingRoute and settingsRoute in routeTree addChildren array
- TRACKING_NAV is now 3 entries: Army Lists → Battle Log (Swords plural icon) → Spending

### Key Decisions for v2.2

- migration 007 covers: ALTER TABLE units ADD COLUMN lore_notes TEXT, ADD COLUMN undercoat TEXT; ALTER TABLE factions ADD COLUMN lore_notes TEXT; ALTER TABLE paints ADD COLUMN purchase_date TEXT
- wishlist_items table = migration 008; hobby_goals table = migration 009 (append-only discipline)
- ANLY-02 goal progress: COUNT(DISTINCT unit_id) from painting_sessions WHERE session_date falls within goal timeframe
- ANLY-05 streak: consecutive calendar days with at least one painting session — use dates.ts to avoid UTC edge case

### Phase 15 Decisions

- Dual-DB migration chaining: add_migrations() can be chained per connection string; version sequences are independent per tauri-plugin-sql (rules.db v1 does not conflict with hobbyforge.db v7)
- No REFERENCES clause in 007_datasheet_link.sql — SQLite cannot enforce FK constraints across database files; cross-DB links enforced at application level only
- HTTP capability requires BOTH string "http:default" AND scoped object { identifier: "http:default", allow: [{ url: "https://wahapedia.ru/*" }] } in capabilities/default.json
- shadcn collapsible (2025) imports from unified `radix-ui` package, not `@radix-ui/react-collapsible` — new registry format
- tauri_plugin_http::init() must appear BEFORE SQL plugin in lib.rs builder chain
- parseWahapediaCsv: raw.trim().split('\n') + Object.fromEntries handles trailing-pipe rows via empty-string key (no special case needed)
- stripHtml: 6 chained .replace() in strict order (tags → named entities → numeric entities → trim) avoids jsdom dependency per RESEARCH §Pitfall 4
- Cross-DB query module: datasheets.ts spans rules.db (rw_* reads/writes) AND hobbyforge.db (unit_strategy_notes link write) — keeps datasheet feature cohesive at cost of two DB clients
- upsertDatasheetLink uses select-then-insert/update pattern (mirrors strategyNotes.ts) — unit_strategy_notes has no UNIQUE INDEX on unit_id so ON CONFLICT unavailable
- getRulesSyncMeta try/catch swallows "no such table: rw_sync_meta" — tolerates empty rules.db before first sync (Pitfall 3)
- INSERT OR IGNORE on rw_datasheet_models and rw_datasheet_abilities handles Wahapedia duplicate (datasheet_id, line) PKs — keeps first occurrence, avoids transaction crash
- Promise.all fetches all 7 CSVs in parallel before opening transaction — no partial-write risk since all data is ready before BEGIN
- DatasheetImportResolution hardcoded default { M:'use', T:'use', ... } in handleConfirm covers all 8 keys even when conflicts array is a subset
- onClose (not onSkip) on DatasheetPicker — consistent naming with DatasheetImportDialog and Dialog onOpenChange delegation pattern

### Phase 16 Decisions

- pnpm is the package manager for this project — npm fails with workspace: protocol errors from pnpm symlinks; always use `pnpm add` / `pnpm install`
- Tailwind v4 CSS-first font integration: @import in globals.css + --font-sans in @theme inline {} block + body font-family var() — no tailwind.config.js
- Geist Variable font installed as @fontsource-variable/geist@5.2.8; font-family name in CSS must be 'Geist Variable' (not 'Geist Sans' or 'Geist')
- Sword (singular) replaces Swords (plural) in AppSidebar — different lucide-react icons; singular matches UI-SPEC §Sidebar Polish Contract
- Nav groups: Factions belongs in MANAGE_NAV (per RESEARCH §Open Question 3); INVENTORY_NAV has Paints + Recipes; TRACKING_NAV has Army Lists + Spending
- NavItem active state: bg-faction-accent font-semibold text-white — font-medium eliminated per Phase 16 weight scale
- StatCard is static display card — shadow-sm with NO hover:shadow-md (Pattern 5 anti-pattern enforced)
- UnitGallery painting percentage text span added below PaintingRing with tabular-nums (was not previously rendered as plain text)
- hover:bg-muted/50 removed from UnitGallery CARD_CLASSES, replaced with hover:shadow-md transition-shadow duration-150
- Page header contract (text-3xl font-semibold tracking-tight + subtitle + pb-6 border-b border-border/40) applied to all Dashboard render branches and CollectionPage
- PlaybookTab tabular-nums applied via Pattern B (single span inside STAT_KEYS.map) — one edit covers all six stat values (M/T/Sv/W/Ld/OC)
- SpendingPage header inserted INSIDE max-w-3xl wrapper (Pitfall 1) — border-b spans only narrow content column, not full window
- Spending Breakdown h2 downgraded from text-xl (20px) to text-base (16px) per Phase 16 size scale (only 14/16/28px allowed)
- SpendingPage isEmpty guard checks all three spend sources before rendering empty state vs data view
- ArmyListCard interactive card pattern: bg-card border border-border/60 shadow-sm hover:shadow-md transition-shadow duration-150 (replaces hover:bg-muted/50)
- DashboardEmptyState is a full welcome-screen replacement (Pitfall 3): Sword + HobbyForge wordmark side-by-side, gap-6, text-faction-accent — NOT the standard icon-pill pattern used by all other empty states
- KanbanEmptyState keeps onAddProject prop wiring (fragile DOM query from PaintingProjectsPage) — only button text changed to 'Go to Collection' per UI-SPEC; tech-debt fix deferred
- CollectionEmptyState prop interface preserved byte-for-byte: onAdd (not onAddUnit) + onClearFilters — callers require no changes
- Swords (plural, crossed-blades) used for ArmyListsEmptyState — distinct from Sword (singular) used in sidebar wordmark and DashboardEmptyState
- British 'colour' spelling preserved in RecipeEmptyState helper text per UI-SPEC §Copywriting Contract (user is Belgian/European)

### Decisions Carried from v2.1

- All queries via `tauri-plugin-sql` directly — no ORM
- `0|1` integer discipline for SQLite booleans
- All new query modules go to `src/db/queries/` — never import DB in UI
- All new hook modules go to `src/hooks/` — components call hooks only
- Sibling Sheet/Dialog portal pattern — never nest Radix portals
- selectedUnitId pattern for any page that opens a detail Sheet
- Migrations are append-only and immutable — new columns always via ALTER TABLE in a new numbered file
- Integer pence discipline (formatCurrency is the only /100 site)

### Roadmap Evolution

- Phase 24 added: Collection unit point calculator with wargear selection and swap delta preview
- Phases 25–29 added: v2.3 Hobby Command Center roadmap created 2026-05-04

### Tech Debt

- PROJ-02: REQUIREMENTS.md text still says "empty columns hidden" — KanbanBoard ships all 11 columns (approved UX)

### Pending Todos

None blocking.

### Open Blockers

None.

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 260504-lhf | Rebuild release exe to fix desktop shortcut (migration version mismatch crash) | 2026-05-04 | 382aced | [260504-lhf-the-shortcut-isn-t-working-anymore](./quick/260504-lhf-the-shortcut-isn-t-working-anymore/) |

## Session Continuity

Last session: 2026-05-05T16:11:09.965Z
Stopped at: Phase 22 context gathered
Resume: Phase 29 is COMPLETE (4/4 plans done). All WKSP + PLAY requirements green. v2.3 Hobby Command Center milestone FULLY DELIVERED — 30/30 plans complete. All phases 25-29 complete.
