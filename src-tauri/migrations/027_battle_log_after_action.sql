-- 027_battle_log_after_action.sql — Phase 73 (Game Day after-action columns)
-- Adds four columns to battle_logs for post-game reflection:
--   forgotten_rules: JSON array of rule strings the player forgot
--   mvp_notes: free-text notes alongside existing mvp_unit_id FK
--   underperformer_notes: free-text notes alongside existing underperforming_unit_id FK
--   promoted_to_reminder: boolean (0|1) — flag to surface forgotten rules as reminders

ALTER TABLE battle_logs ADD COLUMN forgotten_rules TEXT;
ALTER TABLE battle_logs ADD COLUMN mvp_notes TEXT;
ALTER TABLE battle_logs ADD COLUMN underperformer_notes TEXT;
ALTER TABLE battle_logs ADD COLUMN promoted_to_reminder INTEGER NOT NULL DEFAULT 0;
