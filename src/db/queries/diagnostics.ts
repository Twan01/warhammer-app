/**
 * Phase 77 -- Diagnostics query module for the Data Health page.
 *
 * Provides typed queries for:
 *   - Table row counts (5 key tables)
 *   - Schema migration versions (both databases)
 *   - Orphaned progress rows (recipe steps deleted but progress remains)
 *   - Ambiguous point matches (units with 0 or >1 datasheet_points match)
 *   - Aggregated diagnostic flags
 *
 * All queries are read-only SELECTs with no user-supplied parameters.
 * Cross-DB queries (ambiguous points) query each DB separately and compare in JS.
 */
import { getDb } from "@/db/client";

// ── Interfaces ──────────────────────────────────────────────────────────────

export interface TableCounts {
  units: number;
  painting_recipes: number;
  unit_recipe_assignments: number;
  unit_recipe_step_progress: number;
}

export interface DiagnosticFlag {
  type: string;
  count: number;
  description: string;
  severity: "warning" | "info";
}

export interface SchemaVersions {
  hobbyforge: number;
}

export interface FactionCoverage {
  faction_id: string;
  faction_name: string;
  total_units: number;
  units_with_points: number;
  coverage_pct: number;
}

// ── Query functions ─────────────────────────────────────────────────────────

/**
 * D-11: Row counts for 5 key tables in hobbyforge.db.
 * Each table is queried independently to avoid cross-table locking.
 */
export async function getTableCounts(): Promise<TableCounts> {
  const db = await getDb();

  const [units, recipes, assignments, progress] = await Promise.all([
    db.select<{ c: number }[]>("SELECT COUNT(*) as c FROM units"),
    db.select<{ c: number }[]>("SELECT COUNT(*) as c FROM painting_recipes"),
    db.select<{ c: number }[]>(
      "SELECT COUNT(*) as c FROM unit_recipe_assignments"
    ),
    db.select<{ c: number }[]>(
      "SELECT COUNT(*) as c FROM unit_recipe_step_progress"
    ),
  ]);

  return {
    units: units[0]?.c ?? 0,
    painting_recipes: recipes[0]?.c ?? 0,
    unit_recipe_assignments: assignments[0]?.c ?? 0,
    unit_recipe_step_progress: progress[0]?.c ?? 0,
  };
}

/**
 * D-13: Schema migration versions from PRAGMA user_version on both databases.
 * The column name returned by PRAGMA varies by driver -- we read the first
 * value from the result object as a fallback.
 */
export async function getSchemaVersions(): Promise<SchemaVersions> {
  const db = await getDb();
  const hfRows = await db.select<Record<string, number>[]>("PRAGMA user_version");

  const extractVersion = (row: Record<string, number> | undefined): number => {
    if (!row) return 0;
    if (typeof row.user_version === "number") return row.user_version;
    // Fallback: read the first numeric value from the result object
    const values = Object.values(row);
    return typeof values[0] === "number" ? values[0] : 0;
  };

  return {
    hobbyforge: extractVersion(hfRows[0]),
  };
}

/**
 * D-08: Detect orphaned progress rows -- unit_recipe_step_progress entries
 * referencing recipe_steps that no longer exist.
 */
export async function getOrphanedProgressRows(): Promise<DiagnosticFlag | null> {
  const db = await getDb();
  const rows = await db.select<{ c: number }[]>(
    `SELECT COUNT(*) as c
     FROM unit_recipe_step_progress p
     LEFT JOIN recipe_steps rs ON rs.id = p.recipe_step_id
     WHERE rs.id IS NULL`
  );
  const count = rows[0]?.c ?? 0;
  if (count === 0) return null;
  return {
    type: "orphaned_progress",
    count,
    description: `${count} orphaned progress rows -- tracking completion for steps that no longer exist`,
    severity: "warning",
  };
}

/**
 * D-09: Detect collection units that are not linked to the canonical unit database.
 * With FK-based points resolution (Phase 106), unlinked units have no path to
 * database points and fall through to manual/override values.
 */
export async function getAmbiguousPointMatches(): Promise<DiagnosticFlag | null> {
  const db = await getDb();

  const rows = await db.select<{ c: number }[]>(
    "SELECT COUNT(*) as c FROM units WHERE udb_unit_id IS NULL",
  );

  const count = rows[0]?.c ?? 0;
  if (count === 0) return null;
  return {
    type: "ambiguous_points",
    count,
    description: `${count} units are not linked to the unit database — points are manual`,
    severity: "warning",
  };
}

/**
 * Phase 105 COL-06: Count collection units that have no link to the canonical
 * unit database (udb_unit_id IS NULL). Returns a warning-severity flag when
 * any unlinked units exist, null when all units are linked.
 */
export async function getUnlinkedUnitsCount(): Promise<DiagnosticFlag | null> {
  const db = await getDb();
  const rows = await db.select<{ c: number }[]>(
    "SELECT COUNT(*) as c FROM units WHERE udb_unit_id IS NULL",
  );
  const count = rows[0]?.c ?? 0;
  if (count === 0) return null;
  const plural = count !== 1 ? "s are" : " is";
  return {
    type: "unlinked_units",
    count,
    description: `${count} collection unit${plural} not linked to the canonical unit database`,
    severity: "warning",
  };
}

/**
 * Aggregates all diagnostic flags into a single array.
 * Data freshness is handled in the UI layer via useUdbMeta
 * rather than duplicated here (per D-10/D-14).
 */
export async function getDiagnosticFlags(): Promise<DiagnosticFlag[]> {
  const results = await Promise.all([
    getOrphanedProgressRows(),
    getUnlinkedUnitsCount(),
  ]);
  return results.filter((f): f is DiagnosticFlag => f !== null);
}

/**
 * DQ-06: Per-faction points coverage for the Data Health page.
 * Computes the percentage of units in each faction that have points data
 * (either base_points on the unit row or entries in udb_unit_points).
 */
export async function getPointsCoverage(): Promise<FactionCoverage[]> {
  const db = await getDb();
  const rows = await db.select<FactionCoverage[]>(
    `SELECT f.id AS faction_id, f.name AS faction_name,
            COUNT(u.id) AS total_units,
            COUNT(CASE WHEN u.base_points IS NOT NULL OR p.unit_id IS NOT NULL THEN 1 END) AS units_with_points,
            ROUND(100.0 * COUNT(CASE WHEN u.base_points IS NOT NULL OR p.unit_id IS NOT NULL THEN 1 END) / COUNT(u.id), 1) AS coverage_pct
     FROM udb_factions f
     JOIN udb_units u ON u.faction_id = f.id
     LEFT JOIN (SELECT DISTINCT unit_id FROM udb_unit_points) p ON p.unit_id = u.id
     GROUP BY f.id
     ORDER BY f.name`
  );
  return rows;
}
