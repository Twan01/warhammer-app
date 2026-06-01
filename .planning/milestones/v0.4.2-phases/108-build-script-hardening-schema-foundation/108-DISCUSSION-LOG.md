# Phase 108: Build Script Hardening & Schema Foundation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-01
**Phase:** 108-Build Script Hardening & Schema Foundation
**Mode:** --auto (all decisions auto-selected)
**Areas discussed:** Points matching strategy, Coverage report format, Data Health badges, _fr column scope

---

## Points Matching Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Multi-pass cascade | Exact → normalized → alias fallback | ✓ |
| Strict exact only | Only match on exact name strings | |
| Fuzzy matching | Levenshtein distance-based matching | |

**Auto-selected:** Multi-pass cascade (recommended default)
**Notes:** Current 37% coverage indicates the matcher is too strict. Multi-pass with normalization should handle most cases automatically, with alias table as escape hatch for edge cases.

---

## Coverage Report Format

| Option | Description | Selected |
|--------|-------------|----------|
| Console + JSON artifact | Output to console during build AND write scripts/data/coverage-report.json | ✓ |
| Console only | Print report during build, no file output | |
| File only | Silent build, write report to file | |

**Auto-selected:** Console + JSON artifact (recommended default)
**Notes:** Console output gives immediate feedback during development. JSON artifact enables programmatic consumption by Data Health page and CI validation.

---

## Data Health Badges

| Option | Description | Selected |
|--------|-------------|----------|
| New section with faction grid | Per-faction grid with green/amber/red coverage badges | ✓ |
| Inline in existing diagnostics | Add coverage as another diagnostic flag | |
| Separate dedicated page | New page for data quality metrics | |

**Auto-selected:** New section with faction grid (recommended default)
**Notes:** Follows existing DataHealthPage section pattern (card-based layout). Three-tier color coding matches existing diagnostic badge pattern.

---

## _fr Column Scope

| Option | Description | Selected |
|--------|-------------|----------|
| FR-01 exact scope | name_fr on 4 tables + keyword_fr on keywords table | ✓ |
| Minimal (units only) | Only name_fr on udb_units and udb_factions | |
| Extended (all text) | Add _fr to every text column including descriptions | |

**Auto-selected:** FR-01 exact scope (recommended default)
**Notes:** Matches FR-01 requirement definition exactly. Extended scope (descriptions) deferred to FR-EXT-01.

---

## Claude's Discretion

- Build script internal architecture (function decomposition, error handling)
- Coverage report JSON schema
- Migration file numbering
- Name normalization regex patterns
- Console output formatting

## Deferred Ideas

None — discussion stayed within phase scope
