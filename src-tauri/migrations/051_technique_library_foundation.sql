-- 051_technique_library_foundation.sql — Phase 141: Technique Library foundation
-- Decision: Option A (materialise technique steps as recipe_steps rows carrying
-- technique_step_id). unit_recipe_step_progress is intentionally UNCHANGED.
-- See PROJECT.md Key Decisions.

-- 1. techniques (root)
CREATE TABLE IF NOT EXISTS techniques (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT NOT NULL,
    effect      TEXT,
    difficulty  TEXT,
    notes       TEXT,
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 2. technique_sections (child of techniques)
CREATE TABLE IF NOT EXISTS technique_sections (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    technique_id  INTEGER NOT NULL REFERENCES techniques(id) ON DELETE CASCADE,
    name          TEXT NOT NULL DEFAULT 'Steps',
    surface       TEXT,
    optional      INTEGER NOT NULL DEFAULT 0,
    order_index   INTEGER NOT NULL DEFAULT 0,
    notes         TEXT,
    created_at    TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 3. technique_colour_slots (child of techniques) — DECLARED BEFORE steps (FND-01)
CREATE TABLE IF NOT EXISTS technique_colour_slots (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    technique_id  INTEGER NOT NULL REFERENCES techniques(id) ON DELETE CASCADE,
    name          TEXT NOT NULL,
    role_hint     TEXT,
    order_index   INTEGER NOT NULL DEFAULT 0,
    created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 4. technique_steps (child of technique_sections; may reference a colour slot)
CREATE TABLE IF NOT EXISTS technique_steps (
    id                    INTEGER PRIMARY KEY AUTOINCREMENT,
    technique_section_id  INTEGER NOT NULL REFERENCES technique_sections(id) ON DELETE CASCADE,
    colour_slot_id        INTEGER REFERENCES technique_colour_slots(id) ON DELETE SET NULL,
    step_name             TEXT NOT NULL,
    order_index           INTEGER NOT NULL DEFAULT 0,
    notes                 TEXT,
    painting_phase        TEXT,
    tool                  TEXT,
    technique             TEXT,
    dilution              TEXT,
    time_estimate_minutes INTEGER,
    created_at            TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 5. recipe_technique_instances (one row per application of a technique into a recipe)
CREATE TABLE IF NOT EXISTS recipe_technique_instances (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    recipe_id     INTEGER NOT NULL REFERENCES painting_recipes(id) ON DELETE CASCADE,
    technique_id  INTEGER NOT NULL REFERENCES techniques(id) ON DELETE CASCADE,
    detached      INTEGER NOT NULL DEFAULT 0,
    created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 6. recipe_technique_slot_maps (per-instance slot -> paint mapping; orphan-proof)
CREATE TABLE IF NOT EXISTS recipe_technique_slot_maps (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    instance_id   INTEGER NOT NULL REFERENCES recipe_technique_instances(id) ON DELETE CASCADE,
    slot_id       INTEGER NOT NULL REFERENCES technique_colour_slots(id) ON DELETE CASCADE,
    paint_id      INTEGER REFERENCES paints(id) ON DELETE RESTRICT,
    UNIQUE(instance_id, slot_id)
);

-- 7. Materialisation FK columns on the recipe graph (Option A) — nullable ALTER
ALTER TABLE recipe_sections ADD COLUMN technique_instance_id INTEGER
    REFERENCES recipe_technique_instances(id) ON DELETE SET NULL;
ALTER TABLE recipe_steps ADD COLUMN technique_step_id INTEGER
    REFERENCES technique_steps(id) ON DELETE SET NULL;
