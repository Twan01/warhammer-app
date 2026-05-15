/**
 * DASH-07: Dashboard data is sourced ONLY from existing tables (units, factions).
 * No new tables, no SQL aggregation — aggregation math lives in
 * `src/features/dashboard/computeStats.ts` (testable as a pure function).
 *
 * Pattern mirrors src/db/queries/units.ts and src/db/queries/factions.ts:
 * `getDb()` singleton -> `db.select<T[]>(sql)`. Two SELECTs run in parallel
 * via Promise.all to minimize the latency of the dashboard fetch.
 *
 * Phase 32 — getArmyReadinessByFaction: per-faction battle-ready points aggregate.
 * Uses INNER JOIN so factions with 0 units are excluded.
 * Uses COALESCE(u.points, 0) to treat null points as 0.
 * Uses status_painting = 'Completed' (canonical value — NOT 'Complete').
 */
import { getDb } from "@/db/client";
import type { Unit } from "@/types/unit";
import type { Faction } from "@/types/faction";

export interface DashboardStats {
  units: Unit[];
  factions: Faction[];
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const db = await getDb();
  const [units, factions] = await Promise.all([
    db.select<Unit[]>("SELECT * FROM units"),
    db.select<Faction[]>("SELECT * FROM factions"),
  ]);
  return { units, factions };
}

/**
 * DASH-06 — Cross-unit query for the Dashboard's Recent Activity feed.
 * Two parallel SELECTs: painting_sessions JOIN units (newest first, capped at 20)
 * and battle_logs (newest first, capped at 20). Pure function
 * computeRecentActivity() merges these with the units array (already in
 * useDashboardStats cache) into the final ActivityEvent[] feed.
 */
export interface RecentActivityResult {
  sessions: Array<{
    session_date: string;
    id: number;
    unit_name: string;
    unit_id: number;
  }>;
  battles: Array<{
    created_at: string;
    id: number;
    opponent_faction: string;
    result: string;
  }>;
}

export async function getRecentActivity(): Promise<RecentActivityResult> {
  const db = await getDb();
  const [sessions, battles] = await Promise.all([
    db.select<RecentActivityResult["sessions"]>(
      "SELECT ps.session_date, ps.id, u.name AS unit_name, ps.unit_id FROM painting_sessions ps JOIN units u ON u.id = ps.unit_id ORDER BY ps.session_date DESC, ps.id DESC LIMIT 20"
    ),
    db.select<RecentActivityResult["battles"]>(
      "SELECT id, created_at, opponent_faction, result FROM battle_logs ORDER BY created_at DESC LIMIT 20"
    ),
  ]);
  return { sessions, battles };
}

/**
 * Phase 32 — PANEL-04/05: Per-faction battle-ready points aggregate.
 *
 * Returns one row per faction that has at least one unit (INNER JOIN — factions
 * with 0 units are excluded so the readiness card stays clean).
 *
 * points_owned  = SUM of all unit points (COALESCE null → 0)
 * points_painted = SUM of points for units with status_painting = 'Completed'
 *                  (canonical value — NOT 'Complete', Pitfall from armyLists.ts)
 */
export interface FactionReadiness {
  faction_id: number;
  faction_name: string;
  color_theme: string;
  points_owned: number;
  points_painted: number;
}

export async function getArmyReadinessByFaction(): Promise<FactionReadiness[]> {
  const db = await getDb();
  return db.select<FactionReadiness[]>(
    `SELECT
       f.id AS faction_id,
       f.name AS faction_name,
       f.color_theme,
       SUM(COALESCE(sup.points, uo.points, u.points, 0)) AS points_owned,
       SUM(CASE WHEN u.status_painting = 'Completed'
                THEN COALESCE(sup.points, uo.points, u.points, 0)
                ELSE 0 END) AS points_painted
     FROM factions f
     JOIN units u ON u.faction_id = f.id
     LEFT JOIN unit_overrides uo ON uo.unit_id = u.id
     LEFT JOIN synced_unit_points sup ON sup.unit_name = u.name
       AND (sup.faction_id IS NULL OR sup.faction_id = CAST(u.faction_id AS TEXT))
     GROUP BY f.id, f.name, f.color_theme
     ORDER BY f.name ASC`
  );
}
