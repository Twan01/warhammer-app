# HobbyForge v3.0 Architecture Audit

**Date:** 2026-05-06
**Scope:** Pre-implementation audit for v3.0 roadmap (`.planning/milestones/v3.0-ROADMAP.md`)
**Baseline:** v0.2.4 shipped — 36 phases, 224 TypeScript source files, 778 tests

---

## 1. Rules Sync Pipeline — Audit Result

### Production Path: TypeScript → Rust (Fully Wired)

```
PlaybookTab "Sync" button
  → useRulesSync() hook (src/hooks/useRulesSync.ts)
    → fetch 12 Wahapedia CSVs (parallel)
    → parseWahapediaCsv() + stripHtml()
    → invoke("bulk_sync_rules", { payload })
      → Rust bulk_sync_rules (src-tauri/src/lib.rs:132-392)
        → DELETE all 11 rw_* tables (single transaction)
        → INSERT parsed rows into 11 tables
        → Write sync metadata
  → React Query invalidation (sync-meta, datasheets, datasheets-by-faction)
```

### Tables: What's Wired vs What's Dark

| Table | Synced | Queried in UI | Used By |
|-------|--------|---------------|---------|
| `rw_factions` | ✓ | ✓ | DatasheetPicker faction lookup |
| `rw_datasheets` | ✓ | ✓ | DatasheetPicker, PlaybookTab |
| `rw_datasheet_models` | ✓ | ✓ | PlaybookTab stats display |
| `rw_datasheet_abilities` | ✓ | ✓ | PlaybookTab abilities section |
| `rw_datasheet_keywords` | ✓ | ✓ | PlaybookTab keywords field |
| `rw_sources` | ✓ | ✓ | PlaybookTab sources list |
| `rw_datasheets_wargear` | ✓ | ✓ | PlaybookTab weapons section |
| `rw_sync_meta` | ✓ | ✓ | "Last synced" label |
| `rw_abilities` | ✓ | **NO** | Dark — synced but zero queries |
| `rw_stratagems` | ✓ | **NO** | Dark — synced but zero queries |
| `rw_detachments` | ✓ | **NO** | Dark — synced but zero queries |
| `rw_detachment_abilities` | ✓ | **NO** | Dark — synced but zero queries |

**Key finding:** 4 tables (shared abilities, stratagems, detachments, detachment abilities) are **fully synced from Wahapedia** but have no queries, no hooks, and no UI components. This is a clean foundation for v3.0 — the data is already there, just needs to be surfaced.

### Architecture Assessment: Sound

- Clear separation: HTTP fetch (TS) → Parsing (TS) → Atomic transaction (Rust)
- Two-database isolation prevents app data / rules data conflicts
- Conflict resolution UX exists (DatasheetImportDialog)
- User-triggered sync (no background noise, fully offline after first sync)

### Risks

- HTML stripping happens twice (useRulesSync.ts + datasheets.ts on read) — redundant but not harmful
- FK checks disabled during Rust sync — safe because delete order is correct
- Wahapedia CSV format is brittle (column names could change)

---

## 2. Database Schema Inventory

### hobbyforge.db — 16 tables across 11 migrations

| Table | Migration | Purpose | FK Count |
|-------|-----------|---------|----------|
| `factions` | 001 | Warhammer factions | 0 |
| `units` | 001+006+008 | Owned models (22 columns post-migration) | 1 |
| `paints` | 001 | Paint inventory with price | 0 |
| `painting_recipes` | 001 | Named recipes with flat paint steps | 2 |
| `recipe_paints` | 001 | Recipe → Paint join (step ordering) | 2 |
| `army_lists` | 001 | Army list containers | 1 |
| `army_list_units` | 001 | List ↔ Unit membership | 2 |
| `unit_strategy_notes` | 001+004+007 | Playbook stats + strategy (25 cols) | 1 |
| `battle_logs` | 001 | Battle records (14 columns) | 3 |
| `image_assets` | 001 | Polymorphic photo storage | 0 |
| `painting_sessions` | 005 | Time-tracked sessions per unit | 1 |
| `wishlist_items` | 009 | User wishlist with estimated cost | 1 |
| `hobby_goals` | 010 | Hobby targets with progress tracking | 0 |
| `unit_point_tiers` | 011 | Model-count → points brackets | 1 |
| `unit_loadouts` | 011 | Named wargear configurations | 1 |
| `unit_loadout_wargear` | 011 | Wargear selections per loadout | 1 |

### rules.db — 12 tables across 2 migrations

Core (001): rw_factions, rw_datasheets, rw_datasheet_models, rw_datasheet_abilities, rw_datasheet_keywords, rw_sources, rw_sync_meta

Extended (002): rw_datasheets_wargear, rw_abilities, rw_stratagems, rw_detachments, rw_detachment_abilities

