# Phase 106: Army List Simplification - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-30
**Phase:** 106-army-list-simplification
**Areas discussed:** Points resolution strategy, Ghost unit handling, Validation keyword sourcing, synced_unit_points removal scope
**Mode:** --auto (all decisions auto-selected)

---

## Points Resolution Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Replace synced_unit_points with udb_points FK join | Direct FK join through units.udb_unit_id → udb_points replaces name-based lookup | ✓ |
| Keep synced_unit_points as fallback | Maintain both paths during transition | |
| Hybrid — FK for linked, name for unlinked | Use FK when available, fall back to name match | |

**User's choice:** [auto] Replace synced_unit_points with udb_points FK join (recommended default)
**Notes:** Clean break — the FK path is strictly better than name-based matching. Unlinked units fall through to u.points or 0.

---

## Ghost Unit Handling

| Option | Description | Selected |
|--------|-------------|----------|
| Fallback to 0 | Ghost units have no unit_id, so no FK path — COALESCE ends at 0, users use points_override | ✓ |
| Add ghost_unit_udb_id column | Let ghost units link to database entries directly | |

**User's choice:** [auto] Fallback to 0 (recommended default)
**Notes:** Ghost units are intentionally detached from the collection. points_override already handles manual point assignment.

---

## Validation Keyword Sourcing

| Option | Description | Selected |
|--------|-------------|----------|
| Read from udb_keywords/udb_units.role via FK join | Enrich query with role and keywords, extend computeUnitWarnings/computeListWarnings | ✓ |
| Skip validation — just fix points | Don't add keyword-based validation in this phase | |

**User's choice:** [auto] Read from udb_keywords/udb_units.role via FK join (recommended default)
**Notes:** ALI-02 explicitly requires validation using database keywords and roles. BATTLELINE count check is the primary structural validation.

---

## synced_unit_points Removal Scope

| Option | Description | Selected |
|--------|-------------|----------|
| Remove table, queries, and all references | Clean break — DROP tables, delete query module, remove all JOINs and callers | ✓ |
| Keep tables but stop populating | Leave schema for rollback safety | |
| Deprecate gradually across Phase 106-107 | Split removal across two phases | |

**User's choice:** [auto] Remove table, queries, and all references (recommended default)
**Notes:** Desktop app ships atomically — no need for gradual deprecation. Migration and code changes deploy together.

---

## Claude's Discretion

- SQL optimization approach for base points subquery
- Migration number assignment
- Whether unit_rules_mapping can be fully removed or just simplified
- Warning message text for BATTLELINE count and role validation
- Points freshness indicator update strategy
- Keyword enrichment approach (subquery vs CTE vs join)

## Deferred Ideas

- rules.db elimination — Phase 107
- Enhancement/detachment validation — v2 scope
- Points comparison view (old vs new) — nice-to-have
