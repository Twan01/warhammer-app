-- rules_001_schema.sql — HobbyForge v2.1 Phase 15 (DS-01, DS-09)
-- Schema for the SECOND SQLite database (rules.db), holding Wahapedia 40K data.
-- All table names prefixed `rw_` (rules wahapedia) to avoid collision if the
-- two databases were ever merged. IDs are TEXT (Wahapedia uses 9-digit
-- zero-padded strings).
-- Additive only — no destructive statements.

CREATE TABLE IF NOT EXISTS rw_factions (
    id    TEXT PRIMARY KEY,
    name  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS rw_datasheets (
    id                  TEXT PRIMARY KEY,
    name                TEXT NOT NULL,
    faction_id          TEXT REFERENCES rw_factions(id),
    source_id           TEXT,
    role                TEXT,
    damaged_w           TEXT,
    damaged_description TEXT
);

CREATE TABLE IF NOT EXISTS rw_datasheet_models (
    datasheet_id  TEXT NOT NULL REFERENCES rw_datasheets(id) ON DELETE CASCADE,
    line          INTEGER NOT NULL,
    name          TEXT,
    M             TEXT,
    T             INTEGER,
    Sv            TEXT,
    inv_sv        TEXT,
    W             INTEGER,
    Ld            TEXT,
    OC            INTEGER,
    PRIMARY KEY (datasheet_id, line)
);

CREATE TABLE IF NOT EXISTS rw_datasheet_abilities (
    datasheet_id  TEXT NOT NULL REFERENCES rw_datasheets(id) ON DELETE CASCADE,
    line          INTEGER NOT NULL,
    ability_id    TEXT,
    name          TEXT NOT NULL,
    description   TEXT,
    type          TEXT,
    parameter     TEXT,
    PRIMARY KEY (datasheet_id, line)
);

CREATE TABLE IF NOT EXISTS rw_datasheet_keywords (
    datasheet_id       TEXT NOT NULL REFERENCES rw_datasheets(id) ON DELETE CASCADE,
    keyword            TEXT NOT NULL,
    is_faction_keyword INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS rw_sources (
    id           TEXT PRIMARY KEY,
    name         TEXT NOT NULL,
    type         TEXT,
    edition      INTEGER,
    version      TEXT,
    errata_date  TEXT
);

CREATE TABLE IF NOT EXISTS rw_sync_meta (
    id                INTEGER PRIMARY KEY CHECK (id = 1),
    last_sync_at      TEXT,
    wahapedia_version TEXT
);
