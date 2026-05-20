# Phase 89: Schema + Data Layer - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-20
**Phase:** 89-schema-data-layer
**Areas discussed:** Enhancement storage, Leader attachment, Ghost units, COALESCE chain, Warlord enforcement
**Mode:** --auto (all decisions auto-selected)

---

## Enhancement Storage Model

| Option | Description | Selected |
|--------|-------------|----------|
| Join table `army_list_enhancements` | Separate table with list_id + army_list_unit_id + enhancement_name TEXT + points INTEGER. Cleaner for max-3 validation. | [auto] |
| Columns on `army_list_units` | enhancement_name + enhancement_points columns directly on the unit row. Simpler but wastes NULLs on non-character units. | |

**Auto-selected:** Join table (recommended default — cleaner validation, follows research recommendation)
**Notes:** Enhancement name and points stored as denormalized copies per Pitfall 1/2 prevention.

---

## Leader Attachment Storage

| Option | Description | Selected |
|--------|-------------|----------|
| Column on `army_list_units` | `leader_attached_to_id INTEGER FK` — 1:1 relationship, ON DELETE SET NULL | [auto] |
| Separate join table | `army_list_leader_attachments` with leader_alu_id + target_alu_id | |

**Auto-selected:** Column on army_list_units (recommended default — 1:1 relationship, simpler)
**Notes:** SET NULL on delete so removing target unlinks leader rather than cascading.

---

## Ghost Unit Columns

| Option | Description | Selected |
|--------|-------------|----------|
| Nullable unit_id + ghost_unit_name TEXT | Match existing name-based join pattern for points. CHECK constraint for identity. | [auto] |
| Nullable unit_id + datasheet_id TEXT + datasheet_name TEXT | Store rules.db reference. More explicit but datasheet_id from rules.db is volatile across syncs. | |

**Auto-selected:** Nullable unit_id + ghost_unit_name TEXT (recommended default — matches existing pattern, prior decision in STATE.md)
**Notes:** ghost_unit_name must match canonical BSData/Wahapedia name for points resolution.

---

## COALESCE Chain Extension

| Option | Description | Selected |
|--------|-------------|----------|
| Add tier.points via LEFT JOIN to synced_unit_point_tiers | New 6-level chain: COALESCE(alu.points_override, tier.points, sup.points, uo.points, u.points, 0) | [auto] |
| Keep existing 5-level chain, resolve tier in JS | Tier lookup in TypeScript after query. Simpler SQL but violates "never compute points in JS" principle. | |

**Auto-selected:** LEFT JOIN approach (recommended default — consistent with DB-side computation principle)
**Notes:** Must update all 3 query sites atomically in one commit.

---

## Warlord Enforcement

| Option | Description | Selected |
|--------|-------------|----------|
| App-level mutation | Deselect-then-select in mutation function (matches activateLoadout pattern) | [auto] |
| SQL trigger | BEFORE INSERT trigger to reset other rows. More robust but adds trigger complexity. | |

**Auto-selected:** App-level mutation (recommended default — matches existing patterns, no trigger complexity)

---

## Claude's Discretion

- Query function naming and signature design
- TypeScript type design for new interfaces
- Test fixture design for COALESCE chain validation
- Whether to extend resolveUnitPoints() lib function or keep SQL-only

## Deferred Ideas

- Loadout option storage — Phase 90
- Enhancement validation UI — Phase 91
- Leader visual grouping — Phase 92
- DatasheetBrowserDialog — Phase 93
- canonical_name on unit_rules_mapping — consider Phase 90
