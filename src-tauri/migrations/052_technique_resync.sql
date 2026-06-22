-- 052: technique_resync
-- Adds technique_section_id to recipe_sections for exact (non-positional) section identity
-- during live-link resync. Without this column, section matching during resync must rely on
-- order_index position alone, which is fragile when sections are simultaneously reordered
-- and added/removed (Phase 144 RESEARCH.md Pitfall 3 / A5). With this column, each
-- recipe_sections row knows exactly which technique_sections row it materialised from.
--
-- Also adds an index on recipe_steps(technique_step_id) to speed up the per-step lookup
-- performed by resyncTechniqueInstances for each instance (avoids a full recipe_steps scan).

ALTER TABLE recipe_sections ADD COLUMN technique_section_id INTEGER
    REFERENCES technique_sections(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_recipe_steps_technique_step_id
    ON recipe_steps(technique_step_id);
