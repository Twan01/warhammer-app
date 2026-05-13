-- rules_004_datasheet_points.sql — Phase 65 (PI-01)
-- Adds rw_datasheet_points table to rules.db for synced Wahapedia points data.
-- Separate table (not columns on rw_datasheets) because:
--   (1) rw_datasheets has no cost column in 10th ed export
--   (2) Separate table is deleted and recreated on every sync like all rw_ tables
--   (3) Matching is by name string for cross-DB query compatibility

CREATE TABLE IF NOT EXISTS rw_datasheet_points (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  datasheet_name  TEXT NOT NULL,
  faction_id      TEXT,  -- NULL = globally applicable; Wahapedia text key when scoped
  points          INTEGER NOT NULL DEFAULT 0,
  UNIQUE (datasheet_name, faction_id)
);

-- Extend rw_sync_meta with points row count (null before first post-migration sync)
ALTER TABLE rw_sync_meta ADD COLUMN points_count INTEGER;
