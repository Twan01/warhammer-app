# Project Research Summary — v1.1

**Project:** HobbyForge v1.1 — Paint Inventory UI, Army List Builder, Unit Playbook
**Domain:** Local-first Windows desktop hobby tracker (Tauri + React + SQLite)
**Researched:** 2026-05-01
**Confidence:** HIGH (stack + architecture verified against official sources; features surveyed against real competing tools; pitfalls cross-validated across GitHub issues, official docs, and legal sources)

---

## Executive Summary

HobbyForge is a personal Windows desktop app built on Tauri 2.x + React 19 + SQLite. It is the kind of product where the entire tech stack is well-understood and the risks are almost entirely in setup decisions and data discipline, not in architectural complexity. The four research streams converge on a single clear approach: `tauri-plugin-sql` with raw typed query functions for v1, TanStack Query as the data cache layer, react-hook-form + Zod for all forms, and shadcn/ui on Tailwind v4 for the component layer. This is a solved problem with documented community patterns — the main trap is ignoring those patterns and reaching for Prisma or Node.js-native libraries that structurally cannot work inside Tauri's WebView runtime.

The highest-risk item is not technical: it is the GW intellectual property question around seed data. ROADMAP.txt section 13 specifies faction names ("Tau Empire", "Ultramarines", "Necrons", "Tyranids") and unit names ("Tau Fire Warriors", "Crisis Battlesuits", "Necron Warriors", "Ultramarines Intercessors") as seed data. These are registered GW trademarks. The Pitfalls research flagged this as a project-killer legal risk if the app is ever shared or distributed — even as a packaged binary given to a single friend. This decision must be made explicitly before Phase 1 schema work begins, as seed data is baked into the migration runner and shipped in the binary. The PROJECT.md currently lists these names in the "Active" requirements checklist, which is a conflict with the legal constraint stated in the same file.

Two secondary decisions need resolution before coding starts. First, the ORM question: Stack recommends Drizzle ORM in sqlite-proxy mode; Architecture recommends raw typed query functions in `src/db/queries/` for v1 simplicity. Both are correct for different reasons — this summary reconciles them with a concrete v1 recommendation below. Second, the Kanban drag-and-drop question: Stack recommends @dnd-kit; Pitfalls recommends deferring DnD entirely for Phase 3 and using a button/dropdown for status changes instead. Both are right — this summary resolves the conflict with a phased approach.

---

## Resolved Cross-Cutting Conflicts

These six conflicts surfaced across multiple research files and must be decided before implementation begins.

### 1. ORM Decision: Drizzle vs Raw Queries for v1

**Conflict:** Stack research recommends Drizzle ORM in sqlite-proxy mode. Architecture research recommends raw typed query functions via `tauri-plugin-sql` directly, calling Drizzle the "viable ORM path" but noting "for a personal tool with a stable schema, raw typed query functions are simpler."

**Resolution — Recommendation: Raw typed query functions for v1; Drizzle upgrade path documented.**

Raw queries via `tauri-plugin-sql` in `src/db/queries/*.ts` is the correct v1 choice for HobbyForge:

- The schema is stable and defined upfront (10 tables, well-understood domain)
- Raw functions have zero abstraction overhead and zero proxy-setup risk
- Drizzle's sqlite-proxy pattern requires a custom migration runner (~50 lines), a SELECT/execute routing proxy, and `import.meta.glob` for SQL bundling — three new integration points that can each fail silently
- The fallback path if Drizzle proves too complex is identical to raw queries anyway
- Architecture's `getDb()` singleton + `src/db/queries/*.ts` function modules IS the correct pattern regardless of ORM

Install Drizzle only for schema documentation and migration file generation via `drizzle-kit generate`; do not run it at runtime in v1. If the schema grows significantly in v2 (dynamic query composition, complex joins across 6+ tables), migrate to Drizzle proxy mode then.

**Prisma is settled: never install it.** All three research files (Stack, Architecture, Pitfalls) independently confirmed Prisma as a project-killer in Tauri production builds. Treat `tauri-plugin-sql` as the default, not a fallback.

### 2. GW IP in Seed Data — Roadmap-Blocking Decision Required

