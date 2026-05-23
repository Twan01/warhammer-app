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

-- Note: CHECK constraints via table recreation were removed because sqlx
-- enables PRAGMA foreign_keys = ON at the connection level, and this pragma
-- cannot be turned OFF inside a transaction (tauri-plugin-sql wraps migrations
-- in a transaction). Table recreation with FK ON causes implicit DELETE on DROP
-- which violates ON DELETE RESTRICT constraints from child tables.
-- The application layer already validates these ranges.

-- ─── Data cleanup: clamp invalid values ──────────────────────────────────────
UPDATE units SET points = 0 WHERE points IS NOT NULL AND points < 0;
UPDATE units SET painting_percentage = 0 WHERE painting_percentage < 0;
UPDATE units SET painting_percentage = 100 WHERE painting_percentage > 100;
UPDATE units SET model_count = 0 WHERE model_count IS NOT NULL AND model_count < 0;
UPDATE units SET owned_count = 0 WHERE owned_count IS NOT NULL AND owned_count < 0;
UPDATE units SET purchase_price_pence = 0 WHERE purchase_price_pence IS NOT NULL AND purchase_price_pence < 0;
UPDATE paints SET quantity = 0 WHERE quantity IS NOT NULL AND quantity < 0;
UPDATE paints SET purchase_price_pence = 0 WHERE purchase_price_pence IS NOT NULL AND purchase_price_pence < 0;

-- FK index on units (was already present but ensuring it exists)
CREATE INDEX IF NOT EXISTS idx_units_faction_id ON units(faction_id);

-- Set user_version so DbHealthGate can verify schema is current
PRAGMA user_version = 33;
