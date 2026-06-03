# Phase 114: Pipeline Fixes & Database Rebuild - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-03
**Phase:** 114-pipeline-fixes-database-rebuild
**Areas discussed:** Parsing bug fixes, Weapon keyword extraction, Per-unit weapon errors, Missing alias strategy, Coverage threshold update
**Mode:** --auto (all decisions auto-selected)

---

## Parsing Bug Fixes

| Option | Description | Selected |
|--------|-------------|----------|
| Fix directly in parser | Change column name accessors to match CSV headers | ✓ |
| Add CSV header normalization layer | Normalize all headers to consistent casing | |

**Auto-selected:** Fix directly in parser (recommended default)
**Notes:** Two one-line fixes: `row["Range"]` → `row["range"]`, `row["keywords"]` → `row["description"]`. Affects 2,472+ weapons across all factions.

---

## Weapon Keyword Extraction

| Option | Description | Selected |
|--------|-------------|----------|
| Read description field | CSV `description` column contains weapon keywords/special rules | ✓ |
| Parse from separate source | Extract keywords from BSData XML instead | |

**Auto-selected:** Read description field (recommended default)
**Notes:** Wahapedia CSV `description` field contains weapon special rules like "Anti-Infantry 4+", "Devastating Wounds".

---

## Per-Unit Weapon Errors

| Option | Description | Selected |
|--------|-------------|----------|
| Investigate root cause first | Check if errors are pipeline bugs vs audit comparison artifacts | ✓ |
| Fix all via aliases/overrides | Treat as data errors and patch individually | |

**Auto-selected:** Investigate root cause first (recommended default)
**Notes:** 51 per-unit errors across 3 factions. Pattern suggests weapon ordering/comparison issue (wrong weapon matched to wrong profile). May be audit script comparison artifact rather than pipeline data bug.

---

## Missing Alias Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Normalization first, aliases for edge cases | Improve parser to handle apostrophes, spacing, casing; alias only what remains | ✓ |
| Add aliases for all unmatched | Quick fix via aliases.json for all 94 missing_alias units | |

**Auto-selected:** Normalization first, aliases for edge cases (recommended default — per PFX-01/02 vs PFX-03 requirement split)
**Notes:** Many "missing_alias" units are Wahapedia-only (no BSData data). Only units with clear BSData↔Wahapedia name mismatches need aliases.

---

## Coverage Threshold Update

| Option | Description | Selected |
|--------|-------------|----------|
| Raise after verifying improvement | Update MIN_COVERAGE_PCT based on actual post-fix coverage | ✓ |
| Keep at 55% | Conservative — don't raise until all factions audited | |

**Auto-selected:** Raise after verifying improvement (recommended default)
**Notes:** Current MIN_COVERAGE_PCT=55, baseline ~60%. If fixes bring coverage to 70%+, raise to 65%.

---

## Claude's Discretion

- Order of fixes within pipeline (systematic bugs first)
- Whether to integrate apostrophe normalization into existing normalize() or add separate pass
- Verification strategy (re-run audit script vs manual spot-check)
- Per-unit weapon error diagnosis approach

## Deferred Ideas

- French translation gaps for abilities — deferred to FR-EXT-01
- Extended faction audits (22 remaining) — deferred to EFA-01..03
- Composition data sparseness — future milestone
