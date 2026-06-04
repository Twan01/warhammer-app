# Feature Landscape: Wahapedia Pipeline & Full Data Import (v0.4.7)

**Domain:** Warhammer 40K 10th edition rules data — stratagems, enhancements, detachment abilities
**Researched:** 2026-06-04
**Confidence:** HIGH (Wahapedia CSV schemas verified live, game mechanics cross-verified from multiple sources)

---

## Verified Wahapedia CSV Schemas

These were fetched directly from wahapedia.ru and are authoritative.

### Stratagems.csv
Fields: `faction_id | name | id | type | cp_cost | legend | turn | phase | detachment | detachment_id | description`

- `type` encodes category: e.g., "Boarding Actions – Battle Tactic Stratagem" — contains the stratagem category (Battle Tactic, Strategic Ploy, Epic Deed, etc.)
- `turn` = "Your turn", "Either player's turn", "Opponent's turn"
- `phase` = "Command phase", "Movement phase", "Shooting phase", "Charge phase", "Fight phase", "Any phase"
- `detachment` = human-readable detachment name (matches Detachments.csv name)
- `detachment_id` = foreign key to Detachments.csv (empty for core/universal stratagems)
- `faction_id` = empty for universal stratagems (core rules stratagems available to all armies)
- CP cost is an integer string (1, 2; 0 = free)

### Enhancements.csv
Fields: `faction_id | id | name | cost | detachment | detachment_id | legend | description`

- `cost` = integer points cost added to the character receiving the enhancement
- `detachment` = human-readable detachment name
- `detachment_id` = FK to Detachments.csv
- Can only be given to CHARACTER units (not EPIC HERO)
- Max 3 enhancements per army list, no duplicates allowed

### Detachment_abilities.csv
Fields: `id | faction_id | name | legend | description | detachment | detachment_id`

- These are the passive army-wide rules granted by a detachment (the "Detachment Rule")
- One or more abilities per detachment (typically 1 per detachment)
- `detachment_id` FK links to Detachments.csv

### Detachments.csv
Fields: `id | faction_id | name | legend | type`

- `type` is often empty for standard 40K detachments; non-empty for Boarding Actions special modes
- This is the anchor FK target for all other rules tables

### Datasheets_models_cost.csv (points replacement for BSData)
Fields: `datasheet_id | line | description | cost`

- `datasheet_id` = Wahapedia unit ID (same as `udb_units.id` — direct FK, no matching needed)
- `line` = integer ordering multiple tiers per unit
- `description` = human-readable tier description e.g., "1 model", "5 models", "10 models"
- `cost` = integer points
- This is a direct replacement for BSData XML matching — same unit IDs as existing udb_* schema

---

## How the Data Flows in a Real Game (Player Reference Patterns)

Understanding player lookup patterns is the primary driver for UI decisions.

**Army building phase (before the game):**
1. Player picks one detachment from their faction's options
2. That detachment unlocks: one passive Detachment Rule + exactly 6 Stratagems + 3-4 Enhancements
3. Player assigns up to 3 enhancements to character units (each costs extra points added to the list total)
4. Points budget must account for enhancement costs

**During the game:**
1. Player tracks Command Points (CP) — starts at 3-4, gains 1 per Command Phase
2. Player scans 6 detachment stratagems + 6 universal core stratagems to decide when to spend CP
3. Stratagems are organized by game phase — primary lookup: "what can I use in the Shooting phase?"
4. Detachment Rule is passive and referenced once per battle round trigger
5. Enhancements are permanent buffs on specific characters — lower lookup urgency, mostly a "reminder" use case

**Key lookup behaviors (informs UI priority):**
- Stratagems: highest-frequency reference during play. Pattern: phase filter → read description → spend CP
- Detachment ability: referenced once per battle round; player re-reads it when relevant situation arises
- Enhancements: referenced when the enhanced character acts; player mostly already knows them
- CP cost displayed prominently on every stratagem card — "Spend" button is the primary CTA in Game Day

---

## Table Stakes

