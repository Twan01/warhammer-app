-- Phase 52: detachment linkage on army_lists + user favorites/notes tables
-- Both new tables live in hobbyforge.db (NOT rules.db) — survive rules.db re-sync

ALTER TABLE army_lists ADD COLUMN detachment_id   TEXT;
ALTER TABLE army_lists ADD COLUMN detachment_name TEXT;

CREATE TABLE IF NOT EXISTS rules_favorites (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    rule_id     TEXT    NOT NULL,
    rule_type   TEXT    NOT NULL CHECK (rule_type IN ('stratagem', 'detachment_ability', 'shared_ability')),
    rule_name   TEXT    NOT NULL,
    is_reminder INTEGER NOT NULL DEFAULT 0,
    created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at  TEXT    NOT NULL DEFAULT (datetime('now')),
    UNIQUE (rule_id, rule_type)
);

CREATE TABLE IF NOT EXISTS rules_notes (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    rule_id     TEXT    NOT NULL,
    rule_type   TEXT    NOT NULL CHECK (rule_type IN ('stratagem', 'detachment_ability', 'shared_ability')),
    rule_name   TEXT    NOT NULL,
    note_text   TEXT    NOT NULL DEFAULT '',
    created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at  TEXT    NOT NULL DEFAULT (datetime('now')),
    UNIQUE (rule_id, rule_type)
);
