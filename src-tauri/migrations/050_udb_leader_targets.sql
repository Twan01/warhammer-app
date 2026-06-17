-- Migration 050: canonical leader-attachment targets (udb id-keyed).
-- DDL only — no seed (data arrives via the Rust udb import, like all udb_* tables).
-- Per D-01/D-02: composite PK mirrors udb_unit_keywords; both sides FK -> udb_units ON DELETE CASCADE.
CREATE TABLE IF NOT EXISTS udb_leader_targets (
  leader_unit_id  TEXT NOT NULL REFERENCES udb_units(id) ON DELETE CASCADE,
  target_unit_id  TEXT NOT NULL REFERENCES udb_units(id) ON DELETE CASCADE,
  PRIMARY KEY (leader_unit_id, target_unit_id)
);

CREATE INDEX IF NOT EXISTS idx_udb_leader_targets_leader
  ON udb_leader_targets(leader_unit_id);

CREATE INDEX IF NOT EXISTS idx_udb_leader_targets_target
  ON udb_leader_targets(target_unit_id);
