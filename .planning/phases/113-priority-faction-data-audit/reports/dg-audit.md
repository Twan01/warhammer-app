# Death Guard (DG) Data Audit Report

**Audited:** 2026-06-03T06:36:39.389Z
**Matched units:** 71
**Unmatched units:** 35
**Per-unit errors:** 5
**Systematic issues:** 2

## Systematic Issues

| Field | Description | Affected Count |
|-------|-------------|----------------|
| weapon.range | All 401 weapons have empty range in DB, but 400 CSV rows have range data. Pipeline bug: reads row["Range"] but CSV header is "range" (lowercase). | 401 |
| weapon.keywords | All 401 weapons have empty keywords in DB, but 320 CSV rows have keyword/special rules data. Pipeline bug: reads row["keywords"] but CSV field is "description". | 401 |

## Error Summary

### Errors by Field

| Field | Count |
|-------|-------|
| weapon.attacks | 1 |
| weapon.skill | 1 |
| weapon.strength | 1 |
| weapon.ap | 1 |
| weapon.damage | 1 |

### Errors by Severity

| Severity | Count |
|----------|-------|
| error | 5 |

### Top 20 Per-Unit Errors (sample)

| Unit | Field | Expected | Actual | Severity |
|------|-------|----------|--------|----------|
| Fellblade | weapon.attacks | 1 | 4 | error |
| Fellblade | weapon.skill | 4 | 3 | error |
| Fellblade | weapon.strength | 4 | 12 | error |
| Fellblade | weapon.ap | 0 | -3 | error |
| Fellblade | weapon.damage | 1 | D6+1 | error |

## Unmatched Unit Classification

### Summary

| Category | Count |
|----------|-------|
| missing_alias | 9 |
| forge_world | 26 |

### Details

| Unit Name | Category | Evidence |
|-----------|----------|----------|
| Death Guard Chaos Lord | missing_alias | Unit exists in Wahapedia CSV (id: 000001037) but not matched by BSData. Likel... |
| Death Guard Chaos Lord In Terminator Armour | missing_alias | Unit exists in Wahapedia CSV (id: 000001038) but not matched by BSData. Likel... |
| Death Guard Sorcerer In Terminator Armour | missing_alias | Unit exists in Wahapedia CSV (id: 000001041) but not matched by BSData. Likel... |
| Death Guard Cultists | missing_alias | Unit exists in Wahapedia CSV (id: 000001043) but not matched by BSData. Likel... |
| Death Guard Possessed | missing_alias | Unit exists in Wahapedia CSV (id: 000001045) but not matched by BSData. Likel... |
| Chaos Thunderhawk | forge_world | Known Forge World / Imperial Armour unit |
| Greater Blight Drone | forge_world | Known Forge World / Imperial Armour unit |
| Chaos Lord On Palanquin Of Nurgle | missing_alias | Unit exists in Wahapedia CSV (id: 000003592) but not matched by BSData. Likel... |
| Gellerpox Infected | missing_alias | Unit exists in Wahapedia CSV (id: 000003593) but not matched by BSData. Likel... |
| Hell Blade | forge_world | Known Forge World / Imperial Armour unit |
| Hell Talon | forge_world | Known Forge World / Imperial Armour unit |
| Mutoid Vermin | missing_alias | Unit exists in Wahapedia CSV (id: 000003596) but not matched by BSData. Likel... |
| Sorcerer On Palanquin Of Nurgle | missing_alias | Unit exists in Wahapedia CSV (id: 000003600) but not matched by BSData. Likel... |
| Terrax-pattern Termite | forge_world | Known FW/Heresy unit; shared Chaos vehicle (exists in BSData under CSM) |
| Land Raider Achilles | forge_world | Known FW/Heresy unit; shared Chaos vehicle (exists in BSData under CSM) |
| Land Raider Proteus | forge_world | Known FW/Heresy unit; shared Chaos vehicle (exists in BSData under CSM) |
| Fire Raptor Gunship | forge_world | Known FW/Heresy unit; shared Chaos vehicle (exists in BSData under CSM) |
| Spartan | forge_world | Known FW/Heresy unit; shared Chaos vehicle (exists in BSData under CSM) |
| Deredeo Dreadnought | forge_world | Known FW/Heresy unit; shared Chaos vehicle (exists in BSData under CSM) |
| Cerberus | forge_world | Known FW/Heresy unit; shared Chaos vehicle (exists in BSData under CSM) |
| Kratos | forge_world | Known FW/Heresy unit; shared Chaos vehicle (exists in BSData under CSM) |
| Sokar-pattern Stormbird | forge_world | Known FW/Heresy unit; shared Chaos vehicle (exists in BSData under CSM) |
| Sicaran Battle Tank | forge_world | Known FW/Heresy unit; shared Chaos vehicle (exists in BSData under CSM) |
| Mastodon | forge_world | Known FW/Heresy unit; shared Chaos vehicle (exists in BSData under CSM) |
| Leviathan Dreadnought | forge_world | Known FW/Heresy unit; shared Chaos vehicle (exists in BSData under CSM) |
| Fellblade | forge_world | Known FW/Heresy unit; shared Chaos vehicle (exists in BSData under CSM) |
| Relic Contemptor Dreadnought | forge_world | Known FW/Heresy unit; shared Chaos vehicle (exists in BSData under CSM) |
| Whirlwind Scorpius | forge_world | Known FW/Heresy unit; shared Chaos vehicle (exists in BSData under CSM) |
| Xiphon Interceptor | forge_world | Known FW/Heresy unit; shared Chaos vehicle (exists in BSData under CSM) |
| Rapier Carrier | forge_world | Known FW/Heresy unit; shared Chaos vehicle (exists in BSData under CSM) |
| Storm Eagle Gunship | forge_world | Known FW/Heresy unit; shared Chaos vehicle (exists in BSData under CSM) |
| Sicaran Venator | forge_world | Known FW/Heresy unit; shared Chaos vehicle (exists in BSData under CSM) |
| Typhon | forge_world | Known FW/Heresy unit; shared Chaos vehicle (exists in BSData under CSM) |
| Sicaran Punisher | forge_world | Known FW/Heresy unit; shared Chaos vehicle (exists in BSData under CSM) |
| Falchion | forge_world | Known FW/Heresy unit; shared Chaos vehicle (exists in BSData under CSM) |

## French Translation Gaps

| Entity Type | Missing Count |
|-------------|---------------|
| Units (name_fr) | 71 |
| Weapons (name_fr) | 401 |
| Abilities (name_fr) | 122 |
