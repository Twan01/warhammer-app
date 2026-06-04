# Phase 119: Stratagems & Enhancements Import - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-04
**Phase:** 119-Stratagems & Enhancements Import
**Areas discussed:** Schema Design, Universal Stratagem Handling, Build Script Integration, Rust Importer Extension
**Mode:** --auto (fully autonomous)

---

## Schema Design

| Option | Description | Selected |
|--------|-------------|----------|
| Mirror Phase 118 pattern | TEXT PKs, FKs to udb_factions + udb_detachments, indexes | ✓ |
| AUTOINCREMENT PKs | Integer PKs with Wahapedia IDs as separate columns | |

**Auto-selected:** Mirror Phase 118 two-table pattern with TEXT PKs from Wahapedia IDs (recommended default)
**Rationale:** Consistent with all other udb_* tables. Phase 118 established the exact pattern for Wahapedia-sourced data.

---

## Universal Stratagem Handling

| Option | Description | Selected |
|--------|-------------|----------|
| Nullable FKs | faction_id and detachment_id are NULL for universal stratagems | ✓ |
| Sentinel values | Use a special "UNIVERSAL" faction/detachment record | |
| Separate table | Split universal stratagems into their own table | |

**Auto-selected:** Nullable faction_id and detachment_id — NULL for universal/core stratagems (recommended default)
**Rationale:** CSV data has genuinely empty faction_id for universal stratagems. NULL FKs are the simplest representation and allow `WHERE faction_id IS NULL` queries for universal stratagem retrieval.

---

## Legends Filtering

| Option | Description | Selected |
|--------|-------------|----------|
| Filter legends | Skip rows with truthy legend column | ✓ |
| Keep legends | Import all rows including legends | |

**Auto-selected:** Filter legends, consistent with Phase 116 D-05 pattern (recommended default)
**Rationale:** Established pattern across all data types in the pipeline.

---

## Build Pipeline Integration

| Option | Description | Selected |
|--------|-------------|----------|
| Extend existing build script | Add Steps 12-13 after detachments in build-unit-db.ts | ✓ |
| Separate build script | New script for stratagems/enhancements | |

**Auto-selected:** Extend build-unit-db.ts with new numbered steps (recommended default)
**Rationale:** Single build script pattern established in Phase 116, extended in Phase 118. All entity types follow the same pipeline.

---

## Claude's Discretion

- HTML sanitization approach (keep as-is recommended)
- Console log format for import stats
- FK reference validation during build (warning vs error)
- cp_cost parsing edge cases

## Deferred Ideas

None — discussion stayed within phase scope
