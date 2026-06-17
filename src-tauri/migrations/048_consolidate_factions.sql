-- Migration 048: Consolidate duplicate collection factions (HON-05).
--
-- A user may have created multiple factions that map to the same canonical
-- wahapedia_faction_id (e.g. two 'Space Marines' rows both with 'SM').
-- This migration merges duplicates by re-pointing all FK dependents from
-- every non-survivor duplicate to the lowest-id survivor, then deleting the
-- now-orphaned duplicate rows.
--
-- Safety contract (D-03 map-not-delete):
--   Re-point ALL dependent FK surfaces BEFORE any DELETE.
--   Only delete a faction row after it has zero dependents.
--
-- Survivor selection (deterministic): the survivor for a group is the row with
--   the MINIMUM id among all rows sharing the same non-NULL wahapedia_faction_id.
--   A duplicate is any row whose id is greater than that group MIN. Every
--   re-point targets MIN(id) for the group and the DELETE removes exactly the
--   non-MIN rows, so the two always agree even when 3+ rows share a key. (Using
--   "any lower-id sibling" instead of MIN is unsafe: a dependent under id 3 could
--   be re-pointed to id 2, which the DELETE then removes — dangling FK / RESTRICT
--   abort. See REVIEW.md CR-01.)
--
-- FK surfaces (re-point order is significant):
--   1. units.faction_id        ON DELETE RESTRICT  — must re-point first or DELETE is blocked
--   2. painting_recipes.faction_id ON DELETE SET NULL — silent link loss if deleted first
--   3. army_lists.faction_id   ON DELETE SET NULL   — silent link loss if deleted first
--   4. wishlist_items.faction_id ON DELETE CASCADE   — silent row loss if deleted first
--   5. app_settings key='default_faction_id' (TEXT value, no FK) — cold-boot theming
--
-- No explicit BEGIN/COMMIT: the Tauri plugin-sql runner wraps each migration
-- in its own transaction (documented in migration 033). Adding explicit
-- BEGIN/COMMIT would cause a nested-transaction error.
--
-- No PRAGMA foreign_keys: changes inside a plugin-sql migration transaction
-- are silently ignored (documented in migration 033). The re-point-before-delete
-- ordering makes FK enforcement irrelevant -- no DELETE targets a row with live
-- dependents.

