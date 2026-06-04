-- Migration 042: Detachments and Detachment Abilities
-- DDL only — no INSERTs (boot-loop prevention per migration 038 precedent).

CREATE TABLE IF NOT EXISTS udb_detachments (
  id         TEXT PRIMARY KEY,               -- Wahapedia detachment_id
  faction_id TEXT NOT NULL REFERENCES udb_factions(id),
  name       TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS udb_detachment_abilities (
  id            TEXT PRIMARY KEY,            -- Wahapedia ability row id
  detachment_id TEXT NOT NULL REFERENCES udb_detachments(id) ON DELETE CASCADE,
  faction_id    TEXT NOT NULL REFERENCES udb_factions(id),
  name          TEXT NOT NULL,
  description   TEXT
);

CREATE INDEX IF NOT EXISTS idx_udb_detachments_faction_id
  ON udb_detachments(faction_id);

CREATE INDEX IF NOT EXISTS idx_udb_detachment_abilities_detachment_id
  ON udb_detachment_abilities(detachment_id);
