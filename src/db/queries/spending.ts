/**
 * SPEND-03/04 — Spending data is sourced from existing tables (units, factions, paints).
 * No new tables, no SQL aggregation for unit-by-faction breakdown — that math lives in
 * `src/features/spending/computeSpendingStats.ts` (testable as a pure function, mirroring
 * the dashboard pattern). The owned-paint SUM IS computed in SQL because we never need
 * the full paint rows for the spending page (Pitfall 5: COALESCE SUM avoids NULL on empty).
 *
 * Pattern mirrors src/db/queries/dashboard.ts: getDb() singleton + Promise.all parallel
 * SELECTs to minimize fetch latency.
 */
import { getDb } from "@/db/client";
import type { Unit } from "@/types/unit";
import type { Faction } from "@/types/faction";

export interface RawSpendingData {
  units: Unit[];
  factions: Faction[];
  paintsPence: number; // SUM from SQL — not full paint rows
}

export async function getSpendingStats(): Promise<RawSpendingData> {
  const db = await getDb();
  const [units, factions, paintRows] = await Promise.all([
    db.select<Unit[]>("SELECT * FROM units"),
    db.select<Faction[]>("SELECT * FROM factions ORDER BY id ASC"),
    db.select<{ total: number }[]>(
      "SELECT COALESCE(SUM(purchase_price_pence), 0) AS total FROM paints WHERE owned = 1 AND purchase_price_pence IS NOT NULL"
    ),
  ]);
  return {
    units,
    factions,
    paintsPence: paintRows[0]?.total ?? 0,
  };
}
