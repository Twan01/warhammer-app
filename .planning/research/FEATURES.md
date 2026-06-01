# Feature Research

**Domain:** Warhammer 40K 10th edition personal hobby management — Unit Database 2.0 improvements
**Researched:** 2026-06-01
**Confidence:** HIGH (points matching, sub-faction topology, BSData structure verified from source code + live data); MEDIUM (competitor patterns, French community status); LOW (Wahapedia FR availability)

---

## Context: What Already Exists

v0.4.0 shipped a canonical unit database with 1,711 units across 25 factions, FTS5 search, role/keyword/point filters, virtual scrolling, collection FK linking, and FK-based points resolution. The milestone eliminated rules.db entirely.

This research covers only the **new capabilities** needed for v0.4.2:
1. Points coverage (fix 37% → near-100%)
2. Sub-faction filtering
3. French translation layer
4. Deep integration (PlaybookTab revival, Game Day enrichment, army list tightening)

---

## Capability Area 1: Points Coverage (Near-100%)

### Root Cause Analysis (HIGH confidence — from source code)

The build script (`scripts/build-unit-db.ts`) matches BSData units to Wahapedia units with:
```
key = bsdata_name.toLowerCase() + ":" + faction_id
```
Any name discrepancy between BSData and Wahapedia produces a silent miss. Confirmed failure modes:

1. **Name formatting differences**: BSData uses "Assault Intercessors with Jump Packs"; Wahapedia may write "Assault Intercessors (Jump Pack)". No normalization exists.
2. **Chapter-specific .cat files vs. Wahapedia SM bucket**: BSData has `Imperium - Ultramarines.cat`, `Imperium - Blood Angels.cat`, etc. — all mapped to faction_id "SM". A unit appearing only in the chapter-specific file must have an exactly matching name in Wahapedia's SM bucket, or it misses.
3. **Library files excluded**: Build script skips files matching "Library" (`Library - Astartes Heresy Legends.cat`, etc.). Some units may only appear in those files.
4. **Multi-tier extraction sensitivity**: `extractTiers()` reads XML modifiers with `type="set" field="51b2-306e-1021-d207"`. If BSData uses a different field ID or structure variant, the tier is silently dropped and the fallback `pts` attribute is 0, so the whole unit is excluded.
5. **No diagnostic output**: The build script does not report unmatched BSData names. The developer cannot see what is missing.

### Table Stakes

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Points shown for every unit in army list | Army list is useless without accurate points; 37% coverage means most lists show 0pts for unmatched units | HIGH | Core value delivery; root of the milestone goal |
| Points shown in database browser | Users expect costs when browsing datasheets, just like Wahapedia | LOW | UI exists; data coverage is the gap |
| Points validation in Game Day readiness | Pre-game panel needs accurate total; currently shows wrong totals | LOW | Downstream of coverage fix |

### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Build-script unmatched-names report (per faction) | Developer sees exactly which units are missing; targeted fix instead of guessing | LOW | Console output + optional JSON report file |
| Manual alias override table (`scripts/data/bsdata-aliases.json`) | Maps BSData names to Wahapedia names for known mismatches without touching either source | LOW | Static `[{ bsdata_name, wahapedia_name, faction_id }]`; loaded before match loop |
| Name normalization before matching | Strips punctuation, trims suffixes, normalizes apostrophes; catches ~50% of mismatches automatically | MEDIUM | Pure string transform in build script; no runtime impact |
| Coverage badge in Data Health page | "Points: 1,650 / 1,711 units (96%)" surfaces confidence; surfaces remaining gaps to user | LOW | Query `COUNT(DISTINCT unit_id) FROM udb_points_tiers` vs total unit count |
| Build script CI threshold | Exit non-zero if coverage < 80%; prevents regression when GW updates data | LOW | One check after matching loop |

### Anti-Features

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Runtime points sync from external API | "Always up-to-date" | Breaks offline-first; adds network dependency; fragile on GW updates | Update build script when GW updates; ship new app version |
| Scraping GW official points PDFs | "Accurate source" | Legal ambiguity; PDF structure changes break scraper; maintenance burden | BSData tracks official points via community; use that |
| BSData UUID as primary key in udb_units | "Stable cross-source ID" | BSData IDs reset across edition boundaries; Wahapedia IDs are more stable for 10th ed lifecycle | Keep Wahapedia IDs; alias table bridges BSData names |

