-- 014_session_recipe_link.sql — Phase 41: Link painting sessions to recipes/steps
-- Additive only — two nullable FK columns added via ALTER TABLE.
-- ON DELETE SET NULL: session survives deletion of recipe or step; link is cleared.
ALTER TABLE painting_sessions ADD COLUMN recipe_id INTEGER REFERENCES painting_recipes(id) ON DELETE SET NULL;
ALTER TABLE painting_sessions ADD COLUMN recipe_step_id INTEGER REFERENCES recipe_steps(id) ON DELETE SET NULL;
