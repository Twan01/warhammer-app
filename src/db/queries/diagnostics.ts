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
import { getRulesDb } from "@/db/rules-client";

// ── Interfaces ──────────────────────────────────────────────────────────────

export interface TableCounts {
  units: number;
  painting_recipes: number;
  unit_recipe_assignments: number;
  unit_recipe_step_progress: number;
  synced_unit_points: number;
}

export interface DiagnosticFlag {
  type: string;
  count: number;
  description: string;
  severity: "warning" | "info";
}

export interface SchemaVersions {
  hobbyforge: number;
  rules: number;
}

// ── Query functions ─────────────────────────────────────────────────────────

/**
 * D-11: Row counts for 5 key tables in hobbyforge.db.
 * Each table is queried independently to avoid cross-table locking.
 */
export async function getTableCounts(): Promise<TableCounts> {
  const db = await getDb();

  const [units, recipes, assignments, progress, points] = await Promise.all([
    db.select<{ c: number }[]>("SELECT COUNT(*) as c FROM units"),
    db.select<{ c: number }[]>("SELECT COUNT(*) as c FROM painting_recipes"),
    db.select<{ c: number }[]>(
      "SELECT COUNT(*) as c FROM unit_recipe_assignments"
    ),
    db.select<{ c: number }[]>(
      "SELECT COUNT(*) as c FROM unit_recipe_step_progress"
    ),
    db.select<{ c: number }[]>(
      "SELECT COUNT(*) as c FROM synced_unit_points"
    ),
  ]);

  return {
    units: units[0]?.c ?? 0,
    painting_recipes: recipes[0]?.c ?? 0,
    unit_recipe_assignments: assignments[0]?.c ?? 0,
    unit_recipe_step_progress: progress[0]?.c ?? 0,
    synced_unit_points: points[0]?.c ?? 0,
  };
}

/**
 * D-13: Schema migration versions from PRAGMA user_version on both databases.
 * The column name returned by PRAGMA varies by driver -- we read the first
 * value from the result object as a fallback.
 */
export async function getSchemaVersions(): Promise<SchemaVersions> {
  const [db, rulesDb] = await Promise.all([getDb(), getRulesDb()]);

  const [hfRows, rulesRows] = await Promise.all([
    db.select<Record<string, number>[]>("PRAGMA user_version"),
    rulesDb.select<Record<string, number>[]>("PRAGMA user_version"),
  ]);

  const extractVersion = (row: Record<string, number> | undefined): number => {
    if (!row) return 0;
    if (typeof row.user_version === "number") return row.user_version;
    // Fallback: read the first numeric value from the result object
    const values = Object.values(row);
    return typeof values[0] === "number" ? values[0] : 0;
  };

  return {
    hobbyforge: extractVersion(hfRows[0]),
    rules: extractVersion(rulesRows[0]),
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
 * D-09: Detect units with ambiguous or missing point matches.
 * Queries hobbyforge.db for units linked via synced_unit_points, then
 * queries rules.db for all datasheet_points entries, and compares in JS.
 * Flags units whose name (case-insensitive) matches zero or more than one
 * datasheet_name in rw_datasheet_points.
 */
export async function getAmbiguousPointMatches(): Promise<DiagnosticFlag | null> {
  const [db, rulesDb] = await Promise.all([getDb(), getRulesDb()]);

  const [unitRows, pointRows] = await Promise.all([
    db.select<{ id: number; name: string }[]>(
      `SELECT u.id, u.name
       FROM units u
       JOIN synced_unit_points sup ON sup.unit_name = u.name`
    ),
    rulesDb.select<{ datasheet_name: string }[]>(
      "SELECT datasheet_name FROM rw_datasheet_points"
    ),
  ]);

  // Build a map of lowercase datasheet_name -> count of entries
  const nameCountMap = new Map<string, number>();
  for (const row of pointRows) {
    const key = row.datasheet_name.toLowerCase();
    nameCountMap.set(key, (nameCountMap.get(key) ?? 0) + 1);
  }

  // Count units with zero or >1 matches
  let ambiguousCount = 0;
  for (const unit of unitRows) {
    const matchCount = nameCountMap.get(unit.name.toLowerCase()) ?? 0;
    if (matchCount === 0 || matchCount > 1) {
      ambiguousCount++;
    }
  }

  if (ambiguousCount === 0) return null;
  return {
    type: "ambiguous_points",
    count: ambiguousCount,
    description: `${ambiguousCount} units have ambiguous or missing point matches`,
    severity: "warning",
  };
}

/**
 * Aggregates all diagnostic flags into a single array.
 * Stale sync detection is handled in the UI layer via useRulesSyncMeta
 * rather than duplicated here (per D-10/D-14).
 */
export async function getDiagnosticFlags(): Promise<DiagnosticFlag[]> {
  const results = await Promise.all([
    getOrphanedProgressRows(),
    getAmbiguousPointMatches(),
  ]);
  return results.filter((f): f is DiagnosticFlag => f !== null);
}
