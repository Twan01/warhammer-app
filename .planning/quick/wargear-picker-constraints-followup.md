# Follow-up: constraint-aware wargear picker

**Status:** deferred (idea / not scheduled)
**Created:** 2026-06-15
**Spun out of:** debug `army-list-wargear-options-empty` (resolved) + MVP picker (migration 047)

## What shipped (MVP)

The army list **Configure → Wargear & Abilities** sheet now has a count-based
picker: each weapon a unit can field gets a quantity stepper, persisted to
`army_list_unit_wargear` (migration 047). Plus a datasheet reference (weapons +
abilities) below it. Selections are free-form — no rule enforcement.

Files: `src-tauri/migrations/047_army_list_unit_wargear.sql`,
`src/db/queries/armyLists.ts`, `src/hooks/useArmyLists.ts`,
`src/features/army-lists/LoadoutBuilderSheet.tsx`,
`src/types/armyList.ts`, `tests/army-lists/LoadoutBuilderSheet.test.tsx`.

## What's still missing (the "proper codex" picker)

The user's full ask is a constraint-aware picker: "1 plasma pistol per 5 models",
"Sergeant may take a power fist", mutually-exclusive option groups ("pick 1 of
these"). That needs **option-group + constraint data we don't currently store.**

### Data gap
- **Wahapedia** (our current source) is a stat-sheet — `Datasheets_wargear.csv`
  has weapon profiles only, NO option groups / selection constraints.
  `udb_unit_weapons` is therefore a flat list (no `option_group_id`,
  `is_optional`, `model_restriction`, `is_exclusive`).
- **BattleScribe `.cat` files** (already downloaded under `scripts/data/bsdata/`)
  DO contain `<selectionEntryGroup>` + `<constraint>` min/max. A parser already
  exists but is **unused**: `src/lib/parseBsdataExtended.ts`
  (`extractLoadoutOptions`). The old `synced_loadout_options` table (migration
  030) modeled `group_name` / `is_default` / `is_exclusive` but was never wired
  up and is stale/orphaned (keyed by BSData names, doesn't match UDB units).
- "X per N models" constraints often live in **rule text**, not structured
  fields — even BSData captures only simple min/max selection counts. Full
  fidelity needs text parsing or manual curation.

### Rough plan if picked up
1. New schema: `udb_unit_options` (unit_id, group_name, is_exclusive, min_picks,
   max_picks, constraint_text) + option→weapon link, or extend
   `udb_unit_weapons` with group/optional columns.
2. Wire `parseBsdataExtended` into the build pipeline; map extracted groups →
   `udb_unit_options` keyed by `udb_unit_id` (need a BSData-name → udb_unit_id
   reconciliation step — coverage will be partial).
3. Picker UI: render option groups, enforce min/max + exclusivity, surface
   "X per N models" as guidance/validation.
4. Graceful degradation: units with no option data fall back to the MVP
   free-form picker.

### Caveats
- BSData coverage is patchy/stale — some units won't have option data.
- Wargear is free in 10th, so points are unaffected either way.
- Decide: ship a partial constraint picker (some units) or wait for fuller data.
