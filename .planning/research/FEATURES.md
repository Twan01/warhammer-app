# Feature Landscape: Army Lists 3.0 — Smart List Builder

**Domain:** Warhammer 40K 10th edition desktop army list builder (personal hobby tool)
**Researched:** 2026-05-20
**Context:** Additive milestone — app already has basic army list CRUD, detachment selection,
stratagem display, COALESCE points, unit-to-rules mapping, validation warnings, and tactical
role tags. This research covers only the delta features for v0.2.18.

---

## What Existing Tools Do (Competitive Landscape)

Reference tools studied: BattleScribe, New Recruit, official GW Battle Forge app.

| Tool | Strengths | Gaps |
|------|-----------|------|
| BattleScribe | Full wargear/options selection, multi-format export (.rosz/.html/text), battle-tested data model | Abandoned (last update Nov 2025), no collection integration, no hobby context |
| New Recruit | Actively maintained, clean UI, BattleScribe import, collection ownership check ("is this list playable?") | Web-only, no offline, no hobby/painting integration |
| GW Battle Forge | Always accurate, auto-flags illegal lists, wargear/enhancement UI | Paywalled (1 list free), no collection tracking, 40K only |

**Key insight for HobbyForge:** No existing tool integrates list building with hobby state (owned units,
painted percentage, recipe progress). That integration is the unique value of this feature set.

---

## 10th Edition Rules Summary (Affects Feature Scope)

Understanding what the rules actually require informs what the builder must model:

- **Wargear is free** — no points cost for weapon/equipment choices in 10th ed. Wargear selection
  is for reference and loadout tracking only, not points calculation.
- **Model count drives points** — units are bought in fixed size increments (e.g. 5 or 10 models);
  `synced_unit_point_tiers` already stores model_count → points mapping.
- **Enhancements cost points** — character upgrades from the detachment's enhancement list; each
  costs points, max 3 per army, max 1 per character, no duplicates, excluded from Epic Heroes.
- **Army composition is relaxed** — max 3 duplicates of most datasheets (6 for Battleline/Transport),
  1 of each Epic Hero. No complex force org chart.
- **Detachment-scoped enhancements** — each detachment offers its own enhancement list; switching
  detachments invalidates previously assigned enhancements.
- **Warlord** — one character must be designated Warlord (no points cost, just a flag).

**Data already available in hobbyforge.db (from bsdata sync, migration 030):**
- `synced_enhancements` — name, faction_id, detachment_name, points
- `synced_loadout_options` — unit_name, faction_id, group_name, option_name, is_default, is_exclusive
- `synced_model_counts` — unit_name, faction_id, min_models, max_models
- `synced_leader_targets` — leader_name, faction_id, target_name (Leader/Bodyguard pairing)
- `synced_unit_point_tiers` — unit_name, faction_id, model_count, points (migration 029)

**Data available in rules.db:**
- `rw_datasheets` — full faction datasheet index (id, name, role, faction_id)
- `rw_datasheet_points` — name-keyed points (single value per unit)
- `rw_datasheet_wargear` — weapon profiles with stats
- `rw_datasheet_models` — model composition text

---

## Table Stakes

Features users expect from any army list builder. Missing = product feels broken.

| Feature | Why Expected | Complexity | Depends On |
|---------|--------------|------------|------------|
| Model count selection | Points vary by squad size; builder must compute correct points | Medium | `synced_unit_point_tiers` already populated; add `selected_model_count` column on `army_list_units` |
| Wargear/loadout option display | Users need to see what weapons/options a unit can take | Medium | `synced_loadout_options` already populated; wargear is free so display only, no points impact |
| Enhancement assignment to characters | Enhancements cost points and count against 3-max limit | Medium | `synced_enhancements` already populated; needs new `army_list_enhancements` join table + UI |
| Browse rules datasheets (add unowned units) | Plan lists with units not yet owned | High | `rw_datasheets` + `getDatasheetsByFactionWithPoints` exists; needs nullable `unit_id` on `army_list_units` plus `datasheet_id`/`datasheet_name` columns |
| Warlord designation | Required by 10th ed rules; users expect it to be trackable | Low | `is_warlord` flag on `army_list_units` |
| List export to text/clipboard | Share lists in Discord, forums, messaging | Medium | Pure formatting function; no new data model needed |
| Running points total including enhancement points | Core validation feedback loop | Low | Sum `synced_enhancements.points` for assigned enhancements |
| Enhancement limit validation (max 3, no duplicates) | Prevents illegal lists | Low | Count rows in `army_list_enhancements`; extend existing `computeListWarnings()` |
| Composition limit warning (max 3 of same datasheet) | Prevents illegal lists | Low | COUNT by datasheet_id or unit name; extend existing validation layer |
| Unit display order fix | Currently insertion-order only; users want stable ordering | Low | ORDER BY on `getArmyListWithUnits` query — bug fix |

