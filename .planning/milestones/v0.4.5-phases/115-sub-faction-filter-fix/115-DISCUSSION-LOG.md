# Phase 115: Sub-faction Filter Fix - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-03
**Phase:** 115-Sub-faction Filter Fix
**Areas discussed:** Filter logic approach, Visual distinction, Sub-faction count accuracy
**Mode:** --auto (all decisions auto-selected)

---

## Filter Logic Approach

| Option | Description | Selected |
|--------|-------------|----------|
| Both SQL + client | Fix getUdbUnitIdsBySubFaction SQL AND applyUdbFilters client filter | ✓ |
| SQL only | Only fix the SQL query (misses DB browser) | |
| Client only | Only fix client filter (misses army list/collection) | |

**User's choice:** [auto] Both — DB browser uses client-side filter, army list/collection use SQL hook
**Notes:** Root cause is identical in both paths: missing `OR sub_faction IS NULL` logic

---

## Visual Distinction

| Option | Description | Selected |
|--------|-------------|----------|
| No distinction | Generic and sub-faction units appear identically | ✓ |
| Badge/label | Add a subtle indicator for generic vs specific units | |

**User's choice:** [auto] No distinction — filter means "available to this sub-faction"
**Notes:** Adding visual distinction would be a new feature, not a bug fix

---

## Sub-faction Count Accuracy

| Option | Description | Selected |
|--------|-------------|----------|
| No count changes | Leave dropdowns as-is (no counts shown) | ✓ |
| Add counts | Show unit count per sub-faction in dropdown | |

**User's choice:** [auto] No count changes — dropdowns don't show counts currently
**Notes:** Adding counts would be scope creep

---

## Claude's Discretion

- Test structure and fixture data for verifying the combined filter result
- Whether to add integration tests or unit tests

## Deferred Ideas

None — discussion stayed within phase scope.
