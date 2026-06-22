-- 053: add index on recipe_sections(technique_section_id)
-- Companion to 052's idx_recipe_steps_technique_step_id. The resync engine
-- performs lookups keyed by technique_section_id (step 4a); this index makes
-- future query evolutions cheaper if recipe growth means many sections.
-- Not required for correctness (lookup is done after in-memory load), but
-- covers the pattern for completeness (IN-01 from code review phase 144).

CREATE INDEX IF NOT EXISTS idx_recipe_sections_technique_section_id
    ON recipe_sections(technique_section_id);
