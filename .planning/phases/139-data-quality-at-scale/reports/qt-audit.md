# Chaos Knights (QT) Data Audit Report

**Audited:** 2026-06-18T10:24:43.616Z
**Matched units:** 37
**Unmatched units:** 0
**Per-unit errors:** 5
**Systematic issues:** 0

## Systematic Issues

None found.

## Error Summary

### Errors by Field

| Field | Count |
|-------|-------|
| weapon.category | 1 |
| weapon.attacks | 1 |
| weapon.strength | 1 |
| weapon.damage | 1 |
| weapon.range | 1 |

### Errors by Severity

| Severity | Count |
|----------|-------|
| error | 5 |

### Top 20 Per-Unit Errors (sample)

| Unit | Field | Expected | Actual | Severity |
|------|-------|----------|--------|----------|
| Fellgor Beastmen | weapon.category | Melee | Ranged | error |
| Fellgor Beastmen | weapon.attacks | 2 | D3 | error |
| Fellgor Beastmen | weapon.strength | 4 | 5 | error |
| Fellgor Beastmen | weapon.damage | D3 | 1 | error |
| Fellgor Beastmen | weapon.range | Melee | 18 | error |

## Unmatched Unit Classification

No unmatched units.

## French Translation Gaps

| Entity Type | Missing Count |
|-------------|---------------|
| Units (name_fr) | 37 |
| Weapons (name_fr) | 191 |
| Abilities (name_fr) | 61 |
