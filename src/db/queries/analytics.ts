/**
 * Phase 19 Analytics queries (ANLY-04, ANLY-05, ANLY-06, ANLY-07).
 *
 * Single fetch entry: getAnalyticsData() returns the raw arrays the
 * computeHobbyAnalytics pure function consumes. Mirrors src/db/queries/spending.ts
 * (Promise.all parallel SELECTs).
 *
 * SQL contracts:
 * - Sessions: DISTINCT (unit_id, session_date) sorted ASC by session_date.
 *   The compute function derives velocity (distinct unit_ids ÷ months span)
 *   and streak (consecutive calendar days ending today) from this.
 * - Monthly spend: UNION ALL of units + paints where BOTH purchase_date and
 *   purchase_price_pence are NOT NULL (Pitfall 4 + ANLY-07: NULL purchase_date
 *   rows MUST NOT be bucketed to 1970-01).
 * - Rolling window: WHERE month >= strftime('%Y-%m', date('now', '-11 months'))
 *   so the chart only renders the last 12 calendar months.
 * - JS-side padding (Pitfall 3): SQL omits empty months; the compute function
 *   must build a 12-entry array and merge SQL rows into it.
 */
import { getDb } from "@/db/client";

export interface RawAnalyticsData {
  sessions: { unit_id: number; session_date: string }[];
  monthlySpend: { month: string; pence: number }[];
}

export async function getAnalyticsData(): Promise<RawAnalyticsData> {
  const db = await getDb();
  const [sessions, monthlySpend] = await Promise.all([
    db.select<{ unit_id: number; session_date: string }[]>(
      "SELECT DISTINCT unit_id, session_date FROM painting_sessions ORDER BY session_date ASC"
    ),
    db.select<{ month: string; pence: number }[]>(
      `SELECT strftime('%Y-%m', purchase_date) AS month,
              COALESCE(SUM(purchase_price_pence), 0) AS pence
         FROM (
           SELECT purchase_date, purchase_price_pence
             FROM units
            WHERE purchase_date IS NOT NULL AND purchase_price_pence IS NOT NULL
           UNION ALL
           SELECT purchase_date, purchase_price_pence
             FROM paints
            WHERE purchase_date IS NOT NULL AND purchase_price_pence IS NOT NULL
         )
        WHERE month >= strftime('%Y-%m', date('now', '-11 months'))
        GROUP BY month
        ORDER BY month ASC`
    ),
  ]);
  return { sessions, monthlySpend };
}