**Conflict:** ROADMAP.txt section 13 and PROJECT.md's "Active" requirements both specify GW faction names, unit names, and paint names (e.g., "Citadel Nuln Oil", "Macragge Blue") as seed data. Pitfalls research flags these as registered GW trademarks — distributing them in a packaged binary constitutes shipping copyrighted content.

**This is a user decision, not a technical one. Implementation cannot begin on Phase 1 seed migrations until it is resolved.**

Three options:

| Option | Description | Legal Risk | Cold-Start UX |
|--------|-------------|------------|---------------|
| A. No seed data | First launch shows empty state with onboarding prompts | None | Poor — user must manually set up before seeing value |
| B. Debug-only seed (never ships) | GW names gated by `cfg!(debug_assertions)` on Rust side; production binary has no seed data | None | Same as Option A for end users |
| C. Fictional placeholder seed data | Non-GW names: "Azure Vanguard", "Iron Shroud Collective", "Crimson Plague Bearers", "Hive Fleet Veridian" | None | Good — demonstrates app value without GW IP |

**Recommendation: Option C (fictional placeholders) for production seed data, with Option B available as a developer convenience tool.** This preserves the cold-start UX benefit the features research identified while eliminating legal exposure. The app's value proposition is about structure and workflow, not about GW's specific names.

Paint names (e.g., "Nuln Oil", "Macragge Blue") are also GW trademarks. Seed the paints table with generic descriptions: "Black Wash", "Ultramarine Blue Base", "Silver Metallic" — or leave it empty and let the user populate it.

### 3. SQLite Foreign Key Pragma — Phase 1 Acceptance Criterion

**Gap in Architecture research:** The architecture document did not flag the FK pragma. Pitfalls research flagged it as a silent project killer.

**Resolution:** `PRAGMA foreign_keys = ON` must run on every connection before any CRUD is built. Enforce it in the `getDb()` singleton immediately after `Database.load()`:

```typescript
// src/db/client.ts
export async function getDb(): Promise<Database> {
  if (!_db) {
    _db = await Database.load('sqlite:hobbyforge.db')
    await _db.execute('PRAGMA foreign_keys = ON')
  }
  return _db
}
```

**Add to Phase 1 acceptance criteria:** "Test: deleting a faction that has units returns an error (not a silent success). Orphaned rows are not created."

### 4. Phase 1 Schema Scope — Recommend Expanding Beyond Active Feature Tables

**Conflict:** PROJECT.md scopes Phase 1 to five tables (factions, units, paints, painting_recipes, recipe_paints). Both FEATURES.md and ARCHITECTURE.md recommend creating the full schema in Phase 1, including deferred tables (army_lists, army_list_units, unit_strategy_notes, battle_logs, image_assets).

**Resolution: Expand Phase 1 to create all 10 tables upfront.**

Rationale:
- Schema creation is a one-line SQL statement; the cost is near zero
- Deferring table creation forces schema migrations on user data later — the one operation most likely to cause data loss
- `tauri-plugin-sql` migrations are append-only and immutable once applied; adding tables in later migrations to an existing database is more fragile than creating them empty upfront
- Empty tables have no performance cost in SQLite at HobbyForge's data scale

**Updated Phase 1 scope:** CREATE all 10 tables in `001_core_schema.sql`. Seed data in separate migration files (`002_` onward). CRUD query functions and UI built only for factions, units, paints, recipes in Phase 1. Army lists, strategy notes, battle logs remain schema-only until their respective phases.

Do NOT create the `model_instances` table in Phase 1. Pitfalls research correctly identified this as premature — it creates migration complexity for a feature with no delivery timeline.

### 5. Dark Mode FOUC — Phase 0 Fix (Trivial, Commonly Missed)

**Issue:** Pitfalls flagged this as HIGH severity. Architecture and Stack did not mention it.

**Fix:** Add one line to `index.html` `<head>` before any stylesheet link. Since HobbyForge is dark-mode-first with no light toggle in v1, this is a static script:

```html
<head>
  <script>document.documentElement.classList.add('dark')</script>
  <link rel="stylesheet" href="/src/styles/globals.css" />
</head>
```

