# Phase 68: Infrastructure Quick Wins - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-13
**Phase:** 68-Infrastructure Quick Wins
**Areas discussed:** COALESCE fix strategy, Section-aware step ordering, Version alignment, Migration registration
**Mode:** --auto (all decisions auto-selected)

---

## COALESCE Fix Strategy (REC-03)

| Option | Description | Selected |
|--------|-------------|----------|
| Direct assignment | Switch 4 metadata fields from COALESCE to direct `= $N` like surface/notes | :heavy_check_mark: |
| Separate clear function | Add clearSectionMetadata() like armyLists.clearPointsOverride() | |

**Auto-selected:** Direct assignment (recommended default)
**Rationale:** Same function already uses direct assignment for surface and notes. Consistent, minimal change. No need for a separate function when the fix is 4 line changes.

---

## Section-Aware Step Ordering (REC-05)

| Option | Description | Selected |
|--------|-------------|----------|
| JOIN + composite ORDER BY | JOIN recipe_sections, ORDER BY section.order_index then step.order_index | :heavy_check_mark: |
| Subquery approach | Fetch sections first, then steps per section in app code | |

**Auto-selected:** JOIN + composite ORDER BY (recommended default)
**Rationale:** Single query is simpler and matches the existing SQL-first data fetching pattern. Avoids N+1 queries.

---

## Version Alignment (VER-01)

| Option | Description | Selected |
|--------|-------------|----------|
| Update to current milestone | Set to version matching current shipping state | :heavy_check_mark: |
| Wait for milestone completion | Update version only when v0.2.11 ships | |

**Auto-selected:** Update to current milestone (recommended default)
**Rationale:** Version should reflect shipped state. Researcher determines exact version at planning time.

---

## Migration Registration (MIG-01, MIG-02)

| Option | Description | Selected |
|--------|-------------|----------|
| Verify + smoke test | Confirm lib.rs matches migration files, manual fresh install test | :heavy_check_mark: |
| Automated schema assertion | Write a test that checks table existence | |

**Auto-selected:** Verify + smoke test (recommended default)
**Rationale:** Automated schema tests are Phase 72's scope (TST-01). This phase just ensures registration completeness.

---

## Claude's Discretion

- SQL fragment extraction vs inline: Claude decides based on repetition count
- Comment style for COALESCE distinction
- Fix ordering within the plan
- duplicateRecipe section copy: include missing workflow metadata columns

## Deferred Ideas

None
