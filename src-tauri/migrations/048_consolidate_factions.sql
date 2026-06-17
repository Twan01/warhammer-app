-- Migration 048: Consolidate duplicate collection factions (HON-05).
--
-- A user may have created multiple factions that map to the same canonical
-- wahapedia_faction_id (e.g. two 'Space Marines' rows both with 'SM').
-- This migration merges duplicates by re-pointing all FK dependents from
-- the higher-id duplicate to the lowest-id survivor, then deleting the
-- now-orphaned duplicate row.
--
-- Safety contract (D-03 map-not-delete):
--   Re-point ALL dependent FK surfaces BEFORE any DELETE.
--   Only delete a faction row after it has zero dependents.
--
-- FK surfaces (re-point order is significant):
--   1. units.faction_id        ON DELETE RESTRICT  — must re-point first or DELETE is blocked
--   2. painting_recipes.faction_id ON DELETE SET NULL — silent link loss if deleted first
--   3. army_lists.faction_id   ON DELETE SET NULL   — silent link loss if deleted first
--   4. wishlist_items.faction_id ON DELETE CASCADE   — silent row loss if deleted first
--   5. app_settings key='default_faction_id' (TEXT value, no FK) — cold-boot theming
--
-- Survivor selection: lowest id among rows sharing the same non-NULL
-- wahapedia_faction_id is kept; all higher-id rows with the same key are duplicates.
--
-- No explicit BEGIN/COMMIT: the Tauri plugin-sql runner wraps each migration
-- in its own transaction (documented in migration 033). Adding explicit
-- BEGIN/COMMIT would cause a nested-transaction error.
--
-- No PRAGMA foreign_keys: changes inside a plugin-sql migration transaction
-- are silently ignored (documented in migration 033). The re-point-before-delete
-- ordering makes FK enforcement irrelevant -- no DELETE targets a row with live
-- dependents.

-- Step 1: Re-point units.faction_id (RESTRICT — must go first)
UPDATE units
SET faction_id = (
  SELECT f_sur.id
  FROM   factions f_sur
  JOIN   factions f_dup ON f_dup.wahapedia_faction_id = f_sur.wahapedia_faction_id
                       AND f_sur.id < f_dup.id
  WHERE  f_dup.id = units.faction_id
  LIMIT 1
)
WHERE faction_id IN (
  SELECT f_dup.id
  FROM   factions f_dup
  JOIN   factions f_sur ON f_sur.wahapedia_faction_id = f_dup.wahapedia_faction_id
                       AND f_sur.id < f_dup.id
  WHERE  f_dup.wahapedia_faction_id IS NOT NULL
);

-- Step 2: Re-point painting_recipes.faction_id (SET NULL — preserve link)
UPDATE painting_recipes
SET faction_id = (
  SELECT f_sur.id
  FROM   factions f_sur
  JOIN   factions f_dup ON f_dup.wahapedia_faction_id = f_sur.wahapedia_faction_id
                       AND f_sur.id < f_dup.id
  WHERE  f_dup.id = painting_recipes.faction_id
  LIMIT 1
)
WHERE faction_id IN (
  SELECT f_dup.id
  FROM   factions f_dup
  JOIN   factions f_sur ON f_sur.wahapedia_faction_id = f_dup.wahapedia_faction_id
                       AND f_sur.id < f_dup.id
  WHERE  f_dup.wahapedia_faction_id IS NOT NULL
);

-- Step 3: Re-point army_lists.faction_id (SET NULL — preserve link)
UPDATE army_lists
SET faction_id = (
  SELECT f_sur.id
  FROM   factions f_sur
  JOIN   factions f_dup ON f_dup.wahapedia_faction_id = f_sur.wahapedia_faction_id
                       AND f_sur.id < f_dup.id
  WHERE  f_dup.id = army_lists.faction_id
  LIMIT 1
)
WHERE faction_id IN (
  SELECT f_dup.id
  FROM   factions f_dup
  JOIN   factions f_sur ON f_sur.wahapedia_faction_id = f_dup.wahapedia_faction_id
                       AND f_sur.id < f_dup.id
  WHERE  f_dup.wahapedia_faction_id IS NOT NULL
);

-- Step 4: Re-point wishlist_items.faction_id (CASCADE — must go before DELETE)
UPDATE wishlist_items
SET faction_id = (
  SELECT f_sur.id
  FROM   factions f_sur
  JOIN   factions f_dup ON f_dup.wahapedia_faction_id = f_sur.wahapedia_faction_id
                       AND f_sur.id < f_dup.id
  WHERE  f_dup.id = wishlist_items.faction_id
  LIMIT 1
)
WHERE faction_id IN (
  SELECT f_dup.id
  FROM   factions f_dup
  JOIN   factions f_sur ON f_sur.wahapedia_faction_id = f_dup.wahapedia_faction_id
                       AND f_sur.id < f_dup.id
  WHERE  f_dup.wahapedia_faction_id IS NOT NULL
);

-- Step 5: Re-point app_settings default_faction_id (TEXT value, no FK)
-- CAST required: factions.id is INTEGER, app_settings.value is TEXT.
-- Scoped to key = 'default_faction_id' ONLY — must not touch locale/currency/readiness.
UPDATE app_settings
SET    value      = (
         SELECT CAST(f_sur.id AS TEXT)
         FROM   factions f_sur
         JOIN   factions f_dup ON f_dup.wahapedia_faction_id = f_sur.wahapedia_faction_id
                              AND f_sur.id < f_dup.id
         WHERE  CAST(f_dup.id AS TEXT) = app_settings.value
         LIMIT 1
       ),
       updated_at = datetime('now')
WHERE  key = 'default_faction_id'
  AND  value IN (
         SELECT CAST(f_dup.id AS TEXT)
         FROM   factions f_dup
         JOIN   factions f_sur ON f_sur.wahapedia_faction_id = f_dup.wahapedia_faction_id
                              AND f_sur.id < f_dup.id
         WHERE  f_dup.wahapedia_faction_id IS NOT NULL
       );

-- Step 6: Delete now-zero-dependency duplicate rows
DELETE FROM factions
WHERE id IN (
  SELECT f_dup.id
  FROM   factions f_dup
  JOIN   factions f_sur ON f_sur.wahapedia_faction_id = f_dup.wahapedia_faction_id
                       AND f_sur.id < f_dup.id
  WHERE  f_dup.wahapedia_faction_id IS NOT NULL
);

-- Step 7: Backfill still-NULL wahapedia_faction_id via normalized name matching.
-- Copied verbatim from migration 046 (same normalized compare: strips spaces +
-- both straight apostrophe ' and curly U+2019). Only touches rows still NULL.
UPDATE factions
SET wahapedia_faction_id = (
  SELECT uf.id
  FROM udb_factions uf
  WHERE LOWER(REPLACE(REPLACE(REPLACE(uf.name, ' ', ''), '''', ''), '’', ''))
      = LOWER(REPLACE(REPLACE(REPLACE(factions.name, ' ', ''), '''', ''), '’', ''))
  LIMIT 1
)
WHERE wahapedia_faction_id IS NULL;
