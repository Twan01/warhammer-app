-- Migration 041: Add sub_faction and French locale (_fr) columns to udb_* tables
-- Sub-faction: denormalized on udb_units (SF-01)
-- French locale: _fr columns on factions, units, abilities, weapons, keywords (FR-01)
-- NOTE: udb_search (FTS5) cannot be ALTERed; sub_faction piped via rebuild query

ALTER TABLE udb_units ADD COLUMN sub_faction TEXT;
ALTER TABLE udb_factions ADD COLUMN name_fr TEXT;
ALTER TABLE udb_units ADD COLUMN name_fr TEXT;
ALTER TABLE udb_unit_abilities ADD COLUMN name_fr TEXT;
ALTER TABLE udb_unit_abilities ADD COLUMN description_fr TEXT;
ALTER TABLE udb_unit_weapons ADD COLUMN name_fr TEXT;
ALTER TABLE udb_unit_keywords ADD COLUMN keyword_fr TEXT;
