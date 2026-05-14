# Phase 74: Applied Recipe Identity Hardening - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-14
**Phase:** 74-Applied Recipe Identity Hardening
**Areas discussed:** Migration back-fill strategy, UNIQUE constraint change, Orphaned progress handling, API surface change
**Mode:** --auto (all decisions auto-selected)

---

## Migration Back-Fill Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| JOIN through recipe_steps matching order_index + section context | Reconstruct step identity by joining assignment→recipe→steps, disambiguating per-section order_index | [auto] |
| Global ROW_NUMBER ordinal matching | Number all steps globally and match progress by position | |

**Auto-selected:** JOIN through recipe_steps (recommended — directly uses existing FK relationships and matches STATE.md accumulated decision)
**Notes:** STATE.md already documents: "order_index back-fill SQL must JOIN through recipe_sections to disambiguate per-section values"

---

## UNIQUE Constraint Change

| Option | Description | Selected |
|--------|-------------|----------|
| Table rebuild (CREATE/INSERT/DROP/RENAME) | Standard SQLite pattern since ALTER CONSTRAINT not supported | [auto] |
| New table + copy + drop old | Same approach, different framing | |

**Auto-selected:** Table rebuild pattern (recommended — same approach used in migration 022 for recipe_paints→recipe_steps rename)

---

## Orphaned Progress Handling

| Option | Description | Selected |
|--------|-------------|----------|
| Drop unmappable rows | Progress that can't be resolved to a step is stale/broken data | [auto] |
| Keep orphans in a side table | Preserve for manual review | |

**Auto-selected:** Drop unmappable rows (recommended — success criterion 4 covers zero-progress edge case; orphan detection moves to Phase 77 Data Health)

---

## API Surface Change

| Option | Description | Selected |
|--------|-------------|----------|
| Clean break: rename order_index → recipe_step_id everywhere | Update type, queries, hooks, component in one pass | [auto] |
| Dual support period | Keep order_index alongside recipe_step_id temporarily | |

**Auto-selected:** Clean break (recommended — single-user desktop app, no API consumers to migrate)

---

## Claude's Discretion

- Migration file naming (028_*.sql)
- getStepProgress ordering strategy (direct vs JOIN)
- Test structure and coverage approach

## Deferred Ideas

None — discussion stayed within phase scope
