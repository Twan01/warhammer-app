# Phase 113: Priority Faction Data Audit - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-03
**Phase:** 113-priority-faction-data-audit
**Areas discussed:** Audit methodology, Error documentation format, Verification scope, Translation audit approach
**Mode:** --auto (all decisions auto-selected)

---

## Audit Methodology

| Option | Description | Selected |
|--------|-------------|----------|
| Automated script comparison | Read official sources and compare field-by-field against unit_database.json | ✓ |
| Manual spot-check | Manually review a sample of units per faction | |
| Systematic unit-by-unit manual | Open each unit in browser and compare visually | |

**User's choice:** [auto] Automated script comparison (recommended default)
**Notes:** Audit order locked from STATE.md: SM → Necrons → Death Guard

---

## Error Documentation Format

| Option | Description | Selected |
|--------|-------------|----------|
| Structured JSON + summary markdown | JSON per faction with field-level errors + markdown summary tables | ✓ |
| Inline comments in data files | Mark errors directly in unit_database.json or translations_fr.json | |
| Spreadsheet/CSV report | Tabular error list for manual review | |

**User's choice:** [auto] Structured JSON + summary markdown (recommended default)
**Notes:** JSON format enables Phase 114 to programmatically consume the error list

---

## Verification Scope

| Option | Description | Selected |
|--------|-------------|----------|
| Both matched and unmatched | Verify matched unit data AND classify unmatched units | ✓ |
| Matched units only | Only verify data for units already in the database | |
| Matched + add missing aliases | Verify matched AND try to add aliases for unmatched | |

**User's choice:** [auto] Both matched and unmatched (recommended default)
**Notes:** Unmatched classification (Legends/FW/missing alias/missing) feeds Phase 114 pipeline improvements

---

## Translation Audit Approach

| Option | Description | Selected |
|--------|-------------|----------|
| Completeness + correctness check | Verify all matched units have translations AND check against French Wahapedia | ✓ |
| Completeness only | Just check that translation entries exist for all matched units | |
| Skip French audit | Defer all translation work to a future phase | |

**User's choice:** [auto] Completeness + correctness check (recommended default)
**Notes:** Only for matched units — unmatched/Legends translations out of scope

---

## Claude's Discretion

- Script structure and file organization for audit tooling
- How to efficiently read/parse Wahapedia data for comparison
- Error report file naming and location
- Whether to audit composition data or defer

## Deferred Ideas

None — discussion stayed within phase scope.
