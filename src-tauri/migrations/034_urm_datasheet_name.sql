-- 034_urm_datasheet_name.sql — Store canonical datasheet name on unit_rules_mapping.
-- Enables the army list points COALESCE chain to join synced_unit_points by the
-- correct BSData/Wahapedia name instead of the user-entered collection unit name.
ALTER TABLE unit_rules_mapping ADD COLUMN datasheet_name TEXT;
