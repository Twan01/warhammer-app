import { useMemo } from "react";
import type { ArmyListUnitRow } from "@/types/armyList";
import { StatusBadge } from "@/components/ui/status-badge";
import type { PaintingStatus } from "@/types/unit";

interface ArmyListSummaryBarProps {
  units: ArmyListUnitRow[];
}

/**
 * ARMY-03 + PLAY-01 — Pinned summary band inside ArmyListDetailSheet.
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
 *
 * PLAY-01 additions: progress bar (bg-battle-gold fill) + not-ready unit list
 * with StatusBadge per unit, or gold "All units battle-ready" message at 100%.
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

  const notReadyUnits = useMemo(
    () => units.filter((u) => u.status_painting !== "Completed"),
    [units],
  );

  return (
    <div className="flex flex-col gap-3 px-4 py-3 bg-muted/30 border-b">
      {/* Existing stat row */}
      <div className="flex items-center gap-6">
        <Stat label="Total" value={`${totalPoints} pts`} />
        <Stat label="Painted" value={`${paintedPoints} pts`} />
        <Stat label="Battle-ready" value={`${battleReadyPct}%`} />
      </div>

      {/* Progress bar — 2px height, battle-gold fill */}
      <div className="h-0.5 w-full bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-battle-gold transition-all duration-300"
          style={{ width: `${battleReadyPct}%` }}
        />
      </div>

      {/* Readiness section */}
      {notReadyUnits.length === 0 ? (
        <p className="text-sm bg-battle-gold/10 text-battle-gold rounded px-2 py-1">
          All units battle-ready
        </p>
      ) : (
        <div className="flex flex-col gap-1">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Not ready ({notReadyUnits.length})
          </p>
          {notReadyUnits.map((u) => (
            <div key={u.id} className="flex items-center justify-between text-sm py-0.5">
              <span>{u.unit_name}</span>
              <StatusBadge status={u.status_painting as PaintingStatus} />
            </div>
          ))}
        </div>
      )}
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
