-- 006_spend_pence.sql — HobbyForge v2.1 Phase 14 (SPEND-05)
-- Adds purchase_price_pence INTEGER NULL to units and paints.
-- Migrates existing REAL purchase_price values on units to integer pence
-- (multiply by 100, then ROUND + CAST to integer). The old purchase_price
-- REAL column is no longer written by the application after this migration.
-- Additive migration only: ALTER TABLE ... ADD COLUMN. No destructive statements,
-- no modifications to 001_core_schema.sql.

ALTER TABLE units ADD COLUMN purchase_price_pence INTEGER;
ALTER TABLE paints ADD COLUMN purchase_price_pence INTEGER;

-- Migrate existing REAL values on units to pence (rounds to nearest pence).
-- paints had no purchase column previously, so no UPDATE needed there.
UPDATE units
   SET purchase_price_pence = CAST(ROUND(purchase_price * 100) AS INTEGER)
 WHERE purchase_price IS NOT NULL;
