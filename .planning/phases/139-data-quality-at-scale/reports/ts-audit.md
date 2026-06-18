# Thousand Sons (TS) Data Audit Report

**Audited:** 2026-06-18T10:24:43.780Z
**Matched units:** 60
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
| Fellblade | weapon.attacks | 1 | 2 | error |
| Fellblade | weapon.skill | 4 | 3 | error |
| Fellblade | weapon.keywords | anti-infantry 4+, devastating wounds, rapid fire 1 | rapid fire 2 | error |
| Fellblade | weapon.attacks | 1 | 6 | error |
| Fellblade | weapon.skill | 4 | 3 | error |
| Fellblade | weapon.strength | 4 | 5 | error |
| Fellblade | weapon.ap | 0 | -1 | error |
| Fellblade | weapon.damage | 1 | 2 | error |
| Fellblade | weapon.range | 24 | 36 | error |
| Fellblade | weapon.keywords | anti-infantry 4+, devastating wounds, rapid fire 1 | sustained hits 1, twin-linked | error |
| Fellblade | weapon.attacks | 1 | 2 | error |
| Fellblade | weapon.skill | 4 | 3 | error |
| Fellblade | weapon.strength | 4 | 9 | error |
| Fellblade | weapon.ap | 0 | -4 | error |
| Fellblade | weapon.damage | 1 | D6 | error |
| Fellblade | weapon.range | 24 | 18 | error |
| Fellblade | weapon.keywords | anti-infantry 4+, devastating wounds, rapid fire 1 | melta 2 | error |
| Fellblade | weapon.attacks | 1 | 3 | error |
| Fellblade | weapon.skill | 4 | 3 | error |
| Fellblade | weapon.strength | 4 | 14 | error |

## Unmatched Unit Classification

No unmatched units.

## French Translation Gaps

| Entity Type | Missing Count |
|-------------|---------------|
| Units (name_fr) | 60 |
| Weapons (name_fr) | 361 |
| Abilities (name_fr) | 102 |
