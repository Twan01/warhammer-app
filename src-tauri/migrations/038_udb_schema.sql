-- Migration 038: Unit Database Schema
-- Creates 9 regular tables + 1 FTS5 virtual table for the canonical unit database (udb_*).
-- DDL only — no INSERT/seed data. Seeding via migration caused a documented boot-loop incident.

-- 1. Factions (top-level grouping; IDs reuse Wahapedia text IDs like "SM", "NEC")
CREATE TABLE IF NOT EXISTS udb_factions (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  short_name TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 2. Units (datasheets; IDs reuse Wahapedia string IDs e.g. "000000123")
CREATE TABLE IF NOT EXISTS udb_units (
  id           TEXT PRIMARY KEY,
  faction_id   TEXT NOT NULL REFERENCES udb_factions(id),
  name         TEXT NOT NULL,
  role         TEXT,
  base_points  INTEGER,
  damaged_w    TEXT,
  damaged_desc TEXT,
  updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 3. Model profiles (one row per model profile line within a datasheet)
CREATE TABLE IF NOT EXISTS udb_unit_models (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  unit_id     TEXT    NOT NULL REFERENCES udb_units(id) ON DELETE CASCADE,
  line_order  INTEGER NOT NULL DEFAULT 0,
  name        TEXT,
  M           TEXT,
  T           INTEGER,
  Sv          TEXT,
  inv_sv      TEXT,
  W           INTEGER,
  Ld          TEXT,
  OC          INTEGER
);

-- 4. Weapons (ranged and melee profiles)
CREATE TABLE IF NOT EXISTS udb_unit_weapons (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  unit_id      TEXT    NOT NULL REFERENCES udb_units(id) ON DELETE CASCADE,
  weapon_group INTEGER NOT NULL DEFAULT 1,
  line_order   INTEGER NOT NULL DEFAULT 1,
  name         TEXT    NOT NULL,
  category     TEXT,
  range        TEXT,
  attacks      TEXT,
  skill        TEXT,
  strength     TEXT,
  ap           TEXT,
  damage       TEXT,
  keywords     TEXT
);

-- 5. Abilities (special rules, stratagems-lite, warlord traits, etc.)
CREATE TABLE IF NOT EXISTS udb_unit_abilities (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  unit_id      TEXT    NOT NULL REFERENCES udb_units(id) ON DELETE CASCADE,
  line_order   INTEGER NOT NULL DEFAULT 0,
  name         TEXT    NOT NULL,
  description  TEXT,
  ability_type TEXT
);

-- 6. Keywords (FACTION KEYWORDS and regular KEYWORDS)
CREATE TABLE IF NOT EXISTS udb_unit_keywords (
  unit_id    TEXT NOT NULL REFERENCES udb_units(id) ON DELETE CASCADE,
  keyword    TEXT NOT NULL,
  is_faction INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (unit_id, keyword)
);

-- 7. Points tiers (model-count based cost brackets)
CREATE TABLE IF NOT EXISTS udb_unit_points (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  unit_id     TEXT    NOT NULL REFERENCES udb_units(id) ON DELETE CASCADE,
  model_count INTEGER NOT NULL,
  points      INTEGER NOT NULL,
  UNIQUE (unit_id, model_count)
);

-- 8. Composition (min/max models per unit build)
CREATE TABLE IF NOT EXISTS udb_unit_composition (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  unit_id    TEXT    NOT NULL REFERENCES udb_units(id) ON DELETE CASCADE,
  min_models INTEGER NOT NULL DEFAULT 1,
  max_models INTEGER NOT NULL DEFAULT 1,
  notes      TEXT
);

-- 9. Metadata / version tracking (single-row enforced by CHECK)
CREATE TABLE IF NOT EXISTS udb_meta (
  id             INTEGER PRIMARY KEY CHECK(id = 1),
  version        TEXT    NOT NULL,
  built_at       TEXT    NOT NULL,
  game_system    TEXT    NOT NULL DEFAULT '40k-10th',
  unit_count     INTEGER,
  faction_count  INTEGER
);

-- 10. FTS5 full-text search virtual table
CREATE VIRTUAL TABLE IF NOT EXISTS udb_search
  USING fts5(unit_id UNINDEXED, name, faction_name, keywords);

-- ─── FK indexes ─────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_udb_units_faction_id
  ON udb_units(faction_id);

CREATE INDEX IF NOT EXISTS idx_udb_unit_models_unit_id
  ON udb_unit_models(unit_id);

CREATE INDEX IF NOT EXISTS idx_udb_unit_weapons_unit_id
  ON udb_unit_weapons(unit_id);

CREATE INDEX IF NOT EXISTS idx_udb_unit_abilities_unit_id
  ON udb_unit_abilities(unit_id);

CREATE INDEX IF NOT EXISTS idx_udb_unit_points_unit_id
  ON udb_unit_points(unit_id);

CREATE INDEX IF NOT EXISTS idx_udb_unit_composition_unit_id
  ON udb_unit_composition(unit_id);

PRAGMA user_version = 38;
