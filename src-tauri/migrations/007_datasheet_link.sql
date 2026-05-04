-- 007_datasheet_link.sql — HobbyForge v2.1 Phase 15 (DS-06)
-- Adds `datasheet_id TEXT` column to unit_strategy_notes so the user's chosen
-- Wahapedia datasheet can be linked permanently to a unit.
--
-- NO REFERENCES clause: SQLite cannot enforce FK constraints across database
-- files. The link is enforced at application level — see Pitfall 1 in
-- 15-RESEARCH.md.
--
-- Additive only — no destructive statements.

ALTER TABLE unit_strategy_notes ADD COLUMN datasheet_id TEXT;
