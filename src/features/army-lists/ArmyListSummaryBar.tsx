import { useMemo } from "react";
import type { ArmyListUnitRow } from "@/types/armyList";

interface ArmyListSummaryBarProps {
  units: ArmyListUnitRow[];
}

/**
 * ARMY-03 — Pinned summary band inside ArmyListDetailSheet.
 *
 * Three stats:
 *   - Total: SUM(effective_points) — effective_points is SQL-computed by
 *     getArmyListWithUnits via COALESCE(points_override, u.points, 0).
 *     NEVER reimplement COALESCE in JS (Pitfall 2 / RESEARCH Pattern 4).
 *   - Painted: SUM(effective_points WHERE status_painting === "Completed").
 *     "Completed" is the canonical fully-painted string from PAINTING_STATUS_ORDER
 *     (NOT "Complete" — that string does not exist in the enum). Verified against
 *     src/types/unit.ts PAINTING_STATUS_ORDER.
 *   - Battle-ready: round((painted / total) * 100). Returns 0 when total is 0.
 */
export function ArmyListSummaryBar({ units }: ArmyListSummaryBarProps) {
  const totalPoints = useMemo(
    () => units.reduce((sum, u) => sum + u.effective_points, 0),
    [units],
  );

  const paintedPoints = useMemo(
    () =>
      units.reduce(
        (sum, u) => (u.status_painting === "Completed" ? sum + u.effective_points : sum),
        0,
      ),
    [units],
  );

  const battleReadyPct = totalPoints > 0
    ? Math.round((paintedPoints / totalPoints) * 100)
    : 0;

  return (
    <div className="flex items-center gap-6 px-4 py-2 bg-muted/30 border-b">
      <Stat label="Total" value={`${totalPoints} pts`} />
      <Stat label="Painted" value={`${paintedPoints} pts`} />
      <Stat label="Battle-ready" value={`${battleReadyPct}%`} />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <span className="text-sm">
      <span className="text-muted-foreground">{label}: </span>
      <span className="font-semibold">{value}</span>
    </span>
  );
}
