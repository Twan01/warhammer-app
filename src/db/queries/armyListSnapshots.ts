/**
 * Phase 95 — Army list snapshot CRUD + restore (SNP-01..04).
 *
 * Critical contracts:
 * - getSnapshotsByList explicitly excludes snapshot_data from SELECT (D-03 / Pitfall 2)
 * - restoreSnapshot auto-saves a safety snapshot BEFORE deleting units (D-09, D-10)
 * - restoreSnapshot falls back to ghost unit when unit_id lookup fails (D-12, Pitfall 4)
 * - All SQL uses $1/$2 positional params (Tauri plugin-sql requirement)
 * - JSON.parse wrapped in try/catch (T-95-01 threat mitigation)
 */

import { getDb } from "@/db/client";
import {
  getArmyListWithUnits,
  getArmyListById,
  getEnhancementsByList,
} from "@/db/queries/armyLists";
import {
  formatArmyListForExport,
  buildJsonFormat,
} from "@/lib/exportArmyList";
import type { CreateSnapshotInput, RestoreSnapshotInput, ArmyListSnapshot } from "@/types/armyList";

// ---------------------------------------------------------------------------
// Read operations
// ---------------------------------------------------------------------------

/**
 * List snapshots for an army list, newest first.
 * Explicitly excludes snapshot_data to keep list queries lightweight (D-03).
 */
export async function getSnapshotsByList(listId: number): Promise<ArmyListSnapshot[]> {
  const db = await getDb();
  return db.select<ArmyListSnapshot[]>(
    `SELECT id, list_id, label, total_points, created_at
     FROM army_list_snapshots
     WHERE list_id = $1
     ORDER BY created_at DESC`,
    [listId],
  );
}

/**
 * Fetch the raw JSON blob for a single snapshot.
 * Returns null if snapshot not found.
 */
export async function getSnapshotData(snapshotId: number): Promise<string | null> {
  const db = await getDb();
  const rows = await db.select<{ snapshot_data: string }[]>(
    "SELECT snapshot_data FROM army_list_snapshots WHERE id = $1",
    [snapshotId],
  );
  return rows[0]?.snapshot_data ?? null;
}

// ---------------------------------------------------------------------------
// Write operations
// ---------------------------------------------------------------------------

/**
 * Create a new snapshot. Returns the inserted row id.
 */
export async function createSnapshot(input: CreateSnapshotInput): Promise<number> {
  const db = await getDb();
  const result = await db.execute(
    `INSERT INTO army_list_snapshots (list_id, label, snapshot_data, total_points)
     VALUES ($1, $2, $3, $4)`,
    [input.list_id, input.label, input.snapshot_data, input.total_points],
  );
  return result.lastInsertId ?? 0;
}

/**
 * Delete a snapshot by id.
 */
export async function deleteSnapshot(snapshotId: number): Promise<void> {
  const db = await getDb();
  await db.execute("DELETE FROM army_list_snapshots WHERE id = $1", [snapshotId]);
}

// ---------------------------------------------------------------------------
// Restore operation (D-09..D-12)
// ---------------------------------------------------------------------------

/**
 * Destructive restore: replaces all units and enhancements in the list with
 * those from the snapshot. Auto-saves a safety snapshot first (D-10).
 *
 * Steps:
 * 1. Fetch and parse snapshot JSON (T-95-01: wrapped in try/catch)
 * 2. Build unit name-to-id lookup from faction's units table
 * 3. Auto-save current state as "Auto-save before restore" (D-10)
 * 4. Delete all current units (CASCADE deletes enhancements)
 * 5. Re-insert units from snapshot (ghost fallback on missing unit_id per D-12)
 * 6. Re-insert enhancements from snapshot
 */
