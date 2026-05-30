-- Drop synced_unit_points cache tables (Phase 106, ALI-03)
-- Points are now resolved via FK join to udb_unit_points
DROP TABLE IF EXISTS synced_unit_points;
DROP TABLE IF EXISTS synced_unit_point_tiers;

PRAGMA user_version = 40;
