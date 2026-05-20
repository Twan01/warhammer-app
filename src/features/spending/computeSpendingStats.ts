/**
 * Pure aggregation function for the Spending page (SPEND-03/04).
 *
 * Takes raw units + factions arrays + paintsPence number from getSpendingStats() and
 * returns a fully derived SpendingStats object the SpendingPage consumes verbatim.
 *
 * Per CONTEXT.md decision: all 4 factions always rendered, even at £0.00. Orphan units
 * (faction_id with no matching faction) are still counted in totalPence but excluded
 * from factionBreakdown (defensive — should not happen with FK constraints).
 *
 * Pitfall 5: SUM in SQL is COALESCE'd to 0; this function additionally treats null
 * purchase_price_pence values as 0 to avoid NaN propagation.
 */
import type { Unit } from "@/types/unit";
import type { Faction } from "@/types/faction";

export interface FactionSpend {
  faction: Faction;
  pence: number;
}

export interface SpendingStats {
  totalPence: number;
  factionBreakdown: FactionSpend[];
  paintsPence: number;
  /** null when 0 units have status_painting === "Completed" (DATA-03) */
  costPerCompletedModelPence: number | null;
  /** Sum of purchase_price_pence for Completed units only (DATA-04) */
  paintedValuePence: number;
  /** unitTotalPence minus paintedValuePence — excludes paintsPence (DATA-04) */
  unpaintedValuePence: number;
}

export function computeSpendingStats(
  units: Pick<Unit, "faction_id" | "purchase_price_pence" | "status_painting">[],
  factions: Faction[],
  paintsPence: number
): SpendingStats {
  const factionBreakdown: FactionSpend[] = factions.map((f) => ({
    faction: f,
    pence: units
      .filter((u) => u.faction_id === f.id)
      .reduce((sum, u) => sum + (u.purchase_price_pence ?? 0), 0),
  }));

  // totalPence = ALL units (including orphans) + paintsPence — orphans still count toward
  // grand total even if they don't appear in the per-faction breakdown.
  const unitTotalPence = units.reduce(
    (sum, u) => sum + (u.purchase_price_pence ?? 0),
    0
  );

  // DATA-03/04: cost-per-model and painted/unpainted value split
  const completedUnits = units.filter((u) => u.status_painting === "Completed");
  const completedCount = completedUnits.length;
  const paintedValuePence = completedUnits.reduce(
    (sum, u) => sum + (u.purchase_price_pence ?? 0),
    0
  );
  const unpaintedValuePence = unitTotalPence - paintedValuePence;

  return {
    totalPence: unitTotalPence + paintsPence,
    factionBreakdown,
    paintsPence,
    costPerCompletedModelPence:
      completedCount === 0 ? null : Math.round(paintedValuePence / completedCount),
    paintedValuePence,
    unpaintedValuePence,
  };
}
