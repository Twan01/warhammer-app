-- 018_recipe_sections.sql -- Phase 48: Recipe section data layer
-- Creates the recipe_sections table, adds section_id FK to recipe_steps,
-- and backfills a default "Steps" section for every existing recipe so
-- no step is left without a section (zero data loss migration).

-- Step 1: Create recipe_sections table.
-- Each section belongs to exactly one recipe (ON DELETE CASCADE).
-- order_index controls display order; NO UNIQUE constraint because a
-- bulk reorder loop would hit conflicts before all rows are updated.
-- optional (0|1 integer) marks sections the user can skip in the workflow.
CREATE TABLE IF NOT EXISTS recipe_sections (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    recipe_id   INTEGER NOT NULL REFERENCES painting_recipes(id) ON DELETE CASCADE,
    name        TEXT NOT NULL DEFAULT 'Steps',
    surface     TEXT,
    optional    INTEGER NOT NULL DEFAULT 0,
    order_index INTEGER NOT NULL DEFAULT 0,
    notes       TEXT,
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Step 2: Add section_id FK column to recipe_steps.
-- Nullable so the column can be added safely; the data migration below
-- (Step 4) ensures every existing step gets a section_id.
-- ON DELETE CASCADE: when a section is deleted, its steps are deleted too.
-- The cascade chain continues: recipe_steps deletion triggers ON DELETE SET NULL
-- on painting_sessions.recipe_step_id (migration 014), clearing session links
-- without deleting the sessions themselves.
ALTER TABLE recipe_steps ADD COLUMN section_id INTEGER REFERENCES recipe_sections(id) ON DELETE CASCADE;

-- Step 3: Data migration — create one default section per existing recipe.
-- Named "Steps" (neutral descriptor that fits any recipe).
-- Runs once at migration time; no duplicates possible.
INSERT INTO recipe_sections (recipe_id, name, order_index, created_at, updated_at)
SELECT id, 'Steps', 0, datetime('now'), datetime('now')
FROM painting_recipes;

-- Step 4: Data migration — point every existing step at its recipe's default section.
-- The correlated subquery is guaranteed to find a match because Step 3 just
-- inserted exactly one section per recipe.
-- WHERE section_id IS NULL ensures idempotency if migration is ever re-run
-- against a partially-migrated database.
UPDATE recipe_steps
SET section_id = (
    SELECT id FROM recipe_sections
    WHERE recipe_sections.recipe_id = recipe_steps.recipe_id
    LIMIT 1
)
WHERE section_id IS NULL;
