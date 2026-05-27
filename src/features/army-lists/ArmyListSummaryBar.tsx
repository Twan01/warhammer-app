import { useMemo } from "react";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { computeListHealthStats, computeListWarnings } from "@/lib/computeUnitWarnings";
import { PointsFreshnessBadge } from "./PointsFreshnessBadge";
import type { ArmyListUnitRow, ArmyListEnhancement } from "@/types/armyList";
import {
  TACTICAL_ROLES,
  TACTICAL_ROLES_DISPLAY,
} from "@/types/armyList";
import type { TacticalRole } from "@/types/armyList";
import type { SyncFreshness } from "@/lib/syncFreshness";

interface ArmyListSummaryBarProps {
  units: ArmyListUnitRow[];
  pointsLimit: number | null;
  freshness: SyncFreshness;
  enhancements: ArmyListEnhancement[];
}

/**
 * Phase 66 — Full health summary panel (D-12, D-13, D-09, D-10, D-11).
 *
 * Stats: points total (X/Y when limit set), ownership %, readiness %,
 * freshness badge, warning count with tooltip. Role coverage pills when
 * at least one unit has a tactical role assigned.
 *
 * Category points breakdown: groups units by unit_category and shows
 * the point total for each category (e.g. "HQ: 200pts, Battleline: 300pts").
 */
export function ArmyListSummaryBar({ units, pointsLimit, freshness, enhancements }: ArmyListSummaryBarProps) {
  const enhancementTotal = useMemo(
    () => enhancements.reduce((s, e) => s + e.enhancement_points, 0),
    [enhancements],
  );

  const stats = useMemo(
    () => computeListHealthStats(units, pointsLimit, freshness, enhancementTotal),
    [units, pointsLimit, freshness, enhancementTotal],
  );

  const listWarnings = useMemo(
    () => computeListWarnings({ totalPoints: stats.totalPoints, pointsLimit, freshness }),
    [stats.totalPoints, pointsLimit, freshness],
  );

  const listWarningCount = listWarnings.hard.length + listWarnings.soft.length;
  const unitWarningCount =
    stats.hardWarningCount + stats.softWarningCount - listWarningCount;
  const totalWarnings = stats.hardWarningCount + stats.softWarningCount;

  const notReadyUnits = useMemo(
    () => units.filter((u) => u.status_painting !== "Completed"),
    [units],
  );

  // Role coverage: count how many units are assigned to each role
  const roleCounts = useMemo(() => {
    const counts: Record<TacticalRole, number> = {
      anti_tank: 0,
      screening: 0,
      objective_holder: 0,
      fire_support: 0,
      melee_threat: 0,
      utility: 0,
      transport: 0,
    };
    for (const u of units) {
      if (u.tactical_role && u.tactical_role in counts) {
        counts[u.tactical_role as TacticalRole] += 1;
      }
    }
    return counts;
  }, [units]);

  const hasAnyRole = units.some((u) => u.tactical_role !== null);

  // Category-based points breakdown
  const categoryPoints = useMemo(() => {
    const map = new Map<string, { points: number; count: number }>();
    for (const u of units) {
      const cat = u.unit_category ?? "Uncategorized";
      const entry = map.get(cat) ?? { points: 0, count: 0 };
      entry.points += u.effective_points;
      entry.count += 1;
      map.set(cat, entry);
    }
    // Sort by points descending
    return Array.from(map.entries())
      .sort((a, b) => b[1].points - a[1].points);
  }, [units]);

  const hasAnyCategory = units.some((u) => u.unit_category !== null);

  // Points display: "X / Y pts" when limit set, "X pts" otherwise
  const pointsValue = pointsLimit !== null
    ? `${stats.totalPoints} / ${pointsLimit} pts`
    : `${stats.totalPoints} pts`;

  return (
    <div className="flex flex-col gap-3 px-4 py-3 bg-muted/30 border-b">
      {/* Stat row */}
      <div className="flex items-center gap-6">
        <Stat
          label="Total"
          value={pointsValue}
          valueClassName={stats.pointsExceeded ? "text-destructive" : undefined}
        />
        {enhancementTotal > 0 && (
          <Stat label="Enhancements" value={`${enhancementTotal} pts (${enhancements.length})`} />
        )}
        <Stat label="Owned" value={`${stats.ownershipPct}%`} />
        <Stat label="Ready" value={`${stats.battleReadyPct}%`} />
      </div>

      {/* Progress bar */}
      <div className="h-0.5 w-full bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-battle-gold transition-all duration-300"
          style={{ width: `${stats.battleReadyPct}%` }}
        />
      </div>

      {/* Category points breakdown */}
      {hasAnyCategory && categoryPoints.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Points by Category
          </span>
          <div className="flex flex-wrap gap-2">
            {categoryPoints.map(([category, { points, count }]) => (
              <span
                key={category}
                className="bg-secondary text-secondary-foreground rounded-full px-2.5 py-1 text-xs"
              >
                {category}: {points}pts ({count})
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Freshness + warnings row */}
      <div className="flex items-center justify-between">
        <PointsFreshnessBadge />
        {totalWarnings > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <span
                className={`text-xs font-medium cursor-default ${
                  stats.hardWarningCount > 0 ? "text-destructive" : "text-amber-500"
                }`}
              >
                Warnings: {totalWarnings}
              </span>
            </TooltipTrigger>
            <TooltipContent>
              {listWarningCount} list warnings, {unitWarningCount} unit warnings
            </TooltipContent>
          </Tooltip>
        )}
      </div>

      {/* List-level warning badges (Phase 76 D-13) */}
      {(listWarnings.hard.length > 0 || listWarnings.soft.length > 0) && (
        <div className="flex flex-wrap gap-2" role="status">
          {listWarnings.hard.map((w) => (
            <Badge key={w} variant="destructive">{w}</Badge>
          ))}
          {listWarnings.soft.map((w) => (
            <Badge key={w} variant="outline">{w}</Badge>
          ))}
        </div>
      )}

      {/* Role coverage — only when at least one unit has a role */}
      {hasAnyRole && (
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Role Coverage
          </span>
          <div className="flex flex-wrap gap-2">
            {TACTICAL_ROLES.map((role) => {
              const count = roleCounts[role];
              const isCovered = count >= 1;
              return (
                <span
                  key={role}
                  className={
                    isCovered
                      ? "bg-secondary text-secondary-foreground rounded-full px-2 py-1 text-xs"
                      : "bg-transparent border border-dashed border-muted-foreground/40 text-muted-foreground rounded-full px-2 py-1 text-xs"
                  }
                >
                  {TACTICAL_ROLES_DISPLAY[role]} {count}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Compact readiness indicator */}
      {notReadyUnits.length === 0 ? (
        <p className="text-sm bg-battle-gold/10 text-battle-gold rounded px-2 py-1">
          All units battle-ready
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">
          {notReadyUnits.length} of {units.length} units not battle-ready
        </p>
      )}
    </div>
  );
}

function Stat({ label, value, valueClassName }: { label: string; value: string; valueClassName?: string }) {
  return (
    <span className="text-sm">
      <span className="text-muted-foreground">{label}: </span>
      <span className={`font-semibold ${valueClassName ?? ""}`}>{value}</span>
    </span>
  );
}
