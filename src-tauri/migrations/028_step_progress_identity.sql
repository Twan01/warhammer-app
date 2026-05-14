-- Migration 028: Rebuild unit_recipe_step_progress with recipe_step_id FK
-- Replaces order_index-keyed progress with recipe_step_id-keyed progress.
-- After this migration, reordering recipe steps never moves completion markers.
--
-- Back-fill strategy: order_index is per-section (resets to 0 in each section),
-- so a naive JOIN on (recipe_id, order_index) may match multiple steps across
-- sections. We use a CTE with ROW_NUMBER to deduplicate: for each
-- (assignment_id, order_index) pair, pick the first matching step ordered by
-- section display order then step id. Orphaned rows (no matching step) are
-- silently dropped (INNER JOIN, per D-06).

PRAGMA foreign_keys = OFF;

CREATE TABLE unit_recipe_step_progress_new (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    assignment_id   INTEGER NOT NULL REFERENCES unit_recipe_assignments(id) ON DELETE CASCADE,
    recipe_step_id  INTEGER NOT NULL REFERENCES recipe_steps(id) ON DELETE CASCADE,
    completed       INTEGER NOT NULL DEFAULT 0,
    completed_at    TEXT,
    UNIQUE(assignment_id, recipe_step_id)
);

-- Back-fill: resolve (assignment_id, order_index) -> recipe_step_id
-- via unit_recipe_assignments (get recipe_id) -> recipe_steps (match step)
WITH numbered_steps AS (
    SELECT
        rs.id          AS step_id,
        a.id           AS assignment_id,
        rs.order_index,
        ROW_NUMBER() OVER (
            PARTITION BY a.id, rs.order_index
            ORDER BY COALESCE(s.order_index, 0), rs.id
        ) AS rn
    FROM recipe_steps rs
    JOIN unit_recipe_assignments a ON a.recipe_id = rs.recipe_id
    LEFT JOIN recipe_sections s ON s.id = rs.section_id
)
INSERT INTO unit_recipe_step_progress_new (assignment_id, recipe_step_id, completed, completed_at)
SELECT
    p.assignment_id,
    ns.step_id,
    p.completed,
    p.completed_at
FROM unit_recipe_step_progress p
JOIN numbered_steps ns
    ON ns.assignment_id = p.assignment_id
    AND ns.order_index = p.order_index
    AND ns.rn = 1;

DROP TABLE unit_recipe_step_progress;

ALTER TABLE unit_recipe_step_progress_new RENAME TO unit_recipe_step_progress;

PRAGMA foreign_keys = ON;
