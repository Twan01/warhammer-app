-- Migration 033: Database Hardening
-- Adds FK indexes, temporal DESC indexes, and CHECK constraints via table recreation.
-- Part 1: FK indexes on tables NOT being recreated (units and paints are recreated below)

-- FK indexes on painting_recipes
CREATE INDEX IF NOT EXISTS idx_painting_recipes_faction_id ON painting_recipes(faction_id);
CREATE INDEX IF NOT EXISTS idx_painting_recipes_unit_id ON painting_recipes(unit_id);

-- FK indexes on recipe_steps
CREATE INDEX IF NOT EXISTS idx_recipe_steps_recipe_id ON recipe_steps(recipe_id);
CREATE INDEX IF NOT EXISTS idx_recipe_steps_paint_id ON recipe_steps(paint_id);
CREATE INDEX IF NOT EXISTS idx_recipe_steps_alt_paint_id ON recipe_steps(alt_paint_id);
CREATE INDEX IF NOT EXISTS idx_recipe_steps_section_id ON recipe_steps(section_id);

-- FK indexes on army_lists
CREATE INDEX IF NOT EXISTS idx_army_lists_faction_id ON army_lists(faction_id);

-- FK indexes on army_list_units
CREATE INDEX IF NOT EXISTS idx_army_list_units_list_id ON army_list_units(list_id);
CREATE INDEX IF NOT EXISTS idx_army_list_units_unit_id ON army_list_units(unit_id);
CREATE INDEX IF NOT EXISTS idx_army_list_units_leader_attached_to_id ON army_list_units(leader_attached_to_id);

-- FK indexes on unit_strategy_notes
CREATE INDEX IF NOT EXISTS idx_unit_strategy_notes_unit_id ON unit_strategy_notes(unit_id);

-- FK indexes on battle_logs
CREATE INDEX IF NOT EXISTS idx_battle_logs_army_list_id ON battle_logs(army_list_id);
CREATE INDEX IF NOT EXISTS idx_battle_logs_mvp_unit_id ON battle_logs(mvp_unit_id);
CREATE INDEX IF NOT EXISTS idx_battle_logs_underperforming_unit_id ON battle_logs(underperforming_unit_id);

-- Composite index on image_assets (polymorphic lookup)
CREATE INDEX IF NOT EXISTS idx_image_assets_entity ON image_assets(entity_type, entity_id);

-- FK indexes on painting_sessions
CREATE INDEX IF NOT EXISTS idx_painting_sessions_unit_id ON painting_sessions(unit_id);
CREATE INDEX IF NOT EXISTS idx_painting_sessions_recipe_id ON painting_sessions(recipe_id);
CREATE INDEX IF NOT EXISTS idx_painting_sessions_recipe_step_id ON painting_sessions(recipe_step_id);
CREATE INDEX IF NOT EXISTS idx_painting_sessions_recipe_section_id ON painting_sessions(recipe_section_id);

-- FK indexes on wishlist_items
CREATE INDEX IF NOT EXISTS idx_wishlist_items_faction_id ON wishlist_items(faction_id);

-- FK indexes on unit_point_tiers
CREATE INDEX IF NOT EXISTS idx_unit_point_tiers_unit_id ON unit_point_tiers(unit_id);

-- FK indexes on unit_loadouts
CREATE INDEX IF NOT EXISTS idx_unit_loadouts_unit_id ON unit_loadouts(unit_id);

-- FK indexes on unit_loadout_wargear
CREATE INDEX IF NOT EXISTS idx_unit_loadout_wargear_loadout_id ON unit_loadout_wargear(loadout_id);

-- FK indexes on recipe_sections
CREATE INDEX IF NOT EXISTS idx_recipe_sections_recipe_id ON recipe_sections(recipe_id);

-- FK indexes on unit_recipe_assignments
CREATE INDEX IF NOT EXISTS idx_unit_recipe_assignments_unit_id ON unit_recipe_assignments(unit_id);
CREATE INDEX IF NOT EXISTS idx_unit_recipe_assignments_recipe_id ON unit_recipe_assignments(recipe_id);

-- FK indexes on unit_recipe_step_progress
CREATE INDEX IF NOT EXISTS idx_unit_recipe_step_progress_assignment_id ON unit_recipe_step_progress(assignment_id);
CREATE INDEX IF NOT EXISTS idx_unit_recipe_step_progress_recipe_step_id ON unit_recipe_step_progress(recipe_step_id);

-- FK indexes on army_list_enhancements
CREATE INDEX IF NOT EXISTS idx_army_list_enhancements_list_id ON army_list_enhancements(list_id);
CREATE INDEX IF NOT EXISTS idx_army_list_enhancements_army_list_unit_id ON army_list_enhancements(army_list_unit_id);

-- Temporal DESC indexes (DBH-02)
-- Note: idx_painting_sessions_session_date created here survives since painting_sessions is not recreated
CREATE INDEX IF NOT EXISTS idx_painting_sessions_session_date ON painting_sessions(session_date DESC);
CREATE INDEX IF NOT EXISTS idx_battle_logs_battle_date ON battle_logs(battle_date DESC);

