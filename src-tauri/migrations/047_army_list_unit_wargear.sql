-- Migration 047: per-unit wargear selections for army list units.
--
-- MVP wargear picker (follow-up to the army-list-wargear-options-empty fix).
-- Stores a count-based loadout for each army_list_units row: "x of weapon A,
-- y of weapon B". Weapon names reference udb_unit_weapons.name (denormalized
-- TEXT, not an FK) so selections survive a unit-database re-sync the same way
-- detachment_name / ghost_unit_name do elsewhere.
--
-- No constraint metadata ("1 per 5 models", "Sergeant only", mutual exclusion)
-- is modeled here — that data does not exist in the Wahapedia source and is
-- deferred to a future constraint-aware picker. Quantities are free-form;
-- the UI offers model-count guidance only.
--
-- Wargear is free in 10th edition, so selections do NOT affect points — the
-- effective_points COALESCE chain is untouched.

CREATE TABLE IF NOT EXISTS army_list_unit_wargear (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    army_list_unit_id INTEGER NOT NULL REFERENCES army_list_units(id) ON DELETE CASCADE,
    weapon_name       TEXT    NOT NULL,
    quantity          INTEGER NOT NULL DEFAULT 1,
    created_at        TEXT    NOT NULL DEFAULT (datetime('now')),
    UNIQUE (army_list_unit_id, weapon_name)
);

CREATE INDEX IF NOT EXISTS idx_alu_wargear_unit
    ON army_list_unit_wargear(army_list_unit_id);
