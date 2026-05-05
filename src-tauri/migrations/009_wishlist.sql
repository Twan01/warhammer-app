-- 009_wishlist.sql — HobbyForge v2.2 Phase 21 (WISH-01..04)
CREATE TABLE IF NOT EXISTS wishlist_items (
  id                    INTEGER PRIMARY KEY AUTOINCREMENT,
  name                  TEXT NOT NULL,
  faction_id            INTEGER NOT NULL REFERENCES factions(id) ON DELETE CASCADE,
  estimated_cost_pence  INTEGER,
  notes                 TEXT,
  created_at            TEXT NOT NULL DEFAULT (datetime('now'))
);
