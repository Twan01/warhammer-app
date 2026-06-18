# Death Guard (DG) Data Audit Report

**Audited:** 2026-06-18T10:24:43.253Z
**Matched units:** 71
**Unmatched units:** 0
**Per-unit errors:** 94
**Systematic issues:** 0

## Systematic Issues

None found.

## Error Summary

### Errors by Field

| Field | Count |
|-------|-------|
| weapon.attacks | 15 |
| weapon.keywords | 15 |
| weapon.skill | 14 |
| weapon.strength | 14 |
| weapon.range | 13 |
| weapon.ap | 11 |
| weapon.damage | 10 |
| weapon.category | 2 |

### Errors by Severity

| Severity | Count |
|----------|-------|
| error | 88 |
| missing | 6 |

### Top 20 Per-Unit Errors (sample)

| Unit | Field | Expected | Actual | Severity |
|------|-------|----------|--------|----------|
| Fellblade | weapon.attacks | 1 | 4 | error |
| Fellblade | weapon.skill | 4 | 3 | error |
| Fellblade | weapon.strength | 4 | 12 | error |
| Fellblade | weapon.ap | 0 | -3 | error |
| Fellblade | weapon.damage | 1 | D6+1 | error |
| Fellblade | weapon.range | 24 | 48 | error |
| Fellblade | weapon.keywords | anti-infantry 4+, devastating wounds, rapid fire 1 |  | missing |
| Fellblade | weapon.attacks | 1 | 2 | error |
| Fellblade | weapon.skill | 4 | 3 | error |
| Fellblade | weapon.keywords | anti-infantry 4+, devastating wounds, rapid fire 1 | rapid fire 2 | error |
| Fellblade | weapon.attacks | 1 | 3 | error |
| Fellblade | weapon.skill | 4 | 3 | error |
| Fellblade | weapon.strength | 4 | 5 | error |
| Fellblade | weapon.ap | 0 | -1 | error |
| Fellblade | weapon.damage | 1 | 2 | error |
| Fellblade | weapon.range | 24 | 36 | error |
| Fellblade | weapon.keywords | anti-infantry 4+, devastating wounds, rapid fire 1 | sustained hits 1, twin-linked | error |
| Fellblade | weapon.attacks | 1 | D6 | error |
| Fellblade | weapon.skill | 4 | N/A | error |
| Fellblade | weapon.strength | 4 | 5 | error |

## Unmatched Unit Classification

No unmatched units.

## French Translation Gaps

| Entity Type | Missing Count |
|-------------|---------------|
| Units (name_fr) | 0 |
| Weapons (name_fr) | 1 |
| Abilities (name_fr) | 25 |
