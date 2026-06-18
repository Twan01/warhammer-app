# Genestealer Cults (GC) Data Audit Report

**Audited:** 2026-06-18T10:24:43.376Z
**Matched units:** 138
**Unmatched units:** 0
**Per-unit errors:** 434
**Systematic issues:** 0

## Systematic Issues

None found.

## Error Summary

### Errors by Field

| Field | Count |
|-------|-------|
| weapon.keywords | 81 |
| weapon.range | 68 |
| weapon.strength | 66 |
| weapon.attacks | 59 |
| weapon.damage | 43 |
| weapon.category | 41 |
| weapon.ap | 41 |
| weapon.skill | 35 |

### Errors by Severity

| Severity | Count |
|----------|-------|
| error | 348 |
| missing | 86 |

### Top 20 Per-Unit Errors (sample)

| Unit | Field | Expected | Actual | Severity |
|------|-------|----------|--------|----------|
| Cadian Command Squad | weapon.category | Ranged | Melee | error |
| Cadian Command Squad | weapon.attacks | 1 | 3 | error |
| Cadian Command Squad | weapon.strength | 4 | 6 | error |
| Cadian Command Squad | weapon.ap | 0 | -2 | error |
| Cadian Command Squad | weapon.damage | 1 | 2 | error |
| Cadian Command Squad | weapon.range | 12 | Melee | error |
| Cadian Command Squad | weapon.keywords | pistol |  | missing |
| Cadian Command Squad | weapon.category | Ranged | Melee | error |
| Cadian Command Squad | weapon.attacks | 1 | 2 | error |
| Cadian Command Squad | weapon.strength | 4 | 3 | error |
| Cadian Command Squad | weapon.range | 12 | Melee | error |
| Cadian Command Squad | weapon.keywords | pistol |  | missing |
| Cadian Command Squad | weapon.category | Ranged |  | missing |
| Cadian Command Squad | weapon.attacks | 1 | 0 | error |
| Cadian Command Squad | weapon.skill | 4 | - | error |
| Cadian Command Squad | weapon.strength | 4 | - | error |
| Cadian Command Squad | weapon.damage | 1 | - | error |
| Cadian Command Squad | weapon.range | 12 |  | missing |
| Cadian Command Squad | weapon.keywords | pistol |  | missing |
| Cadian Command Squad | weapon.strength | 4 | 8 | error |

## Unmatched Unit Classification

No unmatched units.

## French Translation Gaps

| Entity Type | Missing Count |
|-------------|---------------|
| Units (name_fr) | 138 |
| Weapons (name_fr) | 824 |
| Abilities (name_fr) | 284 |
