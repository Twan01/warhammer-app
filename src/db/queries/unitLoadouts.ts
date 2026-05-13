import { getDb } from "@/db/client";
import type {
  UnitLoadout,
  LoadoutWargear,
  CreateLoadoutInput,
  AddWargearToLoadoutInput,
} from "@/types/unitLoadout";

/**
 * Phase 24 — CRUD for unit_loadouts + unit_loadout_wargear.
 *
 * activateLoadout uses a two-step deactivate-all + activate-one approach
 * (no explicit transaction — safe for local SQLite single-user, see RESEARCH.md Pattern 3).
 */

/** Omit wargear from DB row — we nest it manually after a second query. */
type LoadoutRow = Omit<UnitLoadout, "wargear">;

export async function getUnitLoadouts(unitId: number): Promise<UnitLoadout[]> {
  const db = await getDb();
  const loadouts = await db.select<LoadoutRow[]>(
    "SELECT * FROM unit_loadouts WHERE unit_id = $1 ORDER BY created_at ASC",
    [unitId],
  );
  if (loadouts.length === 0) return [];

  // Fetch all wargear for all loadouts in one query
  const loadoutIds = loadouts.map((l) => l.id);
  const placeholders = loadoutIds.map((_, i) => `$${i + 1}`).join(", ");
  const allWargear = await db.select<LoadoutWargear[]>(
    `SELECT * FROM unit_loadout_wargear WHERE loadout_id IN (${placeholders}) ORDER BY created_at ASC`,
    loadoutIds,
  );

  // Group wargear by loadout_id
  const wargearByLoadout = new Map<number, LoadoutWargear[]>();
  for (const w of allWargear) {
    const arr = wargearByLoadout.get(w.loadout_id) ?? [];
    arr.push(w);
    wargearByLoadout.set(w.loadout_id, arr);
  }

  return loadouts.map((l) => ({
    ...l,
    wargear: wargearByLoadout.get(l.id) ?? [],
  }));
}

export async function createLoadout(input: CreateLoadoutInput): Promise<number> {
  const db = await getDb();
  const result = await db.execute(
    "INSERT INTO unit_loadouts (unit_id, name) VALUES ($1, $2)",
    [input.unit_id, input.name],
  );
  return result.lastInsertId ?? 0;
}

export async function deleteLoadout(id: number): Promise<void> {
  const db = await getDb();
  // CASCADE on unit_loadout_wargear removes wargear automatically.
  await db.execute("DELETE FROM unit_loadouts WHERE id = $1", [id]);
}

/**
 * Two-step activation: deactivate all for unit, then activate target.
 * No explicit transaction needed — local SQLite, single user (see RESEARCH.md Pattern 3).
 */
export async function activateLoadout(loadoutId: number, unitId: number): Promise<void> {
  const db = await getDb();
  await db.execute(
    `UPDATE unit_loadouts
     SET is_active = CASE WHEN id = $1 THEN 1 ELSE 0 END,
         updated_at = datetime('now')
     WHERE unit_id = $2`,
    [loadoutId, unitId],
  );
}

export async function addWargearToLoadout(input: AddWargearToLoadoutInput): Promise<number> {
  const db = await getDb();
  const result = await db.execute(
    `INSERT INTO unit_loadout_wargear (loadout_id, weapon_name, weapon_line, is_manual)
     VALUES ($1, $2, $3, $4)`,
    [input.loadout_id, input.weapon_name, input.weapon_line, input.is_manual ? 1 : 0],
  );
  return result.lastInsertId ?? 0;
}

export async function removeWargearFromLoadout(id: number): Promise<void> {
  const db = await getDb();
  await db.execute("DELETE FROM unit_loadout_wargear WHERE id = $1", [id]);
}