**Add to Phase 0 acceptance criteria:** "Launch the built binary. No white flash visible on cold start."

### 6. Kanban Drag-and-Drop — Defer DnD, Validate Interaction Model First

**Conflict:** Stack recommends @dnd-kit/core + @dnd-kit/sortable for the Kanban board. Pitfalls recommends deferring DnD entirely and using a button/dropdown for Phase 3 status changes.

**Resolution: Both are correct. Ship button/dropdown in Phase 3; add @dnd-kit as a Phase 3.x polish task if needed.**

Rationale:
- DnD has non-trivial setup and can conflict with Radix focus trapping inside shadcn/ui components
- The core workflow value (moving a unit between painting stages) is entirely achievable with an inline select or "Move to" button on each Kanban card
- DnD adds interaction polish but zero additional data capability
- @dnd-kit is the correct library choice IF DnD is added — the shadcn reference implementation (@Georgegriff/react-dnd-kit-tailwind-shadcn-ui) exists and resolves the Radix conflict
- This is a scope decision, not a research risk

**Phase 3 Kanban:** Implement with status-change button/dropdown. Label columns by painting stage. Do not implement drag interaction. Document "drag-and-drop polish" as Phase 3.x.

---

## Key Findings

### Recommended Stack

The stack is definitively settled. All four research files agree on the core layer. No further technology evaluation is needed before implementation begins.

**Core technologies:**

| Technology | Version | Purpose | Why |
|-----------|---------|---------|-----|
| Tauri | 2.10.3 | Desktop shell + Rust backend | Active weekly releases; smaller binary than Electron; required for SQLite plugin |
| React | 19.x | UI framework | Ships with Tauri React template; all shadcn components updated for React 19 |
| TypeScript | 5.x | Type safety across all layers | Non-negotiable for keeping query types, form types, and DB schema in sync |
| Vite | 6.x | Build tool | Default in Tauri React template; required by shadcn CLI |
| Tailwind CSS | 4.2.4 | Styling | v4 stable (Jan 2025); shadcn CLI v4 explicitly targets it; CSS-first, no config file |
| shadcn/ui | CLI v4 | UI components | March 2026 CLI; natively supports Tailwind v4 + React 19; copied into project so version is locked |
| @tauri-apps/plugin-sql | 2.3.2 | SQLite runtime access from WebView | Official Tauri plugin; resolves to AppData automatically; no Node.js required |
| TanStack Router | 1.168.x | Client-side routing | Full TypeScript type safety on params; replaces React Router for greenfield 2025/2026 projects |
| TanStack Query | 5.100.x | Data cache layer | All DB reads go through useQuery; mutations call invalidateQueries; loading/error states for free |
| react-hook-form | 7.73.1 | Form state | Uncontrolled inputs; integrates with shadcn Form primitives; use for every CRUD form |
| Zod | 4.3.6 | Schema validation | RHF resolver + runtime type guard for DB results |
| Zustand | 5.0.12 | Ephemeral UI state | Sidebar tabs, filter state not persisted to URL |
| TanStack Table | 8.21.3 | Headless table | Collection page, paint inventory; pairs naturally with shadcn Table |
| @dnd-kit | 6.3.1 | Drag-and-drop | Ready to install if DnD is added to Kanban in Phase 3.x |

**What NOT to use:** Prisma (production build freezer), better-sqlite3 (requires Node.js runtime), Redux (unnecessary for single-user local app), tailwindcss-animate (replaced by tw-animate-css in Tailwind v4), React Router v7 in library mode (type safety requires framework mode).

### Expected Features

HobbyForge's market position is unique: no existing tool covers collection + painting stages + paint recipes linked to owned paints + army readiness in a local-first, no-account, desktop app. The closest competitor (Liber Pigmenta) requires a cloud account and is mobile-only. This positioning is validated; the features research confirms the integration of these pillars IS the product.

