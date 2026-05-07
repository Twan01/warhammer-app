-- 012_recipe_steps.sql — Phase 37: Structured recipe steps + recipe metadata
-- Extends recipe_paints into recipe_steps and adds recipe metadata columns.
-- Existing recipe_paints rows are preserved via ALTER TABLE RENAME.

-- Step 1: Rename recipe_paints → recipe_steps (preserves all existing rows + FKs)
ALTER TABLE recipe_paints RENAME TO recipe_steps;

-- Step 2: Add structured step columns to recipe_steps
ALTER TABLE recipe_steps ADD COLUMN painting_phase TEXT;
ALTER TABLE recipe_steps ADD COLUMN tool TEXT;
ALTER TABLE recipe_steps ADD COLUMN technique TEXT;
ALTER TABLE recipe_steps ADD COLUMN dilution TEXT;
ALTER TABLE recipe_steps ADD COLUMN time_estimate_minutes INTEGER;

-- Step 3: Add recipe metadata columns to painting_recipes
ALTER TABLE painting_recipes ADD COLUMN style TEXT;
ALTER TABLE painting_recipes ADD COLUMN surface TEXT;
ALTER TABLE painting_recipes ADD COLUMN effect TEXT;
ALTER TABLE painting_recipes ADD COLUMN difficulty TEXT;
ALTER TABLE painting_recipes ADD COLUMN estimated_minutes INTEGER;
ALTER TABLE painting_recipes ADD COLUMN result_photo_path TEXT;