### TypeScript Coverage: 100%

16 type files in `src/types/` covering every table. All use the established patterns:
- Entity/CreateInput/UpdateInput with `Omit<T, "id" | "created_at">`
- Const arrays with `as const` for enums (PAINTING_STATUS_ORDER, PAINT_TYPES, etc.)
- `0 | 1` for SQLite booleans

### Query Coverage: Full CRUD

18 query modules in `src/db/queries/` with positional `$1, $2` syntax. COALESCE chains for computed fields (effective_points). No ORM — raw typed SQL throughout.

---

## 3. UI Component Inventory

### Route Tree (13 routes)

```
/                    → Dashboard (Hobby Command Center)
/collection          → Collection (unit table/gallery + detail sheets)
/painting-projects   → Painting Projects (Kanban board)
/goals               → Goals (goal cards + progress)
/recipes             → Recipes (table + detail/form sheets)
/paints              → Paints (inventory + filters)
/army-lists          → Army Lists (cards + unit management)
/spending            → Spending (analytics + breakdown)
/wishlist            → Wishlist (item rows)
/battle-log          → Battle Log (rows + form)
/factions            → Factions (rows + theming)
/settings            → Settings (placeholder)
```

### Component Counts

| Category | Count |
|----------|-------|
| Feature modules | 12 |
| Feature component files | 83 |
| React Query hook files | 25 |
| Unique query key prefixes | 30+ |
| Mutations | 60+ |
| Context providers | 2 (ActiveFaction, QuickAdd) |
| Zustand stores | 1 (CollectionFilters) |
| shadcn/ui primitives | 24 |
| Shared components | 9 |

### Cache Invalidation Map (Key Dependencies)

```
["dashboard-stats"]     ← units, army-lists, battle-logs, wishlist mutations
["spending-stats"]      ← units, paints mutations
["hobby-analytics"]     ← painting-sessions, units, paints mutations
["recent-activity"]     ← painting-sessions, battle-logs mutations
["army-readiness"]      ← army-list-units, units mutations
["kanban-enrichment"]   ← recipes mutations
["recipes", "by-unit"]  ← recipes mutations (prefix match)
["goal-progress"]       ← goals, painting-sessions mutations
```

---

## 4. Gap Analysis Per Milestone

### 3.1 Recipes 2.0 — LARGE

**What exists:** Flat recipe schema (primer/basecoat/shade/etc. as TEXT columns), recipe_paints join table with step ordering, swatch display, faction/unit linking.

**What's missing:**
- Structured recipe steps (title, phase, tool, dilution, technique, duration, photo per step)
- Recipe metadata (style, surface, effect, difficulty, estimated_minutes, result_photo)
- Paint substitutions per step
- Recipe-to-session linking (which recipe/step did you work on?)
- Studio UX (cards, timeline view, filters by surface/style/difficulty/missing-paints)
- Recipe duplication

**Schema changes:** 7 ALTER + 3 CREATE TABLE (recipe_steps, recipe_paint_substitutions, painting_sessions extension)

**Data migration concern:** Existing recipe_paints rows need batch migration to recipe_steps. Old data preserved — one default step per existing paint link.

### 3.2 Rules Sync 2.0 — MEDIUM (lowest risk)

**What exists:** Full sync pipeline working. All 12 tables populated. PlaybookTab displays stats/abilities/keywords/weapons.

**What's missing:**
- Stratagem/detachment/shared ability display in UI (data exists, just dark)
- Sync metadata display (row counts, source version, freshness)
- Manual override table (user-entered points/stats that survive re-sync)
- Import failure logging
- Rules freshness warnings

**Schema changes:** 2 CREATE TABLE (unit_rules_overrides, sync_error_log)

### 3.3 Points & Army Lists 2.0 — LARGE

**What exists:** Army lists with effective_points COALESCE chain, points overrides, named loadouts, wargear selection, battle-ready readiness tracking.

**What's missing:**
- Detachment field (cross-DB reference to rw_detachments)
- Game size enum (Combat Patrol / Incursion / Strike Force / Onslaught)
- List status (draft / planned / ready / played / archived)
- Tactical tags per unit in list
- Owned vs wishlist/proxy unit distinction
- List analysis warnings (low anti-tank, too many unpainted, etc.)
- Export/print view

**Schema changes:** 5 ALTER + 1 CREATE TABLE

### 3.4 Game Day Mode — MEDIUM (new feature, aggregates existing data)

**What exists:** Army list readiness, unit strategy notes, imported stratagems (dark), playbook

**What's missing:** Entirely new feature — game prep sheet with overview, packing checklist, phase reminders, unit reminders, stratagem reminders, beginner mode

**Schema changes:** 1-2 CREATE TABLE (game_day_preps, checklist_items)

### 3.5 Battle Intelligence 2.0 — MEDIUM

