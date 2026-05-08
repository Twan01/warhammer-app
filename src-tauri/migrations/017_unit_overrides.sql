-- 017_unit_overrides.sql — Phase 46 (OVRD-01 to OVRD-04)
-- Wide-table override row per unit. NULL = "use imported value".
-- Separate from unit_strategy_notes (personal gameplay notes).
-- CRITICAL: Lives in hobbyforge.db — rules.db is fully wiped on every sync.
-- Cross-database FKs not supported in SQLite; unit_id references units.id
-- in hobbyforge.db (not rules.db).

CREATE TABLE IF NOT EXISTS unit_overrides (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    unit_id           INTEGER NOT NULL UNIQUE REFERENCES units(id) ON DELETE CASCADE,
    points            INTEGER,
    move              INTEGER,
    toughness         INTEGER,
    save              INTEGER,
    wounds            INTEGER,
    leadership        INTEGER,
    objective_control INTEGER,
    keywords          TEXT,
    abilities         TEXT,
    created_at        TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at        TEXT NOT NULL DEFAULT (datetime('now'))
);