**Must have (table stakes for v1):**
- Unit CRUD with faction, category, model count, all status fields, points, notes
- Painting status stages per unit (11 stages: Not Started through Completed)
- Manual painting percentage field
- Filter/search collection by faction, status, category
- Active project flag per unit
- Painting Projects Kanban (status-grouped cards, active-only filter)
- Faction CRUD with color theme
- Paint CRUD (schema + basic UI; dedicated inventory page deferred to Phase 4)
- Running-low and wishlist flags on paints
- Painting recipe CRUD with step fields and faction/unit linkage
- Recipe-paint join table (which paints are used per recipe step)
- Data persistence across restarts
- Dark-mode-first UI with faction-colored accents
- Seed data demonstrating app structure (fictional names -- see GW IP decision)

**Should have (differentiators):**
- Recipe-to-owned-paint linkage with visual indicator for unowned paints in recipe steps
- Progress bars per unit AND per faction aggregate (points-based)
- Inline quick status update from collection table (not 3-click navigation)
- Faction-colored accents in sidebar/cards tied to the user's actual armies
- Tutorial link field per recipe
- "Lessons learned" notes field per unit

**Defer to v2+:**
- Dedicated Paint Inventory page (Phase 4 -- schema in v1, UI after)
- Army List Builder (Phase 5), Strategy Notes UI (Phase 6), Battle Log (Phase 7)
- Photo upload and progress timelines (Phase 8)
- Backup / JSON export / import (Phase 9)
- AI features (V3), barcode scanning, social features, cloud sync -- never in scope

### Architecture Approach

The architecture is a four-layer stack with hard boundaries: React components talk only to TanStack Query hooks; hooks talk only to typed function modules in `src/db/queries/`; query functions talk only to the `getDb()` singleton via `@tauri-apps/plugin-sql`; the plugin bridges to Rust sqlx which executes against the SQLite file. No layer skips another. Custom Rust `#[tauri::command]` handlers are not needed for CRUD -- the plugin-sql bridge handles it directly from TypeScript. Migrations live in `src-tauri/migrations/*.sql` files loaded at compile time via `include_str!()` in Rust, registered with `tauri-plugin-sql`'s migration runner, and executed automatically on startup via the `plugins.sql.preload` config.

**Major components and responsibilities:**

1. **`src/db/client.ts`** -- `getDb()` singleton; only place `Database.load()` is called; enforces FK pragma on first connection
2. **`src/db/queries/*.ts`** -- one module per entity (factions, units, paints, recipes, recipePaints); typed async functions; only callers of `getDb()`
3. **`src/hooks/use*.ts`** -- TanStack Query wrappers per entity; define query keys; handle invalidation on mutation; only callers of query functions
4. **`src/features/*/`** -- feature-folder components; import hooks, never query functions directly; use shadcn/ui + common components for UI
5. **`src-tauri/migrations/*.sql`** -- append-only numbered SQL files; compiled into binary via `include_str!()`; managed by tauri-plugin-sql's internal `_sqlx_migrations` table
6. **TanStack Query client** -- configured with desktop defaults: `staleTime: 5min`, `gcTime: 10min`, `refetchOnWindowFocus: false`

Cross-feature data sharing: via hooks and types only. Feature A never imports Feature B's components. Shared UI goes in `src/components/common/`.

### Critical Pitfalls

1. **Prisma in Tauri production builds = silent failure.** The WASM binary engine cannot be resolved by Tauri's embedded asset server. Works in `tauri dev`, fails or freezes after `tauri build`. Do not install Prisma. Go directly to `tauri-plugin-sql`. (Stack, Architecture, Pitfalls -- unanimous)

2. **SQLite FK pragma is off by default on every connection.** `REFERENCES` constraints in DDL are accepted but never enforced unless `PRAGMA foreign_keys = ON` is run. Tauri-plugin-sql does not do this automatically. Enforce it in `getDb()` immediately after `Database.load()`. Add FK enforcement to Phase 1 acceptance criteria with an explicit test.

3. **GW IP in seed data is legal exposure.** ROADMAP.txt section 13's faction/unit/paint names are GW trademarks. Shipping them in any packaged binary -- even given to one person -- constitutes distribution of copyrighted content. User must decide before Phase 1 begins.