Features users expect. Missing = product feels incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Stratagems visible in Game Day grouped by phase | Core game loop — CP decisions happen every phase; currently shows empty with "select a detachment" placeholder | Low — UI fully built, stub hook replacement only | `StrategemsTab.tsx` line 12 has inline stub returning `[]` |
| Detachment abilities visible in army list detail | Player needs to know their passive rule when viewing the list | Low — UI built, stub removal only | `DetachmentRulesSection.tsx` lines 6-10 both hooks stubbed |
| Enhancements with full descriptions in picker | Current picker (BSData) shows name+points only; descriptions require codex lookup | Medium — adds `legend` + `description` render to existing Sheet | `EnhancementPickerSheet` reads `synced_enhancements` which has no description |
| Points from Datasheets_models_cost.csv at 100% coverage | BSData matching achieves ~60%; 40% of units show no points. This is the most visible data gap | Medium — pipeline change only; `udb_unit_points` destination unchanged | Direct `datasheet_id` FK means no name-matching needed, no aliases |
| Stratagems browsable in Rules Hub | Rules Hub has stratagems tab that shows empty — UI exists, data missing | Low — same `StratagemCard` component, stub hook replacement | `RulesHubPage.tsx` lines 20-28 three stubs |
| Detachment abilities in Rules Hub | Detachment browser shows name/legend only; ability text never shown | Low — `DetachmentCard` needs ability sub-render | Same table as army list feature |

## Differentiators

Features that set this apart from looking up a codex.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Phase-filtered CP tracker with full stratagem text | During game: one tap on phase label → see all relevant stratagems → tap Spend → CP deducted | Low — structure fully built, needs real data | Phase grouping already in `StrategemsTab.tsx`; `PHASE_STYLES` map already defined |
| Universal/core stratagems always shown alongside detachment stratagems | 6 core stratagems apply to all armies (faction_id IS NULL in CSV); currently missing from Game Day | Low — query filter: `WHERE detachment_id = ? OR faction_id IS NULL` | Core stratagems like COMMAND RE-ROLL, INSANE BRAVERY apply to every player |
| Favorite/reminder annotations persist on stratagems | Mark the 2 stratagems you always forget — they surface as Reminders at top of Game Day | Minimal — existing `rules_favorites_notes` table with `rule_id` + `rule_type` composite key works immediately | Wahapedia `id` used as stable `rule_id`; same annotation system already wired |
| CP cost badge + one-tap "Spend" on every card | Eliminates CP arithmetic error during game | Already built in `GameDayStratagemCard.tsx` | Just needs real data flowing through |
| Forgotten rules → reminder pipeline for stratagems | After-action: mark forgotten stratagem → appears highlighted in next Game Day session | Already built | Requires stable Wahapedia IDs — which these CSV IDs are |
| Enhancement description before selection | Player can read the full rule before selecting in army builder — no codex lookup required | Low — adds `legend` + `description` columns to `EnhancementPickerSheet` render | Current BSData `synced_enhancements` table lacks these columns |

## Anti-Features

Features to explicitly NOT build.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Per-unit stratagem filtering (show only stratagems relevant to unit keywords) | Wahapedia CSV has no keyword-to-stratagem mapping; requires brittle text parsing | Phase grouping is sufficient for 10th edition — keep flat list per phase |
| Runtime Wahapedia CSV download from within the running app | Legal gray area for distribution; violates offline-first principle | Build-time auto-download only (dev script) — data ships with app releases |
| Enhancement eligibility enforcement via keyword text parsing | Eligibility is in prose description (e.g., "ADEPTUS CUSTODES model only") — too brittle to parse reliably | Show all detachment enhancements; EPIC HERO keyword guard already implemented |
| Stratagem FTS search in Game Day | Game Day is focused execution mode; search adds complexity without benefit | Keep phase grouping for Game Day; FTS only in Rules Hub browse mode |
| Keep `synced_enhancements` alongside new `udb_enhancements` | Dual sources recreate the same COALESCE complexity v0.4.0 eliminated | Migrate fully from BSData enhancements to Wahapedia enhancements; drop old table |
| Detachment picker re-architected to use `udb_detachments` table with modal browser | Scope creep — `DetachmentPicker` already works by stored `detachment_name`; just wire abilities in `DetachmentRulesSection` | Leave picker unchanged; just replace the downstream stub hooks |
| Detachment rule browser showing cross-faction comparison | No user need identified; single-faction army list context is sufficient | Faction-scoped filter is correct scope |

