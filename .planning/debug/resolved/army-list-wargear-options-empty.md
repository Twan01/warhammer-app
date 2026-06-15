---
slug: army-list-wargear-options-empty
status: resolved
trigger: "When building an army in army list, selecting a unit and clicking Configure (e.g. Assault Intercessors Squad) lets you set model count (points adapt correctly) but the Wargear Options section is empty. Expected: select weapons (e.g. x bolters, y other weapons), see them listed with their abilities, and see the unit's abilities — like a codex datasheet but reflecting only the selected weapons."
created: 2026-06-15
updated: 2026-06-15
---

# Debug: army-list-wargear-options-empty

## Symptoms
- expected: Wargear Options should let user pick weapons/equipment for the configured unit (with counts where applicable), then show selected weapons with their stats/abilities plus the unit's own abilities — a datasheet-style view filtered to the chosen wargear.
- actual: Wargear Options section is empty. Model count selector works and points update correctly.
- scope: Empty for EVERY unit tried (not unit-specific).
- error_messages: none reported
- timeline: not specified
- reproduction: Army list builder → add/select a unit → Configure → Wargear Options section is blank.

## Goal
Both: (1) diagnose why Wargear Options is empty, (2) build the full datasheet-style wargear selection + abilities UI.

## Current Focus
- hypothesis: LoadoutBuilderSheet's Wargear Options reads from the orphaned/stale `synced_loadout_options` (BSData) table, keyed by unit_name + abbreviated faction code, which never matches the user's Wahapedia/UDB-sourced units. The canonical wargear is in `udb_unit_weapons`/`udb_unit_abilities`, keyed by `units.udb_unit_id`.
- next_action: Replace the synced_loadout_options-based wargear display with `useUdbUnitDetail(unit.udb_unit_id)` + render via the existing `PlaybookDatasheet` component (weapons + abilities, codex-style).
- reasoning_checkpoint:
    hypothesis: "Wargear Options is empty because getLoadoutOptionsForUnit queries the stale synced_loadout_options table by (unit_name, numeric faction_id), but that table holds old BSData rows keyed by BSData names and text faction codes (SM/CSM/DG...). Neither key matches the app's current Wahapedia/UDB units, so the query returns 0 rows for every unit."
    confirming_evidence:
      - "synced_loadout_options has 2400 rows but all synced_at 2026-05-28 (pre-Wahapedia migration); faction_id values are text codes (GC,AC,AoI,AdM,CSM,TS,SM,AS,DG,WE,EC), not numeric."
      - "No 'Assault Intercessors Squad' exists in synced_loadout_options at all (only Death Company Intercessor variants) — the symptom unit cannot match."
      - "getLoadoutOptionsForUnit WHERE unit_name=$1 AND (faction_id IS NULL OR faction_id=$2); factionIdStr is built from unit.faction_id (numeric, e.g. 5) -> never equals 'DG' etc."
      - "Tiers (DL-01) already migrated to udb_unit_points via udb_unit_id (Phase 106) and work; wargear (DL-02) was left on the old table — explains why model count works but wargear is empty."
      - "Canonical wargear exists and is rich: udb_unit_weapons has 9208 rows, udb_unit_abilities 7146; getUdbUnitDetail(udb_unit_id) already returns weapons+abilities; PlaybookDatasheet already renders them."
    falsification_test: "If getLoadoutOptionsForUnit returned rows for a typical army-list unit, the section would not be empty. Direct DB check confirms 0 matches for the user's units. Conversely, udb_unit_weapons returns 5+ weapons for the same unit's udb_unit_id."
    fix_rationale: "Switch the data source from synced_loadout_options to the canonical udb_unit_id-keyed UDB detail (the same source tiers already use and the same source the Unit Database/Playbook datasheets render). This addresses the root cause (wrong/stale data source) and also fulfils the user's request for a codex-style weapons+abilities view by reusing PlaybookDatasheet."
    blind_spots: "Ghost/planned units have udb_unit_id = null (e.g. unit 9 Plague Marine Champion) and will legitimately show no datasheet — must handle gracefully. The user also asked for *selectable* wargear (pick x bolters / y other weapons) with live points; the canonical UDB data does not currently model selectable option groups with per-option points, so a true interactive picker is out of scope for this data source. Deliver the datasheet-style weapons+abilities display (resolves the empty-section bug + abilities request); flag selectable-with-points as a separate feature."