-- Step 0: Backfill still-NULL wahapedia_faction_id via normalized name matching
-- BEFORE consolidation, so any rows that resolve to the same canonical id (e.g.
-- "T'au Empire" / "Tau Empire" both normalizing to "tauempire") participate in
-- the dedup below. Running this AFTER consolidation could re-create duplicates
-- that the merge steps never revisit (see REVIEW.md WR-02). Copied from migration
-- 046's normalized compare (strips spaces + straight ' and curly U+2019 apostrophes).
-- Only touches rows still NULL; rows with no canonical match stay NULL and are
-- left intact by consolidation (D-04 — unmapped factions are never deleted).
UPDATE factions
SET wahapedia_faction_id = (
  SELECT uf.id
  FROM udb_factions uf
  WHERE LOWER(REPLACE(REPLACE(REPLACE(uf.name, ' ', ''), '''', ''), '’', ''))
      = LOWER(REPLACE(REPLACE(REPLACE(factions.name, ' ', ''), '''', ''), '’', ''))
  LIMIT 1
)
WHERE wahapedia_faction_id IS NULL;

-- Step 1: Re-point units.faction_id (RESTRICT — must go first)
UPDATE units
SET faction_id = (
  SELECT MIN(f_sur.id)
  FROM   factions f_sur
  WHERE  f_sur.wahapedia_faction_id = (
           SELECT f_cur.wahapedia_faction_id FROM factions f_cur WHERE f_cur.id = units.faction_id
         )
)
WHERE faction_id IN (
  SELECT f_dup.id
  FROM   factions f_dup
  WHERE  f_dup.wahapedia_faction_id IS NOT NULL
    AND  f_dup.id > (
           SELECT MIN(g.id) FROM factions g WHERE g.wahapedia_faction_id = f_dup.wahapedia_faction_id
         )
);

-- Step 2: Re-point painting_recipes.faction_id (SET NULL — preserve link)
UPDATE painting_recipes
SET faction_id = (
  SELECT MIN(f_sur.id)
  FROM   factions f_sur
  WHERE  f_sur.wahapedia_faction_id = (
           SELECT f_cur.wahapedia_faction_id FROM factions f_cur WHERE f_cur.id = painting_recipes.faction_id
         )
)
WHERE faction_id IN (
  SELECT f_dup.id
  FROM   factions f_dup
  WHERE  f_dup.wahapedia_faction_id IS NOT NULL
    AND  f_dup.id > (
           SELECT MIN(g.id) FROM factions g WHERE g.wahapedia_faction_id = f_dup.wahapedia_faction_id
         )
);

-- Step 3: Re-point army_lists.faction_id (SET NULL — preserve link)
UPDATE army_lists
SET faction_id = (
  SELECT MIN(f_sur.id)
  FROM   factions f_sur
  WHERE  f_sur.wahapedia_faction_id = (
           SELECT f_cur.wahapedia_faction_id FROM factions f_cur WHERE f_cur.id = army_lists.faction_id
         )
)
WHERE faction_id IN (
  SELECT f_dup.id
  FROM   factions f_dup
  WHERE  f_dup.wahapedia_faction_id IS NOT NULL
    AND  f_dup.id > (
           SELECT MIN(g.id) FROM factions g WHERE g.wahapedia_faction_id = f_dup.wahapedia_faction_id
         )
);

-- Step 4: Re-point wishlist_items.faction_id (CASCADE — must go before DELETE)
UPDATE wishlist_items
SET faction_id = (
  SELECT MIN(f_sur.id)
  FROM   factions f_sur
  WHERE  f_sur.wahapedia_faction_id = (
           SELECT f_cur.wahapedia_faction_id FROM factions f_cur WHERE f_cur.id = wishlist_items.faction_id
         )
)
WHERE faction_id IN (
  SELECT f_dup.id
  FROM   factions f_dup
  WHERE  f_dup.wahapedia_faction_id IS NOT NULL
    AND  f_dup.id > (
           SELECT MIN(g.id) FROM factions g WHERE g.wahapedia_faction_id = f_dup.wahapedia_faction_id
         )
);

-- Step 5: Re-point app_settings default_faction_id (TEXT value, no FK)
-- CAST required: factions.id is INTEGER, app_settings.value is TEXT.
-- Scoped to key = 'default_faction_id' ONLY — must not touch locale/currency/readiness.
UPDATE app_settings
SET    value      = (
         SELECT CAST(MIN(f_sur.id) AS TEXT)
         FROM   factions f_sur
         WHERE  f_sur.wahapedia_faction_id = (
                  SELECT f_cur.wahapedia_faction_id FROM factions f_cur
                  WHERE  CAST(f_cur.id AS TEXT) = app_settings.value
                )
       ),
       updated_at = datetime('now')
WHERE  key = 'default_faction_id'
  AND  value IN (
         SELECT CAST(f_dup.id AS TEXT)
         FROM   factions f_dup
         WHERE  f_dup.wahapedia_faction_id IS NOT NULL
           AND  f_dup.id > (
                  SELECT MIN(g.id) FROM factions g WHERE g.wahapedia_faction_id = f_dup.wahapedia_faction_id
                )
       );

-- Step 6: Delete now-zero-dependency duplicate rows (every non-MIN row per group).
DELETE FROM factions
WHERE wahapedia_faction_id IS NOT NULL
  AND id > (
        SELECT MIN(g.id) FROM factions g WHERE g.wahapedia_faction_id = factions.wahapedia_faction_id
      );
