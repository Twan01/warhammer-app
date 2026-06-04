-- Migration 043: Stratagems and Enhancements
-- DDL only — no INSERTs (boot-loop prevention per migration 038 precedent).

CREATE TABLE IF NOT EXISTS udb_stratagems (
  id            TEXT PRIMARY KEY,
  faction_id    TEXT REFERENCES udb_factions(id) ON DELETE SET NULL,
  detachment_id TEXT REFERENCES udb_detachments(id) ON DELETE SET NULL,
  name          TEXT NOT NULL,
  type          TEXT,
  cp_cost       INTEGER NOT NULL DEFAULT 0,
  turn          TEXT,
  phase         TEXT,
  description   TEXT NOT NULL,
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS udb_enhancements (
  id            TEXT PRIMARY KEY,
  faction_id    TEXT NOT NULL REFERENCES udb_factions(id) ON DELETE CASCADE,
  detachment_id TEXT REFERENCES udb_detachments(id) ON DELETE SET NULL,
  name          TEXT NOT NULL,
  cost          INTEGER NOT NULL DEFAULT 0,
  description   TEXT NOT NULL,
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_udb_stratagems_faction_id
  ON udb_stratagems(faction_id);

CREATE INDEX IF NOT EXISTS idx_udb_stratagems_detachment_id
  ON udb_stratagems(detachment_id);

CREATE INDEX IF NOT EXISTS idx_udb_enhancements_faction_id
  ON udb_enhancements(faction_id);

CREATE INDEX IF NOT EXISTS idx_udb_enhancements_detachment_id
  ON udb_enhancements(detachment_id);
