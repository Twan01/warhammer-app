# Chaos Space Marines (CSM) Data Audit Report

**Audited:** 2026-06-18T10:24:43.211Z
**Matched units:** 112
**Unmatched units:** 0
**Per-unit errors:** 87
**Systematic issues:** 0

## Systematic Issues

None found.

## Error Summary

### Errors by Field

| Field | Count |
|-------|-------|
| weapon.attacks | 14 |
| weapon.keywords | 14 |
| weapon.skill | 13 |
| weapon.strength | 13 |
| weapon.range | 12 |
| weapon.ap | 10 |
| weapon.damage | 9 |
| weapon.category | 2 |

### Errors by Severity

| Severity | Count |
|----------|-------|
| error | 81 |
| missing | 6 |

### Top 20 Per-Unit Errors (sample)

| Unit | Field | Expected | Actual | Severity |
|------|-------|----------|--------|----------|
| Fellblade | weapon.attacks | 1 | 3 | error |
| Fellblade | weapon.skill | 4 | 3 | error |
| Fellblade | weapon.strength | 4 | 5 | error |
| Fellblade | weapon.ap | 0 | -1 | error |
| Fellblade | weapon.damage | 1 | 2 | error |
| Fellblade | weapon.range | 24 | 36 | error |
| Fellblade | weapon.keywords | anti-infantry 4+, devastating wounds, rapid fire 1 | sustained hits 1, twin-linked | error |
| Fellblade | weapon.attacks | 1 | 3 | error |
| Fellblade | weapon.skill | 4 | 3 | error |
| Fellblade | weapon.strength | 4 | 5 | error |
| Fellblade | weapon.ap | 0 | -1 | error |
| Fellblade | weapon.damage | 1 | 2 | error |
| Fellblade | weapon.range | 24 | 36 | error |
| Fellblade | weapon.keywords | anti-infantry 4+, devastating wounds, rapid fire 1 | sustained hits 1 | error |
| Fellblade | weapon.attacks | 1 | D6 | error |
| Fellblade | weapon.skill | 4 | 3 | error |
| Fellblade | weapon.strength | 4 | 5 | error |
| Fellblade | weapon.range | 24 | 48 | error |
| Fellblade | weapon.keywords | anti-infantry 4+, devastating wounds, rapid fire 1 | blast | error |
| Fellblade | weapon.attacks | 1 | D6 | error |

## Unmatched Unit Classification

No unmatched units.

## French Translation Gaps

| Entity Type | Missing Count |
|-------------|---------------|
| Units (name_fr) | 112 |
| Weapons (name_fr) | 723 |
| Abilities (name_fr) | 209 |