4. **Dev/production database path divergence.** Always use `sqlite:hobbyforge.db` (name-only, not absolute path) and call `create_dir_all(app.path().app_data_dir())` in Rust `setup()` before plugin init. Verify with a production build before Phase 2.

5. **Dark mode FOUC on cold start.** React applies the `dark` class after hydration, causing a white flash at every app launch. Fix in Phase 0 with a blocking inline `<script>` in `index.html` `<head>`: `document.documentElement.classList.add('dark')`.

6. **Tauri capabilities JSON must grant SQL permissions explicitly.** `sql:allow-execute` is not in the default capability set. All DB write calls fail silently without it. Add `sql:allow-load`, `sql:allow-select`, `sql:allow-execute`, `sql:allow-close` to `src-tauri/capabilities/default.json` in Phase 0.

7. **Migrations are immutable once applied.** Editing an applied migration does not re-run it. Adding a new column requires a new `ALTER TABLE` migration. DROP + CREATE destroys user data. Establish append-only discipline before any real data exists.

---

## Implications for Roadmap

### Phase 0: App Shell + Foundation Decisions

**Rationale:** Nothing can be built without the desktop shell and confirmed plumbing. Several decisions made here are irreversible.

**Delivers:** Desktop app launches. Sidebar navigates. SQLite file appears in correct AppData location. Dark mode works without FOUC.

**Must do in Phase 0:**
- FK pragma wired into getDb() singleton
- All four SQL permissions in src-tauri/capabilities/default.json
- create_dir_all(app_data_dir()) in Rust setup() before plugin init
- plugins.sql.preload entry in tauri.conf.json
- Inline dark class script in index.html before stylesheet
- All expected shadcn/ui components added in one session (Table, Dialog, Sheet, Drawer, Badge, Progress, Select, Form, Command)
- TanStack Query client configured with desktop defaults

**Acceptance criteria additions (beyond ROADMAP.txt):**
- Production binary places database in APPDATA/[app]/ not project directory
- No white flash on cold start in production binary
- sql:allow-execute confirmed working (insert a test row, see it persist)

**Research flag:** Standard patterns -- no further research needed.

---

### Phase 1: Database Schema + Core CRUD

**Rationale:** Data layer must precede all UI. Schema must be complete before any queries are written. Creating all 10 tables now avoids migrations-on-user-data later.

**Delivers:** All 10 tables created. FK enforcement verified. Seed data in place (fictional names). CRUD query functions and hooks for factions, units, paints, recipes.

**Expanded scope vs PROJECT.md:** Create all 10 tables in Phase 1 (factions, units, paints, painting_recipes, recipe_paints, army_lists, army_list_units, unit_strategy_notes, battle_logs, image_assets). Do NOT create model_instances. CRUD UI only for the 5 active-phase entities; remaining tables are schema-only.

**Must do in Phase 1:**
- 001_core_schema.sql: all 10 tables, FK constraints, unit.category as VARCHAR (not enum), painting status stored with a PAINTING_STATUS_ORDER constant in TypeScript
- 002_seed_*.sql: fictional placeholder factions/units/paints
- src/db/client.ts with getDb() + FK pragma
- src/db/queries/ modules for factions, units, paints, recipes, recipePaints
- src/hooks/ TanStack Query wrappers per entity

**Acceptance criteria additions (beyond ROADMAP.txt):**
- FK enforcement: deleting a faction with units returns an error, not silent success
- Seed data file: grep for GW proper nouns (Tau, Ultramarine, Necron, Tyranid, Nuln, Macragge) returns empty
- Migrations are numbered append-only from day one; no migration edits after first run
- model_instances table does NOT exist in the schema

**Blocking decision before this phase:** GW IP in seed data -- must be resolved before seed SQL is written.

**Research flag:** Standard patterns -- no further research needed.

---

### Phase 2: Collection Module

**Rationale:** Factions + units data layer must be stable first. Collection page is the primary user-facing workflow and unlocks all downstream features.

**Delivers:** Filterable unit table, unit detail drawer, unit create/edit/delete, quick status update, progress bars per unit.

**Key interactions to validate:** Inline status update from collection table (1-2 clicks max); filter state in Zustand (recommended for ephemeral filters not persisted to URL).

