import { getDb } from "@/db/client";
import type { UnitOverride, UpsertUnitOverrideInput } from "@/types/unitOverride";

/**
 * UnitOverride queries (OVRD-01..04).
 *
 * One override row per unit in hobbyforge.db. NULL fields mean
 * "use the imported value from rules.db (Wahapedia)".
 *
 * upsertUnitOverride uses select-then-insert/update because there IS a
 * UNIQUE constraint on unit_overrides.unit_id — ON CONFLICT could also be
 * used, but the select-then-upsert pattern matches the established codebase
 * convention (see strategyNotes.ts).
 */

export async function getUnitOverride(unitId: number): Promise<UnitOverride | null> {
  const db = await getDb();
  const rows = await db.select<UnitOverride[]>(
    "SELECT * FROM unit_overrides WHERE unit_id = $1 LIMIT 1",
    [unitId],
  );
  return rows[0] ?? null;
}

export async function upsertUnitOverride(input: UpsertUnitOverrideInput): Promise<void> {
  const db = await getDb();
  const existing = await db.select<{ id: number }[]>(
    "SELECT id FROM unit_overrides WHERE unit_id = $1",
    [input.unit_id],
  );
  if (existing.length > 0) {
    await db.execute(
      `UPDATE unit_overrides SET
         points=$2, move=$3, toughness=$4, save=$5, wounds=$6,
         leadership=$7, objective_control=$8, keywords=$9, abilities=$10,
         updated_at=datetime('now')
       WHERE unit_id=$1`,
      [
        input.unit_id,
        input.points ?? null,
        input.move ?? null,
        input.toughness ?? null,
        input.save ?? null,
        input.wounds ?? null,
        input.leadership ?? null,
        input.objective_control ?? null,
        input.keywords ?? null,
        input.abilities ?? null,
      ],
    );
  } else {
    await db.execute(
      `INSERT INTO unit_overrides
         (unit_id, points, move, toughness, save, wounds, leadership, objective_control, keywords, abilities)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        input.unit_id,
        input.points ?? null,
        input.move ?? null,
        input.toughness ?? null,
        input.save ?? null,
        input.wounds ?? null,
        input.leadership ?? null,
        input.objective_control ?? null,
        input.keywords ?? null,
        input.abilities ?? null,
      ],
    );
  }
}

export async function deleteUnitOverride(unitId: number): Promise<void> {
  const db = await getDb();
  await db.execute("DELETE FROM unit_overrides WHERE unit_id = $1", [unitId]);
}