export async function restoreSnapshot(input: RestoreSnapshotInput): Promise<void> {
  const db = await getDb();

  // 1. Fetch and parse snapshot data
  const rawData = await getSnapshotData(input.snapshot_id);
  if (!rawData) {
    throw new Error(`Snapshot ${input.snapshot_id} not found`);
  }

  let parsed: {
    list: { total_points: number; enhancement_points: number };
    units: Array<{
      name: string;
      points: number;
      is_warlord: boolean;
      is_ghost: boolean;
      selected_model_count: number | null;
    }>;
    enhancements: Array<{
      name: string;
      points: number;
      assigned_to: string | null;
    }>;
  };

  try {
    parsed = JSON.parse(rawData);
  } catch {
    throw new Error(`Snapshot ${input.snapshot_id} contains invalid JSON`);
  }

  // 2. Build unit name-to-id lookup from the faction's units
  const unitRows = await db.select<{ id: number; name: string }[]>(
    "SELECT id, name FROM units WHERE faction_id = $1",
    [input.faction_id],
  );
  const nameToId = new Map<string, number>();
  for (const row of unitRows) {
    nameToId.set(row.name, row.id);
  }

  // 3. Gather current state for safety snapshot BEFORE starting the transaction
  const currentList = await getArmyListById(input.list_id);
  const currentUnits = await getArmyListWithUnits(input.list_id);
  const currentEnhancements = await getEnhancementsByList(input.list_id);

  // Wrap safety snapshot + destructive restore in a single transaction (CR-01)
  await db.execute("BEGIN TRANSACTION", []);
  try {
    // 3b. Auto-save current state as safety snapshot (D-10)
    if (currentList) {
      const exportData = formatArmyListForExport(
        currentList,
        currentUnits,
        currentEnhancements,
        null,
      );
      const safetyBlob = buildJsonFormat(exportData);
      const safetyPoints = exportData.totalPoints;

      await db.execute(
        `INSERT INTO army_list_snapshots (list_id, label, snapshot_data, total_points)
         VALUES ($1, $2, $3, $4)`,
        [input.list_id, "Auto-save before restore", safetyBlob, safetyPoints],
      );
    }

    // 4. Delete all current units (CASCADE deletes enhancements per migration 031)
    await db.execute("DELETE FROM army_list_units WHERE list_id = $1", [input.list_id]);

    // 5. Re-insert units from snapshot
    for (const unit of parsed.units) {
      const realUnitId = nameToId.get(unit.name) ?? null;
      const ghostName = realUnitId === null ? unit.name : null;

      await db.execute(
        `INSERT INTO army_list_units (list_id, unit_id, ghost_unit_name, is_warlord, points_override)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          input.list_id,
          realUnitId,
          ghostName,
          unit.is_warlord ? 1 : 0,
          unit.points,
        ],
      );
    }

    // 6. Re-fetch newly inserted units to map names to new row IDs
    const newUnitRows = await db.select<{ id: number; match_name: string }[]>(
      `SELECT id, COALESCE(ghost_unit_name, '') AS match_name
       FROM army_list_units WHERE list_id = $1`,
      [input.list_id],
    );

    // Build lookup: we need unit name -> new army_list_units.id
    // For non-ghost units, match_name is '' so we need the unit name from the units table
    const newUnitNameToId = new Map<string, number>();
    for (const row of newUnitRows) {
      if (row.match_name) {
        // Ghost unit — match_name is the ghost_unit_name
        newUnitNameToId.set(row.match_name, row.id);
      }
    }

    // Also look up real unit names via the units table
    const newUnitRowsFull = await db.select<{ id: number; unit_id: number | null; ghost_unit_name: string | null }[]>(
      `SELECT alu.id, alu.unit_id, alu.ghost_unit_name
       FROM army_list_units alu WHERE alu.list_id = $1`,
      [input.list_id],
    );
    for (const row of newUnitRowsFull) {
      if (row.unit_id !== null) {
        // Find the unit name from the nameToId map (reverse lookup)
        for (const [name, uid] of nameToId.entries()) {
          if (uid === row.unit_id) {
            newUnitNameToId.set(name, row.id);
            break;
          }
        }
      } else if (row.ghost_unit_name) {
        newUnitNameToId.set(row.ghost_unit_name, row.id);
      }
    }

    // 7. Re-insert enhancements from snapshot
    for (const enh of parsed.enhancements) {
      if (!enh.assigned_to) continue;
      const armyListUnitId = newUnitNameToId.get(enh.assigned_to);
      if (armyListUnitId === undefined) continue; // Skip if assigned unit not found

      await db.execute(
        `INSERT INTO army_list_enhancements (list_id, army_list_unit_id, enhancement_name, enhancement_points)
         VALUES ($1, $2, $3, $4)`,
        [input.list_id, armyListUnitId, enh.name, enh.points],
      );
    }

    await db.execute("COMMIT", []);
  } catch (e) {
    await db.execute("ROLLBACK", []);
    throw e;
  }
}
