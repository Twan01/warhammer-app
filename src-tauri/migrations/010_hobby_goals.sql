-- 010_hobby_goals.sql — HobbyForge v2.2 Phase 22 (ANLY-01..03)
-- Stores user-defined painting targets with fixed-period timeframes.
-- Progress is computed at query time from painting_sessions (not cached here).

CREATE TABLE IF NOT EXISTS hobby_goals (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  name         TEXT    NOT NULL,
  target_count INTEGER NOT NULL CHECK (target_count > 0),
  timeframe    TEXT    NOT NULL CHECK (timeframe IN ('month', 'quarter')),
  period       TEXT    NOT NULL,
  created_at   TEXT    NOT NULL DEFAULT (datetime('now'))
);
