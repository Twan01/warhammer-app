-- rules_002_wargear_abilities.sql — Phase 15 extension
-- Adds wargear (weapon stats), shared abilities, stratagems,
-- detachments, and detachment abilities to rules.db.

CREATE TABLE IF NOT EXISTS rw_datasheets_wargear (
    datasheet_id    TEXT NOT NULL,
    line            INTEGER NOT NULL DEFAULT 1,
    line_in_wargear INTEGER NOT NULL DEFAULT 1,
    dice            TEXT,
    name            TEXT NOT NULL,
    description     TEXT,
    range           TEXT,
    type            TEXT,
    A               TEXT,
    BS_WS           TEXT,
    S               TEXT,
    AP              TEXT,
    D               TEXT,
    PRIMARY KEY (datasheet_id, line, line_in_wargear)
);

CREATE TABLE IF NOT EXISTS rw_abilities (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    legend      TEXT,
    faction_id  TEXT,
    description TEXT
);

CREATE TABLE IF NOT EXISTS rw_stratagems (
    id            TEXT PRIMARY KEY,
    faction_id    TEXT,
    name          TEXT NOT NULL,
    type          TEXT,
    cp_cost       TEXT,
    legend        TEXT,
    turn          TEXT,
    phase         TEXT,
    detachment    TEXT,
    detachment_id TEXT,
    description   TEXT
);

CREATE TABLE IF NOT EXISTS rw_detachments (
    id         TEXT PRIMARY KEY,
    faction_id TEXT,
    name       TEXT NOT NULL,
    legend     TEXT,
    type       TEXT
);

CREATE TABLE IF NOT EXISTS rw_detachment_abilities (
    id            TEXT PRIMARY KEY,
    faction_id    TEXT,
    name          TEXT NOT NULL,
    legend        TEXT,
    description   TEXT,
    detachment    TEXT,
    detachment_id TEXT
);
