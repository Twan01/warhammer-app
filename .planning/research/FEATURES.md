# Feature Landscape: Unit Database / Canonical 40k Data Hub

**Domain:** Warhammer 40k unit database browser for a personal hobby management desktop app
**Researched:** 2026-05-29
**Reference tools studied:** 40k.app (direct page fetch), Wahapedia, New Recruit, Quartermaster, ButtScribe, Official GW App

---

## Table Stakes

Features users expect from any unit database browser. Missing any of these makes the product feel incomplete compared to free web tools like Wahapedia and 40k.app.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Faction picker with all factions | Every 40k tool starts here. Users think in factions first. Missing factions = broken trust in data completeness. | Low | ~28–35 factions depending on subfaction counting. 40k.app groups them as Imperium / Space Marines / Chaos / Xenos. Existing `rw_factions` table already holds these IDs and names. |
| Unit list per faction grouped by role | 40k.app's confirmed role categories: Epic Heroes / Leaders & Characters / Battleline / Mounted / Infantry, Swarms & Beasts / Aircraft / Titanic / Dedicated Transports / Vehicles & Monsters. Users learn this grouping from GW official resources — any different grouping causes confusion. | Low | Role is already stored in `rw_datasheets.role` from Wahapedia. Rendering is a sort + section header operation. |
| Points shown on unit list row | Every reference tool (40k.app, New Recruit, Wahapedia) shows points alongside unit name. Browsing without points is unusable for army-building context. | Low | Points are in `rw_datasheet_points` (synced) and will be in the canonical `unit_database_points` table. Multi-tier units (e.g., "5 models: 90pts / 10 models: 180pts") need a "from X pts" indicator on the list — show the minimum tier. |
| Full datasheet detail view | Stats block (M/T/Sv/Inv Sv/W/Ld/OC per model profile), ranged weapons table (Range/A/BS-WS/S/AP/D + weapon keywords), melee weapons table (same columns), abilities by type (Core/Faction/Datasheet), faction keywords + unit keywords, composition text. This is the core reference value of any datasheet browser. | Medium | Existing schema already has `rw_datasheet_models`, `rw_datasheets_wargear`, `rw_datasheet_abilities`, `rw_datasheet_keywords`. The existing `PlaybookTab` component renders a version of this — evolve rather than rewrite. |
| Text search within a faction's units | Users type unit name to find fast. Substring match on unit name within selected faction is the minimum. | Low | SQLite LIKE is sufficient at the single-faction level (~50–200 units per faction). No FTS5 needed for faction-scoped search. |
| Offline-first — all data available without syncing | The core promise of v0.4.0. Users must be able to browse every faction and every unit immediately on app launch with no internet connection and no Wahapedia/BSData dependency. | High | This is a data acquisition problem, not a UI problem. The UI is simple; building the pre-populated canonical dataset is the hard part. Without this, nothing else in this milestone works. |
| Invulnerable save (Inv Sv) displayed in stat block | 10th edition datasheets always show Inv Sv when a unit has one. Free tools show it; omitting it makes the datasheet look wrong. | Low | Already in `rw_datasheet_models.inv_sv`. Currently not rendered in PlaybookTab — add to stat block display. |
| Damaged profile / degraded stats indicator | Multi-wound vehicles and monsters have a wound threshold above which they use degraded stats. Standard datasheet element; users reference it during games. | Low | Already in `rw_datasheets.damaged_w` and `damaged_description`. Currently rendered in PlaybookTab — carry forward. |
| Ability descriptions (not just names) | Abilities must show full text descriptions, not just names. Users look up rules mid-game — names alone are useless. | Low | Already in `rw_datasheet_abilities.description`. Rendered in PlaybookTab — carry forward. |
| Composition text | Min/max model counts, default equipment, and loadout options. Users need this to know how to legally field the unit. | Medium | Partially in BSData XML (not in current Wahapedia CSV schema). Must be a data acquisition goal. If unavailable from data source, show a "See codex" placeholder — do not omit the section entirely. |

---

## Differentiators

