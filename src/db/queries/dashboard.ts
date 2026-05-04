/**
 * DASH-07: Dashboard data is sourced ONLY from existing tables (units, factions).
 * No new tables, no SQL aggregation — aggregation math lives in
 * `src/features/dashboard/computeStats.ts` (testable as a pure function).
 *
 * Pattern mirrors src/db/queries/units.ts and src/db/queries/factions.ts:
 * `getDb()` singleton -> `db.select<T[]>(sql)`. Two SELECTs run in parallel
 * via Promise.all to minimize the latency of the dashboard fetch.
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
