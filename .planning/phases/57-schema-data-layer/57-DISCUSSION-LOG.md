# Phase 57: Schema & Data Layer - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-12
**Phase:** 57-Schema & Data Layer
**Areas discussed:** Const array values, Column types & defaults, DraftSection extension strategy, Query update scope
**Mode:** --auto (all decisions auto-resolved)

---

## Const Array Values

| Option | Description | Selected |
|--------|-------------|----------|
| Use values from requirements | WF-01/WF-02/WF-03 specify exact lists | ✓ |
| Custom values | Define different or expanded lists | |

**Auto-selected:** Use values from requirements (recommended default)
**Notes:** Requirements explicitly enumerate all values. No ambiguity.

---

## Column Types & Defaults

| Option | Description | Selected |
|--------|-------------|----------|
| TEXT DEFAULT NULL | Nullable text, matches existing pattern | ✓ |
| TEXT NOT NULL DEFAULT '' | Non-null with empty default | |

**Auto-selected:** TEXT DEFAULT NULL (recommended default)
**Notes:** WF-05 requires additive/nullable. Matches surface, notes columns.

---

## DraftSection Extension Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Explicit defaults + pass-through | null defaults in makeDraftSection, map in buildDraftSections | ✓ |
| Implicit (omit from draft) | Let undefined propagate | |

**Auto-selected:** Explicit defaults + pass-through (recommended default)
**Notes:** Prevents silent NULL erasure scenario identified in STATE.md decisions.

---

## Query Update Scope

| Option | Description | Selected |
|--------|-------------|----------|
| Minimal — create + update only | SELECT * handles reads automatically | ✓ |
| Full — update all queries | Explicit column lists everywhere | |

**Auto-selected:** Minimal — create + update only (recommended default)
**Notes:** Existing queries use SELECT * for reads. Only write queries need column additions.

---

## Claude's Discretion

- Migration column ordering
- Single vs multiple ALTER TABLE statements (SQLite requires separate ADD COLUMN)
- Exact type alias naming

## Deferred Ideas

None.
