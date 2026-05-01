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