Features that set HobbyForge apart from free web reference tools. Users won't expect these from a generic datasheet browser, but they deliver high value in the context of a personal hobby management app.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| "Add to Collection" directly from datasheet view | Removes the current friction: user browses a unit, finds one they own, clicks "Add to Collection" — faction, role, keywords pre-populated. Eliminates manual name entry entirely. | Medium | Requires the `units` table to gain a FK column pointing to the canonical `unit_database.id`. The existing `UnitPickerDialog` (army list builder) is the template for the browse-and-pick interaction pattern. |
| Ownership badge on unit list row | When browsing a faction, units the user already owns are marked with a subtle badge or checkmark. Makes collection gaps visible at a glance without leaving the browser. | Low | Simple LEFT JOIN: `SELECT udb.id, (u.id IS NOT NULL) AS owned FROM unit_database udb LEFT JOIN units u ON u.unit_database_id = udb.id WHERE udb.faction_id = $1`. Requires the FK column to exist on `units`. |
| Readiness badge on unit list row | Units in the collection that pass `computeUnitReadiness()` show a "Ready" indicator. Surfaces painting status inside the database browser. | Low | Call `computeUnitReadiness()` (already exists as a pure function) against owned units. Shown only for owned units — invisible for unowned units, so the list stays clean for pure browsing. |
| Global cross-faction search | Search "Terminator" and find Space Marine Terminators, Chaos Terminators, and Grey Knight Terminators in one result set. Free web tools require selecting a faction first. | Medium | SQLite FTS5 (Full-Text Search) virtual table on `unit_name + faction_name + keywords` is the correct implementation. A plain LIKE query across 2500+ rows without an index is too slow for instant search feedback. FTS5 virtual table must be created during migration/import, not at query time. See PITFALLS.md for the FTS5 setup requirement. |
| Faction alignment grouping on faction picker | Grouping factions as Imperium / Space Marines / Chaos / Xenos on the faction picker page matches the mental model GW players use. 40k.app uses this grouping (confirmed). | Low | Pure UI with hard-coded alignment mapping, or add an `alignment` TEXT column to the canonical `factions` table during migration. No runtime complexity. |
| Points tier table on detail view | Show all model-count brackets (5 models: 90pts / 10 models: 180pts) in the datasheet, not just the minimum. Free tools and the official GW app often show only one price, requiring users to look elsewhere. | Low | The current `rw_datasheet_points` schema stores one row per unit (no model count). The new canonical schema needs `(unit_id, model_count NULLABLE, points)` rows. This is a schema design decision in Phase 1, not a UI problem. |
| Weapon keywords displayed inline | 10th edition weapon special rules (Devastating Wounds, Rapid Fire 2, Anti-Infantry 4+, etc.) appear in weapon profiles. Showing these inline rather than abbreviated is a UX win vs. printed index cards. | Low | Already partially in `rw_datasheets_wargear.type` and `description`. Requires the data source to provide structured weapon keyword data (Wahapedia does export these). |
| Detachment links from faction page | Show the available detachments for the faction at the top of the faction page, linking to their rules and enhancement lists. 40k.app does this (confirmed: detachment links appear above the unit list). | Low | Existing `rw_detachments` and `rw_detachment_abilities` tables already hold this data. UI-only addition on the faction page. |
| Annotation (favorite / note) on database units | User can star a unit they want to buy ("wishlist") or attach a note ("considering for my list"). Annotations persist independently of ownership status. | Medium | Extend the existing `rule_annotations` table pattern (`rule_type / rule_id / is_favorite / note`). The `rule_type = 'unit_database'` variant would map to the canonical unit ID. No new schema paradigm — reuse established pattern. |

---

## Anti-Features

Features to explicitly NOT build in this milestone, with rationale.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Real-time sync from Wahapedia/BSData at browse time | The entire point of v0.4.0 is to eliminate the fragile runtime sync pipeline. Adding it back as a browse-time dependency defeats the architecture goal and reintroduces WAL/connection pool timing bugs. | Ship a pre-built database. Provide a dev-side update script for GW changes. Keep the optional "check for points updates" as a separate user-triggered operation only. |
| Complex filter combinatorics (role AND keyword AND points range AND painted status) | Filter combinations create state management complexity and edge-case UX bugs. With 50–200 units per faction, users don't need multi-dimensional filtering — client-side role grouping already handles the primary navigation need. | Role grouping handles the key filter. Provide text search + role dropdown. Keep it simple: two filter dimensions maximum per faction view. |
| Codex-accurate visual datasheet layout replicating GW's print design | Reproducing GW's visual index card style (artwork, specific fonts, color bands) is a copyright risk and a massive styling effort for zero functional gain. The app has its own design system. | Use the existing dark-mode card and table layout consistent with the rest of HobbyForge. Functional accuracy matters; pixel-perfect GW aesthetics do not. |
| Unit comparison side-by-side view | Interesting feature but adds significant UI complexity (two-panel layout, scroll sync, responsive breakpoints, state management). Not needed for the core browsing use case. | Defer. Users can open the datasheet and cross-reference with Wahapedia for comparison. |
| Competitive tier ratings or win-rate data | This app explicitly avoids competitive optimization per PROJECT.md. Tier lists would drift scope toward a competitive tool, which is explicitly out of scope. | Not in scope. |
| Auto-sync on app startup | Would reintroduce the WAL/connection pool timing bugs that have caused bugs across multiple milestones. The pre-built canonical database eliminates the need for startup syncing. | Manual update via app version update. Optional user-triggered "check for points updates" as a narrow escape hatch only. |
| Purchase links or price display | Shopping feature, not hobby management. URLs break, prices change, legal complexity with GW's T&Cs. | The spending tracker handles purchase cost tracking. That is sufficient. |
| Online roster sharing or cloud sync | Explicitly out of scope per PROJECT.md. Local-first is a core architectural constraint, not a feature flag. | Export formats (existing 4-format export) satisfy sharing needs for competitive events. |
| Multi-game-system support (AoS, Horus Heresy) | Explicitly out of scope per PROJECT.md. Adds data acquisition complexity for zero user benefit in this personal 40k tool. | 40K 10th edition only. |

