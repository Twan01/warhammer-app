-- Stores model-count-based point tiers from BSData.
-- Populated during rules sync alongside synced_unit_points.
CREATE TABLE IF NOT EXISTS synced_unit_point_tiers (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  unit_name       TEXT NOT NULL,
  faction_id      TEXT,
  model_count     INTEGER NOT NULL,
  points          INTEGER NOT NULL,
  synced_at       TEXT NOT NULL,
  UNIQUE (unit_name, faction_id, model_count)
);
