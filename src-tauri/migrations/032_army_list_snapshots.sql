-- 032_army_list_snapshots.sql — Version snapshots for army lists (Phase 95, Plan 01)
--
-- Changes:
--   1. Create army_list_snapshots table for storing versioned snapshots of army lists
--      - snapshot_data stores full JSON blob (reuses Phase 94 buildJsonFormat output)
--      - total_points denormalized for list queries (avoids parsing blob)
--   2. Index on list_id for fast lookup
--
-- Threat mitigations:
--   T-95-02: Label is parameterized ($1/$2) — no string interpolation

CREATE TABLE army_list_snapshots (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    list_id       INTEGER NOT NULL REFERENCES army_lists(id) ON DELETE CASCADE,
    label         TEXT NOT NULL,
    snapshot_data TEXT NOT NULL,
    total_points  INTEGER NOT NULL,
    created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_army_list_snapshots_list_id ON army_list_snapshots(list_id);
