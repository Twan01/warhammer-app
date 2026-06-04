# Phase 117: Points Coverage - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-04
**Phase:** 117-points-coverage
**Areas discussed:** Points resolution strategy, BSData removal scope, Composition data migration, Coverage threshold
**Mode:** --auto (all decisions auto-selected)

---

## Points Resolution Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Direct datasheet_id join | Parse cost CSV, join on datasheet_id matching unit IDs from Datasheets.csv | ✓ |
| Hybrid (BSData + cost CSV fallback) | Keep BSData for tiers, use cost CSV to fill gaps | |

**Auto-selected:** Direct datasheet_id join (recommended default)
**Rationale:** Cost CSV covers 99.8% of units (1697/1701) via direct ID join — no fuzzy matching needed. BSData hybrid adds complexity for negligible gain.

---

## BSData Removal Scope

| Option | Description | Selected |
|--------|-------------|----------|
| Full removal | Remove @xmldom/xmldom, all XML parsing, alias table, BSData matching | ✓ |
| Partial (keep composition) | Remove points matching but keep BSData for min/max model counts | |

**Auto-selected:** Full removal (recommended default)
**Rationale:** Cost CSV descriptions contain model counts, enabling composition derivation without BSData. Full removal eliminates a heavy dependency and simplifies the pipeline.

---

## Composition Data Migration

| Option | Description | Selected |
|--------|-------------|----------|
| Derive from cost CSV | Extract model counts from cost CSV tier descriptions | ✓ |
| Drop composition entirely | Remove min/max model data | |

**Auto-selected:** Derive from cost CSV (recommended default)
**Rationale:** Cost CSV descriptions like "5 models" / "10 models" provide the same composition bounds that BSData provided, without the XML dependency.

---

## Coverage Threshold

| Option | Description | Selected |
|--------|-------------|----------|
| Raise to 90% | Set MIN_COVERAGE_PCT = 90 (target from requirements) | ✓ |
| Raise to 95% | Set MIN_COVERAGE_PCT = 95 (ambitious target) | |

**Auto-selected:** Raise to 90% (recommended default)
**Rationale:** Requirements specify 90%+ coverage. Data shows 99.8% achievable, but 90% threshold gives buffer for edge cases and future CSV changes.

---

## Claude's Discretion

- Model count extraction regex pattern for non-standard descriptions
- Whether to relocate `readCsvFile()` from `bsdata.ts` to `parseCsv.ts`
- Coverage report format adjustments
- Handling of `scripts/data/bsdata/` directory (delete vs. ignore)

## Deferred Ideas

None — discussion stayed within phase scope
