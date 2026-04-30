-- 001_core_schema.sql — HobbyForge v1 core schema (Phase 2 plan 02-01)
-- All 10 application tables in a single idempotent migration.
-- The tauri-plugin-sql runner tracks applied versions in _sqlx_migrations;
-- this migration runs exactly once and never re-runs.

-- factions: FACT-01, FACT-02, FACT-03, FACT-04, FACT-05
CREATE TABLE IF NOT EXISTS factions (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT    NOT NULL,
    game_system TEXT    NOT NULL DEFAULT 'Warhammer 40K',
    description TEXT,
    color_theme TEXT    NOT NULL DEFAULT '#4A90D9',
    icon_path   TEXT,
    created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- units: UNIT-01, UNIT-02, UNIT-03, UNIT-04, UNIT-05, UNIT-06
-- faction_id uses RESTRICT so a faction with units cannot be deleted (DATA-02, FACT-03)
CREATE TABLE IF NOT EXISTS units (
    id                     INTEGER PRIMARY KEY AUTOINCREMENT,
    faction_id             INTEGER NOT NULL REFERENCES factions(id) ON DELETE RESTRICT,
    name                   TEXT    NOT NULL,
    category               TEXT,
    unit_type              TEXT,
    model_count            INTEGER,
    owned_count            INTEGER,
    points                 INTEGER,
    status_assembly        INTEGER NOT NULL DEFAULT 0,
    status_painting TEXT NOT NULL DEFAULT 'Not Started',
    painting_percentage    INTEGER NOT NULL DEFAULT 0,
    status_basing          INTEGER NOT NULL DEFAULT 0,
    status_varnished       INTEGER NOT NULL DEFAULT 0,
    is_active_project      INTEGER NOT NULL DEFAULT 0,
    priority               INTEGER,
    target_completion_date TEXT,
    purchase_date          TEXT,
    purchase_price         REAL,
    storage_location       TEXT,
    main_image_path        TEXT,
    notes                  TEXT,
    created_at             TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at             TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- paints: PAINT-01, PAINT-02
CREATE TABLE IF NOT EXISTS paints (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    brand        TEXT    NOT NULL,
    name         TEXT    NOT NULL,
    paint_type   TEXT    NOT NULL,
    color_family TEXT,
    hex_color    TEXT,
    owned        INTEGER NOT NULL DEFAULT 0,
    quantity     INTEGER,
    running_low  INTEGER NOT NULL DEFAULT 0,
    wishlist     INTEGER NOT NULL DEFAULT 0,
    notes        TEXT,
    created_at   TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at   TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- painting_recipes: RECIPE-01, RECIPE-02, RECIPE-03
-- faction_id and unit_id use SET NULL so deleting a faction/unit
-- does not destroy the recipe itself
CREATE TABLE IF NOT EXISTS painting_recipes (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    name          TEXT    NOT NULL,
    faction_id    INTEGER REFERENCES factions(id) ON DELETE SET NULL,
    unit_id       INTEGER REFERENCES units(id) ON DELETE SET NULL,
    area          TEXT,
    primer        TEXT,
    basecoat      TEXT,
    shade         TEXT,
    layer         TEXT,
    highlight     TEXT,
    glaze_filter  TEXT,
    weathering    TEXT,
    technical     TEXT,
    basing        TEXT,
    notes         TEXT,
    tutorial_link TEXT,
    created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at    TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- recipe_paints: RECIPE-02, PAINT-02
-- recipe_id uses CASCADE: deleting a recipe removes its paint links
-- paint_id uses RESTRICT: cannot delete a paint referenced by any recipe step (PAINT-02)
CREATE TABLE IF NOT EXISTS recipe_paints (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    recipe_id   INTEGER NOT NULL REFERENCES painting_recipes(id) ON DELETE CASCADE,
    paint_id    INTEGER NOT NULL REFERENCES paints(id) ON DELETE RESTRICT,
    step_name   TEXT    NOT NULL,
    order_index INTEGER NOT NULL DEFAULT 0,
    notes       TEXT,
    created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- army_lists: LIST-01 (Phase 3+)
-- faction_id uses SET NULL so lists survive faction deletion
CREATE TABLE IF NOT EXISTS army_lists (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT    NOT NULL,
    faction_id  INTEGER REFERENCES factions(id) ON DELETE SET NULL,
    points_limit INTEGER,
    list_type   TEXT,
    notes       TEXT,
    created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- army_list_units: LIST-02 (Phase 3+)
-- list_id uses CASCADE: deleting a list removes its unit entries
-- unit_id uses RESTRICT: cannot delete a unit that is in an army list
CREATE TABLE IF NOT EXISTS army_list_units (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    list_id        INTEGER NOT NULL REFERENCES army_lists(id) ON DELETE CASCADE,
    unit_id        INTEGER NOT NULL REFERENCES units(id) ON DELETE RESTRICT,
    points_override INTEGER,
    notes          TEXT,
    created_at     TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- unit_strategy_notes: STRAT-01 (Phase 3+)
-- unit_id uses CASCADE: deleting a unit removes its strategy notes
CREATE TABLE IF NOT EXISTS unit_strategy_notes (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    unit_id             INTEGER NOT NULL REFERENCES units(id) ON DELETE CASCADE,
    battlefield_role    TEXT,
    strengths           TEXT,
    weaknesses          TEXT,
    best_targets        TEXT,
    synergies           TEXT,
    mistakes_to_avoid   TEXT,
    rules_references    TEXT,
    notes               TEXT,
    created_at          TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at          TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- battle_logs: BATTLE-01 (Phase 3+)
-- army_list_id, mvp_unit_id, underperforming_unit_id use SET NULL
-- so logs survive list and unit deletion
CREATE TABLE IF NOT EXISTS battle_logs (
    id                    INTEGER PRIMARY KEY AUTOINCREMENT,
    army_list_id          INTEGER REFERENCES army_lists(id) ON DELETE SET NULL,
    battle_date           TEXT,
    opponent              TEXT,
    opponent_faction      TEXT,
    mission               TEXT,
    points_played         INTEGER,
    result                TEXT,
    my_score              INTEGER,
    opponent_score        INTEGER,
    mvp_unit_id           INTEGER REFERENCES units(id) ON DELETE SET NULL,
    underperforming_unit_id INTEGER REFERENCES units(id) ON DELETE SET NULL,
    lessons_learned       TEXT,
    changes_next_time     TEXT,
    notes                 TEXT,
    created_at            TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- image_assets: IMG-01 (Phase 4+)
-- Polymorphic image store; entity_type + entity_id identify the owning record
CREATE TABLE IF NOT EXISTS image_assets (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    entity_type TEXT    NOT NULL,
    entity_id   INTEGER NOT NULL,
    file_path   TEXT    NOT NULL,
    caption     TEXT,
    taken_at    TEXT,
    created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);
