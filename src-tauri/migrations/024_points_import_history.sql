-- 024_points_import_history.sql — Phase 65 (PI-01, PI-04)
-- Adds two tables to hobbyforge.db:
--   1. points_import_history — audit trail for each points sync
--   2. synced_unit_points — denormalized cache solving cross-DB JOIN problem
--      (Research Pitfall 1 Option B: copy rules.db points into hobbyforge.db
--       so the COALESCE LEFT JOIN works without ATTACH DATABASE)

CREATE TABLE IF NOT EXISTS points_import_history (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  imported_at     TEXT    NOT NULL DEFAULT (datetime('now')),
  source_file     TEXT,
  version         TEXT,
  row_count       INTEGER NOT NULL DEFAULT 0,
  delta_added     INTEGER NOT NULL DEFAULT 0,
  delta_removed   INTEGER NOT NULL DEFAULT 0,
  delta_changed   INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS synced_unit_points (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  unit_name       TEXT NOT NULL,
  faction_id      TEXT,  -- NULL = globally applicable; Wahapedia text key when scoped
  points          INTEGER NOT NULL DEFAULT 0,
  synced_at       TEXT NOT NULL,
  UNIQUE (unit_name, faction_id)
);
