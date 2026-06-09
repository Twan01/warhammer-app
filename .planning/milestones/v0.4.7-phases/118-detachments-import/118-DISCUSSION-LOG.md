# Phase 118: Detachments Import - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-04
**Phase:** 118-Detachments Import
**Areas discussed:** Schema design, ID strategy, Build script integration, Legends handling
**Mode:** --auto (all decisions auto-selected)

---

## Schema Design

| Option | Description | Selected |
|--------|-------------|----------|
| Two tables | udb_detachments + udb_detachment_abilities (normalized, FK target for Phase 119) | ✓ |
| Single flat table | One table with detachment name as column (simpler but no FK target) | |

**Auto-selected:** Two tables (recommended default — matches success criteria and supports Phase 119 FK needs)

---

## ID Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Wahapedia TEXT PK | Use detachment_id from CSV as TEXT primary key (consistent with udb_units/udb_factions) | ✓ |
| AUTOINCREMENT | Integer PK with auto-increment (simpler but drifts across re-imports) | |

**Auto-selected:** Wahapedia TEXT PK (recommended — success criteria explicitly requires no AUTOINCREMENT drift)

---

## Build Script Integration

| Option | Description | Selected |
|--------|-------------|----------|
| Extend existing script | Add detachment step to build-unit-db.ts (single output JSON) | ✓ |
| New separate script | Dedicated detachment build script with own output | |

**Auto-selected:** Extend existing script (recommended — follows established all-in-one pipeline pattern)

---

## Legends Handling

| Option | Description | Selected |
|--------|-------------|----------|
| Filter legends | Skip rows where legend column is truthy (consistent with Phase 116) | ✓ |
| Keep all | Include legend detachment abilities for completeness | |

**Auto-selected:** Filter legends (recommended — Phase 116 D-05 established Legends filtering across all data)

---

## Claude's Discretion

- HTML sanitization approach for ability descriptions
- Console log format for detachment import stats
- Whether to validate faction_id references during build

## Deferred Ideas

None — discussion stayed within phase scope