---

## Differentiators

Features that set HobbyForge apart from generic list builders. Uniquely valuable because of
the hobby integration context.

| Feature | Value Proposition | Complexity | Depends On |
|---------|-------------------|------------|------------|
| Owned vs unowned indicator on list units | Instantly see which units you own vs are planning to buy; no other tool does this while also being where you track your collection | Low | `unit_id` nullable; `is_owned` derived as `unit_id IS NOT NULL` |
| Collection quick-add with points pre-resolved | Add from owned collection; existing 5-level COALESCE chain resolves points automatically | Low | Already works; differentiator is keeping this seamless alongside the new "add from rules" flow |
| Painting readiness column in list | See painted % next to each unit while list-building; motivates painting before game day | Low | Already on `ArmyListUnitRow` via `painting_percentage` — surface it more prominently |
| Named version snapshots | Save "v1 Pre-Grotmas" / "v2 Post-points-update" named snapshots | High | New `army_list_versions` table with `snapshot_json` blob |
| Side-by-side version comparison | See exactly what changed between two saved versions | High | Requires snapshots; pure diff UI once data model exists |
| Print-friendly export | Clean formatted output for physical reference at the table | Medium | HTML template → Tauri `print()` or webview-to-PDF via existing window |

---

## Anti-Features

Features to explicitly not build in this milestone.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Full rules legality validation for all edge cases | 40K rules are complex and change frequently; chasing perfect validation is a rabbit hole that never closes | Warn on obvious violations (points over cap, enhancement cap, duplicate epic hero) only |
| Competitive optimization / recommendations | Out of scope per PROJECT.md; this is a hobby tracker, not a coaching tool | Keep existing tactical role coverage visualization; no AI/ML |
| Tournament export (BCP format) | Single user, personal tool, not attending tournaments | Plain text + clipboard covers sharing needs |
| Multi-faction / allied detachment support | Extreme rules complexity for a niche use case | Single faction per list (enforced by existing `faction_id` on `army_lists`) |
| Import from BattleScribe (.rosz) | Complex XML parsing for single-user tool with no existing lists to migrate | Plain text export covers sharing; import not needed |
| Crusade/narrative tracking (XP, battle scars) | Different game mode; significant separate feature set with its own schema | Defer to future milestone |
| Full artwork list printing | Requires GW asset licensing; ArmyDrop handles this use case | Clean text/HTML without artwork |
| Kill Team / Age of Sigmar support | Out of scope per PROJECT.md (40K 10th only) | N/A |
| Collaborative / shared lists | Local-first by design; no accounts | Text export covers sharing |

---

## Feature Dependencies

