# Necrons (NEC) Data Audit Report

**Audited:** 2026-06-03T06:52:33.654Z
**Matched units:** 64
**Unmatched units:** 13
**Per-unit errors:** 23
**Systematic issues:** 2

## Systematic Issues

| Field | Description | Affected Count |
|-------|-------------|----------------|
| weapon.range | All 172 weapons have empty range in DB, but 172 CSV rows have range data. Pipeline bug: reads row["Range"] but CSV header is "range" (lowercase). | 172 |
| weapon.keywords | All 172 weapons have empty keywords in DB, but 98 CSV rows have keyword/special rules data. Pipeline bug: reads row["keywords"] but CSV field is "description". | 172 |

## Error Summary

### Errors by Field

| Field | Count |
|-------|-------|
| weapon.category | 12 |
| weapon.attacks | 10 |
| weapon.skill | 1 |

### Errors by Severity

| Severity | Count |
|----------|-------|
| error | 23 |

### Top 20 Per-Unit Errors (sample)

| Unit | Field | Expected | Actual | Severity |
|------|-------|----------|--------|----------|
| Catacomb Command Barge | weapon.category | Ranged | Melee | error |
| Catacomb Command Barge | weapon.attacks | 3 | 4 | error |
| Catacomb Command Barge | weapon.skill | 2 | 3 | error |
| Chronomancer | weapon.category | Ranged | Melee | error |
| Chronomancer | weapon.attacks | D6 | 3 | error |
| Illuminor Szeras | weapon.category | Ranged | Melee | error |
| Illuminor Szeras | weapon.attacks | 3 | 4 | error |
| Imotekh The Stormlord | weapon.category | Ranged | Melee | error |
| Imotekh The Stormlord | weapon.attacks | 3 | 4 | error |
| Lokhust Lord | weapon.category | Ranged | Melee | error |
| Lokhust Lord | weapon.attacks | 3 | 4 | error |
| Lord | weapon.category | Ranged | Melee | error |
| Nemesor Zahndrekh | weapon.category | Ranged | Melee | error |
| Nemesor Zahndrekh | weapon.attacks | 3 | 4 | error |
| Overlord | weapon.category | Ranged | Melee | error |
| Overlord | weapon.attacks | 3 | 4 | error |
| Plasmancer | weapon.category | Ranged | Melee | error |
| Plasmancer | weapon.attacks | 3 | 2 | error |
| Psychomancer | weapon.category | Ranged | Melee | error |
| Technomancer | weapon.category | Ranged | Melee | error |

## Unmatched Unit Classification

### Summary

| Category | Count |
|----------|-------|
| missing_alias | 6 |
| forge_world | 7 |

### Details

| Unit Name | Category | Evidence |
|-----------|----------|----------|
| Lord | missing_alias | Unit exists in Wahapedia CSV (id: 000000524) but not matched by BSData. Likel... |
| Nemesor Zahndrekh | missing_alias | Unit exists in Wahapedia CSV (id: 000000527) but not matched by BSData. Likel... |
| Vargard Obyron | missing_alias | Unit exists in Wahapedia CSV (id: 000000528) but not matched by BSData. Likel... |
| Anrakyr The Traveller | missing_alias | Unit exists in Wahapedia CSV (id: 000000531) but not matched by BSData. Likel... |
| Canoptek Tomb Stalker | forge_world | Known Forge World / Imperial Armour unit |
| Canoptek Acanthrites | forge_world | Known Forge World / Imperial Armour unit |
| Canoptek Tomb Sentinel | forge_world | Known Forge World / Imperial Armour unit |
| Night Shroud | forge_world | Known Forge World / Imperial Armour unit |
| Sentry Pylon | forge_world | Known Forge World / Imperial Armour unit |
| Tesseract Ark | forge_world | Known Forge World / Imperial Armour unit |
| Gauss Pylon | forge_world | Known Forge World / Imperial Armour unit |
| Lokhust Heavy Destroyers | missing_alias | Unit exists in Wahapedia CSV (id: 000002116) but not matched by BSData. Likel... |
| Tomb Citadel Walls | missing_alias | Unit exists in Wahapedia CSV (id: 000002362) but not matched by BSData. Likel... |

## French Translation Gaps

| Entity Type | Missing Count |
|-------------|---------------|
| Units (name_fr) | 0 |
| Weapons (name_fr) | 0 |
| Abilities (name_fr) | 38 |
