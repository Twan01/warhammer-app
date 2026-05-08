-- 016_rules_snapshot.sql — Phase 45 (META-06)
-- Pre-sync snapshot table in hobbyforge.db (NOT rules.db).
-- CRITICAL: Must live in hobbyforge.db because rules.db is fully DELETEd
-- on every sync — snapshot data stored there would be lost.
--
-- Each capture creates 11 rows (one per rw_* table), sharing a captured_at
-- timestamp. cleanOldSnapshots() retains only the 3 most recent groups.

CREATE TABLE IF NOT EXISTS rules_snapshot (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    captured_at       TEXT NOT NULL,
    wahapedia_version TEXT,
    table_name        TEXT NOT NULL,
    row_count         INTEGER NOT NULL,
    snapshot_data     TEXT
);