**Pitfalls to avoid:**
- Form state stale between edit sessions -- use key={unit.id} on form components
- TanStack Query invalidation scope: status update should invalidate both units and dashboard-stats query keys

**Research flag:** Standard patterns -- no further research needed.

---

### Phase 3: Painting Module (Kanban + Recipes)

**Rationale:** Depends on Phase 2 (unit status field + is_active_project flag established). The painting workflow is the heart of the v1 MVP.

**Delivers:** Active painting projects Kanban grouped by status, status change interactions, recipe CRUD with step fields, recipe-paint linkage with owned/missing paint indicator.

**Kanban implementation (resolved):** Button/dropdown for status changes, not drag-and-drop. Columns are visual groups. DnD can be added as Phase 3.x if the workflow feels incomplete after real usage.

**Must do in Phase 3:**
- Kanban columns ordered by PAINTING_STATUS_ORDER constant (not alphabetical)
- Status change via dropdown on card or Move to button
- Only is_active_project = true units shown
- RecipePaintLinker.tsx: visual indicator for unowned paints in recipe steps
- Recipes linked to factions and optionally units
- Tutorial link field (URL, renders as hyperlink)

**Research flag:** Standard patterns -- no further research needed.

---

### Phase 4: Paint Inventory UI

**Rationale:** Paint schema and CRUD exist since Phase 1. This phase adds the dedicated inventory page after recipe-paint linkage is stable.

**Delivers:** Dedicated paint inventory table with brand/type/color-family filters, running-low view, wishlist view, used-in-recipes back-link per paint.

**Pitfall:** Implement pagination (50/page) as the default. Add @tanstack/react-virtual only if the user explicitly wants show-all with 150+ paints.

**Research flag:** Standard patterns -- no further research needed.

---

### Phases 5-7: Army Lists, Strategy Notes, Battle Logs

**Rationale:** Schema exists since Phase 1. Build in this order: Army Lists (Phase 5) then Strategy Notes (Phase 6, integrated into unit detail) then Battle Log (Phase 7, depends on army list linkage).

**Research flag:** Standard CRUD + table patterns. No deeper research needed unless battle analytics requirements expand significantly.

---

### Phases 8-9: Images + Backup/Export

**Rationale:** Polish phases. Image storage requires @tauri-apps/plugin-fs and thumbnail generation logic -- the only technically novel work remaining after Phase 3.

**Research flag:** Phase 8 (image storage + thumbnail generation in Tauri) benefits from targeted research when the phase begins.

---

### Phase Ordering Rationale

- Schema before UI: All 10 tables in Phase 1 avoids ALTER TABLE / data migration on user data. Empty tables cost nothing; missing tables cost a migration.
- FK pragma before any CRUD: Silent data corruption from orphaned rows is unrecoverable. The pragma must be in getDb() before the first INSERT.
- GW IP decision before seed migrations: Seed data is baked into the migration runner and shipped in the binary. Must be resolved before writing seed SQL.
- DnD deferred: Reduces Phase 3 scope by approximately 30-40% while delivering identical data capability.
- Recipes after collection: Recipe utility is zero without owned paints and linked factions/units.

### Research Flags

**Needs targeted research at phase start:**
- Phase 8 (Images): @tauri-apps/plugin-fs image storage + thumbnail generation in Tauri WebView context is less documented than the SQL plugin path

**Standard patterns (skip research-phase):**
- Phase 0: Tauri scaffold + shadcn setup is well-documented
- Phase 1: SQLite schema + tauri-plugin-sql migration runner is documented
- Phases 2-7: CRUD table/drawer/form patterns are standard
- Phase 9: JSON export is straightforward with Tauri fs plugin

---

## Open Questions Requiring User Input

These are not technical uncertainties -- they require a product/legal decision from the user before implementation can proceed:

1. **GW IP in seed data (BLOCKING for Phase 1):** Choose Option A (no seed data), Option B (debug-only seed, never ships), or Option C (fictional placeholder names). The PROJECT.md Active requirements list GW names, which conflicts with the legal constraint also stated in PROJECT.md. This must be resolved before Phase 1 seed SQL is written.

