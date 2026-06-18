# World Eaters (WE) Data Audit Report

**Audited:** 2026-06-18T10:24:43.907Z
**Matched units:** 58
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
| error | 82 |
| missing | 5 |

### Top 20 Per-Unit Errors (sample)

| Unit | Field | Expected | Actual | Severity |
|------|-------|----------|--------|----------|
| Fellblade | weapon.attacks | 1 | D6 | error |
| Fellblade | weapon.skill | 4 | N/A | error |
| Fellblade | weapon.strength | 4 | 5 | error |
| Fellblade | weapon.ap | 0 | -1 | error |
| Fellblade | weapon.range | 24 | 12 | error |
| Fellblade | weapon.keywords | anti-infantry 4+, devastating wounds, rapid fire 1 | ignores cover, torrent, twin-linked | error |
| Fellblade | weapon.attacks | 1 | D6 | error |
| Fellblade | weapon.skill | 4 | N/A | error |
| Fellblade | weapon.strength | 4 | 5 | error |
| Fellblade | weapon.ap | 0 | -1 | error |
| Fellblade | weapon.range | 24 | 12 | error |
| Fellblade | weapon.keywords | anti-infantry 4+, devastating wounds, rapid fire 1 | ignores cover, torrent | error |
| Fellblade | weapon.attacks | 1 | 3 | error |
| Fellblade | weapon.skill | 4 | 3 | error |
| Fellblade | weapon.strength | 4 | 14 | error |
| Fellblade | weapon.ap | 0 | -4 | error |
| Fellblade | weapon.damage | 1 | D6+1 | error |
| Fellblade | weapon.range | 24 | 36 | error |
| Fellblade | weapon.keywords | anti-infantry 4+, devastating wounds, rapid fire 1 | heavy | error |
| Fellblade | weapon.attacks | 1 | 2 | error |

## Unmatched Unit Classification

No unmatched units.

## French Translation Gaps

| Entity Type | Missing Count |
|-------------|---------------|
| Units (name_fr) | 58 |
| Weapons (name_fr) | 332 |
| Abilities (name_fr) | 100 |
