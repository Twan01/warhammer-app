-- 037_override_flags.sql — HobbyForge v0.3.7 Phase 100 (SAD-04)
-- Adds manual-override guard columns to the units table.
-- When syncDerivedStatuses() runs, it checks each override flag before
-- writing the corresponding derived status. Override = 1 means user-controlled;
-- auto-derivation is skipped for that field on that unit.
-- Additive only: ALTER TABLE ADD COLUMN. SQLite DEFAULT 0 handles existing rows.

ALTER TABLE units ADD COLUMN status_assembly_override INTEGER NOT NULL DEFAULT 0;
ALTER TABLE units ADD COLUMN status_basing_override    INTEGER NOT NULL DEFAULT 0;
ALTER TABLE units ADD COLUMN status_varnished_override INTEGER NOT NULL DEFAULT 0;