---

## Feature Dependencies

Dependencies between features in this milestone and on existing HobbyForge capabilities.

```
Pre-built canonical database (Phase 1: data acquisition + schema)
    → ALL other features depend on this. Nothing else can be built without it.
    → Faction picker
    → Unit list with role grouping + points
    → Datasheet detail view (stats, weapons, abilities, keywords)
    → Global FTS5 search (index built at import time)

Faction picker
    → Unit list (faction_id parameter)
    → Detachment links per faction (existing rw_detachments data)

Unit list
    → Unit detail / datasheet view (unit_id parameter)
    → Ownership badge (requires: units.unit_database_id FK column)
    → Readiness badge (requires: ownership badge + computeUnitReadiness())

Unit detail / datasheet view
    → "Add to Collection" flow (user picks unit here or from list)

"Add to Collection" flow (Phase 3)
    → units.unit_database_id FK column must exist (migration)
    → Auto-populates faction, role, keywords from canonical record
    → Opens existing UnitSheet with pre-filled values

units.unit_database_id FK column
    → Ownership badge on list (LEFT JOIN)
    → Migration of existing collection units to DB FK (name-match + user confirmation)
    → Army list points resolved from database (Phase 4)

Army list points from database (Phase 4)
    → Simplifies resolveUnitPoints() — reads unit_database_points via FK instead of 5-level COALESCE
    → Points freshness badges can be simplified or removed
    → synced_unit_points cache table can be deprecated

Single-database consolidation (Phase 5)
    → Depends on: all above phases stable and validated
    → Eliminates rules-client.ts, rules.db, WAL workarounds, dual-query patterns
    → Highest migration risk — do last
```

**Existing features that this milestone builds upon (do not rewrite):**
- `PlaybookTab` — existing datasheet renderer for stats, abilities, keywords. Evolve this into the standalone datasheet view; do not build a new one from scratch.
- `UnitPickerDialog` — existing army list unit picker. The "Add from Database" collection flow reuses this browse-and-pick interaction pattern.
- `resolveUnitPoints()` pure function — centralized points resolver. After v0.4.0, its 5-level COALESCE simplifies to a direct lookup via FK.
- `rule_annotations` table — annotation pattern (favorites, notes, reminders) can be extended with `rule_type = 'unit_database'` to support unit wishlist annotations.
- `RulesHubPage` — evolves into the faction browser. Existing tab structure (stratagems, detachments, shared abilities) merges with new unit browser.
- `computeUnitReadiness()` — pure function already in `src/lib/`. Used for readiness badges on unit list rows.
- FTS5: SQLite ships with FTS5 built in. The Tauri plugin-sql executes arbitrary SQL, so FTS5 virtual table creation via migration SQL is supported without extra dependencies.

---

## Data Model Requirements (implied by features)

The canonical unit database schema must support the following to enable all table-stakes and differentiator features. These replace the existing `rw_*` tables, which live in the soon-to-be-eliminated `rules.db`.

| Entity | Required Fields | Replaces |
|--------|----------------|---------|
| `unit_database` | id, name, faction_id, role, damaged_w, damaged_description, composition_text | `rw_datasheets` |
| `unit_database_models` | unit_id, line, name, M, T, Sv, inv_sv, W, Ld, OC | `rw_datasheet_models` |
| `unit_database_weapons` | unit_id, line, name, range, A, BS_WS, S, AP, D, weapon_keywords TEXT | `rw_datasheets_wargear` (adds structured weapon_keywords) |
| `unit_database_abilities` | unit_id, line, name, description, type | `rw_datasheet_abilities` |
| `unit_database_keywords` | unit_id, keyword, is_faction_keyword | `rw_datasheet_keywords` |
| `unit_database_points` | unit_id, model_count INTEGER NULLABLE, points | `rw_datasheet_points` (adds model_count for tier display) |
| `unit_database_leaders` | unit_id, can_lead_unit_id | New — leader attachment targets from BSData |
| FTS5 virtual table | content from unit_name + faction_name + keywords | New — global cross-faction search |

