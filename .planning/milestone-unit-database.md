# Milestone: Unit Database — Canonical 40k Data Hub

## Vision

Replace the fragile Wahapedia CSV + BSData XML sync pipeline with a **curated, pre-built unit database** that ships with the app and serves as the single source of truth for all Warhammer 40k unit data. Users browse units by faction (like [40k.app](https://www.40k.app/)), and when adding a unit to their collection, they pick from this canonical database instead of typing names manually.

## Problem Statement

The current rules sync system has been a persistent source of bugs across multiple milestones:

1. **Two data sources with conflicting naming** — Wahapedia uses "Canoptek Spyders" (plural), BSData uses "Canoptek Spyder" (singular). This causes ~20% of points to fail JOIN matching.
2. **Fragile runtime pipeline** — syncing requires fetching 12 CSVs + parsing XML .cat files, bulk-deleting and re-inserting into rules.db, then caching into hobbyforge.db with normalization. Any step can fail silently.
3. **WAL/connection pool issues** — data appears in the database but reads return stale results due to SQLite WAL checkpoint timing with Tauri's connection pool.
4. **No offline guarantee** — the app is useless for rules browsing without a successful sync.
5. **Manual unit entry** — users type unit names by hand when adding to their collection, then separately "link" to a datasheet. This creates friction and data quality issues.

## Goal

A browsable, searchable 40k unit database where:
- Every faction's full roster is available immediately (no sync required)
- Adding a unit to the collection is "pick from database" not "type a name"
- Points, stats, weapons, abilities, and keywords are all pre-populated
- Data can be updated via a structured import (not fragile multi-source sync)

## Data Model

### What a unit record should contain

Based on the current `rules.db` schema and what 40k.app displays:

| Field | Description | Source |
|---|---|---|
| **Identity** | Name, faction, role (Character/Battleline/etc.), keywords | Wahapedia |
| **Stats** | M, T, Sv, Inv, W, Ld, OC per model profile | Wahapedia |
| **Weapons** | Name, range, type (Ranged/Melee), A, BS/WS, S, AP, D, special rules | Wahapedia |
| **Abilities** | Core, Faction, and Datasheet abilities with descriptions | Wahapedia |
| **Points** | Base cost + model-count tiers (e.g., 5 models: 90pts, 10 models: 180pts) | BSData / GW |
| **Composition** | Min/max model counts, loadout options, default equipment | BSData |
| **Leader rules** | Which units a Character can lead, attachment constraints | BSData |
| **Enhancements** | Faction-specific upgrades with point costs | BSData |
| **Keywords** | Unit keywords + faction keywords | Wahapedia |
| **Damaged profile** | Wound threshold + degraded stats text | Wahapedia |

### Schema direction

- Single `hobbyforge.db` database (eliminate the separate `rules.db` entirely)
- Canonical `unit_database` table as the master reference
- Related tables for models, weapons, abilities, keywords, point tiers
- Collection `units` table gains a FK to `unit_database.id` — no more name-based matching
- Keep `synced_unit_points` and `unit_rules_mapping` as migration compatibility, then deprecate

## Data Sourcing Strategy

### Primary: Web scraping from 40k.app and/or Wahapedia

- [40k.app](https://www.40k.app/) has clean faction-organized unit pages with stats, weapons, abilities, points
- Wahapedia has comprehensive CSV exports (already used today)
- BSData has points tiers and loadout options in XML format

### Build process (not runtime sync)

- **One-time scrape/import** to build the initial database
- Ship as a **pre-populated SQLite file** or migration seed
- **Update workflow**: a dev-side script that re-scrapes and produces a diff, reviewed before shipping
- Users get updates via app updates (not runtime sync)

### Keep runtime sync as optional

- Existing sync can remain as a "check for points updates" feature
- But the canonical database is the default — sync only patches point values

## User Experience

### Browsing the database

Inspired by 40k.app's layout:

1. **Faction picker** — grid/list of all 40k factions with icons
2. **Unit list** — faction's full roster grouped by role (Character, Battleline, Other, Vehicle, etc.)
3. **Unit detail** — full datasheet view: stats, weapons (ranged + melee tables), abilities, keywords, points, composition
4. **Search** — global search across all factions by unit name or keyword
5. **Filters** — by role, keyword, point range

### Adding to collection (new flow)

Current: User types name → optionally links to datasheet later
New: User browses/searches database → picks unit → confirms → added to collection with all data pre-filled (faction, points, role, keywords)

### What stays the same

- Collection management, painting tracking, army lists, recipes — all unchanged
- The Rules Hub UI already shows datasheets by faction — it evolves into the database browser
- Army list builder still references unit data for points/validation

## Phases (suggested breakdown)

### Phase 1: Data Acquisition & Schema
- Scrape 40k.app and/or parse Wahapedia + BSData to build a comprehensive dataset
- Design the canonical database schema in hobbyforge.db
- Write migration(s) to create the new tables
- Build the import script that populates the database
- Validate: all factions, all units, points match known values

### Phase 2: Database Browser UI
- Faction picker page (replace or evolve current Rules Hub)
- Unit list by faction with role grouping
- Unit detail view (stats, weapons, abilities, points, keywords)
- Global search across all factions
- Filters (role, keywords, point range)

### Phase 3: Collection Integration
- "Add from database" flow — browse/search → pick → add to collection
- Auto-populate faction, points, role, keywords from database record
- FK link from collection unit → database unit (replaces name-based matching)
- Migrate existing collection units to link by ID where possible
- Deprecate manual name entry (keep as fallback for custom/kitbash units)

### Phase 4: Army List Integration
- Army list unit picker draws from database instead of collection
- Points resolved directly from database (no more cache layer)
- Validation uses database keywords/roles
- Remove or simplify synced_unit_points cache

### Phase 5: Cleanup & Data Update Pipeline
- Remove or demote the Wahapedia/BSData runtime sync
- Build a dev-side update script for future GW points changes
- Remove rules.db dependency (single database)
- Clean up dead code: normalizePointsNames, WAL workarounds, name-matching heuristics

## Requirements

| ID | Requirement | Priority |
|---|---|---|
| UDB-01 | Pre-built database with all 40k 10th edition factions and units | Must |
| UDB-02 | Each unit has stats, weapons, abilities, keywords, points | Must |
| UDB-03 | Point tiers (model count brackets) for units that have them | Must |
| UDB-04 | Faction browser UI with role-grouped unit list | Must |
| UDB-05 | Unit detail view showing full datasheet equivalent | Must |
| UDB-06 | Global search across all factions | Must |
| UDB-07 | "Add from database" collection flow replaces manual name entry | Must |
| UDB-08 | Collection units linked to database by ID (not name) | Must |
| UDB-09 | Army list points resolved from database directly | Must |
| UDB-10 | Filters: role, keyword, point range | Should |
| UDB-11 | Loadout options and composition data per unit | Should |
| UDB-12 | Leader attachment targets | Should |
| UDB-13 | Enhancement data per faction | Should |
| UDB-14 | Stratagems and detachment rules in database | Should |
| UDB-15 | Dev-side update script for future GW changes | Should |
| UDB-16 | Migration path for existing collection units → database FK | Must |
| UDB-17 | Remove rules.db dependency (single database) | Could |
| UDB-18 | Keep optional "check for points updates" sync | Could |
| UDB-19 | Offline-first: all data available without internet | Must |
| UDB-20 | Custom/kitbash units can still be added manually | Must |

## Success Criteria

- User can browse all 40k factions and see every unit's full datasheet without syncing
- Adding a unit to collection is a 2-click "pick from list" flow
- Points are always correct and consistent (no name mismatch bugs)
- Zero runtime dependency on Wahapedia/BSData for core functionality
- Existing collection data is preserved and migrated

## Risks & Mitigations

| Risk | Mitigation |
|---|---|
| 40k.app blocks scraping | Fall back to Wahapedia CSV + BSData XML (already have parsers) |
| Data volume (2500+ datasheets with all related data) | SQLite handles this easily; lazy-load detail views |
| GW updates points mid-season | Dev-side update script + app update; optional runtime sync as safety net |
| Migration breaks existing collections | Conservative migration: add FK column, backfill by name match, keep old columns until verified |
| Legal concerns with shipping GW data | Same risk as current Wahapedia sync — this is a private hobby tool, not distributed commercially |

## Reference

- [40k.app](https://www.40k.app/) — the UX model for faction browsing and unit display
- Current codebase: `src/db/rules-client.ts`, `src/hooks/useRulesSync.ts`, `src/features/rules-hub/`
- Current schema: `src-tauri/migrations/rules_001_*.sql` through `rules_002_*.sql`