---

## Capability Area 2: Sub-faction Filtering

### 40K 10th Edition Sub-faction Topology (HIGH confidence — verified from Wahapedia pages + BSData file listing)

Sub-factions in 40K 10th edition are **keywords**, not separate entities. The detachment system is the primary gameplay mechanic; chapter/warband identity is encoded as faction keywords on unit datasheets.

**Space Marines (faction_id: "SM") — ADEPTUS ASTARTES keyword**

5 chapters with dedicated supplement rules (own detachments, unique army rules, enhancements, stratagems). Exist as separate `.cat` files in BSData and are visually grouped by Wahapedia:
- BLOOD ANGELS (`Imperium - Blood Angels.cat`)
- DARK ANGELS (`Imperium - Dark Angels.cat`)
- BLACK TEMPLARS (`Imperium - Black Templars.cat`)
- SPACE WOLVES (`Imperium - Space Wolves.cat`)
- DEATHWATCH (`Imperium - Deathwatch.cat`)

7 chapters with keyword identity but no separate codex supplement (use SM detachments). Separate `.cat` files in BSData but all map to Wahapedia faction_id "SM":
- ULTRAMARINES, IMPERIAL FISTS, IRON HANDS, RAVEN GUARD, SALAMANDERS, WHITE SCARS, BLOOD RAVENS

SM army rule: you cannot field units from more than one chapter. "One chapter per army" is the core restriction.

**Space Marines Detachments (12 total):** 7 faction-wide (any chapter), 5 chapter-specific (BLOOD ANGELS, DARK ANGELS, BLACK TEMPLARS, SPACE WOLVES, DEATHWATCH).

**Chaos Space Marines (faction_id: "CSM") — HERETIC ASTARTES keyword**

4 god-specific legions with own Codex and separate Wahapedia faction_id — these are already separate factions in the database, not sub-factions:
- WORLD EATERS (faction_id: "WE"), THOUSAND SONS ("TS"), DEATH GUARD ("DG"), EMPEROR'S CHILDREN ("EC")

Remaining CSM use Marks of Chaos as unit-level optional keywords (KHORNE, TZEENTCH, NURGLE, SLAANESH, CHAOS UNDIVIDED) — these are not sub-factions, they are wargear/devotion markers. 13 detachments in CSM codex represent warband flavors; none are named sub-factions requiring separate filtering.

**Aeldari (faction_id: "AE") — shared Codex**
- ASURYANI (Craftworld Aeldari) — `Aeldari - Craftworlds.cat`
- HARLEQUINS — rolled into main Aeldari in 10th ed (TROUPE keyword); `Aeldari - Craftworlds.cat` includes these
- YNNARI — crossover sub-faction; `Aeldari - Ynnari.cat`
- DRUKHARI — already separate faction_id "DRU" in the database; not a sub-faction

**Key technical insight:** Sub-faction keywords are already stored in `udb_unit_keywords` (Wahapedia exports these as `is_faction_keyword=1` rows). The sub-faction filter is a UI feature that surfaces chapter keywords as a structured "Chapter" selector, pre-populated from a static curated list per faction. No new data field is needed.

### Table Stakes

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| "Chapter" filter in database browser (SM-specific) | SM player with Blood Angels wants to see only Blood Angels units; browsing all 300+ SM units without filtering is poor UX | LOW | Add a chapter selector above unit list; filter by `is_faction_keyword=1` AND `keyword IN [chapter list]`; already have keyword filter infrastructure |
| Chapter context persists in army list unit picker | Building a Blood Angels list should default the chapter filter to BLOOD ANGELS | MEDIUM | Detect army list's detachment keyword → pre-set chapter filter in UnitPickerDialog |

### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Curated chapter shortlist per faction (not raw keyword dropdown) | Chapter selector shows "Blood Angels, Dark Angels..." not all 200+ faction keywords | LOW | Static mapping in TypeScript: `{ SM: ["BLOOD ANGELS", "DARK ANGELS", ...], AE: ["ASURYANI", "HARLEQUINS", "YNNARI"] }` |
| Chapter badge on unit cards in browser | Unit card shows "BLOOD ANGELS" badge when that chapter keyword is present | LOW | Styling + keyword lookup; data already present |
| Collection filter by chapter keyword | "Show me only my Blood Angels units" in the collection page | LOW | Extends existing collection keyword filter with same curated chapter shortlist |
| Sub-faction filter in Game Day (for SM armies) | Game Day shows only units belonging to active army's chapter | MEDIUM | Requires army list → chapter detection → filter Game Day unit list |

### Anti-Features

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Sub-faction as a first-class schema entity | "Clean data model" | SM chapters are keyword overlays in 40K 10th — not separate entities. Adding a `sub_factions` table fights the game's own data model and creates a maintenance burden when GW adds new chapters | Use keyword filtering with a curated chapter shortlist |
| Detachment validity enforcement per chapter | "Only show detachments valid for my chapter" | Detachment eligibility rules are complex (some SM detachments require specific chapter keywords; some are universal) and would require encoding complete GW rules logic | Out of scope per PROJECT.md |
| Army-level chapter exclusivity validation | "Warn when mixing Blood Angels and Ultramarines" | High complexity; requires tracking which units have chapter-exclusive keywords vs. generic SM units | Low value for a personal tool where the owner knows their army |

### Static Chapter Keyword Map (for implementation)

```typescript
export const SUBFACTION_KEYWORDS: Record<string, string[]> = {
  SM: [
    "BLOOD ANGELS", "DARK ANGELS", "BLACK TEMPLARS",
    "SPACE WOLVES", "DEATHWATCH",
    "ULTRAMARINES", "IMPERIAL FISTS", "IRON HANDS",
    "RAVEN GUARD", "SALAMANDERS", "WHITE SCARS",
  ],
  AE: ["ASURYANI", "HARLEQUINS", "YNNARI"],
};
```

CSM, DG, TS, WE, EC are already separate factions — no chapter filter needed. For all other factions, no sub-faction filtering is meaningful in 10th edition.

---

## Capability Area 3: French Translation Layer

### Data Availability Assessment (LOW confidence — no automated source found)

**Wahapedia CSV export:** The export specification is "given in Russian and English." No French-language variant exists on wahapedia.ru. The site is English/Russian only. Confirmed via page fetch.

**GW official French:** Games Workshop publishes French codexes and rules books (confirmed via Black Library FR at blacklibrary.com/french). These contain official French translations of all unit names, ability names, and weapon names. However, there is **no machine-readable French data export from GW**. Extracting FR data requires manual entry from physical/digital books.