## Evidence
- timestamp: 2026-06-15
  checked: src/features/army-lists/LoadoutBuilderSheet.tsx + useLoadoutOptions.ts + bsdataExtended.getLoadoutOptionsForUnit
  found: Wargear Options renders wargearOptions from useLoadoutOptionsForUnit(unitName, factionIdStr), which calls getLoadoutOptionsForUnit -> SELECT FROM synced_loadout_options WHERE unit_name=$1 AND (faction_id IS NULL OR faction_id=$2).
  implication: Display depends entirely on synced_loadout_options matching by name + faction.
- timestamp: 2026-06-15
  checked: hobbyforge.db (live, via better-sqlite3)
  found: synced_loadout_options = 2400 rows, synced_at 2026-05-28, faction_id = text codes (SM/CSM/DG/...). No "Assault Intercessors Squad" present. army_list_units units carry udb_unit_id (e.g. unit 10 Overlord -> "000000523"); units.faction_id is numeric (3,5,...).
  implication: Name AND faction keys both mismatch -> query returns 0 rows for every current unit -> section empty for all units (matches "empty for EVERY unit").
- timestamp: 2026-06-15
  checked: hobbyforge.db canonical tables + src/db/queries/unitDatabase.getUdbUnitDetail + hooks/useUnitDatabase.useUdbUnitDetail + features/units/PlaybookDatasheet.tsx
  found: udb_unit_weapons=9208 rows, udb_unit_abilities=7146; getUdbUnitDetail(udb_unit_id) returns {models,weapons,abilities,keywords,points}. udb_unit_weapons for "000000523" returns 5 full weapon profiles. PlaybookDatasheet renders weapons (ranged/melee) + abilities (core/faction/unit) from a UdbUnitDetail.
  implication: A correct, FK-keyed wargear/datasheet source and a ready render component already exist; the fix is to point LoadoutBuilderSheet at them via unit.udb_unit_id.
- timestamp: 2026-06-15
  checked: tiers path (DL-01) vs wargear path (DL-02)
  found: useTiersByUdbUnitId(udb_unit_id) already migrated to udb_unit_points (Phase 106); wargear still on synced_loadout_options.
  implication: Explains why model count + points work but wargear is empty — incomplete migration.

## Eliminated
- hypothesis: Wargear data is missing from the database entirely.
  evidence: udb_unit_weapons (9208) and udb_unit_abilities (7146) are fully populated; the data is present, just not queried by LoadoutBuilderSheet.
  timestamp: 2026-06-15
- hypothesis: Faction filtering passes the wrong value but the table is otherwise correct.
  evidence: Even ignoring faction, the unit_name "Assault Intercessors Squad" does not exist in synced_loadout_options; the table is stale BSData, not the current dataset. Both keys are wrong, and the table is the wrong source.
  timestamp: 2026-06-15

## Resolution
- root_cause: LoadoutBuilderSheet's Wargear Options (DL-02) sources data from the stale, orphaned `synced_loadout_options` table (last synced 2026-05-28, pre-Wahapedia migration), queried by `unit_name` + numeric `faction_id`. That table's rows use BSData unit names and text faction codes (SM/CSM/DG...), so the query matches 0 rows for the app's current Wahapedia/UDB-sourced units — empty for every unit. The tier selector was migrated to the canonical `udb_unit_points` (via `units.udb_unit_id`) in Phase 106, but the wargear path was never migrated.
- fix: Replace the synced_loadout_options-based wargear list with the canonical UDB datasheet. Use `useUdbUnitDetail(unit.udb_unit_id)` and render via the existing `PlaybookDatasheet` component (weapons split ranged/melee + datasheet abilities), giving the codex-style view the user requested. Handle null udb_unit_id (ghost/planned units) gracefully.
- verification: tsc --noEmit passes clean. LoadoutBuilderSheet.test.tsx rewritten to mock useUdbUnitDetail + assert canonical datasheet rendering; all 10 tests pass (weapons render, abilities render, empty-datasheet state, unlinked/ghost state, tiers, override warning). Pre-existing unrelated failures in tests/applied-recipes/assignmentChecklist.test.tsx (introduced by recipe-checklist feature, untouched by this change). Awaiting user confirmation that Wargear & Abilities now populates in the running app for a real unit (e.g. Assault Intercessors Squad / Overlord).
- files_changed:
    - src/features/army-lists/LoadoutBuilderSheet.tsx (switched Wargear Options from stale synced_loadout_options to canonical useUdbUnitDetail(udb_unit_id) + PlaybookDatasheet render; removed groupByGroupName helper, unused factionIdStr/listFactionId destructure, SyncedLoadoutOptionRow/Badge-for-wargear usage)
    - tests/army-lists/LoadoutBuilderSheet.test.tsx (rewrote wargear tests to mock useUdbUnitDetail and assert weapons + abilities + empty/unlinked states)
