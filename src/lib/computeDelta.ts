/**
 * Phase 24 — Pure delta computation for point preview.
 * Used by ArmyListUnitRow to show "+N" / "-N" badge before confirming a tier swap.
 *
 * @param candidatePoints - The points value of the tier/loadout being previewed (null = no pending selection)
 * @param effectivePoints - The current effective_points from the COALESCE chain
 * @returns The signed integer delta (positive = costs more, negative = saves points, 0 = no change)
 */
export function computeDelta(
  candidatePoints: number | null,
  effectivePoints: number,
): number {
  if (candidatePoints === null) return 0;
  return candidatePoints - effectivePoints;
}