```
Unit display order fix (standalone, no deps)

Model count selection
  → army_list_units: add selected_model_count INTEGER column (nullable)
  → Points: COALESCE(alu.points_override, tier_lookup(selected_model_count), sup.points, uo.points, u.points, 0)
  → Requires synced_unit_point_tiers to be populated (already is)

Warlord designation
  → army_list_units: add is_warlord INTEGER column (0/1, default 0)
  → Only one per list — enforce in UI (deselect previous when new selected)

Wargear/loadout display
  → synced_loadout_options already populated
  → army_list_units: add selected_loadout_options TEXT (JSON array of option_names)
  → Display only — wargear is free in 10th ed, no points impact

Enhancement assignment
  → Requires: detachment already selected on the list
  → Requires: synced_enhancements populated (already is)
  → New table: army_list_enhancements (id, list_id, unit_id/army_list_unit_id, enhancement_name, points)
  → List-level validation: max 3 enhancements, no duplicates
  → Points total: existing sum + SUM(enhancement.points)

Browse datasheets / add unowned units
  → army_list_units: unit_id becomes nullable
  → army_list_units: add datasheet_id TEXT (rules.db reference, denormalized for display after sync)
  → army_list_units: add datasheet_name TEXT (denormalized display name)
  → is_owned derived: unit_id IS NOT NULL
  → Unowned units: model count defaults to min_models from synced_model_counts

List export (text/clipboard)
  → Requires: enhancement assignments visible
  → No new schema; pure formatting function
  → Format: list name, faction, detachment, points total, per-unit rows (name, model count, wargear, enhancement if any)

Version snapshots
  → Should come AFTER model count + enhancement features (to capture complete state)
  → New table: army_list_versions (id, list_id, name TEXT, snapshot_json TEXT, created_at)
  → snapshot_json: serialized list state including all army_list_units + enhancements + wargear selections
  → Snapshot size: ~2KB per list at typical 20-unit size

Side-by-side comparison
  → Requires: version snapshots
  → Pure UI diff over two snapshot_json blobs
  → Complex UI — defer to later phase within milestone or next milestone
```

---

## MVP Recommendation

Given that bsdata sync already populates all structured data tables, recommended phase
sequence for v0.2.18:

1. **Order fix + model count + warlord** — Three schema columns, one migration. Loadout
   option display as read-only panel. Immediately improves core list-building UX.
   Complexity: Low-Medium.

2. **Enhancements** — New join table, enhancement picker filtered by detachment, points
   added to total, validation warnings. Schema: `army_list_enhancements`.
   Complexity: Medium.

3. **Browse + add unowned datasheets** — Biggest schema change (nullable unit_id). DatasheetPicker
   reused from PlaybookTab. Unowned badge on list rows.
   Complexity: High.

4. **List export** — Text + clipboard. No schema. Pure formatting.
   Complexity: Medium.

5. **Version snapshots** — Named saves of complete list state. New table.
   Complexity: High.

**Defer:** Side-by-side comparison (post-snapshot), Crusade tracking, BattleScribe import.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| 10th ed rules (wargear free, enhancement costs, composition limits) | HIGH | Multiple official sources + GW app behavior confirm |
| Competitive tool feature sets | HIGH | Direct feature descriptions from official sources and community reviews |
| Existing data infrastructure in hobbyforge.db | HIGH | Read directly from migration files and query modules |
| BSData coverage quality | MEDIUM | Tables exist and are populated; coverage varies by faction in upstream .cat files |
| rw_datasheet_points vs synced_unit_point_tiers divergence | MEDIUM | Two separate point sources may disagree for some units; existing COALESCE already handles priority |
| Version snapshot UX | LOW | No precedent in community tools; UI design is open-ended |

---

## Sources

- GW Battle Forge feature description: https://www.wargamer.com/warhammer-40k/app
- 10th edition list building rules overview: https://spikeybits.com/warhammer-40k/games-workshop-reveals-how-to-build-army-lists-in-10th-edition-warhammer-40k/
- Enhancement rules (max 3, points cost): https://ageofminiatures.com/warhammer-40k-10th-edition-changes/
- Wargear free in 10th ed: https://www.wargamer.com/warhammer-40k/points
- BattleScribe feature set: https://battlescribe.soft112.com/
- New Recruit collection integration: https://spark.mwm.ai/us/apps/new-recruit/6742231365
- Tool comparison 2026: https://spikeybits.com/battlescribe-alternative-warhammer-40k-10th-edition-army-list-builder-apps/
- Grimslate features 2026: https://grimslate.com/blog/best-warhammer-40k-army-builder-2026
- Existing code reviewed: src/db/queries/bsdataExtended.ts, src/db/queries/armyLists.ts, src/db/queries/datasheets.ts
- Existing migrations reviewed: 029_synced_point_tiers.sql, 030_bsdata_extended.sql, rules_004_datasheet_points.sql