**BSData French:** A French translation project for BSData existed for 8th edition (`shobu13/warhammer-40000-8th-edition-fr` per BSData/catalogue-development issue #123) but has not been maintained for 10th edition. No active 10th edition BSData FR fork was found.

**Lexicanum French:** French-language Lexicanum exists but covers lore, not structured game data (no stats, no points, no ability text).

**Practical conclusion:** There is no ready-made, machine-readable French game data source for 40K 10th edition. A French translation layer requires manual data entry. This is a multi-week pure data effort with no automation path currently available.

### Effort Estimate (for scoping)

| Scope | Row Count | Estimated Effort |
|-------|-----------|-----------------|
| Unit names only | ~1,711 rows | ~2 hours with official FR codexes |
| Weapon names | ~3,000 rows | ~1 day |
| Ability names only | ~8,000+ rows | ~3 days |
| Ability descriptions (full text) | ~8,000+ rows | ~many weeks |
| Keyword translations | ~200 unique keywords | ~2 hours |

### Table Stakes (if French is in scope)

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| French unit names displayed throughout app | French-speaking user expects their language for unit names | HIGH (data), LOW (code) | No automated source; requires manual entry from GW FR books |
| English fallback when FR translation missing | Partial FR coverage is better than broken UI | LOW | `name_fr ?? name` pattern; zero UX regression |
| Locale toggle (FR/EN) persisted in localStorage | User sets language once | LOW | Same pattern as sidebar collapsed state |

### Differentiators (if French is in scope)

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| French ability text for played units | Full bilingual reference during Game Day for the user's own armies | VERY HIGH (data) | Prioritize user's actual faction over all factions |
| Manual correction UI for FR translations | User can fix wrong translations in-app | MEDIUM | Override table pattern; same as existing user annotations |
| FTS5 search in French | "Intercesseurs" finds Intercessors | MEDIUM | Requires FR text indexed in FTS5; separate content column |

### Anti-Features (French translation)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Auto-translate via Google Translate / DeepL API | "Fast FR coverage" | Online API breaks offline-first; machine-translated 40K ability text is wrong (game terms are not natural language — "Devastating Wounds" is not "Blessures Dévastatrices") | Manual translation of ~200 most-used unit names only as first phase |
| Full FR ability text for all 1,711 units at launch | "Complete FR experience" | Thousands of descriptions; unachievable in one milestone without dedicated data entry time | Phase it: unit names first, ability text deferred to whenever manual entry is complete |
| FR translation as a milestone-blocking feature | "Must ship FR with 2.0" | Blocks the whole milestone on pure data work | Implement schema + infrastructure first; populate FR data as ongoing background task |

### Recommended Schema Addition

A sparse translation table allows partial coverage without null-polluting the main tables:

```sql
CREATE TABLE udb_translations (
  id INTEGER PRIMARY KEY,
  entity_type TEXT NOT NULL CHECK(entity_type IN ('unit', 'ability', 'weapon', 'keyword')),
  entity_id   TEXT NOT NULL,
  field_name  TEXT NOT NULL CHECK(field_name IN ('name', 'description')),
  locale      TEXT NOT NULL CHECK(locale IN ('fr', 'de')),
  value       TEXT NOT NULL,
  UNIQUE(entity_type, entity_id, field_name, locale)
);
```

Only translated rows need entries. English text is always available as fallback. This is non-breaking and adds zero overhead to English-only flows.

---

## Capability Area 4: Deep Integration Revival

### Current State of Stubs (from PROJECT.md + source code)

After v0.4.0 eliminated rules.db, PlaybookTab was explicitly stubbed — it returns empty data for stratagems/detachments. Game Day unit ability cards lost their data backbone. Army list unit picker shows units but not their full game data. The canonical database (udb_* tables in hobbyforge.db) has all the data needed to revive these features; the gap is wiring the UI to the new query layer.

### Table Stakes

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| PlaybookTab shows canonical unit stats/weapons/abilities from udb_* | Unit detail sheet should show the full datasheet; currently shows stubs for key sections | MEDIUM | Wire PlaybookTab to `udb_unit_models`, `udb_unit_weapons`, `udb_unit_abilities` queries; data is already in hobbyforge.db from v0.4.0 import |
| Game Day unit ability cards show real ability text | During game, player needs unit abilities for reference; "no data" placeholders break the use case | MEDIUM | GameDayPage resolves army list units → `udb_unit_id` FK → fetch `udb_unit_abilities` |
| Army list unit picker shows canonical stats thumbnail | Player needs to know what a unit does before adding it to their list | LOW | Already partially done via udb_unit_id FK; add weapon summary or stat block snippet to UnitPickerDialog |

### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| PlaybookTab weapon table from udb_unit_weapons | Full weapon profile (Range/A/BS-WS/S/AP/D/Keywords) during game reference | LOW | Data exists; pure UI wiring |
| PlaybookTab stat block from udb_unit_models | M/T/Sv/Inv Sv/W/Ld/OC per model profile line | LOW | Data exists; pure UI wiring |
| Army list: show unit keywords from canonical DB | Faction keyword display in army list context | LOW | FK join through udb_unit_keywords already available |
| Army list: composition enforcement (min/max models) | Warn when model count in army list is outside valid range | MEDIUM | `udb_unit_composition` has min/max; add validation to `computeListWarnings()` |
| Game Day: unit weapon profiles accessible from unit card | Player can expand a unit card in Game Day to see weapon stats | MEDIUM | Add collapsible weapon panel to GameDayUnitCard using udb_unit_weapons query |

### Anti-Features

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Stratagems in canonical DB at this milestone | "Complete rules reference" | Stratagems are not in Wahapedia CSV export; sourcing them requires a separate data pipeline; out of scope per PROJECT.md (EXT-01) | PlaybookTab stubs for stratagems remain; deferred to v2 |
| Leader attachment rules in canonical DB | "Smart leader validation" | Leader attachment eligibility is not in Wahapedia CSV; complex per-unit data; out of scope per PROJECT.md (EXT-02) | Deferred to v2 |
| Enhancement data in canonical DB | "Points-accurate enhancements" | Not in Wahapedia CSV export; out of scope per PROJECT.md (EXT-03) | Deferred to v2 |
| Runtime fetch of missing unit data | "Fill gaps automatically" | Breaks offline-first | Fix build script coverage; ship complete data |

---

## Capability Area 5: Data Pipeline Hardening

### Table Stakes

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Build script prints per-faction coverage report (matched/unmatched names) | Developer must be able to see what is broken to fix it; currently blind | LOW | Add verbose diagnostic output after the BSData match loop in `build-unit-db.ts` |
| Build script exits non-zero when coverage < threshold | Prevents silent regressions when GW updates data | LOW | One check after matching loop; suggested threshold 85% |

### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Build script writes `coverage-report.json` | Machine-readable coverage data; can be committed to track progress over time | LOW | Write alongside `unit_database.json` |
| Manual alias file with schema validation | Developer-maintained name overrides; validated at build time against both data sources | LOW | Load before match loop; warn on unused aliases |
| Normalize unit names before matching | Strips punctuation, normalizes apostrophes, trims common suffixes; catches majority of formatting mismatches | MEDIUM | Pure string transform; no runtime impact |
| Warn on duplicate unit names within faction | Catches data bugs in Wahapedia CSV | LOW | De-dup check already partially done via `seen` Set; add warning output |

---

## Feature Dependencies

```
Data Pipeline Hardening
    └──should precede──> Points Coverage Fix
                            (coverage report reveals which aliases are needed)

Points Coverage Fix
    └──requires──> Build Script Diagnostic Mode (to identify gaps)
    └──requires──> Manual Alias Table (to fill identified gaps)
    └──enhances──> Army List Validation (accurate totals unlock real validation)
    └──enhances──> Game Day Readiness Panel (accurate totals)
    └──enhances──> Composition Enforcement (points + model count together)

Sub-faction Filter
    └──requires──> Existing udb_unit_keywords data (already present from v0.4.0)
    └──enhances──> Army List Unit Picker (chapter pre-filter)
    └──enhances──> Collection Browser (chapter filter)
    └──enhances──> Game Day (show only active chapter's units)

PlaybookTab Revival
    └──requires──> udb_* tables populated (done in v0.4.0)
    └──enhances──> Game Day (unit ability cards)
    └──enhances──> Army List Builder (stats in unit picker)

French Translation
    └──requires──> udb_translations schema addition (migration)
    └──requires──> Manual data entry (no automated source)
    └──enhances──> FTS5 search (only if FR text is indexed)
    └──is independent of──> all other capability areas

Army List Composition Enforcement
    └──requires──> udb_unit_composition data (from v0.4.0 BSData extraction)
    └──requires──> Points Coverage Fix (warnings are noise without accurate points)
```

### Dependency Notes

- **Points coverage must come first**: At 37%, army list and Game Day readiness are unreliable. Most validation warnings would be false positives. Fix data before building features that depend on it.
- **PlaybookTab revival is a quick win**: Requires only UI wiring to existing data; no new data sourcing. Should be bundled with the integration phase.
- **French translation is fully independent**: Schema addition is non-breaking (migration only adds a table). Zero impact on English-only flows. Can be done in parallel or as a separate phase with no risk.
- **Sub-faction filter has no data dependency**: All chapter keywords are already in `udb_unit_keywords`. The feature is pure UI.

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Build script diagnostic mode + alias table | HIGH (dev) | LOW | P1 — unblocks everything |
| Points coverage overhaul (85%+ target) | HIGH | MEDIUM | P1 — core milestone goal |
| PlaybookTab revival (stats/weapons/abilities from udb_*) | HIGH | LOW | P1 — quick win, high impact |
| Game Day unit ability cards from canonical DB | HIGH | MEDIUM | P1 |
| Sub-faction (chapter) filter in database browser | MEDIUM | LOW | P2 |
| Sub-faction filter in army list unit picker | MEDIUM | MEDIUM | P2 |
| Coverage badge in Data Health page | MEDIUM (dev) | LOW | P2 |
| French translation schema + unit names | MEDIUM | HIGH (data) | P3 |
| Army list composition enforcement (min/max models) | MEDIUM | MEDIUM | P2 |
| Game Day weapon profile panels | LOW | MEDIUM | P3 |
| French ability/weapon text | LOW | VERY HIGH | Defer |

**Priority key:**
- P1: Must have for milestone to deliver on its stated goal
- P2: Should have, add when P1 is complete
- P3: Nice to have, include only if time allows

---

## Competitor Feature Analysis

| Feature | Official GW App | Wahapedia (web) | New Recruit | HobbyForge (current) |
|---------|-----------------|-----------------|-------------|----------------------|
| Points data | Yes (requires codex unlock via $) | Yes (free) | Yes (free, community data) | 37% coverage |
| Sub-faction chapter filter | Yes | Yes (separate faction pages per chapter) | Yes | Keyword filter (no dedicated chapter UX) |
| Full datasheet with abilities | Yes (gated) | Yes (free) | No (army builder only) | Yes (partially stubbed post-v0.4.0) |
| French translation | No (English only) | No (English/Russian) | No | No |
| Offline use | Yes (local cache) | No (web only) | No (web only) | Yes (all data bundled) |
| Collection tracking | No | No | No | Yes |
| Painting workflow | No | No | No | Yes |
| Game Day mode | No | Partial (web reference) | No | Yes (partially stubbed) |
| Personal hobby management | No | No | No | Yes |

**Key HobbyForge position:** The only tool combining offline canonical rules data with personal collection, painting workflow, and Game Day reference in a single desktop app. The gap to close is points coverage — at 37% the army list is the weakest feature in the product. No competitor offers French translation; it would be a unique differentiator but at very high data cost vs. value.

---

## Sources

- `scripts/build-unit-db.ts` — source code analysis of current BSData name-matching strategy and failure modes (HIGH confidence)
- `scripts/data/bsdata/*.cat` — BSData catalogue file listing; XML structure confirmed via raw file fetch showing `id` attributes, `<cost name="pts">`, modifier-based tier point extraction (HIGH confidence)
- Wahapedia Data Export page: https://wahapedia.ru/wh40k10ed/the-rules/data-export/ — "specification text given in Russian and English"; no French mentioned (HIGH confidence for absence of FR)
- Wahapedia Space Marines faction page: https://wahapedia.ru/wh40k10ed/factions/space-marines/ — chapter keyword list (HIGH confidence)
- Wahapedia Chaos Space Marines: https://wahapedia.ru/wh40k10ed/factions/chaos-space-marines/ — 13 detachments, Marks of Chaos keyword system (HIGH confidence)
- BSData wh40k-10e repository: https://github.com/BSData/wh40k-10e — file listing confirms per-chapter .cat files (HIGH confidence)
- BSData Emperor's Children raw XML: https://raw.githubusercontent.com/BSData/wh40k-10e/main/Chaos%20-%20Emperor's%20Children.cat — confirmed `<selectionEntry name="..." id="...">` + `<cost name="pts" value="...">` structure (HIGH confidence)
- BSData French translation GitHub issue: https://github.com/BSData/catalogue-development/issues/123 — 8th edition only, not maintained for 10th (MEDIUM confidence for absence of active FR project)
- Adeptus Ars detachments guide: https://www.adeptusars.com/guides/space-marines-detachments — 12 SM detachments (7 faction-wide, 5 chapter-specific) (MEDIUM confidence)
- Black Library French: https://www.blacklibrary.com/french — GW publishes FR fiction but no structured game data export (HIGH confidence)
- Spikey Bits army builder comparison: https://spikeybits.com/battlescribe-alternative-warhammer-40k-10th-edition-army-list-builder-apps/ — competitor feature landscape (MEDIUM confidence)

---

*Feature research for: HobbyForge v0.4.2 Unit Database 2.0 — Data Quality, Sub-factions & Integration*
*Researched: 2026-06-01*
