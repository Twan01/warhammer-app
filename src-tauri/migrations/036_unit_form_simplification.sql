-- 036_unit_form_simplification.sql
-- Merge lore_notes into notes for units that have lore_notes content.
-- Does NOT drop the lore_notes column (SQLite compat) — the column is
-- simply ignored by the app going forward.

UPDATE units
SET notes = CASE
  WHEN lore_notes IS NOT NULL AND lore_notes != '' AND notes IS NOT NULL AND notes != ''
    THEN notes || char(10) || char(10) || '--- Lore ---' || char(10) || lore_notes
  WHEN lore_notes IS NOT NULL AND lore_notes != ''
    THEN lore_notes
  ELSE notes
END,
updated_at = datetime('now')
WHERE lore_notes IS NOT NULL AND lore_notes != '';
