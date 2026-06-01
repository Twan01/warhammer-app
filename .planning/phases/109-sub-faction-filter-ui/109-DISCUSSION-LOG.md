# Phase 109: Sub-faction Filter UI - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-01
**Phase:** 109-Sub-faction Filter UI
**Areas discussed:** Filter placement, Shared query layer, Collection integration, FTS5 indexing
**Mode:** --auto (all decisions auto-selected)

---

## Filter Placement & UX

| Option | Description | Selected |
|--------|-------------|----------|
| After faction picker, before other filters | Sub-faction dropdown as first filter in the bar, conditional on faction having sub-factions | auto |
| Inline with faction picker | Sub-faction as a second-level picker next to faction selection | |
| Separate filter section | Dedicated sub-faction section above the filter bar | |

**Auto-selected:** After faction picker, before other filters (recommended default)
**Notes:** Follows existing filter bar pattern in UdbFilterBar.tsx. Conditional rendering matches how the Role dropdown already works.

---

## Shared Query Layer

| Option | Description | Selected |
|--------|-------------|----------|
| New useUdbSubFactions hook + query | Dedicated query and hook following per-entity convention | auto |
| Extend useUdbUnits to return sub-factions | Piggyback on existing unit query with DISTINCT sub_faction | |
| Client-side extraction from units | Derive sub-faction list from already-fetched units array | |

**Auto-selected:** New useUdbSubFactions hook + query (recommended default)
**Notes:** Client-side extraction would work but breaks the established per-entity hook pattern. Dedicated query is more cacheable and reusable across all 3 surfaces.

---

## Collection Integration

| Option | Description | Selected |
|--------|-------------|----------|
| Cross-reference via udb_unit_id FK | Fetch UDB unit IDs for sub-faction, filter collection units client-side | auto |
| SQL JOIN in collection query | Server-side JOIN between units and udb_units for sub-faction filtering | |
| Skip collection sub-faction filter | Only add to database browser and army list picker | |

**Auto-selected:** Cross-reference via udb_unit_id FK (recommended default)
**Notes:** Collection units already have udb_unit_id from Phase 105. Client-side filtering avoids modifying the enriched units query. Only shown when exactly one faction is selected.

---

## FTS5 Search Indexing

| Option | Description | Selected |
|--------|-------------|----------|
| Already handled (Phase 108) | sub_faction piped into FTS5 keywords column via COALESCE in Rust import | auto |
| Additional FTS5 column | Add sub_faction as a separate FTS5 column for weighted search | |

**Auto-selected:** Already handled (recommended — no work needed)
**Notes:** Verified at src-tauri/src/lib.rs:731-737. Searching "Ultramarines" already returns matching units.

---

## Claude's Discretion

- Sub-faction dropdown styling (follows existing Select pattern)
- Memoization strategy for sub-faction ID set
- Loading/empty state text
- Test structure and coverage

## Deferred Ideas

None — discussion stayed within phase scope
