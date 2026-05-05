import { getDb } from "@/db/client";
import type { UnitPointTier, CreateUnitPointTierInput } from "@/types/unitPointTier";

/**
 * Phase 24 — CRUD for unit_point_tiers.
 *
 * Uses INSERT OR REPLACE for upsert (Pitfall 6 — UNIQUE(unit_id, model_count)).
 * Tier points are written to units.points on activation — preserving the COALESCE chain.
 */

export async function getUnitPointTiers(unitId: number): Promise<UnitPointTier[]> {
  const db = await getDb();
  return db.select<UnitPointTier[]>(
    "SELECT * FROM unit_point_tiers WHERE unit_id = $1 ORDER BY model_count ASC",
    [unitId],
  );
}

export async function upsertUnitPointTier(input: CreateUnitPointTierInput): Promise<void> {
  const db = await getDb();
  await db.execute(
    `INSERT OR REPLACE INTO unit_point_tiers (unit_id, model_count, points)
     VALUES ($1, $2, $3)`,
    [input.unit_id, input.model_count, input.points],
  );
}

export async function deleteUnitPointTier(id: number): Promise<void> {
  const db = await getDb();
  await db.execute("DELETE FROM unit_point_tiers WHERE id = $1", [id]);
}
