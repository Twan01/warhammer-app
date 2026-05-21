import { useMemo } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { ArmyList, ArmyListUnitRow } from "@/types/armyList";
import type { Faction } from "@/types/faction";
import { PointsFreshnessBadge } from "./PointsFreshnessBadge";

interface ArmyListCardProps {
  list: ArmyList;
  faction: Faction | null;
  units: ArmyListUnitRow[];
  enhancementTotal: number;
  onClick: () => void;
}

/**
 * UI-SPEC §ArmyListsPage — one card per army list in the responsive grid.
 *
 * Stats use the SAME logic as ArmyListSummaryBar:
 *   - totalPoints = SUM(effective_points)
 *   - paintedPoints = SUM(effective_points WHERE status_painting === "Completed")
 *   - battleReadyPct = round((painted / total) * 100), 0 when total=0
 *
 * NOTE: This duplication is intentional — the card needs the totals before the
 * detail sheet is opened. Future refactor could lift the calculation into a
 * helper, but for now keeping it inline keeps each component self-contained.
 */
export function ArmyListCard({ list, faction, units, enhancementTotal, onClick }: ArmyListCardProps) {
  const unitPoints = useMemo(
    () => units.reduce((sum, u) => sum + u.effective_points, 0),
    [units],
  );
  const totalPoints = unitPoints + enhancementTotal;

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
    <Card
      className="cursor-pointer bg-card border border-border/60 shadow-sm hover:shadow-md transition-shadow duration-150"
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      aria-label={`Open army list ${list.name}`}
    >
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
        <CardTitle className="text-sm font-semibold">{list.name}</CardTitle>
        {list.list_type && (
          <Badge variant="secondary">{list.list_type}</Badge>
        )}
      </CardHeader>
      <CardContent className="flex flex-col gap-1 text-sm">
        <span className="text-muted-foreground">
          {faction?.name ?? "No faction"}
        </span>
        <span>
          <span className="text-muted-foreground">Total: </span>
          <span className="font-semibold tabular-nums">
            {totalPoints} / {list.points_limit ?? "—"} pts
          </span>
        </span>
        <span>
          <span className="text-muted-foreground">Battle-ready: </span>
          <span className="font-semibold tabular-nums">{battleReadyPct}%</span>
        </span>
        <PointsFreshnessBadge />
      </CardContent>
    </Card>
  );
}
