# Phase 71: Stable Session Section FK - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-13
**Phase:** 71-Stable Session Section FK
**Areas discussed:** Backfill Strategy, Dual-Write Behavior, Analytics Query Approach
**Mode:** --auto (all decisions auto-selected)

---

## Backfill Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| No backfill | New column starts NULL for all existing rows | ✓ |
| Name-match backfill | Migration attempts to match existing section_name values to recipe_sections rows | |

**Auto-selected:** No backfill — new column starts NULL for all existing rows
**Notes:** Section names may have been renamed already (the whole reason for this phase), making name-matching unreliable. New sessions going forward will always have both fields.

---

## Dual-Write Behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Write both FK and name | Store recipe_section_id and section_name on every session | ✓ |
| FK only, drop section_name | Only store the FK, derive name via JOIN | |

**Auto-selected:** Write both FK and denormalized name simultaneously
**Notes:** FK provides stable analytics joins; denormalized name provides instant display without a JOIN and preserves the historical "section name at time of logging" semantic.

---

## Analytics Query Approach

| Option | Description | Selected |
|--------|-------------|----------|
| COALESCE JOIN pattern | Join on FK for live name, fall back to section_name for orphaned sessions | ✓ |
| FK-only JOIN | Only use FK join, ignore section_name in analytics | |
| Keep section_name only | Continue using denormalized name for analytics | |

**Auto-selected:** COALESCE(rs.name, ps.section_name) — prefer FK JOIN, fall back to denormalized name
**Notes:** When a section is deleted, ON DELETE SET NULL clears the FK but the denormalized name survives for historical display.

---

## Claude's Discretion

- Whether `useWorkflowPositions.ts` needs updating in this phase
- Registration of migration 022 in lib.rs
- Whether to add a `getSessionsBySection(sectionId)` query function

## Deferred Ideas

None — discussion stayed within phase scope
