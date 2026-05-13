-- Migration 022: Make recipe_steps.paint_id nullable
-- SQLite lacks ALTER COLUMN, so we rebuild the table with the new schema.

PRAGMA foreign_keys = OFF;

CREATE TABLE recipe_steps_new (
    id                    INTEGER PRIMARY KEY AUTOINCREMENT,
    recipe_id             INTEGER NOT NULL REFERENCES painting_recipes(id) ON DELETE CASCADE,
    paint_id              INTEGER REFERENCES paints(id) ON DELETE RESTRICT,
    step_name             TEXT    NOT NULL,
    order_index           INTEGER NOT NULL DEFAULT 0,
    notes                 TEXT,
    created_at            TEXT    NOT NULL DEFAULT (datetime('now')),
    painting_phase        TEXT,
    tool                  TEXT,
    technique             TEXT,
    dilution              TEXT,
    time_estimate_minutes INTEGER,
    step_photo_path       TEXT,
    alt_paint_id          INTEGER REFERENCES paints(id),
    section_id            INTEGER REFERENCES recipe_sections(id) ON DELETE CASCADE
);

INSERT INTO recipe_steps_new
    (id, recipe_id, paint_id, step_name, order_index, notes, created_at,
     painting_phase, tool, technique, dilution, time_estimate_minutes,
     step_photo_path, alt_paint_id, section_id)
SELECT id, recipe_id, paint_id, step_name, order_index, notes, created_at,
       painting_phase, tool, technique, dilution, time_estimate_minutes,
       step_photo_path, alt_paint_id, section_id
FROM recipe_steps;

DROP TABLE recipe_steps;

ALTER TABLE recipe_steps_new RENAME TO recipe_steps;

PRAGMA foreign_keys = ON;