**Key schema decision:** `unit_database` lives in `hobbyforge.db` from the start. This eliminates the cross-database join problem entirely and makes ownership badges and readiness queries trivial LEFT JOINs.

---

## MVP Recommendation

Ordered by dependency and risk. Ship in this order:

1. **Pre-built canonical database** — data acquisition, schema migrations, import script, validation that all factions + units + points are present and correct. This is Phase 1 and blocks everything else.

2. **Faction picker + unit list with role grouping + points** — faction alignment groups, unit list sorted by role, "from X pts" indicator. Faction-scoped text search. This is the browseable product.

3. **Datasheet detail view** — stats block (including Inv Sv), weapons tables, abilities, keywords, points tiers, damaged profile. Evolve PlaybookTab. Add detachment links at faction level.

4. **"Add from Database" collection flow** — browse/search → pick unit → confirm → added to collection with FK link and pre-filled data. Migrate existing collection units to DB FK by name heuristic.

5. **Army list points from database** — remove the 5-level COALESCE chain; read directly from `unit_database_points` via `units.unit_database_id` FK. This is the reliability payoff.

6. **Single-database consolidation** — eliminate `rules.db`, `rules-client.ts`, WAL workarounds, dual-query patterns. Do this last after everything above is stable.

**Defer to post-v0.4.0:**
- Global cross-faction FTS5 search (high value, low complexity — include in MVP if data acquisition lands on schedule; defer if it risks the timeline)
- Ownership + readiness badges on unit list (add once FK link is stable and validated)
- Leader attachment bidirectional links (requires BSData parsing — data acquisition risk; treat as "Should" not "Must")
- Annotation (favorite/wishlist) on database units (pattern is known; low priority for initial release)

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Role grouping categories | HIGH | Confirmed from direct 40k.app page fetch — Epic Heroes / Leaders & Characters / Battleline / Mounted / Infantry, Swarms & Beasts / Aircraft / Titanic / Dedicated Transports / Vehicles & Monsters |
| Datasheet anatomy (stats, weapons, abilities) | HIGH | Confirmed from official GW Warhammer Community articles + multiple community sources (M/T/Sv/Inv/W/Ld/OC, Range/A/BS-WS/S/AP/D weapons table) |
| Faction count and alignment grouping | HIGH | Confirmed ~28–35 factions, Imperium / Space Marines / Chaos / Xenos, from 40k.app and adeptusars.com |
| Existing schema coverage | HIGH | Directly read from migration files — rw_ tables cover 90% of required fields; missing: model_count on points, composition_text, leader targets |
| FTS5 for global search | MEDIUM | SQLite FTS5 is documented and battle-tested. Tauri plugin-sql executes arbitrary SQL, so FTS5 virtual table creation via migration SQL should work — but has not been tested in this codebase. Verify in Phase 1 before committing to global search as a v0.4.0 feature. |
| Leader attachment data availability | MEDIUM | BSData has this in XML. Wahapedia does not currently export it in the CSV sync format used today. Data acquisition risk. |
| Composition text data availability | MEDIUM | BSData has model counts and loadout options. Wahapedia CSV does not include composition text. May require BSData XML parsing as a data source. |
| Points multi-tier structure | HIGH | Known from existing `rw_datasheet_points` limitations and BSData XML structure. Schema change is straightforward; data exists in BSData. |

---

## Sources

- 40k.app factions page (direct fetch, HIGH confidence): https://www.40k.app/factions
- 40k.app Space Marines faction page (direct fetch, HIGH confidence): https://www.40k.app/factions/space-marines — confirmed role grouping categories and points-on-list-row pattern
- Warhammer Community — Anatomy of a New Datasheet (official GW): https://www.warhammer-community.com/en-gb/articles/MNNVVPhc/warhammer-40000-the-anatomy-of-a-new-datasheet/
- Warhammer Community — How Army Building Works in 10th Edition: https://www.warhammer-community.com/en-gb/articles/z6UkH6T3/how-army-building-works-in-the-new-edition-of-warhammer-40000/
- Warhammer Guild — Best Warhammer Apps guide: https://warhammerguild.com/guides/best-warhammer-apps/
- Wahapedia feature overview (Spikey Bits): https://spikeybits.com/wahapedia-10th-edition-rules-resource-guide/
- Adeptus Ars faction list: https://www.adeptusars.com/guides/factions
- Dungeon Forge — How to Read Datasheets: https://dungeonforge.store/how-to-read-datasheets/
- Quartermaster app: https://quartermaster.app/
- Existing codebase — migration files: `src-tauri/migrations/rules_001_schema.sql`, `rules_002_wargear_abilities.sql`, `rules_004_datasheet_points.sql`
- Existing codebase — features: `src/features/rules-hub/`, `src/db/queries/rulesExtended.ts`, `src/db/queries/rulesNotes.ts`
