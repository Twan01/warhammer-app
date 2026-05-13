-- 021_applied_recipe_assignments.sql -- Phase 62: Applied recipe data layer
-- Creates the unit_recipe_assignments and unit_recipe_step_progress tables
-- for tracking which recipes are applied to which units and per-step completion.

-- Table 1: unit_recipe_assignments
-- Links a painting recipe to a unit. Each unit can have at most one assignment
-- per recipe (UNIQUE constraint). Deleting the unit or recipe cascades to
-- remove the assignment and all associated step progress.
CREATE TABLE IF NOT EXISTS unit_recipe_assignments (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    unit_id     INTEGER NOT NULL REFERENCES units(id) ON DELETE CASCADE,
    recipe_id   INTEGER NOT NULL REFERENCES painting_recipes(id) ON DELETE CASCADE,
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(unit_id, recipe_id)
);

-- Table 2: unit_recipe_step_progress
-- Tracks completion of individual steps within an assignment. Keyed by
-- composite (assignment_id, order_index) rather than recipe_step_id FK
-- so that reordering steps doesn't break progress records (D-04, D-05).
-- completed is a 0|1 SQLite boolean.
CREATE TABLE IF NOT EXISTS unit_recipe_step_progress (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    assignment_id   INTEGER NOT NULL REFERENCES unit_recipe_assignments(id) ON DELETE CASCADE,
    order_index     INTEGER NOT NULL,
    completed       INTEGER NOT NULL DEFAULT 0,
    completed_at    TEXT,
    UNIQUE(assignment_id, order_index)
);
