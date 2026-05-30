-- Migration 039: Collection-to-UDB FK Link
-- Adds the nullable FK column on units pointing to udb_units,
-- a faction bridge column on factions pointing to udb_factions,
-- backfills both columns by case-insensitive name match,
-- and adds an index on the FK column.
--
-- D-01: nullable udb_unit_id FK on units (ON DELETE SET NULL preserves collection)
-- D-02: best-effort backfill by case-insensitive name + faction match
-- D-08: faction bridge column wahapedia_faction_id on factions

-- Step 1: Add faction bridge column to factions
ALTER TABLE factions ADD COLUMN wahapedia_faction_id TEXT;

-- Step 2: Backfill wahapedia_faction_id by case-insensitive name match against udb_factions
UPDATE factions
SET wahapedia_faction_id = (
  SELECT uf.id
  FROM udb_factions uf
  WHERE LOWER(uf.name) = LOWER(factions.name)
  LIMIT 1
)
WHERE wahapedia_faction_id IS NULL;

-- Step 3: Add nullable FK column on units referencing udb_units
ALTER TABLE units ADD COLUMN udb_unit_id TEXT REFERENCES udb_units(id) ON DELETE SET NULL;

-- Step 4: Backfill udb_unit_id by case-insensitive name + faction scope
UPDATE units
SET udb_unit_id = (
  SELECT uu.id
  FROM udb_units uu
  WHERE LOWER(uu.name) = LOWER(units.name)
    AND uu.faction_id = (
      SELECT f.wahapedia_faction_id
      FROM factions f
      WHERE f.id = units.faction_id
    )
  LIMIT 1
)
WHERE udb_unit_id IS NULL;

-- Step 5: Index on FK column for efficient ownership queries
CREATE INDEX IF NOT EXISTS idx_units_udb_unit_id ON units(udb_unit_id);

PRAGMA user_version = 39;
