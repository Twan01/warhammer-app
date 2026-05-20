-- 031_army_list_v3.sql — Army Lists 3.0 schema (Phase 89, Plan 01)
--
-- Changes:
--   1. Table recreation for army_list_units (rename-create-copy-drop) to:
--      - Make unit_id nullable (ghost/planned unit support)
--      - Add ghost_unit_name TEXT with CHECK identity constraint
--      - Add is_warlord INTEGER NOT NULL DEFAULT 0
--      - Add selected_model_count INTEGER (nullable — NULL = default/min tier)
--      - Add leader_attached_to_id INTEGER FK with ON DELETE SET NULL
--      - Preserve all existing columns (including tactical_role from migration 025)
--   2. Create army_list_enhancements join table (TEXT-copy denormalization pattern)
--
-- Threat mitigations:
--   T-89-01: CHECK (unit_id IS NOT NULL OR ghost_unit_name IS NOT NULL) enforces identity invariant
--   T-89-03: Entire table recreation is atomic (single migration transaction)

-- ─── Step 1: Rename existing table ───────────────────────────────────────────
ALTER TABLE army_list_units RENAME TO army_list_units_old;

-- ─── Step 2: Create new table with full desired schema ────────────────────────
CREATE TABLE army_list_units (
    id                    INTEGER PRIMARY KEY AUTOINCREMENT,
    list_id               INTEGER NOT NULL REFERENCES army_lists(id) ON DELETE CASCADE,
    unit_id               INTEGER REFERENCES units(id) ON DELETE RESTRICT,  -- NULLABLE: NULL for ghost units
    ghost_unit_name       TEXT,                                               -- NOT NULL when unit_id IS NULL
    is_warlord            INTEGER NOT NULL DEFAULT 0,
    selected_model_count  INTEGER,                                            -- NULL = default/min tier
    leader_attached_to_id INTEGER REFERENCES army_list_units(id) ON DELETE SET NULL,
    points_override       INTEGER,
    notes                 TEXT,
    tactical_role         TEXT DEFAULT NULL,
    created_at            TEXT NOT NULL DEFAULT (datetime('now')),
    CHECK (unit_id IS NOT NULL OR ghost_unit_name IS NOT NULL)
);

-- ─── Step 3: Copy all existing data ──────────────────────────────────────────
-- New columns get their defaults: ghost_unit_name=NULL, is_warlord=0,
-- selected_model_count=NULL, leader_attached_to_id=NULL.
-- All existing rows are real units (unit_id NOT NULL), so CHECK constraint passes.
INSERT INTO army_list_units (
    id, list_id, unit_id, ghost_unit_name, is_warlord,
    selected_model_count, leader_attached_to_id, points_override, notes, tactical_role, created_at
)
SELECT
    id, list_id, unit_id, NULL, 0, NULL, NULL, points_override, notes, tactical_role, created_at
FROM army_list_units_old;

-- ─── Step 4: Drop old table ───────────────────────────────────────────────────
DROP TABLE army_list_units_old;

-- ─── Step 5: Create army_list_enhancements join table ─────────────────────────
-- Enhancement name and points are TEXT/INTEGER copies at assignment time
-- (not FK to synced_enhancements — those tables are DELETE-all + re-INSERT on sync).
-- Both FKs use CASCADE so enhancement rows are cleaned up automatically.
CREATE TABLE army_list_enhancements (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    list_id             INTEGER NOT NULL REFERENCES army_lists(id) ON DELETE CASCADE,
    army_list_unit_id   INTEGER NOT NULL REFERENCES army_list_units(id) ON DELETE CASCADE,
    enhancement_name    TEXT NOT NULL,
    enhancement_points  INTEGER NOT NULL DEFAULT 0,
    created_at          TEXT NOT NULL DEFAULT (datetime('now'))
);
