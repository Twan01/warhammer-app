-- 008_enrichment.sql — HobbyForge v2.2 Phase 17 (ENRCH-01..04)
-- Adds lore_notes + undercoat on units, lore_notes on factions,
-- purchase_date on paints. Additive only: ALTER TABLE ADD COLUMN.
-- All columns are TEXT NULL — no defaults, no NOT NULL constraints.

ALTER TABLE units    ADD COLUMN lore_notes    TEXT;
ALTER TABLE units    ADD COLUMN undercoat     TEXT;
ALTER TABLE factions ADD COLUMN lore_notes    TEXT;
ALTER TABLE paints   ADD COLUMN purchase_date TEXT;