-- ═══════════════════════════════════════════════════════════════════════════════
-- Part 2: CHECK constraints via table recreation (units, paints)
-- Pattern: data cleanup -> FK OFF -> rename -> create -> copy -> drop -> FK ON
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── Data cleanup: clamp invalid values before table recreation ──────────────
UPDATE units SET points = 0 WHERE points IS NOT NULL AND points < 0;
UPDATE units SET painting_percentage = 0 WHERE painting_percentage < 0;
UPDATE units SET painting_percentage = 100 WHERE painting_percentage > 100;
UPDATE units SET model_count = 0 WHERE model_count IS NOT NULL AND model_count < 0;
UPDATE units SET owned_count = 0 WHERE owned_count IS NOT NULL AND owned_count < 0;
UPDATE units SET purchase_price_pence = 0 WHERE purchase_price_pence IS NOT NULL AND purchase_price_pence < 0;
UPDATE paints SET quantity = 0 WHERE quantity IS NOT NULL AND quantity < 0;
UPDATE paints SET purchase_price_pence = 0 WHERE purchase_price_pence IS NOT NULL AND purchase_price_pence < 0;

-- ─── Disable FK enforcement during table recreation ──────────────────────────
PRAGMA foreign_keys = OFF;

-- ─── Units table recreation ──────────────────────────────────────────────────
ALTER TABLE units RENAME TO units_old;

CREATE TABLE units (
    id                     INTEGER PRIMARY KEY AUTOINCREMENT,
    faction_id             INTEGER NOT NULL REFERENCES factions(id) ON DELETE RESTRICT,
    name                   TEXT    NOT NULL,
    category               TEXT,
    unit_type              TEXT,
    model_count            INTEGER CHECK (model_count IS NULL OR model_count >= 0),
    owned_count            INTEGER CHECK (owned_count IS NULL OR owned_count >= 0),
    points                 INTEGER CHECK (points IS NULL OR points >= 0),
    status_assembly        INTEGER NOT NULL DEFAULT 0,
    status_painting        TEXT NOT NULL DEFAULT 'Not Started',
    painting_percentage    INTEGER NOT NULL DEFAULT 0 CHECK (painting_percentage BETWEEN 0 AND 100),
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
    updated_at             TEXT    NOT NULL DEFAULT (datetime('now')),
    purchase_price_pence   INTEGER CHECK (purchase_price_pence IS NULL OR purchase_price_pence >= 0),
    lore_notes             TEXT,
    undercoat              TEXT
);

INSERT INTO units (
    id, faction_id, name, category, unit_type, model_count, owned_count, points,
    status_assembly, status_painting, painting_percentage, status_basing, status_varnished,
    is_active_project, priority, target_completion_date, purchase_date, purchase_price,
    storage_location, main_image_path, notes, created_at, updated_at,
    purchase_price_pence, lore_notes, undercoat
)
SELECT
    id, faction_id, name, category, unit_type, model_count, owned_count, points,
    status_assembly, status_painting, painting_percentage, status_basing, status_varnished,
    is_active_project, priority, target_completion_date, purchase_date, purchase_price,
    storage_location, main_image_path, notes, created_at, updated_at,
    purchase_price_pence, lore_notes, undercoat
FROM units_old;

DROP TABLE units_old;

-- ─── Paints table recreation ─────────────────────────────────────────────────
ALTER TABLE paints RENAME TO paints_old;

CREATE TABLE paints (
    id                   INTEGER PRIMARY KEY AUTOINCREMENT,
    brand                TEXT    NOT NULL,
    name                 TEXT    NOT NULL,
    paint_type           TEXT    NOT NULL,
    color_family         TEXT,
    hex_color            TEXT,
    owned                INTEGER NOT NULL DEFAULT 0,
    quantity             INTEGER CHECK (quantity IS NULL OR quantity >= 0),
    running_low          INTEGER NOT NULL DEFAULT 0,
    wishlist             INTEGER NOT NULL DEFAULT 0,
    notes                TEXT,
    created_at           TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at           TEXT    NOT NULL DEFAULT (datetime('now')),
    purchase_price_pence INTEGER CHECK (purchase_price_pence IS NULL OR purchase_price_pence >= 0),
    purchase_date        TEXT
);

INSERT INTO paints (
    id, brand, name, paint_type, color_family, hex_color, owned, quantity,
    running_low, wishlist, notes, created_at, updated_at,
    purchase_price_pence, purchase_date
)
SELECT
    id, brand, name, paint_type, color_family, hex_color, owned, quantity,
    running_low, wishlist, notes, created_at, updated_at,
    purchase_price_pence, purchase_date
FROM paints_old;

DROP TABLE paints_old;

-- ─── Restore FK enforcement ──────────────────────────────────────────────────
PRAGMA foreign_keys = ON;

-- ─── Re-create indexes on recreated tables ───────────────────────────────────
-- idx_units_faction_id was lost when units_old was dropped
CREATE INDEX IF NOT EXISTS idx_units_faction_id ON units(faction_id);
