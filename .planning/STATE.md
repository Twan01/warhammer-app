---
gsd_state_version: 1.0
milestone: v2.1
milestone_name: Visual Command
status: executing
stopped_at: Completed 18-00-PLAN.md
last_updated: "2026-05-04T09:19:00.000Z"
last_activity: "2026-05-04 — Phase 18 Plan 00 complete: Wave 0 stub tests for Battle Log (14 it.skip stubs)"
progress:
  total_phases: 13
  completed_phases: 4
  total_plans: 43
  completed_plans: 36
  percent: 84
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-05-04 after v2.2 milestone start)

**Core value:** A single personal command center that always answers "what do I own, what's painted, and what's ready to play" — without ever depending on copyrighted GW data.
**Current focus:** v2.1 finishing (Phases 14–16) then v2.2 Full Circle (Phases 17–22)

## Current Position

Phase: 18 of 22 (Battle Log — 1/4 plans complete)
Plan: 18-01 (next plan)
Status: In progress
Last activity: 2026-05-04 — Phase 18 Plan 00 complete: Wave 0 stub tests for Battle Log (14 it.skip stubs, BATTLE-01..05 named)

Progress: [████████░░] 84% (36/43 plans complete)

## v2.2 Phase Map

| Phase | Goal | Requirements |
|-------|------|--------------|
| 17. Schema Foundation + Enrichment | Migration 007 + dates.ts utility + lore/undercoat UI | ENRCH-01..04 |
| 18. Battle Log | Battle log CRUD page (schema already in migration 001) | BATTLE-01..05 |
| 19. Analytics Core | Velocity + streak on Dashboard + spend chart on Spending page | ANLY-04..07 |
| 20. Wishlist | New wishlist_items table + CRUD page | WISH-01..04 |
| 21. Hobby Goals | New hobby_goals table + progress from session history | ANLY-01..03 |
| 22. Display Features | Battle Ready filter + Showcase Mode fullscreen | DISP-01..03 |

Architecture constraints:
- Phase 17 is prerequisite for ALL v2.2 analytics (dates.ts utility needed by Phases 19 + 21)
- Phase 18 is UI-only — battle_logs table already exists in 001_core_schema.sql; NO migration needed
- Phase 19 requires `npx shadcn@latest add chart` + package.json `react-is ^19.0.0` override
- Phase 22 Showcase Mode uses `getCurrentWindow().setFullscreen(true)` from @tauri-apps/api (already installed)
- All analytics queries go in new `src/db/queries/analytics.ts` with key `["hobby-analytics"]`

## Accumulated Context

### Phase 18 Decisions

- Wave 0 stubs omit top-level imports entirely (modules don't exist yet) — TODO comment blocks used so Plan 01 knows exact imports to restore when activating; pattern mirrors Phase 15 datasheet stubs
- Battle Log stubs cover full-replacement UPDATE pitfall (Pitfall 5): BATTLE-02 stub names it explicitly so Plan 01 knows to avoid COALESCE for army_list_id, mvp_unit_id, underperforming_unit_id

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

### Decisions Carried from v2.1

- All queries via `tauri-plugin-sql` directly — no ORM
- `0|1` integer discipline for SQLite booleans
- All new query modules go to `src/db/queries/` — never import DB in UI
- All new hook modules go to `src/hooks/` — components call hooks only
- Sibling Sheet/Dialog portal pattern — never nest Radix portals
- selectedUnitId pattern for any page that opens a detail Sheet
- Migrations are append-only and immutable — new columns always via ALTER TABLE in a new numbered file
- Integer pence discipline (formatCurrency is the only /100 site)

### Tech Debt

- PROJ-02: REQUIREMENTS.md text still says "empty columns hidden" — KanbanBoard ships all 11 columns (approved UX)
- PaintingProjectsPage empty-state CTA uses fragile DOM query — replace with useState pattern

### Pending Todos

None blocking.

### Open Blockers

None.

## Session Continuity

Last session: 2026-05-04T09:19:00.000Z
Stopped at: Completed 18-00-PLAN.md
Resume: Run `/gsd:execute-phase 18` to execute Plan 18-01
