---
gsd_state_version: 1.0
milestone: v2.2
milestone_name: Full Circle
status: planning
stopped_at: Phase 26 context gathered
last_updated: "2026-05-04T19:49:47.320Z"
last_activity: 2026-05-04 — v2.3 roadmap created, 22 requirements mapped to 5 phases
progress:
  total_phases: 12
  completed_phases: 3
  total_plans: 11
  completed_plans: 9
  percent: 0
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-05-04 after v2.3 milestone start)

**Core value:** A single personal command center that always answers "what do I own, what's painted, and what's ready to play" — without ever depending on copyrighted GW data.
**Current focus:** v2.3 Hobby Command Center — Design Foundation, Dashboard Redesign, Quick Add, page-level UX upgrades

## Current Position

Phase: 25 — Design Foundation (not started)
Plan: —
Status: Roadmap created — ready to plan Phase 25
Last activity: 2026-05-04 — v2.3 roadmap created, 22 requirements mapped to 5 phases

Progress: [░░░░░░░░░░] 0% (0/5 v2.3 phases complete)

## v2.3 Phase Map

| Phase | Name | Requirements | Status |
|-------|------|--------------|--------|
| 25 | Design Foundation | DSFD-01, DSFD-02, DSFD-03, DSFD-04 | Not started |
| 26 | Dashboard Redesign | DASH-01, DASH-02, DASH-03, DASH-04, DASH-05, DASH-06 | Not started |
| 27 | Navigation & Quick Add | NAV-01, NAV-02, NAV-03 | Not started |
| 28 | Collection + Projects | COLL-01, COLL-02, PROJ-01, PROJ-02, PROJ-03 | Not started |
| 29 | Workshop + Play | WKSP-01, WKSP-02, PLAY-01, PLAY-02 | Not started |

## Accumulated Context

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

Last session: 2026-05-04T19:49:47.316Z
Stopped at: Phase 26 context gathered
Resume: Phase 25 Design Foundation is next. Run `/gsd:plan-phase 25` to break down Phase 25.
