-- Migration 046: Link factions to udb_factions that exact-name matching missed.
--
-- Migration 039 backfilled factions.wahapedia_faction_id via a case-insensitive
-- EXACT name match against udb_factions. That misses factions whose name differs
-- only by punctuation/whitespace from the canonical Wahapedia name — most notably
-- "Tau Empire" vs udb "T'au Empire" (curly apostrophe + space). Such factions are
-- left NULL, which makes the army-list detachment picker fail with
-- "Could not match faction to rules data. Try syncing rules."
--
-- This re-runs the backfill for still-NULL factions using a NORMALIZED comparison
-- that strips spaces and apostrophes (both straight ' and curly U+2019), so
-- "tauempire" == "tauempire". Generic — fixes any similar punctuation variant,
-- not just Tau. Only touches rows that are still NULL; manually-linked rows and
-- rows already linked by 039 are left untouched.

UPDATE factions
SET wahapedia_faction_id = (
  SELECT uf.id
  FROM udb_factions uf
  WHERE LOWER(REPLACE(REPLACE(REPLACE(uf.name, ' ', ''), '''', ''), '’', ''))
      = LOWER(REPLACE(REPLACE(REPLACE(factions.name, ' ', ''), '''', ''), '’', ''))
  LIMIT 1
)
WHERE wahapedia_faction_id IS NULL;

-- Now that previously-unlinked factions resolve to a udb id, backfill their units'
-- udb_unit_id by the same case-insensitive name + faction scope migration 039 used.
-- Only touches units still NULL, so units the 039 pass already linked are untouched.
UPDATE units
SET udb_unit_id = (
  SELECT uu.id
  FROM udb_units uu
  WHERE LOWER(uu.name) = LOWER(units.name)
    AND uu.faction_id = (
      SELECT f.wahapedia_faction_id
      FROM factions f
      WHERE f.id = units.faction_id
    )
  LIMIT 1
)
WHERE udb_unit_id IS NULL;
