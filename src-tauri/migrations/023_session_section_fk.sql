-- 023_session_section_fk.sql — Phase 71: Stable section FK on painting_sessions
-- Additive only — one nullable FK column added via ALTER TABLE.
-- ON DELETE SET NULL: session survives deletion of a recipe section; FK is cleared.
ALTER TABLE painting_sessions ADD COLUMN recipe_section_id INTEGER REFERENCES recipe_sections(id) ON DELETE SET NULL;
