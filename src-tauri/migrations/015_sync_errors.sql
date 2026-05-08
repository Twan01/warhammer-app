-- Phase 44 — Persistent sync error log (SYNC-04).
-- Lives in hobbyforge.db (NOT rules.db) so error history survives re-syncs.
CREATE TABLE IF NOT EXISTS sync_errors (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    occurred_at  TEXT NOT NULL,
    error_type   TEXT NOT NULL CHECK (error_type IN ('fetch_failed', 'parse_error', 'validation_error', 'sync_error')),
    message      TEXT NOT NULL,
    csv_file     TEXT
);
