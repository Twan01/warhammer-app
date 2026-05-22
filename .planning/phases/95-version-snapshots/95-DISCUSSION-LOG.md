# Phase 95: Version Snapshots - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-22
**Phase:** 95-version-snapshots
**Areas discussed:** Snapshot Storage Model, Snapshot Content Scope, Comparison UX, Restore Behavior, Snapshot Entry Points
**Mode:** --auto (all decisions auto-selected)

---

## Snapshot Storage Model

| Option | Description | Selected |
|--------|-------------|----------|
| JSON blob in dedicated table | Single `army_list_snapshots` table with JSON blob column — simpler, snapshot data is immutable | ✓ |
| Normalized snapshot tables | Separate `snapshot_units` and `snapshot_enhancements` tables mirroring the live schema | |
| Reuse export JSON files | Store snapshots as files on disk rather than in DB | |

**Auto-selected:** JSON blob in dedicated table (recommended default)
**Notes:** JSON blob avoids duplicating the army_list_units/enhancements schema. Snapshot data is read-only after creation, so normalized tables provide no query benefit. The Phase 94 JSON export format already provides a canonical structure to reuse.

---

## Snapshot Content Scope

| Option | Description | Selected |
|--------|-------------|----------|
| Full list state | Units, enhancements, loadouts, points, warlord, ghost status, leader attachment | ✓ |
| Units only | Just unit names and points, no enhancements or attachment info | |
| Metadata only | Just point totals and unit count for lightweight history | |

**Auto-selected:** Full list state (recommended default)
**Notes:** Matches the JSON export format from Phase 94. A snapshot should capture everything needed to fully restore the list.

---

## Comparison UX

| Option | Description | Selected |
|--------|-------------|----------|
| Two-column diff dialog | Side-by-side columns showing each snapshot with color-coded added/removed units | ✓ |
| Unified diff list | Single list with +/- markers for added/removed units | |
| Text diff | Plain text comparison like a code diff | |

**Auto-selected:** Two-column diff dialog (recommended default)
**Notes:** Visual side-by-side is more intuitive for comparing army lists. Matching by unit display name keeps the logic simple.

---

## Restore Behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Destructive replace with safety snapshot | Clear current state, replace from snapshot, auto-save current state first | ✓ |
| Additive merge | Add snapshot units to current list without removing existing | |
| Create new list from snapshot | Clone into a new army list rather than replacing current | |

**Auto-selected:** Destructive replace with safety snapshot (recommended default)
**Notes:** Follows the safety backup pattern from Phase 82. Auto-saving current state before restore ensures the user can always go back.

---

## Snapshot Entry Points

| Option | Description | Selected |
|--------|-------------|----------|
| Button in ArmyListDetailSheet header | "Snapshots" button near Export dropdown, opens SnapshotHistorySheet | ✓ |
| Tab in ArmyListDetailSheet | Separate tab alongside units list for snapshot history | |
| Standalone snapshots page | Separate page for managing all snapshots across lists | |

**Auto-selected:** Button in ArmyListDetailSheet header (recommended default)
**Notes:** Consistent with how Export dropdown was added in Phase 94. Keeps snapshot management contextual to the list being viewed.

---

## Claude's Discretion

- SnapshotHistorySheet layout and visual styling
- Compare dialog internal layout details
- Max snapshot limit per list
- Delete confirmation behavior
- Migration file numbering
- Snapshot count badge on Snapshots button

## Deferred Ideas

- Snapshot sharing/export as files
- Auto-snapshots on significant changes
- Snapshot annotations/notes
- Branching from a snapshot (create new list)
