# Phase 100: Query-Layer Automation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-28
**Phase:** 100-query-layer-automation
**Areas discussed:** Manual-override guard mechanism, SECTION_TYPES migration strategy, Active project auto-clear policy, Pre-v0.2.9 recipe fallback
**Mode:** --auto (all decisions auto-selected)

---

## Manual-Override Guard Mechanism

| Option | Description | Selected |
|--------|-------------|----------|
| Override columns | Add `status_X_override` boolean columns via migration; StatusPopover sets on manual change | [auto] |
| Timestamp comparison | Compare `updated_at` on unit vs last sync time to detect manual edits | |
| Separate overrides table | Store overrides in a separate table keyed by unit_id + field_name | |

**Auto-selected:** Override columns (recommended default)
**Rationale:** Simplest approach — 3 new INTEGER columns with DEFAULT 0. Directly queryable in syncDerivedStatuses() without JOINs or timestamp math.

---

## SECTION_TYPES Vocabulary Expansion

| Option | Description | Selected |
|--------|-------------|----------|
| Add assembly + basing + varnish | Extend existing const array with 3 explicit values | [auto] |
| Repurpose finishing as varnish | Use existing 'finishing' value as varnish trigger instead of adding new | |
| Freeform section_type | Remove const constraint, allow any string | |

**Auto-selected:** Add assembly + basing + varnish (recommended default)
**Rationale:** Explicit values are clearer than repurposing. 'finishing' remains for general finishing work. Freeform would lose dropdown UX and type safety.

---

## Active Project Auto-Clear Policy

| Option | Description | Selected |
|--------|-------------|----------|
| Auto-clear at 100% | Set is_active_project = 0 when painting_percentage = 100 | [auto] |
| Never auto-clear | Only auto-set on recipe assign; manual clear only | |
| Auto-clear with delay | Clear after 24h at 100% to avoid toggle races | |

**Auto-selected:** Auto-clear at 100% (matches APL-02 requirement)
**Rationale:** APL-02 explicitly requires auto-clear. Race condition (Pitfall 3) only applies during mid-workflow toggling — at 100% the recipe is done, so clearing is safe.

---

## Pre-v0.2.9 Recipe Fallback

| Option | Description | Selected |
|--------|-------------|----------|
| Dual-path (type + name LIKE) | Check section_type first, fall back to name-LIKE for NULL rows | [auto] |
| Migration backfill | Run a one-time migration that sets section_type based on name matching | |
| Strict section_type only | Only derive from section_type; old recipes must be manually updated | |

**Auto-selected:** Dual-path (recommended default)
**Rationale:** STATE.md explicitly says "name-LIKE fallback for pre-v0.2.9 recipes." Backfill migration could misclassify. Strict-only would silently break existing recipes.

---

## Claude's Discretion

- Query consolidation strategy (separate vs combined SQL for assembly/basing/varnish checks)
- Error handling approach for derivation failures (silent log vs toast)
- Test coverage strategy for syncDerivedStatuses paths

## Deferred Ideas

None — discussion stayed within phase scope.