2. **Painting status storage format:** Ordered string enum with a PAINTING_STATUS_ORDER TypeScript constant, or integer codes (0-10) with display label mapping? Integer codes make range queries trivial. Recommendation: integer codes with a PAINTING_STATUS_LABELS mapping in src/types/index.ts.

3. **Unit category flexibility:** ROADMAP.txt section 3.2 says allow user-defined categories. This means category must be a VARCHAR field with a combobox UI (pre-populated suggestions, free-text allowed), not a CHECK constraint enum. Confirm before schema is written.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Core versions verified via npm + official docs; Prisma incompatibility confirmed via GitHub issue #20103; Drizzle proxy pattern verified via multiple community guides (Oct 2025, Feb 2026) |
| Features | MEDIUM-HIGH | Competitor survey via official sites and app store listings; feature expectations inferred from community patterns; personal-tool nuances not universally documented |
| Architecture | HIGH | Data flow verified against official Tauri v2 SQL plugin docs + multiple working implementations; consistent across all research files |
| Pitfalls | HIGH (technical), MEDIUM (legal) | SQLite FK pragma and WASM incompatibility confirmed via official docs + GitHub issues; GW IP risk confirmed via GW legal page and documented C&D precedents; legal threshold for personal-only use is inherently uncertain |

**Overall confidence:** HIGH

### Gaps to Address

- Drizzle vs raw queries v2 decision point: Not a gap for v1, but document the migration threshold. Suggested trigger: when any query function requires dynamic column selection or the schema exceeds 15 tables with complex join patterns.
- GW IP nuance: The legal risk is real but the exact threshold between personal tool on one machine vs distributed binary is legally grey. Option C (fictional placeholders) removes the question entirely.
- Painting status representation: Both string-with-constant and integer approaches work. Document the chosen approach clearly in src/types/index.ts once decided.
- Phase 3 Kanban DnD: The @dnd-kit reference implementation resolves the Radix conflict, so DnD is a scope decision, not a research risk. Revisit after Phase 3 button/dropdown ships.

---

## Sources

### Primary (HIGH confidence)
- Tauri v2 SQL plugin official docs (v2.tauri.app/plugin/sql/) -- plugin API, migration runner, capabilities
- @tauri-apps/plugin-sql npm v2.3.2 -- version verification
- GitHub prisma/prisma issues #20103 -- production build freeze confirmation
- GitHub Brendonovich/prisma-client-rust discussions/274 -- archived March 2025 confirmation
- SQLite official docs (sqlite.org/foreignkeys.html) -- FK pragma per-connection requirement
- GW IP enforcement policy (warhammer.com/en-GB/legal) -- trademark scope
- GW cease-and-desist precedent (polycount.com/discussion/227437)
- shadcn/ui official docs -- Tailwind v4 support, CLI v4 changelog (March 2026)
- All npm package versions (tauri, @tanstack/*, drizzle-orm, react-hook-form, zod, zustand) -- verified at research time

### Secondary (MEDIUM confidence)
- dev.to/meddjelaili -- Tauri v2 + Drizzle + SQLite starter (October 2025)
- keypears.com/blog/2025-10-04-drizzle-sqlite-tauri -- migration runner pattern
- dev.to/huakun -- Drizzle sqlite-proxy in Tauri
- dev.to/focuscookie -- Tauri 2.0 + SQLite + React walkthrough
- github.com/Georgegriff/react-dnd-kit-tailwind-shadcn-ui -- dnd-kit + shadcn Kanban reference
- Liber Pigmenta official site -- competitor feature audit (April 2026)
- paintRack / Figure Case app store listings -- competitor survey
- nicolaiarocci.com -- SQLite FK pragma per-connection confirmed
- victordibia.com/blog/gatsby-fouc -- dark mode FOUC prevention

### Tertiary (LOW confidence)
- Notion Warhammer templates -- demand signal for hobby trackers, not authoritative
- Goonhammer project management article -- hobbyist workflow context only

---

*Research completed: 2026-04-30*
*Ready for roadmap: yes -- pending GW IP seed data decision (blocks Phase 1 seed migrations)*
