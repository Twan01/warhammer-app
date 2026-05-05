-- 011_point_tiers_loadouts.sql
-- Phase 24: Point tiers, named loadouts, and loadout wargear selections.

-- Points tiers: multiple model-count -> points brackets per unit.
-- If no rows exist for a unit, falls back to units.points (simple mode).
CREATE TABLE IF NOT EXISTS unit_point_tiers (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    unit_id      INTEGER NOT NULL REFERENCES units(id) ON DELETE CASCADE,
    model_count  INTEGER NOT NULL,
    points       INTEGER NOT NULL,
    created_at   TEXT    NOT NULL DEFAULT (datetime('now')),
    UNIQUE (unit_id, model_count)
);

-- Named loadout configurations per unit.
-- is_active: 0|1 integer following project boolean discipline.
-- Only one row per unit_id may have is_active = 1 (enforced at application layer).
CREATE TABLE IF NOT EXISTS unit_loadouts (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    unit_id    INTEGER NOT NULL REFERENCES units(id) ON DELETE CASCADE,
    name       TEXT    NOT NULL,
    is_active  INTEGER NOT NULL DEFAULT 0,
    created_at TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- Wargear selections within a named loadout.
-- weapon_name mirrors rw_datasheets_wargear.name (TEXT copy, not FK -- cross-DB).
-- is_manual: 1 when the user typed the weapon name (no datasheet link).
CREATE TABLE IF NOT EXISTS unit_loadout_wargear (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    loadout_id   INTEGER NOT NULL REFERENCES unit_loadouts(id) ON DELETE CASCADE,
    weapon_name  TEXT    NOT NULL,
    weapon_line  INTEGER,
    is_manual    INTEGER NOT NULL DEFAULT 0,
    created_at   TEXT    NOT NULL DEFAULT (datetime('now'))
);
