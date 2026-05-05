import { getDb } from "@/db/client";
import type { UnitPhoto, CreateUnitPhotoInput } from "@/types/unitPhoto";

/**
 * unitPhotos queries (JOUR-04..06).
 *
 * Operates on the polymorphic image_assets table where entity_type = 'unit'.
 * The literal 'unit' string is set inside this module — callers pass unit_id,
 * never entity_type, so the polymorphic distinction is hidden from app code.
 *
 * stage_label column was added by migration 005_hobby_journal.sql.
 *
 * file_path stores ONLY the UUID filename relative to appDataDir(), per
 * 13-RESEARCH.md §Pattern 4 — never an absolute path.
 */

export async function getPhotosByUnit(unitId: number): Promise<UnitPhoto[]> {
  const db = await getDb();
  return db.select<UnitPhoto[]>(
    "SELECT * FROM image_assets WHERE entity_type = 'unit' AND entity_id = $1 ORDER BY taken_at DESC, id DESC",
    [unitId]
  );
}

/**
 * Returns just the file_path strings for a unit's photos. Used by the JOUR-06
 * cleanup path in UnitDeleteDialog — avoids round-tripping full UnitPhoto rows
 * just to extract filenames before disk removal.
 */
export async function getPhotoFilenamesByUnit(unitId: number): Promise<string[]> {
  const db = await getDb();
  const rows = await db.select<Array<{ file_path: string }>>(
    "SELECT file_path FROM image_assets WHERE entity_type = 'unit' AND entity_id = $1",
    [unitId]
  );
  return rows.map((r) => r.file_path);
}

export async function createUnitPhoto(input: CreateUnitPhotoInput): Promise<void> {
  const db = await getDb();
  await db.execute(
    "INSERT INTO image_assets (entity_type, entity_id, file_path, caption, stage_label, taken_at) VALUES ($1, $2, $3, $4, $5, $6)",
    [
      "unit",
      input.unit_id,
      input.file_path,
      input.caption ?? null,
      input.stage_label ?? null,
      input.taken_at ?? null,
    ]
  );
}

export async function deleteUnitPhoto(id: number): Promise<void> {
  const db = await getDb();
  await db.execute("DELETE FROM image_assets WHERE id = $1", [id]);
}

/**
 * COLL-01 — batch-fetches the most recent photo per unit in a single query.
 * Uses MAX(id), NOT MAX(taken_at) — taken_at is nullable (Pitfall 1).
 * Returns UnitPhoto[] — caller builds Map<number, UnitPhoto> from the array.
 */
export async function getLatestPhotoByUnit(): Promise<UnitPhoto[]> {
  const db = await getDb();
  return db.select<UnitPhoto[]>(
    `SELECT ia.* FROM image_assets ia
     INNER JOIN (
       SELECT entity_id, MAX(id) as max_id
       FROM image_assets WHERE entity_type = 'unit'
       GROUP BY entity_id
     ) latest ON ia.id = latest.max_id`
  );
}

/**
 * PROJ-01 — batch photo counts for a set of unit IDs.
 * Uses dynamic positional params for IN clause (Pitfall 3).
 */
export async function getPhotoCountsByUnitIds(
  unitIds: number[]
): Promise<{ entity_id: number; photo_count: number }[]> {
  if (unitIds.length === 0) return [];
  const db = await getDb();
  const placeholders = unitIds.map((_, i) => `$${i + 1}`).join(", ");
  return db.select(
    `SELECT entity_id, COUNT(*) as photo_count
     FROM image_assets
     WHERE entity_type = 'unit' AND entity_id IN (${placeholders})
     GROUP BY entity_id`,
    unitIds
  );
}
