-- rules_003_sync_meta_counts.sql — Phase 45 (META-01, META-02)
-- Adds 11 per-table row count columns to rw_sync_meta in rules.db.
-- These are populated by the Rust bulk_sync_rules upsert on every sync.
-- All columns nullable (ALTER TABLE defaults to NULL) — null before first
-- post-migration sync, which is expected and handled gracefully in the UI.

ALTER TABLE rw_sync_meta ADD COLUMN factions_count INTEGER;
ALTER TABLE rw_sync_meta ADD COLUMN sources_count INTEGER;
ALTER TABLE rw_sync_meta ADD COLUMN datasheets_count INTEGER;
ALTER TABLE rw_sync_meta ADD COLUMN models_count INTEGER;
ALTER TABLE rw_sync_meta ADD COLUMN abilities_count INTEGER;
ALTER TABLE rw_sync_meta ADD COLUMN keywords_count INTEGER;
ALTER TABLE rw_sync_meta ADD COLUMN wargear_count INTEGER;
ALTER TABLE rw_sync_meta ADD COLUMN shared_abilities_count INTEGER;
ALTER TABLE rw_sync_meta ADD COLUMN stratagems_count INTEGER;
ALTER TABLE rw_sync_meta ADD COLUMN detachments_count INTEGER;
ALTER TABLE rw_sync_meta ADD COLUMN detachment_abilities_count INTEGER;
