---
slug: army-list-detachment-units
status: resolved
trigger: user-report
created: 2026-05-20
---

# Debug: Army List — Detachment picker empty + units not adding

## Symptoms
- User can create an army list successfully
- After creating, the detachment picker shows nothing (no detachments visible to select)
- When selecting a unit to add to the army, the unit is not actually added

## Investigation

### Evidence
- timestamp: 2026-05-20 — Static analysis of full detachment data chain
  - DetachmentPicker.tsx: receives factionWahapediaId, calls useDetachmentsByFaction
  - ArmyListDetailSheet.tsx: resolves wahapediaFactionId via useWahapediaFactionId(faction?.name)
  - useDatasheet.ts: useWahapediaFactionId queries rw_factions in rules.db
  - rulesExtended.ts: getDetachmentsByFaction queries rw_detachments WHERE faction_id = $1
  - datasheets.ts: resolveWahapediaFactionIdByName has 3-step matching (exact, alias, normalized)
  - When rw_factions is empty (no sync) or name mismatch, returns null -> undefined -> query disabled
  - Empty picker shows generic "No detachments found." with no guidance on WHY

- timestamp: 2026-05-20 — Static analysis of unit-add mutation chain
  - UnitPickerDialog.tsx: handleSelect calls addUnitToList.mutate({list_id, unit_id})
  - useArmyLists.ts: useAddUnitToList invalidates ARMY_LIST_KEY, ARMY_LIST_UNITS_KEY, ARMY_LISTS_KEY
  - armyLists.ts: addUnitToList INSERT INTO army_list_units is syntactically correct
  - cmdk CommandItem value={unit.name} — duplicate unit names cause cmdk to treat items as identical
  - onError handler had no console.error logging, making diagnosis impossible

- timestamp: 2026-05-20 — TypeScript compiles clean, all 33 army-list tests pass
  - Build produces clean output (no TS errors)
  - Pre-existing test failures in unrelated files (migration parity, cache invalidation counts)

### Hypothesis 1: Detachment data missing from rules.db (CONFIRMED — data dependency)
When rules haven't been synced from Wahapedia, rw_factions and rw_detachments are empty.
The picker shows "No detachments found." with no explanation. This is expected behavior
but poor UX — user thinks it's a bug.

### Hypothesis 2: cmdk duplicate value collision (CONFIRMED — code bug)
cmdk v1 uses the `value` prop as an internal item identity key. UnitPickerDialog used
`value={unit.name}` which means units with identical names (common in Warhammer — e.g.,
multiple "Intercessors" across factions) would be treated as the same item by cmdk.
The onSelect callback for duplicate-named items would fire for the first matching item
only, or not fire at all in some cases.

### Hypothesis 3: Silent error swallowing (CONFIRMED — diagnosability gap)
Both UnitPickerDialog.handleSelect and ArmyListDetailSheet.handleRemoveUnit had bare
toast.error() calls without console.error logging. Any actual runtime errors were
invisible to the developer.

## Current Focus
- hypothesis: resolved
- next_action: none

## Resolution
- root_cause: Two issues — (1) DetachmentPicker showed generic "No detachments found" when rules.db is empty/unsynced, giving no guidance to the user. (2) UnitPickerDialog used unit.name as cmdk CommandItem value, causing duplicate-named units to collide in cmdk's internal state and preventing onSelect from firing correctly.
- fix: (1) Added rulesSynced prop to DetachmentPicker with contextual empty-state messages (sync needed, faction mismatch, or genuinely no detachments). (2) Changed CommandItem value to include unit.id for uniqueness. (3) Added console.error logging to all mutation error handlers. (4) Improved empty state in UnitPickerDialog when collection has no units.
