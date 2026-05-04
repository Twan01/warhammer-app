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