---

## Feature Dependencies

```
Datasheets_models_cost.csv
  → Directly replaces BSData points pipeline
  → udb_unit_points table unchanged (same schema)
  → BSData .cat files no longer needed in build

New migrations needed (udb_* pattern):
  udb_detachments (new table)
    → udb_stratagems.detachment_id FK
    → udb_enhancements.detachment_id FK
    → udb_detachment_abilities.detachment_id FK

udb_stratagems (new table)
  → StrategemsTab.tsx stub removed (Game Day fixed)
  → RulesHubPage.tsx stratagem stub removed
  → DetachmentRulesSection.tsx stratagem stub removed

udb_detachment_abilities (new table)
  → DetachmentRulesSection.tsx ability stub removed
  → DetachmentCard in Rules Hub enriched

udb_enhancements (new table)
  → EnhancementPickerSheet migrated from synced_enhancements
  → EnhancementsList in Rules Hub gets description+legend
  → synced_enhancements table becomes obsolete

rules_favorites_notes (existing)
  → Works immediately once Wahapedia IDs used as rule_id
  → No schema change needed
```

---

## Schema Gap Analysis

Migration 038 created the `udb_*` tables for unit data only. Four new migrations are needed:

| New Table | Key Fields | FK |
|-----------|-----------|-----|
| `udb_detachments` | id TEXT PK, faction_id, name, legend, type | udb_factions.id |
| `udb_stratagems` | id TEXT PK, faction_id, name, type, cp_cost, legend, turn, phase, description, detachment_id | udb_detachments.id (nullable) |
| `udb_enhancements` | id TEXT PK, faction_id, name, cost INTEGER, legend, description, detachment_id | udb_detachments.id |
| `udb_detachment_abilities` | id TEXT PK, faction_id, name, legend, description, detachment_id | udb_detachments.id |

The `synced_enhancements` table (migration 030) can be dropped in a cleanup migration after `udb_enhancements` is proven.

---

## Data Volume Estimates

Based on live CSV sampling from Wahapedia:

- Detachments: ~150-200 rows (~4-8 per faction × 30 factions)
- Stratagems: ~1,000-1,200 rows (6 per detachment + 6 universal core)
- Enhancements: ~600-800 rows (3-4 per detachment)
- Detachment abilities: ~200-400 rows (1-2 per detachment)
- Points rows: ~3,500 rows (1,711 datasheets × avg ~2 tiers)

All fit comfortably in SQLite at hobbyforge.db scale (currently 41 migrations, hundreds of thousands of app data rows).

---

## MVP Phase Order Recommendation

1. **Points pipeline replacement** — highest user-visible impact; eliminates the 40% no-points gap; pipeline-only change, no UI work
2. **Detachments + stratagems import** — directly unblocks 3 existing stub locations; all UI scaffolding is already built
3. **Detachment abilities import** — completes detachment picture; same pipeline complexity as stratagems
4. **Enhancements import from Wahapedia** — upgrades from name+points to name+points+description; `EnhancementPickerSheet` gets a description panel
5. **BSData dependency removal** — cleanup phase; only safe after all Wahapedia replacements verified

---

## Sources

- Wahapedia Stratagems.csv — live fetch confirmed fields (HIGH confidence)
- Wahapedia Enhancements.csv — live fetch confirmed fields (HIGH confidence)
- Wahapedia Detachment_abilities.csv — live fetch confirmed fields (HIGH confidence)
- Wahapedia Detachments.csv — live fetch confirmed fields (HIGH confidence)
- Wahapedia Datasheets_models_cost.csv — live fetch confirmed fields (HIGH confidence)
- Wahapedia Data Export page: https://wahapedia.ru/wh40k10ed/the-rules/data-export/
- Adeptus Ars Detachments guide: https://www.adeptusars.com/guides/space-marines-detachments (MEDIUM — community, verified against Wahapedia)
- Wargamer Detachments guide: https://www.wargamer.com/warhammer-40k/detachments (MEDIUM)
- Codebase stub analysis — confirmed at exact file/line locations (HIGH confidence)