**What exists:** Battle logs with result, opponent, MVP, lessons, changes_next_time

**What's missing:** Extended report fields (deployment, first turn, turning point, forgotten rules, confidence), per-unit performance ratings, win/loss analytics by faction/list

**Schema changes:** 4 ALTER + 1 CREATE TABLE (battle_unit_performance)

### 3.6 Smart Planning — LARGE (complexity in logic, not schema)

**What exists:** Dashboard with active projects, focus card, pipeline, readiness

**What's missing:** Rule-based recommendation engine scoring across all data sources. Top 3 actions on dashboard with explanations.

**Schema changes:** Minimal (computed on-the-fly or 1 optional table)

### 3.7 Smart Wishlist — LARGE

**What exists:** Wishlist items (v0.2.2), spending tracker

**What's missing:** Link wishlist to recipes/lists/units/tactical gaps, transparent priority scoring, spending intelligence (cost per battle-ready point, backlog value)

**Schema changes:** 5 ALTER on wishlist_items

---

## 5. Migration Plan

All migrations are **additive** (ALTER TABLE ADD COLUMN + CREATE TABLE IF NOT EXISTS). Zero destructive changes. Existing data survives all migrations.

| Migration | Milestone | Tables Affected | Statements |
|-----------|-----------|-----------------|------------|
| 012 | Recipes 2.0 | painting_recipes (7 ALTER), painting_sessions (2 ALTER), 3 new tables | ~12 |
| 013 | Rules Sync 2.0 | 2 new tables in hobbyforge.db | ~2 |
| 014 | Army Lists 2.0 | army_lists (5 ALTER), army_list_units (2 ALTER), 1 new table | ~8 |
| 015 | Game Day Mode | 2 new tables | ~2 |
| 016 | Battle Intelligence | battle_logs (4 ALTER), 1 new table | ~5 |
| 017 | Smart Wishlist | wishlist_items (5 ALTER) | ~5 |

**rules.db:** No schema changes needed — all 12 tables already exist and are populated.

---

## 6. Dependency Graph

```
3.1 Recipes 2.0 (independent — start here)
  └→ Paint inventory (exists), Active projects (exists)

3.2 Rules Sync 2.0 (independent — can parallel with 3.1)
  └→ useRulesSync (exists), bulk_sync_rules (exists)

3.3 Army Lists 2.0 ← DEPENDS ON 3.2 (detachment picker)
  └→ Point tiers (exists), Loadouts (exists)

3.4 Game Day Mode ← DEPENDS ON 3.3 (list readiness, detachments)
  └→ Strategy notes (exists), Imported stratagems (via 3.2)

3.5 Battle Intelligence 2.0 ← DEPENDS ON 3.3 (list context)
  └→ Battle logs (exists)

3.6 Smart Planning ← DEPENDS ON 3.1–3.5 (all data sources)

3.7 Smart Wishlist ← DEPENDS ON 3.1–3.6 (priority scoring)
```

**Confirmed order:** 3.1 → 3.2 → 3.3 → 3.4 → 3.5 → 3.6 → 3.7

---

## 7. Risk Assessment

### Critical
- **Recipe data migration (3.1):** Existing recipe_paints must map to new recipe_steps. Batch INSERT needed. Test thoroughly.
- **Cross-DB FK (3.3):** army_lists.detachment_id → rw_detachments.id not enforced at DB level. Application-layer validation required.

### Medium
- **Tactical tags querying (3.3):** JSON/comma-delimited TEXT means application-side filtering. Acceptable at personal scale.
- **Smart Planning heuristics (3.6):** Scoring logic may not match user expectations. Start simple, iterate.
- **Game Day content density (3.4):** If user has sparse strategy notes, Game Day feels empty. Provide templates.

### Low
- **Rules Sync 2.0 (3.2):** Pipeline proven stable. Just adding UI + overrides.
- **Battle Intelligence (3.5):** Straightforward table extension.
- **Component patterns:** All new components follow established Sheet/Card/Panel patterns.

---

## 8. Architecture Strengths (No Changes Needed)

1. **Two-database isolation** — hobbyforge.db (user data) and rules.db (reference data) never conflict
2. **Query → Hook → UI stack** — consistent across all 18 query modules
3. **Sibling portal contract** — Sheets/Dialogs always top-level siblings, never nested
4. **Cache invalidation symmetry** — create and delete always invalidate the same keys
5. **Forward-compatible invalidation** — dashboard-stats invalidated by all relevant mutations
6. **Additive migration pattern** — zero destructive migrations in 11 files
7. **Integer pence discipline** — formatCurrency is the only /100 site
8. **selectedUnitId pattern** — derive from cache, never stale after mutations

---

*Audit completed: 2026-05-06*
*Source: 4 parallel research agents investigating rules sync, schema, UI components, and gap analysis*
