-- 004_unit_playbook_stats.sql — HobbyForge v1.1 Phase 6 (STRAT-06)
-- Adds 8 nullable columns to unit_strategy_notes for the Unit Playbook tab (Phase 9).
-- Additive migration only: ALTER TABLE ... ADD COLUMN. No destructive statements,
-- no modifications to 001_core_schema.sql. Existing rows remain intact (NULL values
-- for the new columns).
--
-- Stat columns (M, T, Sv, W, Ld, OC) are stored as INTEGER. The UI (Phase 9
-- PlaybookTab) appends the "+" suffix to save at display time — it is never
-- stored in the DB. STRAT-02 in REQUIREMENTS.md confirms all stats are integer.
-- (Note: ARCHITECTURE.md draft showed save TEXT; CONTEXT.md decision overrides — INTEGER.)
ALTER TABLE unit_strategy_notes ADD COLUMN move INTEGER;
ALTER TABLE unit_strategy_notes ADD COLUMN toughness INTEGER;
ALTER TABLE unit_strategy_notes ADD COLUMN save INTEGER;
ALTER TABLE unit_strategy_notes ADD COLUMN wounds INTEGER;
ALTER TABLE unit_strategy_notes ADD COLUMN leadership INTEGER;
ALTER TABLE unit_strategy_notes ADD COLUMN objective_control INTEGER;
ALTER TABLE unit_strategy_notes ADD COLUMN keywords TEXT;
ALTER TABLE unit_strategy_notes ADD COLUMN abilities TEXT;
