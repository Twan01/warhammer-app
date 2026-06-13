-- Backfill points for collection units that were imported from the Unit Database
-- before the points fallback fix. Non-tiered units (characters, transports,
-- single-price units) keep their points in udb_units.base_points and have no
-- udb_unit_points tier rows; the old "Add to Collection" prefill set points to
-- NULL for those, so they displayed 0 points.
--
-- Only touch linked units that currently have NULL points (never set). Units the
-- user manually priced are left untouched. Resolution order mirrors the runtime
-- COALESCE chain: exact model_count tier -> lowest tier -> flat base_points.

UPDATE units
SET points = (
  SELECT COALESCE(
    (SELECT p.points
       FROM udb_unit_points p
      WHERE p.unit_id = units.udb_unit_id
        AND p.model_count = units.model_count),
    (SELECT p.points
       FROM udb_unit_points p
      WHERE p.unit_id = units.udb_unit_id
      ORDER BY p.model_count ASC
      LIMIT 1),
    (SELECT b.base_points
       FROM udb_units b
      WHERE b.id = units.udb_unit_id)
  )
)
WHERE udb_unit_id IS NOT NULL
  AND points IS NULL
  AND (
    SELECT COALESCE(
      (SELECT p.points FROM udb_unit_points p
        WHERE p.unit_id = units.udb_unit_id AND p.model_count = units.model_count),
      (SELECT p.points FROM udb_unit_points p
        WHERE p.unit_id = units.udb_unit_id ORDER BY p.model_count ASC LIMIT 1),
      (SELECT b.base_points FROM udb_units b WHERE b.id = units.udb_unit_id)
    ) IS NOT NULL
  );
