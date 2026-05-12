-- 020_workflow_metadata.sql — Phase 57: Workflow metadata on recipe sections + session section link
-- Additive only — 5 nullable TEXT columns via ALTER TABLE.
-- Existing data is unchanged (WF-05).

ALTER TABLE recipe_sections ADD COLUMN section_type TEXT DEFAULT NULL;
ALTER TABLE recipe_sections ADD COLUMN technique TEXT DEFAULT NULL;
ALTER TABLE recipe_sections ADD COLUMN execution_mode TEXT DEFAULT NULL;
ALTER TABLE recipe_sections ADD COLUMN applies_to TEXT DEFAULT NULL;

ALTER TABLE painting_sessions ADD COLUMN section_name TEXT DEFAULT NULL;
