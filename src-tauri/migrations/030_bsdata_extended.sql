-- BSData extended data: enhancements, loadout options, model counts, leader targets.
-- Populated during rules sync from BattleScribe .cat XML files.

CREATE TABLE IF NOT EXISTS synced_enhancements (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  name            TEXT NOT NULL,
  faction_id      TEXT,
  detachment_name TEXT,
  points          INTEGER NOT NULL,
  synced_at       TEXT NOT NULL,
  UNIQUE (name, faction_id, detachment_name)
);

CREATE TABLE IF NOT EXISTS synced_loadout_options (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  unit_name       TEXT NOT NULL,
  faction_id      TEXT,
  group_name      TEXT NOT NULL,
  option_name     TEXT NOT NULL,
  is_default      INTEGER NOT NULL DEFAULT 0,
  is_exclusive    INTEGER NOT NULL DEFAULT 0,
  synced_at       TEXT NOT NULL,
  UNIQUE (unit_name, faction_id, group_name, option_name)
);

CREATE TABLE IF NOT EXISTS synced_model_counts (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  unit_name       TEXT NOT NULL,
  faction_id      TEXT,
  min_models      INTEGER NOT NULL,
  max_models      INTEGER NOT NULL,
  synced_at       TEXT NOT NULL,
  UNIQUE (unit_name, faction_id)
);

CREATE TABLE IF NOT EXISTS synced_leader_targets (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  leader_name     TEXT NOT NULL,
  faction_id      TEXT,
  target_name     TEXT NOT NULL,
  synced_at       TEXT NOT NULL,
  UNIQUE (leader_name, faction_id, target_name)
);
