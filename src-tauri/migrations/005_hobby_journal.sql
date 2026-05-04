-- 005_hobby_journal.sql — HobbyForge v2.1 Phase 13 (JOUR-01..06)
-- Adds painting_sessions table and stage_label column to image_assets.
-- Additive only — no destructive statements.

CREATE TABLE IF NOT EXISTS painting_sessions (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    unit_id          INTEGER NOT NULL REFERENCES units(id) ON DELETE CASCADE,
    session_date     TEXT    NOT NULL,
    duration_minutes INTEGER NOT NULL,
    notes            TEXT,
    created_at       TEXT    NOT NULL DEFAULT (datetime('now'))
);

ALTER TABLE image_assets ADD COLUMN stage_label TEXT;
