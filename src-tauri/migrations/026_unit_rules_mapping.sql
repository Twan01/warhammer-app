-- 026_unit_rules_mapping.sql — Phase 73 (unit-to-rules mapping)
-- Maps each unit to its Wahapedia datasheet for rules cross-referencing.
-- rules_datasheet_id is a TEXT copy (no cross-DB FK; same pattern as weapon_name).

CREATE TABLE IF NOT EXISTS unit_rules_mapping (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    unit_id             INTEGER NOT NULL UNIQUE REFERENCES units(id) ON DELETE CASCADE,
    rules_datasheet_id  TEXT,
    match_status        TEXT    NOT NULL DEFAULT 'auto',
    source              TEXT,
    created_at          TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at          TEXT    NOT NULL DEFAULT (datetime('now'))
);
